"""Bounded retrospective model selection; never exports a current forecast."""
from datetime import date, datetime, timedelta, timezone
import hashlib
from importlib.metadata import version
import json
import logging
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = 20261111
HORIZONS = (1, 7)
MODELS = ('naive', 'seasonalNaive', 'prophet', 'xgboost')
COUNTS = dict(validation=6, calibration=8, evaluation=12)
WINDOWS = dict(validation=(-365, -210), calibration=(-200, -110), evaluation=(-100, 0))
# Frozen before this run: no candidate or partition changes after observing evaluation.
PROPHET_CANDIDATES = {
    'anchoredLinear': dict(growth='linear', changepoint_prior_scale=0.01),
    'anchoredFlat': dict(growth='flat', changepoint_prior_scale=0.01),
}
PROPHET_COMMON = dict(yearly_seasonality=False, weekly_seasonality=1,
                      daily_seasonality=False, seasonality_prior_scale=0.1,
                      n_changepoints=10, changepoint_range=0.9, uncertainty_samples=0)
XGB_CANDIDATES = {'returnQuarter': 0.25, 'returnFull': 1.0}
XGB_PARAMS = dict(objective='reg:squarederror', max_depth=2, eta=0.04,
                  min_child_weight=20, reg_lambda=10, base_score=0,
                  subsample=1.0, colsample_bytree=1.0, tree_method='hist',
                  nthread=2, seed=SEED)
XGB_ROUNDS = 80


def temporal_split(series):
    actual = {row['date'] for row in series}
    end = series[-1]['date']
    partitions = {}
    for name, (start_offset, end_offset) in WINDOWS.items():
        start, stop = end + timedelta(days=start_offset), end + timedelta(days=end_offset)
        eligible = [r['date'] for r in series if start <= r['date']
                    and r['date'] + timedelta(days=7) <= stop
                    and (r['date'] - series[0]['date']).days >= 730
                    and r['date'] - timedelta(days=6) in actual
                    and all(r['date'] + timedelta(days=h) in actual for h in HORIZONS)]
        n = COUNTS[name]
        if len(eligible) < n:
            raise ValueError(f'{name}: need {n} paired origins; found {len(eligible)}')
        partitions[name] = [eligible[round(i*(len(eligible)-1)/(n-1))] for i in range(n)]
    for earlier, later in [('validation', 'calibration'), ('calibration', 'evaluation')]:
        if max(partitions[earlier]) + timedelta(days=7) >= min(partitions[later]):
            raise ValueError('Partition targets overlap next partition origins')
    return partitions


def return_features(series):
    rows = []
    prices = [r['price'] for r in series]
    for i, row in enumerate(series):
        current, price = row['date'], row['price']
        values = [price / prices[max(0, i-lag)] - 1 for lag in (1, 2, 5, 10, 20)]
        values += [sum(prices[max(0, i-w+1):i+1])/min(w, i+1)/price-1 for w in (5, 20)]
        returns = [prices[j]/prices[j-1]-1 for j in range(max(1, i-19), i+1)]
        values += [math.sqrt(sum(r*r for r in returns)/max(1, len(returns))),
                   (current-series[max(0, i-1)]['date']).days,
                   (current-series[max(0, i-5)]['date']).days,
                   math.sin(2*math.pi*current.weekday()/7),
                   math.cos(2*math.pi*current.weekday()/7)]
        rows.append(dict(origin=current, values=values))
    return rows


def return_pairs(series, cutoff, horizon):
    known = [r for r in series if r['date'] <= cutoff]
    actual = {r['date']: r['price'] for r in known}
    pairs = []
    for row in return_features(known)[19:]:
        target = row['origin'] + timedelta(days=horizon)
        if target in actual and row['origin'] >= cutoff-timedelta(days=730):
            pairs.append(dict(row, targetDate=target, target=actual[target]/actual[row['origin']]-1))
    return pairs


def select_candidate(validation_rows, candidates):
    if not validation_rows:
        raise ValueError('Candidate selection requires validation rows')
    return min(candidates, key=lambda c: sum(abs(r[c]-r['actual']) for r in validation_rows)/len(validation_rows))


def calibrate(rows):
    if not rows:
        raise ValueError('Calibration cannot be empty')
    rank = math.ceil((len(rows)+1)*0.8)
    if rank > len(rows):
        raise ValueError('Too few calibration samples for a finite 80% interval')
    result = {}
    for model in MODELS:
        errors = sorted(abs(r[model]-r['actual']) for r in rows)
        if not all(math.isfinite(e) for e in errors):
            raise ValueError('Non-finite calibration residual')
        result[model] = round(errors[rank-1], 4)
    return result


def with_intervals(rows, quantiles):
    return [dict(r, intervals={m: dict(lower80=round(max(0, r[m]-quantiles[m]), 4),
                                      upper80=round(r[m]+quantiles[m], 4)) for m in MODELS}) for r in rows]


def metrics(rows):
    if not rows:
        raise ValueError('Cannot score an empty paired evaluation')
    for row in rows:
        for key in ('actual', *MODELS):
            if not isinstance(row.get(key), (float, int)) or not math.isfinite(row[key]) or row[key] <= 0:
                raise ValueError(f'Invalid paired price: {key}')
        for model in MODELS:
            interval = row['intervals'][model]
            if (not all(math.isfinite(interval[k]) for k in ('lower80', 'upper80'))
                    or not 0 <= interval['lower80'] <= interval['upper80']):
                raise ValueError('Invalid interval')
    naive_mae = sum(abs(r['naive']-r['actual']) for r in rows)/len(rows)
    result = []
    for model in MODELS:
        errors = [r[model]-r['actual'] for r in rows]
        mae = sum(abs(e) for e in errors)/len(rows)
        result.append(dict(model=model, n=len(rows), mae=round(mae, 4),
                           rmse=round(math.sqrt(sum(e*e for e in errors)/len(rows)), 4),
                           bias=round(sum(errors)/len(rows), 4),
                           skillVsNaive=round(1-mae/naive_mae, 6) if naive_mae else None,
                           coverage80=round(sum(r['intervals'][model]['lower80'] <= r['actual'] <=
                                                r['intervals'][model]['upper80'] for r in rows)/len(rows), 6),
                           meanWidth80=round(sum(r['intervals'][model]['upper80']-
                                                r['intervals'][model]['lower80'] for r in rows)/len(rows), 4)))
    return result


def predict_candidates(series, origin, prophet_ids, xgb_ids):
    import numpy as np
    import pandas as pd
    from prophet import Prophet
    import xgboost as xgb

    known = [r for r in series if r['date'] <= origin]
    actual = {r['date']: r['price'] for r in known}
    latest = known[-1]['price']
    result = {h: dict(naive=latest, seasonalNaive=actual[origin+timedelta(days=h-7)]) for h in HORIZONS}
    recent = [r for r in known if r['date'] >= origin-timedelta(days=365)]
    if len(recent) < 100:
        raise ValueError('Insufficient recent observations for Prophet')
    frame = pd.DataFrame(dict(ds=pd.to_datetime([r['date'] for r in recent]), y=[r['price'] for r in recent]))
    query_dates = [origin] + [origin+timedelta(days=h) for h in HORIZONS]
    for candidate in prophet_ids:
        model = Prophet(**PROPHET_COMMON, **PROPHET_CANDIDATES[candidate]).fit(frame, seed=SEED)
        predicted = model.predict(pd.DataFrame(dict(ds=pd.to_datetime(query_dates))))['yhat'].tolist()
        for i, h in enumerate(HORIZONS):
            # Anchor the estimated increment to the last observed level, removing fitted level bias.
            result[h][candidate] = round(latest + float(predicted[i+1]-predicted[0]), 4)
    query = xgb.DMatrix(np.asarray([return_features(known)[-1]['values']], dtype=np.float32), nthread=2)
    for h in HORIZONS:
        pairs = return_pairs(known, origin, h)
        if len(pairs) < 100 or any(r['targetDate'] > origin for r in pairs):
            raise ValueError('Insufficient or non-causal XGBoost labels')
        train = xgb.DMatrix(np.asarray([r['values'] for r in pairs], dtype=np.float32),
                            label=np.asarray([r['target'] for r in pairs], dtype=np.float32), nthread=2)
        model = xgb.train(XGB_PARAMS, train, num_boost_round=XGB_ROUNDS)
        residual_return = float(model.predict(query)[0])
        for candidate in xgb_ids:
            result[h][candidate] = round(latest*(1+XGB_CANDIDATES[candidate]*residual_return), 4)
    for predictions in result.values():
        if any(not math.isfinite(v) or v <= 0 for v in predictions.values()):
            raise ValueError('Non-positive or non-finite prediction; artifact not replaced')
    return result


def previous_diagnosis():
    previous_path = ROOT / 'public/data/forecast.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8'))
    findings = []
    for region in previous['regions']:
        for h in region['horizons']:
            rows = h['backtest']
            findings.append(dict(regionId=region['regionId'], days=h['days'], metrics=h['metrics'],
                                 prophetBias=round(sum(r['prophet']-r['actual'] for r in rows)/len(rows), 4),
                                 xgboostBias=round(sum(r['xgboost']-r['actual'] for r in rows)/len(rows), 4)))
    return dict(artifactSha256=hashlib.sha256(previous_path.read_bytes()).hexdigest(),
                comparison='Diagnostic context only: the previous 24 origins differ from this study; not a paired before/after improvement claim.',
                findings=findings,
                interpretation=[
                    'Previous expanding-history Prophet uses a fitted level and long-history trend/seasonality; measured positive bias suggests lag after falling prices. This is a mechanism hypothesis, not causal attribution.',
                    'Previous XGBoost uses price levels and absolute price changes across price regimes; its errors exceed persistence in the prior artifact. Normalized returns and shrinkage are hypotheses tested on earlier validation only.',
                    'Candidates change several settings together; this small study cannot attribute gains to any single change.'
                ])


def main():
    logging.getLogger('cmdstanpy').setLevel(logging.WARNING)
    source_path = ROOT / 'public/data/history.json'
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    if source['sourceId'] != 'mendeley-v3':
        raise ValueError('Study requires the separate Mendeley V3 history')
    generated = datetime.now(timezone.utc).isoformat()
    protocol = dict(
        name='retrospective-temporal-selection-calibration-evaluation', seed=SEED,
        horizonUnit='calendar-day', horizons=list(HORIZONS), counts=COUNTS,
        windowOffsetsFromSourceEndDays=WINDOWS,
        selection='Per region/horizon minimum validation MAE within each family; ties use declared candidate order. Baselines are always retained. No evaluation-driven parameter changes.',
        pairedEligibility='Both exact +1/+7 observed targets and origin-6 observation required; >=730 days history. Evenly spaced eligible origins in each window; no imputation.',
        training='At each origin, every feature and training target is <= origin. Later fits may use earlier evaluation observations once observed; candidate selection and interval widths stay frozen.',
        intervals='80% nominal absolute-error split-conformal rank ceil((n+1)*0.8), calibrated only on the 8 earlier calibration origins per region/horizon/model; lower bound clipped at zero. Serial dependence, selection and small n prevent guaranteed coverage.',
        prospectiveValidation=dict(
            status='specification-only-no-future-observations-or-results', frozenAt=generated,
            source='Keep newly collected Giacaphe observations separate from Mendeley; verify units and source definition. No stitching or fabricated historical values.',
            readiness='Require at least 365 calendar days and 200 observed prices of the same verified source per region before a model forecast; collect until ready or obtain a verified compatible historical feed.',
            selection='Freeze the selected candidate per region/horizon from this artifact; no retuning after prospective observations arrive.',
            recording='Persist origin, source/version/hash, training cutoff, point predictions and generation time before target occurs. Only observations strictly after frozenAt qualify.',
            schedule='First 20 eligible post-readiness origins calibrate intervals; wait until all +7 targets are observed; next 40 eligible origins evaluate. Both horizons and four models share origins; log all missing targets and source failures.',
            acceptance='Report MAE/RMSE/bias, interval coverage/width, and sample counts per region/horizon. A model is eligible for consideration only if MAE improves >=5% over BOTH baselines on >=40 paired origins, with empirical nominal-80% coverage >=0.75; otherwise keep persistence. This is a review gate, not a statistical proof or trading advice.',
            changes='Any protocol/candidate change creates a new version and restarts prospective evaluation; do not reuse outcomes for selection.'
        ))
    artifact = dict(schemaVersion=1, studyType='retrospective', generatedAt=generated,
                    currentEligible=False,
                    currentEligibilityReason='Historical Mendeley observations end 2026-05-22; retrospective results and a stale source cannot support a current market forecast.',
                    sourceId=source['sourceId'], sourceUrl=source['sourceUrl'],
                    sourceSha256=hashlib.sha256(source_bytes).hexdigest(),
                    sourceEnd=max(r['date'] for r in source['rows']), unit='VND/kg',
                    protocol=protocol, protocolSha256=hashlib.sha256(json.dumps(protocol, sort_keys=True).encode()).hexdigest(),
                    implementationSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                    candidates=dict(prophet=dict(version=version('prophet'), common=PROPHET_COMMON,
                                                  candidates=PROPHET_CANDIDATES, windowCalendarDays=365,
                                                  output='lastPrice + fittedTarget - fittedOrigin; flat still has weak weekly seasonality'),
                                    xgboost=dict(version=version('xgboost'), parameters=XGB_PARAMS,
                                                 rounds=XGB_ROUNDS, shrinkageCandidates=XGB_CANDIDATES,
                                                 target='exact-horizon fractional return relative to origin price',
                                                 featureWindow='observation returns 1/2/5/10/20, trailing 5/20 observation mean/price, trailing RMS returns, elapsed calendar gaps, weekday sin/cos; first 19 rows excluded',
                                                 trainingWindowCalendarDays=730)),
                    previousStudyDiagnosis=previous_diagnosis(), regions=[])
    for region_id in ('dak-lak', 'lam-dong'):
        series = sorted([dict(date=date.fromisoformat(r['date']), price=float(r['priceVndKg']))
                         for r in source['rows'] if r['regionId'] == region_id], key=lambda r: r['date'])
        if (len({r['date'] for r in series}) != len(series)
                or any(not math.isfinite(r['price']) or r['price'] <= 0 for r in series)):
            raise ValueError('Duplicate dates or invalid source prices')
        actual = {r['date']: r['price'] for r in series}
        split = temporal_split(series)
        validation = {h: [] for h in HORIZONS}
        for i, origin in enumerate(split['validation']):
            predictions = predict_candidates(series, origin, PROPHET_CANDIDATES, XGB_CANDIDATES)
            for h in HORIZONS:
                validation[h].append(dict(origin=origin.isoformat(), targetDate=(origin+timedelta(days=h)).isoformat(),
                                          actual=actual[origin+timedelta(days=h)], **predictions[h]))
            print(f'{region_id} validation {i+1}/{len(split["validation"])} {origin}', flush=True)
        selections = {h: dict(prophet=select_candidate(validation[h], PROPHET_CANDIDATES),
                             xgboost=select_candidate(validation[h], XGB_CANDIDATES)) for h in HORIZONS}
        partitions = {}
        for partition in ('calibration', 'evaluation'):
            partitions[partition] = {h: [] for h in HORIZONS}
            for i, origin in enumerate(split[partition]):
                predictions = predict_candidates(series, origin,
                                                 [c for c in PROPHET_CANDIDATES if c in {s['prophet'] for s in selections.values()}],
                                                 [c for c in XGB_CANDIDATES if c in {s['xgboost'] for s in selections.values()}])
                for h in HORIZONS:
                    point = predictions[h]
                    partitions[partition][h].append(dict(origin=origin.isoformat(), targetDate=(origin+timedelta(days=h)).isoformat(),
                        actual=actual[origin+timedelta(days=h)], naive=point['naive'], seasonalNaive=point['seasonalNaive'],
                        prophet=point[selections[h]['prophet']], xgboost=point[selections[h]['xgboost']]))
                print(f'{region_id} {partition} {i+1}/{len(split[partition])} {origin}', flush=True)
        region = dict(regionId=region_id, sourceStart=series[0]['date'].isoformat(), sourceEnd=series[-1]['date'].isoformat(),
                      observationCount=len(series),
                      splits={name: dict(n=len(origins), origins=[o.isoformat() for o in origins],
                                         targetDates=sorted({(o+timedelta(days=h)).isoformat() for o in origins for h in HORIZONS}))
                              for name, origins in split.items()}, selections=[], horizons=[])
        for h in HORIZONS:
            validation_metrics = [dict(candidate=c, n=len(validation[h]),
                                       mae=round(sum(abs(r[c]-r['actual']) for r in validation[h])/len(validation[h]), 4))
                                  for c in (*PROPHET_CANDIDATES, *XGB_CANDIDATES)]
            region['selections'].append(dict(days=h, **selections[h], validationMetrics=validation_metrics,
                                              validationBacktest=validation[h]))
            calibration = partitions['calibration'][h]
            quantiles = calibrate(calibration)
            backtest = with_intervals(partitions['evaluation'][h], quantiles)
            region['horizons'].append(dict(days=h, metrics=metrics(backtest), backtest=backtest,
                                           intervalCalibration=dict(n=len(calibration), nominalCoverage=0.8,
                                                                    rank=math.ceil((len(calibration)+1)*0.8),
                                                                    absoluteErrorQuantiles=quantiles),
                                           calibrationBacktest=calibration))
        artifact['regions'].append(region)
        print(json.dumps(dict(region=region_id, metrics=[h['metrics'] for h in region['horizons']])), flush=True)
    output = ROOT / 'public/data/forecast-study.json'
    payload = json.dumps(artifact, ensure_ascii=False, allow_nan=False, separators=(',', ':'))+'\n'
    if len(payload.encode('utf-8')) >= 250000:
        raise ValueError('Study artifact exceeds 250 KB')
    temporary = output.with_suffix('.json.tmp')
    temporary.write_text(payload, encoding='utf-8')
    temporary.replace(output)
    print(f'Wrote {output}: {output.stat().st_size} bytes', flush=True)


if __name__ == '__main__':
    main()

"""Fit real offline Prophet/XGBoost models and export paired rolling backtests."""
from datetime import date, datetime, timedelta, timezone
import hashlib
from importlib.metadata import version
import json
import logging
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HORIZONS = (1, 7)
SEED = 20261110
PROPHET_PARAMS = dict(yearly_seasonality=3, weekly_seasonality=3,
                      daily_seasonality=False, seasonality_prior_scale=1.0,
                      changepoint_prior_scale=0.05, n_changepoints=25,
                      interval_width=0.8, uncertainty_samples=400)
XGB_PARAMS = dict(objective="reg:squarederror", max_depth=3, eta=0.05,
                  min_child_weight=8, subsample=1.0, colsample_bytree=1.0,
                  tree_method="hist", nthread=2, seed=SEED)
XGB_ROUNDS = 140


def feature_rows(series):
    """Observation lags, trailing observation means and known origin calendar only."""
    rows = []
    prices = [r["price"] for r in series]
    for i, row in enumerate(series):
        current = row["date"]
        values = [row["price"]]
        values += [prices[max(0, i - lag)] for lag in (1, 2, 5, 10)]
        values += [sum(prices[max(0, i - window + 1):i + 1]) / min(window, i + 1)
                   for window in (5, 20)]
        values += [(current - series[max(0, i - 1)]["date"]).days,
                   (current - series[max(0, i - 5)]["date"]).days,
                   current.weekday(), current.month, current.timetuple().tm_yday]
        rows.append(dict(origin=current, values=values))
    return rows


def training_pairs(series, cutoff, horizon):
    known = [row for row in series if row["date"] <= cutoff]
    actual = {row["date"]: row["price"] for row in known}
    pairs = []
    for row in feature_rows(known)[19:]:
        target_date = row["origin"] + timedelta(days=horizon)
        if target_date in actual:
            pairs.append(dict(row, targetDate=target_date,
                              target=actual[target_date] - actual[row["origin"]]))
    return pairs


def evaluation_origins(series, count=24):
    actual = {row["date"] for row in series}
    start, end = series[0]["date"], series[-1]["date"]
    eligible = [row["date"] for row in series
                if (row["date"] - start).days >= 730
                and row["date"] >= end - timedelta(days=180)
                and all(row["date"] + timedelta(days=h) in actual for h in HORIZONS)]
    if len(eligible) < count:
        raise ValueError(f"Need {count} common eligible origins; found {len(eligible)}")
    return [eligible[round(i * (len(eligible) - 1) / (count - 1))] for i in range(count)]


def score(rows):
    if not rows:
        raise ValueError("Cannot score an empty backtest")
    for row in rows:
        for key in ("actual", "naive", "prophet", "xgboost", "lower80", "upper80"):
            if row[key] is None or not math.isfinite(row[key]) or row[key] <= 0:
                raise ValueError(f"Invalid paired prediction: {key}")
        if row["lower80"] > row["upper80"]:
            raise ValueError("Reversed prediction interval")
    metrics = []
    for model in ("naive", "prophet", "xgboost"):
        errors = [row[model] - row["actual"] for row in rows]
        metrics.append(dict(model=model, n=len(rows),
                            mae=round(sum(abs(e) for e in errors) / len(rows), 4),
                            rmse=round(math.sqrt(sum(e * e for e in errors) / len(rows)), 4),
                            coverage80=(round(sum(row["lower80"] <= row["actual"] <= row["upper80"]
                                                  for row in rows) / len(rows), 6)
                                        if model == "prophet" else None)))
    return metrics


def predict_at(series, origin):
    import numpy as np
    import pandas as pd
    from prophet import Prophet
    import xgboost as xgb

    known = [row for row in series if row["date"] <= origin]
    frame = pd.DataFrame({"ds": pd.to_datetime([r["date"] for r in known]),
                          "y": [r["price"] for r in known]})
    prophet = Prophet(**PROPHET_PARAMS).fit(frame, seed=SEED)
    targets = [origin + timedelta(days=h) for h in HORIZONS]
    np.random.seed(SEED)
    predicted = prophet.predict(pd.DataFrame({"ds": pd.to_datetime(targets)}))
    latest = feature_rows(known)[-1]
    query = xgb.DMatrix(np.asarray([latest["values"]], dtype=np.float32))
    forecasts = {}
    for i, horizon in enumerate(HORIZONS):
        pairs = training_pairs(known, origin, horizon)
        assert pairs and all(row["targetDate"] <= origin for row in pairs)
        train = xgb.DMatrix(np.asarray([r["values"] for r in pairs], dtype=np.float32),
                            label=np.asarray([r["target"] for r in pairs], dtype=np.float32))
        model = xgb.train(XGB_PARAMS, train, num_boost_round=XGB_ROUNDS)
        point = predicted.iloc[i]
        forecasts[horizon] = dict(
            date=targets[i].isoformat(),
            prophet=dict(yhat=round(float(point["yhat"]), 4),
                         lower80=round(float(point["yhat_lower"]), 4),
                         upper80=round(float(point["yhat_upper"]), 4)),
            xgboost=dict(yhat=round(known[-1]["price"] + float(model.predict(query)[0]), 4)),
            naive=dict(yhat=known[-1]["price"]))
        if any(not math.isfinite(v) or v <= 0
               for name in ("prophet", "xgboost", "naive") for v in forecasts[horizon][name].values()):
            raise ValueError("Non-positive or non-finite forecast; do not publish")
    return forecasts


def main():
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    source_path = ROOT / "public/data/history.json"
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    if source["sourceId"] != "mendeley-v3":
        raise ValueError("Training requires the separate Mendeley V3 source")
    artifact = dict(
        schemaVersion=1, generatedAt=datetime.now(timezone.utc).isoformat(),
        sourceId=source["sourceId"], sourceUrl=source["sourceUrl"],
        sourceSha256=hashlib.sha256(source_bytes).hexdigest(),
        models={"prophet": {"version": version("prophet"), "parameters": PROPHET_PARAMS},
                "xgboost": {"version": version("xgboost"), "parameters": XGB_PARAMS,
                            "numBoostRound": XGB_ROUNDS, "target": "exact-horizon price change from origin"}},
        validation=dict(method="expanding-window-paired-rolling-origin",
                        description="24 evenly spaced common eligible origins per region in final 180 calendar days; >=730 calendar days history. Exact +1/+7 calendar-day observed labels; all three models share every sample. Fixed parameters, no test tuning; each training label <= origin.",
                        originCount=24, horizonUnit="calendar-day", seed=SEED,
                        forecastStatus="historical-origin-unverified", interval="Prophet nominal 80%; empirical coverage measured; not calibrated"),
        regions=[])
    for region_id in ("dak-lak", "lam-dong"):
        series = sorted([dict(date=date.fromisoformat(r["date"]), price=float(r["priceVndKg"]))
                         for r in source["rows"] if r["regionId"] == region_id], key=lambda r: r["date"])
        if len({r["date"] for r in series}) != len(series):
            raise ValueError(f"Duplicate region dates: {region_id}")
        if any(not math.isfinite(r["price"]) or r["price"] <= 0 for r in series):
            raise ValueError(f"Invalid source price: {region_id}")
        actual = {r["date"]: r["price"] for r in series}
        backtests = {h: [] for h in HORIZONS}
        origins = evaluation_origins(series)
        for i, origin in enumerate(origins):
            forecasts = predict_at(series, origin)
            for horizon in HORIZONS:
                f = forecasts[horizon]
                target = origin + timedelta(days=horizon)
                backtests[horizon].append(dict(origin=origin.isoformat(), date=f["date"], actual=actual[target],
                                               naive=f["naive"]["yhat"], prophet=f["prophet"]["yhat"],
                                               xgboost=f["xgboost"]["yhat"], lower80=f["prophet"]["lower80"],
                                               upper80=f["prophet"]["upper80"]))
            print(f"{region_id} {i + 1}/{len(origins)} origin {origin}", flush=True)
        final = predict_at(series, series[-1]["date"])
        region = dict(regionId=region_id, trainStart=series[0]["date"].isoformat(),
                      trainEnd=series[-1]["date"].isoformat(), observationCount=len(series),
                      horizons=[dict(days=h, metrics=score(backtests[h]), backtest=backtests[h], forecast=final[h])
                                for h in HORIZONS])
        artifact["regions"].append(region)
        print(json.dumps({"region": region_id, "metrics": [h["metrics"] for h in region["horizons"]]}), flush=True)
    output = ROOT / "public/data/forecast.json"
    payload = json.dumps(artifact, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n"
    if len(payload.encode("utf-8")) >= 250000:
        raise ValueError("Forecast artifact exceeds 250 KB")
    temporary = output.with_suffix(".json.tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(output)
    print(f"Wrote {output}: {output.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    main()

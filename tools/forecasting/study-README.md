# Retrospective forecasting study

Run from the project root with the existing ignored environment; no new packages:

```powershell
.cache/ml-venv/Scripts/python.exe -m unittest discover -s tools/forecasting -v
.cache/ml-venv/Scripts/python.exe tools/forecasting/study.py
.cache/ml-venv/Scripts/python.exe -m unittest discover -s tools/forecasting -v
```

The script atomically writes `public/data/forecast-study.json` after both regions finish, validating positive finite predictions and JSON without NaN. It never changes `train.py`, `forecast.json`, current market observations or their source identity. The 11 November 2026 run took approximately one minute after imports, produced a 41 KB artifact, and passed all ten forecasting tests. Missing optional Plotly affects interactive Python plotting only; no plot is required or produced.

## Fixed experiment

This is **retrospective**, including the later evaluation period: earlier work already inspected outcomes in part of this historical period. Candidates, split offsets, counts and selection rule were written before this run; this is not a claim that the historical evaluation is pristine or independently preregistered. No settings were changed in response to its evaluation results.

Use only the separate Mendeley V3 histories for Đắk Lắk and Lâm Đồng. Each origin needs at least 730 calendar days of history, both exact +1/+7 observed targets, and an origin−6 observation for the weekly baseline. Sample evenly among eligible origins within each window, without filling missing dates. Each region uses the same origins for both horizons and all four models.

| Partition | Window relative to historical source end | Origins per region | Actual selected origins |
|---|---|---:|---|
| Validation | −365 through −210 calendar days, including target | 6 | 22/05–16/10/2025 |
| Calibration | −200 through −110 days, including target | 8 | 03/11/2025–22/01/2026 |
| Later evaluation | −100 through 0 days, including target | 12 | 23/02–14/05/2026 |

All validation target dates are before the first calibration origin; all calibration target dates are before the first evaluation origin. The artifact contains the complete actual dates. At each rolling origin, all features and training labels are at or before that origin. Retraining can use earlier evaluation observations once those dates have actually occurred; it cannot revise candidate choices or calibration widths.

Minimum validation MAE selects one candidate per model family, region and horizon; ties follow declaration order. This selects among two Prophet and two XGBoost candidates, never a winning family based on evaluation. Baselines remain in every comparison.

* **Persistence/naive:** last observed origin price.
* **Weekly seasonal naive:** actual price on target−7 days. For +7 this equals the origin price and therefore persistence exactly. The +1 reference is origin−6, not the sixth previous observation.
* **Prophet:** recent 365 calendar days, no yearly/daily seasonality, weekly Fourier order 1, seasonality prior 0.1. Compare linear trend with changepoint prior 0.01 against flat trend; common changepoint count 10/range 0.9. Both output `lastPrice + fittedTarget − fittedOrigin`. This uses Prophet's fitted change, anchored to the known level. **Anchored flat +7 is mathematically persistence**, since weekly seasonality repeats after seven days; do not advertise its tie as independent predictive skill. Uncertainty simulations are disabled because intervals are separately calibrated.
* **XGBoost:** direct exact-horizon fractional return, recent 730 calendar days of training origins; 80 rounds, depth 2, learning rate 0.04, minimum child weight 20, L2 10, base score 0, deterministic seed/two threads. Features contain lagged observation returns 1/2/5/10/20, trailing mean/price 5/20, trailing RMS returns, known observation gaps and weekday sine/cosine; no raw future value or price level. Compare multiplying the predicted return by 0.25 or 1 before converting to price. Only the first 19 observation rows are discarded; no target is synthesized.

Official references: [Prophet flat trend](https://github.com/meta/prophet/blob/main/docs/_docs/additional_topics.md#flat-trend), [Prophet changepoints](https://github.com/meta/prophet/blob/main/docs/_docs/trend_changepoints.md), [XGBoost parameters](https://xgboost.readthedocs.io/en/stable/parameter.html). Anchoring and return shrinkage are this experiment's design choices, not claims that either library recommends this forecasting method.

## Intervals and metrics

For each selected model, region and horizon, take the ordered absolute residuals at the eight earlier calibration origins. The finite-sample nominal-80% rank is `ceil((8+1)*0.8)=8`, hence the maximum calibration error. Freeze that half-width through evaluation; clip the lower endpoint at zero. Baselines receive intervals by the same rule. No evaluation outcome calibrates its own interval. Report MAE/RMSE/bias in VND/kg, `1 − modelMAE/naiveMAE`, empirical coverage and mean interval width. Skill is undefined (`null`) only if naive MAE is zero; actual artifact values are finite.

Serial dependence, six selection origins, eight calibration residuals and twelve later evaluation origins provide weak evidence. High empirical coverage can simply reflect wide intervals; nominal 80% is not a coverage guarantee. Common-target eligibility and source gaps restrict the population being evaluated; the study does not claim daily market coverage.

## Result and diagnosis

See [the measured report](../../docs/research/2026-11-11-retrospective-study.md). The strongest measured advantage over persistence is only 2.68% (Lâm Đồng +1 Prophet); no case supports the proposed 5% prospective review gate. No model is approved for a current forecast.

The earlier `forecast.json` has Prophet mean overprediction around 7,832–8,479 VND/kg and XGBoost overprediction around 738–3,492 VND/kg. Long-history fitted-level/trend lag and level-dependent return learning are plausible mechanisms, not established causal explanations. The study changes several settings together and does not isolate their individual contribution. Previous and new sample dates differ, so their aggregate metrics must not be presented as a paired before/after improvement.

## Artifact and future validation

The artifact records source/library versions, source SHA-256, implementation SHA-256, protocol SHA-256, all candidates, validation forecasts/selections, calibration residual forecasts and later evaluation forecasts/metrics. `currentEligible:false` is deliberate. The last source observation is 22 May 2026; no forecast for today is exported. A generated timestamp is not a new market observation. Inspect `regions[].horizons[].metrics` for compact UI summaries and `protocol.prospectiveValidation` for the future protocol.

The frozen prospective specification requires a verified single-source history of at least 365 calendar days/200 observations per region; newly collected Giacaphe and Mendeley histories stay separate. Freeze the historical candidate selections, archive every forecast before its actual target, use the first 20 eligible future origins for calibration, wait for all +7 targets, then evaluate the next 40 paired origins. Require at least 5% MAE improvement over both baselines and empirical coverage of at least 0.75 before considering eligibility. This gate is a review policy, not statistical proof; any candidate/protocol change starts a new prospective version. **No such future observations, results or publication-time logs are invented here.**

The implementation tests prove partition ordering, feature-prefix invariance, exact-date/causal training labels, validation-based selection, quantile/metric arithmetic, source and implementation hashes, observed targets, interval calibration and metric recomputation. They do not establish future predictive performance.

# Offline forecasting

Run from the project root using Python 3.13 (Windows PowerShell):

```powershell
py -3.13 -m venv .cache/ml-venv
.cache/ml-venv/Scripts/python.exe -m pip install -r tools/forecasting/requirements.txt
.cache/ml-venv/Scripts/python.exe -m unittest discover -s tools/forecasting -v
.cache/ml-venv/Scripts/python.exe tools/forecasting/train.py
.cache/ml-venv/Scripts/python.exe -m unittest discover -s tools/forecasting -v
```

The ignored environment holds the real Python libraries; no browser runtime or JavaScript dependencies are added. `requirements.txt` pins the resolved training environment. The script replaces `public/data/forecast.json` only after completing both regions and validating finite positive prices. It records the exact source SHA-256, fixed hyperparameters and model versions. Model binaries are not needed by the app and are not saved.

Each region uses 24 evenly spaced eligible origins during the last 180 calendar days, with at least 730 calendar days of prior history. An origin is eligible only when **both exact +1 and +7 calendar-day actual prices exist**. Every model and horizon uses those same origins; no missing targets are filled. Prophet fits the expanding history through each origin once for both horizons. XGBoost fits a separate direct model per horizon, predicting price change from the origin; training pairs require an actual target on the exact date no later than the cutoff.

Features are current observed price, prior 1/2/5/10 **observations**, trailing means over 5/20 observations, elapsed calendar days since the previous and fifth previous observations, weekday, month and day of year. Every feature uses only information at or before its own origin. The first 19 feature rows are excluded from XGBoost training. Observation lags are deliberately not presented as calendar-day lags. No external regressors, region pooling, source joining, hyperparameter search or test-based selection are used.

Prophet uses linear trend, 25 changepoints, changepoint prior 0.05, fixed yearly/weekly Fourier order 3, seasonality prior 1, no daily seasonality, nominal 80% intervals with 400 simulations. Both Stan and interval simulation are seeded. XGBoost uses squared error, 140 histogram boosting rounds, depth 3, learning rate 0.05, minimum child weight 8, all rows/features, two threads and a fixed seed. See the artifact for exact parameters.

The stdlib tests cover future-price/prefix invariance, exact-date training-label cutoff, common eligible samples and paired metrics. Once generated, the artifact test recomputes reported metrics and coverage, checks observed labels against the source, validates dates and prices and verifies source checksum and size. Test-first evidence: five failing assertions before the pipeline existed; four passing checks and one artifact skip before training; all five checks must pass after training.

Final forecasts originate at the historical last observation, not today's market. Intervals are uncalibrated; empirical coverage is reported only for Prophet. A small paired retrospective experiment cannot establish future performance, and missing dates mean results apply to observed target dates.

API references: [Prophet quick start](https://meta.github.io/prophet/docs/quick_start.html), [Prophet uncertainty](https://meta.github.io/prophet/docs/uncertainty_intervals.html), [XGBoost native Python API](https://xgboost.readthedocs.io/en/stable/python/python_api.html#xgboost.train). Earlier assessment: `docs/research/2026-11-10-prophet-assessment.md`.

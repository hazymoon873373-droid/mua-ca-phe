# Kiểm chứng bổ sung ngày 10/11/2026

- Real Prophet 1.5.0 / XGBoost 3.4.1 fitted in isolated Python3.13 environment: 50 / 100 fits. Two regions, exact1/7calendar-day labels; 24 origins each. See docs/research/forecast-training-results.md.
- Python5/5 including prefix invariance, cutoff-bounded targets, paired origins, actual artifact/source checksum and recalculated metrics. Node25/25 including stale/expired/quality gates, malformed metadata and source-based percentage changes.
- TypeScript check passed. Forecast browser8groups and existing browser13groups passed on dev, including malformed metadata, current-eligible fixture, CSV, keyboard, persistence, recovery and four viewport sizes. Fixtures are browser-only, never stored in the published artifact.
- Fresh independent data/code review verified all96target labels/baselines and source SHA; two P2 fixes and two presentation issues resolved and re-reviewed cleanly.
- Hallmark rendered0FAIL/7WARN/1WAIVED: caption/short-prose measures accepted; selected horizon buttons are outline data controls, not competing primary actions; wide monthly table retains sticky year/focus. Existing large ledger target waiver retained. Actual360/1440forecast captures inspected; mobile graph now scrolls with readable labels and data table alternative.
- Full models lose last-price baseline in all four region/horizon pairs. Empirical Prophet interval coverage41.7–50% vs nominal80%; no calibrated uncertainty claim. Current forecasts withheld because historical training ends22/05/2026. No trading recommendations or automatic ensemble.
- Scheduled source-price updates remain separate from offline model retraining. No new service or production dependency added.

Production build/publication evidence is the native Sites saved-version/deployment result; this document records pre-publication checks only.

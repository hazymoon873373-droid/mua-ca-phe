# Dự báo Robusta bằng Prophet và XGBoost

User request: integrate both real models and complete the existing public coffee website for growers and buyers. Preserve existing Almanac UI, source prices and watches; no buy/sell instructions.

## Approach and scope
Train reproducibly in an isolated Python environment, export a small verified JSON artifact, serve it through the existing Worker and show actual retrospective predictions/metrics. This is suitable for the existing hosting, which does not run Python. A new external Python service would require infrastructure and credentials that are not present. Browser-only surrogate models would misrepresent the requested Prophet/XGBoost and are excluded.

Start with separate Dak Lak and Lam Dong Mendeley V3 series. Compare real Prophet, XGBoost and last-price naive at exact 1/7 calendar-day targets. Use rolling origins with all fitting/features at or before each origin, identical held-out labels, fixed parameters selected without the test labels. Do not fill target labels, pool regions, join sources, or invent results. Keep recent Giacaphe separate.

Show trained-through dates, named horizons, sample counts, MAE/RMSE, actual-vs-predicted observations, naive comparator and Prophet empirical interval coverage. Historical forecasts are labelled by actual origin and target. Live forecast availability requires a fresh eligible artifact and out-of-sample advantage; stale training or weak metrics produce a clear withheld state rather than a current forecast. Raw results and methodology downloadable.

Add a source-dated percentage-change alert beside the existing local price watches; user-configurable percentage, stored locally, no push claims. This is deterministic, not called ML. Errors/empty/loading states must preserve price lookup.

## Files and responsibility
- tools/forecasting/: Python training, locked dependencies, tests and reproduction guide.
- public/data/forecast.json: actual training artifact, no pickle/server execution.
- lib/coffee/forecast.mjs, app/api/forecast/route.ts: contract and freshness/quality gates.
- app/components/forecast-panel.tsx and forecast.css: existing design tokens, model comparison/chart/table; mount in dashboard.tsx and navigation.
- lib/coffee/analytics.mjs and dashboard.tsx: measured percentage-change alert.
- tests/: contract, leakage and browser tests; README and docs/verification updated.

## Acceptance
Both libraries really fitted; no fabricated error rate, automatic ensemble, confidence guarantee or current forecast on old data. No change to source price acquisition or public audience. Reproducible tests, typecheck/build, browser functional/responsive QA, fresh review and public deployment.

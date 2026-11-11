# Competition evidence upgrade implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development; verify each bounded task and request a final independent review.

**Goal:** Implement the technical and evidence-preparation parts of the roadmap the user explicitly asked to execute.
**Architecture:** Keep the public GitHub Pages frontend and existing Sites Worker/D1; reuse current calculator, chart, source parser and Python environment. Preserve Almanac design. Historical model study stays separate from actual live-price observations.
**Tech stack:** React/Vite, Node tests/Playwright, SQLite/D1, Python Prophet/XGBoost.
**Spec:** ../../competition-readiness.md, approved for implementation by the user's quoted request.

## Constraints and rulings
- Preserve all local notebook data and backup format; preserve public audience and hosting identity.
- No invented interviews, user savings, historical uptime or fresh AI forecasts. No trade instructions.
- Metrics describe exactly the period/sample measured. Existing backtest has already been inspected; call the expanded study retrospective, and reserve future collected observations for prospective validation.
- Keep research detail outside the main user flow; one compact forecast/status presentation can link to the technical report.
- No external notification channel is registered or authorized. Do not claim notifications while the site is closed; prepare the relevant acceptance tests and explain this limitation.
- Use existing free tooling; no paid service, extra model family, chatbot or commerce features.

## Tasks
- [x] Data reliability: persist bounded refresh attempt records, expose actual observed success/failure and coverage/date diagnostics. Add additive migration, fail-safe reads, tests for retained prices and truthful missing-day/source counts.
- [x] Forecast study: diagnose current models; temporal validation selects a small predefined candidate set before later evaluation; include naive/seasonal naive, paired targets and finite metrics. Export reproducible retrospective artifact, never label stale results current. Add leakage/split/metric tests and run actual training.
- [x] UI: integrate compact source health and forecast outcome/status with Vietnamese copy, keyboard controls and source/target dates; preserve existing layout and omit long diagnostic dashboard. Test root and Pages subpath plus failures.
- [x] Field kit: publish blank interview/usability templates, calculation instructions, demo storyboard, source-feed request draft and honest evidence checklist. No emails/messages sent; user conducts the interviews.
- [ ] Validate Node/Python tests, typecheck, static and Worker builds, browser flows and independent review. Package/sync using Sites helper; publish Sites and GitHub Pages; verify actual live data and assets.

## Verification focus
- A failed monitoring write cannot erase valid prices or imply source failure where only logging failed.
- Counters begin at migration/deployment, never estimate earlier uptime; snapshot coverage must distinguish calendar gaps and expected trading days.
- Training and candidate selection cannot see outer test targets; source histories remain separate.
- An invalid/stale/unproven model never produces a current forecast card.
- CORS/base paths, local data persistence and mobile layout remain functional.

Pre-publication verification: 39 Node tests, 10 Python tests, typecheck, static build, 13 legacy + 8 lot + 3 backup + 4 evidence browser groups pass; independent review clear. New evidence flow also passes on /mua-ca-phe/ static preview. Hallmark sweep: 0 FAIL; existing six layout/measure warnings remain. Publication verified by hosting workflow, not this source-time checklist.

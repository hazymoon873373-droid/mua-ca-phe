# Mùa Cà Phê implementation plan

User authorized a completely new site and deployment, tracking regional Robusta prices, history and seasonality; exclude buy/sell assertions. Codex chooses defaults and executes without another approval gate. This repository is separate from firm-lens and green-basket.

## Design and scope
Hallmark Almanac, dealt 2/3: cool slate paper, pale chart sheet, blue-black typography and one deep magenta data accent. App workbench with prominent regional price ledger, one large interactive chart, monthly table, local threshold watch and clear source panel. Hanken Grotesk with Vietnamese coverage, monospace numerals. A single credited coffee photograph; no fabricated users, scores or performance. No generative prose disguised as verified analysis.

## Architecture
Sites Vinext/React frontend and Cloudflare Worker, D1 daily observations and source-check state. Public historical CC BY data from Mendeley V3 stays distinct from new Giacaphe snapshots; unequal dates and missing observations remain missing. Fixed upstream URL, hourly fetch throttle, validated HTML parser, daily upsert, stale fallback. Site starts owner-private according to hosting policy. A scheduled cloud update can use the same bounded writer after production access and persistence are verified; never report a schedule as running before it exists.

## Tasks
- [ ] Data worker: actual Mendeley acquisition and provenance, normalized historical JSON, real latest snapshot and source parser tests; no restricted routes or retry after 403.
- [ ] Root: pure analytics tests before implementation: date windows, gaps, change, threshold, CSV escaping and source separation. Then chart helpers and user-facing date labels.
- [ ] Root: D1 schema/migrations and fixed-source sync. Atomic rate-limit claim, validated snapshots only, no arbitrary URL or arbitrary write payload; timeout/error preserves prior prices. Unit test with SQLite-backed D1 adapter and fixture fetch.
- [ ] Root: new dashboard, responsive chart with pointer/keyboard inspection, history filters, monthly aggregation, local watchlist, source/download view. No ML forecast presented as trained, no buy/sell advice. Distinguish latest source date from last checked time, historical coverage ends May 2026.
- [ ] Root: real browser checks at 360/768/1440/1920, Vietnamese typography, source error/stale display, navigation, filters, export and local preferences. Run Hallmark render sweep and fix failures.
- [ ] Read-only fresh reviewer: actionable correctness/security/spec issues; root fixes and reruns affected tests.
- [ ] Root: typecheck/build, source sync/package and deploy exact version with Sites; verify production writer/readback. Add unattended update only if supported access can be exercised, otherwise disclose limit. Return deployed URL and source limitations.

## Verification
`node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run build`, `node tests/browser.mjs`, Hallmark `sloplint ... --scope app --render --url ...`. Test source freshness separately from source observation date. No copied articles, keys, raw dataset archive, caches or browser screenshots in source history.

## Data rulings
- Metadata's 5,445 rows are not 5,445 distinct days; regional coverage differs. No interpolation to make a smooth chart.
- Historical Mendeley V3 and new Giacaphe records are never concatenated as one supposedly homogeneous series.
- Giacaphe records are reference prices, not guaranteed local transaction offers. Source reuse/feed conditions remain unconfirmed; keep source attribution and do not imply partnership.
- Prototype source history request returned 403; stop rather than bypass. Newly collected history starts from deployment and is labeled as such.

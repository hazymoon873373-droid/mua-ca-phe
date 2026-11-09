# Verification record

- 20 Node tests pass: actual CSS price fixture, dates, complete four-region validation, source separation, monthly aggregation, CSV, thresholds, fallback regression and SQLite-backed D1 sync failure/rate-limit behavior.
- TypeScript `tsc --noEmit` passes.
- 13 Chrome browser checks pass: real local D1 API, source/date coverage, filters, keyboard chart readout, CSV, tables, local watch persistence/remove/undo, storage/network fixtures and360/768/1440/1920 widths. Evidence: `verification/browser.json`.
- Actual local server read/parsed the public source and persisted four rows into D1; subsequent request returned cached results with storageReady=true. A one-time live read is not an uptime guarantee.
- Fresh read-only review found fallback regression, inaccessible keyboard changes and silent2000-row history cap. All addressed: preserve newer values/merge status, atomic live readout, remove cap. Regression test included.
- Production dependency audit (`npm audit --omit=dev`) reports0 vulnerabilities. Template development tooling still has transitive advisory findings; do not claim a clean full dependency audit. Preview binds only to loopback. Next, Zod, Sharp override, Vite and image-size were patched; no upload/untrusted-image feature added.
- Hallmark source/render sweeps found no actual floor design violations after fixes. The JSX-only static photo checker cannot see React attribution across contexts; photo/author/license verified in real browser and rendered HTML. Region quote cells intentionally exceed form-control height; full-cell hit targets retain reading order. Horizontal monthly table pins its year column and is keyboard-focusable. Do not count these as uncorrected contrast or clipping errors.
- Local capture/screenshot files are QA artifacts and excluded from source. No simulated API response is stored as public price data.

Version 1 deployed publicly and passed all 13 browser checks on the public origin. Production exposed a request-disconnect interruption before a source fetch finished; version 2 retains the refresh through Cloudflare waitUntil and recovers an unfinished lease after five minutes. Two execution-context tests and an interrupted-lease regression pass. Production readback and unattended scheduling are verified after this patch is deployed.

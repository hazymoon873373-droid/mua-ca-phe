# Dual Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real Prophet/XGBoost retrospective forecasting and transparent alerts to Mùa Cà Phê.
**Architecture:** Isolated offline training exports JSON; existing Worker serves results; React shows evidence and gates stale live forecasts.
**Tech Stack:** Python Prophet/XGBoost, React/TypeScript, existing Cloudflare Worker/D1.
**Spec:** ../specs/2026-11-10-dual-forecast-design.md

## Global Constraints
- Separate regions and source series; no invented labels, no future leakage, exact calendar horizons 1/7.
- Preserve existing public Site identity/audience and Almanac tokens.
- Historical model output is never presented as current forecasting; no buy/sell recommendations.
- Real Prophet and XGBoost fitting, explicit naive baseline, no metric claims without measured output.
- No new paid external service, unsafe model loading or request-time training.

## Review Focus
- Stale artifact or malformed output withholds forecast and preserves lookup.
- Target construction and feature engineering never read after origin.
- All models share actual labels and cutoffs; missing future labels are not imputed.
- Percentage change handles absent/zero/nonfinite prior prices and invalid thresholds.
- New controls have loading/error/empty states, Vietnamese text and mobile layout.

### Task 1: Real offline model artifact
- [ ] Write leakage/target tests, observe failure, implement/train both libraries and naive.
- [ ] Fixed, bounded rolling-origin backtest for Dak Lak/Lam Dong, 1/7 calendar days; final fit outputs dated historical-origin forecasts.
- [ ] Export schemaVersion 1 manifest specified in task-1-brief.md, library versions, source SHA256, methodology and actual metrics.
- [ ] Run Python tests and verify output invariants; report exact training scope and limits.

### Task 2: Forecast experience and alerts
- [ ] Write failing Node tests for artifact validation, freshness/quality gates and percentage change; implement pure helpers and GET endpoint.
- [ ] Add model panel using existing tokens, metrics table, accessible chart and predictions, source/cutoff notes, CSV/JSON downloads and retry states.
- [ ] Mount in dashboard, add nav link and user-set percentage alert alongside current watches; preserve existing behavior.

### Task 3: Review and publication
- [ ] Run Node/Python tests, typecheck, browser regression and dedicated forecast states at desktop/mobile.
- [ ] Fresh code/domain review, fix material issues, render visual inspection.
- [ ] Source helper build/package, save and public deploy exact verified source, confirm production endpoint and retained source data.

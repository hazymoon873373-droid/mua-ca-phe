# Coffee data provenance and reproducibility

`public/data/history.json` is an observed domestic Robusta price series, source ID `mendeley-v3`, with 5,445 rows. It retains every original coffee price observation and introduces no missing dates. Schema: `{schemaVersion, sourceId, sourceUrl, unit, coverage, rows:[{date, regionId, priceVndKg, sourceId}]}`. Exact regional coverage and limitations are in `public/data/provenance.json`.

The licensed source is [VNCoffeePrice, version 3](https://data.mendeley.com/datasets/p8fhcw59b7/3), DOI `10.17632/p8fhcw59b7.3`, by Tan Nguyen Duc and Hai Nguyen Chi, published 2026-07-23 under CC BY 4.0. Original domestic-price provenance is not established to official-statistics-grade standards. The archive README has an older DOI and provisional license note; the version-3 landing page is explicit about the deposited license.

Research downloaded only public dataset resources. The endpoint was derived from the public `/datasets/bundle.js`, not guessed repeatedly:

```text
https://data.mendeley.com/public-api/datasets/p8fhcw59b7/files?folder_id=root&version=3&$start=0&$limit=1000
Accept: application/vnd.mendeley-public-dataset.1+json
```

That endpoint returned `VNCoffeePrice_mendeley_package_ENv2.zip` (473,770 bytes); its `content_details.download_url` was used. The extracted folder is `VNCoffeePrice_mendeley_package_EN_v5`. Archive and CSV SHA-256 hashes are included in provenance. Copies of original downloads remain in ignored `.cache/coffee-data/` only. No source scripts were executed. `code/build_dataset.py` was read to verify that forward/backward filling affected exogenous variables only, and `tools/coffee-data-export.py` independently compares every retained coffee price with the three raw domestic source files.

Offline re-export after obtaining the same archive and extracting it into `.cache/coffee-data/mendeley/`:

```sh
python tools/coffee-data-export.py
node tools/coffee-data-snapshot.mjs .cache/coffee-data/giacaphe-latest.html
node --test tests/coffee-source.test.mjs
```

`latest.json` is a **single public-page snapshot** from [Giacaphe.com / Y5Cafe](https://giacaphe.com/gia-ca-phe-noi-dia/). `sourceDate` is the page's observation date; `fetchedAt` records the original downloaded HTML modification timestamp in UTC, not the import time. Only domestic regional prices and movements were retained; no articles, futures, pepper, FX, or website-wide average were republished. `sourceLicenseUnconfirmed: true` is intentional. Public accessibility and one successful read establish neither republication permission nor reliable ongoing access.

The main page linked 14 daily dates. The first additional historical-page request returned HTTP 403; collection stopped without retries, browser impersonation, private routes, login, or bypass. The `/quotes`, `/services`, and `/apps` routes were never accessed. The current four-price snapshot cannot supply a recent daily trend. It must remain separate from the older Mendeley series, with the intervening gap visible.

`source.mjs` decodes the CSS `::after` values as data without executing JavaScript and fails if dates, required regions, or numerical fields are missing/malformed. `coffee-data-fixture.html` is a minimized extraction of the real fetched page containing only its date, numeric CSS and price table. Tests also cover invalid dates/numbers, conflicting CSS, zero/negative movements, optional Kon Tum, conflicting duplicate history, source separation and incomplete calendar years.

`monthlyAverages` groups by source, region and year-month, using only observed dates. `seasonalProfile` requires one source and one region. It excludes years missing any calendar month, computes each month's observed mean relative to the equal-month annual mean, then averages monthly deviations equally across eligible years. Available complete years are 2020–2025 for Đắk Lắk and Lâm Đồng; 2024–2025 for Gia Lai, Đắk Nông and Kon Tum. Missing individual days remain missing. These are descriptive historical comparisons, not forecasts, causal effects, or buy/sell advice.

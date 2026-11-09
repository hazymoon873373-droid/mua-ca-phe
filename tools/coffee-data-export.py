"""Export only observed domestic prices from the downloaded Mendeley archive; no network calls."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/coffee-data'
SOURCE = 'https://data.mendeley.com/datasets/p8fhcw59b7/3'
REGIONS = {'Dak Lak': 'dak-lak', 'Lam Dong': 'lam-dong', 'Gia Lai': 'gia-lai', 'Dak Nong': 'dak-nong', 'Kon Tum': 'kon-tum'}


def export():
    package = CACHE / 'mendeley/VNCoffeePrice_mendeley_package_EN_v5'
    dataset = package / 'vietnam_coffee_price_dataset.csv'
    source_rows = list(csv.DictReader(dataset.open(encoding='utf-8-sig')))
    rows = sorted((dict(date=r['date'], regionId=REGIONS[r['province']], priceVndKg=float(r['coffee_price_vnd_kg']), sourceId='mendeley-v3') for r in source_rows), key=lambda r: (r['date'], r['regionId']))
    assert len(rows) == 5445 and len({(r['date'], r['regionId']) for r in rows}) == len(rows)
    assert all(1000 <= r['priceVndKg'] <= 1_000_000 for r in rows)
    # The upstream build script fills exogenous variables only; verify domestic values against the raw files.
    raw = {}
    for split in ('train', 'val', 'test'):
        for row in csv.DictReader((package / f'raw_data/coffee_price_{split}.csv').open(encoding='utf-8-sig')):
            day, month, year = row['date'].split('/')
            key = (f'{year}-{month}-{day}', REGIONS[row['province']])
            assert key not in raw
            raw[key] = float(row['price_vnd'])
    assert len(raw) == len(rows) and all(raw[r['date'], r['regionId']] == r['priceVndKg'] for r in rows)
    coverage = []
    for region in REGIONS.values():
        observations = [r for r in rows if r['regionId'] == region]
        coverage.append(dict(regionId=region, startDate=observations[0]['date'], endDate=observations[-1]['date'], observationCount=len(observations)))
    target = ROOT / 'public/data'
    target.mkdir(parents=True, exist_ok=True)
    history = dict(schemaVersion=1, sourceId='mendeley-v3', sourceUrl=SOURCE, unit='VND/kg', coverage=coverage, rows=rows)
    (target / 'history.json').write_text(json.dumps(history, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    provenance = dict(
        schemaVersion=1,
        historical=dict(
            sourceId='mendeley-v3', title='VNCoffeePrice: A Multi-Source Dataset for Robusta Coffee Price Forecasting in Vietnam (2020–2026)',
            authors=['Tan Nguyen Duc', 'Hai Nguyen Chi'], sourceUrl=SOURCE, doi='10.17632/p8fhcw59b7.3', version=3,
            publishedDate='2026-07-23', license='CC BY 4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/',
            archiveFilename='VNCoffeePrice_mendeley_package_ENv2.zip', archiveSha256=hashlib.sha256((CACHE / 'mendeley.zip').read_bytes()).hexdigest(),
            upstreamCsv='vietnam_coffee_price_dataset.csv', upstreamCsvSha256=hashlib.sha256(dataset.read_bytes()).hexdigest(),
            upstreamRows=len(source_rows), upstreamColumns=list(source_rows[0]), coverage=coverage,
            transformation='Only date, province and domestic coffee_price_vnd_kg retained; province IDs normalized. All 5,445 values verified against raw train/val/test domestic files. No interpolation, averaging, or forward/backward filling.',
            limitations=[
                'The publisher does not establish official-statistics-grade provenance for the original domestic coffee price series; independently verify before relying on it.',
                'Dates are irregular and coverage differs by region. Dak Nong and Kon Tum stop on 2026-01-16; the other three end on 2026-05-22.',
                'Exogenous fields in the upstream merged dataset were forward/backward filled; these fields are excluded here. Domestic prices were not filled by the build script.',
                'The archive README contains a provisional license note and an older DOI; the public version-3 landing page explicitly declares CC BY 4.0 and DOI 10.17632/p8fhcw59b7.3.',
            ]),
        latest=dict(sourceId='giacaphe-snapshot', sourceUrl='https://giacaphe.com/gia-ca-phe-noi-dia/', attribution='Giá tham khảo trong nước: Giacaphe.com / Y5Cafe', sourceLicenseUnconfirmed=True,
                    limitations=['One public snapshot only; no permission or service agreement for ongoing republication has been established.', 'The first linked historical page returned HTTP 403; collection stopped without bypass. No recent daily history is available.', 'Quoted reference prices may differ from actual local transactions. Fetch time and source observation date are distinct.']),
        methodology=dict(
            sourcesKeptSeparate=True, missingObservationsFilled=False, forecastIncluded=False,
            seasonality='For one region and one historical source, use only calendar years with observations in all 12 months. Compute each monthly observed-price mean, divide by the equal-month annual mean, subtract 1, and average percentage deviations across eligible years. This describes historical patterns, not a price forecast or trading recommendation.'),
    )
    (target / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Exported {len(rows)} verified observations across {len(coverage)} provinces.')


if __name__ == '__main__':
    export()

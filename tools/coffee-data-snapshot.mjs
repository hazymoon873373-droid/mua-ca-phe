import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDomesticPrices } from '../lib/coffee/source.mjs';

// Offline import only: fetching and reuse rights must be reviewed before any automated refresh is enabled.
const input = resolve(process.argv[2] ?? '.cache/coffee-data/giacaphe-latest.html');
const snapshot = parseDomesticPrices(await readFile(input, 'utf8'));
const fetchedAt = (await stat(input)).mtime.toISOString();
const latest = {
  schemaVersion: 1,
  sourceId: 'giacaphe-snapshot',
  ...snapshot,
  fetchedAt,
  sourceAttribution: 'Giacaphe.com / Y5Cafe — giá tham khảo trong nước',
  sourceLicenseUnconfirmed: true,
  collectionMode: 'single-public-page-snapshot',
};
const output = resolve('public/data/latest.json');
await writeFile(`${output}.tmp`, JSON.stringify(latest, null, 2) + '\n');
await rename(`${output}.tmp`, output);
console.log(`Imported ${latest.regions.length} regions for ${latest.sourceDate}, fetched ${fetchedAt}`);

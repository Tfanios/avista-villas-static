#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { loadSchemas } from './payload-export/schema.mjs';
import { fetchSnapshot } from './payload-export/client.mjs';
import { convertSnapshot } from './payload-export/convert.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: {
  url: { type: 'string' }, out: { type: 'string' }, 'payload-dir': { type: 'string' },
  'from-snapshot': { type: 'string' }, 'include-drafts': { type: 'boolean' },
  'include-versions': { type: 'boolean' }, 'include-enquiries': { type: 'boolean' },
  'download-media': { type: 'boolean' }, help: { type: 'boolean' },
} });

if (values.help) {
  console.log(`Export Payload to an EmDash seed without modifying either CMS.

Usage: npm run export:emdash -- --url https://your-payload-host
  --payload-dir PATH    Schema source (default: ../payload-avista)
  --out PATH            New output directory (default: exports/payload-TIMESTAMP)
  --from-snapshot PATH  Convert a prior payload-snapshot.json offline
  --download-media     Save original CMS media files and SHA-256 checksums
  --include-drafts     Archive latest draft content (requires PAYLOAD_TOKEN)
  --include-versions   Archive version history (requires PAYLOAD_TOKEN)
  --include-enquiries  Archive private enquiries (requires PAYLOAD_TOKEN)

Environment: PAYLOAD_URL; PAYLOAD_TOKEN = existing Payload user JWT.
No credentials are written to the export. Users/passwords are never exported.
Drafts, versions and enquiries are archived only, not added to the public seed.
The output directory must not already exist. See PAYLOAD-EXPORT.md.`);
} else {
  try {
    const source = values.url || process.env.PAYLOAD_URL;
    if (!source && !values['from-snapshot']) throw new Error('Supply --url or PAYLOAD_URL, or --from-snapshot');
    if (values['from-snapshot'] && ['include-drafts', 'include-versions', 'include-enquiries'].some(key => values[key])) throw new Error('Archive flags apply only to a live export');
    const schemas = loadSchemas(path.resolve(values['payload-dir'] || path.join(root, '../payload-avista')));
    const destination = path.resolve(values.out || path.join(root, 'exports', `payload-${new Date().toISOString().replace(/[:.]/g, '-')}`));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.mkdir(destination, { mode: 0o700 }); // Refuse to overwrite an earlier export.
    const write = (name, value) => fs.writeFile(path.join(destination, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await write('report.json', { complete: false, stage: 'fetching' });
    const snapshot = values['from-snapshot']
      ? JSON.parse(await fs.readFile(values['from-snapshot'], 'utf8'))
      : await fetchSnapshot(source, { token: process.env.PAYLOAD_TOKEN, includeDrafts: values['include-drafts'], includeVersions: values['include-versions'], includeEnquiries: values['include-enquiries'] });
    if (snapshot.format !== 'avista-payload-snapshot-v1') throw new Error('Unrecognized snapshot format');
    await write('payload-snapshot.json', snapshot);
    await write('report.json', { complete: false, stage: 'converting', note: 'Raw snapshot saved; unsupported content fails conversion instead of being discarded.' });
    const { seed, mapping, manifest, warnings } = convertSnapshot(snapshot, schemas);
    await write('field-map.json', mapping);
    await write('media-manifest.json', manifest);
    if (values['download-media']) {
      await write('report.json', { complete: false, stage: 'downloading-media', mediaCount: manifest.length });
      await fs.mkdir(path.join(destination, 'media'), { mode: 0o700 });
      for (const [index, item] of manifest.entries()) {
        // No CMS credentials sent to media hosts or redirected URLs.
        const response = await fetch(item.sourceUrl, { signal: AbortSignal.timeout(120_000) });
        if (!response.ok || !response.body) throw new Error(`Media ${item.payloadId} download failed (${response.status})`);
        const filename = `${index + 1}-${path.basename(item.filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        item.localFile = `media/${filename}`;
        const hash = createHash('sha256');
        let bytes = 0;
        const meter = new Transform({ transform(chunk, encoding, callback) { hash.update(chunk); bytes += chunk.length; callback(null, chunk); } });
        await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(path.join(destination, item.localFile), { flags: 'wx', mode: 0o600 }));
        item.sha256 = hash.digest('hex');
        item.bytes = bytes;
      }
      await write('media-manifest.json', manifest);
    }
    await write('seed.json', seed);
    await write('report.json', { complete: true, exportedAt: snapshot.exportedAt, counts: Object.fromEntries(Object.entries(seed.content).map(([key, docs]) => [key, docs.length])), mediaDownloaded: !!values['download-media'], archives: Object.keys(snapshot.archives || {}), warnings, validation: 'Exporter checks passed. Validate and test-import with the target EmDash version before deployment.' });
    console.log(`Export complete: ${destination}\n${manifest.length} media records. No CMS data was changed.\nSee report.json and PAYLOAD-EXPORT.md before importing.`);
  } catch (error) {
    console.error(`Export failed: ${error.message}`);
    process.exitCode = 1;
  }
}

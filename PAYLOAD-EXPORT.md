# Export Avista from Payload to EmDash

This tool lives in the Astro repository and reads the field definitions in
`../payload-avista`. It does **not** start Payload, import its runtime config,
run migrations, write to D1/R2, install EmDash, or change the live website.
It uses GET requests against Payload's REST API. Node 22+ and this project's
installed dependencies (including TypeScript) are required.

## Export published content

```sh
npm run export:emdash -- --url https://payload-avista-villas.fanis1337.workers.dev
```

To also save original uploaded files locally:

```sh
npm run export:emdash -- --url https://payload-avista-villas.fanis1337.workers.dev --download-media
```

Exports go into a new timestamped directory under `exports/`, which is gitignored.
Use `--out PATH` to choose a different **new** directory; existing directories
are never overwritten. Keep custom output paths out of version control too.
Pause content editing while taking a final export: pagination checks counts and
duplicate IDs, but multiple API calls are not a database transaction.

## Files produced

- `seed.json`: EmDash seed format version 1, with model and published content.
- `payload-snapshot.json`: original API records, including source timestamps and
  Lexical rich text; private archives if explicitly requested.
- `field-map.json`: source field paths mapped to EmDash field names.
- `media-manifest.json`: all media records with source URLs and original R2 keys;
  local filenames, sizes, and SHA-256 hashes when downloads are enabled.
- `report.json`: counts, warnings and completion state. Only `complete: true`
  means all requested work finished. Failed conversion retains the raw snapshot.
- `media/`: optional downloaded original CMS uploads. External hero video URLs
  are preserved in content but their bytes are not downloaded.

The tool paginates properties, reviews and media, reads all six globals, preserves
property slugs and ordering, and resolves property references through seed-local
`$ref:` IDs. All media, including unused uploads, are included through a hidden
`payload_media_archive` collection containing `$media` references.

Groups become separate named fields, e.g. `hero.imageDesktop` becomes
`hero_image_desktop`. Simple arrays become repeaters. Nested arrays (footer
columns and local-guide categories) become JSON because EmDash repeaters cannot
contain other repeaters. Their full structure survives, but those editing forms
need a design pass before launch. Globals become non-routable collections with
one stable entry each; this does not enforce singleton editing in the admin.
Custom Payload access rules, validators, hooks and admin components need a
separate implementation. Required-field enforcement is relaxed in the seed to
retain incomplete existing records. No website templates are generated.

Supported Lexical content: paragraphs, headings, quotes, bullet/number lists,
line breaks, external links and common text marks. Unsupported nodes fail the
export rather than silently losing content. The raw snapshot remains available.

## Optional private archives

Set `PAYLOAD_TOKEN` in your terminal environment to an existing Payload user JWT.
Do not put it in a command argument or commit it. The exporter sends it only to
the configured CMS, refuses authenticated remote HTTP, and does not log it.
This backend has ordinary Payload user auth; it does not configure API keys.

```sh
npm run export:emdash -- --url https://payload-avista-villas.fanis1337.workers.dev --include-drafts --include-versions --include-enquiries --download-media
```

These flags preserve latest draft records, version history, and enquiries in
the **raw snapshot only**. They do not publish drafts, recreate EmDash revision
history, or expose enquiries as website content. Users, passwords, and sessions
are excluded. Treat private exports as backups containing personal data.
This is a content export, not a complete D1/R2 disaster-recovery backup.

## Convert again without calling Payload

```sh
npm run export:emdash -- --from-snapshot exports/YOUR-EXPORT/payload-snapshot.json
```

Conversion reads the schema definitions from the sibling Payload repository;
keep that version available with your export. Use `--payload-dir PATH` if moved.
Without `--download-media`, this offline mode makes no network requests.

## Import later, after EmDash is set up

Do this in a separate staging EmDash project with a new database. The export
does not run any of these commands automatically.

1. Review `report.json`, field mappings, and record counts.
2. Validate using the **installed target EmDash version**:

   ```sh
   npx emdash seed /absolute/path/to/export/seed.json --validate
   ```

3. For initial setup, copy `seed.json` to that project's `seed/seed.json`, select
   it via `package.json` → `emdash.seed`, and include sample content in the setup
   wizard. Here, “sample content” is the exported Avista content.
4. Supply the target media storage adapter. Seed `$media` values download from
   the source URLs and create new media records; they do **not** reuse existing
   Payload records or automatically adopt their R2 object keys. Keep Payload
   online until this completes. A separate destination bucket is recommended.
5. For an explicit programmatic import, use `applySeed(db, seed, { includeContent:
   true, storage, onConflict: 'skip' })`. Without storage, media may become null.
   `skipMediaDownload: true` instead retains external URLs, leaving a dependency
   on the Payload media server. Local media copies are backups; `$media` does not
   accept a local file path. To import after Payload shuts down, first serve the
   saved files from a reachable media origin and rewrite their seed URLs.
6. Test routes, content, relationships, gallery order, media, draft visibility,
   editing and publishing before switching the live site. New field names and
   reference query shapes require adapting the frontend content loader.

Official references: [Seed files](https://docs.emdashcms.com/themes/seed-files/),
[field types](https://docs.emdashcms.com/reference/field-types/),
[Payload REST API](https://payloadcms.com/docs/rest-api/overview).

## Test the exporter

```sh
npm run test:export
```

Tests use fixtures and a mock HTTP client; they do not contact production.

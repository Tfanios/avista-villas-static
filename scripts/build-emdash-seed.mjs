#!/usr/bin/env node
// Turn a Payload export into the seed EmDash bundles at build time.
// Usage: npm run seed:build -- exports/payload-<timestamp>/seed.json
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT = 'seed/seed.json';

const COLLECTIONS = {
  properties: { label: 'Villas', labelSingular: 'Villa', titleField: 'name', urlPattern: '/{slug}' },
  reviews: { label: 'Reviews', labelSingular: 'Review', titleField: 'author_name' },
  site_settings: { label: 'Site settings', labelSingular: 'Site settings', titleField: 'brand_name' },
  navigation: { label: 'Navigation', labelSingular: 'Navigation' },
  footer: { label: 'Footer', labelSingular: 'Footer' },
  home: { label: 'Home page', labelSingular: 'Home page', titleField: 'hero_title' },
  location_page: { label: 'Location page', labelSingular: 'Location page', titleField: 'hero_title' },
  contact_page: { label: 'Contact page', labelSingular: 'Contact page', titleField: 'hero_title' },
};

// Section visibility toggles. Off = the section was commented out of the template
// before the migration, so the site looks the same until an editor enables it.
const SECTIONS = {
  properties: { hero: true, spaces: true, amenities: true, gallery: true, reviews: true, map: true, location: false, cross_link: false, cta: true },
  home: { hero: true, intro: true, villas: true, gallery: true, services: false, location: true, cta: true },
  location_page: { hero: true, overview: false, cta: true },
  contact_page: { hero: true, enquiry: true, map: true },
  footer: { footer: true },
};

const sectionLabel = name => `Show ${name.replaceAll('_', ' ')} section`;

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run seed:build -- exports/payload-<timestamp>/seed.json');
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(source, 'utf8'));
seed.meta = { name: 'Avista Villas', description: 'Avista content migrated from Payload CMS' };
seed.collections = seed.collections.map(collection => {
  const toggles = Object.entries(SECTIONS[collection.slug] ?? {}).map(([name, shown]) => ({
    slug: `show_${name}`,
    label: sectionLabel(name),
    type: 'boolean',
    defaultValue: shown,
  }));
  return { ...collection, ...COLLECTIONS[collection.slug], fields: [...toggles, ...collection.fields] };
});

for (const [collection, sections] of Object.entries(SECTIONS)) {
  for (const entry of seed.content[collection]) {
    for (const [name, shown] of Object.entries(sections)) entry.data[`show_${name}`] = shown;
  }
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Wrote ${OUTPUT} from ${source}`);

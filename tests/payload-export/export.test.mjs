import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, fetchSnapshot } from '../../scripts/payload-export/client.mjs';
import { convertSnapshot, lexicalToPortableText } from '../../scripts/payload-export/convert.mjs';
import { seedField, flattenFields } from '../../scripts/payload-export/schema.mjs';

const text = text => ({ type: 'text', text, format: 0 });
const rich = (...children) => ({ root: { children } });
const paragraph = (...children) => ({ type: 'paragraph', children });
const globals = ['siteSettings', 'navigation', 'footer', 'home', 'locationPage', 'contactPage'];
function fixture() {
  const schemas = Object.fromEntries(globals.map(key => [key, { fields: [] }]));
  schemas.properties = { fields: [{ name: 'name', type: 'text' }, { name: 'slug', type: 'text' }, { name: 'hero', type: 'group', fields: [{ name: 'imageDesktop', type: 'upload' }] }] };
  schemas.reviews = { fields: [{ name: 'property', type: 'relationship', relationTo: 'properties' }] };
  schemas.home = { fields: [{ name: 'featured', type: 'relationship', relationTo: 'properties', hasMany: true }] };
  const snapshot = { source: 'https://cms.example', collections: { properties: [{ id: 1, slug: 'villa', name: 'Villa', hero: { imageDesktop: 7 }, _status: 'published' }], reviews: [{ id: 2, property: 1 }], media: [{ id: 7, filename: 'villa.jpg', url: '/api/media/file/villa.jpg', alt: 'Villa' }] }, globals: Object.fromEntries(globals.map(key => [key, {}])) };
  snapshot.globals.home.featured = [1];
  return { schemas, snapshot };
}

test('paginated read keeps auth on GET and refuses duplicate or changing results', async () => {
  const calls = [];
  const client = createClient('https://cms.example', { token: 'test-token', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    const page = Number(url.searchParams.get('page'));
    return Response.json({ docs: [{ id: page }], totalDocs: 2, hasNextPage: page === 1, nextPage: page + 1 });
  } });
  assert.deepEqual(await client.all('properties'), [{ id: 1 }, { id: 2 }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'JWT test-token');
  const bad = createClient('https://cms.example', { fetchImpl: async () => Response.json({ docs: [{ id: 1 }], totalDocs: 2, hasNextPage: true, nextPage: 2 }) });
  await assert.rejects(bad.all('properties'), /duplicate/);
});

test('private archives require authentication and API failures are fatal', async () => {
  await assert.rejects(fetchSnapshot('https://cms.example', { includeDrafts: true }), /PAYLOAD_TOKEN/);
  const client = createClient('https://cms.example', { fetchImpl: async () => new Response('secret response', { status: 403 }) });
  await assert.rejects(client.get('media'), /403/);
  assert.throws(() => createClient('http://cms.example', { token: 'secret' }), /HTTPS/);
});

test('seed preserves slugs, groups, media, and property relationships', () => {
  const { snapshot, schemas } = fixture();
  const { seed, manifest } = convertSnapshot(snapshot, schemas);
  assert.equal(seed.version, '1');
  assert.equal(seed.content.properties[0].slug, 'villa');
  assert.equal(seed.content.properties[0].data.hero_image_desktop.$media.url, 'https://cms.example/api/media/file/villa.jpg');
  assert.equal(seed.content.reviews[0].data.property, '$ref:payload-properties-1');
  assert.deepEqual(seed.content.home[0].data.featured, ['$ref:payload-properties-1']);
  assert.equal(seed.collections.find(c => c.slug === 'home').fields[0].validation.multiple, true);
  assert.equal(seed.content.payload_media_archive.length, manifest.length);
  snapshot.collections.reviews[0].property = 999;
  assert.throws(() => convertSnapshot(snapshot, schemas), /Missing property/);
});

test('drafts and missing uploads never silently publish', () => {
  const { snapshot, schemas } = fixture();
  snapshot.collections.properties[0]._status = 'draft';
  assert.throws(() => convertSnapshot(snapshot, schemas), /Refusing to publish/);
  snapshot.collections.properties[0]._status = 'published';
  snapshot.collections.media = [];
  assert.throws(() => convertSnapshot(snapshot, schemas), /Missing media/);
});

test('Lexical text preserves bold, links, line breaks, headings and lists', () => {
  const converted = lexicalToPortableText(rich(
    { type: 'heading', tag: 'h2', children: [text('Title')] },
    paragraph({ ...text('Bold'), format: 1 }, { type: 'linebreak' }, { type: 'link', fields: { url: 'https://example.com' }, children: [text('Link')] }),
    { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [text('One')] }] },
  ));
  assert.equal(converted[0].style, 'h2');
  assert.deepEqual(converted[1].children[0].marks, ['strong']);
  assert.equal(converted[1].children[1].text, '\n');
  assert.equal(converted[1].markDefs[0].href, 'https://example.com');
  assert.equal(converted[2].listItem, 'bullet');
  assert.throws(() => lexicalToPortableText(rich({ type: 'upload' })), /Unsupported/);
});

test('nested arrays use JSON, simple arrays produce supported repeaters', () => {
  const [field] = flattenFields([{ name: 'categories', type: 'array', fields: [{ name: 'places', type: 'array', fields: [{ name: 'name', type: 'text' }] }] }]);
  assert.equal(seedField(field).type, 'json');
  const [gallery] = flattenFields([{ name: 'gallery', type: 'array', fields: [{ name: 'layout', type: 'select', options: ['l', 'p'] }] }]);
  assert.deepEqual(seedField(gallery).validation.subFields[0].options, ['l', 'p']);
});

test('published snapshot explicitly requests published records and archives stay separate', async () => {
  const calls = [];
  const snapshot = await fetchSnapshot('https://cms.example', { token: 'test', includeDrafts: true, includeVersions: true, includeEnquiries: true, fetchImpl: async url => {
    calls.push(url);
    if (url.pathname.includes('/globals/') && !url.pathname.endsWith('/versions')) return Response.json({ id: 1, _status: url.searchParams.get('draft') === 'true' ? 'draft' : 'published' });
    return Response.json({ docs: [], totalDocs: 0, hasNextPage: false });
  } });
  assert.equal(calls[0].searchParams.get('where[_status][equals]'), 'published');
  assert.equal(snapshot.globals.home._status, 'published');
  assert.equal(snapshot.archives.latestDrafts.globals.home._status, 'draft');
  assert.ok('enquiries' in snapshot.archives);
});

import { COLLECTIONS, GLOBALS, flattenFields, seedField, snake } from './schema.mjs';

const valueAt = (object, keys) => keys.reduce((v, key) => v?.[key], object);
const idOf = value => value && typeof value === 'object' ? value.id : value;
const seedId = (collection, id) => `payload-${collection}-${id}`;

export function lexicalToPortableText(value) {
  if (!value) return [];
  if (!Array.isArray(value.root?.children)) throw new Error('Invalid Lexical root');
  let key = 0;
  const nextKey = () => `k${++key}`;
  const output = [];
  function block(node, listItem, level) {
    const markDefs = [];
    function inline(item, inherited = []) {
      if (item.type === 'linebreak') return [{ _type: 'span', _key: nextKey(), text: '\n', marks: inherited }];
      if (item.type === 'text') {
        const format = item.format || 0;
        if (format & ~31) throw new Error(`Unsupported Lexical text format: ${format}`);
        const marks = [...inherited];
        for (const [flag, mark] of [[1, 'strong'], [2, 'em'], [4, 'strike-through'], [8, 'underline'], [16, 'code']]) if (format & flag) marks.push(mark);
        return [{ _type: 'span', _key: nextKey(), text: item.text || '', marks }];
      }
      if (item.type === 'link' || item.type === 'autolink') {
        const href = item.fields?.url ?? item.url;
        if (!href) throw new Error('Internal Lexical links require an explicit converter');
        const linkKey = nextKey();
        markDefs.push({ _key: linkKey, _type: 'link', href });
        return (item.children || []).flatMap(child => inline(child, [...inherited, linkKey]));
      }
      throw new Error(`Unsupported Lexical inline node: ${item.type}`);
    }
    const children = (node.children || []).filter(child => child.type !== 'list').flatMap(child => inline(child));
    output.push({ _type: 'block', _key: nextKey(), style: node.type === 'heading' ? node.tag : node.type === 'quote' ? 'blockquote' : 'normal', children, markDefs, ...(listItem ? { listItem, level } : {}) });
  }
  function visit(node, level = 1) {
    if (node.type === 'list') {
      if (!['bullet', 'number'].includes(node.listType)) throw new Error(`Unsupported Lexical list: ${node.listType}`);
      for (const item of node.children || []) {
        if (item.type !== 'listitem') throw new Error('Unexpected Lexical list child');
        if (item.children?.some(child => child.type !== 'list')) block(item, node.listType, level);
        for (const nested of item.children || []) if (nested.type === 'list') visit(nested, level + 1);
      }
    } else if (['paragraph', 'heading', 'quote'].includes(node.type)) block(node);
    else throw new Error(`Unsupported Lexical block: ${node.type}`);
  }
  value.root.children.forEach(node => visit(node));
  return output;
}

export function convertSnapshot(snapshot, schemas) {
  const warnings = [];
  const media = new Map(snapshot.collections.media.map(item => [String(item.id), item]));
  const properties = new Set(snapshot.collections.properties.map(item => String(item.id)));
  const manifest = [];
  const seenKeys = new Set();
  const mediaRefs = new Map();
  for (const item of media.values()) {
    if (!item.filename || !item.url) throw new Error(`Media ${item.id} is missing filename or URL`);
    const url = new URL(item.url, snapshot.source);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(`Invalid media URL for ${item.id}`);
    const storageKey = [item.prefix, item.filename].filter(Boolean).join('/');
    if (seenKeys.has(storageKey)) throw new Error(`Duplicate media storage key: ${storageKey}`);
    seenKeys.add(storageKey);
    const ref = { $media: { url: url.href, filename: item.filename, alt: item.alt || '', ...(item.caption ? { caption: item.caption } : {}) } };
    mediaRefs.set(String(item.id), ref);
    manifest.push({ payloadId: item.id, sourceUrl: url.href, storageKey, filename: item.filename, mimeType: item.mimeType, width: item.width, height: item.height, alt: item.alt, caption: item.caption });
  }
  function transform(fields, object, context) {
    const result = {};
    for (const field of fields) {
      const value = valueAt(object, field.sourcePath);
      if (value == null) continue;
      let converted = value;
      if (field.type === 'upload') {
        converted = mediaRefs.get(String(idOf(value)));
        if (!converted) throw new Error(`Missing media ${idOf(value)} at ${context}.${field.target}`);
      } else if (field.type === 'relationship') {
        const reference = item => {
          const id = idOf(item);
          if (!properties.has(String(id))) throw new Error(`Missing property ${id} at ${context}.${field.target}; it may be unpublished`);
          return `$ref:${seedId('properties', id)}`;
        };
        converted = field.hasMany ? value.map(reference) : reference(value);
      } else if (field.type === 'array') {
        if (!Array.isArray(value)) throw new Error(`Expected array at ${context}.${field.target}`);
        converted = value.map((row, index) => transform(flattenFields(field.fields), row, `${context}.${field.target}[${index}]`));
      } else if (field.type === 'richText') {
        try { converted = lexicalToPortableText(value); }
        catch (error) { throw new Error(`${context}.${field.target}: ${error.message}`); }
      }
      result[field.target] = converted;
    }
    return result;
  }
  const seed = { $schema: 'https://emdashcms.com/seed.schema.json', version: '1', defaultLocale: 'en', meta: { name: 'Avista Payload export' }, collections: [], content: {} };
  const mapping = {};
  for (const slug of [...COLLECTIONS, ...GLOBALS]) {
    const fields = flattenFields(schemas[slug].fields).filter(field => !(slug === 'properties' && field.name === 'slug'));
    const targets = fields.map(field => field.target);
    if (new Set(targets).size !== targets.length) throw new Error(`Field collision in ${slug}`);
    const target = snake(slug);
    mapping[slug] = { collection: target, fields: Object.fromEntries(fields.map(field => [field.sourcePath.join('.'), field.target])) };
    for (const field of fields) if (field.type === 'array' && seedField(field).type === 'json') warnings.push(`${slug}.${field.sourcePath.join('.')} uses JSON to preserve nested arrays; EmDash repeaters do not support nested repeaters. Design its editor before launch.`);
    seed.collections.push({ slug: target, label: schemas[slug].label || slug, routable: slug === 'properties', ...(slug === 'properties' ? { urlPattern: '/{slug}' } : {}), supports: ['drafts', 'revisions'], fields: fields.map(seedField) });
    const docs = COLLECTIONS.includes(slug) ? snapshot.collections[slug] : [snapshot.globals[slug]];
    seed.content[target] = docs.map(doc => {
      if (!doc) throw new Error(`Missing global ${slug}`);
      if (doc._status && doc._status !== 'published') throw new Error(`Refusing to publish ${slug} ${doc.id}: source status is ${doc._status}`);
      if (slug === 'properties' && !doc.slug) throw new Error(`Property ${doc.id} has no slug`);
      return { id: seedId(slug, COLLECTIONS.includes(slug) ? doc.id : 'singleton'), ...(slug === 'properties' ? { slug: doc.slug } : {}), status: 'published', data: transform(fields, doc, slug) };
    });
  }
  // Includes unused media as well as referenced files. This archive collection
  // causes EmDash's seed engine to register every upload in its media library.
  seed.collections.push({ slug: 'payload_media_archive', label: 'Payload media archive', routable: false, hidden: true, fields: [{ slug: 'file', label: 'File', type: 'file' }, { slug: 'metadata', label: 'Original metadata', type: 'json' }] });
  seed.content.payload_media_archive = [...media.values()].map(item => ({ id: seedId('media', item.id), status: 'draft', data: { file: mediaRefs.get(String(item.id)), metadata: item } }));
  warnings.push('Seed imports published content only. Drafts and revisions, when requested, are preserved in payload-snapshot.json, not applied by this seed.');
  warnings.push('Payload access rules, custom validators, users/passwords, hooks, and admin components are not transferred. Configure EmDash access and editing rules before launch.');
  warnings.push('Videos remain external URLs. Media binaries are downloaded only with --download-media; the seed uses source URLs until explicitly changed.');
  return { seed, mapping, manifest, warnings };
}

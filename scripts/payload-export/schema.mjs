import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

export const COLLECTIONS = ['properties', 'reviews'];
export const GLOBALS = ['siteSettings', 'navigation', 'footer', 'home', 'locationPage', 'contactPage'];
const names = { properties: 'Properties', reviews: 'Reviews', siteSettings: 'SiteSettings', navigation: 'Navigation', footer: 'Footer', home: 'Home', locationPage: 'LocationPage', contactPage: 'ContactPage' };

// Load only field declarations. Never import payload.config.ts: that initializes
// Cloudflare bindings and can connect a local command to the production database.
export function loadSchemas(repo) {
  const root = fs.realpathSync(path.join(repo, 'src'));
  const cache = new Map();
  function load(filename) {
    filename = fs.realpathSync(filename);
    const relative = path.relative(root, filename);
    if (!/^(collections|globals|fields|access)\//.test(relative) || !filename.endsWith('.ts')) {
      throw new Error(`Schema import outside allowed directories: ${relative}`);
    }
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const require = (specifier) => {
      if (!specifier.startsWith('.')) throw new Error(`Unexpected schema dependency: ${specifier}`);
      return load(path.resolve(path.dirname(filename), `${specifier}.ts`));
    };
    vm.runInNewContext(code, { module, exports: module.exports, require, URL }, { filename, timeout: 5000 });
    return module.exports;
  }
  return Object.fromEntries([...COLLECTIONS, ...GLOBALS].map(slug => {
    const name = names[slug];
    return [slug, load(path.join(root, COLLECTIONS.includes(slug) ? 'collections' : 'globals', `${name}.ts`))[name]];
  }));
}

export const snake = value => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export function flattenFields(fields, prefix = []) {
  return fields.flatMap(field => {
    if (field.type === 'tabs') return field.tabs.flatMap(tab => flattenFields(tab.fields, tab.name ? [...prefix, tab.name] : prefix));
    if (field.type === 'row' || field.type === 'collapsible') return flattenFields(field.fields, prefix);
    const sourcePath = field.name ? [...prefix, field.name] : prefix;
    if (field.type === 'group') return flattenFields(field.fields, sourcePath);
    if (!field.name) throw new Error(`Unsupported unnamed field: ${field.type}`);
    return [{ ...field, sourcePath, target: sourcePath.map(snake).join('_') }];
  });
}

export function seedField(field) {
  const type = { text: 'string', textarea: 'text', email: 'string', number: 'number', checkbox: 'boolean', date: 'datetime', select: field.hasMany ? 'multiSelect' : 'select', upload: 'image', relationship: 'reference', richText: 'portableText', array: 'repeater' }[field.type];
  if (!type) throw new Error(`Unsupported field type ${field.type} at ${field.target}`);
  const result = { slug: field.target, label: typeof field.label === 'string' ? field.label : field.sourcePath.join(' / '), type };
  // Optional during migration: preserve imperfect source records rather than
  // manufacture missing values. Tighten editor validation after content review.
  if (field.type === 'array') {
    const subFields = flattenFields(field.fields).map(seedField);
    const allowed = new Set(['string', 'text', 'url', 'number', 'integer', 'boolean', 'datetime', 'select', 'image']);
    if (subFields.some(sub => !allowed.has(sub.type))) result.type = 'json';
    else result.validation = { subFields: subFields.map(sub => sub.type === 'select' ? { slug: sub.slug, label: sub.label, type: sub.type, options: sub.validation.options } : sub) };
  }
  if (field.type === 'select') result.validation = { options: field.options.map(o => typeof o === 'string' ? o : o.value) };
  if (field.type === 'relationship') {
    if (field.relationTo !== 'properties') throw new Error(`Unsupported relationship: ${field.relationTo}`);
    result.validation = { targetCollection: 'properties', multiple: !!field.hasMany };
  }
  return result;
}

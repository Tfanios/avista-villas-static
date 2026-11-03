import { COLLECTIONS, GLOBALS } from './schema.mjs';

export function createClient(source, { token, fetchImpl = fetch } = {}) {
  const base = new URL(source);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('PAYLOAD_URL must be an HTTP(S) URL without credentials, query or fragment');
  if (token && base.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Authenticated remote exports require HTTPS');
  async function get(endpoint, query = {}) {
    const url = new URL(`${base.href.replace(/\/$/, '')}/api/${endpoint}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: { Accept: 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
    });
    if (!response.ok) throw new Error(`Payload GET ${endpoint} failed (${response.status}); check access and PAYLOAD_TOKEN if needed`);
    return response.json();
  }
  async function all(endpoint, query = {}) {
    const result = [];
    const ids = new Set();
    let page = 1;
    let expectedTotal;
    do {
      const data = await get(endpoint, { depth: 0, limit: 100, sort: 'id', ...query, page });
      if (!Array.isArray(data.docs) || !Number.isInteger(data.totalDocs)) throw new Error(`Invalid pagination response: ${endpoint}`);
      if (expectedTotal === undefined) expectedTotal = data.totalDocs;
      if (expectedTotal !== data.totalDocs) throw new Error(`Content changed during export: ${endpoint}; retry while editing is paused`);
      for (const doc of data.docs) {
        if (doc.id == null || ids.has(String(doc.id))) throw new Error(`Missing/duplicate ID in ${endpoint}`);
        ids.add(String(doc.id));
        result.push(doc);
      }
      if (!data.hasNextPage) break;
      if (!data.docs.length || data.nextPage !== page + 1) throw new Error(`Invalid next page in ${endpoint}`);
      page = data.nextPage;
    } while (true);
    if (result.length !== expectedTotal) throw new Error(`Incomplete export: ${endpoint}`);
    return result;
  }
  return { get, all };
}

export async function fetchSnapshot(source, { token, includeDrafts = false, includeVersions = false, includeEnquiries = false, fetchImpl } = {}) {
  if ((includeDrafts || includeVersions || includeEnquiries) && !token) throw new Error('Private archives require PAYLOAD_TOKEN (Payload user JWT)');
  const client = createClient(source, { token, fetchImpl });
  const snapshot = { format: 'avista-payload-snapshot-v1', source, exportedAt: new Date().toISOString(), collections: {}, globals: {}, archives: {} };
  // Sequential bounded requests keep load on the production Worker low.
  for (const slug of COLLECTIONS) snapshot.collections[slug] = await client.all(slug, { draft: false, 'where[_status][equals]': 'published' });
  snapshot.collections.media = await client.all('media');
  for (const slug of GLOBALS) snapshot.globals[slug] = await client.get(`globals/${slug}`, { depth: 0, draft: false });
  if (includeDrafts) {
    snapshot.archives.latestDrafts = { collections: {}, globals: {} };
    for (const slug of COLLECTIONS) snapshot.archives.latestDrafts.collections[slug] = await client.all(slug, { draft: true });
    for (const slug of GLOBALS) snapshot.archives.latestDrafts.globals[slug] = await client.get(`globals/${slug}`, { depth: 0, draft: true });
  }
  if (includeVersions) {
    snapshot.archives.versions = {};
    for (const slug of COLLECTIONS) snapshot.archives.versions[slug] = await client.all(`${slug}/versions`);
    for (const slug of GLOBALS) snapshot.archives.versions[slug] = await client.all(`globals/${slug}/versions`);
  }
  if (includeEnquiries) snapshot.archives.enquiries = await client.all('enquiries');
  return snapshot;
}

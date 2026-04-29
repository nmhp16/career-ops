/**
 * Teamtailor Public RSS Feed
 *
 * Public, no auth.
 * Endpoint: https://{slug}.teamtailor.com/jobs.rss
 *
 * Detected via careers_url matching {slug}.teamtailor.com.
 */
import { extractItems, extractTag } from '../lib/xml-parse.mjs';

export const teamtailor = {
  name: 'teamtailor',

  detect(company) {
    const m = (company.careers_url || '').match(
      /^https?:\/\/([^./]+)\.teamtailor\.com/
    );
    if (!m) return null;
    return { slug: m[1], url: `https://${m[1]}.teamtailor.com/jobs.rss` };
  },

  async fetch({ url }, _fetchJson, fetchRaw) {
    const res = await fetchRaw(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return { xml };
  },

  parse({ xml }, companyName) {
    const items = extractItems(xml, 'item');
    return items.map(it => ({
      title: extractTag(it, 'title'),
      url: extractTag(it, 'link'),
      company: companyName,
      location: extractTag(it, 'location') || extractTag(it, 'category'),
    }));
  },
};

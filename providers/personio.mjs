/**
 * Personio Public Job XML Feed
 *
 * Public, no auth. Returns an XML document of <position> blocks.
 * Endpoint: https://{slug}.jobs.personio.com/xml (or .de)
 *
 * Detected via careers_url matching {slug}.jobs.personio.{com,de}.
 */
import { extractItems, extractTag } from '../lib/xml-parse.mjs';

export const personio = {
  name: 'personio',

  detect(company) {
    const m = (company.careers_url || '').match(
      /^https?:\/\/([^./]+)\.jobs\.personio\.(com|de)/
    );
    if (!m) return null;
    return {
      slug: m[1],
      tld: m[2],
      url: `https://${m[1]}.jobs.personio.${m[2]}/xml`,
    };
  },

  async fetch({ url }, _fetchJson, fetchRaw) {
    const res = await fetchRaw(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return { xml };
  },

  parse({ xml }, companyName, target) {
    const positions = extractItems(xml, 'position');
    return positions.map(p => {
      const id = extractTag(p, 'id');
      const title = extractTag(p, 'name');
      const office = extractTag(p, 'office');
      return {
        title,
        url: id
          ? `https://${target.slug}.jobs.personio.${target.tld}/job/${id}`
          : '',
        company: companyName,
        location: office,
      };
    });
  },
};

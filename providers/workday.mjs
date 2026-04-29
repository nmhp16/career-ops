/**
 * Workday CXS Public Search API
 *
 * Public on most tenants, no auth required.
 * Endpoint: POST https://{tenant}.{shard}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 *
 * Detected via careers_url matching {tenant}.wd{N}.myworkdayjobs.com/{site}.
 * Optional locale segment (e.g. /en-US/) is preserved when building public URLs.
 *
 * Highest-impact provider: unlocks NVIDIA, Salesforce, Adobe, and most
 * Fortune 500 tenants in one shot.
 */
// Workday's public CXS endpoint caps `limit` at 20 on most tenants
// (NVIDIA returns HTTP 400 for anything higher). 20 is the documented max.
const PAGE_SIZE = 20;
const MAX_PAGES = 100; // 2000 postings cap is plenty for any single tenant.

export const workday = {
  name: 'workday',

  detect(company) {
    const url = company.careers_url || '';
    const m = url.match(
      /^https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com(?:\/([a-z]{2}-[A-Z]{2}))?\/([^/?#]+)/
    );
    if (!m) return null;
    const [, tenant, shard, locale, site] = m;
    return {
      tenant,
      shard,
      locale: locale || 'en-US',
      site,
      url: `https://${tenant}.${shard}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
    };
  },

  async fetch(target, _fetchJson, fetchRaw) {
    const all = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetchRaw(target.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          // Some tenants 403 default UAs. A browser-like UA avoids this.
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          searchText: '',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const postings = data.jobPostings || [];
      all.push(...postings);
      if (postings.length < PAGE_SIZE) break;
      if (data.total && all.length >= data.total) break;
    }
    return all;
  },

  parse(postings, companyName, target) {
    const base = `https://${target.tenant}.${target.shard}.myworkdayjobs.com`;
    return postings.map(p => ({
      title: p.title || '',
      url: p.externalPath
        ? `${base}/${target.locale}/${target.site}${p.externalPath}`
        : '',
      company: companyName,
      location: p.locationsText || '',
    }));
  },
};

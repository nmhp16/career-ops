/**
 * Workable Public Job Board API
 *
 * Public, no auth.
 * Endpoint: https://apply.workable.com/api/v3/accounts/{slug}/jobs
 *           (POST with empty body returns all published postings)
 *
 * Detected via careers_url matching apply.workable.com/{slug} or
 * {slug}.workable.com.
 */
export const workable = {
  name: 'workable',

  detect(company) {
    const url = company.careers_url || '';

    let m = url.match(/apply\.workable\.com\/([^/?#]+)/);
    if (m) return { slug: m[1] };

    m = url.match(/^https?:\/\/([^./]+)\.workable\.com/);
    if (m) return { slug: m[1] };

    return null;
  },

  async fetch({ slug }, _fetchJson, fetchRaw) {
    // Workable's v3 endpoint is POST-with-empty-body. Paginate via "token".
    const endpoint = `https://apply.workable.com/api/v3/accounts/${slug}/jobs`;
    const all = [];
    let token = null;
    for (let page = 0; page < 20; page++) {
      const body = token ? { token } : {};
      const res = await fetchRaw(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      all.push(...results);
      token = data.token;
      if (!token || results.length === 0) break;
    }
    return all;
  },

  parse(jobs, companyName) {
    return jobs.map(j => {
      const loc = [j.city, j.state, j.country].filter(Boolean).join(', ');
      return {
        title: j.title || '',
        url: j.url || j.application_url || '',
        company: companyName,
        location: j.location?.location_str || loc,
      };
    });
  },
};

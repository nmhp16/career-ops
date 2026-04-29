/**
 * Lever Postings API
 *
 * Public, no auth. Root response is a JSON array.
 * Endpoint: https://api.lever.co/v0/postings/{slug}
 *
 * Detected via careers_url matching jobs.lever.co/{slug}.
 */
export const lever = {
  name: 'lever',

  detect(company) {
    const m = (company.careers_url || '').match(/jobs\.lever\.co\/([^/?#]+)/);
    if (!m) return null;
    return { url: `https://api.lever.co/v0/postings/${m[1]}` };
  },

  async fetch({ url }, fetchJson) {
    const data = await fetchJson(url);
    return Array.isArray(data) ? data : [];
  },

  parse(jobs, companyName) {
    return jobs.map(j => ({
      title: j.text || '',
      url: j.hostedUrl || j.applyUrl || '',
      company: companyName,
      location: j.categories?.location || '',
    }));
  },
};

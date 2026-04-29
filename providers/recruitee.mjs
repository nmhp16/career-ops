/**
 * Recruitee Public Offers API
 *
 * Public, no auth.
 * Endpoint: https://{slug}.recruitee.com/api/offers/
 *
 * Detected via careers_url matching {slug}.recruitee.com.
 */
export const recruitee = {
  name: 'recruitee',

  detect(company) {
    const m = (company.careers_url || '').match(
      /^https?:\/\/([^./]+)\.recruitee\.com/
    );
    if (!m) return null;
    return { url: `https://${m[1]}.recruitee.com/api/offers/` };
  },

  async fetch({ url }, fetchJson) {
    const data = await fetchJson(url);
    return data.offers || [];
  },

  parse(jobs, companyName) {
    return jobs.map(j => {
      const loc = [j.city, j.country].filter(Boolean).join(', ');
      return {
        title: j.title || j.position || '',
        url: j.careers_url || j.careers_apply_url || j.url || '',
        company: companyName,
        location: j.location || loc,
      };
    });
  },
};

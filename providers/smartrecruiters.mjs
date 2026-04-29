/**
 * SmartRecruiters Posting API
 *
 * Public, no auth.
 * Endpoint: https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100
 *
 * Detected via careers_url matching:
 *   - careers.smartrecruiters.com/{slug}
 *   - jobs.smartrecruiters.com/{slug}
 */
export const smartrecruiters = {
  name: 'smartrecruiters',

  detect(company) {
    const url = company.careers_url || '';
    const m = url.match(/(?:careers|jobs)\.smartrecruiters\.com\/([^/?#]+)/);
    if (!m) return null;
    return {
      slug: m[1],
      url: `https://api.smartrecruiters.com/v1/companies/${m[1]}/postings?limit=100`,
    };
  },

  async fetch({ slug }, fetchJson) {
    const all = [];
    let offset = 0;
    const limit = 100;
    for (let page = 0; page < 20; page++) {
      const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=${limit}&offset=${offset}`;
      const data = await fetchJson(url);
      const items = data.content || [];
      all.push(...items);
      offset += limit;
      if (items.length < limit || offset >= (data.totalFound || 0)) break;
    }
    return all;
  },

  parse(jobs, companyName) {
    return jobs.map(j => {
      const loc = [j.location?.city, j.location?.region, j.location?.country]
        .filter(Boolean)
        .join(', ');
      const slug = j.company?.identifier || '';
      const url =
        j.ref ||
        (slug && j.id ? `https://jobs.smartrecruiters.com/${slug}/${j.id}` : '');
      return {
        title: j.name || '',
        url,
        company: companyName,
        location: loc,
      };
    });
  },
};

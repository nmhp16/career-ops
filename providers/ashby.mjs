/**
 * Ashby Posting API
 *
 * Public, no auth. The simple JSON endpoint returns all live postings.
 * Endpoint: https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
 *
 * Detected via careers_url matching jobs.ashbyhq.com/{slug}.
 */
export const ashby = {
  name: 'ashby',

  detect(company) {
    const m = (company.careers_url || '').match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
    if (!m) return null;
    return {
      url: `https://api.ashbyhq.com/posting-api/job-board/${m[1]}?includeCompensation=true`,
    };
  },

  async fetch({ url }, fetchJson) {
    const data = await fetchJson(url);
    return data.jobs || [];
  },

  parse(jobs, companyName) {
    return jobs.map(j => ({
      title: j.title || '',
      url: j.jobUrl || '',
      company: companyName,
      location: j.location || '',
    }));
  },
};

/**
 * Greenhouse Job Board API
 *
 * Public, no auth. Returns all live postings for a board in one GET.
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *
 * Detected via:
 *   - explicit `api:` field containing "greenhouse"
 *   - `careers_url` matching job-boards(.eu).greenhouse.io/{slug}
 */
export const greenhouse = {
  name: 'greenhouse',

  detect(company) {
    if (company.api && company.api.includes('greenhouse')) {
      return { url: company.api };
    }
    const m = (company.careers_url || '').match(
      /job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/
    );
    if (m) {
      return { url: `https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs` };
    }
    return null;
  },

  async fetch({ url }, fetchJson) {
    const data = await fetchJson(url);
    return data.jobs || [];
  },

  parse(jobs, companyName) {
    return jobs.map(j => ({
      title: j.title || '',
      url: j.absolute_url || '',
      company: companyName,
      location: j.location?.name || '',
    }));
  },
};

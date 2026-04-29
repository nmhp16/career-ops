/**
 * BambooHR Careers Public List
 *
 * Public, no auth. Despite the URL ending in /list (no extension), the
 * endpoint returns JSON.
 * Endpoint: https://{slug}.bamboohr.com/careers/list
 * Job URL:  https://{slug}.bamboohr.com/careers/{id}
 *
 * Detected via careers_url matching {slug}.bamboohr.com.
 */
export const bamboohr = {
  name: 'bamboohr',

  detect(company) {
    const m = (company.careers_url || '').match(
      /^https?:\/\/([^./]+)\.bamboohr\.com/
    );
    if (!m) return null;
    return { slug: m[1], url: `https://${m[1]}.bamboohr.com/careers/list` };
  },

  async fetch({ url }, fetchJson) {
    const data = await fetchJson(url);
    return data.result || [];
  },

  parse(jobs, companyName, target) {
    return jobs.map(j => {
      const loc = [j.locationCity, j.locationState, j.locationCountry]
        .filter(Boolean)
        .join(', ');
      return {
        title: j.jobOpeningName || '',
        url: j.jobOpeningShareUrl
          ? j.jobOpeningShareUrl
          : `https://${target.slug}.bamboohr.com/careers/${j.id}`,
        company: companyName,
        location: loc,
      };
    });
  },
};

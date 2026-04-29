# Mode: scan -- Portal Scanner (Offer Discovery)

Scans the configured job portals, filters by title relevance, and adds new offers to the pipeline for later evaluation.

> **Note (v1.6+):** The default scanner (`scan.mjs` / `npm run scan`) is **zero-token** and hits public ATS APIs directly. Supported providers: **Greenhouse, Ashby, Lever, Workable, SmartRecruiters, Recruitee, Personio, Teamtailor, BambooHR, Workday**. Companies whose `careers_url` doesn't match any supported provider are written to `data/scan-skipped.tsv` for the agent flow (Tier 1/3) to pick up via Playwright/WebSearch.

## Recommended execution

Run as a sub-agent so the main context isn't consumed:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + specific data]",
    run_in_background=True
)
```

## Configuration

Read `portals.yml`, which contains:
- `search_queries`: List of WebSearch queries with `site:` filters per portal (broad discovery)
- `tracked_companies`: Specific companies with `careers_url` for direct navigation
- `title_filter`: Positive / negative / seniority_boost keywords for title filtering

## Discovery strategy (3 tiers)

### Tier 1 -- Direct Playwright (FALLBACK for unsupported careers pages)

**For each row in `data/scan-skipped.tsv`** (companies the JS scanner couldn't auto-detect, e.g. custom careers pages on openai.com, tesla.com, bostondynamics.com): navigate to its `careers_url` with Playwright (`browser_navigate` + `browser_snapshot`), read ALL visible job listings, and extract title + URL of each. This is the only way to reach these companies because:
- They don't expose a public ATS API
- They use heavy JS / SPAs (custom careers pages)
- It sees the page in real time (not cached Google results)
- It does not depend on Google indexing

**Every company MUST have `careers_url` in portals.yml.** If it doesn't, find it once, save it, and use it in future scans.

### Tier 2 -- ATS APIs / Feeds (PRIMARY for supported providers)

`scan.mjs` covers this tier automatically for all supported providers. Run `npm run scan` first; the agent only handles what gets written to `data/scan-skipped.tsv`.

**Supported providers (auto-detected from `careers_url`):**

| Provider | URL pattern | Endpoint |
|---|---|---|
| Greenhouse | `job-boards.greenhouse.io/{slug}` | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| Ashby | `jobs.ashbyhq.com/{slug}` | `api.ashbyhq.com/posting-api/job-board/{slug}` |
| Lever | `jobs.lever.co/{slug}` | `api.lever.co/v0/postings/{slug}` |
| Workable | `apply.workable.com/{slug}` | `apply.workable.com/api/v3/accounts/{slug}/jobs` (POST) |
| SmartRecruiters | `(careers\|jobs).smartrecruiters.com/{slug}` | `api.smartrecruiters.com/v1/companies/{slug}/postings` |
| Recruitee | `{slug}.recruitee.com` | `{slug}.recruitee.com/api/offers/` |
| Personio | `{slug}.jobs.personio.{com,de}` | `{slug}.jobs.personio.{com,de}/xml` |
| Teamtailor | `{slug}.teamtailor.com` | `{slug}.teamtailor.com/jobs.rss` |
| BambooHR | `{slug}.bamboohr.com` | `{slug}.bamboohr.com/careers/list` |
| Workday | `{tenant}.wd{N}.myworkdayjobs.com/{site}` | `wday/cxs/{tenant}/{site}/jobs` (POST + paginate) |

The provider registry lives at `providers/index.mjs`; each provider implements `{ detect, fetch, parse }`. Add a new provider by dropping a file into `providers/` and registering it in `index.mjs`.

### Tier 3 -- WebSearch queries (BROAD DISCOVERY)

The `search_queries` with `site:` filters cover portals transversally (all of Ashby, all of Greenhouse, etc.). Useful for discovering NEW companies not yet in `tracked_companies`, but results may be stale.

**Execution priority:**
1. **Tier 2 first**: run `npm run scan` (or `node scan.mjs`). It covers every company on a supported ATS in one zero-token pass.
2. **Tier 1 next**: read `data/scan-skipped.tsv`. For each row, Playwright-navigate the `careers_url` and extract listings.
3. **Tier 3 last**: run `search_queries` with `enabled: true` for broad discovery of companies not yet in `tracked_companies`.

The tiers are additive -- they all run, then results are merged and deduplicated.

## Workflow

1. **Run `npm run scan` first** -- this handles Tier 2 for every supported ATS in seconds, with zero tokens. The script:
   - Reads `portals.yml`, `data/scan-history.tsv`, `data/applications.md`, `data/pipeline.md`
   - Detects a provider for each enabled company in `tracked_companies`
   - Fetches, filters, dedups, and appends new offers to `data/pipeline.md`
   - Writes companies it couldn't auto-detect to `data/scan-skipped.tsv`

2. **Read history**: `data/scan-history.tsv` → URLs already seen
3. **Read dedup sources**: `data/applications.md` + `data/pipeline.md`

4. **Tier 1 -- Playwright scan** of `data/scan-skipped.tsv` (parallel in batches of 3-5):
   For each row in `data/scan-skipped.tsv` (companies the JS scanner couldn't auto-detect):
   a. `browser_navigate` to the `careers_url`
   b. `browser_snapshot` to read all job listings
   c. If the page has filters/departments, navigate the relevant sections
   d. For each job listing, extract: `{title, url, company}`
   e. If the page paginates results, navigate the additional pages
   f. Accumulate into the candidate list
   g. If `careers_url` fails (404, redirect), try `scan_query` as a fallback and note that the URL needs updating

5. **Tier 2 -- ATS APIs / feeds**: covered by `scan.mjs`. The agent does NOT need to re-run this tier manually unless `scan.mjs` itself fails.
   - To force a single provider run: `node scan.mjs --source workday`
   - To force a single company: `node scan.mjs --company NVIDIA`
   - To preview without writes: `node scan.mjs --dry-run`

6. **Tier 3 -- WebSearch queries** (parallel where possible):
   For each query in `search_queries` with `enabled: true`:
   a. Run WebSearch with the defined `query`
   b. From each result extract: `{title, url, company}`
      - **title**: from the result title (before " @ " or " | ")
      - **url**: the result URL
      - **company**: after " @ " in the title, or extracted from the domain/path
   c. Accumulate into the candidate list (dedup against Tiers 1+2)

6. **Filter by title** using `title_filter` from `portals.yml`:
   - At least 1 keyword from `positive` must appear in the title (case-insensitive)
   - 0 keywords from `negative` may appear
   - `seniority_boost` keywords give priority but are not required

7. **Deduplicate** against 3 sources:
   - `scan-history.tsv` → exact URL already seen
   - `applications.md` → company + normalized role already evaluated
   - `pipeline.md` → exact URL already in pending or processed

7.5. **Verify liveness of Tier 3 (WebSearch) results** -- BEFORE adding to the pipeline:

   WebSearch results can be stale (Google caches results for weeks or months). To avoid evaluating expired postings, verify each new URL coming from Tier 3 with Playwright. Tiers 1 and 2 are inherently real-time and don't need this verification.

   For each new Tier 3 URL (sequentially -- NEVER run Playwright in parallel):
   a. `browser_navigate` to the URL
   b. `browser_snapshot` to read the content
   c. Classify:
      - **Active**: visible role title + role description + visible Apply/Submit control inside the main content. Don't count generic header/navbar/footer text.
      - **Expired** (any of these signals):
        - Final URL contains `?error=true` (Greenhouse redirects this way when an offer is closed)
        - Page contains: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found"
        - Only navbar and footer visible, no JD content (content < ~300 chars)
   d. If expired: log to `scan-history.tsv` with status `skipped_expired` and discard
   e. If active: continue to step 8

   **Don't abort the whole scan if one URL fails.** If `browser_navigate` errors (timeout, 403, etc.), mark as `skipped_expired` and continue with the next.

8. **For each new verified offer that passes filters**:
   a. Add to `pipeline.md` "Pending" section: `- [ ] {url} | {company} | {title}`
   b. Log in `scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **Offers filtered by title**: log in `scan-history.tsv` with status `skipped_title`
10. **Duplicate offers**: log with status `skipped_dup`
11. **Expired offers (Tier 3)**: log with status `skipped_expired`

## Title and company extraction from WebSearch results

WebSearch results come in formats like: `"Job Title @ Company"` or `"Job Title | Company"` or `"Job Title — Company"`.

Extraction patterns by portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## Private URLs

If you find a URL that is not publicly accessible:
1. Save the JD to `jds/{company}-{role-slug}.md`
2. Add it to pipeline.md as: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## Scan History

`data/scan-history.tsv` tracks ALL seen URLs:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Output summary

```
Portal Scan -- {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries run: N
Offers found: N total
Filtered by title: N relevant
Duplicates: N (already evaluated or in pipeline)
Expired discarded: N (dead links, Tier 3)
New added to pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Run /career-ops pipeline to evaluate the new offers.
```

## careers_url management

Each company in `tracked_companies` should have `careers_url` -- the direct URL to its job listings. This avoids having to look it up every time.

**RULE: Always use the company's corporate URL; fall back to the ATS endpoint only if no corporate page exists.**

`careers_url` should point to the company's own careers page whenever available. Many companies use Workday, Greenhouse, or Lever under the hood, but expose job IDs only through their corporate domain. Using the direct ATS URL when a corporate page exists can cause false 410 errors because job IDs don't match.

| ✅ Correct (corporate) | ❌ Wrong as first option (direct ATS) |
|------------------------|----------------------------------------|
| `https://careers.mastercard.com` | `https://mastercard.wd1.myworkdayjobs.com` |
| `https://openai.com/careers` | `https://job-boards.greenhouse.io/openai` |
| `https://stripe.com/jobs` | `https://jobs.lever.co/stripe` |

Fallback: if you only have the direct ATS URL, first navigate to the company's website and locate its corporate careers page. Use the direct ATS URL only if the company has no corporate careers page of its own.

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **BambooHR:** list `https://{company}.bamboohr.com/careers/list`; detail `https://{company}.bamboohr.com/careers/{id}/detail`
- **Teamtailor:** `https://{company}.teamtailor.com/jobs`
- **Workday:** `https://{company}.{shard}.myworkdayjobs.com/{site}`
- **Custom:** The company's own URL (e.g., `https://openai.com/careers`)

**API/feed patterns by platform:**
- **Ashby API:** `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR API:** list `https://{company}.bamboohr.com/careers/list`; detail `https://{company}.bamboohr.com/careers/{id}/detail` (`result.jobOpening`)
- **Lever API:** `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor RSS:** `https://{company}.teamtailor.com/jobs.rss`
- **Workday API:** `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**If `careers_url` doesn't exist** for a company:
1. Try the platform's known pattern
2. If that fails, run a quick WebSearch: `"{company}" careers jobs`
3. Navigate with Playwright to confirm it works
4. **Save the found URL in portals.yml** for future scans

**If `careers_url` returns 404 or redirect:**
1. Note it in the output summary
2. Try scan_query as fallback
3. Mark for manual update

## portals.yml maintenance

- **ALWAYS save `careers_url`** when adding a new company
- Add new queries as you discover interesting portals or roles
- Disable queries with `enabled: false` if they generate too much noise
- Tune filtering keywords as your target roles evolve
- Add companies to `tracked_companies` when you want to follow them closely
- Verify `careers_url` periodically -- companies switch ATS platforms

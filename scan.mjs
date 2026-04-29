#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner
 *
 * Hits public ATS APIs directly, applies title filters from portals.yml,
 * deduplicates against existing history, and appends new offers to
 * pipeline.md + scan-history.tsv.
 *
 * Zero Claude API tokens — pure HTTP + JSON/XML.
 *
 * Supported providers (auto-detected from careers_url):
 *   greenhouse, ashby, lever, workable, smartrecruiters, recruitee,
 *   personio, teamtailor, bamboohr, workday
 *
 * Companies whose careers_url doesn't match a supported provider are
 * written to data/scan-skipped.tsv for the agent flow (Tier 1/3) to
 * pick up via Playwright/WebSearch.
 *
 * Usage:
 *   node scan.mjs                        # scan all enabled companies
 *   node scan.mjs --dry-run              # preview without writing files
 *   node scan.mjs --company Cohere       # scan a single company
 *   node scan.mjs --source workday       # only providers matching this name
 */

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from 'fs';
import yaml from 'js-yaml';
import { PROVIDERS, detectProvider } from './providers/index.mjs';
import {
  APPS_FILE,
  PIPELINE_FILE,
  SCAN_HISTORY_FILE,
  SCAN_SKIPPED_FILE,
  PORTALS_FILE,
  DATA_DIR,
} from './lib/paths.mjs';

const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = PORTALS_FILE;
const SCAN_HISTORY_PATH = SCAN_HISTORY_FILE;
const PIPELINE_PATH = PIPELINE_FILE;
const APPLICATIONS_PATH = APPS_FILE;
const SCAN_SKIPPED_PATH = SCAN_SKIPPED_FILE;

mkdirSync(DATA_DIR, { recursive: true });

const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 15_000;

// ── HTTP helpers ────────────────────────────────────────────────────

async function fetchRaw(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init) {
  const res = await fetchRaw(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Title filter ────────────────────────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return title => {
    const lower = title.toLowerCase();
    const hasPositive =
      positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

// ── Dedup ───────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();

  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) {
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(
      /\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g
    )) {
      const company = match[1].trim().toLowerCase();
      const role = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') {
        seen.add(`${company}::${role}`);
      }
    }
  }
  return seen;
}

// ── Pipeline writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  let text = existsSync(PIPELINE_PATH)
    ? readFileSync(PIPELINE_PATH, 'utf-8')
    : '# Pipeline\n\n## Pending\n\n## Processed\n';

  const marker = '## Pending';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    const procIdx = text.indexOf('## Processed');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block =
      `\n${marker}\n\n` +
      offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') +
      '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    const block =
      '\n' +
      offers.map(o => `- [ ] ${o.url} | ${o.company} | ${o.title}`).join('\n') +
      '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(
      SCAN_HISTORY_PATH,
      'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n',
      'utf-8'
    );
  }

  const lines =
    offers
      .map(
        o => `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`
      )
      .join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

function writeSkipped(skipped, date) {
  // Always overwrite — this file is a snapshot of what the agent flow
  // (Tier 1/3) needs to handle next, not an append-only log.
  const header = 'company\tcareers_url\tscan_method\tscan_query\treason\tlast_checked\n';
  const lines = skipped
    .map(
      s =>
        `${s.name}\t${s.careers_url || ''}\t${s.scan_method || ''}\t${
          s.scan_query || ''
        }\t${s.reason}\t${date}`
    )
    .join('\n');
  writeFileSync(
    SCAN_SKIPPED_PATH,
    header + (lines ? lines + '\n' : ''),
    'utf-8'
  );
}

// ── Parallel fetch with concurrency limit ───────────────────────────

async function parallelFetch(tasks, limit) {
  let i = 0;
  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      await task();
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => next()
  );
  await Promise.all(workers);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany =
    companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;
  const sourceFlag = args.indexOf('--source');
  const filterSource =
    sourceFlag !== -1 ? args[sourceFlag + 1]?.toLowerCase() : null;

  if (filterSource && !PROVIDERS.find(p => p.name === filterSource)) {
    console.error(
      `Error: unknown --source "${filterSource}". Known: ${PROVIDERS.map(
        p => p.name
      ).join(', ')}`
    );
    process.exit(1);
  }

  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);

  // Detect provider for each enabled company.
  const enabled = companies.filter(
    c =>
      c.enabled !== false &&
      (!filterCompany || c.name.toLowerCase().includes(filterCompany))
  );

  const targets = [];
  const skipped = [];
  for (const company of enabled) {
    const detection = detectProvider(company);
    if (!detection) {
      skipped.push({
        ...company,
        reason: 'no_provider_detected',
      });
      continue;
    }
    if (filterSource && detection.provider.name !== filterSource) continue;
    targets.push({ company, ...detection });
  }

  console.log(
    `Scanning ${targets.length} companies via API` +
      (skipped.length
        ? ` (${skipped.length} skipped — no provider match, written to ${SCAN_SKIPPED_PATH})`
        : '')
  );
  if (filterSource) console.log(`(filtered to provider: ${filterSource})`);
  if (dryRun) console.log('(dry run — pipeline.md and scan-history.tsv will not be modified)\n');

  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];
  const perProviderStats = {};

  const tasks = targets.map(t => async () => {
    const { company, provider, target } = t;
    perProviderStats[provider.name] ??= { companies: 0, jobs: 0, errors: 0 };
    perProviderStats[provider.name].companies++;

    try {
      const raw = await provider.fetch(target, fetchJson, fetchRaw);
      const jobs = provider.parse(raw, company.name, target);
      totalFound += jobs.length;
      perProviderStats[provider.name].jobs += jobs.length;

      for (const job of jobs) {
        if (!job.url || !job.title) continue;
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }
        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seenCompanyRoles.has(key)) {
          totalDupes++;
          continue;
        }
        seenUrls.add(job.url);
        seenCompanyRoles.add(key);
        newOffers.push({ ...job, source: `${provider.name}-api` });
      }
    } catch (err) {
      perProviderStats[provider.name].errors++;
      errors.push({
        company: company.name,
        provider: provider.name,
        error: err.message,
      });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  if (!dryRun) {
    if (newOffers.length > 0) {
      appendToPipeline(newOffers);
      appendToScanHistory(newOffers, date);
    }
  }
  // scan-skipped.tsv is a deterministic snapshot of which companies need
  // the agent flow (Tier 1/3). It's not a scan result, so write it even
  // during dry-run so the user can inspect coverage.
  writeSkipped(skipped, date);

  // Summary.
  const bar = '━'.repeat(45);
  console.log(`\n${bar}`);
  console.log(`Portal Scan — ${date}`);
  console.log(bar);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);
  console.log(`Skipped (no API):      ${skipped.length} → Tier C agent`);

  // Per-provider breakdown.
  const providerNames = Object.keys(perProviderStats).sort();
  if (providerNames.length > 0) {
    console.log(`\nBy provider:`);
    for (const name of providerNames) {
      const s = perProviderStats[name];
      const errStr = s.errors ? ` (${s.errors} errors)` : '';
      console.log(
        `  ${name.padEnd(16)} ${String(s.companies).padStart(3)} co  ${String(
          s.jobs
        ).padStart(5)} jobs${errStr}`
      );
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors.slice(0, 20)) {
      console.log(`  ✗ ${e.company} [${e.provider}]: ${e.error}`);
    }
    if (errors.length > 20) {
      console.log(`  … ${errors.length - 20} more`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(
        `\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`
      );
    }
  }

  if (skipped.length > 0 && !dryRun) {
    console.log(
      `\n${skipped.length} companies need agent scanning (Tier C). See ${SCAN_SKIPPED_PATH}.`
    );
    console.log(
      `→ Run /career-ops scan to have the agent process them via Playwright/WebSearch.`
    );
  }

  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log('→ Share results and get help: https://discord.gg/8pRpHETxa4');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

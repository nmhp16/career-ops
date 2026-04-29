/**
 * Single source of truth for filesystem paths used by all career-ops scripts.
 *
 * Scripts should import constants from here instead of computing paths inline.
 * This eliminates the "data/applications.md vs applications.md" dual-layout
 * ambiguity that was duplicated in 4+ scripts.
 *
 * Layout precedence: when both data/X and X exist, prefer data/X (the
 * boilerplate layout). When neither exists, default to data/X so new files
 * land in the right place.
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = dirname(HERE);

function pickPath(...candidates) {
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

// Tracker files — support both data/ (boilerplate) and root (legacy) layouts.
export const APPS_FILE = pickPath(
  join(ROOT, 'data/applications.md'),
  join(ROOT, 'applications.md')
);

export const PIPELINE_FILE = pickPath(
  join(ROOT, 'data/pipeline.md'),
  join(ROOT, 'pipeline.md')
);

export const STATES_FILE = pickPath(
  join(ROOT, 'templates/states.yml'),
  join(ROOT, 'states.yml')
);

// Single-location files.
export const FOLLOWUPS_FILE = join(ROOT, 'data/follow-ups.md');
export const SCAN_HISTORY_FILE = join(ROOT, 'data/scan-history.tsv');
export const SCAN_SKIPPED_FILE = join(ROOT, 'data/scan-skipped.tsv');
export const PORTALS_FILE = join(ROOT, 'portals.yml');

// Directories.
export const DATA_DIR = join(ROOT, 'data');
export const REPORTS_DIR = join(ROOT, 'reports');
export const ADDITIONS_DIR = join(ROOT, 'batch/tracker-additions');
export const MERGED_DIR = join(ADDITIONS_DIR, 'merged');

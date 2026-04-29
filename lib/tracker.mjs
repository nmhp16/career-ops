/**
 * Shared parsers for applications.md (the canonical tracker).
 *
 * The applications.md format is a markdown table:
 *   | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
 *
 * Every script that reads this file should parse it through here, not roll
 * its own split('|').map(s => s.trim()).
 */

import { readFileSync, existsSync } from 'fs';

/**
 * Parse one applications.md table row into a tracker entry.
 * Returns null if the row isn't a valid data row (header, separator, malformed).
 *
 * The `raw` field preserves the original line — useful for in-place edits
 * (dedup-tracker, merge-tracker) that need to find this row in the file later.
 */
export function parseAppLine(line) {
  if (!line || !line.startsWith('|')) return null;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;
  const num = parseInt(parts[1]);
  if (isNaN(num)) return null;
  return {
    num,
    date: parts[2],
    company: parts[3],
    role: parts[4],
    score: parts[5],
    status: parts[6],
    pdf: parts[7],
    report: parts[8],
    notes: parts[9] || '',
    raw: line,
  };
}

/**
 * Read and parse an applications.md file into a list of entries.
 * Skips header/separator rows automatically.
 * Returns [] if the file doesn't exist (fresh install — not an error).
 */
export function parseApplications(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  const entries = [];
  for (const line of content.split('\n')) {
    const entry = parseAppLine(line);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Parse a numeric score from "X.X/5" or "X.X" format. Strips bold markers.
 * Returns 0 if no number found.
 */
export function parseScore(s) {
  if (!s) return 0;
  const m = String(s).replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Extract the report number from a "[123](reports/...)" markdown link.
 * Returns null if not parseable.
 */
export function extractReportNum(reportStr) {
  if (!reportStr) return null;
  const m = String(reportStr).match(/\[(\d+)\]/);
  return m ? parseInt(m[1]) : null;
}

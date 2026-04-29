/**
 * Canonical states + alias table for applications.md status field.
 *
 * Single source of truth for status normalization across:
 *   verify-pipeline.mjs, merge-tracker.mjs, normalize-statuses.mjs,
 *   dedup-tracker.mjs, followup-cadence.mjs, analyze-patterns.mjs.
 *
 * Mirrors templates/states.yml. If states.yml changes, update this file too.
 */

export const CANONICAL_STATES = [
  { id: 'evaluated', label: 'Evaluated' },
  { id: 'applied', label: 'Applied' },
  { id: 'responded', label: 'Responded' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'discarded', label: 'Discarded' },
  { id: 'skip', label: 'SKIP' },
];

export const CANONICAL_LABELS = CANONICAL_STATES.map(s => s.label);
export const CANONICAL_IDS = CANONICAL_STATES.map(s => s.id);

const LABEL_BY_ID = Object.fromEntries(CANONICAL_STATES.map(s => [s.id, s.label]));

/**
 * Raw lowercased input → canonical id.
 *
 * Includes Spanish aliases (legacy data), English variants, and soft signals
 * (hold/condicional → evaluated, monitor → skip, duplicado → discarded).
 */
export const ALIASES = {
  // Spanish → canonical
  'evaluada': 'evaluated',
  'aplicado': 'applied',
  'enviada': 'applied',
  'aplicada': 'applied',
  'respondido': 'responded',
  'entrevista': 'interview',
  'oferta': 'offer',
  'rechazado': 'rejected',
  'rechazada': 'rejected',
  'descartado': 'discarded',
  'descartada': 'discarded',
  'cerrada': 'discarded',
  'cancelada': 'discarded',
  'no aplicar': 'skip',
  'no_aplicar': 'skip',
  // English variants / soft signals → canonical
  'sent': 'applied',
  'condicional': 'evaluated',
  'hold': 'evaluated',
  'evaluar': 'evaluated',
  'verificar': 'evaluated',
  'monitor': 'skip',
  'geo blocker': 'skip',
  'duplicado': 'discarded',
  'dup': 'discarded',
  'repost': 'discarded',
};

/**
 * Strip markdown bold + trailing dates and lowercase. Internal helper.
 */
function cleanRaw(raw) {
  return String(raw || '')
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim()
    .toLowerCase();
}

/**
 * Normalize a raw status string to its canonical id ('evaluated', 'applied',
 * 'responded', 'interview', 'offer', 'rejected', 'discarded', 'skip').
 *
 * Returns null if the input doesn't match any canonical id, label, or alias.
 * Callers decide what to do with null (warn, error, default).
 */
export function normalizeStatusId(raw) {
  const clean = cleanRaw(raw);
  if (!clean) return null;
  if (CANONICAL_IDS.includes(clean)) return clean;
  if (ALIASES[clean]) return ALIASES[clean];
  // Match against label (e.g. "evaluated" already covered by id; this handles
  // edge cases where a label is written differently, e.g. "skip" vs "SKIP").
  for (const s of CANONICAL_STATES) {
    if (s.label.toLowerCase() === clean) return s.id;
  }
  return null;
}

/**
 * Normalize a raw status string to its canonical display label ('Evaluated',
 * 'Applied', ..., 'SKIP'). Returns null if unknown.
 */
export function normalizeStatus(raw) {
  const id = normalizeStatusId(raw);
  return id ? LABEL_BY_ID[id] : null;
}

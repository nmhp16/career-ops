/**
 * Provider registry.
 *
 * Each provider exposes:
 *   - name:         identifier used in source field and --source flag
 *   - detect(co):   returns a target object if it can handle the company, else null
 *   - fetch(t,fj,fr): returns raw items (provider-specific shape)
 *   - parse(raw,co,t): returns normalized [{ title, url, company, location }]
 *
 * Registration order matters: greenhouse must come before generic ATS
 * detectors because companies often have both an `api:` field (greenhouse)
 * and a `careers_url` on a different platform.
 */
import { greenhouse } from './greenhouse.mjs';
import { ashby } from './ashby.mjs';
import { lever } from './lever.mjs';
import { workable } from './workable.mjs';
import { smartrecruiters } from './smartrecruiters.mjs';
import { recruitee } from './recruitee.mjs';
import { personio } from './personio.mjs';
import { teamtailor } from './teamtailor.mjs';
import { bamboohr } from './bamboohr.mjs';
import { workday } from './workday.mjs';

export const PROVIDERS = [
  greenhouse,
  ashby,
  lever,
  workable,
  smartrecruiters,
  recruitee,
  personio,
  teamtailor,
  bamboohr,
  workday,
];

export function detectProvider(company) {
  for (const provider of PROVIDERS) {
    const target = provider.detect(company);
    if (target) return { provider, target };
  }
  return null;
}

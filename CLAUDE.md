# Career-Ops -- AI Job Search Pipeline

## Origin

This system was built and used by [santifer](https://santifer.io) to evaluate 740+ job offers, generate 100+ tailored CVs, and land a Head of Applied AI role. The archetypes, scoring logic, negotiation scripts, and proof point structure all reflect his specific career search in AI/automation roles.

The portfolio that goes with this system is also open source: [cv-santiago](https://github.com/santifer/cv-santiago).

**It will work out of the box, but it's designed to be made yours.** If the archetypes don't match your career, the modes are in the wrong language, or the scoring doesn't fit your priorities -- just ask. You (AI Agent) can edit the user's files. The user says "change the archetypes to data engineering roles" and you do it. That's the whole point.

## Data Contract (CRITICAL)

There are two layers. Read `DATA_CONTRACT.md` for the full list.

**User Layer (NEVER auto-updated, personalization goes HERE):**
- `cv.md`, `config/profile.yml`, `modes/_profile.md`, `article-digest.md`, `portals.yml`
- `data/*`, `reports/*`, `output/*`, `interview-prep/*`

**System Layer (auto-updatable, DON'T put user data here):**
- `modes/_shared.md`, `modes/evaluate.md`, all other modes
- `CLAUDE.md`, `*.mjs` scripts, `dashboard/*`, `templates/*`, `batch/*`

**THE RULE: When the user asks to customize anything (archetypes, narrative, negotiation scripts, proof points, location policy, comp targets), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content.** This ensures system updates don't overwrite their customizations.

## Update Check

On the first message of each session, run the update checker silently:

```bash
node update-system.mjs check
```

Parse the JSON output:
- `{"status": "update-available", "local": "1.0.0", "remote": "1.1.0", "changelog": "..."}` → tell the user:
  > "career-ops update available (v{local} → v{remote}). Your data (CV, profile, tracker, reports) will NOT be touched. Want me to update?"
  If yes → run `node update-system.mjs apply`. If no → run `node update-system.mjs dismiss`.
- `{"status": "up-to-date"}` → say nothing
- `{"status": "dismissed"}` → say nothing
- `{"status": "offline"}` → say nothing
- `{"status": "no-remote-version"}` → say nothing (checker reached GitHub but neither VERSION nor the latest release tag parsed as semver — treat as a silent non-failure, same as offline)

The user can also say "check for updates" or "update career-ops" at any time to force a check.
To rollback: `node update-system.mjs rollback`

## What is career-ops

AI-powered job search automation built on Claude Code: pipeline tracking, offer evaluation, CV generation, portal scanning, batch processing.

### Main Files

| File | Function |
|------|----------|
| `data/applications.md` | Application tracker |
| `data/pipeline.md` | Inbox of pending URLs |
| `data/scan-history.tsv` | Scanner dedup history |
| `portals.yml` | Query and company config |
| `templates/cv-template.html` | HTML template for CVs |
| `templates/cv-template.tex` | LaTeX/Overleaf template for CVs |
| `generate-pdf.mjs` | Playwright: HTML to PDF |
| `generate-latex.mjs` | LaTeX CV validator + pdflatex compiler |
| `article-digest.md` | Compact proof points from portfolio (optional) |
| `interview-prep/story-bank.md` | Accumulated STAR+R stories across evaluations |
| `interview-prep/{company}-{role}.md` | Company-specific interview intel reports |
| `analyze-patterns.mjs` | Pattern analysis script (JSON output) |
| `followup-cadence.mjs` | Follow-up cadence calculator (JSON output) |
| `data/follow-ups.md` | Follow-up history tracker |
| `scan.mjs` | Zero-token portal scanner — hits Greenhouse/Ashby/Lever APIs directly, zero LLM cost |
| `check-liveness.mjs` | Job posting liveness checker |
| `lib/liveness.mjs` | Shared liveness logic (expired signals win over generic Apply text) |
| `reports/` | Evaluation reports (format: `{###}-{company-slug}-{YYYY-MM-DD}.md`). Blocks A-F + G (Posting Legitimacy). Header includes `**Legitimacy:** {tier}`. |

### OpenCode Commands

When using [OpenCode](https://opencode.ai), the following slash commands are available (defined in `.opencode/commands/`):

| Command | Claude Code Equivalent | Description |
|---------|------------------------|-------------|
| `/career-ops` | `/career-ops` | Show menu or evaluate JD with args |
| `/career-ops-pipeline` | `/career-ops pipeline` | Process pending URLs from inbox |
| `/career-ops-evaluate` | `/career-ops evaluate` | Evaluate job offer (A-F scoring) |
| `/career-ops-compare` | `/career-ops compare` | Compare and rank multiple offers |
| `/career-ops-contact` | `/career-ops contact` | LinkedIn outreach (find contacts + draft) |
| `/career-ops-deep` | `/career-ops deep` | Deep company research |
| `/career-ops-pdf` | `/career-ops pdf` | Generate ATS-optimized CV |
| `/career-ops-latex` | `/career-ops latex` | Export CV as LaTeX/Overleaf .tex |
| `/career-ops-training` | `/career-ops training` | Evaluate course/cert against goals |
| `/career-ops-project` | `/career-ops project` | Evaluate portfolio project idea |
| `/career-ops-tracker` | `/career-ops tracker` | Application status overview |
| `/career-ops-apply` | `/career-ops apply` | Live application assistant |
| `/career-ops-scan` | `/career-ops scan` | Scan portals for new offers |
| `/career-ops-batch` | `/career-ops batch` | Batch processing with parallel workers |
| `/career-ops-patterns` | `/career-ops patterns` | Analyze rejection patterns and improve targeting |
| `/career-ops-followup` | `/career-ops followup` | Follow-up cadence tracker |

**Note:** OpenCode commands invoke the same `.claude/skills/career-ops/SKILL.md` skill used by Claude Code. The `modes/*` files are shared between both platforms.

### Gemini CLI Commands

When using the [Gemini CLI](https://github.com/google-gemini/gemini-cli), the following slash commands are available (defined in `.gemini/commands/`):

| Command | Claude Code Equivalent | Description |
|---------|------------------------|-------------|
| `/career-ops` | `/career-ops` | Show menu or evaluate JD with args |
| `/career-ops-pipeline` | `/career-ops pipeline` | Process pending URLs from inbox |
| `/career-ops-evaluate` | `/career-ops evaluate` | Evaluate job offer (A-G scoring) |
| `/career-ops-compare` | `/career-ops compare` | Compare and rank multiple offers |
| `/career-ops-contact` | `/career-ops contact` | LinkedIn outreach (find contacts + draft) |
| `/career-ops-deep` | `/career-ops deep` | Deep company research |
| `/career-ops-pdf` | `/career-ops pdf` | Generate ATS-optimized CV |
| `/career-ops-training` | `/career-ops training` | Evaluate course/cert against goals |
| `/career-ops-project` | `/career-ops project` | Evaluate portfolio project idea |
| `/career-ops-tracker` | `/career-ops tracker` | Application status overview |
| `/career-ops-apply` | `/career-ops apply` | Live application assistant |
| `/career-ops-scan` | `/career-ops scan` | Scan portals for new offers |
| `/career-ops-batch` | `/career-ops batch` | Batch processing with parallel workers |
| `/career-ops-patterns` | `/career-ops patterns` | Analyze rejection patterns and improve targeting |
| `/career-ops-followup` | `/career-ops followup` | Follow-up cadence tracker |

**Note:** Gemini CLI commands are defined in `.gemini/commands/*.toml`. The project context is auto-loaded from `GEMINI.md`. All `modes/*` files are shared across Claude Code, OpenCode, and Gemini CLI.

### First Run — Onboarding (IMPORTANT)

**Before doing ANYTHING else, check if the system is set up.** Run these checks silently every time a session starts:

1. Does `cv.md` exist?
2. Does `config/profile.yml` exist (not just profile.example.yml)?
3. Does `modes/_profile.md` exist (not just _profile.template.md)?
4. Does `portals.yml` exist (not just templates/portals.example.yml)?

If `modes/_profile.md` is missing, copy from `modes/_profile.template.md` silently. This is the user's customization file — it will never be overwritten by updates.

**If ANY of these is missing, enter onboarding mode.** Do NOT proceed with evaluations, scans, or any other mode until the basics are in place. Guide the user step by step:

#### Step 1: CV (required)
If `cv.md` is missing, ask:
> "I don't have your CV yet. You can either:
> 1. Paste your CV here and I'll convert it to markdown
> 2. Paste your LinkedIn URL and I'll extract the key info
> 3. Tell me about your experience and I'll draft a CV for you
>
> Which do you prefer?"

Create `cv.md` from whatever they provide. Make it clean markdown with standard sections (Summary, Experience, Projects, Education, Skills).

#### Step 2: Profile (required)
If `config/profile.yml` is missing, copy from `config/profile.example.yml` and then ask:
> "I need a few details to personalize the system:
> - Your full name and email
> - Your location and timezone
> - What roles are you targeting? (e.g., 'Senior Backend Engineer', 'AI Product Manager')
> - Your salary target range
>
> I'll set everything up for you."

Fill in `config/profile.yml` with their answers. For archetypes and targeting narrative, store the user-specific mapping in `modes/_profile.md` or `config/profile.yml` rather than editing `modes/_shared.md`.

#### Step 3: Portals (recommended)
If `portals.yml` is missing:
> "I'll set up the job scanner with 45+ pre-configured companies. Want me to customize the search keywords for your target roles?"

Copy `templates/portals.example.yml` → `portals.yml`. If they gave target roles in Step 2, update `title_filter.positive` to match.

#### Step 4: Tracker
If `data/applications.md` doesn't exist, create it:
```markdown
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
```

#### Step 5: Get to know the user (important for quality)

After the basics are set up, proactively ask for more context. The more you know, the better your evaluations will be:

> "The basics are ready. But the system works much better when it knows you well. Can you tell me more about:
> - What makes you unique? What's your 'superpower' that other candidates don't have?
> - What kind of work excites you? What drains you?
> - Any deal-breakers? (e.g., no on-site, no startups under 20 people, no Java shops)
> - Your best professional achievement — the one you'd lead with in an interview
> - Any projects, articles, or case studies you've published?
>
> The more context you give me, the better I filter. Think of it as onboarding a recruiter — the first week I need to learn about you, then I become invaluable."

Store any insights the user shares in `config/profile.yml` (under narrative), `modes/_profile.md`, or in `article-digest.md` if they share proof points. Do not put user-specific archetypes or framing into `modes/_shared.md`.

**After every evaluation, learn.** If the user says "this score is too high, I wouldn't apply here" or "you missed that I have experience in X", update your understanding in `modes/_profile.md`, `config/profile.yml`, or `article-digest.md`. The system should get smarter with every interaction without putting personalization into system-layer files.

#### Step 6: Ready
Once all files exist, confirm:
> "You're all set! You can now:
> - Paste a job URL to evaluate it
> - Run `/career-ops scan` (or `/career-ops-scan` if using OpenCode) to search portals
> - Run `/career-ops` to see all commands
>
> Everything is customizable — just ask me to change anything.
>
> Tip: Having a personal portfolio dramatically improves your job search. If you don't have one yet, the author's portfolio is also open source: github.com/santifer/cv-santiago — feel free to fork it and make it yours."

Then suggest automation:
> "Want me to scan for new offers automatically? I can set up a recurring scan every few days so you don't miss anything. Just say 'scan every 3 days' and I'll configure it."

If the user accepts, use the `/loop` or `/schedule` skill (if available) to set up a recurring `/career-ops scan` (or `/career-ops-scan` if using OpenCode). If those aren't available, suggest adding a cron job or remind them to run `/career-ops scan` (or `/career-ops-scan` if using OpenCode) periodically.

### Personalization

This system is designed to be customized by YOU (AI Agent). When the user asks you to change archetypes, translate modes, adjust scoring, add companies, or modify negotiation scripts -- do it directly. You read the same files you use, so you know exactly what to edit.

**Common customization requests:**
- "Change the archetypes to [backend/frontend/data/devops] roles" → edit `modes/_profile.md` or `config/profile.yml`
- "Translate the modes to English" → edit all files in `modes/`
- "Add these companies to my portals" → edit `portals.yml`
- "Update my profile" → edit `config/profile.yml`
- "Change the CV template design" → edit `templates/cv-template.html`
- "Adjust the scoring weights" → edit `modes/_profile.md` for user-specific weighting, or edit `modes/_shared.md` and `batch/batch-prompt.md` only when changing the shared system defaults for everyone

### Skill Modes

| If the user... | Mode |
|----------------|------|
| Pastes JD or URL | auto-pipeline (evaluate + report + PDF + tracker) |
| Asks to evaluate offer | `evaluate` |
| Asks to compare offers | `compare` |
| Wants LinkedIn outreach | `contact` |
| Asks for company research | `deep` |
| Preps for interview at specific company | `interview-prep` |
| Wants to generate CV/PDF | `pdf` |
| Evaluates a course/cert | `training` |
| Evaluates portfolio project | `project` |
| Asks about application status | `tracker` |
| Fills out application form | `apply` |
| Searches for new offers | `scan` |
| Processes pending URLs | `pipeline` |
| Batch processes offers | `batch` |
| Asks about rejection patterns or wants to improve targeting | `patterns` |
| Asks about follow-ups or application cadence | `followup` |

### CV Source of Truth

- `cv.md` in project root is the canonical CV
- `article-digest.md` has detailed proof points (optional)
- **NEVER hardcode metrics** -- read them from these files at evaluation time

---

## Ethical Use -- CRITICAL

**This system is designed for quality, not quantity.** The goal is to help the user find and apply to roles where there is a genuine match -- not to spam companies with mass applications.

- **NEVER submit an application without the user reviewing it first.** Fill forms, draft answers, generate PDFs -- but always STOP before clicking Submit/Send/Apply. The user makes the final call.
- **Strongly discourage low-fit applications.** If a score is below 4.0/5, explicitly recommend against applying. The user's time and the recruiter's time are both valuable. Only proceed if the user has a specific reason to override the score.
- **Quality over speed.** A well-targeted application to 5 companies beats a generic blast to 50. Guide the user toward fewer, better applications.
- **Respect recruiters' time.** Every application a human reads costs someone's attention. Only send what's worth reading.

---

## Offer Verification -- MANDATORY

**NEVER trust WebSearch/WebFetch to verify if an offer is still active.** ALWAYS use Playwright:
1. `browser_navigate` to the URL
2. `browser_snapshot` to read content
3. Only footer/navbar without JD = closed. Title + description + Apply = active.

**Exception for batch workers (`claude -p`):** Playwright is not available in headless pipe mode. Use WebFetch as fallback and mark the report header with `**Verification:** unconfirmed (batch mode)`. The user can verify manually later.

---

## Resume & Cover Letter Quality -- GENERAL RULES

These are general writing principles for any resume or cover letter generated by career-ops (tailored PDFs, cover letter PDFs, form answers). They are NOT user-specific — the user's project-to-role mapping, default seniority, and specific experience context live in `modes/_profile.md` under "Your Tailoring Rules".

These rules supersede `modes/_shared.md` "Professional Writing & ATS Compatibility" and `modes/auto-pipeline.md` Step 4 defaults where they conflict.

### Resume bullets must read resume-style, not description-style

Each bullet should read as: **action verb → artifact → mechanism (briefly, in parens) → concrete outcome.**

- Lead with strong concrete verbs (Built, Designed, Wrote, Cached, Wired, Cut, Reduced, Indexed, Shipped)
- Pack architecture/component details into parentheticals, not as the bullet's main payload
- End each bullet on a concrete outcome: a metric, the scope of what it does, or what it enables in the system

**Bad (description style):**
> "Designed a backend service organized as 5 modules (auth, billing, search, notifications, admin) over a layered controller-service-repository architecture, CORS-locked to specific origins, packaged for deployment with Docker and gunicorn."

**Good (resume style):**
> "Built a production REST backend with a layered controller-service-repository architecture (5 modules, JWT-auth, Docker-packaged) that powers signup, billing, and search for ~100K active users."

**Pre-flight check before `generate-pdf.mjs` runs.** For each bullet in EXPERIENCE_BLOCK and PROJECTS_BLOCK, ask:
1. Does it start with an action verb?
2. Does it have a concrete outcome at the end (metric, scope, what it enables)?
3. Are architecture components in parens, not as the main clause?
4. If you removed the parens, would the remaining sentence still claim something useful?
5. **Within a single project or role, does every bullet cover a DIFFERENT aspect of the work?** Architecture, inputs, deployment, performance, eval, scaling, etc. should each get their own bullet. If two bullets reference the same controller / pipeline / model / metric / FSM from different angles, they're duplicates -- combine into one denser bullet, or rewrite the weaker one to cover a distinct dimension (e.g., move from "controller routed paths" to "input perception layer" or "on-device deployment").

If any answer is no, rewrite before generating.

### Project selection matches reviewer audience (3 axes, not 2)

A project's value on a tailored CV depends on three axes:
1. **Technical fit** with the JD's stack (Python/FastAPI/SQL/etc.)
2. **Domain fit** with the company's space (AgTech, fintech, etc.)
3. **Reviewer comprehension** -- does the reader understand the value of the technical work without Googling?

If a project nails (2) but fails (3), drop it. Domain alignment can land via experience bullets and the cover letter -- projects need to read clearly to whoever's screening.

**Heuristic:** If a non-domain reviewer would have to Google three or more specialized terms in a single bullet (specific framework names, paper-acronyms, niche library identifiers), the project is wrong for that audience.

**Bullet-level audience match (extends the same principle).** The same project should not surface the same bullets to every audience. Rewrite or replace bullets to match the reviewer. Illustrative template:

| Project type | ML / AI role bullets | Robotics control role bullets | Embedded / firmware role bullets |
|--------------|----------------------|--------------------------------|----------------------------------|
| Imitation-learning / RL training pipeline | Fine-tuning loop, paper replication, eval harness | Sim-side data augmentation, scaling demos to thousands of trajectories, asset format conversion | (drop, not relevant) |
| Multi-modal robot brain (LLM + VLM + perception) | Multi-model orchestration, agentic controller, on-device inference | Kinematics on a reduced model, per-joint gain tuning, smooth tracking | Low-level control bus, CRC-validated transport, real-time on-device loop |
| Backend web / API service | (drop, low ML signal) | (drop) | (drop) |
| Embedded autonomy stack | (drop, low ML signal) | FSM with freshness checks, visual servoing, multi-modal vision navigation | Microcontroller firmware in C/C++, real-time buffers, ROS-equivalent integration |

When the reviewer's role doesn't justify a bullet's depth (e.g., shipping kinematics + per-joint gain tuning bullets to a marketing-AI hiring manager), drop or rewrite the bullet rather than ship off-target depth.

The user's specific project-to-role and bullet-level mappings (with their actual project names) live in `modes/_profile.md` under "Your Tailoring Rules".

### Cover letter tone scales with candidate seniority

| Seniority | Posture | Example phrasings |
|-----------|---------|-------------------|
| New-grad / Intern / Junior (≤1 YOE) | **Student-eager**: humble, curious, learning-oriented | "lines up with side projects I've been working on"; "helped cut latency by X"; "taught me a lot about Y"; "would love to contribute and learn" |
| Mid-level (2-5 YOE) | **Confident peer**: shows fit + interest, no hard sell | "this matches the kind of work I've been doing"; "the team's approach to X is the part that drew me in"; "happy to dig in on Y from day one" |
| Senior+ / Multi-offer (5+ YOE) | **"I'm choosing you"**: selective, options-having | "I've been intentional about finding a team where I can contribute"; "your X maps directly to what I built at Y" |

Don't apply senior-level "I'm choosing you" framing (e.g., from `modes/auto-pipeline.md` Step 4) to junior/intern apps -- it reads as cocky.

The candidate's default seniority is set in `modes/_profile.md` under "Your Tailoring Rules".

### Cover letter prose != resume bullet style

Cover letters need narrative flow, not resume-density. The same anti-AI-tells from `modes/_shared.md` apply, plus these cover-letter-specific patterns to avoid:

1. **Resume-bullet-stuffed-into-sentence.** Heavy parentheticals stuffed with technical specs read as copy-pasted resume bullets. Example AI tell:
   > "I built a content moderation service (rule-engine evaluation, ML-classifier scoring, async retry queue, hybrid vector store of past decisions and review notes, and a feedback loop from human moderators)..."

   Limit parentheticals to 1-2 specs max in cover letter prose. Move technical depth to the resume; let the cover letter narrate.

2. **Quoting JD marketing copy verbatim.** "Agentic Decision OS for Growth Marketing", "AI tools as standard equipment", "Decisioning Waterfall". Recruiters get hundreds of letters that echo their own taglines back. Pick at most one JD phrase to anchor; replace others with concrete observations ("you're shipping that for real customers").

3. **Topic-header colons in body paragraphs.** "On the AI-native and shipping-speed side:" / "On the technical fit:" / "Regarding eval harnesses:". Humans don't write cover letters with section labels -- this is LLM scaffolding leaking through. Drop the headers; let paragraphs flow.

4. **Repetitive paragraph architecture.** Every paragraph following the same shape (topic claim -> dense parenthetical with specs -> vague transferable bridge) is a strong AI signal. Vary sentence length and structure across paragraphs. Some short punchy sentences, some longer narrative.

5. **Vague transferable bridges.** "Would carry over to X", "lines up with what you're building", "aligns with the team's mission". Pick one concrete thing the work would help with, name it specifically. ("Building benchmarks for marketing-science models is the same problem in a different domain" beats "would carry over to marketing-science benchmarks.")

6. **Restating across paragraphs.** If paragraph N just rephrases content from paragraphs 1 to N-1 with a "transferable" claim, drop it. Cover letters should be 4-5 paragraphs of distinct content, not 6 paragraphs where 1-2 are filler.

**Strong human signals to keep:**
- Direct admissions of gaps ("I'll be honest about X. I haven't done Y yet.")
- Conversational logistics framing ("My internship wraps in May, so...")
- "The interesting part wasn't X, it was Y" style of how engineers actually talk about their work
- One unexpected detail per project that grounds it (e.g., "figuring out how to handle the one upstream API that returned a 200 with the error embedded in the response body")

**Pre-flight check:** Read each paragraph aloud. If it sounds like a resume bullet rather than a sentence a person would write to another person, rewrite.

**Calibrate to candidate voice (meta-principle).** The defaults in this rule and in "Cover letter tone scales with candidate seniority" are starting points, not endpoints. Some candidates write in a more reserved, factual style and don't naturally use editorial framings ("the interesting part was X"), lessons-learned closers ("that taught me how to..."), or enthusiasm closers ("I'd love to contribute and learn..."). For reserved candidates, drop those moves entirely -- let the work statements stand on their own and use a neutral close ("Thank you for considering my application"). The candidate-specific voice calibration lives in the project's `modes/_profile.md` under "Your Tailoring Rules".

---

## CI/CD and Quality

- **GitHub Actions** run on every PR: `test-all.mjs` (63+ checks), auto-labeler (risk-based: 🔴 core-architecture, ⚠️ agent-behavior, 📄 docs), welcome bot for first-time contributors
- **Branch protection** on `main`: status checks must pass before merge. No direct pushes to main (except admin bypass).
- **Dependabot** monitors npm, Go modules, and GitHub Actions for security updates
- **Contributing process**: issue first → discussion → PR with linked issue → CI passes → maintainer review → merge

## Community and Governance

- **Code of Conduct**: Contributor Covenant 2.1 with enforcement actions (see `.github/CODE_OF_CONDUCT.md`)
- **Governance**: BDFL model with contributor ladder — Participant → Contributor → Triager → Reviewer → Maintainer (see `GOVERNANCE.md`)
- **Security**: private vulnerability reporting via email (see `.github/SECURITY.md`)
- **Support**: help questions go to Discord/Discussions, not issues (see `.github/SUPPORT.md`)
- **Discord**: https://discord.gg/8pRpHETxa4

## Stack and Conventions

- Node.js (mjs modules), Playwright (PDF + scraping), YAML (config), HTML/CSS (template), Markdown (data), Canva MCP (optional visual CV)
- Scripts in `.mjs`, configuration in YAML
- Output in `output/` (gitignored), Reports in `reports/`
- JDs in `jds/` (referenced as `local:jds/{file}` in pipeline.md)
- Batch in `batch/` (gitignored except scripts and prompt)
- Report numbering: sequential 3-digit zero-padded, max existing + 1
- **RULE: After each batch of evaluations, run `node merge-tracker.mjs`** to merge tracker additions and avoid duplications.
- **RULE: NEVER create new entries in applications.md if company+role already exists.** Update the existing entry.

### TSV Format for Tracker Additions

Write one TSV file per evaluation to `batch/tracker-additions/{num}-{company-slug}.tsv`. Single line, 9 tab-separated columns:

```
{num}\t{date}\t{company}\t{role}\t{status}\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

**Column order (IMPORTANT -- status BEFORE score):**
1. `num` -- sequential number (integer)
2. `date` -- YYYY-MM-DD
3. `company` -- short company name
4. `role` -- job title
5. `status` -- canonical status (e.g., `Evaluated`)
6. `score` -- format `X.X/5` (e.g., `4.2/5`)
7. `pdf` -- `✅` or `❌`
8. `report` -- markdown link `[num](reports/...)`
9. `notes` -- one-line summary

**Note:** In applications.md, score comes BEFORE status. The merge script handles this column swap automatically.

### Pipeline Integrity

1. **NEVER edit applications.md to ADD new entries** -- Write TSV in `batch/tracker-additions/` and `merge-tracker.mjs` handles the merge.
2. **YES you can edit applications.md to UPDATE status/notes of existing entries.**
3. All reports MUST include `**URL:**` in the header (between Score and PDF). Include `**Legitimacy:** {tier}` (see Block G in `modes/evaluate.md`).
4. All statuses MUST be canonical (see `templates/states.yml`).
5. Health check: `node verify-pipeline.mjs`
6. Normalize statuses: `node normalize-statuses.mjs`
7. Dedup: `node dedup-tracker.mjs`

### Canonical States (applications.md)

**Source of truth:** `templates/states.yml`

| State | When to use |
|-------|-------------|
| `Evaluated` | Report completed, pending decision |
| `Applied` | Application sent |
| `Responded` | Company responded |
| `Interview` | In interview process |
| `Offer` | Offer received |
| `Rejected` | Rejected by company |
| `Discarded` | Discarded by candidate or offer closed |
| `SKIP` | Doesn't fit, don't apply |

**RULES:**
- No markdown bold (`**`) in status field
- No dates in status field (use the date column)
- No extra text (use the notes column)

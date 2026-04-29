# System Context -- career-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.
     
     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains system rules, scoring logic, and tool config
     that improve with each career-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| cv.md | `cv.md` (project root) | ALWAYS |
| article-digest.md | `article-digest.md` (if exists) | ALWAYS (detailed proof points) |
| profile.yml | `config/profile.yml` | ALWAYS (candidate identity and targets) |
| _profile.md | `modes/_profile.md` | ALWAYS (user archetypes, narrative, negotiation) |

**RULE: NEVER hardcode metrics from proof points.** Read them from cv.md + article-digest.md at evaluation time.
**RULE: For article/project metrics, article-digest.md takes precedence over cv.md.**
**RULE: Read _profile.md AFTER this file. User customizations in _profile.md override defaults here.**

---

## Scoring System

The evaluation uses 6 blocks (A-F) with a global score of 1-5:

| Dimension | What it measures |
|-----------|-----------------|
| CV Match | Skills, experience, proof points alignment |
| North Star alignment | How well the role fits the user's target archetypes (from _profile.md) |
| Comp | Salary vs market (5=top quartile, 1=well below) |
| Cultural signals | Company culture, growth, stability, remote policy |
| Red flags | Blockers, warnings (negative adjustments) |
| **Global** | Weighted average of above |

**Score interpretation:**
- 4.5+ → Strong match, recommend applying immediately
- 4.0-4.4 → Good match, worth applying
- 3.5-3.9 → Decent but not ideal, apply only if specific reason
- Below 3.5 → Recommend against applying (see Ethical Use in CLAUDE.md)

## Posting Legitimacy (Block G)

Block G assesses whether a posting is likely a real, active opening. It does NOT affect the 1-5 global score -- it is a separate qualitative assessment.

**Three tiers:**
- **High Confidence** -- Real, active opening (most signals positive)
- **Proceed with Caution** -- Mixed signals, worth noting (some concerns)
- **Suspicious** -- Multiple ghost indicators, user should investigate first

**Key signals (weighted by reliability):**

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Posting age | Page snapshot | High | Under 30d=good, 30-60d=mixed, 60d+=concerning (adjusted for role type) |
| Apply button active | Page snapshot | High | Direct observable fact |
| Tech specificity in JD | JD text | Medium | Generic JDs correlate with ghost postings but also with poor writing |
| Requirements realism | JD text | Medium | Contradictions are a strong signal, vagueness is weaker |
| Recent layoff news | WebSearch | Medium | Must consider department, timing, and company size |
| Reposting pattern | scan-history.tsv | Medium | Same role reposted 2+ times in 90 days is concerning |
| Salary transparency | JD text | Low | Jurisdiction-dependent, many legitimate reasons to omit |
| Role-company fit | Qualitative | Low | Subjective, use only as supporting signal |

**Ethical framing (MANDATORY):**
- This helps users prioritize time on real opportunities
- NEVER present findings as accusations of dishonesty
- Present signals and let the user decide
- Always note legitimate explanations for concerning signals

## Archetype Detection

Classify every offer into one of these types (or hybrid of 2):

| Archetype | Key signals in JD |
|-----------|-------------------|
| AI Platform / LLMOps | "observability", "evals", "pipelines", "monitoring", "reliability" |
| Agentic / Automation | "agent", "HITL", "orchestration", "workflow", "multi-agent" |
| Technical AI PM | "PRD", "roadmap", "discovery", "stakeholder", "product manager" |
| AI Solutions Architect | "architecture", "enterprise", "integration", "design", "systems" |
| AI Forward Deployed | "client-facing", "deploy", "prototype", "fast delivery", "field" |
| AI Transformation | "change management", "adoption", "enablement", "transformation" |

After detecting archetype, read `modes/_profile.md` for the user's specific framing and proof points for that archetype.

## Global Rules

### NEVER

1. Invent experience or metrics
2. Modify cv.md or portfolio files
3. Submit applications on behalf of the candidate
4. Share phone number in generated messages
5. Recommend comp below market rate
6. Generate a PDF without reading the JD first
7. Use corporate-speak
8. Ignore the tracker (every evaluated offer gets registered)

### ALWAYS

0. **Cover letter:** If the form allows it, ALWAYS include one. Same visual design as CV. JD quotes mapped to proof points. 1 page max.
1. Read cv.md, _profile.md, and article-digest.md (if exists) before evaluating
1b. **First evaluation of each session:** Run `node cv-sync-check.mjs`. If warnings, notify user.
2. Detect the role archetype and adapt framing per _profile.md
3. Cite exact lines from CV when matching
4. Use WebSearch for comp and company data
5. Register in tracker after evaluating
6. Generate content in the language of the JD (EN default)
7. Be direct and actionable -- no fluff
8. Native tech English for generated text. Short sentences, action verbs, no passive voice.
8b. Case study URLs in PDF Professional Summary (recruiter may only read this).
9. **Tracker additions as TSV** -- NEVER edit applications.md directly. Write TSV in `batch/tracker-additions/`.
10. **Include `**URL:**` in every report header.**

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Comp research, trends, company culture, LinkedIn contacts, fallback for JDs |
| WebFetch | Fallback for extracting JDs from static pages |
| Playwright | Verify offers (browser_navigate + browser_snapshot). **NEVER 2+ agents with Playwright in parallel.** |
| Read | cv.md, _profile.md, article-digest.md, cv-template.html |
| Write | Temporary HTML for PDF, applications.md, reports .md |
| Edit | Update tracker |
| Canva MCP | Optional visual CV generation. Duplicate base design, edit text, export PDF. Requires `cv.canva_resume_design_id` in profile.yml. |
| Bash | `node generate-pdf.mjs` |

### Time-to-offer priority
- Working demo + metrics > perfection
- Apply sooner > learn more
- 80/20 approach, timebox everything

---

## Professional Writing & ATS Compatibility

These rules apply to ALL generated text that ends up in candidate-facing documents: PDF summaries, bullets, cover letters, form answers, LinkedIn messages. They do NOT apply to internal evaluation reports.

### Avoid cliché phrases
- "passionate about" / "results-oriented" / "proven track record"
- "leveraged" (use "used" or name the tool)
- "spearheaded" (use "led" or "ran")
- "facilitated" (use "ran" or "set up")
- "synergies" / "robust" / "seamless" / "cutting-edge" / "innovative"
- "in today's fast-paced world"
- "demonstrated ability to" / "best practices" (name the practice)

### Unicode normalization for ATS
`generate-pdf.mjs` automatically normalizes em-dashes, smart quotes, and zero-width characters to ASCII equivalents for maximum ATS compatibility. But avoid generating them in the first place.

### Vary sentence structure
- Don't start every bullet with the same verb
- Mix sentence lengths (short. Then longer with context. Short again.)
- Don't always use "X, Y, and Z" — sometimes two items, sometimes four

### Prefer specifics over abstractions
- "Cut p95 latency from 2.1s to 380ms" beats "improved performance"
- "Postgres + pgvector for retrieval over 12k docs" beats "designed scalable RAG architecture"
- Name tools, projects, and customers when allowed

### Anti-AI-tells (mandatory before any PDF generation)

LLMs default to a recognizable voice. Recruiters scan for it and downgrade the candidate. Apply these rules to every generated bullet, cover letter, and form answer.

**NEVER in body text:**
- Em-dashes (`—`) or double-dashes (`--`). Use periods, commas, or semicolons.
- Arrows for data flow (`→`, `->`, `=>`). Use plain English connectors: "then," "feeds," "produces," commas, semicolons.
- Tilde-arrow patterns like `~15 → ~500`. Write "from 15 to roughly 500" instead.
- Buzzword closers: "demonstrating X beyond Y," "leveraging cutting-edge Z," "showcasing the ability to," "establishing a foundation for." End each bullet on the concrete action or result, not on a meta-observation.
- Multi-clause em-dash sandwiches (`Built X — a Y that does Z — for W`). The single strongest LLM fingerprint. Split into two sentences.

**ALWAYS in body text:**
- **One sentence per bullet.** A bullet is a single declarative claim. Multiple ideas join via commas and parentheticals, never via "X. Y." compound sentences. If you find yourself writing a period inside a bullet, split into two bullets or compress into one.
- Concrete action verbs at the start (Built, designed, wired, trained, collected, integrated, ported, cut, optimized, validated, shipped). Avoid weak openers ("worked on," "helped with," "responsible for").
- Pack detail into commas and parentheticals rather than new sentences. Bullets in real engineering resumes routinely run 25-40 words but stay one sentence -- the density signals competence.
- Quantify when honest, and **commit to the number**. Use discrete values: "500 trajectories," "29 DOF," "~30M params" (the tilde is fine for known model-size approximations). Avoid hedging language like "roughly," "around," "approximately," "completing in," "scaled from X to Y" -- those read as the model guessing. If you don't know the exact number, leave the metric out entirely; don't fudge it with hedges.
- **Ranges:** OK only when describing a *change* (e.g., "cut latency from 10 min to 5 min"). Avoid ranges as a stand-in for a single value ("trains in 30-60 min," "uses 4-8 GB RAM") -- pick the typical or upper bound, or drop the metric.
- Plain connectors ("with," "for," "via," ",", ";"). Avoid "then" -- it usually signals two ideas spliced together that should be split.
- Hyphenated technical compounds (real-time, on-device, low-level, GPU-accelerated, CRC-validated, per-camera) are correct English and stay.

**Symptoms of "description style" instead of "resume style":**
- A period in the middle of a bullet.
- "X. Y." or "X. Then Y." patterns.
- Two-sentence bullets where the second sentence "explains" the first.
- Reads like a README paragraph chopped into bullets.

If you see those, rewrite as a single sentence.

### Skills section: tailor to the JD, use proper product names

The skills block on a tailored resume is **not** the master inventory of every language and tool the candidate has ever touched. It is a short, JD-relevant signal list. For every PDF generation:

1. **Trim ruthlessly.** Drop languages and tools whose only justification is "I've used it once" -- if it doesn't map to the target role's domain, it dilutes the signal. The candidate's master `cv.md` may carry the long list; the tailored PDF cuts it.
2. **Promote JD-relevant categories.** Default category headers ("Languages," "Frameworks & Tools," "Systems & Platforms") work for a general resume. For a tailored resume, rename or split so the JD's domain gets its own line at the top. If the JD is about ML, the ML stack gets a line. If it's about backend infra, the backend stack does. Don't bury the relevant cluster among generic dev tools.
3. **Use product names, not code identifiers.** Underscored module paths leak the developer-facing form. Use the proper product/marketing capitalization in the skills line. Common examples:
   - `numpy` → NumPy
   - `pytorch` → PyTorch
   - `huggingface_hub` → Hugging Face
   - `tensorflow` → TensorFlow
   - `scikit_learn` / `sklearn` → scikit-learn
   - Underscored vendor SDK names (e.g., `<vendor>_sdk2py`) → the vendor's documented product name, or omit if the SDK isn't directly relevant.
4. **Avoid dangling adjectives.** `real-time` alone is a modifier with no noun. Write `real-time execution`, `real-time control`, or `real-time inference`. Same for `low-latency`, `high-performance`, `fault-tolerant` -- always pair with the noun being modified.
5. **Group by purpose, not alphabet.** A line should read as a coherent cluster. Don't mix container tooling, web frameworks, and ML libraries on one line -- split them.
6. **No duplicates across categories.** A skill belongs on exactly one line. If TypeScript is under Languages, don't repeat it under Frontend. If Docker is under Tools, don't repeat it under Backend. Duplicates make the resume look generated.
7. **Drop vendor prefixes when the product name is universally recognized.** Write "Gemini" not "Google Gemini," "Whisper" not "OpenAI Whisper," "PyTorch" not "Meta PyTorch." Keep the prefix only when the product name alone is ambiguous (e.g., "NVIDIA Isaac Lab" because "Isaac Lab" alone could be confused with other Isaac products).
8. **Combine related items into one entry.** `PostgreSQL, PostGIS` should read `PostgreSQL/PostGIS` (PostGIS is a Postgres extension). `React, Next.js` can stay separate because Next.js is its own framework, but `JavaScript, ECMAScript` should not. Use slash for tight pairs, comma for distinct items.
9. **No version numbers.** "Spring Boot 3" -> "Spring Boot," "Python 3.10" -> "Python," "Java 21" -> "Java." Versions belong in project bullets when they matter, never in the skills line.
10. **No methodology phrases.** "async Playwright scraping" -> "Playwright." "GPU-accelerated computation" -> doesn't go in skills. The methodology belongs in project bullets; the skills line lists tools only.
11. **No vague catch-alls.** "NLP analytics," "ML pipelines," "data science" are not skills -- they're job categories. Replace with concrete libraries/tools (NumPy, pandas, scikit-learn, spaCy, Hugging Face) or drop entirely.

### Honors / Awards section: usually skip

A standalone "Honors" or "Awards" section is a student-resume convention that ages poorly once the candidate has shippable projects. Default to **embedding award credits in the project header** ("Project X — GitHub | Devpost | 1st Place, Hackathon Y") rather than maintaining a separate section.

Add a separate Honors section only when:
- The award is meaningful but the underlying project doesn't earn its own slot on this tailored resume (rare -- usually means the award itself isn't relevant to the role either)
- The credit is not project-tied (Dean's List, scholarships, fellowships, publications, Forbes 30 Under 30, YC alum, etc.)
- A ranking signals national/international stature (top 0.1%, gold medal, etc.)

Do NOT include:
- "Participant" credits (attendance, not a win)
- Hackathon/competition credits whose project isn't visible elsewhere on the same resume (the reader wants context they can't see)
- Coursework awards without national/international stature

If a tailored resume drops the project that anchored an award, drop the award too -- don't surface it in an Honors line. The candidate's master `cv.md` keeps the credit; the tailored PDF cuts it.

**Standard resume conventions that DO stay** (not AI tells):
- Date ranges with en-dash: `Jan 20XX – Dec 20XX`
- Project header en-dash separator: `<Project Name> – GitHub`, `<Project Name> – GitHub | <Award or external link>`
- Slash-separated focus tagline under a project header: `<Domain A> / <Domain B>`
- Pipe separator in contact line

**Pre-flight check before running `generate-pdf.mjs`:**

Scan the personalized HTML for any of:
- `&mdash;` or `—` inside `<li>` body text (allowed only in `.project-title` / date-range lines)
- `&rarr;`, `→`, `->`, `=>` inside `<li>` text
- `~N → ~M` (tilde-arrow-tilde) inside a bullet
- Multi-clause em-dash sandwiches (`X — Y — Z`) anywhere
- Closing phrases starting with "demonstrating," "showcasing," "establishing," "leveraging," "highlighting"

If any are present, fix the HTML first, then rerun the generator.

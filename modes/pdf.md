# Mode: pdf - ATS-Optimized PDF Generation

## Full Pipeline

1. Read `cv.md` and `modes/_profile.md` as source of truth. The tailoring rules in `_profile.md` (mandatory summary, project-to-role mapping, bullet-level mapping, intern cap) override the defaults in this file wherever they conflict.
1a. **If this PDF is being generated as part of auto-pipeline**, re-read the evaluation report that was just saved (Block E — Personalization Plan) and implement EVERY item in the plan before writing a single line of HTML. Block E is the contract. Never skip it.
2. Ask the user for the JD if not already provided (text or URL)
3. Extract 15-20 keywords from the JD
4. Detect JD language -> CV language (EN default)
5. Detect company location -> paper format:
   - US/Canada -> `letter`
   - Rest of world -> `a4`
6. Detect role archetype -> adapt framing per `_profile.md` "Your Adaptive Framing" table
7. Select top 3-4 most relevant projects for the JD
8. Reorder experience bullets by JD relevance
9. Inject JD keywords naturally into skills, experience, and projects (NEVER invent)
10. Generate complete HTML from template + tailored content
11. **Apply the anti-AI-tells rules from `modes/_shared.md` ("Professional Writing & ATS Compatibility") to every bullet.** Mandatory before writing the HTML to disk: scrub em-dashes from body text, rewrite arrow-flow notation as plain English, drop buzzword closers, drop version numbers from skills, no duplicates across skill categories, etc. Run the pre-flight check listed at the bottom of that section.

11a. **Trust but don't rely on the deterministic checker.** `generate-pdf.mjs` runs a content-quality scan that fails the build (exit 3) when it finds em-dashes / arrows / weak openers / version numbers in skills / duplicates / vague catch-alls / dangling adjectives. Pass-through means *the easy stuff is clean* -- it does NOT mean the resume is good. You still must do step 14b below.
12. Write HTML to `/tmp/cv-candidate-{company}.html`
13. Run: `node generate-pdf.mjs /tmp/cv-candidate-{company}.html output/cv-candidate-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}`
14. **Verify & self-correct** (see "Post-generation Verification" below) — MANDATORY before reporting success.
14a. **Read `RESULT:` JSON from generate-pdf.mjs.** If `ok` is false, fix and rerun. If `content_warnings` is non-empty, fix them in the HTML and rerun -- they are not blocking but indicate sloppy output.
14b. **Mandatory qualitative re-read pass (you, not the script).** After the deterministic checker passes, re-read the personalized HTML one more time with the following checklist. Treat this as a separate code review you would run on someone else's resume. The script catches patterns; you catch *judgment*:
   - Does each bullet read like one human-written sentence, or does any bullet feel like a paragraph chopped into pieces?
   - Does the flow across project bullets tell a story (what / how / result), or do they read as parallel descriptions of the same scope?
   - Are any claims overclaimed (capabilities that aren't actually possible on the named hardware/stack)?
   - Are skills tailored to the JD or are there leftovers from a more generic version?
   - Does any number feel hedged ("30 to 60 minutes," "scaled from X to Y") that should commit to a single value or drop?
   - Are project headers still aligned with the bullets below them (the meta tagline matches the focus of the work)?
   - Is the resume tone consistent with the candidate's actual voice, or has it drifted into generated-feeling phrasing?
   - **Backtick check:** Does any bullet contain backtick-wrapped names (e.g., `` `pick_plant_out` ``, `` `arm-act` ``)? Strip all backticks — render them as plain text. Backticks are Markdown syntax; they appear as literal characters in HTML and break ATS parsing.
   - **Verb tense consistency:** Current role bullets → present tense. Past roles and completed projects → past tense. Mixed tense in a single block is an ATS parse risk.
   - **If any answer is "no," fix the HTML and rerun. Do not ship until both the script AND your own re-read are clean.**
15. Report: PDF path, page count, scale, content_warnings count, keyword coverage (X/Y), and whether any auto-corrections were applied.

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Use current template standard headers: "Education", "Technical Skills", "Experience", "Project Experience"
- Preserve full original content by default (do not trim `cv.md` bullets unless absolutely necessary)
- No text embedded in images/SVGs
- No critical info in PDF headers/footers (ATS often ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- Distribute JD keywords across Skills, first Experience bullet, and Project bullets
- **Title mirroring:** The summary's first sentence should echo the JD's role title or its closest equivalent. If JD says "Robotics Engineering Intern," the summary should open with that framing — ATS parsers use title proximity to weight keyword relevance.
- **Default**: keep CV to 1 page using PDF auto-fit scale if content overflows
- Use `--allow-multipage` in `generate-pdf.mjs` for exceptional multi-page output

## PDF Design

- **Template baseline (fixed)**: follow `templates/cv-template.html` CSS exactly
- **Fonts**: Arial/Helvetica sans-serif
- **Body**: 11pt, `line-height: 1.25`
- **Page padding**: `0.55in 0.62in 0.55in 0.62in`
- **Section spacing**: `.section { margin-top: 16px }`
- **List spacing**: bullets with `padding-left: 30px` and `margin-bottom: 2px`
- **Links**: blue + underlined; `word-break: break-word` in header

## Section Order (optimized for fast recruiter scan)

1. Header (name + contact + links)
2. Education
3. Technical Skills
4. Experience
5. Project Experience (top 3-4 most relevant)

## Keyword Injection Strategy (ethical, truth-based)

**Priority rule: exact JD phrase > semantic equivalent > synonym.** ATS systems weight exact phrase matches higher than semantic matches. When both are truthful, always use the JD's exact wording.
- JD says "imitation learning" → write "imitation learning," not "IL" or "behavior cloning"
- JD says "real-time inference" → write "real-time inference," not "low-latency execution"
- JD says "foundation models" → write "foundation models," not "large pretrained models"

**Placement weighting (ATS scores by section position):**
1. Summary (highest weight) — front-load 3-5 of the most JD-critical keywords in the first sentence
2. Skills section — include every JD tool/language the candidate genuinely knows
3. Experience bullets — inject into the first bullet of the most relevant role
4. Project bullets — use exact JD phrasing where it fits truthfully

Valid rewrite examples:
- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" → rewrite as "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" → rewrite as "MLOps and observability: evals, error handling, cost monitoring"
- JD says "data collection pipeline" and CV says "data acquisition system" → rewrite as "data collection pipeline"

**NEVER add skills the candidate does not have. Only rewrite real experience using JD language.**

**Post-injection coverage check (mandatory before writing HTML):** After drafting all content, list the 15-20 extracted JD keywords and confirm each appears at least once in the document. For any missing keyword the candidate genuinely has: inject into Skills. For any missing keyword the candidate does not have: leave out. Report coverage as "X/Y JD keywords covered" in the final output.

## HTML Template

Use `cv-template.html` and replace placeholders `{{...}}` with tailored content:

| Placeholder | Content |
|-------------|---------|
| `{{LANG}}` | `en` or `es` |
| `{{PAGE_WIDTH}}` | `8.5in` (letter) or `210mm` (A4) |
| `{{PAGE_HEIGHT}}` | `11in` (letter) or `297mm` (A4) |
| `{{NAME}}` | from profile.yml |
| `{{PHONE}}` | from profile.yml |
| `{{EMAIL}}` | from profile.yml |
| `{{GITHUB_URL}}` | from profile.yml |
| `{{GITHUB_DISPLAY}}` | from profile.yml |
| `{{LINKEDIN_URL}}` | from profile.yml |
| `{{LINKEDIN_DISPLAY}}` | from profile.yml |
| `{{LOCATION}}` | from profile.yml |
| `{{SUMMARY_SECTION}}` | Tailored professional summary HTML block when the fit isn't obvious from the projects alone; empty string when projects speak for themselves. See `_profile.md` "Tailored summary" for the decision rule and HTML format. |
| `{{DEGREE}}` | degree line from cv.md |
| `{{GRAD_DATE}}` | graduation date |
| `{{UNIVERSITY}}` | school name |
| `{{UNIVERSITY_LOCATION}}` | school location |
| `{{GPA_LINE}}` | optional ` | GPA: X.XX` or empty |
| `{{COURSEWORK}}` | comma-separated coursework |
| `{{SKILLS_LANGUAGES}}` | languages list |
| `{{SKILLS_FRAMEWORKS}}` | frameworks/tools list |
| `{{SKILLS_SYSTEMS}}` | systems/platforms list |
| `{{EXPERIENCE_BLOCK}}` | pre-rendered HTML for ALL experience entries (see "Experience Block" below). One job-block per role, in reverse-chronological order. |
| `{{PROJECTS_BLOCK}}` | pre-rendered HTML for the top N projects (see "Projects Block" below). Pick the most JD-relevant; no fixed cap. |

### Experience Block

Render `{{EXPERIENCE_BLOCK}}` as a concatenation of one snippet per role, in reverse-chronological order. Each snippet MUST follow this exact format (preserves the existing styling):

```html
<div class="job-block avoid-break">
  <div class="row-between">
    <div class="left-col">
      <div class="job-title">{JOB_TITLE}, {COMPANY}, {JOB_LOCATION}</div>
    </div>
    <div class="right-col">{JOB_DATES}</div>
  </div>
  <ul class="bullet-list">
    <li>{bullet 1}</li>
    <li>{bullet 2}</li>
    <!-- ... -->
  </ul>
</div>
```

Rules:
- Read every entry from `cv.md`'s Experience section -- never drop a role.
- Keep the same ordering as `cv.md` (reverse-chronological).
- Reorder bullets within a role by JD relevance, but do NOT delete bullets unless the CV has clear JD-irrelevant filler.
- If a role has no location or dates in `cv.md`, omit just that part (don't leave `, {{JOB_LOCATION}}` or `{JOB_DATES}` in the output).

### Projects Block

Render `{{PROJECTS_BLOCK}}` as a concatenation of one snippet per project, ordered by JD relevance. Each snippet MUST follow this format:

```html
<div class="project avoid-break">
  <div class="project-title inline-links">
    {PROJECT_NAME}
    {PROJECT_LINKS}
  </div>
  <div class="project-meta">{PROJECT_META}</div>
  <ul class="bullet-list">
    <li>{bullet 1}</li>
    <li>{bullet 2}</li>
    <!-- ... -->
  </ul>
</div>
```

Rules:
- Default: include the top 3-5 projects by JD relevance. Use `--allow-multipage` if you need more.
- `{PROJECT_LINKS}` is inline HTML like `<a href="...">GitHub</a> | <a href="...">Devpost</a>` -- empty string if there are no links.
- `{PROJECT_META}` is the "Focus: ..." tagline from `cv.md`. Empty string if missing.
- If a project has fewer bullets in `cv.md` than the others, that's fine -- don't pad.

## Canva CV Generation (optional)

If `config/profile.yml` has `canva_resume_design_id`, offer a choice before generating:
- **"HTML/PDF (fast, ATS-optimized)"** - flow above
- **"Canva CV (visual, design-preserving)"** - flow below

If there is no `canva_resume_design_id`, skip this prompt and use HTML/PDF.

### Canva Workflow

#### Step 1 - Duplicate base design

a. `export-design` from `canva_resume_design_id` as PDF -> get download URL
b. `import-design-from-url` with that URL -> creates editable duplicate
c. Save the new duplicate `design_id`

#### Step 2 - Read design structure

a. `get-design-content` on the duplicate -> all text elements (richtexts)
b. Map text elements to CV sections by content matching:
   - Candidate name -> header
   - "Summary" / "Professional Summary" -> summary
   - Company names from cv.md -> experience
   - Degree/school names -> education
   - Skill keywords -> skills
c. If mapping fails, show findings and ask user for guidance

#### Step 3 - Generate tailored content

Use the same content-generation logic as HTML flow:
- Rewrite Professional Summary with JD keywords + exit narrative
- Reorder experience bullets by JD relevance
- Select top competencies from JD requirements
- Inject keywords naturally (NEVER invent)

**Character-budget rule:** each replacement should stay within +/-15% of original character count to avoid overlap in fixed-size Canva text boxes.

#### Step 4 - Apply edits

a. `start-editing-transaction` on duplicate design
b. `perform-editing-operations` with `find_and_replace_text` per section
c. Reflow layout after replacement:
   1. Read updated positions/dimensions from operation response
   2. For each work-experience section: compute `end_y = top + height`
   3. Set next section start at `end_y + consistent_gap` (template gap, ~30px)
   4. Use `position_element` for date/company/title/bullets
   5. Repeat for all experience sections
d. Verify before commit:
   - `get-design-thumbnail` with transaction_id and page_index=1
   - Check for overlap, uneven spacing, cut-off text, unreadable text
   - If issues remain: adjust with `position_element`, `resize_element`, `format_text`
   - Repeat until clean
e. Show user preview and ask for approval
f. `commit-editing-transaction` ONLY after user approval

#### Step 5 - Export and download PDF

a. `export-design` as PDF (a4 or letter based on JD location)
b. Download immediately via Bash:
   ```bash
   curl -sL -o "output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf" "{download_url}"
   ```
   (URL expires in ~2 hours)
c. Verify download:
   ```bash
   file output/cv-{candidate}-{company}-canva-{YYYY-MM-DD}.pdf
   ```
   Must be "PDF document"; if XML/HTML, URL expired -> re-export and retry
d. Report: PDF path, file size, Canva design URL

#### Error Handling

- If `import-design-from-url` fails -> fallback to HTML/PDF and explain
- If text mapping fails -> warn user, show what was found, ask for manual mapping
- If `find_and_replace_text` has no matches -> try broader substring matching
- Always return Canva design URL for manual edits

## Post-generation Verification (MANDATORY)

After every `generate-pdf.mjs` run, verify the output is recruiter/ATS-ready BEFORE reporting success. The script does verification by default (use `--no-verify` only when iterating on the template itself).

### Step 1 — Parse the script output

The last line of stdout is a machine-readable result, e.g.:

```
RESULT: {"ok":true,"pages":1,"scale":0.92,"size_kb":78.4,"preview_png":"output/cv-acme-2026-04-29.preview.png","warnings":[]}
```

Read these fields:
- `ok` — overall pass/fail. `true` = clean, `false` = needs fix (Bash call also exits with code 2), `null` = verification was skipped via `--no-verify` (don't use `--no-verify` in normal mode).
- `pages` — final PDF page count. Must be `1` unless `--allow-multipage` was passed.
- `scale` — auto-fit scale used (1.0 = no shrink, 0.65 = floor). Below 0.80 means text is uncomfortably small.
- `preview_png` — path to a fullPage screenshot of the rendered HTML. Always Read this image.
- `warnings` — human-readable issues (`pages>1`, `scale<0.80`, `size<5kb`).

### Step 2 — Visual review (always)

Use the Read tool on `preview_png`. Check for:
- Cut-off text at the page bottom (content extends past one page worth of vertical space)
- Header oversized or wrapping to two lines (long contact info)
- Sections overlapping each other or running into the bottom margin
- Bullets wrapping awkwardly (orphan single words on a line)
- Skills lines overflowing the right edge
- Any blank/white gaps that suggest a rendering failure

### Step 3 — Self-correct (cap at 3 iterations)

If `ok=false`, `scale<0.80`, or the PNG shows a visual issue, trim content in this **priority order** and regenerate:

1. **Drop the lowest-JD-relevance project** from `{{PROJECTS_BLOCK}}`. Keep the top 3 minimum.
2. **Compress the longest experience or project bullet** to a single sentence (preserve the JD keywords; cut adjective phrases and parenthetical clarifications).
3. **Drop the Coursework line** under Education.
4. **Compress Skills lines** by removing the least-JD-relevant items from each category (keep at least 5 per line).

After each fix, re-run `generate-pdf.mjs` and re-verify. Stop as soon as `ok=true` AND `scale≥0.80` AND the PNG looks clean.

**Iteration cap:** if 3 fix attempts haven't produced a clean output, STOP. Surface the latest `preview_png` to the user with a 1–2 sentence summary of what's still wrong, and ask which content they want to drop. NEVER silently ship a multi-page or visually broken PDF.

### Step 4 — Cleanup

Once `ok=true` and the visual check passes, the `.preview.png` can stay next to the PDF (it's small, and it documents what was generated). Don't delete it unless the user asks.

## Post-generation Tracker Update

Update tracker if offer already exists: set PDF status from ❌ to ✅.

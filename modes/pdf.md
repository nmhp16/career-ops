# Mode: pdf - ATS-Optimized PDF Generation

## Full Pipeline

1. Read `cv.md` as source of truth
2. Ask the user for the JD if not already provided (text or URL)
3. Extract 15-20 keywords from the JD
4. Detect JD language -> CV language (EN default)
5. Detect company location -> paper format:
   - US/Canada -> `letter`
   - Rest of world -> `a4`
6. Detect role archetype -> adapt framing
7. Select top 3-4 most relevant projects for the JD
8. Reorder experience bullets by JD relevance
9. Inject JD keywords naturally into skills, experience, and projects (NEVER invent)
10. Generate complete HTML from template + tailored content
11. Write HTML to `/tmp/cv-candidate-{company}.html`
12. Run: `node generate-pdf.mjs /tmp/cv-candidate-{company}.html output/cv-candidate-{company}-{YYYY-MM-DD}.pdf --format={letter|a4}`
13. Report: PDF path, page count, keyword coverage

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Use current template standard headers: "Education", "Technical Skills", "Experience", "Project Experience"
- Preserve full original content by default (do not trim `cv.md` bullets unless absolutely necessary)
- No text embedded in images/SVGs
- No critical info in PDF headers/footers (ATS often ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- Distribute JD keywords across Skills, first Experience bullet, and Project bullets
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

Valid rewrite examples:
- JD says "RAG pipelines" and CV says "LLM workflows with retrieval" -> rewrite as "RAG pipeline design and LLM orchestration workflows"
- JD says "MLOps" and CV says "observability, evals, error handling" -> rewrite as "MLOps and observability: evals, error handling, cost monitoring"
- JD says "stakeholder management" and CV says "collaborated with team" -> rewrite as "stakeholder management across engineering, operations, and business"

**NEVER add skills the candidate does not have. Only rewrite real experience using JD language.**

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

## Post-generation

Update tracker if offer already exists: set PDF status from ❌ to ✅.

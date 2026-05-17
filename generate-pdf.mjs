#!/usr/bin/env node

/**
 * generate-pdf.mjs — HTML → PDF via Playwright
 *
 * Usage:
 *   node career-ops/generate-pdf.mjs <input.html> <output.pdf>
 *       [--format=letter|a4] [--allow-multipage] [--no-verify] [--no-content-verify]
 *
 * Requires: @playwright/test (or playwright) installed.
 * Uses Chromium headless to render the HTML and produce a clean, ATS-parseable PDF.
 *
 * Render verification (default on, opt out with --no-verify):
 *   - Saves a fullPage screenshot of the rendered HTML next to the PDF as <name>.preview.png.
 *   - Emits a final `RESULT: <json>` line with
 *     { ok, pages, scale, size_kb, preview_png, warnings[], content_warnings[] }.
 *   - Exits 2 when ok=false (pages>1 with single-page enforced, or PDF under 5 KB / corrupted).
 *
 * Content verification (default on, opt out with --no-content-verify):
 *   - Scans the HTML before rendering for the patterns banned in
 *     modes/_shared.md "Professional Writing & ATS Compatibility":
 *     em-dashes / arrows / multi-sentence bullets / weak openers / version
 *     numbers in skills / vague catch-alls / dangling adjectives /
 *     duplicates across categories / standalone Honors section / etc.
 *   - Errors fail the build (exit 3); warnings print and continue.
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Normalize text for ATS compatibility by converting problematic Unicode.
 *
 * ATS parsers and legacy systems often fail on em-dashes, smart quotes,
 * zero-width characters, and non-breaking spaces. These cause mojibake,
 * parsing errors, or display issues. See issue #1.
 *
 * Only touches body text — preserves CSS, JS, tag attributes, and URLs.
 * Returns { html, replacements } so the caller can log what was changed.
 */
function normalizeTextForATS(html) {
  const replacements = {};
  const bump = (key, n) => { replacements[key] = (replacements[key] || 0) + n; };

  const masks = [];
  const masked = html.replace(
    /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const token = `\u0000MASK${masks.length}\u0000`;
      masks.push(match);
      return token;
    }
  );

  let out = '';
  let i = 0;
  while (i < masked.length) {
    const lt = masked.indexOf('<', i);
    if (lt === -1) { out += sanitizeText(masked.slice(i)); break; }
    out += sanitizeText(masked.slice(i, lt));
    const gt = masked.indexOf('>', lt);
    if (gt === -1) { out += masked.slice(lt); break; }
    out += masked.slice(lt, gt + 1);
    i = gt + 1;
  }

  const restored = out.replace(/\u0000MASK(\d+)\u0000/g, (_, n) => masks[Number(n)]);
  return { html: restored, replacements };

  function sanitizeText(text) {
    if (!text) return text;
    let t = text;
    t = t.replace(/\u2014/g, () => { bump('em-dash', 1); return '-'; });
    t = t.replace(/\u2013/g, () => { bump('en-dash', 1); return '-'; });
    t = t.replace(/[\u201C\u201D\u201E\u201F]/g, () => { bump('smart-double-quote', 1); return '"'; });
    t = t.replace(/[\u2018\u2019\u201A\u201B]/g, () => { bump('smart-single-quote', 1); return "'"; });
    t = t.replace(/\u2026/g, () => { bump('ellipsis', 1); return '...'; });
    t = t.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, () => { bump('zero-width', 1); return ''; });
    t = t.replace(/\u00A0/g, () => { bump('nbsp', 1); return ' '; });
    return t;
  }
}

/**
 * Verify resume content quality — runs against the *original* HTML
 * (before ATS normalization, so source-text patterns like em-dashes
 * are still detectable).
 *
 * Returns { errors, warnings } where:
 *   - errors:   patterns we've explicitly banned (cause build to fail)
 *   - warnings: patterns that are usually wrong but may be intentional
 *
 * The checker scans:
 *   - Body bullets:  <li>...</li> inside <ul class="bullet-list">
 *   - Skills lines:  <li>...</li> inside <ul class="skills-list">
 *   - Sections:      presence of standalone Honors / Awards section
 *
 * See modes/_shared.md "Professional Writing & ATS Compatibility" for
 * the full ruleset; this function encodes the deterministic subset.
 */
function verifyContentQuality(html) {
  const errors = [];
  const warnings = [];

  const bullets = extractListItems(html, 'bullet-list');
  const skills = extractListItems(html, 'skills-list');

  // ---- Body bullets: anti-AI-tells (errors) ------------------------------
  for (const { text, raw } of bullets) {
    const ctx = truncate(text, 80);

    // em-dash / double-dash inside body text
    if (/[—]/.test(text)) {
      errors.push(`em-dash in body bullet ("${ctx}") — use period, comma, or semicolon`);
    }
    if (/(^|\s)--(\s|$)/.test(text)) {
      errors.push(`double-dash in body bullet ("${ctx}") — use period, comma, or semicolon`);
    }

    // arrows used for data flow
    if (/(→|\s->\s|\s=>\s)/.test(raw) || /→/.test(text)) {
      errors.push(`arrow (→ / -> / =>) in body bullet ("${ctx}") — use plain English connector`);
    }

    // tilde-arrow pattern: ~N → ~M
    if (/~\s*\d+[^.]*?(→|->|=>|to roughly)\s*~?\s*\d+/.test(text)) {
      errors.push(`tilde-arrow pattern in body bullet ("${ctx}") — commit to discrete numbers`);
    }

    // multi-sentence bullet: lowercase-letter + period + space + capital
    // (avoids false positives on "U.S. Army" / "Inc. ")
    if (/[a-z]\.\s+[A-Z]/.test(text)) {
      errors.push(`multi-sentence bullet ("${ctx}") — split or compress to one sentence`);
    }

    // weak openers
    if (/^(Worked on|Helped with|Responsible for|Was responsible|Assisted with)\b/i.test(text.trim())) {
      errors.push(`weak opener ("${ctx}") — start with a concrete action verb`);
    }

    // buzzword closers (warning, not error — could be valid in rare contexts)
    if (/\b(demonstrating|showcasing|leveraging cutting-edge|establishing a foundation|highlighting the ability)\b/i.test(text)) {
      warnings.push(`buzzword closer in body bullet ("${ctx}") — end on concrete action`);
    }

    // hedging words
    if (/\b(roughly|approximately|completing in)\b/i.test(text)) {
      warnings.push(`hedging language in body bullet ("${ctx}") — commit to a discrete value or drop the metric`);
    }
  }

  // ---- Skills lines (errors) ---------------------------------------------
  const seenSkills = new Map();
  for (let i = 0; i < skills.length; i++) {
    const { text } = skills[i];
    const ctx = truncate(text, 80);

    // strip the leading "Category:" so we only check the skill list itself
    const listPart = text.replace(/^[^:]*:\s*/, '');

    // version numbers attached to known frameworks/languages
    const versionMatch = listPart.match(
      /\b(Spring Boot|Python|Java|JavaScript|TypeScript|React|Next\.js|Node\.js|FastAPI|Django|Flask|Rails|Vue|Angular|Express)\s+\d/i,
    );
    if (versionMatch) {
      errors.push(`version number in skills ("${versionMatch[0]}") — drop the version`);
    }

    // over-prefixed vendor names
    const overPrefixed = [
      ['Google Gemini', 'Gemini'],
      ['OpenAI Whisper', 'Whisper'],
      ['Meta PyTorch', 'PyTorch'],
      ['Microsoft ONNX Runtime', 'ONNX Runtime'],
      ['Facebook React', 'React'],
      ['Vercel Next.js', 'Next.js'],
    ];
    for (const [bad, good] of overPrefixed) {
      if (listPart.includes(bad)) {
        warnings.push(`over-prefixed vendor in skills ("${bad}") — use "${good}" alone`);
      }
    }

    // methodology-as-skill
    if (/\basync\s+\w+\s+scraping\b/i.test(listPart)) {
      warnings.push(`methodology phrase in skills ("${ctx}") — list the tool only`);
    }

    // vague catch-alls
    const vague = /\b(NLP analytics|ML pipelines|data science|machine learning approaches|AI\/ML|software engineering)\b/i.exec(listPart);
    if (vague) {
      errors.push(`vague catch-all in skills ("${vague[0]}") — replace with concrete library/tool names`);
    }

    // dangling "real-time" (and other "X-time" / "low-latency" without a noun)
    if (/\b(real-time|low-latency|high-performance|fault-tolerant)(\s*,|\s*$)/i.test(listPart)) {
      errors.push(`dangling adjective in skills ("${ctx}") — pair "real-time" / "low-latency" / etc. with a noun`);
    }

    // PostgreSQL + PostGIS as separate items
    if (/\bPostgreSQL\b\s*,\s*PostGIS\b/.test(listPart) || /\bPostGIS\b\s*,\s*PostgreSQL\b/.test(listPart)) {
      warnings.push(`split entry in skills: "PostgreSQL, PostGIS" — combine as "PostgreSQL/PostGIS" (PostGIS is a Postgres extension)`);
    }

    // collect skill tokens for cross-line duplicate check
    const tokens = listPart
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s && !/[()]/.test(s) && s.length < 40);
    for (const tok of tokens) {
      const key = tok.toLowerCase();
      if (!seenSkills.has(key)) seenSkills.set(key, []);
      seenSkills.get(key).push(i);
    }
  }

  for (const [key, lines] of seenSkills) {
    if (lines.length > 1 && new Set(lines).size > 1) {
      errors.push(`duplicate skill across categories ("${key}") — appears on lines ${[...new Set(lines)].join(', ')}; pick one home`);
    }
  }

  // ---- Standalone Honors / Awards section (warning) ----------------------
  if (/<div class="section-title">\s*(Honors|Awards)\s*<\/div>/i.test(html)) {
    warnings.push('standalone "Honors" or "Awards" section — default to embedding awards in project headers; only use for non-project credits (Dean\'s List, fellowships, etc.)');
  }

  return { errors, warnings };
}

function extractListItems(html, listClass) {
  const out = [];
  const ulRegex = new RegExp(`<ul class="${listClass}"[^>]*>([\\s\\S]*?)<\\/ul>`, 'g');
  for (const ul of html.matchAll(ulRegex)) {
    for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)) {
      const raw = li[1];
      const text = raw
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&rarr;/g, '→')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      out.push({ text, raw });
    }
  }
  return out;
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function extractPageCount(pdfBuffer) {
  const pdfString = pdfBuffer.toString('latin1');

  // Prefer /Pages tree count (more reliable than counting /Page markers)
  const treeMatch = pdfString.match(/\/Type\s*\/Pages[\s\S]{0,300}?\/Count\s+(\d+)/);
  if (treeMatch) {
    const n = Number(treeMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Fallback approximation
  const fallback = (pdfString.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return fallback || 1;
}

async function generatePDF() {
  const args = process.argv.slice(2);

  // Parse arguments
  let inputPath, outputPath, format = 'a4';
  let forceSinglePage = true;
  let verify = true;
  let contentVerify = true;

  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1].toLowerCase();
    } else if (arg === '--allow-multipage') {
      forceSinglePage = false;
    } else if (arg === '--no-verify') {
      verify = false;
    } else if (arg === '--no-content-verify') {
      contentVerify = false;
    } else if (!inputPath) {
      inputPath = arg;
    } else if (!outputPath) {
      outputPath = arg;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4] [--allow-multipage] [--no-verify] [--no-content-verify]');
    process.exit(1);
  }

  inputPath = resolve(inputPath);
  outputPath = resolve(outputPath);

  // Validate format
  const validFormats = ['a4', 'letter'];
  if (!validFormats.includes(format)) {
    console.error(`Invalid format "${format}". Use: ${validFormats.join(', ')}`);
    process.exit(1);
  }

  const pageDimensions = format === 'letter'
    ? { widthIn: 8.5, heightIn: 11 }
    : { widthIn: 210 / 25.4, heightIn: 297 / 25.4 };

  console.log(`📄 Input:  ${inputPath}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📏 Format: ${format.toUpperCase()}`);

  // Read HTML to inject font paths as absolute file:// URLs
  let html = await readFile(inputPath, 'utf-8');

  // Resolve font paths relative to career-ops/fonts/
  const fontsDir = resolve(__dirname, 'fonts');
  html = html.replace(
    /url\(['"]?\.\/fonts\//g,
    `url('file://${fontsDir}/`
  );
  // Close any unclosed quotes from the replacement
  html = html.replace(
    /file:\/\/([^'")]+)\.woff2['"]\)/g,
    `file://$1.woff2')`
  );

  // Content quality verification — runs on the original HTML so source
  // patterns (em-dashes, arrows, version numbers in skills, etc.) are
  // still detectable before ATS normalization rewrites them.
  let contentErrors = [];
  let contentWarnings = [];
  if (contentVerify) {
    const result = verifyContentQuality(html);
    contentErrors = result.errors;
    contentWarnings = result.warnings;
    if (contentErrors.length > 0) {
      console.error(`❌ Content quality check failed (${contentErrors.length} error(s)):`);
      for (const e of contentErrors) console.error(`   - ${e}`);
      console.error('');
      console.error('Fix the HTML and rerun. To skip this check, pass --no-content-verify.');
      console.error('Rules: see modes/_shared.md "Professional Writing & ATS Compatibility".');
      process.exit(3);
    }
    if (contentWarnings.length > 0) {
      console.log(`⚠️  Content quality warnings (${contentWarnings.length}):`);
      for (const w of contentWarnings) console.log(`   - ${w}`);
    }
  }

  // Normalize text for ATS compatibility (issue #1)
  const normalized = normalizeTextForATS(html);
  html = normalized.html;
  const totalReplacements = Object.values(normalized.replacements).reduce((a, b) => a + b, 0);
  if (totalReplacements > 0) {
    const breakdown = Object.entries(normalized.replacements).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`🧹 ATS normalization: ${totalReplacements} replacements (${breakdown})`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set content with file base URL for any relative resources
  await page.setContent(html, {
    waitUntil: 'networkidle',
    baseURL: `file://${dirname(inputPath)}/`,
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Fit diagnostics: detect if HTML content exceeds one page
  const fit = await page.evaluate((pdfFormat) => {
    const root = document.querySelector('.page') || document.body;
    const cssPxPerIn = 96;
    const pageHeightIn = pdfFormat.heightIn;
    const targetHeightPx = pageHeightIn * cssPxPerIn;
    const contentHeightPx = Math.max(root.scrollHeight, root.clientHeight);
    return {
      targetHeightPx,
      contentHeightPx,
      overflow: contentHeightPx > targetHeightPx,
      ratio: contentHeightPx / targetHeightPx,
    };
  }, pageDimensions);

  if (fit.overflow) {
    console.log(
      `ℹ️ Multi-page layout: content ${Math.round(fit.contentHeightPx)}px > ${Math.round(fit.targetHeightPx)}px (${fit.ratio.toFixed(2)}x)`
    );
  } else {
    console.log(
      `ℹ️ One-page fit: content ${Math.round(fit.contentHeightPx)}px <= ${Math.round(fit.targetHeightPx)}px`
    );
  }

  let pdfBuffer;
  let pageCount = 1;
  let pdfScale = 1;

  const basePdfOptions = {
    format: format,
    printBackground: true,
    margin: {
      top: '0in',
      right: '0in',
      bottom: '0in',
      left: '0in',
    },
    preferCSSPageSize: false,
  };

  if (forceSinglePage) {
    if (fit.overflow) {
      // Apply a small safety factor to avoid rounding edge cases.
      pdfScale = Math.max(0.65, Math.min(1, (fit.targetHeightPx / fit.contentHeightPx) * 0.995));
    }

    let attempts = 0;
    const maxAttempts = 12;

    while (attempts < maxAttempts) {
      attempts += 1;

      const horizontalMarginIn = pdfScale < 1
        ? `${((pageDimensions.widthIn * (1 - pdfScale)) / 2).toFixed(3)}in`
        : '0in';

      pdfBuffer = await page.pdf({
        ...basePdfOptions,
        scale: pdfScale,
        margin: {
          top: '0in',
          right: horizontalMarginIn,
          bottom: '0in',
          left: horizontalMarginIn,
        },
      });

      pageCount = extractPageCount(pdfBuffer);
      if (pageCount <= 1 || pdfScale <= 0.65) {
        console.log(`📐 Auto-fit scale: ${(pdfScale * 100).toFixed(1)}% (attempt ${attempts})`);
        break;
      }

      pdfScale = Math.max(0.65, pdfScale - 0.01);
    }
  } else {
    pdfBuffer = await page.pdf({
      ...basePdfOptions,
      scale: 1,
    });
    pageCount = extractPageCount(pdfBuffer);
  }

  // Write PDF
  const { writeFile } = await import('fs/promises');
  await writeFile(outputPath, pdfBuffer);

  // Verification: screenshot rendered HTML for visual review + emit structured result
  const sizeKb = pdfBuffer.length / 1024;
  const finalScale = (typeof pdfScale === 'number' && Number.isFinite(pdfScale)) ? pdfScale : 1;
  let previewPng = null;
  const warnings = [];

  if (verify) {
    const previewPath = outputPath.replace(/\.pdf$/i, '.preview.png');
    try {
      await page.screenshot({ path: previewPath, fullPage: true });
      previewPng = previewPath;
    } catch (err) {
      warnings.push(`preview-png-failed: ${err.message}`);
    }

    if (forceSinglePage && pageCount > 1) {
      warnings.push(`pages>1: produced ${pageCount} pages with single-page enforcement on (auto-fit hit the 0.65 floor)`);
    }
    if (forceSinglePage && finalScale < 0.80) {
      warnings.push(`scale<0.80: content shrunk to ${(finalScale * 100).toFixed(0)}% — text may be too small for recruiters/ATS`);
    }
    if (sizeKb < 5) {
      warnings.push(`size<5kb: PDF is only ${sizeKb.toFixed(1)} KB — likely corrupted or empty`);
    }
  }

  await browser.close();

  // ok=true means verification passed; ok=null means verification was skipped (--no-verify).
  const ok = verify
    ? !warnings.some((w) => w.startsWith('pages>1') || w.startsWith('size<5kb'))
    : null;

  console.log(`✅ PDF generated: ${outputPath}`);
  console.log(`📊 Pages: ${pageCount}`);
  console.log(`📦 Size: ${sizeKb.toFixed(1)} KB`);
  if (verify && previewPng) {
    console.log(`🖼️  Preview: ${previewPng}`);
  }
  if (verify && warnings.length > 0) {
    for (const w of warnings) console.log(`⚠️  ${w}`);
  }

  const result = {
    ok,
    pages: pageCount,
    scale: Number(finalScale.toFixed(3)),
    size_kb: Number(sizeKb.toFixed(1)),
    preview_png: previewPng,
    warnings,
    content_warnings: contentWarnings,
  };
  console.log(`RESULT: ${JSON.stringify(result)}`);

  if (verify && !ok) {
    process.exit(2);
  }

  return { outputPath, pageCount, size: pdfBuffer.length, previewPng, warnings, ok };
}

generatePDF().catch((err) => {
  console.error('❌ PDF generation failed:', err.message);
  process.exit(1);
});

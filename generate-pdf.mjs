#!/usr/bin/env node

/**
 * generate-pdf.mjs — HTML → PDF via Playwright
 *
 * Usage:
 *   node career-ops/generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4]
 *
 * Requires: @playwright/test (or playwright) installed.
 * Uses Chromium headless to render the HTML and produce a clean, ATS-parseable PDF.
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

  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      format = arg.split('=')[1].toLowerCase();
    } else if (arg === '--allow-multipage') {
      forceSinglePage = false;
    } else if (!inputPath) {
      inputPath = arg;
    } else if (!outputPath) {
      outputPath = arg;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: node generate-pdf.mjs <input.html> <output.pdf> [--format=letter|a4]');
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
    let pdfScale = 1;
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

  await browser.close();

  console.log(`✅ PDF generated: ${outputPath}`);
  console.log(`📊 Pages: ${pageCount}`);
  console.log(`📦 Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  return { outputPath, pageCount, size: pdfBuffer.length };
}

generatePDF().catch((err) => {
  console.error('❌ PDF generation failed:', err.message);
  process.exit(1);
});

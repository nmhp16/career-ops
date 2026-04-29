/**
 * Minimal XML/RSS/Atom helpers — no dependency.
 *
 * The portal feeds we consume (Teamtailor RSS, JobScore Atom, Personio XML)
 * are machine-generated and well-formed. We extract item blocks and pull
 * specific tags/attributes from each. Not a general-purpose XML parser.
 */

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

export function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#39;/g, m => ENTITIES[m] ?? m);
}

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * Extract every <tag>…</tag> block from xml as raw inner-XML strings.
 */
export function extractItems(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/**
 * Get the text content of the first <tag>…</tag> in xml.
 */
export function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  if (!m) return '';
  return decodeEntities(stripCdata(m[1]).trim());
}

/**
 * Get the value of `attr` on the first self-closing or open <tag …> in xml.
 * Useful for Atom <link href="..."/>.
 */
export function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']*)["']`);
  const m = xml.match(re);
  return m ? decodeEntities(m[1]) : '';
}

// Lightweight HTML sanitizer for rich-text note content.
// Allows a small set of formatting tags and safe attributes, and strips
// everything else (scripts, event handlers, javascript: urls, etc.).

const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'br', 'p', 'div', 'span',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'a',
]);

// Allowed attributes per tag (anything else is dropped).
const ALLOWED_ATTRS = {
  span: ['style'],
  p: ['style'],
  div: ['style'],
  h1: ['style'],
  h2: ['style'],
  h3: ['style'],
  li: ['style'],
  a: ['href'],
};

// Only allow these CSS properties inside style="".
const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-weight', 'font-style',
  'text-decoration', 'text-align',
]);

function sanitizeStyle(style) {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return null;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return null;
      // Disallow anything that could smuggle in code.
      if (/url\(|expression|javascript:|[<>]/i.test(value)) return null;
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';

  // Remove script/style blocks entirely (including content).
  let out = html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');

  // Walk each tag and rebuild an allowlisted version.
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawName, rawAttrs) => {
    const name = rawName.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!ALLOWED_TAGS.has(name)) return '';
    if (isClosing) return `</${name}>`;

    const allowedForTag = ALLOWED_ATTRS[name] || [];
    let attrsStr = '';

    const attrRegex = /([a-zA-Z-]+)\s*=\s*"([^"]*)"|([a-zA-Z-]+)\s*=\s*'([^']*)'/g;
    let m;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = (m[1] || m[3] || '').toLowerCase();
      let attrValue = m[2] !== undefined ? m[2] : m[4];
      if (!allowedForTag.includes(attrName)) continue;

      if (attrName === 'style') {
        const clean = sanitizeStyle(attrValue);
        if (clean) attrsStr += ` style="${clean}"`;
      } else if (attrName === 'href') {
        // Only allow http(s) and mailto links.
        if (/^(https?:|mailto:)/i.test(attrValue.trim())) {
          attrsStr += ` href="${attrValue.replace(/"/g, '')}"`;
        }
      }
    }

    return `<${name}${attrsStr}>`;
  });

  return out;
}

module.exports = { sanitizeHtml };

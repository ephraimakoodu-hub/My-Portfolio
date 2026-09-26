const sanitizeHtml = require('sanitize-html');

// Everything the CMS stores is rendered by React, which escapes text content
// by default, so this is defense-in-depth rather than the only protection.
// It strips any HTML/script content from fields that should be plain text.
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function sanitizeFields(obj, fields) {
  const out = { ...obj };
  for (const f of fields) {
    if (out[f] !== undefined && out[f] !== null) {
      out[f] = stripHtml(String(out[f]));
    }
  }
  return out;
}

module.exports = { stripHtml, sanitizeFields };

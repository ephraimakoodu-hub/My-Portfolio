const helmet = require('helmet');
const cors = require('cors');

function buildHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // The API itself doesn't serve HTML/JS to browsers other than the
        // uploaded image files, so this stays tight. Adjust only if you add
        // a genuinely needed third party, and document it in /privacy.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // images need to load on the frontend origin
    referrerPolicy: { policy: 'no-referrer' },
  });
}

function buildCors() {
  const allowed = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
  return cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header) and any
      // explicitly whitelisted frontend origin. No wildcard, ever, because
      // this API is credentialed (cookies).
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
}

module.exports = { buildHelmet, buildCors };

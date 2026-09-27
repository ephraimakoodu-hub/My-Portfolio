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
  const allowed = [
    'http://localhost:5173',
    'https://my-portfolio-two-taupe-48.vercel.app',
    ...(process.env.FRONTEND_URL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ];

  return cors({
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked CORS origin:', origin);
      return callback(new Error('Origin not allowed by CORS policy.'));
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
}
module.exports = { buildHelmet, buildCors };

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { buildHelmet, buildCors } = require('./middleware/security');
const { issueCsrfCookie, verifyCsrf } = require('./middleware/csrf');
const { generalApiLimiter } = require('./middleware/rateLimit');


const REQUIRED_ENV = ['JWT_SECRET', 'FRONTEND_URL'];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
  );
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(buildHelmet());
app.use(buildCors());
app.use(cookieParser());

app.use(express.json({ limit: '1mb' }));

app.use(issueCsrfCookie);
app.use(generalApiLimiter);



// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// CSRF
app.use('/api/csrf', require('./routes/csrfToken'));

// Authentication
app.use('/api/auth', require('./routes/auth'));

// Everything below this point requires CSRF
app.use('/api', verifyCsrf);

// Settings
app.use('/api/settings', require('./routes/settings'));

// Taxonomy
app.use('/api/categories', require('./routes/categories'));
app.use('/api/technologies', require('./routes/technologies'));

// Other content
app.use('/api/services', require('./routes/services'));
app.use('/api/experience', require('./routes/experience'));

// Contact
app.use('/api/contact', require('./routes/contact'));

// Projects
app.use('/api/projects', require('./routes/projects'));

// Project images
app.use(
  '/api/projects/:projectId/images',
  require('./routes/projectImages')
);

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Not found.',
  });
});

// Central error handler
app.use((err, req, res, next) => {
  // CORS error
  if (
    err &&
    err.message === 'Origin not allowed by CORS policy.'
  ) {
    return res.status(403).json({
      error: 'Origin not allowed.',
    });
  }

  // JSON body too large
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body too large.',
    });
  }

  // Multer errors
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({
      error: 'Upload error: ' + err.message,
    });
  }

  // File type errors from upload middleware
  if (
    err &&
    (
      err.message ===
        'Only JPEG, PNG or WEBP images are allowed.' ||
      err.message ===
        'File content does not match an allowed image type.'
    )
  ) {
    return res.status(400).json({
      error: err.message,
    });
  }

  // Unexpected errors
  console.error(
    '[unhandled error]',
    err && err.stack ? err.stack : err
  );

  return res.status(500).json({
    error:
      'Something went wrong on our end. Please try again shortly.',
  });
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason) => {
  console.error('[unhandled rejection]', reason);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `Portfolio API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`
  );
});
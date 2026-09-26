const express = require('express');
const { CSRF_COOKIE } = require('../middleware/csrf');

const router = express.Router();

// GET request triggers issueCsrfCookie (mounted globally in server.js) and
// this just confirms it succeeded, so the frontend has something to await.
router.get('/', (req, res) => {
  res.json({ ok: true, cookie: CSRF_COOKIE });
});

module.exports = router;

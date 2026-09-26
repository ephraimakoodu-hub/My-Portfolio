const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

// Issues a readable (non-httpOnly) CSRF cookie the frontend can read and echo
// back as a header on state-changing requests. Combined with SameSite=Lax and
// requireAdmin's httpOnly session cookie, this stops cross-site form/script
// submissions from acting on behalf of a logged-in admin.
function issueCsrfCookie(req, res, next) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      path: '/',
    });
  }
  next();
}

function verifyCsrf(req, res, next) {
  const safe = ['GET', 'HEAD', 'OPTIONS'];
  if (safe.includes(req.method)) return next();

  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE] : null;
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}

module.exports = { issueCsrfCookie, verifyCsrf, CSRF_COOKIE, CSRF_HEADER };

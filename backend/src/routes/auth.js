const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { issueSessionCookie, clearSessionCookie, requireAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 1, max: 200 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Please provide a valid email and password.' });
    }

    const { email, password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);

    // Compare against a fixed dummy hash when no such admin exists, so
    // response timing doesn't reveal whether the email is registered.
    const hashToCompare = admin ? admin.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinva';
    const valid = await bcrypt.compare(password, hashToCompare);

    if (!admin || !valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    issueSessionCookie(res, { sub: admin.id, email: admin.email });
    res.json({ email: admin.email });
  }
);

router.post('/logout', requireAdmin, (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

module.exports = router;

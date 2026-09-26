const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimit');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

function hashIp(ip) {
  // We never store the raw IP, only a salted one-way hash, kept only long
  // enough to be useful for abuse detection.
  const salt = process.env.JWT_SECRET || 'fallback-salt';
  return crypto.createHash('sha256').update(salt + ip).digest('hex').slice(0, 16);
}

router.post(
  '/',
  contactLimiter,
  [
    body('name').trim().isLength({ min: 1, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('message').trim().isLength({ min: 1, max: 5000 }),
    body('company').optional({ checkFalsy: true }).isLength({ max: 120 }),
    body('project_type').optional({ checkFalsy: true }).isLength({ max: 120 }),
    body('budget_range').optional({ checkFalsy: true }).isLength({ max: 60 }),
    // Honeypot field: real users never see or fill this (hidden via CSS in
    // the form). Any value here means it's very likely a bot.
    body('website').optional().isLength({ max: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Please check the form: name, a valid email, and a message are required.' });
    }
    if (req.body.website) {
      // Silently succeed for bots so they don't learn the honeypot exists.
      return res.status(201).json({ ok: true });
    }

    const clean = sanitizeFields(req.body, ['name', 'email', 'company', 'project_type', 'budget_range', 'message']);
    const ipHash = hashIp(req.ip || '');

    db.prepare(
      'INSERT INTO contact_submissions (name, email, company, project_type, budget_range, message, ip_hash) VALUES (@name, @email, @company, @project_type, @budget_range, @message, @ipHash)'
    ).run({
      name: clean.name,
      email: clean.email,
      company: clean.company || '',
      project_type: clean.project_type || '',
      budget_range: clean.budget_range || '',
      message: clean.message,
      ipHash,
    });

    res.status(201).json({ ok: true });
  }
);

router.get('/', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM contact_submissions ORDER BY created_at DESC').all());
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM contact_submissions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

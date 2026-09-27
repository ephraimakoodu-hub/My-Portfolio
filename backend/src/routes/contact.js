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

  return crypto
    .createHash('sha256')
    .update(salt + ip)
    .digest('hex')
    .slice(0, 16);
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

    // Honeypot field
    body('website').optional().isLength({ max: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error:
          'Please check the form: name, a valid email, and a message are required.',
      });
    }

    if (req.body.website) {
      // Silently succeed for bots.
      return res.status(201).json({ ok: true });
    }

    try {
      const clean = sanitizeFields(req.body, [
        'name',
        'email',
        'company',
        'project_type',
        'budget_range',
        'message',
      ]);

      const ipHash = hashIp(req.ip || '');

      await db.query(
        `
        INSERT INTO contact_submissions
          (
            name,
            email,
            company,
            project_type,
            budget_range,
            message,
            ip_hash
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          clean.name,
          clean.email,
          clean.company || '',
          clean.project_type || '',
          clean.budget_range || '',
          clean.message,
          ipHash,
        ]
      );

      res.status(201).json({ ok: true });
    } catch (error) {
      console.error('Contact submission error:', error);

      res.status(500).json({
        error: 'Failed to submit your message.',
      });
    }
  }
);

router.get('/', requireAdmin, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM contact_submissions ORDER BY created_at DESC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Contact submissions error:', error);

    res.status(500).json({
      error: 'Failed to load contact submissions.',
    });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.run(
      'DELETE FROM contact_submissions WHERE id = $1',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Contact submission not found.',
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete contact submission error:', error);

    res.status(500).json({
      error: 'Failed to delete contact submission.',
    });
  }
});

module.exports = router;
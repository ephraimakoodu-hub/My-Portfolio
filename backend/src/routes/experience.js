const express = require('express');

const { body, validationResult } = require('express-validator');

const db = require('../db/db');

const { requireAdmin } = require('../middleware/auth');

const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

const TEXT_FIELDS = [
  'organization',
  'role',
  'start_date',
  'end_date',
  'description'
];

function normalizeExperience(body) {
  const clean = sanitizeFields(body, TEXT_FIELDS);

  for (const f of TEXT_FIELDS) {
    clean[f] =
      clean[f] === undefined || clean[f] === null
        ? ''
        : clean[f];
  }

  return clean;
}

// GET all experience
router.get('/', async (req, res) => {
  try {
    const experiences = await db.all(
      'SELECT * FROM experience ORDER BY display_order ASC'
    );

    res.json(experiences);
  } catch (error) {
    console.error('Get experience error:', error);
    res.status(500).json({ error: 'Failed to load experience.' });
  }
});

// ADD experience
router.post(
  '/',
  requireAdmin,
  [
    body('organization')
      .trim()
      .isLength({ min: 1, max: 120 }),

    body('role')
      .trim()
      .isLength({ min: 1, max: 120 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: 'Organization and role are required.' });
      }

      const clean = normalizeExperience(req.body);

      const result = await db.query(
        `
        INSERT INTO experience
        (
          organization,
          role,
          start_date,
          end_date,
          description,
          display_order
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM experience)
        )
        RETURNING *
        `,
        [
          clean.organization,
          clean.role,
          clean.start_date,
          clean.end_date,
          clean.description
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Add experience error:', error);
      res.status(500).json({ error: 'Failed to add experience.' });
    }
  }
);

// UPDATE experience
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const clean = normalizeExperience(req.body);

    const result = await db.query(
      `
      UPDATE experience
      SET
        organization = $1,
        role = $2,
        start_date = $3,
        end_date = $4,
        description = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        clean.organization,
        clean.role,
        clean.start_date,
        clean.end_date,
        clean.description,
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Entry not found.'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({
      error: 'Failed to update experience.'
    });
  }
});

// DELETE experience
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM experience WHERE id = $1',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Entry not found.'
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({
      error: 'Failed to delete experience.'
    });
  }
});

module.exports = router;
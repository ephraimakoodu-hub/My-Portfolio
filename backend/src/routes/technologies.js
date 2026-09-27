const express = require('express');

const {
  body,
  validationResult
} = require('express-validator');

const db = require('../db/db');

const {
  requireAdmin
} = require('../middleware/auth');

const {
  sanitizeFields
} = require('../utils/sanitize');

const router = express.Router();

// GET technologies
router.get('/', async (req, res) => {
  try {
    const technologies = await db.all(
      `
      SELECT *
      FROM technologies
      ORDER BY display_order ASC, name ASC
      `
    );

    res.json(technologies);
  } catch (error) {
    console.error('Get technologies error:', error);

    res.status(500).json({
      error: 'Failed to load technologies.'
    });
  }
});

// ADD technology
router.post(
  '/',
  requireAdmin,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 60 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'A technology name is required.'
        });
      }

      const {
        name,
        category
      } = sanitizeFields(
        req.body,
        ['name', 'category']
      );

      try {
        const result = await db.query(
          `
          INSERT INTO technologies
          (
            name,
            category,
            display_order
          )
          VALUES
          (
            $1,
            $2,
            (
              SELECT COALESCE(MAX(display_order), 0) + 1
              FROM technologies
            )
          )
          RETURNING *
          `,
          [
            name,
            category || ''
          ]
        );

        res.status(201).json(
          result.rows[0]
        );
      } catch (error) {
        // PostgreSQL unique constraint violation
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'That technology already exists.'
          });
        }

        throw error;
      }
    } catch (error) {
      console.error(
        'Add technology error:',
        error
      );

      res.status(500).json({
        error: 'Failed to add technology.'
      });
    }
  }
);

// DELETE technology
router.delete(
  '/:id',
  requireAdmin,
  async (req, res) => {
    try {
      // Remove relationships first.
      await db.query(
        `
        DELETE FROM project_technologies
        WHERE technology_id = $1
        `,
        [req.params.id]
      );

      const result = await db.query(
        `
        DELETE FROM technologies
        WHERE id = $1
        `,
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Technology not found.'
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(
        'Delete technology error:',
        error
      );

      res.status(500).json({
        error: 'Failed to delete technology.'
      });
    }
  }
);

module.exports = router;
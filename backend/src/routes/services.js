const express = require('express');

const { body, validationResult } = require('express-validator');

const db = require('../db/db');

const { requireAdmin } = require('../middleware/auth');

const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

// GET services
router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';

    const sql = activeOnly
      ? 'SELECT * FROM services WHERE active = 1 ORDER BY display_order ASC'
      : 'SELECT * FROM services ORDER BY display_order ASC';

    const services = await db.all(sql);

    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);

    res.status(500).json({
      error: 'Failed to load services.'
    });
  }
});

// ADD service
router.post(
  '/',
  requireAdmin,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'A service title is required.'
        });
      }

      const clean = sanitizeFields(
        req.body,
        ['title', 'description']
      );

      const result = await db.query(
        `
        INSERT INTO services
        (
          title,
          description,
          display_order
        )
        VALUES
        (
          $1,
          $2,
          (
            SELECT COALESCE(MAX(display_order), 0) + 1
            FROM services
          )
        )
        RETURNING *
        `,
        [
          clean.title,
          clean.description || ''
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Add service error:', error);

      res.status(500).json({
        error: 'Failed to add service.'
      });
    }
  }
);

// UPDATE service
router.put(
  '/:id',
  requireAdmin,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'A service title is required.'
        });
      }

      const clean = sanitizeFields(
        req.body,
        ['title', 'description']
      );

      const result = await db.query(
        `
        UPDATE services
        SET
          title = $1,
          description = $2,
          active = $3
        WHERE id = $4
        RETURNING *
        `,
        [
          clean.title,
          clean.description || '',
          req.body.active ? 1 : 0,
          req.params.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Service not found.'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update service error:', error);

      res.status(500).json({
        error: 'Failed to update service.'
      });
    }
  }
);

// DELETE service
router.delete(
  '/:id',
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db.query(
        'DELETE FROM services WHERE id = $1',
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Service not found.'
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Delete service error:', error);

      res.status(500).json({
        error: 'Failed to delete service.'
      });
    }
  }
);

module.exports = router;
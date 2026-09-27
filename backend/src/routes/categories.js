const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load categories.' });
  }
});

router.post(
  '/',
  requireAdmin,
  [body('name').trim().isLength({ min: 1, max: 80 })],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: 'A category name is required.' });
    }

    const { name } = sanitizeFields(req.body, ['name']);
    const slug = slugify(name, { lower: true, strict: true });

    try {
      const result = await db.query(
        `
        INSERT INTO categories (name, slug, display_order)
        VALUES (
          $1,
          $2,
          (SELECT COALESCE(MAX(display_order), 0) + 1 FROM categories)
        )
        RETURNING *
        `,
        [name, slug]
      );

      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error(e);

      res
        .status(409)
        .json({ error: 'A category with that name already exists.' });
    }
  }
);

router.put(
  '/:id',
  requireAdmin,
  [body('name').trim().isLength({ min: 1, max: 80 })],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: 'A category name is required.' });
    }

    const { name } = sanitizeFields(req.body, ['name']);
    const slug = slugify(name, { lower: true, strict: true });

    try {
      const result = await db.query(
        `
        UPDATE categories
        SET name = $1, slug = $2
        WHERE id = $3
        RETURNING *
        `,
        [name, slug, req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);

      res
        .status(409)
        .json({ error: 'A category with that name already exists.' });
    }
  }
);

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const inUse = await db.get(
      'SELECT COUNT(*) AS c FROM projects WHERE category_id = $1',
      [req.params.id]
    );

    if (Number(inUse.c) > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${inUse.c} project(s) still use this category.`,
      });
    }

    const result = await db.run(
      'DELETE FROM categories WHERE id = $1',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
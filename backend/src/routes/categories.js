const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, name ASC').all();
  res.json(rows);
});

router.post('/', requireAdmin, [body('name').trim().isLength({ min: 1, max: 80 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A category name is required.' });

  const { name } = sanitizeFields(req.body, ['name']);
  const slug = slugify(name, { lower: true, strict: true });
  try {
    const info = db
      .prepare('INSERT INTO categories (name, slug, display_order) VALUES (?, ?, (SELECT COALESCE(MAX(display_order),0)+1 FROM categories))')
      .run(name, slug);
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(409).json({ error: 'A category with that name already exists.' });
  }
});

router.put('/:id', requireAdmin, [body('name').trim().isLength({ min: 1, max: 80 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A category name is required.' });

  const { name } = sanitizeFields(req.body, ['name']);
  const slug = slugify(name, { lower: true, strict: true });
  const result = db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').run(name, slug, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found.' });
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const inUse = db.prepare('SELECT COUNT(*) AS c FROM projects WHERE category_id = ?').get(req.params.id);
  if (inUse.c > 0) {
    return res.status(409).json({ error: `Cannot delete: ${inUse.c} project(s) still use this category.` });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

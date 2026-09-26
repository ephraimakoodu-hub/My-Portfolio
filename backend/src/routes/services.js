const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

router.get('/', (req, res) => {
  const activeOnly = req.query.all !== 'true';
  const sql = activeOnly
    ? 'SELECT * FROM services WHERE active = 1 ORDER BY display_order ASC'
    : 'SELECT * FROM services ORDER BY display_order ASC';
  res.json(db.prepare(sql).all());
});

router.post('/', requireAdmin, [body('title').trim().isLength({ min: 1, max: 100 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A service title is required.' });
  const clean = sanitizeFields(req.body, ['title', 'description']);
  const info = db
    .prepare('INSERT INTO services (title, description, display_order) VALUES (?, ?, (SELECT COALESCE(MAX(display_order),0)+1 FROM services))')
    .run(clean.title, clean.description || '');
  res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAdmin, [body('title').trim().isLength({ min: 1, max: 100 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A service title is required.' });
  const clean = sanitizeFields(req.body, ['title', 'description']);
  const result = db
    .prepare('UPDATE services SET title = ?, description = ?, active = ? WHERE id = ?')
    .run(clean.title, clean.description || '', req.body.active ? 1 : 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found.' });
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

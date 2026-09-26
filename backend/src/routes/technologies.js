const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM technologies ORDER BY display_order ASC, name ASC').all());
});

router.post('/', requireAdmin, [body('name').trim().isLength({ min: 1, max: 60 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A technology name is required.' });

  const { name, category } = sanitizeFields(req.body, ['name', 'category']);
  try {
    const info = db
      .prepare('INSERT INTO technologies (name, category, display_order) VALUES (?, ?, (SELECT COALESCE(MAX(display_order),0)+1 FROM technologies))')
      .run(name, category || '');
    res.status(201).json(db.prepare('SELECT * FROM technologies WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(409).json({ error: 'That technology already exists.' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM project_technologies WHERE technology_id = ?').run(req.params.id);
  db.prepare('DELETE FROM technologies WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

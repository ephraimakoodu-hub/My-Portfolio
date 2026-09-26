const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();
const TEXT_FIELDS = ['organization', 'role', 'start_date', 'end_date', 'description'];

function normalizeExperience(body) {
  const clean = sanitizeFields(body, TEXT_FIELDS);
  for (const f of TEXT_FIELDS) clean[f] = clean[f] === undefined || clean[f] === null ? '' : clean[f];
  return clean;
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM experience ORDER BY display_order ASC').all());
});

router.post(
  '/',
  requireAdmin,
  [body('organization').trim().isLength({ min: 1, max: 120 }), body('role').trim().isLength({ min: 1, max: 120 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Organization and role are required.' });
    const clean = normalizeExperience(req.body);
    const info = db
      .prepare(
        'INSERT INTO experience (organization, role, start_date, end_date, description, display_order) VALUES (@organization, @role, @start_date, @end_date, @description, (SELECT COALESCE(MAX(display_order),0)+1 FROM experience))'
      )
      .run(clean);
    res.status(201).json(db.prepare('SELECT * FROM experience WHERE id = ?').get(info.lastInsertRowid));
  }
);

router.put('/:id', requireAdmin, (req, res) => {
  const clean = normalizeExperience(req.body);
  const result = db
    .prepare('UPDATE experience SET organization=@organization, role=@role, start_date=@start_date, end_date=@end_date, description=@description WHERE id=@id')
    .run({ ...clean, id: req.params.id });
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found.' });
  res.json(db.prepare('SELECT * FROM experience WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM experience WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

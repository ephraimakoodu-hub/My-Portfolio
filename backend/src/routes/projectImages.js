const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { upload, processAndSaveImage, deleteImageFile } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router({ mergeParams: true });
const SUBDIR = 'projects';

function assertProjectExists(projectId, res) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return null;
  }
  return project;
}

router.post('/', requireAdmin, uploadLimiter, upload.array('images', 20), async (req, res) => {
  const project = assertProjectExists(req.params.projectId, res);
  if (!project) return;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files were provided.' });
  }

  const insert = db.prepare(
    'INSERT INTO project_images (project_id, filename, alt_text, caption, display_order) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(display_order),0)+1 FROM project_images WHERE project_id = ?))'
  );

  const saved = [];
  try {
    for (const file of req.files) {
      const { relativePath } = await processAndSaveImage(file.buffer, SUBDIR);
      const info = insert.run(project.id, relativePath, '', '', project.id);
      saved.push(db.prepare('SELECT * FROM project_images WHERE id = ?').get(info.lastInsertRowid));
    }
  } catch (err) {
    return res.status(400).json({ error: err.message || 'One or more files were not valid images.' });
  }

  // First image ever added becomes the cover automatically if none is set.
  const hasCover = db.prepare('SELECT id FROM project_images WHERE project_id = ? AND is_cover = 1').get(project.id);
  if (!hasCover && saved.length > 0) {
    db.prepare('UPDATE project_images SET is_cover = 1 WHERE id = ?').run(saved[0].id);
    db.prepare('UPDATE projects SET cover_image = ? WHERE id = ?').run(saved[0].filename, project.id);
  }

  res.status(201).json(db.prepare('SELECT * FROM project_images WHERE project_id = ? ORDER BY display_order ASC').all(project.id));
});

router.patch('/:imageId', requireAdmin, [body('alt_text').optional().isLength({ max: 200 }), body('caption').optional().isLength({ max: 300 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Alt text or caption is too long.' });
  const clean = sanitizeFields(req.body, ['alt_text', 'caption']);
  const result = db
    .prepare(
      'UPDATE project_images SET alt_text = COALESCE(@alt_text, alt_text), caption = COALESCE(@caption, caption) WHERE id = @id AND project_id = @projectId'
    )
    .run({ ...clean, id: req.params.imageId, projectId: req.params.projectId });
  if (result.changes === 0) return res.status(404).json({ error: 'Image not found.' });
  res.json(db.prepare('SELECT * FROM project_images WHERE id = ?').get(req.params.imageId));
});

router.put('/:imageId/cover', requireAdmin, (req, res) => {
  const image = db.prepare('SELECT * FROM project_images WHERE id = ? AND project_id = ?').get(req.params.imageId, req.params.projectId);
  if (!image) return res.status(404).json({ error: 'Image not found.' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE project_images SET is_cover = 0 WHERE project_id = ?').run(req.params.projectId);
    db.prepare('UPDATE project_images SET is_cover = 1 WHERE id = ?').run(image.id);
    db.prepare('UPDATE projects SET cover_image = ? WHERE id = ?').run(image.filename, req.params.projectId);
  });
  tx();
  res.json({ ok: true });
});

router.put('/reorder', requireAdmin, [body('order').isArray({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'An order array of image ids is required.' });
  const update = db.prepare('UPDATE project_images SET display_order = ? WHERE id = ? AND project_id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, idx) => update.run(idx, id, req.params.projectId));
  });
  tx(req.body.order);
  res.json({ ok: true });
});

router.delete('/:imageId', requireAdmin, (req, res) => {
  const image = db.prepare('SELECT * FROM project_images WHERE id = ? AND project_id = ?').get(req.params.imageId, req.params.projectId);
  if (!image) return res.status(404).json({ error: 'Image not found.' });
  db.prepare('DELETE FROM project_images WHERE id = ?').run(image.id);
  deleteImageFile(SUBDIR, image.filename.split('/').pop());
  if (image.is_cover) {
    const next = db.prepare('SELECT * FROM project_images WHERE project_id = ? ORDER BY display_order ASC LIMIT 1').get(req.params.projectId);
    if (next) {
      db.prepare('UPDATE project_images SET is_cover = 1 WHERE id = ?').run(next.id);
      db.prepare('UPDATE projects SET cover_image = ? WHERE id = ?').run(next.filename, req.params.projectId);
    } else {
      db.prepare('UPDATE projects SET cover_image = ? WHERE id = ?').run('', req.params.projectId);
    }
  }
  res.json({ ok: true });
});

module.exports = router;

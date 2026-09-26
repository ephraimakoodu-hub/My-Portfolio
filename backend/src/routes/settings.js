const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { upload, processAndSaveImage, deleteImageFile } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();
const SUBDIR = 'profile';

const TEXT_FIELDS = ['name', 'title', 'bio', 'value_proposition', 'email', 'phone', 'location', 'github_url', 'linkedin_url', 'resume_url'];

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ ...row, other_links: JSON.parse(row.other_links || '[]') });
});

router.put(
  '/',
  requireAdmin,
  [body('email').optional({ checkFalsy: true }).isEmail()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Please provide a valid email address.' });

    const rawClean = sanitizeFields(req.body, TEXT_FIELDS);
    const clean = {};
    for (const f of TEXT_FIELDS) clean[f] = rawClean[f] === undefined || rawClean[f] === null ? '' : rawClean[f];
    const otherLinks = Array.isArray(req.body.other_links) ? req.body.other_links : [];

    db.prepare(
      `UPDATE settings SET
        name=@name, title=@title, bio=@bio, value_proposition=@value_proposition, email=@email,
        phone=@phone, location=@location, github_url=@github_url, linkedin_url=@linkedin_url,
        resume_url=@resume_url, other_links=@other_links, updated_at=datetime('now')
       WHERE id = 1`
    ).run({ ...clean, other_links: JSON.stringify(otherLinks) });

    const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ ...row, other_links: JSON.parse(row.other_links || '[]') });
  }
);

router.post('/profile-image', requireAdmin, uploadLimiter, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file was provided.' });

  let saved;
  try {
    saved = await processAndSaveImage(req.file.buffer, SUBDIR);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'That file is not a valid image.' });
  }

  const previous = db.prepare('SELECT profile_image FROM settings WHERE id = 1').get();
  db.prepare("UPDATE settings SET profile_image = ?, updated_at = datetime('now') WHERE id = 1").run(saved.relativePath);
  if (previous && previous.profile_image) {
    deleteImageFile(SUBDIR, previous.profile_image.split('/').pop());
  }
  res.json({ profile_image: saved.relativePath });
});

module.exports = router;

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
  upload,
  processAndSaveImage,
  deleteImageFile
} = require('../middleware/upload');

const {
  uploadLimiter
} = require('../middleware/rateLimit');

const {
  sanitizeFields
} = require('../utils/sanitize');

const router = express.Router();

const SUBDIR = 'profile';

const TEXT_FIELDS = [
  'name',
  'title',
  'bio',
  'value_proposition',
  'email',
  'phone',
  'location',
  'github_url',
  'linkedin_url',
  'resume_url'
];

// GET settings
router.get('/', async (req, res) => {
  try {
    const row = await db.get(
      'SELECT * FROM settings WHERE id = 1'
    );

    if (!row) {
      return res.status(404).json({
        error: 'Settings not found.'
      });
    }

    res.json({
      ...row,
      other_links: JSON.parse(
        row.other_links || '[]'
      )
    });
  } catch (error) {
    console.error('Get settings error:', error);

    res.status(500).json({
      error: 'Failed to load settings.'
    });
  }
});

// UPDATE settings
router.put(
  '/',
  requireAdmin,
  [
    body('email')
      .optional({ checkFalsy: true })
      .isEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Please provide a valid email address.'
        });
      }

      const rawClean = sanitizeFields(
        req.body,
        TEXT_FIELDS
      );

      const clean = {};

      for (const f of TEXT_FIELDS) {
        clean[f] =
          rawClean[f] === undefined ||
          rawClean[f] === null
            ? ''
            : rawClean[f];
      }

      const otherLinks = Array.isArray(
        req.body.other_links
      )
        ? req.body.other_links
        : [];

      const result = await db.query(
        `
        UPDATE settings
        SET
          name = $1,
          title = $2,
          bio = $3,
          value_proposition = $4,
          email = $5,
          phone = $6,
          location = $7,
          github_url = $8,
          linkedin_url = $9,
          resume_url = $10,
          other_links = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING *
        `,
        [
          clean.name,
          clean.title,
          clean.bio,
          clean.value_proposition,
          clean.email,
          clean.phone,
          clean.location,
          clean.github_url,
          clean.linkedin_url,
          clean.resume_url,
          JSON.stringify(otherLinks)
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Settings not found.'
        });
      }

      const row = result.rows[0];

      res.json({
        ...row,
        other_links: JSON.parse(
          row.other_links || '[]'
        )
      });
    } catch (error) {
      console.error('Update settings error:', error);

      res.status(500).json({
        error: 'Failed to update settings.'
      });
    }
  }
);

// Upload profile image
router.post(
  '/profile-image',
  requireAdmin,
  uploadLimiter,
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file was provided.'
      });
    }

    let saved;

    try {
      saved = await processAndSaveImage(
        req.file.buffer,
        SUBDIR
      );
    } catch (err) {
      return res.status(400).json({
        error:
          err.message ||
          'That file is not a valid image.'
      });
    }

    try {
      const previous = await db.get(
        `
        SELECT profile_image
        FROM settings
        WHERE id = 1
        `
      );

      const result = await db.query(
        `
        UPDATE settings
        SET
          profile_image = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING profile_image
        `,
        [saved.relativePath]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Settings not found.'
        });
      }

      if (
        previous &&
        previous.profile_image
      ) {
        deleteImageFile(
          SUBDIR,
          previous.profile_image
            .split('/')
            .pop()
        );
      }

      res.json({
        profile_image:
          saved.relativePath
      });
    } catch (error) {
      console.error(
        'Profile image update error:',
        error
      );

      res.status(500).json({
        error:
          'Failed to update profile image.'
      });
    }
  }
);

module.exports = router;
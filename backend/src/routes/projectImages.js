const express = require('express');

const { body, validationResult } = require('express-validator');

const db = require('../db/db');

const { requireAdmin } = require('../middleware/auth');

const {
  upload,
  processAndSaveImage,
  deleteImageFile
} = require('../middleware/upload');

const { uploadLimiter } = require('../middleware/rateLimit');

const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router({ mergeParams: true });

const SUBDIR = 'projects';

async function assertProjectExists(projectId, res) {
  const project = await db.get(
    'SELECT * FROM projects WHERE id = $1',
    [projectId]
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return null;
  }

  return project;
}

// Upload project images
router.post(
  '/',
  requireAdmin,
  uploadLimiter,
  upload.array('images', 20),
  async (req, res) => {
    const project = await assertProjectExists(req.params.projectId, res);

    if (!project) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No image files were provided.'
      });
    }

    const saved = [];

    try {
      for (const file of req.files) {
        const { relativePath } = await processAndSaveImage(
          file.buffer,
          SUBDIR
        );

        const result = await db.query(
          `
          INSERT INTO project_images
          (
            project_id,
            filename,
            alt_text,
            caption,
            display_order
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            (
              SELECT COALESCE(MAX(display_order), 0) + 1
              FROM project_images
              WHERE project_id = $5
            )
          )
          RETURNING *
          `,
          [
            project.id,
            relativePath,
            '',
            '',
            project.id
          ]
        );

        saved.push(result.rows[0]);
      }
    } catch (err) {
      return res.status(400).json({
        error:
          err.message ||
          'One or more files were not valid images.'
      });
    }

    // First image ever added becomes the cover automatically
    // if no cover currently exists.
    const hasCover = await db.get(
      `
      SELECT id
      FROM project_images
      WHERE project_id = $1
        AND is_cover = 1
      `,
      [project.id]
    );

    if (!hasCover && saved.length > 0) {
      await db.query(
        `
        UPDATE project_images
        SET is_cover = 1
        WHERE id = $1
        `,
        [saved[0].id]
      );

      await db.query(
        `
        UPDATE projects
        SET cover_image = $1
        WHERE id = $2
        `,
        [
          saved[0].filename,
          project.id
        ]
      );
    }

    const images = await db.all(
      `
      SELECT *
      FROM project_images
      WHERE project_id = $1
      ORDER BY display_order ASC
      `,
      [project.id]
    );

    res.status(201).json(images);
  }
);

// Update image alt text / caption
router.patch(
  '/:imageId',
  requireAdmin,
  [
    body('alt_text')
      .optional()
      .isLength({ max: 200 }),

    body('caption')
      .optional()
      .isLength({ max: 300 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Alt text or caption is too long.'
        });
      }

      const clean = sanitizeFields(
        req.body,
        ['alt_text', 'caption']
      );

      const result = await db.query(
        `
        UPDATE project_images
        SET
          alt_text = COALESCE($1, alt_text),
          caption = COALESCE($2, caption)
        WHERE id = $3
          AND project_id = $4
        RETURNING *
        `,
        [
          clean.alt_text ?? null,
          clean.caption ?? null,
          req.params.imageId,
          req.params.projectId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Image not found.'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update project image error:', error);

      res.status(500).json({
        error: 'Failed to update image.'
      });
    }
  }
);

// Set image as cover
router.put(
  '/:imageId/cover',
  requireAdmin,
  async (req, res) => {
    try {
      const image = await db.get(
        `
        SELECT *
        FROM project_images
        WHERE id = $1
          AND project_id = $2
        `,
        [
          req.params.imageId,
          req.params.projectId
        ]
      );

      if (!image) {
        return res.status(404).json({
          error: 'Image not found.'
        });
      }

      await db.transaction(async (client) => {
        await client.query(
          `
          UPDATE project_images
          SET is_cover = 0
          WHERE project_id = $1
          `,
          [req.params.projectId]
        );

        await client.query(
          `
          UPDATE project_images
          SET is_cover = 1
          WHERE id = $1
          `,
          [image.id]
        );

        await client.query(
          `
          UPDATE projects
          SET cover_image = $1
          WHERE id = $2
          `,
          [
            image.filename,
            req.params.projectId
          ]
        );
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Set project cover error:', error);

      res.status(500).json({
        error: 'Failed to set cover image.'
      });
    }
  }
);

// Reorder images
router.put(
  '/reorder',
  requireAdmin,
  [
    body('order').isArray({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'An order array of image ids is required.'
        });
      }

      await db.transaction(async (client) => {
        for (let idx = 0; idx < req.body.order.length; idx++) {
          await client.query(
            `
            UPDATE project_images
            SET display_order = $1
            WHERE id = $2
              AND project_id = $3
            `,
            [
              idx,
              req.body.order[idx],
              req.params.projectId
            ]
          );
        }
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Reorder project images error:', error);

      res.status(500).json({
        error: 'Failed to reorder images.'
      });
    }
  }
);

// Delete image
router.delete(
  '/:imageId',
  requireAdmin,
  async (req, res) => {
    try {
      const image = await db.get(
        `
        SELECT *
        FROM project_images
        WHERE id = $1
          AND project_id = $2
        `,
        [
          req.params.imageId,
          req.params.projectId
        ]
      );

      if (!image) {
        return res.status(404).json({
          error: 'Image not found.'
        });
      }

      await db.query(
        `
        DELETE FROM project_images
        WHERE id = $1
        `,
        [image.id]
      );

      deleteImageFile(
        SUBDIR,
        image.filename.split('/').pop()
      );

      // If deleted image was the cover,
      // make the next image the new cover.
      if (image.is_cover) {
        const next = await db.get(
          `
          SELECT *
          FROM project_images
          WHERE project_id = $1
          ORDER BY display_order ASC
          LIMIT 1
          `,
          [req.params.projectId]
        );

        if (next) {
          await db.query(
            `
            UPDATE project_images
            SET is_cover = 1
            WHERE id = $1
            `,
            [next.id]
          );

          await db.query(
            `
            UPDATE projects
            SET cover_image = $1
            WHERE id = $2
            `,
            [
              next.filename,
              req.params.projectId
            ]
          );
        } else {
          await db.query(
            `
            UPDATE projects
            SET cover_image = ''
            WHERE id = $1
            `,
            [req.params.projectId]
          );
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Delete project image error:', error);

      res.status(500).json({
        error: 'Failed to delete image.'
      });
    }
  }
);

module.exports = router;
const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');

const db = require('../db/db');

const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

const TEXT_FIELDS = [
  'title',
  'short_description',
  'full_description',
  'project_url',
  'github_url',
  'case_study_url',
  'project_date',
  'client_type',
  'challenges',
  'solution',
  'results',
  'seo_title',
  'seo_description',
];

function withTextDefaults(obj) {
  const out = { ...obj };

  for (const f of TEXT_FIELDS) {
    if (out[f] === undefined || out[f] === null) {
      out[f] = '';
    }
  }

  return out;
}

async function attachRelations(project) {
  const technologies = await db.all(
    `
    SELECT t.*
    FROM technologies t
    JOIN project_technologies pt
      ON pt.technology_id = t.id
    WHERE pt.project_id = $1
    ORDER BY t.name ASC
    `,
    [project.id]
  );

  const features = await db.all(
    `
    SELECT *
    FROM project_features
    WHERE project_id = $1
    ORDER BY display_order ASC, id ASC
    `,
    [project.id]
  );

  const images = await db.all(
    `
    SELECT *
    FROM project_images
    WHERE project_id = $1
    ORDER BY display_order ASC, id ASC
    `,
    [project.id]
  );

  let category = null;

  if (project.category_id) {
    category = await db.get(
      'SELECT * FROM categories WHERE id = $1',
      [project.category_id]
    );
  }

  return {
    ...project,
    technologies,
    features,
    images,
    category,
  };
}

async function uniqueSlug(title, ignoreId = null) {
  const base =
    slugify(title, {
      lower: true,
      strict: true,
    }) || 'project';

  let slug = base;
  let n = 1;

  while (true) {
    const existing = await db.get(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );

    if (!existing || existing.id === Number(ignoreId)) {
      return slug;
    }

    n += 1;
    slug = `${base}-${n}`;
  }
}

async function replaceTechnologies(projectId, technologyIds) {
  await db.query(
    'DELETE FROM project_technologies WHERE project_id = $1',
    [projectId]
  );

  for (const tid of technologyIds || []) {
    await db.query(
      `
      INSERT INTO project_technologies
      (project_id, technology_id)
      VALUES ($1, $2)
      ON CONFLICT (project_id, technology_id) DO NOTHING
      `,
      [projectId, tid]
    );
  }
}

async function replaceFeatures(projectId, features) {
  await db.query(
    'DELETE FROM project_features WHERE project_id = $1',
    [projectId]
  );

  let displayOrder = 0;

  for (const text of features || []) {
    const clean = String(text || '').trim();

    if (clean) {
      await db.query(
        `
        INSERT INTO project_features
        (project_id, feature_text, display_order)
        VALUES ($1, $2, $3)
        `,
        [
          projectId,
          clean,
          displayOrder,
        ]
      );

      displayOrder++;
    }
  }
}

// ---------- PUBLIC ----------

// Get published projects
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;

    let sql = `
      SELECT *
      FROM projects
      WHERE status = 'published'
    `;

    const params = [];

    if (category) {
      params.push(category);

      sql += `
        AND category_id = (
          SELECT id
          FROM categories
          WHERE slug = $${params.length}
        )
      `;
    }

    if (featured === 'true') {
      sql += ' AND featured = 1';
    }

    sql += `
      ORDER BY display_order ASC, created_at DESC
    `;

    const rows = await db.all(sql, params);

    const projects = await Promise.all(
      rows.map(attachRelations)
    );

    res.json(projects);
  } catch (error) {
    console.error('Get public projects error:', error);

    res.status(500).json({
      error: 'Failed to load projects.',
    });
  }
});

// Get published project by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const project = await db.get(
      `
      SELECT *
      FROM projects
      WHERE slug = $1
        AND status = 'published'
      `,
      [req.params.slug]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found.',
      });
    }

    res.json(await attachRelations(project));
  } catch (error) {
    console.error('Get project by slug error:', error);

    res.status(500).json({
      error: 'Failed to load project.',
    });
  }
});

// ---------- ADMIN ----------

// Get all projects for admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const {
      status,
      category_id,
      featured,
      search,
    } = req.query;

    let sql = `
      SELECT *
      FROM projects
      WHERE 1 = 1
    `;

    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (category_id) {
      params.push(category_id);
      sql += ` AND category_id = $${params.length}`;
    }

    if (
      featured === 'true' ||
      featured === 'false'
    ) {
      params.push(featured === 'true' ? 1 : 0);
      sql += ` AND featured = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND title ILIKE $${params.length}`;
    }

    sql += `
      ORDER BY display_order ASC, created_at DESC
    `;

    const rows = await db.all(sql, params);

    const projects = await Promise.all(
      rows.map(attachRelations)
    );

    res.json(projects);
  } catch (error) {
    console.error('Get admin projects error:', error);

    res.status(500).json({
      error: 'Failed to load projects.',
    });
  }
});

// Get one project for admin
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const project = await db.get(
      'SELECT * FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found.',
      });
    }

    res.json(await attachRelations(project));
  } catch (error) {
    console.error('Get admin project error:', error);

    res.status(500).json({
      error: 'Failed to load project.',
    });
  }
});

// Create project
router.post(
  '/admin',
  requireAdmin,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 150 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'A project title is required.',
        });
      }

      const clean = withTextDefaults(
        sanitizeFields(req.body, TEXT_FIELDS)
      );

      const slug = await uniqueSlug(clean.title);

      const status = [
        'draft',
        'published',
        'archived',
      ].includes(req.body.status)
        ? req.body.status
        : 'draft';

      const result = await db.query(
        `
        INSERT INTO projects
        (
          title,
          slug,
          short_description,
          full_description,
          category_id,
          status,
          featured,
          project_url,
          github_url,
          case_study_url,
          project_date,
          client_type,
          challenges,
          solution,
          results,
          seo_title,
          seo_description,
          display_order
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17,
          (
            SELECT COALESCE(MAX(display_order), 0) + 1
            FROM projects
          )
        )
        RETURNING *
        `,
        [
          clean.title,
          slug,
          clean.short_description,
          clean.full_description,
          req.body.category_id || null,
          status,
          req.body.featured ? 1 : 0,
          clean.project_url,
          clean.github_url,
          clean.case_study_url,
          clean.project_date,
          clean.client_type,
          clean.challenges,
          clean.solution,
          clean.results,
          clean.seo_title,
          clean.seo_description,
        ]
      );

      const project = result.rows[0];

      await replaceTechnologies(
        project.id,
        req.body.technology_ids
      );

      await replaceFeatures(
        project.id,
        req.body.features
      );

      const finalProject = await db.get(
        'SELECT * FROM projects WHERE id = $1',
        [project.id]
      );

      res.status(201).json(
        await attachRelations(finalProject)
      );
    } catch (error) {
      console.error('Create project error:', error);

      res.status(500).json({
        error: 'Failed to create project.',
      });
    }
  }
);

// Update project
router.put(
  '/admin/:id',
  requireAdmin,
  [
    body('title')
      .trim()
      .isLength({ min: 1, max: 150 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'A project title is required.',
        });
      }

      const existing = await db.get(
        'SELECT * FROM projects WHERE id = $1',
        [req.params.id]
      );

      if (!existing) {
        return res.status(404).json({
          error: 'Project not found.',
        });
      }

      const clean = withTextDefaults(
        sanitizeFields(req.body, TEXT_FIELDS)
      );

      const slug =
        clean.title !== existing.title
          ? await uniqueSlug(
              clean.title,
              existing.id
            )
          : existing.slug;

      const status = [
        'draft',
        'published',
        'archived',
      ].includes(req.body.status)
        ? req.body.status
        : existing.status;

      const result = await db.query(
        `
        UPDATE projects
        SET
          title = $1,
          slug = $2,
          short_description = $3,
          full_description = $4,
          category_id = $5,
          status = $6,
          featured = $7,
          project_url = $8,
          github_url = $9,
          case_study_url = $10,
          project_date = $11,
          client_type = $12,
          challenges = $13,
          solution = $14,
          results = $15,
          seo_title = $16,
          seo_description = $17,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
        RETURNING *
        `,
        [
          clean.title,
          slug,
          clean.short_description,
          clean.full_description,
          req.body.category_id || null,
          status,
          req.body.featured ? 1 : 0,
          clean.project_url,
          clean.github_url,
          clean.case_study_url,
          clean.project_date,
          clean.client_type,
          clean.challenges,
          clean.solution,
          clean.results,
          clean.seo_title,
          clean.seo_description,
          existing.id,
        ]
      );

      const project = result.rows[0];

      await replaceTechnologies(
        existing.id,
        req.body.technology_ids
      );

      if (req.body.features !== undefined) {
        await replaceFeatures(
          existing.id,
          req.body.features
        );
      }

      res.json(
        await attachRelations(project)
      );
    } catch (error) {
      console.error('Update project error:', error);

      res.status(500).json({
        error: 'Failed to update project.',
      });
    }
  }
);

// Change project status
router.patch(
  '/admin/:id/status',
  requireAdmin,
  [
    body('status').isIn([
      'draft',
      'published',
      'archived',
    ]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid status value.',
        });
      }

      const result = await db.query(
        `
        UPDATE projects
        SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
        `,
        [
          req.body.status,
          req.params.id,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Project not found.',
        });
      }

      res.json(
        await attachRelations(result.rows[0])
      );
    } catch (error) {
      console.error('Change project status error:', error);

      res.status(500).json({
        error: 'Failed to update project status.',
      });
    }
  }
);

// Reorder projects
router.put(
  '/admin/reorder',
  requireAdmin,
  [
    body('order').isArray({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'An order array of project ids is required.',
        });
      }

      await db.transaction(async (client) => {
        for (
          let idx = 0;
          idx < req.body.order.length;
          idx++
        ) {
          await client.query(
            `
            UPDATE projects
            SET display_order = $1
            WHERE id = $2
            `,
            [
              idx,
              req.body.order[idx],
            ]
          );
        }
      });

      res.json({ ok: true });
    } catch (error) {
      console.error('Reorder projects error:', error);

      res.status(500).json({
        error: 'Failed to reorder projects.',
      });
    }
  }
);

// Delete/archive project
router.delete(
  '/admin/:id',
  requireAdmin,
  async (req, res) => {
    try {
      // Hard delete only when explicitly confirmed.
      if (req.query.permanent === 'true') {
        const result = await db.query(
          'DELETE FROM projects WHERE id = $1',
          [req.params.id]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({
            error: 'Project not found.',
          });
        }

        return res.json({
          ok: true,
          permanent: true,
        });
      }

      const result = await db.query(
        `
        UPDATE projects
        SET
          status = 'archived',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Project not found.',
        });
      }

      res.json({
        ok: true,
        permanent: false,
      });
    } catch (error) {
      console.error('Delete project error:', error);

      res.status(500).json({
        error: 'Failed to delete project.',
      });
    }
  }
);

module.exports = router;
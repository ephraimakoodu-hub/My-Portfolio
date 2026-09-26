const express = require('express');
const slugify = require('slugify');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeFields } = require('../utils/sanitize');

const router = express.Router();

const TEXT_FIELDS = [
  'title', 'short_description', 'full_description', 'project_url', 'github_url',
  'case_study_url', 'project_date', 'client_type', 'challenges', 'solution',
  'results', 'seo_title', 'seo_description',
];

// better-sqlite3 rejects `undefined` bind values (it only accepts values
// that are actually present), so any optional text field the client didn't
// send needs an explicit empty-string default before it reaches a query.
function withTextDefaults(obj) {
  const out = { ...obj };
  for (const f of TEXT_FIELDS) {
    if (out[f] === undefined || out[f] === null) out[f] = '';
  }
  return out;
}

function attachRelations(project) {
  const technologies = db
    .prepare(
      `SELECT t.* FROM technologies t
       JOIN project_technologies pt ON pt.technology_id = t.id
       WHERE pt.project_id = ? ORDER BY t.name ASC`
    )
    .all(project.id);
  const features = db
    .prepare('SELECT * FROM project_features WHERE project_id = ? ORDER BY display_order ASC, id ASC')
    .all(project.id);
  const images = db
    .prepare('SELECT * FROM project_images WHERE project_id = ? ORDER BY display_order ASC, id ASC')
    .all(project.id);
  const category = project.category_id
    ? db.prepare('SELECT * FROM categories WHERE id = ?').get(project.category_id)
    : null;
  return { ...project, technologies, features, images, category };
}

function uniqueSlug(title, ignoreId) {
  const base = slugify(title, { lower: true, strict: true }) || 'project';
  let slug = base;
  let n = 1;
  while (true) {
    const existing = db.prepare('SELECT id FROM projects WHERE slug = ?').get(slug);
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function replaceTechnologies(projectId, technologyIds) {
  db.prepare('DELETE FROM project_technologies WHERE project_id = ?').run(projectId);
  const insert = db.prepare('INSERT OR IGNORE INTO project_technologies (project_id, technology_id) VALUES (?, ?)');
  (technologyIds || []).forEach((tid) => insert.run(projectId, tid));
}

function replaceFeatures(projectId, features) {
  db.prepare('DELETE FROM project_features WHERE project_id = ?').run(projectId);
  const insert = db.prepare('INSERT INTO project_features (project_id, feature_text, display_order) VALUES (?, ?, ?)');
  (features || []).forEach((text, idx) => {
    const clean = String(text || '').trim();
    if (clean) insert.run(projectId, clean, idx);
  });
}

// ---------- PUBLIC ----------

router.get('/', (req, res) => {
  const { category, featured } = req.query;
  let sql = "SELECT * FROM projects WHERE status = 'published'";
  const params = [];
  if (category) {
    sql += ' AND category_id = (SELECT id FROM categories WHERE slug = ?)';
    params.push(category);
  }
  if (featured === 'true') {
    sql += ' AND featured = 1';
  }
  sql += ' ORDER BY display_order ASC, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(attachRelations));
});

router.get('/slug/:slug', (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json(attachRelations(project));
});

// ---------- ADMIN ----------

router.get('/admin', requireAdmin, (req, res) => {
  const { status, category_id, featured, search } = req.query;
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (category_id) {
    sql += ' AND category_id = ?';
    params.push(category_id);
  }
  if (featured === 'true' || featured === 'false') {
    sql += ' AND featured = ?';
    params.push(featured === 'true' ? 1 : 0);
  }
  if (search) {
    sql += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY display_order ASC, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(attachRelations));
});

router.get('/admin/:id', requireAdmin, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json(attachRelations(project));
});

router.post(
  '/admin',
  requireAdmin,
  [body('title').trim().isLength({ min: 1, max: 150 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'A project title is required.' });

    const clean = withTextDefaults(sanitizeFields(req.body, TEXT_FIELDS));
    const slug = uniqueSlug(clean.title);
    const status = ['draft', 'published', 'archived'].includes(req.body.status) ? req.body.status : 'draft';

    const info = db
      .prepare(
        `INSERT INTO projects
        (title, slug, short_description, full_description, category_id, status, featured,
         project_url, github_url, case_study_url, project_date, client_type, challenges,
         solution, results, seo_title, seo_description,
         display_order)
        VALUES (@title, @slug, @short_description, @full_description, @category_id, @status, @featured,
         @project_url, @github_url, @case_study_url, @project_date, @client_type, @challenges,
         @solution, @results, @seo_title, @seo_description,
         (SELECT COALESCE(MAX(display_order),0)+1 FROM projects))`
      )
      .run({
        ...clean,
        slug,
        status,
        featured: req.body.featured ? 1 : 0,
        category_id: req.body.category_id || null,
      });

    const projectId = info.lastInsertRowid;
    replaceTechnologies(projectId, req.body.technology_ids);
    replaceFeatures(projectId, req.body.features);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    res.status(201).json(attachRelations(project));
  }
);

router.put(
  '/admin/:id',
  requireAdmin,
  [body('title').trim().isLength({ min: 1, max: 150 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'A project title is required.' });

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found.' });

    const clean = withTextDefaults(sanitizeFields(req.body, TEXT_FIELDS));
    const slug = clean.title !== existing.title ? uniqueSlug(clean.title, existing.id) : existing.slug;
    const status = ['draft', 'published', 'archived'].includes(req.body.status) ? req.body.status : existing.status;

    db.prepare(
      `UPDATE projects SET
        title=@title, slug=@slug, short_description=@short_description, full_description=@full_description,
        category_id=@category_id, status=@status, featured=@featured, project_url=@project_url,
        github_url=@github_url, case_study_url=@case_study_url, project_date=@project_date,
        client_type=@client_type, challenges=@challenges, solution=@solution, results=@results,
        seo_title=@seo_title, seo_description=@seo_description, updated_at=datetime('now')
       WHERE id=@id`
    ).run({
      ...clean,
      slug,
      status,
      featured: req.body.featured ? 1 : 0,
      category_id: req.body.category_id || null,
      id: existing.id,
    });

    replaceTechnologies(existing.id, req.body.technology_ids);
    if (req.body.features !== undefined) replaceFeatures(existing.id, req.body.features);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(existing.id);
    res.json(attachRelations(project));
  }
);

router.patch('/admin/:id/status', requireAdmin, [body('status').isIn(['draft', 'published', 'archived'])], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid status value.' });
  const result = db
    .prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.body.status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Project not found.' });
  res.json(attachRelations(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)));
});

router.put('/admin/reorder', requireAdmin, [body('order').isArray({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'An order array of project ids is required.' });
  const update = db.prepare('UPDATE projects SET display_order = ? WHERE id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, idx) => update.run(idx, id));
  });
  tx(req.body.order);
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAdmin, (req, res) => {
  // Soft delete by default: archiving preserves assets and history.
  // Hard delete only when explicitly confirmed via ?permanent=true.
  if (req.query.permanent === 'true') {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    return res.json({ ok: true, permanent: true });
  }
  const result = db.prepare("UPDATE projects SET status='archived', updated_at=datetime('now') WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Project not found.' });
  res.json({ ok: true, permanent: false });
});

module.exports = router;

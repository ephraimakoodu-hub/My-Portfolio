# Developer Portfolio Platform

A production-oriented personal portfolio with a private CMS: React (Vite) frontend + Node/Express + SQLite backend. You manage projects, images, categories, technologies, services, experience and profile settings from `/admin` without touching code.

---

## 1. Quick start (local development)

Requirements: Node.js 18+.

```bash
# Backend
cd backend
cp .env.example .env
# edit .env: set JWT_SECRET, FRONTEND_URL=http://localhost:5173, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run seed:admin      # creates your one admin account from .env
npm run dev              # http://localhost:4000

# Frontend (new terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Log in at `http://localhost:5173/admin/login` with the email/password you set in `backend/.env`, then remove `ADMIN_PASSWORD` from `.env` if you'd rather not keep it on disk.

## 2. Production deployment

1. Set real values in `backend/.env`: `JWT_SECRET` (long random string), `FRONTEND_URL` (your real domain, HTTPS), `COOKIE_SECURE=true`, `DATABASE_PATH`, `UPLOAD_DIR`.
2. Run `npm run seed:admin` once on the server, then remove the admin password from `.env`.
3. Run the backend behind a reverse proxy (nginx/Caddy) that terminates HTTPS and forwards to the Node process. `app.set('trust proxy', 1)` is already set for this.
4. Build the frontend: `npm run build` in `frontend/`, then serve `frontend/dist` as static files from the same domain (or a CDN) so `/api` and `/uploads` can stay same-origin.
5. Point your reverse proxy so `/api/*` and `/uploads/*` reach the Node backend, and everything else serves the built frontend's `index.html` (SPA fallback).
6. Back up `backend/data/portfolio.db` and `backend/uploads/` regularly — that's your entire content store.

---

## 3. Full deliverable report

**What was built:** a two-part system — a public portfolio (home, project listing with category filter, individual case-study pages, about, contact, legal pages) and a private admin CMS (project CRUD with drafts/publish/archive, image upload and management, categories, technologies, services, experience, profile settings, and a contact-message inbox). No fake data, testimonials, metrics, or filler copy is included anywhere — every public-facing piece of content is pulled from what you enter in the admin.

**Technology stack:** React 18 + React Router (Vite build) on the frontend; Node.js + Express + better-sqlite3 on the backend; JWT in an httpOnly cookie for admin sessions; multer + `file-type` + sharp for upload handling.

**Database structure:** SQLite (via better-sqlite3) with tables for `admins`, `settings` (single-row profile), `categories`, `technologies`, `services`, `experience`, `projects`, `project_technologies` (join table), `project_features`, `project_images`, and `contact_submissions`. Foreign keys and indexes are defined in `backend/src/db/db.js`.

**Authentication system:** single-admin login with bcrypt-hashed passwords (cost 12), JWT session in an httpOnly, SameSite=Lax cookie, constant-time-ish comparison against a dummy hash when the email doesn't exist (so login timing doesn't reveal valid emails), and rate limiting on the login endpoint (8 attempts / 15 minutes).

**Admin system:** every admin route requires a valid session (`requireAdmin` middleware) and a valid CSRF token (double-submit cookie pattern) on any state-changing request — there is no reliance on hiding the `/admin` URL.

**Project CMS:** full create/edit/draft/publish/unpublish/archive/delete (soft delete by default, hard delete requires an explicit `?permanent=true`), manual ordering (persisted), featured flag, search and filter by status/category/featured in the admin table, and per-project technologies/features/links/case-study fields.

**Image upload system:** files are received into memory (never trusted to disk as-is), their real content is checked with `file-type` (magic bytes, not the filename or declared MIME type), then re-encoded through `sharp` (resized, converted to webp, metadata stripped) before being written under a random filename. This defends against extension spoofing and embedded-payload tricks. Multiple images per project, drag-free reordering via up/down controls, cover-image selection, alt text and captions, and 8 MB/file size limit (configurable) with rate limiting on the upload endpoints.

**Public portfolio:** responsive grid layouts, only-if-present rendering of every optional case-study section (nothing shows "N/A" or lorem ipsum), lazy-loaded images, and a design system with no gradients, no glassmorphism, no emoji icons, and full `prefers-reduced-motion` support.

**Legal pages:** `/privacy`, `/terms`, `/cookies`, `/refund-policy` are written to accurately describe *this specific implementation* (what data is actually collected, which two cookies actually exist, that no payment system exists by default) rather than generic boilerplate — but they are plain React pages, not yet editable from the admin, and **should be reviewed by a qualified professional** before you rely on them, especially if you'll process EU/UK or California visitors' data at any volume.

**Cookie system:** exactly two cookies exist — the session cookie and the CSRF cookie — both strictly necessary, both undocumented-tracking-free. No consent banner is implemented because nothing non-essential is set; if you add analytics later, add the banner at the same time.

**Tracking / third-party services:** none. No analytics, no pixels, no external fonts, no CDNs are wired in. The CSP in `security.js` intentionally only allows `'self'` for scripts and styles — you'll need to loosen it deliberately (and document why) if you add something.

**Security controls implemented:** helmet security headers (CSP, no-referrer, frame-ancestors none, etc.), CORS with an explicit origin whitelist (no wildcard, credentials scoped), CSRF double-submit protection on all mutating requests, parameterized queries throughout (better-sqlite3 prepared statements, no string-concatenated SQL), input validation via `express-validator`, output sanitization via `sanitize-html` on stored text fields as defense-in-depth (React also escapes on render), rate limiting per endpoint class (login, contact, uploads, general API), safe/random upload filenames with path-traversal-proof storage, a central error handler that never returns stack traces or internal paths, and IP addresses hashed (never stored raw) on contact submissions.

**Accessibility:** semantic HTML, labeled form fields, visible focus states, a skip-to-content link, keyboard-operable controls throughout (no click-only interactions), and meaningful alt text fields for every image — but this was **designed for accessibility, not independently audited** with a screen reader or an automated tool like axe. Run one before shipping.

**SEO:** per-page titles/descriptions/canonical URLs/Open Graph tags via a small custom `Seo` component, `robots.txt` disallowing `/admin`, and `noindex` on every admin and legal page. **Not implemented:** a generated `sitemap.xml` and server-side rendering/prerendering. This is a client-rendered SPA, which means project pages exist in the DOM after JavaScript runs, not in the initial HTML — most modern crawlers handle this, but if search visibility of individual project pages matters a lot to you, consider adding a prerendering step (e.g. `vite-plugin-ssr`, or migrating the public site to Next.js) as a follow-up.

**Performance:** images are resized/optimized server-side on upload, lazy-loaded on the frontend, and no unnecessary dependencies are pulled in (no UI kit, no animation library, no icon font). Not done: a Lighthouse pass or bundle-size audit — do one after your first real deploy with real images.

**Dependency and git-secret audit:** I could not actually run `npm audit`, `npm install`, or inspect a git history in this environment — there is no network access available to me here, and no git repository has been initialized yet. Run `npm audit` in both `backend/` and `frontend/` after your first `npm install`, and run a secret scanner (e.g. `git secrets` or `trufflehog`) before your first push, especially if you ever hand-edit `.env` into a commit by mistake.

**Environment variables:** every secret/URL is externalized to `.env` (see `.env.example` in both folders) — nothing is hardcoded, and the server refuses to start if `JWT_SECRET` or `FRONTEND_URL` is missing.

**API security:** every admin route checks authentication; ownership checks scope image operations to their parent project (`project_id` is always part of the WHERE clause); no endpoint returns another admin's data because there is intentionally only one admin account in this design — if you need multiple admin users later, that's a schema and authorization change, not a config toggle.

**CORS configuration:** locked to the exact origin(s) in `FRONTEND_URL`; credentialed requests are never allowed from an unlisted origin.

**Security headers:** set via helmet in `backend/src/middleware/security.js` — review the CSP directives there before adding any third-party script, since it will silently block anything not explicitly allowed.

**Tests performed:** none were executed against a running instance, because this sandbox has no network access and could not run `npm install` or boot either server. The code was written and reviewed carefully, and known footguns (like better-sqlite3 rejecting `undefined` bind parameters) were fixed during writing, but **you should treat this as unverified until you run it yourself.** Before trusting it with real client data: run both servers locally, walk through login, add-project-with-images, publish, and contact-form flows by hand, and check the browser console and network tab for errors.

**Problems discovered and fixed during the build:** better-sqlite3's rejection of `undefined` bind parameters was caught and fixed by explicitly defaulting optional text fields; the CSRF cookie needed to be non-httpOnly by design (so the frontend can read and echo it) while the session cookie needed to stay httpOnly — both are handled correctly but worth understanding if you extend the auth system.

**Remaining manual configuration before launch:**
- Fill in your real name, title, bio and links in Admin → Profile Settings — the homepage explicitly tells visitors this is missing until you do.
- Add your real categories and technologies before adding projects.
- Replace `frontend/public/favicon.svg` with your real mark.
- Decide your actual contact-data retention period and act on it periodically from Admin → Messages (there's no auto-delete).
- Have the legal pages reviewed for your actual jurisdiction(s).
- Generate a real `JWT_SECRET` (the command is in `.env.example`) — do not ship the placeholder.

**Deployment requirements:** Node 18+ runtime, a writable disk for `data/portfolio.db` and `uploads/`, HTTPS in front of the app (required for `COOKIE_SECURE=true` to work at all), and a process manager (pm2, systemd, or your host's equivalent) to keep the Node process running and restart it on crash.

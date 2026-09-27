require("dotenv").config();

const Database = require("better-sqlite3");
const { Client } = require("pg");

const sqlite = new Database("./data/portfolio.db");

const pg = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function insertRows(client, table, columns, rows) {
  if (!rows.length) {
    console.log(`${table}: 0 rows`);
    return;
  }

  for (const row of rows) {
    const values = columns.map((column) => row[column]);

    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")})
       VALUES (${placeholders})`,
      values
    );
  }

  console.log(`${table}: ${rows.length} rows`);
}

async function migrate() {
  try {
    console.log("Connecting to Supabase...");
    await pg.connect();

    console.log("Connected successfully.");

    await pg.query("BEGIN");

    // Clear existing data so this migration can be safely rerun.
    await pg.query(`
      TRUNCATE TABLE
        project_technologies,
        project_images,
        project_features,
        projects,
        experience,
        services,
        settings,
        technologies,
        categories,
        contact_submissions,
        admins
      RESTART IDENTITY CASCADE
    `);

    // ADMINS
    await insertRows(
      pg,
      "admins",
      ["id", "email", "password_hash", "created_at"],
      sqlite.prepare("SELECT id, email, password_hash, created_at FROM admins").all()
    );

    // CATEGORIES
    await insertRows(
      pg,
      "categories",
      ["id", "name", "slug", "display_order"],
      sqlite
        .prepare("SELECT id, name, slug, display_order FROM categories")
        .all()
    );

    // TECHNOLOGIES
    await insertRows(
      pg,
      "technologies",
      ["id", "name", "category", "display_order"],
      sqlite
        .prepare(
          "SELECT id, name, category, display_order FROM technologies"
        )
        .all()
    );

    // SETTINGS
    await insertRows(
      pg,
      "settings",
      [
        "id",
        "name",
        "title",
        "bio",
        "value_proposition",
        "email",
        "phone",
        "location",
        "github_url",
        "linkedin_url",
        "other_links",
        "profile_image",
        "resume_url",
        "updated_at",
      ],
      sqlite
        .prepare(`
          SELECT
            id,
            name,
            title,
            bio,
            value_proposition,
            email,
            phone,
            location,
            github_url,
            linkedin_url,
            other_links,
            profile_image,
            resume_url,
            updated_at
          FROM settings
        `)
        .all()
    );

    // SERVICES
    await insertRows(
      pg,
      "services",
      ["id", "title", "description", "display_order", "active"],
      sqlite
        .prepare(
          "SELECT id, title, description, display_order, active FROM services"
        )
        .all()
    );

    // EXPERIENCE
    await insertRows(
      pg,
      "experience",
      [
        "id",
        "organization",
        "role",
        "start_date",
        "end_date",
        "description",
        "display_order",
      ],
      sqlite
        .prepare(`
          SELECT
            id,
            organization,
            role,
            start_date,
            end_date,
            description,
            display_order
          FROM experience
        `)
        .all()
    );

    // PROJECTS
    await insertRows(
      pg,
      "projects",
      [
        "id",
        "title",
        "slug",
        "short_description",
        "full_description",
        "category_id",
        "status",
        "featured",
        "project_url",
        "github_url",
        "case_study_url",
        "project_date",
        "client_type",
        "challenges",
        "solution",
        "results",
        "seo_title",
        "seo_description",
        "cover_image",
        "display_order",
        "created_at",
        "updated_at",
      ],
      sqlite
        .prepare(`
          SELECT
            id,
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
            cover_image,
            display_order,
            created_at,
            updated_at
          FROM projects
        `)
        .all()
    );

    // PROJECT FEATURES
    await insertRows(
      pg,
      "project_features",
      ["id", "project_id", "feature_text", "display_order"],
      sqlite
        .prepare(`
          SELECT
            id,
            project_id,
            feature_text,
            display_order
          FROM project_features
        `)
        .all()
    );

    // PROJECT IMAGES
    await insertRows(
      pg,
      "project_images",
      [
        "id",
        "project_id",
        "filename",
        "alt_text",
        "caption",
        "is_cover",
        "display_order",
      ],
      sqlite
        .prepare(`
          SELECT
            id,
            project_id,
            filename,
            alt_text,
            caption,
            is_cover,
            display_order
          FROM project_images
        `)
        .all()
    );

    // PROJECT TECHNOLOGIES
    await insertRows(
      pg,
      "project_technologies",
      ["project_id", "technology_id"],
      sqlite
        .prepare(`
          SELECT
            project_id,
            technology_id
          FROM project_technologies
        `)
        .all()
    );

    // CONTACT SUBMISSIONS
    await insertRows(
      pg,
      "contact_submissions",
      [
        "id",
        "name",
        "email",
        "company",
        "project_type",
        "budget_range",
        "message",
        "ip_hash",
        "created_at",
      ],
      sqlite
        .prepare(`
          SELECT
            id,
            name,
            email,
            company,
            project_type,
            budget_range,
            message,
            ip_hash,
            created_at
          FROM contact_submissions
        `)
        .all()
    );

    // Reset PostgreSQL sequences so future INSERTs continue
    // after the migrated IDs.
   // Reset PostgreSQL identity sequences so future INSERTs
// continue after the migrated IDs.
const sequenceTables = [
  "admins",
  "categories",
  "technologies",
  "services",
  "experience",
  "projects",
  "project_features",
  "project_images",
  "contact_submissions",
];

for (const table of sequenceTables) {
  const result = await pg.query(
    `SELECT MAX(id) AS max_id FROM ${table}`
  );

  const maxId = result.rows[0].max_id;

  if (maxId === null) {
    await pg.query(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        1,
        false
      )
    `);
  } else {
    await pg.query(
      `
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        $1,
        true
      )
      `,
      [maxId]
    );
  }
}
    await pg.query("COMMIT");

    console.log("");
    console.log("====================================");
    console.log("MIGRATION COMPLETED SUCCESSFULLY");
    console.log("====================================");

  } catch (error) {
    console.error("");
    console.error("MIGRATION FAILED");
    console.error(error);

    try {
      await pg.query("ROLLBACK");
    } catch (_) {}

    process.exitCode = 1;
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate();
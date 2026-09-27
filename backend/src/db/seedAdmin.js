require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env before seeding.'
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error(
      'ADMIN_PASSWORD should be at least 12 characters. Choose a stronger password.'
    );
    process.exit(1);
  }

  try {
    const existing = await db.get(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (existing) {
      console.log(
        `Admin with email ${email} already exists. No changes made.`
      );
      console.log(
        'To reset the password, delete the row manually from the admins table and re-run this script.'
      );
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);

    await db.query(
      'INSERT INTO admins (email, password_hash) VALUES ($1, $2)',
      [email, hash]
    );

    console.log(`Admin account created for ${email}.`);
    console.log(
      'You can now remove ADMIN_PASSWORD from .env if you prefer not to keep it there.'
    );

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed admin account:', error);
    process.exit(1);
  }
}

seed();
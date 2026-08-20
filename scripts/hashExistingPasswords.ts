/**
 * One-off migration script: hashes any plaintext passwords still stored in the `users` table.
 *
 * Safe to re-run: rows whose `password` already looks like a bcrypt hash (starts with
 * $2a$, $2b$ or $2y$) are skipped.
 *
 * Usage: tsx --env-file .env scripts/hashExistingPasswords.ts
 */
import db, { connection } from '#database/db.js';
import bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 12;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$/;

interface UserRow {
  id: number;
  password: string;
}

async function run() {
  const users = (await db.query(`SELECT SQL_NO_CACHE id, password FROM users WHERE id != 4`, [])) as UserRow[];

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.password || BCRYPT_HASH_REGEX.test(user.password)) {
      skipped++;
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, BCRYPT_SALT_ROUNDS);
    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, user.id]);
    updated++;
  }

  console.log(`Done. Hashed ${updated} password(s), skipped ${skipped} already-hashed password(s).`);
}

run()
  .catch((error: unknown) => {
    console.error('Failed to hash existing passwords:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void connection.end();
  });

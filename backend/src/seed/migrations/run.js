/**
 * Migration runner. Executes every migration in this folder (in filename order)
 * against the database in MONGO_URI. Each migration exports an async `up(db)`
 * function and MUST be idempotent — safe to run repeatedly.
 *
 * Usage: node src/seed/migrations/run.js   (or: npm run migrate)
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load .env regardless of the directory this is invoked from. Mirrors server.js:
// the project keeps its .env at backend/src/.env.
const candidates = [
  path.join(__dirname, '../../.env'), // backend/src/.env
  path.join(__dirname, '../../../.env'), // backend/.env
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'src/.env'),
];
const envPath = candidates.find((p) => fs.existsSync(p));
dotenv.config(envPath ? { path: envPath } : undefined);

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set.');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for migrations.\n');

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => /^\d+.*\.js$/.test(f) && f !== path.basename(__filename))
    .sort();

  for (const file of files) {
    const migration = require(path.join(__dirname, file));
    if (typeof migration.up !== 'function') {
      console.warn(`Skipping ${file} — no up() export.`);
      continue;
    }
    process.stdout.write(`→ ${file} ... `);
    // eslint-disable-next-line no-await-in-loop
    await migration.up(mongoose.connection);
    console.log('done');
  }

  console.log('\nAll migrations complete.');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (err) => {
  console.error('\nMigration failed:', err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});

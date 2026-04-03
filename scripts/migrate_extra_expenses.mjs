import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = readFileSync('./drizzle/0018_clever_queen_noir.sql', 'utf8');
const stmts = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

for (const stmt of stmts) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 60));
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('Duplicate')) {
      console.log('SKIP (already exists)');
    } else {
      console.error('ERROR:', e.message);
      throw e;
    }
  }
}

await conn.end();
console.log('Migration done!');

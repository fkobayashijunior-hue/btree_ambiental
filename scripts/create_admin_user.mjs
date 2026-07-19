import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const email = 'fkobayashijunior@gmail.com';
const password = 'Btree@2024';
const name = 'Fábio Kobayashi';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não encontrada no ambiente');
  process.exit(1);
}

console.log('Conectando ao banco...');
const conn = await mysql.createConnection(dbUrl);

const hash = await bcrypt.hash(password, 10);
console.log('Hash gerado');

const [rows] = await conn.execute('SELECT id, email FROM users WHERE email = ?', [email]);
console.log('Usuário existente:', rows);

if (rows.length === 0) {
  await conn.execute(
    'INSERT INTO users (name, email, loginMethod, role, password_hash, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
    [name, email, 'email', 'admin', hash]
  );
  console.log('✅ Usuário criado com sucesso!');
} else {
  await conn.execute(
    'UPDATE users SET password_hash = ?, loginMethod = ?, role = ?, name = ? WHERE email = ?',
    [hash, 'email', 'admin', name, email]
  );
  console.log('✅ Senha e role atualizados com sucesso!');
}

const [check] = await conn.execute('SELECT id, name, email, role, loginMethod FROM users WHERE email = ?', [email]);
console.log('Usuário no banco:', check);

await conn.end();

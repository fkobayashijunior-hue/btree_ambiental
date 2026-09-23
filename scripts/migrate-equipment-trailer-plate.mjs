import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
dotenv.config({path:process.env.BTREE_ENV_FILE||'.env',quiet:true});
const mode=process.argv[2]||'inspect';assert(['inspect','apply','verify'].includes(mode));
const db=await mysql.createConnection(process.env.DB_HOST?{host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306),dateStrings:true}:{uri:process.env.DATABASE_URL,dateStrings:true});
try{
 const [columns]=await db.execute("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='equipment' AND COLUMN_NAME='trailer_plate'");
 if(mode==='inspect'){const [[count]]=await db.query('SELECT COUNT(*) AS count FROM equipment');console.log('INSPECT',JSON.stringify({equipmentCount:count.count,columnExists:columns.length>0}));}
 else if(mode==='verify'||columns.length){assert.equal(columns.length,1);assert.equal(columns[0].COLUMN_TYPE,'varchar(8)');assert.equal(columns[0].IS_NULLABLE,'YES');console.log('COLUMN_VERIFIED — trailer_plate opcional varchar(8).');}
 else{
  const [rows]=await db.query('SELECT * FROM equipment ORDER BY id');const [ddl]=await db.query('SHOW CREATE TABLE equipment');
  const directory=path.join('/root/btree-backups','equipment-trailer-'+new Date().toISOString().replace(/[:.]/g,'-'));
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,'before.json');await fs.writeFile(file,JSON.stringify({createdAt:new Date().toISOString(),ddl,rows},null,2),{mode:0o600,flag:'wx'});
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).rows.length,rows.length);
  await db.query('ALTER TABLE equipment ADD COLUMN trailer_plate VARCHAR(8) NULL');
  const [after]=await db.query('SELECT * FROM equipment ORDER BY id');assert(after.every(row=>row.trailer_plate===null),'Nenhuma placa deve ser inventada na migração.');
  assert.deepEqual(after.map(({trailer_plate,...rest})=>rest),rows,'Dados existentes mudaram durante a migração; revisar.');
  await fs.writeFile(path.join(directory,'verified.json'),JSON.stringify({verifiedAt:new Date().toISOString(),recordsPreserved:rows.length,trailerPlate:null},null,2),{mode:0o600});
  console.log('MIGRATION_OK',JSON.stringify({recordsPreserved:rows.length,backupDirectory:directory,noPlateInvented:true}));
 }
}catch(e){console.error('MIGRATION_ERROR',e.code||e.name,e.message);process.exitCode=1;}finally{await db.end();}

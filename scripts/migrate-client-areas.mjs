import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
dotenv.config({path:process.env.BTREE_ENV_FILE || '.env',quiet:true});
const mode=process.argv[2]||'inspect';
if(!['inspect','migrate','seed-luciano'].includes(mode)) throw new Error('Use inspect, migrate ou seed-luciano.');
const db=await mysql.createConnection(process.env.DB_HOST ? {host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306)} : process.env.DATABASE_URL);
const affected=['clients','gps_locations','cargo_loads','cargo_weekly_closings','client_advances','client_advance_deductions','client_payments','client_documents','replanting_records','financial_entries'];
async function exists(table,column){const [rows]=await db.query('SHOW COLUMNS FROM ?? LIKE ?',[table,column]);return rows.length>0;}
async function add(table,column,type){if(!await exists(table,column)){await db.query('ALTER TABLE ?? ADD COLUMN ?? '+type,[table,column]);console.log('ADDED',table,column);}}
try {
  if(mode==='inspect') {
    for(const table of affected){const [[row]]=await db.query('SELECT COUNT(*) AS n FROM ??',[table]);console.log(table,row.n);}
    const [areas]=await db.query("SHOW TABLES LIKE 'client_areas'");console.log('areas_table',areas.length>0);
  }
  if(mode==='migrate') {
    const directory=path.join(process.env.BTREE_BACKUP_DIR||'/root/btree-backups',`client-areas-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    await fs.mkdir(directory,{recursive:true,mode:0o700});
    await db.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    for(const table of affected){
      const [ddl]=await db.query('SHOW CREATE TABLE ??',[table]);
      const [rows]=await db.query('SELECT * FROM ??',[table]);
      await fs.writeFile(path.join(directory,table+'.json.gz'),gzipSync(JSON.stringify({table,ddl:ddl[0]['Create Table'],rows})),{mode:0o600});
      console.log('BACKUP',table,rows.length);
    }
    await db.commit();
    console.log('BACKUP_DIRECTORY',directory);
    await db.query(`CREATE TABLE IF NOT EXISTS client_areas (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,client_id INT NOT NULL,name VARCHAR(255) NOT NULL,
      field_name VARCHAR(255) NULL,work_location_id INT NOT NULL,
      agreement_status ENUM('pending','confirmed') NOT NULL DEFAULT 'pending',unit ENUM('ton','m3') NULL,
      unit_price VARCHAR(20) NULL,payment_method VARCHAR(100) NULL,payment_term_days INT NULL,billing_cycle VARCHAR(30) NULL,
      notes TEXT NULL,is_active TINYINT NOT NULL DEFAULT 1,created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY client_areas_location_unique(work_location_id),KEY client_areas_client_idx(client_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    for(const table of ['cargo_loads','cargo_weekly_closings','client_advances','client_payments','client_documents','replanting_records','financial_entries']) await add(table,'area_id','INT NULL');
    await add('cargo_loads','agreed_unit',"ENUM('ton','m3') NULL");
    await add('cargo_loads','agreed_unit_price','VARCHAR(20) NULL');
    await add('cargo_loads','agreed_payment_method','VARCHAR(100) NULL');
    await add('cargo_loads','agreed_payment_term_days','INT NULL');
    await add('cargo_weekly_closings','area_scope_key','INT NOT NULL DEFAULT 0');
    await add('cargo_weekly_closings','price_unit',"ENUM('ton','m3') NOT NULL DEFAULT 'ton'");
    await add('cargo_weekly_closings','total_volume_m3','VARCHAR(20) NULL');
    const [paymentColumns]=await db.query("SHOW COLUMNS FROM financial_entries LIKE 'payment_method'");
    if(!String(paymentColumns[0]?.Type).startsWith('varchar')) {
      await db.query("ALTER TABLE financial_entries MODIFY payment_method VARCHAR(100) NOT NULL DEFAULT 'pix'");
      console.log('UPDATED financial_entries payment_method — valores existentes preservados');
    }
    const [indexes]=await db.query('SHOW INDEX FROM cargo_weekly_closings');
    const target='cargo_weekly_closings_client_area_week_unique';
    if(!indexes.some(x=>x.Key_name===target)) await db.query(`ALTER TABLE cargo_weekly_closings ADD UNIQUE INDEX ${target} (client_id,area_scope_key,week_start)`);
    // Remove only the previous known uniqueness rule, after its replacement is present.
    if(indexes.some(x=>x.Key_name==='cargo_weekly_closings_client_week_unique')) await db.query('ALTER TABLE cargo_weekly_closings DROP INDEX cargo_weekly_closings_client_week_unique');
    console.log('MIGRATION_OK — registros antigos preservados, area_id NULL.');
  }
  if(mode==='seed-luciano') {
    await db.beginTransaction();
    try {
      const [clients]=await db.query("SELECT id,name FROM clients WHERE id=7 AND name='Luciano Ribeiro' FOR UPDATE");
      if(clients.length!==1) throw new Error('Cliente Luciano não corresponde ao cadastro validado.');
      const [already]=await db.query("SELECT id,work_location_id,agreement_status FROM client_areas WHERE client_id=7 AND name='Área 2'");
      if(already.length){console.log('AREA_ALREADY_EXISTS',JSON.stringify(already[0]));}
      else {
        const [loc]=await db.execute("INSERT INTO gps_locations (name,latitude,longitude,radius_meters,is_active,client_id,notes) VALUES (?,'','',2000,1,7,?)",['Luciano Ribeiro — Área 2','Local de custos da Área 2. GPS ainda não informado; sem detecção automática.']);
        const [area]=await db.execute("INSERT INTO client_areas (client_id,name,work_location_id,agreement_status,notes) VALUES (7,'Área 2',?,'pending',?)",[loc.insertId,'Acordos comerciais aguardam confirmação do responsável. Não herdar valores ou adiantamentos da área anterior.']);
        console.log('AREA_CREATED',JSON.stringify({areaId:area.insertId,workLocationId:loc.insertId,status:'pending'}));
      }
      await db.commit();
    } catch(e){await db.rollback();throw e;}
  }
} catch(e){console.error('OPERATION_FAILED',e.code||e.name,e.message?.replace(/password[^\s]*/gi,'[redacted]'));process.exitCode=1;}
finally {await db.end();}

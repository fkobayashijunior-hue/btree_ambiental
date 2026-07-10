import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Force override system env vars with .env file values
// This is needed because Hostinger/LiteSpeed sets env vars at process level
// and dotenv/config doesn't override existing vars by default
try {
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath, override: true });
  console.log('[ENV] Loaded .env with override from:', envPath);
} catch(e) {
  console.log('[ENV] No .env override:', e);
}

import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStorageProxy } from "./storageProxy";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runAutoMigrations() {
  try {
    const { getDb } = await import('../db');
    const db = await getDb();
    if (!db) return;
    
    // Create buyer_clients table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS buyer_clients (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        cnpj_cpf varchar(30),
        inscricao_estadual varchar(30),
        phone varchar(30),
        email varchar(255),
        address text,
        city varchar(100),
        state varchar(2),
        cep varchar(10),
        contact_person varchar(255),
        product varchar(255),
        payment_method varchar(100),
        price_per_unit varchar(20),
        unit varchar(20) DEFAULT 'ton',
        notes text,
        active tinyint NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_clients_id PRIMARY KEY(id)
      )
    `);
    
    // Create buyer_price_history table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS buyer_price_history (
        id int AUTO_INCREMENT NOT NULL,
        buyer_id int NOT NULL,
        product varchar(255) NOT NULL,
        price_per_unit varchar(20) NOT NULL,
        unit varchar(20) NOT NULL DEFAULT 'ton',
        valid_from varchar(10),
        valid_until varchar(10),
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_price_history_id PRIMARY KEY(id)
      )
    `);
    
    // Create buyer_payments table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS buyer_payments (
        id int AUTO_INCREMENT NOT NULL,
        buyer_id int NOT NULL,
        amount varchar(20) NOT NULL,
        payment_date varchar(10) NOT NULL,
        payment_method varchar(50),
        invoice_number varchar(50),
        notes text,
        status enum('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT buyer_payments_id PRIMARY KEY(id)
      )
    `);
    
    // Create freight_calculations table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS freight_calculations (
        id int AUTO_INCREMENT NOT NULL,
        cargo_load_id int,
        date varchar(10) NOT NULL,
        vehicle_plate varchar(20),
        driver_name varchar(255),
        driver_type enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
        origin varchar(255),
        destination varchar(255),
        distance_km varchar(20),
        fuel_liters varchar(20),
        fuel_cost_per_liter varchar(20),
        fuel_total_cost varchar(20),
        driver_cost varchar(20),
        toll_cost varchar(20),
        maintenance_cost varchar(20),
        other_costs varchar(20),
        other_costs_description text,
        total_cost varchar(20),
        cost_per_km varchar(20),
        cost_per_ton varchar(20),
        weight_ton varchar(20),
        revenue_per_ton varchar(20),
        total_revenue varchar(20),
        profit varchar(20),
        notes text,
        created_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT freight_calculations_id PRIMARY KEY(id)
      )
    `);
    
    // Add price_per_unit and unit columns to buyer_clients if they don't exist
    try {
      await db.execute(/*sql*/`ALTER TABLE buyer_clients ADD COLUMN price_per_unit varchar(20)`);
    } catch(e) { /* column already exists */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE buyer_clients ADD COLUMN unit varchar(20) DEFAULT 'ton'`);
    } catch(e) { /* column already exists */ }
    
    // Create client_documents table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS client_documents (
        id int AUTO_INCREMENT NOT NULL,
        client_id int NOT NULL,
        type enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
        title varchar(255) NOT NULL,
        file_url varchar(1000) NOT NULL,
        file_type varchar(50),
        notes text,
        uploaded_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT client_documents_id PRIMARY KEY(id)
      )
    `);
    
    // Also fix client_documents: drop FK on uploaded_by if exists
    try {
      await db.execute(/*sql*/`ALTER TABLE client_documents DROP FOREIGN KEY client_documents_ibfk_1`);
    } catch(e) { /* FK doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE client_documents DROP FOREIGN KEY client_documents_uploaded_by_users_id_fk`);
    } catch(e) { /* FK doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE client_documents DROP FOREIGN KEY client_documents_client_id_clients_id_fk`);
    } catch(e) { /* FK doesn't exist */ }
    
    // Add password_hash column to users table if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE users ADD COLUMN password_hash varchar(255)`);
      console.log('[AutoMigration] Added password_hash column to users');
    } catch(e) { /* column already exists */ }
    
    // Add lastSignedIn column to users table if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE users ADD COLUMN lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    } catch(e) { /* column already exists */ }
    
    // Add loginMethod column to users table if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE users ADD COLUMN loginMethod varchar(64) NOT NULL DEFAULT 'email'`);
    } catch(e) { /* column already exists */ }
    
    // Create fuel_suppliers table if not exists (with complete fields)
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS fuel_suppliers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        trade_name varchar(255),
        cnpj varchar(20),
        phone varchar(30),
        email varchar(255),
        contact_name varchar(255),
        address text,
        city varchar(100),
        state varchar(2),
        fuel_type enum('diesel','gasolina','etanol','gnv') NOT NULL DEFAULT 'diesel',
        price_per_liter varchar(20) NOT NULL,
        location_type enum('simflor','astorga','postos') NOT NULL DEFAULT 'simflor',
        location varchar(255),
        work_location_id int,
        is_active tinyint NOT NULL DEFAULT 1,
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fuel_suppliers_id PRIMARY KEY(id)
      )
    `);

    // Add new columns to fuel_suppliers if they don't exist
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN trade_name varchar(255)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN cnpj varchar(20)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN phone varchar(30)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN email varchar(255)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN contact_name varchar(255)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN address text`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN city varchar(100)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN state varchar(2)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN location_type enum('simflor','astorga','postos') NOT NULL DEFAULT 'simflor'`); } catch(e) {}

    // Add missing columns to cargo_loads if not exists
    const cargoColsToAdd = [
      { col: 'humidity', def: 'varchar(20)' },
      { col: 'delivery_date', def: 'timestamp NULL' },
      { col: 'received_by_buyer', def: 'varchar(255)' },
      { col: 'received_at', def: 'timestamp NULL' },
      { col: 'weight_net_kg', def: 'varchar(20)' },
      { col: 'weight_in_kg', def: 'varchar(20)' },
      { col: 'weight_out_kg', def: 'varchar(20)' },
      { col: 'weight_in_photo_url', def: 'text' },
      { col: 'weight_out_photo_url', def: 'text' },
      { col: 'tracking_status', def: "varchar(50) DEFAULT 'em_carregamento'" },
      { col: 'tracking_notes', def: 'text' },
      { col: 'tracking_updated_at', def: 'timestamp NULL' },
      { col: 'photos_json', def: 'text' },
      { col: 'boleto_amount', def: 'varchar(20)' },
      { col: 'boleto_due_date', def: 'timestamp NULL' },
      { col: 'boleto_url', def: 'text' },
      { col: 'paid_at', def: 'timestamp NULL' },
      { col: 'payment_status', def: "varchar(30) DEFAULT 'pendente'" },
      { col: 'payment_receipt_url', def: 'text' },
      { col: 'invoice_url', def: 'text' },
      { col: 'final_height_m', def: 'varchar(20)' },
      { col: 'final_width_m', def: 'varchar(20)' },
      { col: 'final_length_m', def: 'varchar(20)' },
      { col: 'final_volume_m3', def: 'varchar(20)' },
      { col: 'images_urls', def: 'text' },
      { col: 'receiver_name', def: 'varchar(255)' },
      { col: 'third_party_contractor', def: 'varchar(255)' },
      { col: 'third_party_cost', def: 'varchar(20)' },
    ];
    for (const { col, def } of cargoColsToAdd) {
      try {
        await db.execute(/*sql*/`ALTER TABLE cargo_loads ADD COLUMN ${col} ${def}`);
        console.log(`[AutoMigration] Added ${col} column to cargo_loads`);
      } catch(e) { /* column already exists */ }
    }
    
    // Add cargo_load_id and auto_generated columns to financial_entries
    try {
      await db.execute(/*sql*/`ALTER TABLE financial_entries ADD COLUMN cargo_load_id int`);
    } catch(e) { /* column already exists */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE financial_entries ADD COLUMN auto_generated int DEFAULT 0`);
    } catch(e) { /* column already exists */ }

    // Create fuel_price_history table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS fuel_price_history (
        id int AUTO_INCREMENT NOT NULL,
        supplier_id int NOT NULL,
        old_price varchar(20) NOT NULL,
        new_price varchar(20) NOT NULL,
        changed_by int,
        changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fuel_price_history_id PRIMARY KEY(id)
      )
    `);

    // Create fuel_invoices table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS fuel_invoices (
        id int AUTO_INCREMENT NOT NULL,
        supplier_id int NOT NULL,
        invoice_number varchar(50) NOT NULL,
        invoice_date varchar(10) NOT NULL,
        due_date varchar(10) NOT NULL,
        total_amount varchar(20) NOT NULL,
        liters varchar(20),
        price_per_liter varchar(20),
        fuel_type enum('diesel','gasolina','etanol','gnv') DEFAULT 'diesel',
        payment_method varchar(50),
        bank_name varchar(100),
        barcode_number varchar(100),
        status enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
        paid_at varchar(10),
        paid_amount varchar(20),
        transporter_name varchar(255),
        transporter_plate varchar(20),
        delivery_location varchar(100),
        notes text,
        registered_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fuel_invoices_id PRIMARY KEY(id)
      )
    `);

    // Add invoice_photo_url column if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE fuel_invoices ADD COLUMN invoice_photo_url text`);
    } catch(e: any) { if (!e.message?.includes('Duplicate')) console.log('[AutoMigration] invoice_photo_url:', e.message); }

    // Add boleto_photo_url column if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE fuel_invoices ADD COLUMN boleto_photo_url text`);
    } catch(e: any) { if (!e.message?.includes('Duplicate')) console.log('[AutoMigration] boleto_photo_url:', e.message); }

    // Add fuel_invoice_id column to vehicle_records for linking fueling to invoices
    try {
      await db.execute(/*sql*/`ALTER TABLE vehicle_records ADD COLUMN fuel_invoice_id int`);
    } catch(e) { /* column already exists */ }

    // Add tank_capacity and tank_alert_threshold to fuel_suppliers for tank level monitoring
    try {
      await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN tank_capacity varchar(20)`);
    } catch(e) { /* column already exists */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN tank_alert_threshold varchar(5) DEFAULT '20'`);
    } catch(e) { /* column already exists */ }

    // Add liters_used column to fuel_invoices to track consumed liters
    try {
      await db.execute(/*sql*/`ALTER TABLE fuel_invoices ADD COLUMN liters_used varchar(20) DEFAULT '0'`);
    } catch(e) { /* column already exists */ }

    // Drop FK constraints on cargo_loads that reference wrong/empty tables
    // vehicle_id should NOT reference equipment (user uses trucks table)
    // driver_collaborator_id should NOT reference collaborators (user uses separate driver system)
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_vehicle_id_equipment_id_fk`);
      console.log('[AutoMigration] Dropped FK cargo_loads_vehicle_id_equipment_id_fk');
    } catch(e) { /* constraint already dropped or doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_driver_collaborator_id_collaborators_id_fk`);
      console.log('[AutoMigration] Dropped FK cargo_loads_driver_collaborator_id_collaborators_id_fk');
    } catch(e) { /* constraint already dropped or doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_client_id_clients_id_fk`);
      console.log('[AutoMigration] Dropped FK cargo_loads_client_id_clients_id_fk');
    } catch(e) { /* constraint already dropped or doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_registered_by_users_id_fk`);
      console.log('[AutoMigration] Dropped FK cargo_loads_registered_by_users_id_fk');
    } catch(e) { /* constraint already dropped or doesn't exist */ }
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_destination_id_cargo_destinations_id_fk`);
      console.log('[AutoMigration] Dropped FK cargo_loads_destination_id_cargo_destinations_id_fk');
    } catch(e) { /* constraint already dropped or doesn't exist */ }
    // Drop ALL remaining FK constraints on cargo_loads to prevent any future issues
    try {
      const fks: any = await db.execute(/*sql*/`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `);
      const fkList = Array.isArray(fks) ? fks : [];
      for (const fk of fkList) {
        if (fk && fk.CONSTRAINT_NAME) {
          try {
            await db.execute(/*sql*/`ALTER TABLE cargo_loads DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
            console.log('[AutoMigration] Dropped remaining FK:', fk.CONSTRAINT_NAME);
          } catch(e) { /* already dropped */ }
        }
      }
    } catch(e: any) { console.log('[AutoMigration] Could not query remaining FKs:', e?.message); }

    // Create third_party_contractors table if not exists
    try {
      await db.execute(/*sql*/`
        CREATE TABLE IF NOT EXISTS third_party_contractors (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(255) NOT NULL,
          rate_per_m3 varchar(20) NOT NULL DEFAULT '0',
          phone varchar(30),
          notes text,
          is_active tinyint NOT NULL DEFAULT 1,
          created_by int,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT third_party_contractors_id PRIMARY KEY(id)
        )
      `);
    } catch(e) { /* table already exists */ }

    // Add new columns to cargo_destinations if they don't exist
    try { await db.execute(/*sql*/`ALTER TABLE cargo_destinations ADD COLUMN client_id int NULL`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE cargo_destinations ADD COLUMN price_per_ton varchar(20) NULL`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE cargo_destinations ADD COLUMN price_per_m3 varchar(20) NULL`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE cargo_destinations ADD COLUMN price_type varchar(10) NULL DEFAULT 'ton'`); } catch(e) {}

    // Add vendor_name and manager_name to fuel_suppliers
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN vendor_name varchar(255)`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE fuel_suppliers ADD COLUMN manager_name varchar(255)`); } catch(e) {}

    // Add document columns to equipment
    try { await db.execute(/*sql*/`ALTER TABLE equipment ADD COLUMN invoice_url text`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE equipment ADD COLUMN document_url text`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE equipment ADD COLUMN insurance_url text`); } catch(e) {}
    try { await db.execute(/*sql*/`ALTER TABLE equipment ADD COLUMN responsible_driver_id int`); } catch(e) {}

    // Add debito to extra_expenses payment_method enum
    try { await db.execute(/*sql*/`ALTER TABLE extra_expenses MODIFY COLUMN payment_method enum('dinheiro','pix','credito','debito','transferencia','boleto','outros') NOT NULL DEFAULT 'pix'`); } catch(e) {}

    // Create oil_stock table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS oil_stock (
        id int AUTO_INCREMENT NOT NULL,
        oil_type enum('hidraulico','motor','transmissao','diferencial','outros') NOT NULL DEFAULT 'hidraulico',
        brand varchar(255) NOT NULL,
        quantity_liters varchar(20) NOT NULL DEFAULT '0',
        purchase_quantity_liters varchar(20),
        price_per_liter varchar(20),
        total_value varchar(20),
        photo_url text,
        supplier varchar(255),
        notes text,
        registered_by int,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT oil_stock_id PRIMARY KEY(id)
      )
    `);

    console.log('[AutoMigration] Tables verified/created successfully');
  } catch (err) {
    console.error('[AutoMigration] Error:', err);
  }
}

async function startServer() {
  // Run auto-migrations before starting
  await runAutoMigrations();
  
  const app = express();
  const server = createServer(app);
  
  // Configure CORS to allow requests from frontend domain
  app.use(cors({
    origin: (origin, callback) => {
      const allowed = [
        "https://btreeambiental.com",
        "https://www.btreeambiental.com",
        "http://btreeambiental.com",
        "http://www.btreeambiental.com",
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for now to fix mobile issues
      }
    },
    credentials: true,
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Storage proxy for serving uploaded assets
  registerStorageProxy(app);

  // Diagnostic endpoint to debug DB issues on Hostinger
  app.get('/api/db-diagnostic', async (req, res) => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) {
        return res.json({ error: 'Database not available', DATABASE_URL_SET: !!process.env.DATABASE_URL });
      }
      // Test 1: SHOW COLUMNS FROM users
      let columns: any = null;
      try {
        columns = await db.execute(/*sql*/`SHOW COLUMNS FROM users`);
      } catch(e: any) {
        columns = { error: e.message, cause: e.cause?.message };
      }
      // Test 2: Raw SELECT * FROM users LIMIT 1
      let rawSelect: any = null;
      try {
        rawSelect = await db.execute(/*sql*/`SELECT * FROM users LIMIT 1`);
      } catch(e: any) {
        rawSelect = { error: e.message, cause: e.cause?.message };
      }
      // Test 3: Exact Drizzle query columns
      let drizzleSelect: any = null;
      try {
        drizzleSelect = await db.execute(/*sql*/`SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, password_hash FROM users LIMIT 1`);
      } catch(e: any) {
        drizzleSelect = { error: e.message, cause: e.cause?.message };
      }
      // Test 4: Check with backticks (in case of reserved words)
      let backtickSelect: any = null;
      try {
        backtickSelect = await db.execute(/*sql*/`SELECT \`id\`, \`openId\`, \`name\`, \`email\`, \`loginMethod\`, \`role\`, \`createdAt\`, \`updatedAt\`, \`lastSignedIn\`, \`password_hash\` FROM \`users\` LIMIT 1`);
      } catch(e: any) {
        backtickSelect = { error: e.message, cause: e.cause?.message };
      }
      return res.json({
        timestamp: new Date().toISOString(),
        node_version: process.version,
        columns,
        rawSelect,
        drizzleSelect,
        backtickSelect,
      });
    } catch(e: any) {
      return res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  // Image proxy endpoint - fetches external images and returns as base64 to avoid CORS issues in PDF generation
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL' });
      }
      // Only allow known domains
      const allowed = [
        'd2xsxph8kpxj0f.cloudfront.net',
        'api.qrserver.com',
        'btreeambiental.com',
        'res.cloudinary.com',
        'cloudinary.com',
        'amazonaws.com',
      ];
      const urlObj = new URL(url);
      if (!allowed.some(d => urlObj.hostname.endsWith(d))) {
        return res.status(403).json({ error: 'Domain not allowed' });
      }
      const https = await import('https');
      const http = await import('http');
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        protocol.default.get(url, (imgRes: any) => {
          imgRes.on('data', (chunk: Buffer) => chunks.push(chunk));
          imgRes.on('end', () => resolve());
          imgRes.on('error', reject);
        }).on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      // Detect content type from first bytes (PNG, JPEG, etc.)
      let contentType = 'image/png';
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = 'image/jpeg';
      else if (buffer[0] === 0x47 && buffer[1] === 0x49) contentType = 'image/gif';
      else if (buffer[0] === 0x52 && buffer[1] === 0x49) contentType = 'image/webp';
      const base64 = buffer.toString('base64');
      res.json({ base64: `data:${contentType};base64,${base64}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);

// ── Cron job: verificar pagamentos pendentes toda segunda-feira às 8h ────────
function schedulePendingPaymentsCheck() {
  const checkAndSchedule = async () => {
    const now = new Date();
    // Calcular próxima segunda-feira às 8h
    const next = new Date(now);
    const dayOfWeek = next.getDay(); // 0=dom, 1=seg, ..., 6=sáb
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(8, 0, 0, 0);
    const msUntilNext = next.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const { getDb } = await import('../db');
        const { notifyOwner } = await import('./notification');
        const { collaboratorAttendance, collaborators } = await import('../../drizzle/schema');
        const { eq, and, lt } = await import('drizzle-orm');

        const db = await getDb();
        if (!db) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const pendingRecords = await db
          .select({
            id: collaboratorAttendance.id,
            collaboratorName: collaborators.name,
            date: collaboratorAttendance.date,
            dailyValue: collaboratorAttendance.dailyValue,
          })
          .from(collaboratorAttendance)
          .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
          .where(and(
            eq(collaboratorAttendance.paymentStatusCa, 'pendente'),
            lt(collaboratorAttendance.date, sevenDaysAgo)
          ));

        if (pendingRecords.length > 0) {
          const totalGeral = pendingRecords.reduce((sum: number, r: any) => sum + parseFloat(r.dailyValue || '0'), 0);
          const byCollab: Record<string, { count: number; total: number }> = {};
          for (const r of pendingRecords) {
            if (!byCollab[r.collaboratorName]) byCollab[r.collaboratorName] = { count: 0, total: 0 };
            byCollab[r.collaboratorName].count++;
            byCollab[r.collaboratorName].total += parseFloat(r.dailyValue || '0');
          }
          const lines = Object.entries(byCollab)
            .map(([name, d]) => `• ${name}: ${d.count} dia(s) — R$ ${d.total.toFixed(2)}`)
            .join('\n');
          await notifyOwner({
            title: `⚠️ Alerta semanal: ${pendingRecords.length} pagamento(s) pendente(s)`,
            content: `Relatório semanal de pagamentos pendentes há mais de 7 dias.\n\nTotal: R$ ${totalGeral.toFixed(2)}\n\n${lines}\n\nAcesse o sistema para realizar os pagamentos.`,
          }).catch(() => {});
          console.log(`[CronJob] Notificou ${pendingRecords.length} pagamentos pendentes.`);
        } else {
          console.log('[CronJob] Nenhum pagamento pendente há mais de 7 dias.');
        }
      } catch (err) {
        console.error('[CronJob] Erro ao verificar pagamentos pendentes:', err);
      }
      // Agendar próxima execução
      checkAndSchedule();
    }, msUntilNext);

    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob] Próxima verificação de pagamentos pendentes: ${nextDate.toLocaleString('pt-BR')}`);
  };

  checkAndSchedule();
}

schedulePendingPaymentsCheck();

// ── Cron job: verificar boletos de combustível próximos do vencimento (diário 8h) ────────
function scheduleFuelInvoiceDueCheck() {
  const checkAndSchedule = async () => {
    const now = new Date();
    // Próximo dia útil às 8h
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
    // Pular fins de semana
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    const msUntilNext = next.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || '',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || '',
        });

        // Buscar boletos pendentes com vencimento nos próximos 3 dias ou já vencidos
        const today = new Date().toISOString().slice(0, 10);
        const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const [rows] = await conn.execute(
          `SELECT fi.*, fs.name as supplier_name, fs.trade_name as supplier_trade_name
           FROM fuel_invoices fi
           LEFT JOIN fuel_suppliers fs ON fi.supplier_id = fs.id
           WHERE fi.status = 'pendente'
           AND fi.due_date <= ?
           ORDER BY fi.due_date ASC`,
          [threeDaysLater]
        ) as any;

        await conn.end();

        if (rows.length > 0) {
          const overdue = rows.filter((r: any) => r.due_date < today);
          const dueSoon = rows.filter((r: any) => r.due_date >= today && r.due_date <= threeDaysLater);

          let message = '';
          if (overdue.length > 0) {
            const totalOverdue = overdue.reduce((s: number, r: any) => s + parseFloat(r.total_amount || '0'), 0);
            message += `🔴 VENCIDOS (${overdue.length}):\n`;
            for (const inv of overdue) {
              message += `• ${inv.supplier_name} — NF ${inv.invoice_number} — R$ ${inv.total_amount} — Venc: ${inv.due_date.split('-').reverse().join('/')}\n`;
            }
            message += `Total vencido: R$ ${totalOverdue.toFixed(2)}\n\n`;
          }
          if (dueSoon.length > 0) {
            const totalDueSoon = dueSoon.reduce((s: number, r: any) => s + parseFloat(r.total_amount || '0'), 0);
            message += `🟡 VENCE EM ATÉ 3 DIAS (${dueSoon.length}):\n`;
            for (const inv of dueSoon) {
              message += `• ${inv.supplier_name} — NF ${inv.invoice_number} — R$ ${inv.total_amount} — Venc: ${inv.due_date.split('-').reverse().join('/')}\n`;
            }
            message += `Total: R$ ${totalDueSoon.toFixed(2)}\n`;
          }

          // Notify Mary (financeiro) via internal notifications
          try {
            const { notifyFinanceiro } = await import('../routers/notifications');
            await notifyFinanceiro({
              type: 'pagamento_boleto',
              title: `⚠️ Boletos combustível: ${overdue.length} vencido(s), ${dueSoon.length} próximo(s)`,
              message,
            });
          } catch (e) { console.warn('[CronJob-Fuel] Error notifying financeiro:', e); }

          // Also notify owner
          try {
            const { notifyOwner } = await import('./notification');
            await notifyOwner({
              title: `⚠️ Boletos combustível: ${overdue.length} vencido(s), ${dueSoon.length} próximo(s)`,
              content: message,
            });
          } catch (e) { console.warn('[CronJob-Fuel] Error notifying owner:', e); }

          console.log(`[CronJob-Fuel] Notificou ${rows.length} boletos (${overdue.length} vencidos, ${dueSoon.length} próximos).`);
        } else {
          console.log('[CronJob-Fuel] Nenhum boleto de combustível pendente ou próximo do vencimento.');
        }
      } catch (err) {
        console.error('[CronJob-Fuel] Erro ao verificar boletos:', err);
      }
      checkAndSchedule();
    }, msUntilNext);

    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob-Fuel] Próxima verificação de boletos combustível: ${nextDate.toLocaleString('pt-BR')}`);
  };

  checkAndSchedule();
}

scheduleFuelInvoiceDueCheck();

// ── Cron job: Fechamento semanal automático de cargas (toda sexta-feira 22h) ────────
function scheduleWeeklyClosingCron() {
  const checkAndSchedule = async () => {
    const now = new Date();
    // Próxima sexta-feira às 22h (horário de Brasília = UTC-3)
    const next = new Date(now);
    // Avançar para a próxima sexta
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    // Se hoje é sexta e já passou das 22h, pular para próxima semana
    if (now.getDay() === 5 && now.getHours() >= 22) {
      next.setDate(now.getDate() + 7);
    } else if (now.getDay() === 5 && now.getHours() < 22) {
      // Hoje é sexta mas ainda não deu 22h
      next.setDate(now.getDate());
    } else {
      next.setDate(now.getDate() + daysUntilFriday);
    }
    next.setHours(22, 0, 0, 0);
    const msUntilNext = Math.max(next.getTime() - now.getTime(), 60000); // mínimo 1 min

    setTimeout(async () => {
      try {
        console.log('[CronJob-WeeklyClosing] Iniciando fechamento semanal automático...');
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || '',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || '',
        });

        // Calcular semana atual (sábado a sexta-feira)
        const today = new Date();
        const day = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
        // Find last Saturday: if today is Sat (6), it's today; otherwise go back (day+1) days
        const diffToSaturday = day >= 6 ? 0 : -(day + 1);
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToSaturday);
        weekStart.setHours(0, 0, 0, 0);
        // Week ends on Friday (6 days after Saturday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);

        // Buscar todos os clientes ativos
        const [clientRows] = await conn.execute(
          `SELECT id, name, price_per_ton, payment_term_days, billing_cycle FROM clients WHERE active = 1`
        ) as any;

        let closedCount = 0;
        for (const client of clientRows) {
          // Verificar se já existe fechamento para esta semana/cliente
          const [existing] = await conn.execute(
            `SELECT id FROM cargo_weekly_closings WHERE client_id = ? AND DATE(week_start) = ?`,
            [client.id, weekStartStr]
          ) as any;

          if (existing.length > 0) {
            console.log(`[CronJob-WeeklyClosing] Cliente ${client.name} já tem fechamento para semana ${weekStartStr}. Pulando.`);
            continue;
          }

          // Buscar cargas do cliente nesta semana (usa delivery_date se disponível, senão date)
          const [loadsInWeek] = await conn.execute(
            `SELECT weight_net_kg, weight_out_kg FROM cargo_loads 
             WHERE client_id = ? AND DATE(COALESCE(delivery_date, date)) >= ? AND DATE(COALESCE(delivery_date, date)) <= ?`,
            [client.id, weekStartStr, weekEndStr]
          ) as any;

          if (loadsInWeek.length === 0) {
            continue; // Sem cargas, não criar fechamento
          }

          const totalLoads = loadsInWeek.length;
          const totalWeightKg = loadsInWeek.reduce((sum: number, l: any) => {
            return sum + parseFloat(l.weight_net_kg || l.weight_out_kg || '0');
          }, 0);

          const pricePerTon = parseFloat(client.price_per_ton || '130');
          const totalWeightTon = totalWeightKg / 1000;
          const totalAmount = (totalWeightTon * pricePerTon).toFixed(2);

          // Calcular data de vencimento
          const paymentTermDays = client.payment_term_days || 21;
          const dueDate = new Date(weekEnd);
          dueDate.setDate(dueDate.getDate() + paymentTermDays);
          const dueDateStr = dueDate.toISOString().slice(0, 10) + ' 12:00:00';

          const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

          await conn.execute(
            `INSERT INTO cargo_weekly_closings 
             (client_id, week_start, week_end, total_loads, total_weight_kg, total_amount, price_per_ton, due_date, status, notes, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'fechado', ?, ?)`,
            [
              client.id,
              weekStartStr + ' 12:00:00',
              weekEndStr + ' 12:00:00',
              totalLoads,
              totalWeightKg.toFixed(2),
              totalAmount,
              pricePerTon.toString(),
              dueDateStr,
              'Fechamento automático (sexta-feira)',
              nowStr,
            ]
          );

          closedCount++;
          console.log(`[CronJob-WeeklyClosing] Fechamento criado: ${client.name} — ${totalLoads} cargas — ${totalWeightTon.toFixed(2)} ton — R$ ${totalAmount}`);
        }

        await conn.end();

        // Notificar owner
        if (closedCount > 0) {
          try {
            const { notifyOwner } = await import('./notification');
            await notifyOwner({
              title: `Fechamento semanal automático: ${closedCount} cliente(s)`,
              content: `Fechamentos da semana ${weekStartStr.split('-').reverse().join('/')} a ${weekEndStr.split('-').reverse().join('/')} foram criados automaticamente para ${closedCount} cliente(s).`,
            });
          } catch (e) { console.warn('[CronJob-WeeklyClosing] Error notifying owner:', e); }

          try {
            const { notifyAdmComercial } = await import('../routers/notifications');
            await notifyAdmComercial({
              type: 'fechamento_semanal',
              title: `Fechamento semanal automático: ${closedCount} cliente(s)`,
              message: `Semana ${weekStartStr.split('-').reverse().join('/')} a ${weekEndStr.split('-').reverse().join('/')}: ${closedCount} fechamento(s) criado(s) automaticamente.`,
            });
          } catch (e) { console.warn('[CronJob-WeeklyClosing] Error notifying adm:', e); }
        }

        console.log(`[CronJob-WeeklyClosing] Concluído. ${closedCount} fechamento(s) criado(s).`);
      } catch (err) {
        console.error('[CronJob-WeeklyClosing] Erro:', err);
      }
      checkAndSchedule();
    }, msUntilNext);

    const nextDate = new Date(now.getTime() + msUntilNext);
    console.log(`[CronJob-WeeklyClosing] Próximo fechamento automático: ${nextDate.toLocaleString('pt-BR')}`);
  };

  checkAndSchedule();
}

scheduleWeeklyClosingCron();

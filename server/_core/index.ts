import "dotenv/config";
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
    
    // Create fuel_suppliers table if not exists
    await db.execute(/*sql*/`
      CREATE TABLE IF NOT EXISTS fuel_suppliers (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        fuel_type enum('diesel','gasolina','etanol','gnv') NOT NULL DEFAULT 'diesel',
        price_per_liter varchar(20) NOT NULL,
        location varchar(255),
        work_location_id int,
        is_active tinyint NOT NULL DEFAULT 1,
        notes text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fuel_suppliers_id PRIMARY KEY(id)
      )
    `);

    // Add humidity column to cargo_loads if not exists
    try {
      await db.execute(/*sql*/`ALTER TABLE cargo_loads ADD COLUMN humidity varchar(20)`);
      console.log('[AutoMigration] Added humidity column to cargo_loads');
    } catch(e) { /* column already exists */ }
    
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

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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

async function startServer() {
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
            eq(collaboratorAttendance.paymentStatus, 'pendente'),
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

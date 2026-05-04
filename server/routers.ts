import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { collaboratorsRouter } from "./routers/collaborators";
import { sectorsRouter } from "./routers/sectors";
import { usersManagementRouter } from "./routers/usersManagement";
import { cargoLoadsRouter } from "./routers/cargoLoads";
import { machineHoursRouter } from "./routers/machineHours";
import { vehicleRecordsRouter } from "./routers/vehicleRecords";
import { partsRouter } from "./routers/parts";
import { clientsRouter } from "./routers/clientsRouter";
import { clientPortalRouter } from "./routers/clientPortal";
import { collaboratorDocumentsRouter } from "./routers/collaboratorDocuments";
import { equipmentDetailRouter } from "./routers/equipmentDetail";
import { purchaseOrdersRouter } from "./routers/purchaseOrders";
import { attendanceRouter } from "./routers/attendance";
import { traccarRouter } from "./routers/traccar";
import { permissionsRouter } from "./routers/permissions";
import { chainsawModuleRouter } from "./routers/chainsaws";
import { extraExpensesRouter } from "./routers/extraExpenses";
import { dashboardRouter } from "./routers/dashboard";
import { financialRouter } from "./routers/financial";
import { gpsLocationsRouter } from "./routers/gpsLocations";
import { reportsRouter } from "./routers/reports";
import { reportPdfRouter } from "./routers/reportPdf";
import { z } from "zod";
import { registerUser, loginUser, hashPassword } from "./auth";
import { SignJWT } from "jose";
import { getUserByEmail, upsertUser, updateUserPasswordByEmail, createPasswordResetToken, getValidResetToken, markTokenAsUsed } from "./db";
import { sendPasswordResetEmail } from "./email";
import crypto from "crypto";

async function createSessionToken(userId: number, email: string, name: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "btree-secret-key");
  const expiresAt = Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000);
  return new SignJWT({ userId: String(userId), email, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  dashboard: dashboardRouter,
  debug: router({
    permissionsDebug: protectedProcedure.query(async ({ ctx }) => {
      try {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) return { error: 'DB null' };
        const { sql } = await import('drizzle-orm');
        
        // 1. Check user_permissions for current user
        const [permsRows] = await db.execute(sql`SELECT * FROM user_permissions WHERE user_id = ${ctx.user.id}`);
        
        // 2. Check collaborators linked to this user
        const [collabRows] = await db.execute(sql`SELECT id, name, email, role, client_id, user_id, active FROM collaborators WHERE user_id = ${ctx.user.id}`);
        
        // 3. Count all active collaborators
        const [countRows] = await db.execute(sql`SELECT COUNT(*) as cnt FROM collaborators WHERE active = 1`);
        
        // 4. Check collaborators table columns
        const [colsRows] = await db.execute(sql`SHOW COLUMNS FROM collaborators`);
        
        // 5. Sample first 3 active collaborators
        const [sampleRows] = await db.execute(sql`SELECT id, name, user_id, client_id, active FROM collaborators WHERE active = 1 LIMIT 3`);
        
        // 6. Simulate myPermissions logic
        let myPermsResult: any = null;
        try {
          const { collaborators: collabTable, userPermissions: upTable } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          
          // Step A: check user_permissions with Drizzle ORM
          const permResult = await db.select().from(upTable).where(eq(upTable.userId, ctx.user.id));
          
          // Step B: check collaborator with Drizzle ORM
          const collabResult = await db.select({
            clientId: collabTable.clientId,
            role: collabTable.role,
          }).from(collabTable).where(eq(collabTable.userId, ctx.user.id));
          
          myPermsResult = {
            permResultLength: permResult.length,
            permResult: permResult[0] || null,
            collabResultLength: collabResult.length,
            collabResult: collabResult[0] || null,
            userIdType: typeof ctx.user.id,
            userIdValue: ctx.user.id,
          };
        } catch (simErr: any) {
          myPermsResult = { simError: simErr.message };
        }

        return {
          currentUserId: ctx.user.id,
          currentUserRole: ctx.user.role,
          currentUserEmail: ctx.user.email,
          userPermissions: permsRows,
          collaboratorLinked: collabRows,
          totalActiveCollaborators: countRows,
          collaboratorColumns: colsRows,
          sampleCollaborators: sampleRows,
          myPermsSimulation: myPermsResult,
        };
      } catch (err: any) {
        return { error: err.message, stack: err.stack?.slice(0, 500) };
      }
    }),
    attendanceTest: protectedProcedure.query(async () => {
      try {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) return { error: 'DB null' };
        // Test 1: raw query to check table structure
        const [cols] = await db.execute(require('drizzle-orm/sql').sql`SHOW COLUMNS FROM collaborator_attendance`);
        // Test 2: simple count
        const [countResult] = await db.execute(require('drizzle-orm/sql').sql`SELECT COUNT(*) as cnt FROM collaborator_attendance`);
        // Test 3: try the actual query
        const { collaboratorAttendance, collaborators } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        try {
          const records = await db.select({
            id: collaboratorAttendance.id,
            collaboratorId: collaboratorAttendance.collaboratorId,
            date: collaboratorAttendance.date,
            employmentType: collaboratorAttendance.employmentTypeCa,
            paymentStatus: collaboratorAttendance.paymentStatusCa,
          }).from(collaboratorAttendance).limit(5);
          return { cols, count: countResult, records, success: true };
        } catch (queryErr: any) {
          return { cols, count: countResult, queryError: queryErr.message, stack: queryErr.stack?.slice(0, 500) };
        }
      } catch (err: any) {
        return { error: err.message, stack: err.stack?.slice(0, 500) };
      }
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await registerUser(input);
          
          // Criar sessão automática após registro
          const sessionToken = await createSessionToken(user.id, user.email, user.name);

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Erro ao registrar usuário');
        }
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await loginUser(input.email, input.password);
          
          // Criar sessão
          const sessionToken = await createSessionToken(user.id, user.email, user.name);

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Erro ao fazer login');
        }
      }),

    // Rota de seed para criar/atualizar admin (apenas para uso interno)
    seedAdmin: publicProcedure
      .input(z.object({
        seedKey: z.string(),
        email: z.string().email(),
        name: z.string(),
        password: z.string().min(4),
      }))
      .mutation(async ({ input }) => {
        // Chave secreta para proteger esta rota
        if (input.seedKey !== 'BTREE_SEED_2026') {
          throw new Error('Chave inválida');
        }
        const passwordHash = await hashPassword(input.password);
        const result = await updateUserPasswordByEmail(input.email, passwordHash, 'admin');
        return { success: true, message: `Admin ${input.email} ${result.action === 'updated' ? 'atualizado' : 'criado'} com sucesso` };
      }),

    // Solicitar recuperação de senha
    forgotPassword: publicProcedure
      .input(z.object({
        email: z.string().email('Email inválido'),
        origin: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Sempre retornar sucesso para não revelar se email existe
        if (!user) {
          return { success: true };
        }

        const token = crypto.randomBytes(48).toString('hex');
        await createPasswordResetToken(user.id, token);

        const baseUrl = input.origin || 'https://btreeambiental.com';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        await sendPasswordResetEmail(user.email, user.name, resetUrl);

        return { success: true };
      }),

    // Redefinir senha com token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      }))
      .mutation(async ({ input }) => {
        const resetToken = await getValidResetToken(input.token);
        if (!resetToken) {
          throw new Error('Token inválido ou expirado. Solicite uma nova recuperação de senha.');
        }

        const passwordHash = await hashPassword(input.password);
        const { getDb } = await import('./db');
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error('Database not available');

        await dbInstance.update(users)
          .set({ passwordHash, loginMethod: 'email', updatedAt: new Date() })
          .where(eq(users.id, resetToken.userId));

        await markTokenAsUsed(resetToken.id);

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  collaborators: collaboratorsRouter,
  sectors: sectorsRouter,
  usersManagement: usersManagementRouter,
  cargoLoads: cargoLoadsRouter,
  machineHours: machineHoursRouter,
  vehicleRecords: vehicleRecordsRouter,
  parts: partsRouter,
  clients: clientsRouter,
  clientPortal: clientPortalRouter,
  collaboratorDocuments: collaboratorDocumentsRouter,
  equipmentDetail: equipmentDetailRouter,
  purchaseOrders: purchaseOrdersRouter,
  attendance: attendanceRouter,
  traccar: traccarRouter,
  permissions: permissionsRouter,
  chainsawModule: chainsawModuleRouter,
  extraExpenses: extraExpensesRouter,
  financial: financialRouter,
  gpsLocations: gpsLocationsRouter,
  reports: reportsRouter,
  reportPdf: reportPdfRouter,
  // Procedure de migração para criar tabelas faltantes na produção
  migrations: router({
    run: publicProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        if (input.key !== 'BTREE_SEED_2026') throw new Error('Chave inválida');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Banco de dados não disponível');
        const results: string[] = [];
        // Criar tabela financial_entries se não existir
        try {
          await db.execute(`
            CREATE TABLE IF NOT EXISTS financial_entries (
              id INT AUTO_INCREMENT PRIMARY KEY,
              type ENUM('receita','despesa') NOT NULL,
              category VARCHAR(100) NOT NULL,
              description VARCHAR(500) NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              date DATE NOT NULL,
              reference_month VARCHAR(7) NOT NULL,
              payment_method VARCHAR(50),
              notes TEXT,
              created_by INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          results.push('financial_entries: OK');
        } catch (e: any) { results.push('financial_entries: ' + e.message); }
        // Criar tabela gps_locations se não existir
        try {
          await db.execute(`
            CREATE TABLE IF NOT EXISTS gps_locations (
              id INT AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(200) NOT NULL,
              latitude DECIMAL(10,8) NOT NULL,
              longitude DECIMAL(11,8) NOT NULL,
              radius_meters INT NOT NULL DEFAULT 500,
              is_active TINYINT(1) NOT NULL DEFAULT 1,
              notes TEXT,
              created_by INT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          results.push('gps_locations: OK');
        } catch (e: any) { results.push('gps_locations: ' + e.message); }
        return { success: true, results };
      }),
  }),
  // TODO: add feature routers heree, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { collaboratorAttendance, collaborators, users } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const attendanceRouter = router({
  // Listar presenças com filtros
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(), // YYYY-MM-DD
      dateTo: z.string().optional(),
      collaboratorId: z.number().optional(),
      paymentStatus: z.enum(["pendente", "pago"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const records = await db
        .select({
          id: collaboratorAttendance.id,
          collaboratorId: collaboratorAttendance.collaboratorId,
          collaboratorName: collaborators.name,
          collaboratorRole: collaborators.role,
          collaboratorPhoto: collaborators.photoUrl,
          date: collaboratorAttendance.date,
          employmentType: collaboratorAttendance.employmentType,
          dailyValue: collaboratorAttendance.dailyValue,
          pixKey: collaboratorAttendance.pixKey,
          activity: collaboratorAttendance.activity,
          observations: collaboratorAttendance.observations,
          paymentStatus: collaboratorAttendance.paymentStatus,
          paidAt: collaboratorAttendance.paidAt,
          registeredBy: collaboratorAttendance.registeredBy,
          createdAt: collaboratorAttendance.createdAt,
        })
        .from(collaboratorAttendance)
        .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
        .orderBy(desc(collaboratorAttendance.date));

      let filtered = records;
      if (input?.collaboratorId) {
        filtered = filtered.filter(r => r.collaboratorId === input.collaboratorId);
      }
      if (input?.paymentStatus) {
        filtered = filtered.filter(r => r.paymentStatus === input.paymentStatus);
      }
      if (input?.dateFrom) {
        const from = new Date(input.dateFrom + "T00:00:00");
        filtered = filtered.filter(r => new Date(r.date) >= from);
      }
      if (input?.dateTo) {
        const to = new Date(input.dateTo + "T23:59:59");
        filtered = filtered.filter(r => new Date(r.date) <= to);
      }

      // Buscar nomes dos usuários que cadastraram
      const userIdsRaw = filtered.map(r => r.registeredBy).filter((id): id is number => id !== null && id !== undefined);
      const userIds = Array.from(new Set(userIdsRaw));
      let userMap: Record<number, string> = {};
      if (userIds.length > 0) {
        const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
        userMap = Object.fromEntries(usersData.map(u => [u.id, u.name]));
      }

      return filtered.map(r => ({
        ...r,
        registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null,
      }));
    }),

  // Criar presença
  create: protectedProcedure
    .input(z.object({
      collaboratorId: z.number(),
      date: z.string(), // YYYY-MM-DD
      employmentType: z.enum(["clt", "terceirizado", "diarista"]),
      dailyValue: z.string(),
      pixKey: z.string().optional(),
      activity: z.string().optional(),
      observations: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      // Buscar nome do colaborador para a notificação
      const [collaborator] = await db.select({ name: collaborators.name }).from(collaborators).where(eq(collaborators.id, input.collaboratorId));
      const collaboratorName = collaborator?.name || `ID ${input.collaboratorId}`;

      await db.insert(collaboratorAttendance).values({
        collaboratorId: input.collaboratorId,
        date: new Date(input.date + "T12:00:00"),
        employmentType: input.employmentType,
        dailyValue: input.dailyValue,
        pixKey: input.pixKey || null,
        activity: input.activity || null,
        observations: input.observations || null,
        registeredBy: ctx.user.id,
      });

      // Notificar o administrador
      const dateFormatted = new Date(input.date + "T12:00:00").toLocaleDateString("pt-BR");
      const activityInfo = input.activity ? ` (${input.activity})` : "";
      const employmentLabel = input.employmentType === "clt" ? "CLT" : input.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
      await notifyOwner({
        title: `✅ Presença registrada — ${collaboratorName}`,
        content: `${collaboratorName}${activityInfo} teve presença registrada em ${dateFormatted}.\nVínculo: ${employmentLabel} | Diária: R$ ${input.dailyValue}${input.pixKey ? " | PIX: " + input.pixKey : ""}\nRegistrado por: ${ctx.user.name}`,
      }).catch(() => {}); // Silencia erros de notificação para não bloquear o cadastro

      return { success: true };
    }),

  // Atualizar status de pagamento
  markPaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paid: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(collaboratorAttendance).set({
        paymentStatus: input.paid ? "pago" : "pendente",
        paidAt: input.paid ? new Date() : null,
      }).where(eq(collaboratorAttendance.id, input.id));
      return { success: true };
    }),

  // Deletar presença
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(collaboratorAttendance).where(eq(collaboratorAttendance.id, input.id));
      return { success: true };
    }),
});

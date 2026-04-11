import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { collaboratorAttendance, collaborators, users } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, inArray, lt } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { notifyTeam } from "../notifyTeam";
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

      try {
        // STEP 1: Query principal
        const records = await db
          .select({
            id: collaboratorAttendance.id,
            collaboratorId: collaboratorAttendance.collaboratorId,
            collaboratorName: collaborators.name,
            collaboratorRole: collaborators.role,
            collaboratorPhoto: collaborators.photoUrl,
            date: collaboratorAttendance.date,
            employmentType: collaboratorAttendance.employmentTypeCa,
            dailyValue: collaboratorAttendance.dailyValue,
            pixKey: collaboratorAttendance.pixKey,
            activity: collaboratorAttendance.activity,
            observations: collaboratorAttendance.observations,
            paymentStatus: collaboratorAttendance.paymentStatusCa,
            paidAt: collaboratorAttendance.paidAt,
            registeredBy: collaboratorAttendance.registeredBy,
            createdAt: collaboratorAttendance.createdAt,
            latitude: collaboratorAttendance.latitude,
            longitude: collaboratorAttendance.longitude,
            locationName: collaboratorAttendance.locationName,
            workLocationId: collaboratorAttendance.workLocationId,
          })
          .from(collaboratorAttendance)
          .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
          .orderBy(desc(collaboratorAttendance.date));

        // STEP 2: Filtros
        let filtered = records;
        if (input?.collaboratorId) {
          filtered = filtered.filter(r => r.collaboratorId === input.collaboratorId);
        }
        if (input?.paymentStatus) {
          filtered = filtered.filter(r => r.paymentStatus === input.paymentStatus);
        }
        if (input?.dateFrom) {
          const from = new Date(input.dateFrom + "T00:00:00");
          filtered = filtered.filter(r => {
            try { return new Date(r.date) >= from; } catch { return true; }
          });
        }
        if (input?.dateTo) {
          const to = new Date(input.dateTo + "T23:59:59");
          filtered = filtered.filter(r => {
            try { return new Date(r.date) <= to; } catch { return true; }
          });
        }

        // STEP 3: Buscar nomes dos usuários que cadastraram
        const userIdsRaw = filtered.map(r => r.registeredBy).filter((id): id is number => id !== null && id !== undefined);
        const userIds = Array.from(new Set(userIdsRaw));
        let userMap: Record<number, string> = {};
        if (userIds.length > 0) {
          try {
            const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
            userMap = Object.fromEntries(usersData.map(u => [u.id, u.name]));
          } catch (userErr) {
            console.error('[attendance.list] Erro ao buscar nomes de usuários:', userErr);
            // Continua sem os nomes
          }
        }

        return filtered.map(r => ({
          ...r,
          registeredByName: r.registeredBy ? (userMap[r.registeredBy] || null) : null,
        }));
      } catch (err: any) {
        console.error('[attendance.list] ERRO DETALHADO:', err.message, err.stack);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed query: ${err.message}`,
        });
      }
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
      // GPS
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      locationName: z.string().optional(),
      workLocationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      // Buscar nome do colaborador para a notificação
      const [collaborator] = await db.select({ name: collaborators.name }).from(collaborators).where(eq(collaborators.id, input.collaboratorId));
      const collaboratorName = collaborator?.name || `ID ${input.collaboratorId}`;

      await db.insert(collaboratorAttendance).values({
        collaboratorId: input.collaboratorId,
        date: new Date(input.date + "T12:00:00").toISOString().slice(0, 19).replace("T", " "),
        employmentTypeCa: input.employmentType,
        dailyValue: input.dailyValue,
        pixKey: input.pixKey || null,
        activity: input.activity || null,
        observations: input.observations || null,
        registeredBy: ctx.user.id,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        locationName: input.locationName || null,
        workLocationId: input.workLocationId || null,
      });

      // Notificar o administrador
      const dateFormatted = new Date(input.date + "T12:00:00").toLocaleDateString("pt-BR");
      const activityInfo = input.activity ? ` (${input.activity})` : "";
      const employmentLabel = input.employmentType === "clt" ? "CLT" : input.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
      await notifyOwner({
        title: `✅ Presença registrada — ${collaboratorName}`,
        content: `${collaboratorName}${activityInfo} teve presença registrada em ${dateFormatted}.\nVínculo: ${employmentLabel} | Diária: R$ ${input.dailyValue}${input.pixKey ? " | PIX: " + input.pixKey : ""}\nLocal: ${input.locationName || "Não informado"}\nRegistrado por: ${ctx.user.name}`,
      }).catch(() => {});

      // Notificação por e-mail para a equipe (Mary + owner)
      notifyTeam({
        event: "presenca_registrada",
        title: `Presença de ${collaboratorName} registrada em ${dateFormatted}.`,
        details: {
          "Colaborador": collaboratorName,
          "Data": dateFormatted,
          "Vínculo": employmentLabel,
          "Função / Atividade": input.activity || "—",
          "Valor da Diária": `R$ ${input.dailyValue}`,
          "Chave PIX": input.pixKey || "—",
        },
        registeredBy: ctx.user.name,
      }).catch(() => {});

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
        paymentStatusCa: input.paid ? "pago" : "pendente",
        paidAt: input.paid ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
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

  // Verificar e notificar pagamentos pendentes há mais de 7 dias
  checkPendingPayments: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Data limite: 7 dias atrás
      const sevenDaysAgoDate = new Date();
      sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
      const sevenDaysAgo = sevenDaysAgoDate.toISOString().slice(0, 19).replace('T', ' ');

      const pendingRecords = await db
        .select({
          id: collaboratorAttendance.id,
          collaboratorName: collaborators.name,
          date: collaboratorAttendance.date,
          dailyValue: collaboratorAttendance.dailyValue,
          pixKey: collaboratorAttendance.pixKey,
          activity: collaboratorAttendance.activity,
        })
        .from(collaboratorAttendance)
        .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
        .where(
          and(
            eq(collaboratorAttendance.paymentStatusCa, "pendente"),
            lt(collaboratorAttendance.date, sevenDaysAgo)
          )
        )
        .orderBy(collaboratorAttendance.date);

      if (pendingRecords.length === 0) {
        return { success: true, count: 0, message: "Nenhum pagamento pendente há mais de 7 dias." };
      }

      // Agrupar por colaborador
      const byCollaborator: Record<string, { count: number; total: number; oldest: string }> = {};
      for (const r of pendingRecords) {
        const name = r.collaboratorName;
        if (!byCollaborator[name]) {
          byCollaborator[name] = { count: 0, total: 0, oldest: new Date(r.date).toLocaleDateString("pt-BR") };
        }
        byCollaborator[name].count++;
        byCollaborator[name].total += parseFloat(r.dailyValue || "0");
      }

      const lines = Object.entries(byCollaborator)
        .map(([name, data]) => `• ${name}: ${data.count} dia(s) — R$ ${data.total.toFixed(2)} (desde ${data.oldest})`)
        .join("\n");

      const totalGeral = pendingRecords.reduce((sum, r) => sum + parseFloat(r.dailyValue || "0"), 0);

      await notifyOwner({
        title: `⚠️ ${pendingRecords.length} pagamento(s) pendente(s) há mais de 7 dias`,
        content: `Existem ${pendingRecords.length} presença(s) com pagamento pendente há mais de 7 dias.\n\nTotal a pagar: R$ ${totalGeral.toFixed(2)}\n\nDetalhamento:\n${lines}\n\nAcesse o sistema para realizar os pagamentos.`,
      }).catch(() => {});

      return { success: true, count: pendingRecords.length, total: totalGeral, details: byCollaborator };
    }),

  // Atualizar local de trabalho de uma presença
  updateLocation: protectedProcedure
    .input(z.object({
      id: z.number(),
      workLocationId: z.number().nullable(),
      locationName: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(collaboratorAttendance).set({
        workLocationId: input.workLocationId,
        locationName: input.locationName,
      }).where(eq(collaboratorAttendance.id, input.id));
      return { success: true };
    }),

  // Atualizar local de trabalho em lote (vários registros de uma vez)
  updateLocationBatch: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      workLocationId: z.number().nullable(),
      locationName: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(collaboratorAttendance).set({
        workLocationId: input.workLocationId,
        locationName: input.locationName,
      }).where(inArray(collaboratorAttendance.id, input.ids));
      return { success: true, count: input.ids.length };
    }),
});

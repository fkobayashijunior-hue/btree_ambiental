import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { vehicleRecords, users, gpsLocations, userPermissions, collaborators, fuelInvoices, financialEntries, equipment } from "../../drizzle/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { notifyTeam } from "../notifyTeam";

export const vehicleRecordsRouter = router({
  list: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // === SERVER-SIDE FILTERING: buscar allowedClientIds ===
      let allowedClientIds: number[] | null = null;
      if (ctx.user.role !== "admin") {
        try {
          const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
          if (perm?.allowedClientIds) {
            allowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
          }
        } catch {
          try {
            const [rows] = await db.execute(sql`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`) as any;
            const row = (rows as any[])?.[0];
            if (row?.allowed_client_ids) {
              allowedClientIds = JSON.parse(row.allowed_client_ids) as number[];
            }
          } catch {
            // Ignorar
          }
        }

        // Fallback: verificar collaborator.client_id
        if (!allowedClientIds) {
          try {
            const [collab] = await db.select({ clientId: collaborators.clientId })
              .from(collaborators).where(eq(collaborators.userId, ctx.user.id));
            if (collab?.clientId) {
              allowedClientIds = [collab.clientId];
            }
          } catch {
            // Ignorar
          }
        }
      }

      // Se temos allowedClientIds, buscar os workLocationIds vinculados a esses clientes
      let allowedLocationIds: number[] | null = null;
      if (allowedClientIds && allowedClientIds.length > 0) {
        const locs = await db.select({ id: gpsLocations.id })
          .from(gpsLocations)
          .where(inArray(gpsLocations.clientId, allowedClientIds));
        allowedLocationIds = locs.map((l: any) => l.id);
      }

      const results = await db.select().from(vehicleRecords).orderBy(desc(vehicleRecords.date), desc(vehicleRecords.createdAt));
      let filtered = results;
      if (input?.equipmentId) filtered = filtered.filter(r => r.equipmentId === input.equipmentId);
      if (input?.recordType) filtered = filtered.filter(r => r.recordType === input.recordType);

      // Filtro server-side por allowedClientIds (via workLocationId)
      // Registros sem workLocationId sempre aparecem (não é possível determinar o cliente)
      if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
        filtered = filtered.filter(r => {
          if (!r.workLocationId) return true; // sem local → sempre visível
          return allowedLocationIds!.includes(r.workLocationId);
        });
      }

      // Buscar nomes dos usuários que cadastraram
      const userIdsRaw = filtered.map(r => r.registeredBy).filter((id): id is number => id !== null && id !== undefined);
      const userIds = Array.from(new Set(userIdsRaw));
      let userMap: Record<number, string> = {};
      if (userIds.length > 0) {
        const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
        userMap = Object.fromEntries(usersData.map(u => [u.id, u.name]));
      }
      // Buscar nomes dos locais
      const locIdsRaw = filtered.map(r => r.workLocationId).filter((id): id is number => id !== null && id !== undefined);
      const locIds = Array.from(new Set(locIdsRaw));
      let locMap: Record<number, string> = {};
      if (locIds.length > 0) {
        const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray(gpsLocations.id, locIds as number[]));
        locMap = Object.fromEntries(locsData.map(l => [l.id, l.name]));
      }
      return filtered.map(r => ({
        ...r,
        registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null,
        locationName: r.workLocationId ? locMap[r.workLocationId] || null : null,
      }));
    }),

  create: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      date: z.string(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).optional(),
      liters: z.string().optional(),
      fuelCost: z.string().optional(),
      pricePerLiter: z.string().optional(),
      supplier: z.string().optional(),
      odometer: z.string().optional(),
      kmDriven: z.string().optional(),
      maintenanceType: z.string().optional(),
      maintenanceCost: z.string().optional(),
      serviceType: z.enum(["proprio", "terceirizado"]).optional(),
      mechanicName: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      photoBase64: z.string().optional(),
      photosBase64: z.array(z.string()).optional(), // múltiplas fotos
      notes: z.string().optional(),
      workLocationId: z.number().optional(),
      fuelInvoiceId: z.number().optional(),
      chargedValue: z.string().optional(),
      fuelLocation: z.enum(['simflor','astorga','postos']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      let photoUrl: string | undefined;
      let photosJson: string | undefined;

      // Upload de múltiplas fotos (photosBase64 tem prioridade sobre photoBase64)
      const photosToUpload = input.photosBase64?.filter(p => p.startsWith("data:")) || [];
      if (photosToUpload.length > 0) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const uploadedUrls: string[] = [];
        for (const b64 of photosToUpload) {
          const result = await cloudinaryUpload(b64, "btree/vehicle-records");
          uploadedUrls.push(result.url);
        }
        photosJson = JSON.stringify(uploadedUrls);
        photoUrl = uploadedUrls[0]; // manter compatibilidade com campo legado
      } else if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const result = await cloudinaryUpload(input.photoBase64, "btree/vehicle-records");
        photoUrl = result.url;
        photosJson = JSON.stringify([photoUrl]);
      }

      const { photoBase64, photosBase64, workLocationId, fuelInvoiceId, ...rest } = input;
      await db.insert(vehicleRecords).values({
        ...rest,
        date: input.date.length === 10 ? `${input.date} 00:00:00` : new Date(input.date).toISOString().slice(0, 19).replace('T', ' '),
        photoUrl,
        photosJson,
        registeredBy: ctx.user.id,
        workLocationId: workLocationId || null,
        fuelInvoiceId: fuelInvoiceId || null,
      });

      // Atualizar litros usados na NF vinculada
      if (fuelInvoiceId && input.liters) {
        try {
          const [inv] = await db.select().from(fuelInvoices).where(eq(fuelInvoices.id, fuelInvoiceId));
          if (inv) {
            const currentUsed = parseFloat(inv.litersUsed || '0');
            const newUsed = currentUsed + parseFloat(input.liters.replace(',', '.'));
            await db.update(fuelInvoices).set({ litersUsed: String(newUsed.toFixed(2)) }).where(eq(fuelInvoices.id, fuelInvoiceId));
          }
        } catch (e) {
          console.error('Erro ao atualizar litros da NF:', e);
        }
      }

      // Auto-generate financial entry for vehicle fuel/maintenance
      const costValue = input.recordType === 'abastecimento' ? input.fuelCost : input.maintenanceCost;
      if (costValue && parseFloat(costValue.replace(',', '.')) > 0) {
        try {
          const [eqRow] = await db.select({ name: equipment.name }).from(equipment).where(eq(equipment.id, input.equipmentId));
          const eqName = eqRow?.name || `Equipamento #${input.equipmentId}`;
          const dateObj = new Date(input.date);
          const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          const fuelLabels: Record<string, string> = { diesel: 'Diesel S500', diesel_s10: 'Diesel S10', gasolina: 'Gasolina', etanol: 'Etanol', gnv: 'GNV' };
          const desc = input.recordType === 'abastecimento'
            ? `Abastecimento ${fuelLabels[input.fuelType!] || input.fuelType} - ${eqName} - ${input.liters}L${input.supplier ? ' (' + input.supplier + ')' : ''}`
            : `Manutenção ${input.maintenanceType || ''} - ${eqName}${input.notes ? ': ' + input.notes.slice(0, 60) : ''}`;
          await db.insert(financialEntries).values({
            type: 'despesa',
            category: input.recordType === 'abastecimento' ? 'combustivel' : 'manutencao',
            description: desc,
            amount: costValue.replace(',', '.'),
            date: dateObj.toISOString().slice(0, 10),
            referenceMonth: refMonth,
            paymentMethod: 'transferencia',
            status: 'confirmado',
            autoGenerated: 1,
            equipmentId: input.equipmentId,
            equipmentName: eqName,
            registeredBy: ctx.user.id,
            registeredByName: ctx.user.name + ' (auto)',
          });
        } catch { /* não bloquear se financeiro falhar */ }
      }

      // Notificação por e-mail apenas para abastecimentos
      if (input.recordType === "abastecimento") {
        const dateFormatted = new Date(input.date).toLocaleDateString("pt-BR");
        const fuelLabels: Record<string, string> = { diesel: "Diesel S500", diesel_s10: "Diesel S10", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV" };
        notifyTeam({
          event: "abastecimento_registrado",
          title: `Abastecimento registrado em ${dateFormatted}.`,
          details: {
            "Data": dateFormatted,
            "Combustível": input.fuelType ? fuelLabels[input.fuelType] || input.fuelType : "—",
            "Litros": input.liters ? `${input.liters} L` : "—",
            "Valor Total": input.fuelCost ? `R$ ${input.fuelCost}` : "—",
            "Preço / Litro": input.pricePerLiter ? `R$ ${input.pricePerLiter}` : "—",
            "Fornecedor": input.supplier || "—",
            "Odômetro": input.odometer ? `${input.odometer} km` : "—",
            "Observações": input.notes || "—",
          },
          registeredBy: ctx.user.name,
        }).catch(() => {});
      }

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]).optional(),
      fuelType: z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]).optional().nullable(),
      liters: z.string().optional().nullable(),
      fuelCost: z.string().optional().nullable(),
      pricePerLiter: z.string().optional().nullable(),
      supplier: z.string().optional().nullable(),
      odometer: z.string().optional().nullable(),
      kmDriven: z.string().optional().nullable(),
      maintenanceType: z.string().optional().nullable(),
      maintenanceCost: z.string().optional().nullable(),
      serviceType: z.enum(["proprio", "terceirizado"]).optional().nullable(),
      mechanicName: z.string().optional().nullable(),
      driverCollaboratorId: z.number().optional().nullable(),
      photoBase64: z.string().optional().nullable(),
      photosBase64: z.array(z.string()).optional().nullable(), // múltiplas fotos
      notes: z.string().optional().nullable(),
      workLocationId: z.number().optional().nullable(),
      fuelInvoiceId: z.number().optional().nullable(),
      chargedValue: z.string().optional().nullable(),
      fuelLocation: z.enum(['simflor','astorga','postos']).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, photoBase64, photosBase64, date, ...rest } = input;
      let photoUrl: string | undefined;
      let photosJson: string | undefined;

      // Upload de múltiplas fotos
      const photosToUpload = photosBase64?.filter((p): p is string => !!p && p.startsWith("data:")) || [];
      if (photosToUpload.length > 0) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const uploadedUrls: string[] = [];
        for (const b64 of photosToUpload) {
          const result = await cloudinaryUpload(b64, "btree/vehicle-records");
          uploadedUrls.push(result.url);
        }
        photosJson = JSON.stringify(uploadedUrls);
        photoUrl = uploadedUrls[0];
      } else if (photosBase64 && photosBase64.length > 0) {
        // URLs já existentes (não são base64)
        const existingUrls = photosBase64.filter((p): p is string => !!p && !p.startsWith("data:"));
        if (existingUrls.length > 0) {
          photosJson = JSON.stringify(existingUrls);
          photoUrl = existingUrls[0];
        }
      } else if (photoBase64 && photoBase64.startsWith("data:")) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const result = await cloudinaryUpload(photoBase64, "btree/vehicle-records");
        photoUrl = result.url;
        photosJson = JSON.stringify([photoUrl]);
      }

      const updateData: Record<string, unknown> = { ...rest };
      if (date) updateData.date = new Date(date);
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (photosJson !== undefined) updateData.photosJson = photosJson;
      await db.update(vehicleRecords).set(updateData).where(eq(vehicleRecords.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(vehicleRecords).where(eq(vehicleRecords.id, input.id));
      return { success: true };
    }),
});

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { quotationRequests, quotationResponses, suppliers, purchaseCategories, quotations, purchaseRequests, purchaseRequestItems } from "../../drizzle/schema";
import { eq, desc, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { notifyOwner } from "../_core/notification";

export const quotationRequestsRouter = router({
  // Listar todas as solicitações (protegido)
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(quotationRequests).orderBy(desc(quotationRequests.createdAt));
    return rows.map((r: typeof quotationRequests.$inferSelect) => ({
      ...r,
      items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
      isExpired: Date.now() > r.expiresAt,
    }));
  }),

  // Buscar por ID com respostas (protegido)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.id));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      const responses = await db
        .select()
        .from(quotationResponses)
        .where(eq(quotationResponses.quotationRequestId, input.id))
        .orderBy(desc(quotationResponses.createdAt));
      return {
        ...req,
        items: JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
        isExpired: Date.now() > req.expiresAt,
        responses: responses.map((r: typeof quotationResponses.$inferSelect) => ({
          ...r,
          items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string; price: string; brand?: string; notes?: string }>,
        })),
      };
    }),

  // Criar nova solicitação (protegido)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        requesterId: z.number().optional(),
        requesterName: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterEmail: z.string().optional(),
        items: z.array(z.object({
          name: z.string().min(1),
          quantity: z.string().min(1),
          unit: z.string().optional().default("un"),
        })).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 dias

      const [result] = await db.insert(quotationRequests).values({
        title: input.title,
        requesterId: input.requesterId,
        requesterName: input.requesterName,
        requesterPhone: input.requesterPhone,
        requesterEmail: input.requesterEmail,
        itemsJson: JSON.stringify(input.items),
        token,
        expiresAt,
        status: "ativa",
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      const id = (result as { insertId: number }).insertId;
      return { id, token };
    }),

  // Cancelar solicitação (protegido)
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(quotationRequests)
        .set({ status: "cancelada" })
        .where(eq(quotationRequests.id, input.id));
      return { success: true };
    }),

  // ===== AUTOMAÇÃO COMPLETA =====
  // Processa uma solicitação respondida:
  // 1. Cria/atualiza fornecedores de todas as respostas
  // 2. Cria/encontra categoria com o título do orçamento
  // 3. Popula catálogo de preços com todos os itens de todas as respostas
  // 4. Cria solicitação de compra com os itens de menor preço
  autoProcess: protectedProcedure
    .input(z.object({
      quotationRequestId: z.number(),
      urgency: z.enum(['baixa', 'media', 'alta', 'critica']).optional().default('media'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. Buscar solicitação e respostas
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.quotationRequestId));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      const responses = await db
        .select()
        .from(quotationResponses)
        .where(eq(quotationResponses.quotationRequestId, input.quotationRequestId));

      if (responses.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma resposta recebida para esta solicitação" });
      }

      const requestItems = JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const result = {
        suppliersCreated: 0,
        suppliersUpdated: 0,
        categoryId: 0,
        categoryName: req.title,
        catalogEntriesCreated: 0,
        purchaseRequestId: 0,
      };

      // 2. Criar/atualizar fornecedores de todas as respostas
      const supplierIdByResponse: Map<number, number> = new Map();
      for (const resp of responses) {
        if (!resp.supplierName?.trim()) continue;
        const trimmedName = resp.supplierName.trim();
        // Usar SQL raw para evitar LIMIT parametrizado (incompatível com MySQL Hostinger)
        const existingRows = await db.execute(
          sql`SELECT id, company_name, phone, whatsapp, email FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`
        );
        const existing = (existingRows as any)[0] as Array<{ id: number; company_name: string; phone: string | null; whatsapp: string | null; email: string | null }>;

        if (existing.length === 0) {
          const [ins] = await db.insert(suppliers).values({
            companyName: resp.supplierName.trim(),
            cnpj: resp.cnpj ?? null,
            address: resp.address ?? null,
            phone: resp.sellerPhone ?? null,
            whatsapp: resp.sellerPhone ?? null,
            email: resp.sellerEmail ?? null,
            contactName: resp.sellerName ?? null,
            notes: resp.notes ?? null,
            isActive: 1,
          });
          const newId = (ins as any).insertId as number;
          supplierIdByResponse.set(resp.id, newId);
          result.suppliersCreated++;
        } else {
          const s = existing[0]!;
          const updates: Record<string, string | null> = {};
          if (!s.phone && resp.sellerPhone) updates.phone = resp.sellerPhone;
          if (!s.whatsapp && resp.sellerPhone) updates.whatsapp = resp.sellerPhone;
          if (!s.email && resp.sellerEmail) updates.email = resp.sellerEmail;
          if (Object.keys(updates).length > 0) {
            await db.update(suppliers).set(updates).where(eq(suppliers.id, s.id));
            result.suppliersUpdated++;
          }
          supplierIdByResponse.set(resp.id, s.id);
        }
      }

      // 3. Criar/encontrar categoria com o título do orçamento
      const catTitle = req.title.trim();
      const existingCatRows = await db.execute(
        sql`SELECT id, name FROM purchase_categories WHERE name = ${catTitle} LIMIT 1`
      );
      const existingCat = (existingCatRows as any)[0] as Array<{ id: number; name: string }>;

      let categoryId: number;
      if (existingCat.length > 0) {
        categoryId = existingCat[0]!.id;
      } else {
        // Escolher cor baseada no título (hash simples)
        const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];
        const colorIndex = req.title.charCodeAt(0) % colors.length;
        const catColor = colors[colorIndex]!;
        const catName = req.title.trim();
        const createdById = ctx.user.id;
        // Usar SQL raw para evitar 'default' parametrizado (incompatível com MySQL Hostinger)
        const catInsResult = await db.execute(
          sql`INSERT INTO purchase_categories (name, color, created_by) VALUES (${catName}, ${catColor}, ${createdById})`
        );
        categoryId = (catInsResult as any)[0]?.insertId as number;
      }
      result.categoryId = categoryId;
      result.categoryName = req.title;

      // 4. Popular catálogo de preços com todos os itens de todas as respostas
      for (const resp of responses) {
        const supplierId = supplierIdByResponse.get(resp.id);
        if (!supplierId) continue;
        const respItems = JSON.parse(resp.itemsJson || "[]") as Array<{
          name: string; quantity: string; unit?: string; price: string; brand?: string; notes?: string
        }>;
        for (const item of respItems) {
          if (!item.price || parseFloat(item.price) <= 0) continue;
          const qNotes = item.brand ? `Marca: ${item.brand}${item.notes ? ` | ${item.notes}` : ''}` : (item.notes || null);
          const qUnit = item.unit || 'un';
          const qDate = now;
          const qCreatedBy = ctx.user.id;
          const qReqId = input.quotationRequestId;
          // SQL raw para evitar 'default' parametrizado (MySQL Hostinger)
          await db.execute(
            sql`INSERT INTO quotations (supplier_id, category_id, request_id, product_name, unit, price, quotation_date, notes, created_by) VALUES (${supplierId}, ${categoryId}, ${qReqId}, ${item.name}, ${qUnit}, ${item.price}, ${qDate}, ${qNotes}, ${qCreatedBy})`
          );
          result.catalogEntriesCreated++;
        }
      }

      // 5. Calcular melhor preço por item (menor preço entre todas as respostas)
      const bestPriceByItem: Map<string, { price: number; supplierName: string; unit: string; quantity: string }> = new Map();
      for (const resp of responses) {
        const respItems = JSON.parse(resp.itemsJson || "[]") as Array<{
          name: string; quantity: string; unit?: string; price: string;
        }>;
        for (const item of respItems) {
          const price = parseFloat(item.price);
          if (isNaN(price) || price <= 0) continue;
          const existing = bestPriceByItem.get(item.name);
          if (!existing || price < existing.price) {
            bestPriceByItem.set(item.name, {
              price,
              supplierName: resp.supplierName || '',
              unit: item.unit || 'un',
              quantity: item.quantity,
            });
          }
        }
      }

      // Usar quantidades originais da solicitação para a solicitação de compra
      const purchaseItems = requestItems.map(reqItem => {
        const best = bestPriceByItem.get(reqItem.name);
        return {
          name: reqItem.name,
          quantity: reqItem.quantity,
          unit: reqItem.unit || best?.unit || 'un',
          notes: best ? `Menor preço: R$ ${parseFloat(best.price.toString()).toFixed(2).replace('.', ',')} — ${best.supplierName}` : undefined,
        };
      });

      // Montar descrição com resumo dos fornecedores
      const supplierSummary = responses
        .map(r => `• ${r.supplierName}`)
        .join('\n');

      // 6. Criar solicitação de compra (SQL raw para evitar 'default' parametrizado)
      const prTitle = `Compra: ${req.title}`;
      const prDesc = `Gerado automaticamente a partir do orçamento "${req.title}".\n\nFornecedores consultados:\n${supplierSummary}`;
      const prNotes = `Orçamento origem: #${req.id} — ${responses.length} resposta(s) recebida(s)`;
      const prUrgency = input.urgency;
      const prRequestedBy = ctx.user.id;
      const prRequestDate = now;
      const prInsResult = await db.execute(
        sql`INSERT INTO purchase_requests (title, description, category_id, urgency, status, request_date, requested_by, notes) VALUES (${prTitle}, ${prDesc}, ${categoryId}, ${prUrgency}, 'pendente', ${prRequestDate}, ${prRequestedBy}, ${prNotes})`
      );
      const purchaseRequestId = (prInsResult as any)[0]?.insertId as number;
      result.purchaseRequestId = purchaseRequestId;

      if (purchaseItems.length > 0) {
        for (const item of purchaseItems) {
          const piNotes = item.notes || null;
          await db.execute(
            sql`INSERT INTO purchase_request_items (request_id, name, quantity, unit, notes) VALUES (${purchaseRequestId}, ${item.name}, ${item.quantity}, ${item.unit}, ${piNotes})`
          );
        }
      }

      // Notificar owner
      try {
        await notifyOwner({
          title: `✅ Orçamento processado automaticamente: ${req.title}`,
          content: `O orçamento "${req.title}" foi processado.\n\n• ${result.suppliersCreated} fornecedor(es) criado(s)\n• ${result.catalogEntriesCreated} entradas no catálogo\n• Solicitação de compra #${purchaseRequestId} criada com ${purchaseItems.length} item(s)`,
        });
      } catch (_) { /* não bloquear */ }

      return result;
    }),

  // ===== ROTAS PÚBLICAS (sem auth) =====

  // Buscar solicitação por token (fornecedor acessa)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { found: false as const };
      const [req] = await db
        .select()
        .from(quotationRequests)
        .where(eq(quotationRequests.token, input.token));

      if (!req) return { found: false as const };

      const isCancelled = req.status === "cancelada";

      return {
        found: true as const,
        isExpired: false,
        isCancelled,
        request: isCancelled ? null : {
          id: req.id,
          title: req.title,
          requesterName: req.requesterName,
          requesterPhone: req.requesterPhone,
          requesterEmail: req.requesterEmail,
          items: JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
          notes: req.notes,
          expiresAt: req.expiresAt,
        },
      };
    }),

  // Fornecedor envia resposta (público)
  submitResponse: publicProcedure
    .input(
      z.object({
        token: z.string(),
        supplierName: z.string().min(1),
        cnpj: z.string().optional(),
        address: z.string().optional(),
        sellerName: z.string().optional(),
        sellerPhone: z.string().optional(),
        sellerEmail: z.string().optional(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.string(),
            unit: z.string().optional(),
            price: z.string(),
            brand: z.string().optional(),
            notes: z.string().optional(),
          })
        ).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db
        .select()
        .from(quotationRequests)
        .where(eq(quotationRequests.token, input.token));

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      if (req.status === "cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação cancelada" });

      await db.insert(quotationResponses).values({
        quotationRequestId: req.id,
        supplierName: input.supplierName,
        cnpj: input.cnpj,
        address: input.address,
        sellerName: input.sellerName,
        sellerPhone: input.sellerPhone,
        sellerEmail: input.sellerEmail,
        itemsJson: JSON.stringify(input.items),
        notes: input.notes,
      });

      // Atualizar status para respondida
      await db
        .update(quotationRequests)
        .set({ status: "respondida" })
        .where(eq(quotationRequests.id, req.id));

      // Cadastrar fornecedor automaticamente se não existir
      try {
        const existingSuppliers = await db.execute(
          sql`SELECT id FROM suppliers WHERE company_name = ${input.supplierName.trim()} LIMIT 1`
        );
        const existingArr = (existingSuppliers as any)[0] as Array<{ id: number }>;
        if (existingArr.length === 0) {
          await db.insert(suppliers).values({
            companyName: input.supplierName.trim(),
            cnpj: input.cnpj ?? null,
            address: input.address ?? null,
            phone: input.sellerPhone ?? null,
            whatsapp: input.sellerPhone ?? null,
            email: input.sellerEmail ?? null,
            contactName: input.sellerName ?? null,
            isActive: 1,
          });
        }
      } catch (_) {
        // Não bloquear se cadastro de fornecedor falhar
      }

      // Notificar owner
      try {
        await notifyOwner({
          title: `📋 Novo orçamento recebido: ${req.title}`,
          content: `Fornecedor "${input.supplierName}" respondeu a solicitação de orçamento "${req.title}".\n\nVendedor: ${input.sellerName || "—"}\nTelefone: ${input.sellerPhone || "—"}\n\nAcesse o sistema para visualizar os valores.`,
        });
      } catch (_) {
        // Não bloquear se notificação falhar
      }

      return { success: true };
    }),

  // Sincronizar fornecedores retroativamente a partir das respostas existentes
  syncSuppliersFromResponses: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allResponses = await db.select().from(quotationResponses);
    let created = 0;
    let updated = 0;
    for (const resp of allResponses) {
      if (!resp.supplierName?.trim()) continue;
      const existingRows = await db.execute(
        sql`SELECT id, phone, whatsapp, email FROM suppliers WHERE company_name = ${resp.supplierName.trim()} LIMIT 1`
      );
      const existing = (existingRows as any)[0] as Array<{ id: number; phone: string | null; whatsapp: string | null; email: string | null }>;
      if (existing.length === 0) {
        await db.insert(suppliers).values({
          companyName: resp.supplierName.trim(),
          address: resp.address || null,
          phone: resp.sellerPhone || null,
          whatsapp: resp.sellerPhone || null,
          email: resp.sellerEmail || null,
          contactName: resp.sellerName || null,
          isActive: 1,
        });
        created++;
      } else {
        // Atualizar dados de contato se estiverem vazios
        const s = existing[0]!;
        const updates: Record<string, string | null> = {};
        if (!s.phone && resp.sellerPhone) updates.phone = resp.sellerPhone;
        if (!s.whatsapp && resp.sellerPhone) updates.whatsapp = resp.sellerPhone;
        if (!s.email && resp.sellerEmail) updates.email = resp.sellerEmail;
        if (Object.keys(updates).length > 0) {
          await db.update(suppliers).set(updates).where(eq(suppliers.id, s.id));
          updated++;
        }
      }
    }
    return { created, updated, total: allResponses.length };
  }),
});

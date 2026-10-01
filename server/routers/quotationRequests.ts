import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { moduleProcedure } from "./permissions";
import { getDb } from "../db";
import { quotationRequests, quotationResponses, suppliers, purchaseCategories, quotations, purchaseRequestItems } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { notifyOwner } from "../_core/notification";
import { notifyFinanceiro } from "./notifications";
import { applyPurchaseQuotationDecision } from "./purchaseRequests";
import { notifyRequesterPurchaseCompletedWhatsApp } from "../utils/whatsappNotifications";

// Garante que toda resposta tem um fornecedor casado/criado em `suppliers` (mesma
// lógica de match-por-nome do autoProcess) e que existe uma categoria pro título do
// orçamento — SEM depender de alguém já ter clicado em "Resumo Gestores" antes.
// É o que permite Confirmar Compra / Gerar Solicitação de Compra funcionarem sozinhos,
// direto depois que os fornecedores respondem, sem esse passo manual no meio.
async function ensureSuppliersAndCategory(
  db: Awaited<ReturnType<typeof getDb>>,
  req: { id: number; title: string },
  responses: QuotationResponseRow[],
  createdByUserId: number
) {
  for (const resp of responses) {
    if (resp.supplierId || !resp.supplierName?.trim()) continue;
    const trimmedName = resp.supplierName.trim();
    const [existingRows] = await db.execute(sql`SELECT id, phone, whatsapp, email FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`) as any;
    const existing = (existingRows as any[]) as Array<{ id: number; phone: string | null; whatsapp: string | null; email: string | null }>;
    let supplierId: number;
    if (existing.length === 0) {
      const [ins] = await db.insert(suppliers).values({
        companyName: trimmedName,
        address: resp.address ?? null,
        phone: resp.sellerPhone ?? null,
        whatsapp: resp.sellerPhone ?? null,
        email: resp.sellerEmail ?? null,
        notes: resp.notes ?? null,
      });
      supplierId = (ins as any).insertId as number;
    } else {
      const s = existing[0]!;
      supplierId = s.id;
      const updates: Record<string, string | null> = {};
      if (!s.phone && resp.sellerPhone) updates.phone = resp.sellerPhone;
      if (!s.whatsapp && resp.sellerPhone) updates.whatsapp = resp.sellerPhone;
      if (!s.email && resp.sellerEmail) updates.email = resp.sellerEmail;
      if (Object.keys(updates).length > 0) await db.update(suppliers).set(updates).where(eq(suppliers.id, s.id));
    }
    await db.update(quotationResponses).set({ supplierId }).where(eq(quotationResponses.id, resp.id));
    (resp as any).supplierId = supplierId;
  }

  // Categoria: reaproveita a categoria REAL da Solicitação de Compra vinculada (se
  // houver) — nunca cria uma categoria nova a partir do título do orçamento (isso
  // poluía a lista de categorias com um monte de entradas de uso único, tipo o título
  // de cada orçamento de teste). Orçamento avulso sem compra vinculada fica sem
  // categoria (fica "sem categoria" no catálogo de preços, o que é aceitável).
  const [linkedPrRows] = await db.execute(sql`SELECT category_id FROM purchase_requests WHERE quotation_request_id = ${req.id} LIMIT 1`) as any;
  const categoryId = (linkedPrRows as any[])[0]?.category_id ?? null;
  return { categoryId };
}

// Grava no catálogo de preços (quotations) só os itens que efetivamente venceram
// essa compra, já com purchase_request_id — assim o histórico de preços do
// fornecedor (tela de Fornecedores) fica correto mesmo que ninguém tenha rodado
// "Resumo Gestores" (que grava TODOS os itens de TODAS as respostas, não só os vencedores).
async function recordWinningQuotations(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    categoryId: number | null; purchaseRequestId: number; createdByUserId: number;
    summaryItems: ReturnType<typeof computeBestPriceBreakdown>['summaryItems'];
  }
) {
  for (const item of params.summaryItems) {
    if (!item.found || !item.bestSupplierId) continue;
    const totalPrice = item.subtotal.toFixed(2);
    await db.execute(sql`
      INSERT INTO quotations (supplier_id, category_id, product_name, unit, quantity, unit_price, total_price, currency, quoted_at, purchase_request_id, created_by, created_at)
      VALUES (${item.bestSupplierId}, ${params.categoryId}, ${item.name}, ${item.unit}, ${item.quantity}, ${item.bestPrice.toFixed(2)}, ${totalPrice}, 'BRL', ${Date.now()}, ${params.purchaseRequestId}, ${params.createdByUserId}, NOW())
    `);
  }
}

type QuotationResponseRow = typeof quotationResponses.$inferSelect;

// Calcula o melhor preço por item entre todas as respostas (respeitando escolha
// manual salva em bestChoices) e agrupa o total por fornecedor vencedor — a MESMA
// lógica usada na planilha comparativa do frontend e no autoProcess, extraída aqui
// pra ser a única fonte de verdade também na hora de confirmar a compra (que pode
// envolver mais de um fornecedor, um por item, não só um fornecedor pra tudo).
function computeBestPriceBreakdown(req: { title: string; itemsJson: string; bestChoices: string | null }, responses: QuotationResponseRow[]) {
  const requestItems = JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>;
  let manualChoices: Record<string, { responseId: number; itemIndex: number; quantity?: string }> = {};
  try { manualChoices = req.bestChoices ? JSON.parse(req.bestChoices as any) : {}; } catch (_) { manualChoices = {}; }
  const normName = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\d+\s*l\b/gi, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const fuzzy = (a: string, b: string) => {
    const na = normName(a), nb = normName(b);
    if (na === nb) return true;
    if (!na || !nb) return false;
    const ca = na.replace(/\s+/g, '');
    const cb = nb.replace(/\s+/g, '');
    if (ca === cb) return true;
    if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
    // Palavras significativas: ≥3 letras, OU qualquer token com dígito (ex: "68", "10w",
    // "15w40") — números curtos são o que distingue produtos parecidos ("68 hidráulico"
    // vs "15w40 hidráulico"), não podem ser descartados aqui.
    const w = (s: string) => s.split(' ').filter(x => x.length >= 3 || /\d/.test(x));
    const wa = w(na), wb = w(nb);
    if (wa.length === 0 || wb.length === 0) return false;
    const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    return shorter.every(x => longer.includes(x));
  };
  const litersOf = (pack?: string) => {
    if (!pack) return null;
    const p = pack.trim().toUpperCase();
    const map: Record<string, number> = { '1L': 1, '5L': 5, '10L': 10, '20L': 20, '200L': 200 };
    if (map[p]) return map[p]!;
    const m = p.match(/(\d+(?:[\.,]\d+)?)\s*L/);
    return m ? parseFloat(m[1]!.replace(',', '.')) : null;
  };
  const comparablePrice = (it: { price: string; quantity: string; packaging?: string }) => {
    const price = parseFloat(String(it.price).replace(',', '.'));
    if (isNaN(price)) return NaN;
    const lit = litersOf(it.packaging);
    if (lit && lit > 0) return price / lit;
    return price;
  };

  const summaryItems: Array<{
    name: string; quantity: string; unit: string;
    bestPrice: number; bestSupplierId: number | null; bestSupplierName: string; bestSupplierPhone: string | null;
    subtotal: number; found: boolean;
  }> = [];

  for (const reqItem of requestItems) {
    const manual = manualChoices[reqItem.name] || manualChoices[normName(reqItem.name)];
    let bestPrice = Infinity;
    let bestCmp = Infinity;
    let bestSupplierId: number | null = null;
    let bestSupplierName = '';
    let bestSupplierPhone: string | null = null;
    let found = false;
    if (manual) {
      const resp = responses.find(r => r.id === manual.responseId);
      if (resp) {
        const respItems = JSON.parse(resp.itemsJson || "[]") as Array<{ name: string; quantity: string; unit?: string; price: string; packaging?: string }>;
        const it = respItems[manual.itemIndex];
        if (it) {
          const p = parseFloat(String(it.price).replace(',', '.'));
          if (!isNaN(p) && p > 0) {
            bestPrice = p; bestSupplierId = resp.supplierId ?? null; bestSupplierName = (resp.tradeName || resp.supplierName) || ''; bestSupplierPhone = resp.sellerPhone || null; found = true;
          }
        }
      }
    }
    if (!found) {
      for (const resp of responses) {
        const respItems = JSON.parse(resp.itemsJson || "[]") as Array<{ name: string; quantity: string; unit?: string; price: string; packaging?: string }>;
        const match = respItems.find(it => fuzzy(it.name, reqItem.name));
        if (match) {
          const price = parseFloat(String(match.price).replace(',', '.'));
          const cmp = comparablePrice(match);
          if (!isNaN(price) && price > 0 && !isNaN(cmp) && cmp < bestCmp) {
            bestCmp = cmp;
            bestPrice = price;
            bestSupplierId = resp.supplierId ?? null;
            bestSupplierName = (resp.tradeName || resp.supplierName) || '';
            bestSupplierPhone = resp.sellerPhone || null;
            found = true;
          }
        }
      }
    }
    // Se o override manual trouxe uma quantidade (comprar mais/menos que o pedido
    // original, ex: fornecedor não tem tudo), ela prevalece sobre a solicitada.
    const finalQuantity = (manual?.quantity && manual.quantity.trim()) ? manual.quantity : reqItem.quantity;
    const qty = parseFloat(finalQuantity) || 1;
    summaryItems.push({
      name: reqItem.name, quantity: finalQuantity, unit: reqItem.unit || 'un',
      bestPrice: found ? bestPrice : 0, bestSupplierId, bestSupplierName, bestSupplierPhone,
      subtotal: found ? bestPrice * qty : 0, found,
    });
  }

  const grandTotal = summaryItems.reduce((sum, item) => sum + item.subtotal, 0);

  const bySupplierMap = new Map<number, { supplierId: number; supplierName: string; subtotal: number }>();
  for (const item of summaryItems) {
    if (!item.found || !item.bestSupplierId) continue;
    const cur = bySupplierMap.get(item.bestSupplierId) || { supplierId: item.bestSupplierId, supplierName: item.bestSupplierName, subtotal: 0 };
    cur.subtotal += item.subtotal;
    bySupplierMap.set(item.bestSupplierId, cur);
  }
  const bySupplier = Array.from(bySupplierMap.values()).sort((a, b) => b.subtotal - a.subtotal);

  return { summaryItems, grandTotal, bySupplier };
}

export const quotationRequestsRouter = router({
  // Listar todas as solicitações (protegido)
  list: moduleProcedure("orcamentos").query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(quotationRequests).orderBy(desc(quotationRequests.createdAt));
    const allResponses = await db.select({
      id: quotationResponses.id,
      quotationRequestId: quotationResponses.quotationRequestId,
    }).from(quotationResponses);
    const countByRequest = new Map<number, number>();
    for (const r of allResponses) {
      countByRequest.set(r.quotationRequestId, (countByRequest.get(r.quotationRequestId) || 0) + 1);
    }
    return rows.map((r: typeof quotationRequests.$inferSelect) => ({
      ...r,
      items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
      isExpired: Date.now() > r.expiresAt,
      responseCount: countByRequest.get(r.id) || 0,
    }));
  }),

  // Tabela de consulta de itens já orçados: uma linha por item cotado por um fornecedor
  // (nome do item, preço, data do orçamento, fornecedor, CNPJ).
  listItemCatalog: moduleProcedure("orcamentos").query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const requests = await db.select().from(quotationRequests);
    const requestTitleById = new Map<number, string>(requests.map((r: typeof quotationRequests.$inferSelect) => [r.id, r.title]));

    const responses = await db.select().from(quotationResponses).orderBy(desc(quotationResponses.createdAt));

    const rows: Array<{
      itemName: string;
      price: number;
      unit: string;
      quotationDate: string;
      supplierName: string;
      cnpj: string | null;
      requestTitle: string;
    }> = [];

    for (const resp of responses) {
      let items: Array<{ name: string; price?: string; unit?: string }> = [];
      try { items = JSON.parse(resp.itemsJson || "[]"); } catch { items = []; }
      for (const it of items) {
        const rawName = it?.name?.trim();
        if (!rawName || !it?.price) continue;
        const priceNum = parseFloat(String(it.price).replace(',', '.'));
        if (isNaN(priceNum)) continue;
        rows.push({
          itemName: rawName,
          price: priceNum,
          unit: it.unit || '',
          quotationDate: resp.createdAt,
          supplierName: resp.tradeName || resp.supplierName,
          cnpj: resp.cnpj || null,
          requestTitle: requestTitleById.get(resp.quotationRequestId) || '',
        });
      }
    }

    return rows.sort((a, b) => new Date(b.quotationDate).getTime() - new Date(a.quotationDate).getTime());
  }),

  // Buscar por ID com respostas (protegido)
  getById: moduleProcedure("orcamentos")
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
      const [prRows] = await db.execute(sql`SELECT id, status, final_price, payment_method, invoice_url, receipt_url FROM purchase_requests WHERE quotation_request_id = ${input.id} LIMIT 1`) as any;
      const linkedPr = (prRows as any[])[0];
      return {
        ...req,
        items: JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
        isExpired: Date.now() > req.expiresAt,
        purchaseRequestId: linkedPr?.id ?? null,
        // Já decidida = tem preço final gravado (Comprada/Recebida/etc — qualquer status
        // além de pendente/lida/analisando/comprando "em aberto").
        purchaseRequestDecided: !!linkedPr?.final_price,
        purchasePaymentMethod: linkedPr?.payment_method ?? null,
        purchaseInvoiceUrl: linkedPr?.invoice_url ?? null,
        purchaseReceiptUrl: linkedPr?.receipt_url ?? null,
        responses: responses.map((r: typeof quotationResponses.$inferSelect) => ({
          ...r,
          items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string; price: string; brand?: string; notes?: string }>,
        })),
      };
    }),

  // Criar nova solicitação (protegido)
  create: moduleProcedure("orcamentos")
    .input(
      z.object({
        title: z.string().min(1),
        requesterId: z.number().optional(),
        requesterName: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterEmail: z.string().optional(),
        purchaseRequestId: z.number().optional(),
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

      // Vincula à Solicitação de Compra de origem, se veio de lá (fecha o ciclo)
      if (input.purchaseRequestId) {
        await db.execute(sql`UPDATE purchase_requests SET quotation_request_id = ${id}, updated_at = NOW() WHERE id = ${input.purchaseRequestId}`).catch(() => {});
      }

      return { id, token };
    }),

  // Cancelar solicitação (protegido)
  cancel: moduleProcedure("orcamentos")
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

  // Editar resposta/fornecedor (protegido) — permite corrigir dados e condições
  adminUpdateResponse: moduleProcedure("orcamentos")
    .input(z.object({
      responseId: z.number(),
      supplierName: z.string().optional(),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      sellerName: z.string().optional(),
      sellerPhone: z.string().optional(),
      sellerEmail: z.string().optional(),
      paymentTerms: z.string().optional(),
      deliveryTerms: z.string().optional(),
      productsSold: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const set: any = {};
      if (input.supplierName !== undefined) set.supplierName = input.supplierName;
      if (input.tradeName !== undefined) set.tradeName = input.tradeName;
      if (input.cnpj !== undefined) set.cnpj = input.cnpj;
      if (input.address !== undefined) set.address = input.address;
      if (input.sellerName !== undefined) set.sellerName = input.sellerName;
      if (input.sellerPhone !== undefined) set.sellerPhone = input.sellerPhone;
      if (input.sellerEmail !== undefined) set.sellerEmail = input.sellerEmail;
      if (input.paymentTerms !== undefined) set.paymentTerms = input.paymentTerms;
      if (input.deliveryTerms !== undefined) set.deliveryTerms = input.deliveryTerms;
      if (input.productsSold !== undefined) set.productsSold = input.productsSold;
      if (input.notes !== undefined) set.notes = input.notes;
      await db.update(quotationResponses).set(set).where(eq(quotationResponses.id, input.responseId));
      return { success: true };
    }),

  // Editar itens de uma resposta (protegido) — corrige preço/embalagem/quantidade que o fornecedor esqueceu
  adminUpdateResponseItems: moduleProcedure("orcamentos")
    .input(z.object({
      responseId: z.number(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string().optional(),
        price: z.string(),
        brand: z.string().optional(),
        packaging: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(quotationResponses)
        .set({ itemsJson: JSON.stringify(input.items) })
        .where(eq(quotationResponses.id, input.responseId));
      return { success: true };
    }),

  // Escolher manualmente o vencedor de cada item do comparativo (override do melhor preço)
  adminSetBestChoice: moduleProcedure("orcamentos")
    .input(z.object({
      quotationRequestId: z.number(),
      // quantity é opcional: quando informada, sobrescreve a quantidade solicitada
      // originalmente (ex: fornecedor não tem tudo, ou decidiu comprar menos/mais).
      choices: z.record(z.string(), z.object({ responseId: z.number(), itemIndex: z.number(), quantity: z.string().optional() })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.quotationRequestId));
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(quotationRequests).set({ bestChoices: JSON.stringify(input.choices) }).where(eq(quotationRequests.id, input.quotationRequestId));
      return { success: true };
    }),

  // Fecha o ciclo: grava o fornecedor vencedor + preço final na Solicitação de
  // Compra vinculada a este orçamento (se houver) e marca as linhas do catálogo
  // (quotations) daquele fornecedor/categoria como consumidas por esta compra.
  confirmPurchaseDecision: moduleProcedure("orcamentos")
    .input(z.object({
      quotationRequestId: z.number(),
      paymentMethod: z.enum(['boleto', 'pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia', 'outro'], { error: "Informe a forma de pagamento" }),
      invoiceUrl: z.string({ error: "Anexe a nota fiscal" }).url("Anexe a nota fiscal"),
      receiptUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.quotationRequestId));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      const [prRows] = await db.execute(sql`SELECT id FROM purchase_requests WHERE quotation_request_id = ${input.quotationRequestId} LIMIT 1`) as any;
      const purchaseRequestId = (prRows as any[])[0]?.id;
      if (!purchaseRequestId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este orçamento não está vinculado a nenhuma solicitação de compra" });
      }

      // Melhor preço por item (respeitando escolha manual) pode envolver mais de um
      // fornecedor — cada item fecha com quem tiver o melhor preço dele, não um só pra tudo.
      // Não depende de "Resumo Gestores" ter rodado antes: garante fornecedor/categoria aqui mesmo.
      const responses = await db.select().from(quotationResponses).where(eq(quotationResponses.quotationRequestId, input.quotationRequestId));
      if (responses.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma resposta recebida para esta solicitação ainda." });
      }
      const { categoryId } = await ensureSuppliersAndCategory(db, req, responses, ctx.user.id);
      const { summaryItems, grandTotal, bySupplier } = computeBestPriceBreakdown(req, responses);
      if (bySupplier.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum item com preço definido ainda — escolha os vencedores na planilha antes de confirmar." });
      }

      await recordWinningQuotations(db, { categoryId, purchaseRequestId, createdByUserId: ctx.user.id, summaryItems });

      const result = await applyPurchaseQuotationDecision(db, {
        purchaseRequestId,
        winningSupplierId: bySupplier[0]!.supplierId,
        finalPrice: grandTotal.toFixed(2),
        suppliersBreakdown: bySupplier,
        userId: ctx.user.id,
        paymentMethod: input.paymentMethod,
        invoiceUrl: input.invoiceUrl,
        receiptUrl: input.receiptUrl,
      });
      return { ...result, purchaseRequestId, suppliersBreakdown: bySupplier, grandTotal };
    }),

  // Caminho inverso: quando o orçamento foi feito por iniciativa do financeiro
  // (sem uma Solicitação de Compra prévia), gera uma Solicitação de Compra já
  // com o fornecedor vencedor e o preço final preenchidos, pra ficar rastreável.
  createPurchaseRequestFromDecision: moduleProcedure("orcamentos")
    .input(z.object({
      quotationRequestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.quotationRequestId));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      const [existingRows] = await db.execute(sql`SELECT id FROM purchase_requests WHERE quotation_request_id = ${input.quotationRequestId} LIMIT 1`) as any;
      if ((existingRows as any[])[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este orçamento já tem uma solicitação de compra vinculada; use Confirmar Compra na tela da solicitação." });
      }

      const responses = await db.select().from(quotationResponses).where(eq(quotationResponses.quotationRequestId, input.quotationRequestId));
      if (responses.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma resposta recebida para esta solicitação ainda." });
      }
      const { categoryId } = await ensureSuppliersAndCategory(db, req, responses, ctx.user.id);
      const { summaryItems, grandTotal, bySupplier } = computeBestPriceBreakdown(req, responses);
      if (bySupplier.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum item com preço definido ainda — escolha os vencedores na planilha antes de gerar a compra." });
      }
      const winningSupplierId = bySupplier[0]!.supplierId;
      const finalPrice = grandTotal.toFixed(2);
      const suppliersBreakdownJson = JSON.stringify(bySupplier);

      // Já nasce "Comprada" com a data de hoje — a decisão (fornecedor+preço+quantidade
      // revisados) já É a compra sendo efetivada, não um passo em aberto.
      const nowMs = Date.now();
      const [insertResult] = await db.execute(sql`
        INSERT INTO purchase_requests
          (title, status, urgency, requested_at, purchased_at, requested_by, quotation_request_id, winning_supplier_id, final_price, suppliers_breakdown, responded_by, responded_at, created_at, updated_at)
        VALUES
          (${req.title}, 'comprada', 'medium', ${nowMs}, ${nowMs}, ${ctx.user.id}, ${input.quotationRequestId}, ${winningSupplierId}, ${finalPrice}, ${suppliersBreakdownJson}, ${ctx.user.id}, NOW(), NOW(), NOW())
      `) as any;
      const purchaseRequestId = (insertResult as any).insertId;

      // Usa a quantidade FINAL resolvida (respeitando qualquer edição feita na revisão
      // antes de confirmar), não a quantidade originalmente pedida no orçamento.
      if (summaryItems.length > 0) {
        await db.insert(purchaseRequestItems).values(
          summaryItems.map(item => ({
            requestId: purchaseRequestId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || 'un',
            confirmed: 0,
          }))
        );
      }

      await recordWinningQuotations(db, { categoryId, purchaseRequestId, createdByUserId: ctx.user.id, summaryItems });
      await notifyRequesterPurchaseCompletedWhatsApp(db, purchaseRequestId);

      return { purchaseRequestId, suppliersBreakdown: bySupplier, grandTotal };
    }),

  // ===== AUTOMAÇÃO COMPLETA =====
  // Processa uma solicitação respondida:
  // 1. Cria/atualiza fornecedores de todas as respostas
  // 2. Cria/encontra categoria com o título do orçamento
  // 3. Popula catálogo de preços com todos os itens de todas as respostas
  // 4. Retorna resumo estruturado para mensagem WhatsApp (NÃO cria solicitação de compra)
  autoProcess: moduleProcedure("orcamentos")
    .input(z.object({
      quotationRequestId: z.number(),
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

      const result = {
        suppliersCreated: 0,
        suppliersUpdated: 0,
        categoryId: 0,
        categoryName: req.title,
        catalogEntriesCreated: 0,
      };

      // 2. Criar/atualizar fornecedores de todas as respostas
      const supplierIdByResponse: Map<number, number> = new Map();
      for (const resp of responses) {
        if (!resp.supplierName?.trim()) continue;
        const trimmedName = resp.supplierName.trim();
        const existingRows = await db.execute(
          sql`SELECT id, company_name, phone, whatsapp, email FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`
        );
        const existing = (existingRows as any)[0] as Array<{ id: number; company_name: string; phone: string | null; whatsapp: string | null; email: string | null }>;

        if (existing.length === 0) {
          const [ins] = await db.insert(suppliers).values({
            companyName: resp.supplierName.trim(),
            
            address: resp.address ?? null,
            phone: resp.sellerPhone ?? null,
            whatsapp: resp.sellerPhone ?? null,
            email: resp.sellerEmail ?? null,
            
            notes: resp.notes ?? null,
            
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
        // Guarda o vínculo na própria resposta, pra a tela conseguir montar
        // o seletor de "fornecedor vencedor" na hora de confirmar a compra.
        const linkedId = supplierIdByResponse.get(resp.id);
        if (linkedId && resp.supplierId !== linkedId) {
          await db.update(quotationResponses).set({ supplierId: linkedId }).where(eq(quotationResponses.id, resp.id));
          (resp as any).supplierId = linkedId; // mantém o array em memória em dia pro cálculo abaixo
        }
      }

      // 3. Categoria: reaproveita a categoria REAL da Solicitação de Compra vinculada
      // (se houver) — não cria mais categoria a partir do título do orçamento.
      const [linkedPrRows] = await db.execute(
        sql`SELECT category_id FROM purchase_requests WHERE quotation_request_id = ${req.id} LIMIT 1`
      ) as any;
      const categoryId: number | null = (linkedPrRows as any[])[0]?.category_id ?? null;
      result.categoryId = categoryId ?? 0;

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
          const qUnitPrice = item.price;
          const qTotalPrice = (parseFloat(item.price) * parseFloat(item.quantity || '1')).toFixed(2);
          const qQuotedAt = Date.now();
          const qCreatedBy = ctx.user.id;
          await db.execute(
            sql`INSERT INTO quotations (supplier_id, category_id, product_name, unit, quantity, unit_price, total_price, currency, quoted_at, notes, created_by, created_at) VALUES (${supplierId}, ${categoryId}, ${item.name}, ${qUnit}, ${item.quantity || '1'}, ${qUnitPrice}, ${qTotalPrice}, 'BRL', ${qQuotedAt}, ${qNotes}, ${qCreatedBy}, NOW())`
          );
          result.catalogEntriesCreated++;
        }
      }

      // 5. Calcular melhor preço por item (menor preço entre todas as respostas),
      // respeitando escolha manual em bestChoices — lógica compartilhada com a hora
      // de confirmar a compra (computeBestPriceBreakdown, no topo do arquivo).
      const { summaryItems, grandTotal } = computeBestPriceBreakdown(req, responses);

      // Notificar owner
      try {
        await notifyOwner({
          title: `✅ Orçamento processado: ${req.title}`,
          content: `O orçamento "${req.title}" foi processado.\n\n• ${result.suppliersCreated} fornecedor(es) criado(s)\n• ${result.catalogEntriesCreated} entradas no catálogo\n• Total estimado: R$ ${grandTotal.toFixed(2).replace('.', ',')}`,
        });
      } catch (_) { /* não bloquear */ }

      return {
        ...result,
        quotationRequestId: input.quotationRequestId,
        quotationTitle: req.title,
        requesterName: req.requesterName ?? null,
        summaryItems,
        grandTotal,
        responseCount: responses.length,
      };
    }),

  // ===== ROTAS PÚBLICAS (sem auth) =====

  // Fornecedor busca sua resposta existente pelo token + nome da empresa
  getMyResponse: publicProcedure
    .input(z.object({ token: z.string(), supplierName: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { found: false as const };
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.token, input.token));
      if (!req) return { found: false as const };
      const responses = await db.select().from(quotationResponses)
        .where(eq(quotationResponses.quotationRequestId, req.id));
      const match = responses.find((r: typeof quotationResponses.$inferSelect) =>
        r.supplierName?.toLowerCase().trim() === input.supplierName.toLowerCase().trim()
      );
      if (!match) return { found: false as const };
      return {
        found: true as const,
        response: {
          id: match.id,
          supplierName: match.supplierName,
          cnpj: match.cnpj,
          address: match.address,
          sellerName: match.sellerName,
          sellerPhone: match.sellerPhone,
          sellerEmail: match.sellerEmail,
          notes: match.notes,
          items: JSON.parse(match.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string; price: string; brand?: string; notes?: string }>,
        },
      };
    }),

  // Fornecedor atualiza sua resposta existente (público)
  updateResponse: publicProcedure
    .input(z.object({
      token: z.string(),
      responseId: z.number(),
      supplierName: z.string().min(1),
      cnpj: z.string().min(1, "Informe o CNPJ ou CPF"),
      address: z.string().optional(),
      sellerName: z.string().optional(),
      sellerPhone: z.string().optional(),
      sellerEmail: z.string().optional(),
      paymentTerms: z.string().optional(),
      deliveryTerms: z.string().optional(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string().optional(),
        price: z.string(),
        brand: z.string().optional(),
        packaging: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.token, input.token));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      if (req.status === "cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação cancelada" });
      // Verificar que a resposta pertence a esta solicitação
      const [existing] = await db.select().from(quotationResponses)
        .where(eq(quotationResponses.id, input.responseId));
      if (!existing || existing.quotationRequestId !== req.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Resposta não encontrada" });
      }
      await db.update(quotationResponses).set({
        supplierName: input.supplierName,
        cnpj: input.cnpj ?? null,
        address: input.address ?? null,
        sellerName: input.sellerName ?? null,
        sellerPhone: input.sellerPhone ?? null,
        sellerEmail: input.sellerEmail ?? null,
        paymentTerms: input.paymentTerms ?? null,
        deliveryTerms: input.deliveryTerms ?? null,
        itemsJson: JSON.stringify(input.items),
        notes: input.notes ?? null,
      }).where(eq(quotationResponses.id, input.responseId));
      try {
        await notifyOwner({
          title: `✏️ Orçamento revisado: ${req.title}`,
          content: `O fornecedor "${input.supplierName}" atualizou sua resposta ao orçamento "${req.title}".`,
        });
      } catch (_) { /* não bloquear */ }
      return { success: true };
    }),

  // Fornecedor: verificar se já existe cadastro por CNPJ ou nome (público)
  findSupplier: publicProcedure
    .input(z.object({
      cnpj: z.string().optional(),
      supplierName: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { found: false as const };
      const normCnpj = (input.cnpj || '').replace(/\D/g, '');
      const name = (input.supplierName || '').trim();
      if (!normCnpj && !name) return { found: false as const };
      let rows: any[] = [];
      if (normCnpj) {
        const [r] = await db.execute(sql`SELECT id, company_name, trade_name, cnpj, city, state, phone, whatsapp, email, address, seller_name, pix_key, products_sold FROM suppliers WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj,''),'.',''),'/',''),'-',''),' ','') = ${normCnpj} LIMIT 1`) as any;
        rows = (r as any[]) || [];
      }
      if (rows.length === 0 && name) {
        const [r] = await db.execute(sql`SELECT id, company_name, trade_name, cnpj, city, state, phone, whatsapp, email, address, seller_name, pix_key, products_sold FROM suppliers WHERE LOWER(TRIM(company_name)) = LOWER(${name}) OR LOWER(TRIM(COALESCE(trade_name,''))) = LOWER(${name}) LIMIT 1`) as any;
        rows = (r as any[]) || [];
      }
      const s = rows[0];
      if (!s) return { found: false as const };
      return {
        found: true as const,
        supplier: {
          id: s.id,
          companyName: s.company_name,
          tradeName: s.trade_name,
          cnpj: s.cnpj,
          address: s.address,
          city: s.city,
          state: s.state,
          phone: s.phone,
          whatsapp: s.whatsapp,
          email: s.email,
          sellerName: s.seller_name,
          productsSold: s.products_sold,
        },
      };
    }),

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
        cnpj: z.string().min(1, "Informe o CNPJ ou CPF"),
        address: z.string().optional(),
        sellerName: z.string().optional(),
        sellerPhone: z.string().optional(),
        sellerEmail: z.string().optional(),
        paymentTerms: z.string().optional(),
        deliveryTerms: z.string().optional(),
        tradeName: z.string().optional(),
        productsSold: z.string().optional(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.string(),
            unit: z.string().optional(),
            price: z.string(),
            brand: z.string().optional(),
            packaging: z.string().optional(),
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

      // Anti-duplicação: localizar fornecedor já cadastrado por CNPJ (prioridade) ou nome fantasia/razão
      let linkedSupplierId: number | null = null;
      let linkedSupplier: { tradeName?: string | null; productsSold?: string | null } = {};
      try {
        const normCnpj = (input.cnpj || '').replace(/\D/g, '');
        const name = (input.supplierName || '').trim();
        let found: any[] = [];
        if (normCnpj) {
          const [r] = await db.execute(sql`SELECT id, trade_name, products_sold FROM suppliers WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(cnpj,''),'.',''),'/',''),'-',''),' ','') = ${normCnpj} LIMIT 1`) as any;
          found = (r as any[]) || [];
        }
        if (found.length === 0 && name) {
          const [r] = await db.execute(sql`SELECT id, trade_name, products_sold FROM suppliers WHERE LOWER(TRIM(company_name)) = LOWER(${name}) OR LOWER(TRIM(COALESCE(trade_name,''))) = LOWER(${name}) LIMIT 1`) as any;
          found = (r as any[]) || [];
        }
        if (found[0]) {
          linkedSupplierId = found[0].id;
          linkedSupplier = { tradeName: found[0].trade_name, productsSold: found[0].products_sold };
          // Atualizar dados de contato do fornecedor se a resposta trouxe informações novas
          await db.execute(sql`UPDATE suppliers SET
            phone = COALESCE(NULLIF(phone,''), ${input.sellerPhone || ''}),
            whatsapp = COALESCE(NULLIF(whatsapp,''), ${input.sellerPhone || ''}),
            seller_name = COALESCE(NULLIF(seller_name,''), ${input.sellerName || ''}),
            address = COALESCE(NULLIF(address,''), ${input.address || ''})
            WHERE id = ${linkedSupplierId}`);
        }
      } catch (_) { /* vínculo é best-effort, não bloquear a resposta */ }

      const responseToken = crypto.randomBytes(32).toString("hex");

      const [insertResult] = await db.insert(quotationResponses).values({
        quotationRequestId: req.id,
        supplierName: input.supplierName,
        cnpj: input.cnpj,
        address: input.address,
        sellerName: input.sellerName,
        sellerPhone: input.sellerPhone,
        sellerEmail: input.sellerEmail,
        paymentTerms: input.paymentTerms,
        deliveryTerms: input.deliveryTerms,
        itemsJson: JSON.stringify(input.items),
        notes: input.notes,
        responseToken,
        tradeName: (input.tradeName || linkedSupplier.tradeName || null) as any,
        productsSold: (input.productsSold || linkedSupplier.productsSold || null) as any,
        ...(linkedSupplierId ? { supplierId: linkedSupplierId } : {}),
      } as any);

      const responseId = (insertResult as { insertId: number }).insertId;

      // Atualizar status da solicitação para "respondida"
      await db
        .update(quotationRequests)
        .set({ status: "respondida" })
        .where(eq(quotationRequests.id, req.id));

      // Notificar owner
      try {
        await notifyOwner({
          title: `📬 Nova resposta de orçamento: ${req.title}`,
          content: `O fornecedor "${input.supplierName}" respondeu ao orçamento "${req.title}" com ${input.items.length} item(s).`,
        });
      } catch (_) { /* não bloquear */ }

      // Se este orçamento veio de uma Solicitação de Compra, avisa o financeiro no sino
      try {
        const [prRows] = await db.execute(sql`SELECT id FROM purchase_requests WHERE quotation_request_id = ${req.id} LIMIT 1`) as any;
        if ((prRows as any[])[0]) {
          await notifyFinanceiro({
            type: 'geral',
            title: `Resposta de orçamento recebida: ${req.title}`,
            message: `O fornecedor "${input.supplierName}" respondeu.`,
            relatedId: req.id,
            relatedType: 'quotation_request',
          });
        }
      } catch (_) { /* não bloquear */ }

      return { success: true, responseToken, responseId };
    }),

  // Buscar resposta pelo responseToken (fornecedor acessa para revisar)
  getByResponseToken: publicProcedure
    .input(z.object({ responseToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { found: false as const };
      const [resp] = await db.select().from(quotationResponses)
        .where(eq(quotationResponses.responseToken, input.responseToken));
      if (!resp) return { found: false as const };
      const [req] = await db.select().from(quotationRequests)
        .where(eq(quotationRequests.id, resp.quotationRequestId));
      if (!req) return { found: false as const };
      return {
        found: true as const,
        isCancelled: req.status === 'cancelada',
        response: {
          id: resp.id,
          supplierName: resp.supplierName,
          cnpj: resp.cnpj,
          address: resp.address,
          sellerName: resp.sellerName,
          sellerPhone: resp.sellerPhone,
          sellerEmail: resp.sellerEmail,
          notes: resp.notes,
          createdAt: resp.createdAt,
          updatedAt: (resp as any).updatedAt,
          items: JSON.parse(resp.itemsJson || '[]') as Array<{ name: string; quantity: string; unit: string; price: string; brand?: string; notes?: string }>,
        },
        request: {
          id: req.id,
          title: req.title,
          requesterName: req.requesterName,
          items: JSON.parse(req.itemsJson || '[]') as Array<{ name: string; quantity: string; unit: string }>,
          notes: req.notes,
        },
      };
    }),

  // Atualizar resposta pelo responseToken (fornecedor revisa)
  updateResponseByToken: publicProcedure
    .input(z.object({
      responseToken: z.string(),
      supplierName: z.string().min(1),
      cnpj: z.string().min(1, "Informe o CNPJ ou CPF"),
      address: z.string().optional(),
      sellerName: z.string().optional(),
      sellerPhone: z.string().optional(),
      sellerEmail: z.string().optional(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        unit: z.string().optional(),
        price: z.string(),
        brand: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [resp] = await db.select().from(quotationResponses)
        .where(eq(quotationResponses.responseToken, input.responseToken));
      if (!resp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Resposta não encontrada' });
      const [req] = await db.select().from(quotationRequests)
        .where(eq(quotationRequests.id, resp.quotationRequestId));
      if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
      if (req.status === 'cancelada') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação cancelada' });
      await db.update(quotationResponses).set({
        supplierName: input.supplierName,
        cnpj: input.cnpj ?? null,
        address: input.address ?? null,
        sellerName: input.sellerName ?? null,
        sellerPhone: input.sellerPhone ?? null,
        sellerEmail: input.sellerEmail ?? null,
        itemsJson: JSON.stringify(input.items),
        notes: input.notes ?? null,
      }).where(eq(quotationResponses.id, resp.id));
      try {
        await notifyOwner({
          title: `✏️ Orçamento revisado: ${req.title}`,
          content: `O fornecedor "${input.supplierName}" atualizou sua resposta ao orçamento "${req.title}".`,
        });
      } catch (_) { /* não bloquear */ }
      return { success: true };
    }),
});

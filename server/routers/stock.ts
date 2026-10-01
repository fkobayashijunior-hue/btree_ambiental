// @ts-nocheck
/**
 * stock.ts — Estoque geral com rastreabilidade.
 * Toda entrada/saída/transferência/ajuste vira uma linha IMUTÁVEL em stock_movements
 * (quem, quando, de/para qual local, motivo, compra de origem). stock_balances é só cache
 * do saldo por produto × local, atualizado na MESMA transação de cada movimento.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { moduleProcedure } from "./permissions";
import { getDb } from "../db";
import { notifyUsers } from "./notifications";

async function getPool() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return (db as any).$client;
}

async function withTx<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

const num = (v: any) => (v === null || v === undefined || v === "" ? 0 : Number(v));

// "2", "1,5", "2 cx" -> 2 / 1.5 / 2 (o texto da solicitação é livre; o usuário sempre confirma o número)
export function parseQuantity(text: any): number | null {
  if (text === null || text === undefined) return null;
  const m = String(text).replace(",", ".").match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return isNaN(n) || n <= 0 ? null : n;
}

const normName = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Trava (FOR UPDATE) e devolve o saldo atual de produto × local, criando a linha zerada se não existir.
async function lockBalance(conn: any, productId: number, locationId: number): Promise<number> {
  await conn.execute(
    `INSERT IGNORE INTO stock_balances (product_id, location_id, quantity) VALUES (?, ?, 0)`,
    [productId, locationId]
  );
  const [rows] = await conn.execute(
    `SELECT quantity FROM stock_balances WHERE product_id = ? AND location_id = ? FOR UPDATE`,
    [productId, locationId]
  );
  return num(rows[0]?.quantity);
}

async function setBalance(conn: any, productId: number, locationId: number, quantity: number) {
  await conn.execute(
    `UPDATE stock_balances SET quantity = ? WHERE product_id = ? AND location_id = ?`,
    [quantity.toFixed(3), productId, locationId]
  );
}

async function insertMovement(conn: any, m: {
  productId: number; type: string; quantity: number; fromLocationId?: number | null; toLocationId?: number | null;
  unitCost?: number | null; supplierId?: number | null; purchaseRequestId?: number | null; purchaseRequestItemId?: number | null;
  destinationEquipmentId?: number | null; destinationCollaboratorId?: number | null; destinationNote?: string | null;
  reason?: string | null; performedBy: number; balanceAfter?: number | null;
}) {
  const [res] = await conn.execute(
    `INSERT INTO stock_movements
      (product_id, type, quantity, from_location_id, to_location_id, unit_cost, supplier_id, purchase_request_id,
       purchase_request_item_id, destination_equipment_id, destination_collaborator_id, destination_note, reason,
       performed_by, balance_after)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      m.productId, m.type, m.quantity.toFixed(3), m.fromLocationId ?? null, m.toLocationId ?? null,
      m.unitCost != null ? m.unitCost.toFixed(4) : null, m.supplierId ?? null, m.purchaseRequestId ?? null,
      m.purchaseRequestItemId ?? null, m.destinationEquipmentId ?? null, m.destinationCollaboratorId ?? null,
      m.destinationNote ?? null, m.reason ?? null, m.performedBy, m.balanceAfter != null ? m.balanceAfter.toFixed(3) : null,
    ]
  );
  return res.insertId as number;
}

async function requireProductAndLocation(conn: any, productId: number, locationIds: number[]) {
  const [p] = await conn.execute(`SELECT id, active FROM stock_products WHERE id = ?`, [productId]);
  if (!p[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
  if (!p[0].active) throw new TRPCError({ code: "BAD_REQUEST", message: "Produto inativo" });
  for (const lid of locationIds) {
    const [l] = await conn.execute(`SELECT id, active FROM stock_locations WHERE id = ?`, [lid]);
    if (!l[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Local de estoque não encontrado" });
    if (!l[0].active) throw new TRPCError({ code: "BAD_REQUEST", message: "Local de estoque inativo" });
  }
}

const qtyInput = z.number().positive("Quantidade deve ser maior que zero");

// Fator pra converter "1 unidade recebida" em quantidade de estoque. Produto em L ou kg usa o conteúdo por
// unidade (ex: balde de 20 L); se o conteúdo vier em kg e o estoque for em L (ou o contrário) converte pela
// densidade do produto. Produto contado em "un" ignora o conteúdo (fator 1).
function contentFactor(productUnit: string | null, density: number, content: number | undefined, contentUnit: string | undefined, itemName: string): number {
  const u = (productUnit || "").trim().toLowerCase();
  if (u !== "l" && u !== "kg" && u !== "m") return 1;
  if (!content || content <= 0 || !contentUnit) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `"${itemName}": informe o conteúdo por unidade (ex: 20 L) — o estoque desse produto é em ${productUnit}.` });
  }
  const cu = contentUnit.toLowerCase();
  if (cu === u) return content;
  if (u === "m" || cu === "m") {
    throw new TRPCError({ code: "BAD_REQUEST", message: `"${itemName}": o estoque é em ${productUnit} e o conteúdo veio em ${contentUnit}. Informe o conteúdo em ${productUnit}.` });
  }
  if (!(density > 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `"${itemName}": conteúdo em ${contentUnit} mas o estoque é em ${productUnit}. Cadastre a densidade (kg/L) do produto ou informe o conteúdo em ${productUnit}.` });
  }
  return u === "l" ? content / density : content * density;
}

export const stockRouter = router({
  // ───────── Locais ─────────
  listLocations: moduleProcedure("estoque", "compras").query(async () => {
    const pool = await getPool();
    const [rows] = await pool.execute(`SELECT l.*, e.name AS equipmentName FROM stock_locations l LEFT JOIN equipment e ON e.id = l.equipment_id ORDER BY l.active DESC, l.name`);
    return rows as any[];
  }),
  createLocation: moduleProcedure("estoque")
    .input(z.object({ name: z.string().min(1).max(150), type: z.enum(["almoxarifado", "oficina", "veiculo", "obra", "outro"]), equipmentId: z.number().nullable().optional(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const pool = await getPool();
      const [r] = await pool.execute(`INSERT INTO stock_locations (name, type, equipment_id, notes) VALUES (?,?,?,?)`, [input.name.trim(), input.type, input.equipmentId ?? null, input.notes ?? null]);
      return { id: r.insertId };
    }),
  updateLocation: moduleProcedure("estoque")
    .input(z.object({ id: z.number(), name: z.string().min(1).max(150), type: z.enum(["almoxarifado", "oficina", "veiculo", "obra", "outro"]), equipmentId: z.number().nullable().optional(), notes: z.string().optional(), active: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const pool = await getPool();
      await pool.execute(`UPDATE stock_locations SET name=?, type=?, equipment_id=?, notes=?, active=COALESCE(?, active) WHERE id=?`,
        [input.name.trim(), input.type, input.equipmentId ?? null, input.notes ?? null, input.active === undefined ? null : (input.active ? 1 : 0), input.id]);
      return { success: true };
    }),

  // ───────── Produtos (catálogo) ─────────
  listProducts: moduleProcedure("estoque", "compras").query(async () => {
    const pool = await getPool();
    const [rows] = await pool.execute(`
      SELECT p.*, c.name AS categoryName,
        COALESCE((SELECT SUM(b.quantity) FROM stock_balances b JOIN stock_locations l ON l.id = b.location_id WHERE b.product_id = p.id), 0) AS totalQuantity
      FROM stock_products p LEFT JOIN purchase_categories c ON c.id = p.category_id
      ORDER BY p.active DESC, p.name`) as any;
    return (rows as any[]).map(r => ({ ...r, belowMin: num(r.min_stock) > 0 && num(r.totalQuantity) < num(r.min_stock) }));
  }),
  createProduct: moduleProcedure("estoque")
    .input(z.object({ name: z.string().min(1).max(255), code: z.string().max(50).optional(), brand: z.string().max(100).optional(), tracksWeight: z.boolean().optional(), densityKgL: z.number().positive().nullable().optional(), unit: z.string().min(1).max(20).default("un"), categoryId: z.number().nullable().optional(), minStock: z.number().min(0).default(0), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const pool = await getPool();
      const [dup] = await pool.execute(`SELECT id, name FROM stock_products`) as any;
      const exists = (dup as any[]).find(p => normName(p.name) === normName(input.name));
      if (exists) throw new TRPCError({ code: "CONFLICT", message: `Já existe o produto "${exists.name}" no catálogo.` });
      const [r] = await pool.execute(`INSERT INTO stock_products (name, code, brand, tracks_weight, density_kg_l, unit, category_id, min_stock, notes) VALUES (?,?,?,?,?,?,?,?,?)`,
        [input.name.trim(), input.code || null, input.brand?.trim() || null, input.tracksWeight ? 1 : 0, input.tracksWeight && input.densityKgL ? input.densityKgL.toFixed(3) : null, input.unit, input.categoryId ?? null, input.minStock.toFixed(3), input.notes ?? null]);
      return { id: r.insertId };
    }),
  updateProduct: moduleProcedure("estoque")
    .input(z.object({ id: z.number(), name: z.string().min(1).max(255), code: z.string().max(50).optional(), brand: z.string().max(100).optional(), tracksWeight: z.boolean().optional(), densityKgL: z.number().positive().nullable().optional(), unit: z.string().min(1).max(20), categoryId: z.number().nullable().optional(), minStock: z.number().min(0), notes: z.string().optional(), active: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const pool = await getPool();
      await pool.execute(`UPDATE stock_products SET name=?, code=?, brand=?, tracks_weight=COALESCE(?, tracks_weight), density_kg_l=?, unit=?, category_id=?, min_stock=?, notes=?, active=COALESCE(?, active) WHERE id=?`,
        [input.name.trim(), input.code || null, input.brand?.trim() || null, input.tracksWeight === undefined ? null : (input.tracksWeight ? 1 : 0), input.tracksWeight === false || !input.densityKgL ? null : input.densityKgL.toFixed(3), input.unit, input.categoryId ?? null, input.minStock.toFixed(3), input.notes ?? null, input.active === undefined ? null : (input.active ? 1 : 0), input.id]);
      return { success: true };
    }),

  // Exclusão só de produto SEM histórico (movimentação ou empréstimo/devolução): excluir apagaria a
  // rastreabilidade. Produto que já foi usado deve ser marcado como inativo em "Editar".
  deleteProduct: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return withTx(async (conn) => {
        const [p] = await conn.execute(`SELECT id, name FROM stock_products WHERE id = ? FOR UPDATE`, [input.id]);
        if (!p[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        const [mv] = await conn.execute(`SELECT COUNT(*) AS n FROM stock_movements WHERE product_id = ?`, [input.id]);
        const [ln] = await conn.execute(`SELECT COUNT(*) AS n FROM stock_loans WHERE product_id = ?`, [input.id]);
        if (num(mv[0].n) > 0 || num(ln[0].n) > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `"${p[0].name}" já tem movimentações no estoque e não pode ser excluído (isso apagaria o histórico). Abra "Editar" e desmarque "Ativo" para tirá-lo de uso.` });
        }
        await conn.execute(`UPDATE purchase_request_items SET stock_product_id = NULL WHERE stock_product_id = ?`, [input.id]);
        await conn.execute(`DELETE FROM stock_balances WHERE product_id = ?`, [input.id]);
        await conn.execute(`DELETE FROM stock_products WHERE id = ?`, [input.id]);
        return { success: true };
      });
    }),

  // Sugere produtos a partir dos itens já comprados (nomes distintos, ainda fora do catálogo) — importação assistida.
  suggestProductsFromPurchases: moduleProcedure("estoque").query(async () => {
    const pool = await getPool();
    const [items] = await pool.execute(`
      SELECT TRIM(i.name) AS name, MAX(i.unit) AS unit, pr.category_id AS categoryId, COUNT(*) AS times
      FROM purchase_request_items i JOIN purchase_requests pr ON pr.id = i.request_id
      WHERE TRIM(i.name) != '' GROUP BY TRIM(i.name), pr.category_id`) as any;
    const [existing] = await pool.execute(`SELECT name FROM stock_products`) as any;
    const have = new Set((existing as any[]).map(p => normName(p.name)));
    const byKey = new Map<string, any>();
    for (const it of items as any[]) {
      const k = normName(it.name);
      if (have.has(k)) continue;
      const cur = byKey.get(k);
      if (!cur || it.times > cur.times) byKey.set(k, { ...it, times: (cur?.times || 0) + it.times });
    }
    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }),
  importProducts: moduleProcedure("estoque")
    .input(z.object({ products: z.array(z.object({ name: z.string().min(1), unit: z.string().default("un"), categoryId: z.number().nullable().optional() })).min(1) }))
    .mutation(async ({ input }) => {
      const pool = await getPool();
      const [existing] = await pool.execute(`SELECT name FROM stock_products`) as any;
      const have = new Set((existing as any[]).map(p => normName(p.name)));
      let created = 0;
      for (const p of input.products) {
        const k = normName(p.name);
        if (have.has(k)) continue;
        have.add(k);
        await pool.execute(`INSERT INTO stock_products (name, unit, category_id) VALUES (?,?,?)`, [p.name.trim(), p.unit || "un", p.categoryId ?? null]);
        created++;
      }
      return { created };
    }),

  // ───────── Saldos ─────────
  balances: moduleProcedure("estoque")
    .input(z.object({ productId: z.number().optional(), locationId: z.number().optional(), includeZero: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const pool = await getPool();
      const where: string[] = []; const params: any[] = [];
      if (!input?.includeZero) where.push("b.quantity <> 0");
      if (input?.productId) { where.push("b.product_id = ?"); params.push(input.productId); }
      if (input?.locationId) { where.push("b.location_id = ?"); params.push(input.locationId); }
      const [rows] = await pool.execute(`
        SELECT b.product_id AS productId, b.location_id AS locationId, b.quantity, p.name AS productName, p.unit, p.code,
               p.min_stock AS minStock, c.name AS categoryName, l.name AS locationName, l.type AS locationType
        FROM stock_balances b JOIN stock_products p ON p.id = b.product_id JOIN stock_locations l ON l.id = b.location_id
        LEFT JOIN purchase_categories c ON c.id = p.category_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY p.name, l.name`, params) as any;
      return rows as any[];
    }),

  // ───────── Extrato / rastreabilidade ─────────
  movements: moduleProcedure("estoque")
    .input(z.object({
      productId: z.number().optional(), locationId: z.number().optional(), purchaseRequestId: z.number().optional(),
      type: z.string().optional(), from: z.string().optional(), to: z.string().optional(), limit: z.number().max(2000).default(500),
    }).optional())
    .query(async ({ input }) => {
      const pool = await getPool();
      const where: string[] = []; const params: any[] = [];
      if (input?.productId) { where.push("m.product_id = ?"); params.push(input.productId); }
      if (input?.locationId) { where.push("(m.from_location_id = ? OR m.to_location_id = ?)"); params.push(input.locationId, input.locationId); }
      if (input?.purchaseRequestId) { where.push("m.purchase_request_id = ?"); params.push(input.purchaseRequestId); }
      if (input?.type) { where.push("m.type = ?"); params.push(input.type); }
      if (input?.from) { where.push("m.created_at >= ?"); params.push(input.from + " 00:00:00"); }
      if (input?.to) { where.push("m.created_at <= ?"); params.push(input.to + " 23:59:59"); }
      const [rows] = await pool.execute(`
        SELECT m.id, m.product_id AS productId, m.type, m.quantity, m.unit_cost AS unitCost, m.balance_after AS balanceAfter,
               m.reason, m.destination_note AS destinationNote, m.created_at AS createdAt,
               m.purchase_request_id AS purchaseRequestId, pr.title AS purchaseRequestTitle,
               p.name AS productName, p.unit, lf.name AS fromLocationName, lt.name AS toLocationName,
               COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = m.performed_by ORDER BY c.id LIMIT 1), pu.name) AS performedByName,
               dc.name AS destinationCollaboratorName, de.name AS destinationEquipmentName, s.company_name AS supplierName
        FROM stock_movements m
        JOIN stock_products p ON p.id = m.product_id
        LEFT JOIN stock_locations lf ON lf.id = m.from_location_id
        LEFT JOIN stock_locations lt ON lt.id = m.to_location_id
        LEFT JOIN users pu ON pu.id = m.performed_by
        LEFT JOIN collaborators dc ON dc.id = m.destination_collaborator_id
        LEFT JOIN equipment de ON de.id = m.destination_equipment_id
        LEFT JOIN suppliers s ON s.id = m.supplier_id
        LEFT JOIN purchase_requests pr ON pr.id = m.purchase_request_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY m.created_at DESC, m.id DESC LIMIT ${Number(input?.limit ?? 500)}`, params) as any;
      return rows as any[];
    }),

  // ───────── Recebimento de compra ─────────
  // Itens da solicitação com o que já foi recebido, quantidade sugerida e produto sugerido (mesmo nome normalizado).
  pendingReceipt: moduleProcedure("estoque", "compras")
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input }) => {
      const pool = await getPool();
      const [prs] = await pool.execute(`SELECT id, title, status FROM purchase_requests WHERE id = ?`, [input.purchaseRequestId]) as any;
      if (!(prs as any[])[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      const [items] = await pool.execute(`SELECT * FROM purchase_request_items WHERE request_id = ? ORDER BY id`, [input.purchaseRequestId]) as any;
      const [products] = await pool.execute(`SELECT id, name, unit FROM stock_products WHERE active = 1`) as any;
      const byName = new Map((products as any[]).map(p => [normName(p.name), p]));
      return {
        status: prs[0].status,
        items: (items as any[]).map(i => {
          const requested = parseQuantity(i.quantity) ?? 1;
          const received = num(i.received_quantity);
          const match = byName.get(normName(i.name));
          return {
            id: i.id, name: i.name, unit: i.unit, quantityText: i.quantity,
            requested, received, remaining: Math.max(0, requested - received),
            // conteúdo por embalagem: coluna própria ou, se o pedido veio do WhatsApp/texto ("un de 20 L"), extraído da unidade
            ...(() => {
              if (i.package_size != null && i.package_unit) return { packageSize: num(i.package_size), packageUnit: i.package_unit };
              const m = String(i.unit || "").match(/([\d.,]+)\s*(l|litros?|kg|m|metros?)\b/i);
              const v = m ? parseFloat(m[1].replace(",", ".")) : NaN;
              return m && v > 0 ? { packageSize: v, packageUnit: /^kg$/i.test(m[2]) ? "kg" : /^m/i.test(m[2]) ? "m" : "L" } : { packageSize: null, packageUnit: null };
            })(),
            suggestedProductId: i.stock_product_id ?? match?.id ?? null,
            suggestedLocationId: i.stock_location_id ?? null,
          };
        }),
      };
    }),

  receivePurchaseItems: moduleProcedure("estoque", "compras")
    .input(z.object({
      purchaseRequestId: z.number(),
      receivedByCollaboratorId: z.number({ required_error: "Informe quem recebeu" }),
      items: z.array(z.object({ itemId: z.number(), productId: z.number(), locationId: z.number(), quantityReceived: qtyInput, contentPerUnit: z.number().positive().optional(), contentUnit: z.enum(["L", "kg", "m"]).optional() })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await withTx(async (conn) => {
        const [prs] = await conn.execute(`SELECT id, title, status, requested_by FROM purchase_requests WHERE id = ? FOR UPDATE`, [input.purchaseRequestId]);
        const pr = prs[0];
        if (!pr) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
        if (!["comprada", "purchased"].includes(pr.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Só é possível receber no estoque uma solicitação com status Comprada." });
        }
        const [collabRows] = await conn.execute(`SELECT id FROM collaborators WHERE id = ?`, [input.receivedByCollaboratorId]);
        if (!collabRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador (quem recebeu) não encontrado" });
        const nowMs = Date.now();
        for (const it of input.items) {
          const [rows] = await conn.execute(`SELECT * FROM purchase_request_items WHERE id = ? AND request_id = ? FOR UPDATE`, [it.itemId, input.purchaseRequestId]);
          const item = rows[0];
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: `Item ${it.itemId} não pertence a esta solicitação` });
          const requested = parseQuantity(item.quantity) ?? 1;
          const already = num(item.received_quantity);
          const remaining = requested - already;
          if (remaining <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: `"${item.name}" já foi totalmente recebido.` });
          if (it.quantityReceived > remaining + 1e-9) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `"${item.name}": faltam receber ${remaining}, não ${it.quantityReceived}.` });
          }
          await requireProductAndLocation(conn, it.productId, [it.locationId]);

          // custo e fornecedor vêm do catálogo de preços gravado na decisão da compra (quotations.purchase_request_id)
          const [q] = await conn.execute(
            `SELECT supplier_id, unit_price FROM quotations WHERE purchase_request_id = ? AND product_name = ? ORDER BY id DESC LIMIT 1`,
            [input.purchaseRequestId, item.name]);
          const unitCost = q[0] ? num(q[0].unit_price) : null;
          const supplierId = q[0]?.supplier_id ?? null;

          // quantidade de ESTOQUE = unidades recebidas × conteúdo por unidade (ex: 10 baldes × 20 L = 200 L);
          // o custo do orçamento é por unidade comprada, então vira custo por unidade de estoque (÷ conteúdo).
          const [pInfo] = await conn.execute(`SELECT unit, density_kg_l FROM stock_products WHERE id = ?`, [it.productId]);
          const factor = contentFactor(pInfo[0]?.unit, num(pInfo[0]?.density_kg_l), it.contentPerUnit, it.contentUnit, item.name);
          const stockQty = Number((it.quantityReceived * factor).toFixed(3));
          const balance = await lockBalance(conn, it.productId, it.locationId);
          const newBalance = balance + stockQty;
          await setBalance(conn, it.productId, it.locationId, newBalance);
          await insertMovement(conn, {
            productId: it.productId, type: "entrada", quantity: stockQty, toLocationId: it.locationId,
            unitCost: unitCost != null && factor > 0 ? unitCost / factor : unitCost, supplierId, purchaseRequestId: input.purchaseRequestId, purchaseRequestItemId: it.itemId,
            destinationCollaboratorId: input.receivedByCollaboratorId,
            reason: `Recebimento da Solicitação #${input.purchaseRequestId}${factor !== 1 ? ` (${it.quantityReceived} un × ${it.contentPerUnit} ${it.contentUnit})` : ""}`, performedBy: ctx.user.id, balanceAfter: newBalance,
          });
          const total = already + it.quantityReceived;
          await conn.execute(
            `UPDATE purchase_request_items SET received_quantity = ?, confirmed = ?, stock_product_id = ?, stock_location_id = ?, received_at = ?, received_by = ? WHERE id = ?`,
            [total.toFixed(3), total + 1e-9 >= requested ? 1 : 0, it.productId, it.locationId, nowMs, ctx.user.id, it.itemId]);
        }
        // Solicitação só vira "Recebida" quando TODOS os itens foram totalmente recebidos.
        const [all] = await conn.execute(`SELECT quantity, received_quantity FROM purchase_request_items WHERE request_id = ?`, [input.purchaseRequestId]);
        const complete = (all as any[]).every(i => num(i.received_quantity) + 1e-9 >= (parseQuantity(i.quantity) ?? 1));
        if (complete) {
          await conn.execute(
            `UPDATE purchase_requests SET status = 'recebida', received_at = COALESCE(received_at, ?), updated_at = NOW() WHERE id = ?`,
            [nowMs, input.purchaseRequestId]);
        }
        return { complete, requestedBy: pr.requested_by, title: pr.title };
      });
      if (result.complete && result.requestedBy) {
        await notifyUsers({
          recipientUserIds: [result.requestedBy], type: "geral", title: "Solicitação de compra recebida",
          relatedId: input.purchaseRequestId, relatedType: "purchase_request",
        }).catch(() => {});
      }
      return { success: true, complete: result.complete };
    }),

  // Entrada manual — pra quando o item entra no estoque sem passar por uma Solicitação de
  // Compra (saldo inicial, doação, sobra de obra, item achado na conferência etc.). Se não
  // vier productId, cria o produto no catálogo na hora (mesma dedup por nome do createProduct).
  manualEntry: moduleProcedure("estoque")
    .input(z.object({
      productId: z.number().optional(),
      newProductName: z.string().min(1).max(255).optional(),
      newProductUnit: z.string().min(1).max(20).optional(),
      newProductCategoryId: z.number().nullable().optional(),
      locationId: z.number(),
      quantity: qtyInput,
      unitCost: z.number().min(0).optional(),
      reason: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.productId && !input.newProductName?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um produto do catálogo ou informe o nome de um novo." });
      }
      return withTx(async (conn) => {
        let productId = input.productId ?? null;
        if (!productId) {
          const name = input.newProductName!.trim();
          const [existing] = await conn.execute(`SELECT id, name FROM stock_products`);
          const dup = (existing as any[]).find(p => normName(p.name) === normName(name));
          if (dup) {
            productId = dup.id;
          } else {
            const [r] = await conn.execute(`INSERT INTO stock_products (name, unit, category_id) VALUES (?,?,?)`,
              [name, input.newProductUnit?.trim() || "un", input.newProductCategoryId ?? null]);
            productId = r.insertId;
          }
        }
        await requireProductAndLocation(conn, productId, [input.locationId]);
        const balance = await lockBalance(conn, productId, input.locationId);
        const newBalance = balance + input.quantity;
        await setBalance(conn, productId, input.locationId, newBalance);
        const id = await insertMovement(conn, {
          productId, type: "entrada", quantity: input.quantity, toLocationId: input.locationId,
          unitCost: input.unitCost ?? null, reason: input.reason?.trim() || "Entrada manual",
          performedBy: ctx.user.id, balanceAfter: newBalance,
        });
        return { id, productId, balanceAfter: newBalance };
      });
    }),

  // ───────── Saída / transferência / ajuste ─────────
  registerExit: moduleProcedure("estoque")
    .input(z.object({
      productId: z.number(), locationId: z.number(), quantity: qtyInput.optional(),
      destinationEquipmentId: z.number().nullable().optional(),
      destinationCollaboratorId: z.number().nullable().optional(),
      destinationNote: z.string().max(255).optional(),
      reason: z.string().optional(),
      grossWeightOut: z.number().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.destinationEquipmentId && !input.destinationCollaboratorId && !(input.destinationNote || "").trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe pra onde/quem levou o item (equipamento, colaborador ou destino)." });
      }
      return withTx(async (conn) => {
        await requireProductAndLocation(conn, input.productId, [input.locationId]);
        const [pw] = await conn.execute(`SELECT tracks_weight FROM stock_products WHERE id = ?`, [input.productId]);
        const tracksWeight = !!pw[0]?.tracks_weight;
        const balance = await lockBalance(conn, input.productId, input.locationId);

        // Produto por peso (líquido/pasta): só registra a retirada com o peso na balança. O estoque só baixa
        // na devolução, pelo que foi consumido (peso na saída − peso na devolução).
        if (tracksWeight) {
          if (!input.grossWeightOut) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o peso na balança na saída." });
          if (balance <= 1e-9) throw new TRPCError({ code: "BAD_REQUEST", message: "Sem saldo desse produto nesse local." });
          const [r] = await conn.execute(
            `INSERT INTO stock_loans (product_id, location_id, gross_weight_out, destination_collaborator_id, destination_equipment_id, destination_note, reason, created_by)
             VALUES (?,?,?,?,?,?,?,?)`,
            [input.productId, input.locationId, input.grossWeightOut.toFixed(3), input.destinationCollaboratorId ?? null,
             input.destinationEquipmentId ?? null, input.destinationNote?.trim() || null, input.reason ?? null, ctx.user.id]);
          return { id: r.insertId as number, balanceAfter: balance };
        }

        if (!input.quantity) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a quantidade." });
        if (input.quantity > balance + 1e-9) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente nesse local (disponível: ${balance}).` });
        }
        const newBalance = balance - input.quantity;
        await setBalance(conn, input.productId, input.locationId, newBalance);
        const id = await insertMovement(conn, {
          productId: input.productId, type: "saida", quantity: input.quantity, fromLocationId: input.locationId,
          destinationEquipmentId: input.destinationEquipmentId, destinationCollaboratorId: input.destinationCollaboratorId,
          destinationNote: input.destinationNote?.trim() || null, reason: input.reason ?? null,
          performedBy: ctx.user.id, balanceAfter: newBalance,
        });
        return { id, balanceAfter: newBalance };
      });
    }),

  // Retiradas de produtos controlados por peso (líquidos/pastas), em aberto ou já devolvidas.
  loans: moduleProcedure("estoque")
    .input(z.object({ status: z.enum(["aberta", "devolvida"]).optional(), productId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const pool = await getPool();
      const where: string[] = []; const params: any[] = [];
      if (input?.status) { where.push("l.status = ?"); params.push(input.status); }
      if (input?.productId) { where.push("l.product_id = ?"); params.push(input.productId); }
      const [rows] = await pool.execute(`
        SELECT l.id, l.product_id AS productId, l.location_id AS locationId,
               l.gross_weight_out AS grossWeightOut, l.status, l.gross_weight_in AS grossWeightIn, l.consumed, l.consumed_stock AS consumedStock, p.density_kg_l AS densityKgL,
               l.created_at AS createdAt, l.returned_at AS returnedAt, p.name AS productName, p.unit,
               loc.name AS locationName,
               COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = l.created_by ORDER BY c.id LIMIT 1), cu.name) AS createdByName,
               COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = l.returned_by ORDER BY c.id LIMIT 1), ru.name) AS returnedByName,
               dc.name AS destinationCollaboratorName, de.name AS destinationEquipmentName, l.destination_note AS destinationNote
        FROM stock_loans l
        JOIN stock_products p ON p.id = l.product_id
        JOIN stock_locations loc ON loc.id = l.location_id
        LEFT JOIN users cu ON cu.id = l.created_by
        LEFT JOIN users ru ON ru.id = l.returned_by
        LEFT JOIN collaborators dc ON dc.id = l.destination_collaborator_id
        LEFT JOIN equipment de ON de.id = l.destination_equipment_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY l.status = 'aberta' DESC, l.created_at DESC LIMIT 500`, params) as any;
      return rows as any[];
    }),

  // Devolução: consumo = peso na saída − peso na devolução (mesma balança/embalagem, então a tara se anula).
  // Só o consumo baixa do estoque (movimento "Saída" com quem/onde/motivo da retirada).
  returnLoan: moduleProcedure("estoque")
    .input(z.object({ loanId: z.number(), grossWeightIn: z.number().min(0) }))
    .mutation(async ({ input, ctx }) => {
      return withTx(async (conn) => {
        const [ls] = await conn.execute(`SELECT * FROM stock_loans WHERE id = ? FOR UPDATE`, [input.loanId]);
        const loan = ls[0];
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Retirada não encontrada" });
        if (loan.status !== "aberta") throw new TRPCError({ code: "BAD_REQUEST", message: "Essa retirada já foi devolvida." });
        const out = num(loan.gross_weight_out);
        const consumed = out - input.grossWeightIn;
        if (consumed < -1e-9) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Peso na devolução (${input.grossWeightIn}) maior que na saída (${out}). Confira a balança.` });
        }
        const usedKg = Math.max(0, consumed);
        // Estoque em litros: o consumo em kg (balança) é convertido pela densidade do produto.
        const [dp] = await conn.execute(`SELECT density_kg_l, unit FROM stock_products WHERE id = ?`, [loan.product_id]);
        const density = num(dp[0]?.density_kg_l);
        const unitLabel = dp[0]?.unit || "kg";
        const used = density > 0 ? Number((usedKg / density).toFixed(3)) : usedKg;
        const balance = await lockBalance(conn, loan.product_id, loan.location_id);
        if (used > balance + 1e-9) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Consumo (${used.toFixed(3)} ${unitLabel}) maior que o saldo do local (${balance}). Confira os pesos ou ajuste o estoque.` });
        }
        let movId: number | null = null;
        let newBalance = balance;
        if (used > 1e-9) {
          newBalance = balance - used;
          await setBalance(conn, loan.product_id, loan.location_id, newBalance);
          movId = await insertMovement(conn, {
            productId: loan.product_id, type: "saida", quantity: used, fromLocationId: loan.location_id,
            destinationEquipmentId: loan.destination_equipment_id, destinationCollaboratorId: loan.destination_collaborator_id,
            destinationNote: loan.destination_note, reason: `Consumo da retirada #${loan.id} (saiu ${out} kg, voltou ${input.grossWeightIn} kg = ${usedKg.toFixed(3)} kg${density > 0 ? ` ÷ ${density} kg/L` : ""})${loan.reason ? " — " + loan.reason : ""}`,
            performedBy: ctx.user.id, balanceAfter: newBalance,
          });
        }
        await conn.execute(
          `UPDATE stock_loans SET status = 'devolvida', gross_weight_in = ?, consumed = ?, consumed_stock = ?, return_movement_id = ?, returned_by = ?, returned_at = NOW() WHERE id = ?`,
          [input.grossWeightIn.toFixed(3), usedKg.toFixed(3), used.toFixed(3), movId, ctx.user.id, loan.id]);
        return { consumed: used, consumedKg: usedKg, unit: unitLabel, balanceAfter: newBalance };
      });
    }),

  transfer: moduleProcedure("estoque")
    .input(z.object({ productId: z.number(), fromLocationId: z.number(), toLocationId: z.number(), quantity: qtyInput, collaboratorId: z.number().nullable().optional(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.fromLocationId === input.toLocationId) throw new TRPCError({ code: "BAD_REQUEST", message: "Origem e destino são o mesmo local." });
      return withTx(async (conn) => {
        await requireProductAndLocation(conn, input.productId, [input.fromLocationId, input.toLocationId]);
        // trava sempre na mesma ordem (menor id primeiro) pra não dar deadlock entre transferências opostas
        const ordered = [input.fromLocationId, input.toLocationId].sort((a, b) => a - b);
        const bal: Record<number, number> = {};
        for (const lid of ordered) bal[lid] = await lockBalance(conn, input.productId, lid);
        if (input.quantity > bal[input.fromLocationId] + 1e-9) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente na origem (disponível: ${bal[input.fromLocationId]}).` });
        }
        const fromAfter = bal[input.fromLocationId] - input.quantity;
        await setBalance(conn, input.productId, input.fromLocationId, fromAfter);
        await setBalance(conn, input.productId, input.toLocationId, bal[input.toLocationId] + input.quantity);
        const id = await insertMovement(conn, {
          productId: input.productId, type: "transferencia", quantity: input.quantity,
          fromLocationId: input.fromLocationId, toLocationId: input.toLocationId, destinationCollaboratorId: input.collaboratorId ?? null, reason: input.reason ?? null,
          performedBy: ctx.user.id, balanceAfter: fromAfter,
        });
        return { id };
      });
    }),

  // Contagem de inventário: define o saldo real. Só admin, motivo obrigatório; grava a diferença (com sinal).
  adjust: adminProcedure
    .input(z.object({ productId: z.number(), locationId: z.number(), newQuantity: z.number().min(0), reason: z.string().min(3, "Informe o motivo do ajuste") }))
    .mutation(async ({ input, ctx }) => {
      return withTx(async (conn) => {
        await requireProductAndLocation(conn, input.productId, [input.locationId]);
        const balance = await lockBalance(conn, input.productId, input.locationId);
        const delta = input.newQuantity - balance;
        if (Math.abs(delta) < 1e-9) throw new TRPCError({ code: "BAD_REQUEST", message: "O saldo informado é igual ao atual." });
        await setBalance(conn, input.productId, input.locationId, input.newQuantity);
        const id = await insertMovement(conn, {
          productId: input.productId, type: "ajuste", quantity: delta, toLocationId: input.locationId,
          reason: input.reason, performedBy: ctx.user.id, balanceAfter: input.newQuantity,
        });
        return { id, delta };
      });
    }),
});

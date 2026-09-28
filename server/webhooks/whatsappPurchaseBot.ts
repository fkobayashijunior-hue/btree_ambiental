/**
 * whatsappPurchaseBot.ts
 * Recebe mensagens do WhatsApp (Meta Cloud API webhook) e conduz duas conversas guiadas
 * no mesmo número: (1) criar uma Solicitação de Compra (categoria -> item -> quantidade ->
 * confirmação) e (2) consultar o saldo de um produto no Estoque, por local. Um menu inicial
 * (botões) decide qual das duas o colaborador quer. Só aceita números de colaboradores com
 * login vinculado (collaborators.user_id) — número desconhecido recebe aviso e não anda em
 * nenhum fluxo.
 *
 * Toda a conversa acontece dentro da janela de 24h aberta pela mensagem do próprio
 * colaborador, então nenhuma mensagem enviada aqui é um Message Template pago.
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { sendWhatsAppText, sendWhatsAppList, sendWhatsAppButtons, normalizePhoneLocal } from "../utils/whatsapp";
import { createPurchaseRequestCore } from "../routers/purchaseRequests";

type Urgency = "baixa" | "media" | "alta" | "critica";

type Payload = {
  categoryId?: number;
  categoryName?: string;
  items?: Array<{ name: string; quantity: string; unit: string; packageSize?: number; packageUnit?: "L" | "kg" | "m" }>;
  pendingItemName?: string;
  pendingItemQty?: string;
  urgency?: Urgency;
  // Fluxo "estoque" (consulta de saldo)
  stockMatches?: Array<{ id: number; name: string }>;
};

const URGENCY_LABELS: Record<Urgency, string> = {
  baixa: "🟢 Baixa",
  media: "🟡 Média",
  alta: "🟠 Alta",
  critica: "🔴 Crítica",
};

// GET — challenge de verificação exigido pela Meta ao configurar o webhook.
export function whatsappWebhookVerify(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

// Confere a assinatura HMAC-SHA256 do corpo da requisição (header X-Hub-Signature-256)
// contra o App Secret do Meta — garante que a chamada veio mesmo da Meta.
function isValidSignature(req: Request): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.warn("[WhatsAppBot] WHATSAPP_APP_SECRET não configurado — assinatura não verificada.");
    return true;
  }
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!signature || !rawBody) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// A tabela tem UMA linha por telefone (chave primária é só `phone`) — `flow` apenas
// rotula qual conversa está em andamento ali (hoje: "menu", "compra" ou "estoque").
// Por isso getState não filtra por flow: lê o que estiver lá e deixa o chamador decidir
// pra qual fluxo despachar, com base no `flow` devolvido.
async function getState(db: any, phone: string): Promise<{ flow: string; step: string; payload: Payload } | null> {
  const [rows] = await db.execute(sql`SELECT flow, step, payload FROM whatsapp_conversation_state WHERE phone = ${phone} LIMIT 1`) as any;
  const row = (rows as any[])[0];
  if (!row) return null;
  let payload: Payload = {};
  try { payload = row.payload ? JSON.parse(row.payload) : {}; } catch { /* ignore */ }
  return { flow: row.flow, step: row.step, payload };
}

async function setState(db: any, phone: string, flow: string, step: string, payload: Payload) {
  await db.execute(sql`
    INSERT INTO whatsapp_conversation_state (phone, flow, step, payload, updated_at)
    VALUES (${phone}, ${flow}, ${step}, ${JSON.stringify(payload)}, NOW())
    ON DUPLICATE KEY UPDATE flow = ${flow}, step = ${step}, payload = ${JSON.stringify(payload)}, updated_at = NOW()
  `);
}

async function clearState(db: any, phone: string) {
  await db.execute(sql`DELETE FROM whatsapp_conversation_state WHERE phone = ${phone}`);
}

async function sendMainMenu(toPhone: string) {
  await sendWhatsAppButtons(toPhone, "Olá! O que você precisa?", [
    { id: "menu_compra", title: "Solicitar compra" },
    { id: "menu_estoque", title: "Consultar estoque" },
  ]);
}

async function sendCategoryList(toPhone: string, db: any) {
  const [cats] = await db.execute(sql`SELECT id, name FROM purchase_categories ORDER BY name LIMIT 10`) as any;
  const rows = (cats as any[]).map(c => ({ id: `cat_${c.id}`, title: c.name.slice(0, 24) }));
  if (rows.length === 0) {
    await sendWhatsAppText(toPhone, "Nenhuma categoria cadastrada no sistema ainda. Peça pro financeiro cadastrar uma categoria antes de pedir por aqui.");
    return;
  }
  await sendWhatsAppList(toPhone, "Qual a categoria do que você precisa comprar?", "Escolher categoria", rows);
}

function formatSummary(payload: Payload): string {
  const lines = (payload.items || []).map((it, i) => `${i + 1}. ${it.name} — ${it.quantity} ${it.unit}${it.packageSize ? ` de ${String(it.packageSize).replace(".", ",")} ${it.packageUnit}` : ""}`);
  return [
    `*Resumo da solicitação*`,
    `Categoria: ${payload.categoryName}`,
    ...lines,
    `Urgência: ${payload.urgency ? URGENCY_LABELS[payload.urgency] : "—"}`,
    ``,
    `Confirma a criação dessa solicitação?`,
  ].join("\n");
}

// `toPhone` é o E.164 completo (só serve pra endereçar as respostas via Graph API).
// `stateKey` é o telefone normalizado (DDD+8 dígitos, sem DDI/9) usado como chave da
// tabela whatsapp_conversation_state — os dois NUNCA podem ser trocados entre si, senão
// o estado gravado numa etapa não é encontrado na etapa seguinte.
async function handleTextStep(db: any, toPhone: string, stateKey: string, step: string, payload: Payload, text: string, collaborator: any) {
  if (step === "awaiting_item_name") {
    const name = text.trim();
    if (!name) {
      await sendWhatsAppText(toPhone, "Não entendi o nome do item. Digite o nome do que precisa comprar.");
      return;
    }
    payload.pendingItemName = name;
    await setState(db, stateKey, "compra", "awaiting_item_qty", payload);
    await sendWhatsAppText(toPhone, `Quantas unidades de "${name}" você precisa?\nDigite só o número (ex: 2).`);
    return;
  }
  if (step === "awaiting_item_qty") {
    const m = text.trim().match(/^([\d.,]+)/);
    if (!m) {
      await sendWhatsAppText(toPhone, "Não entendi. Digite só o número de unidades (ex: 2).");
      return;
    }
    payload.pendingItemQty = m[1];
    await setState(db, stateKey, "compra", "awaiting_item_pack", payload);
    await sendWhatsAppButtons(
      toPhone,
      `Qual o conteúdo de cada unidade de "${payload.pendingItemName}"?\nEx: 20 L, 15 L, 20 kg ou 100 m (rolo).\n\nSe for item contado por unidade (filtro, peça), toque em "Não se aplica".`,
      [{ id: "pack_skip", title: "Não se aplica" }]
    );
    return;
  }
  if (step === "awaiting_item_pack") {
    const m = text.trim().match(/^([\d.,]+)\s*(l|lt|lts|litros?|kg|kgs|quilos?|m|mt|mts|metros?)\.?$/i);
    const size = m ? parseFloat(m[1].replace(",", ".")) : NaN;
    if (!m || !(size > 0)) {
      await sendWhatsAppText(toPhone, 'Não entendi. Digite o conteúdo com a unidade (ex: "20 L", "20 kg" ou "100 m") ou toque em "Não se aplica".');
      return;
    }
    await addPendingItem(db, toPhone, stateKey, payload, { packageSize: size, packageUnit: /^(kg|kgs|quilo)/i.test(m[2]) ? "kg" : /^m/i.test(m[2]) ? "m" : "L" });
    return;
  }
  // Qualquer texto solto fora desses dois passos (ex: durante uma escolha de lista/botão)
  // é ignorado com uma dica, pra não confundir a máquina de estados.
  await sendWhatsAppText(toPhone, "Por favor, use as opções da mensagem anterior pra continuar.");
}

async function addPendingItem(db: any, toPhone: string, stateKey: string, payload: Payload, pack?: { packageSize: number; packageUnit: "L" | "kg" | "m" }) {
  payload.items = payload.items || [];
  payload.items.push({ name: payload.pendingItemName || "", quantity: payload.pendingItemQty || "1", unit: "un", ...(pack || {}) });
  delete payload.pendingItemName;
  delete payload.pendingItemQty;
  await setState(db, stateKey, "compra", "awaiting_more_items", payload);
  await sendWhatsAppButtons(toPhone, "Quer adicionar outro item nessa mesma solicitação?", [
    { id: "more_yes", title: "Sim" },
    { id: "more_no", title: "Não, finalizar" },
  ]);
}

async function handleMenuChoice(db: any, toPhone: string, stateKey: string, replyId: string) {
  if (replyId === "menu_compra") {
    await setState(db, stateKey, "compra", "awaiting_category", {});
    await sendCategoryList(toPhone, db);
    return;
  }
  if (replyId === "menu_estoque") {
    await setState(db, stateKey, "estoque", "awaiting_stock_query", {});
    await sendWhatsAppText(toPhone, "Digite o nome (ou parte do nome) do produto que você quer consultar no estoque.");
    return;
  }
  await sendWhatsAppText(toPhone, "Opção não reconhecida. Por favor, use os botões da mensagem.");
}

// ───────── Fluxo "estoque" (consulta de saldo, mesmo número/webhook da compra) ─────────

async function searchStockProducts(db: any, query: string): Promise<Array<{ id: number; name: string; unit: string }>> {
  const like = `%${query.trim()}%`;
  const [rows] = await db.execute(sql`SELECT id, name, unit FROM stock_products WHERE active = 1 AND name LIKE ${like} ORDER BY name LIMIT 10`) as any;
  return rows as any[];
}

async function sendStockBalance(db: any, toPhone: string, productId: number) {
  const [prodRows] = await db.execute(sql`SELECT name, unit FROM stock_products WHERE id = ${productId} LIMIT 1`) as any;
  const p = (prodRows as any[])[0];
  if (!p) {
    await sendWhatsAppText(toPhone, "Produto não encontrado.");
    return;
  }
  const [balRows] = await db.execute(sql`
    SELECT b.quantity, l.name AS locationName
    FROM stock_balances b JOIN stock_locations l ON l.id = b.location_id
    WHERE b.product_id = ${productId} AND b.quantity <> 0
    ORDER BY l.name
  `) as any;
  const rows = balRows as Array<{ quantity: string; locationName: string }>;
  if (rows.length === 0) {
    await sendWhatsAppText(toPhone, `*${p.name}*\nSem estoque em nenhum local no momento.`);
    return;
  }
  const total = rows.reduce((s, r) => s + Number(r.quantity), 0);
  const lines = rows.map(r => `• ${r.locationName}: ${Number(r.quantity).toLocaleString("pt-BR")} ${p.unit}`);
  await sendWhatsAppText(toPhone, [`*${p.name}* — saldo total: ${total.toLocaleString("pt-BR")} ${p.unit}`, ...lines].join("\n"));
}

async function askStockAgain(db: any, toPhone: string, stateKey: string) {
  await setState(db, stateKey, "estoque", "awaiting_stock_again", {});
  await sendWhatsAppButtons(toPhone, "Quer consultar outro item?", [
    { id: "stock_again_yes", title: "Sim" },
    { id: "stock_again_no", title: "Não, obrigado" },
  ]);
}

async function handleStockTextStep(db: any, toPhone: string, stateKey: string, step: string, payload: Payload, text: string) {
  if (step === "awaiting_stock_query") {
    const query = text.trim();
    if (!query) {
      await sendWhatsAppText(toPhone, "Digite o nome do produto que você quer consultar.");
      return;
    }
    const matches = await searchStockProducts(db, query);
    if (matches.length === 0) {
      await sendWhatsAppText(toPhone, `Nenhum produto encontrado com "${query}". Tente outro nome ou peça pro financeiro cadastrar no catálogo de Estoque.`);
      return;
    }
    if (matches.length === 1) {
      await sendStockBalance(db, toPhone, matches[0].id);
      await askStockAgain(db, toPhone, stateKey);
      return;
    }
    payload.stockMatches = matches.map(m => ({ id: m.id, name: m.name }));
    await setState(db, stateKey, "estoque", "awaiting_stock_pick", payload);
    await sendWhatsAppList(
      toPhone, `Encontrei ${matches.length} produtos com "${query}". Qual deles?`, "Escolher produto",
      matches.map(m => ({ id: `stock_${m.id}`, title: m.name.slice(0, 24) }))
    );
    return;
  }
  await sendWhatsAppText(toPhone, "Por favor, use as opções da mensagem anterior pra continuar.");
}

async function handleStockInteractiveStep(db: any, toPhone: string, stateKey: string, step: string, payload: Payload, replyId: string) {
  if (step === "awaiting_stock_pick" && replyId.startsWith("stock_")) {
    const productId = Number(replyId.replace("stock_", ""));
    const match = (payload.stockMatches || []).find(m => m.id === productId);
    if (!match) {
      await sendWhatsAppText(toPhone, "Opção inválida, tente consultar de novo.");
      return;
    }
    await sendStockBalance(db, toPhone, productId);
    await askStockAgain(db, toPhone, stateKey);
    return;
  }
  if (step === "awaiting_stock_again" && (replyId === "stock_again_yes" || replyId === "stock_again_no")) {
    if (replyId === "stock_again_yes") {
      await setState(db, stateKey, "estoque", "awaiting_stock_query", {});
      await sendWhatsAppText(toPhone, "Digite o nome do próximo produto.");
    } else {
      await clearState(db, stateKey);
      await sendWhatsAppText(toPhone, "Até a próxima!");
    }
    return;
  }
  await sendWhatsAppText(toPhone, "Opção não reconhecida. Por favor, use os botões/lista da mensagem.");
}

async function handleInteractiveStep(db: any, toPhone: string, stateKey: string, step: string, payload: Payload, replyId: string, collaborator: any) {
  if (step === "awaiting_category" && replyId.startsWith("cat_")) {
    const categoryId = Number(replyId.replace("cat_", ""));
    const [rows] = await db.execute(sql`SELECT name FROM purchase_categories WHERE id = ${categoryId} LIMIT 1`) as any;
    const cat = (rows as any[])[0];
    if (!cat) {
      await sendWhatsAppText(toPhone, "Categoria inválida, tente de novo.");
      return;
    }
    payload.categoryId = categoryId;
    payload.categoryName = cat.name;
    payload.items = [];
    await setState(db, stateKey, "compra", "awaiting_item_name", payload);
    await sendWhatsAppText(toPhone, `Categoria: ${cat.name}. Qual o nome do item que você precisa?`);
    return;
  }
  if (step === "awaiting_item_pack" && replyId === "pack_skip") {
    await addPendingItem(db, toPhone, stateKey, payload);
    return;
  }
  if (step === "awaiting_more_items" && (replyId === "more_yes" || replyId === "more_no")) {
    if (replyId === "more_yes") {
      await setState(db, stateKey, "compra", "awaiting_item_name", payload);
      await sendWhatsAppText(toPhone, "Qual o nome do próximo item?");
    } else {
      await setState(db, stateKey, "compra", "awaiting_urgency", payload);
      await sendWhatsAppList(toPhone, "Qual a urgência dessa compra?", "Escolher urgência", [
        { id: "urg_baixa", title: URGENCY_LABELS.baixa },
        { id: "urg_media", title: URGENCY_LABELS.media },
        { id: "urg_alta", title: URGENCY_LABELS.alta },
        { id: "urg_critica", title: URGENCY_LABELS.critica },
      ]);
    }
    return;
  }
  if (step === "awaiting_urgency" && replyId.startsWith("urg_")) {
    const urgency = replyId.replace("urg_", "") as Urgency;
    if (!URGENCY_LABELS[urgency]) {
      await sendWhatsAppText(toPhone, "Opção inválida, escolha uma das urgências da lista.");
      return;
    }
    payload.urgency = urgency;
    await setState(db, stateKey, "compra", "confirm", payload);
    await sendWhatsAppButtons(toPhone, formatSummary(payload), [
      { id: "confirm_yes", title: "Confirmar" },
      { id: "confirm_no", title: "Cancelar" },
    ]);
    return;
  }
  if (step === "confirm" && (replyId === "confirm_yes" || replyId === "confirm_no")) {
    if (replyId === "confirm_no") {
      await clearState(db, stateKey);
      await sendWhatsAppText(toPhone, "Solicitação cancelada.");
      return;
    }
    const title = payload.items?.length === 1
      ? payload.items[0].name
      : `${payload.categoryName} (${payload.items?.length || 0} itens)`;
    const result = await createPurchaseRequestCore(db, {
      title,
      categoryId: payload.categoryId,
      urgency: payload.urgency || "media",
      items: payload.items,
      userId: collaborator.userId,
      requesterName: collaborator.name,
    });
    await clearState(db, stateKey);
    await sendWhatsAppText(toPhone, `Solicitação #${result.id} criada com sucesso! O financeiro já foi avisado.`);
    return;
  }
  await sendWhatsAppText(toPhone, "Opção não reconhecida. Por favor, use os botões/lista da mensagem.");
}

export async function whatsappWebhookHandler(req: Request, res: Response) {
  // Responde 200 sempre e rápido — a Meta reenvia (com backoff) se não receber 200,
  // então qualquer erro interno é só logado, nunca propagado pra resposta HTTP.
  res.sendStatus(200);

  if (!isValidSignature(req)) {
    console.error("[WhatsAppBot] Assinatura inválida — requisição ignorada.");
    return;
  }

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message) return; // status update (delivered/read), não é mensagem nova

    const fromRaw: string = message.from; // E.164 sem "+"
    const localPhone = normalizePhoneLocal(fromRaw);
    if (!localPhone) return;

    const db = await getDb();
    if (!db) return;

    const [collabRows] = await db.execute(sql`
      SELECT c.id, c.name, c.user_id AS userId, c.phone
      FROM collaborators c
      WHERE c.user_id IS NOT NULL AND c.phone IS NOT NULL AND c.phone != ''
    `) as any;
    const collaborator = (collabRows as any[]).find(c => normalizePhoneLocal(c.phone) === localPhone);

    if (!collaborator) {
      await sendWhatsAppText(fromRaw, "Esse número não está vinculado a nenhum usuário do sistema. Fale com o financeiro pra liberar o acesso antes de pedir compras por aqui.");
      return;
    }

    let state = await getState(db, localPhone);
    // Sessão expira depois de 30min sem interação — evita retomar um fluxo esquecido.
    if (state) {
      const [rows] = await db.execute(sql`SELECT TIMESTAMPDIFF(MINUTE, updated_at, NOW()) AS mins FROM whatsapp_conversation_state WHERE phone = ${localPhone}`) as any;
      const mins = (rows as any[])[0]?.mins ?? 0;
      if (mins > 30) {
        await clearState(db, localPhone);
        state = null;
      }
    }

    if (!state) {
      await setState(db, localPhone, "menu", "awaiting_menu_choice", {});
      await sendMainMenu(fromRaw);
      return;
    }

    if (message.type === "text") {
      if (state.flow === "compra") {
        await handleTextStep(db, fromRaw, localPhone, state.step, state.payload, message.text?.body || "", collaborator);
      } else if (state.flow === "estoque") {
        await handleStockTextStep(db, fromRaw, localPhone, state.step, state.payload, message.text?.body || "");
      } else {
        await sendWhatsAppText(fromRaw, "Por favor, escolha uma das opções da mensagem anterior.");
      }
    } else if (message.type === "interactive") {
      const replyId = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id;
      if (replyId) {
        if (state.flow === "menu") {
          await handleMenuChoice(db, fromRaw, localPhone, replyId);
        } else if (state.flow === "compra") {
          await handleInteractiveStep(db, fromRaw, localPhone, state.step, state.payload, replyId, collaborator);
        } else if (state.flow === "estoque") {
          await handleStockInteractiveStep(db, fromRaw, localPhone, state.step, state.payload, replyId);
        }
      }
    } else {
      await sendWhatsAppText(fromRaw, "Não entendi essa mensagem. Por favor, use texto ou as opções apresentadas.");
    }
  } catch (err) {
    console.error("[WhatsAppBot] Erro ao processar mensagem:", err);
  }
}

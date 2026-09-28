/**
 * whatsapp.ts
 * Envio de notificações via WhatsApp (Meta Cloud API / Graph API).
 * Falhas nunca sobem pro chamador — só logam — pra nunca travar o fluxo
 * principal (criar carga, anexar NF) por causa de um problema no WhatsApp.
 *
 * Mensagens iniciadas pela empresa (fora de uma janela de 24h de conversa)
 * só podem ser enviadas usando um Message Template pré-aprovado no Meta
 * Business Manager — não dá pra mandar texto livre nesse caso. Os nomes dos
 * templates usados aqui vêm de variáveis de ambiente (configuráveis sem
 * precisar mexer em código, já que dependem de aprovação externa).
 */

const GRAPH_API_VERSION = "v21.0";

// Normaliza pra E.164 sem "+" (formato exigido pela Graph API): remove tudo
// que não for dígito e garante o código do Brasil (55) na frente.
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

// Normaliza pra comparação (DDD + 8 dígitos finais, SEM código do país e SEM o "9"
// extra do celular) — usado pra achar o colaborador dono de um número que chegou via
// webhook (formato E.164 da Meta) contra o que está salvo em collaborators.phone (sem
// DDI, podendo ter espaço/traço/parênteses). O "9" é ignorado de propósito: a Meta às
// vezes manda o wa_id de números brasileiros SEM esse dígito (ex: 554498353366 em vez
// de 5544998353366) mesmo quando o app do usuário mostra o número completo — comparar
// só por DDD+8 dígitos finais cobre os dois formatos.
export function normalizePhoneLocal(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  if (digits.length === 11) digits = digits.slice(0, 2) + digits.slice(3); // remove o "9"
  return digits;
}

const GRAPH_BASE = () => `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.META_WA_PHONE_ID}/messages`;

async function sendWhatsAppRaw(body: Record<string, any>): Promise<boolean> {
  const token = process.env.META_WA_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneNumberId) {
    console.log("[WhatsApp] META_WA_TOKEN/META_WA_PHONE_ID não configurados — envio pulado.");
    return false;
  }
  try {
    const res = await fetch(GRAPH_BASE(), {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[WhatsApp] Falha ao enviar (HTTP ${res.status}): ${errText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar mensagem:", err);
    return false;
  }
}

// Mensagem de texto livre — só pode ser enviada dentro da janela de 24h aberta pela
// última mensagem recebida do usuário (senão a Graph API rejeita). É o caso do bot de
// conversa: a pessoa sempre fala primeiro, então estamos sempre dentro da janela.
export async function sendWhatsAppText(toPhoneE164: string, text: string): Promise<boolean> {
  return sendWhatsAppRaw({
    messaging_product: "whatsapp",
    to: toPhoneE164,
    type: "text",
    text: { body: text },
  });
}

// Lista de opções (até 10 linhas) — usado pra escolher categoria sem depender de
// digitação livre.
export async function sendWhatsAppList(
  toPhoneE164: string,
  bodyText: string,
  buttonLabel: string,
  rows: Array<{ id: string; title: string; description?: string }>
): Promise<boolean> {
  return sendWhatsAppRaw({
    messaging_product: "whatsapp",
    to: toPhoneE164,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: [{ title: "Opções", rows: rows.slice(0, 10) }],
      },
    },
  });
}

// Botões rápidos (até 3) — usado pra perguntas Sim/Não (mais item? é urgente? confirma?).
export async function sendWhatsAppButtons(
  toPhoneE164: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<boolean> {
  return sendWhatsAppRaw({
    messaging_product: "whatsapp",
    to: toPhoneE164,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

export interface WhatsAppTemplateParams {
  toPhone: string | null | undefined;
  templateName: string | undefined;
  /** Parâmetros posicionais do template, na ordem das variáveis {{1}}, {{2}}, ... */
  bodyParams: (string | number)[];
  languageCode?: string; // default: pt_BR
}

export async function sendWhatsAppTemplate(params: WhatsAppTemplateParams): Promise<void> {
  try {
    const token = process.env.META_WA_TOKEN;
    const phoneNumberId = process.env.META_WA_PHONE_ID;
    const to = normalizePhone(params.toPhone);

    if (!token || !phoneNumberId) {
      console.log("[WhatsApp] META_WA_TOKEN/META_WA_PHONE_ID não configurados — envio pulado.");
      return;
    }
    if (!to) {
      console.log("[WhatsApp] Destinatário sem telefone cadastrado — envio pulado.");
      return;
    }
    if (!params.templateName) {
      console.log("[WhatsApp] Nome do template não configurado (variável de ambiente ausente) — envio pulado.");
      return;
    }

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.languageCode || "pt_BR" },
        components: params.bodyParams.length > 0 ? [
          {
            type: "body",
            parameters: params.bodyParams.map(p => ({ type: "text", text: String(p) })),
          },
        ] : undefined,
      },
    };

    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[WhatsApp] Falha ao enviar (HTTP ${res.status}): ${errText}`);
      return;
    }

    console.log(`[WhatsApp] Mensagem enviada (template ${params.templateName}) para ${to}.`);
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar mensagem:", err);
  }
}

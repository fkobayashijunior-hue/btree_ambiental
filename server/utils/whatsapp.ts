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

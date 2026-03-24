/**
 * notifyTeam.ts
 * Helper centralizado para notificações automáticas por e-mail.
 * Envia para todos os destinatários configurados (owner + equipe de gestão).
 *
 * Configuração via variáveis de ambiente:
 *   NOTIFY_EMAILS  — lista separada por vírgula, ex: "mary@btree.com,owner@btree.com"
 *   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_FROM
 */

import nodemailer from "nodemailer";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type NotifyEvent =
  | "presenca_registrada"
  | "abastecimento_registrado"
  | "pedido_pecas_criado"
  | "pedido_compra_criado"
  | "pedido_compra_enviado"
  | "pedido_pecas_aprovado"
  | "pedido_pecas_rejeitado";

export interface NotifyPayload {
  event: NotifyEvent;
  title: string;
  details: Record<string, string | number | null | undefined>;
  registeredBy?: string;
}

// ─── Transporter ──────────────────────────────────────────────────────────────

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }

  // Sem SMTP configurado: log apenas, não envia
  return null;
}

// ─── Template HTML ────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<NotifyEvent, { icon: string; color: string; label: string }> = {
  presenca_registrada:    { icon: "✅", color: "#059669", label: "Presença Registrada" },
  abastecimento_registrado: { icon: "⛽", color: "#0284c7", label: "Abastecimento Registrado" },
  pedido_pecas_criado:    { icon: "🔧", color: "#d97706", label: "Pedido de Peças Criado" },
  pedido_compra_criado:   { icon: "🛒", color: "#7c3aed", label: "Pedido de Compra Criado" },
  pedido_compra_enviado:  { icon: "📤", color: "#0891b2", label: "Pedido de Compra Enviado" },
  pedido_pecas_aprovado:  { icon: "✔️", color: "#16a34a", label: "Pedido de Peças Aprovado" },
  pedido_pecas_rejeitado: { icon: "❌", color: "#dc2626", label: "Pedido de Peças Rejeitado" },
};

function buildHtml(payload: NotifyPayload): string {
  const meta = EVENT_LABELS[payload.event];
  const rows = Object.entries(payload.details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${k}</td>
        <td style="padding:8px 12px;color:#111827;border-bottom:1px solid #e5e7eb;">${v}</td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
    <!-- Header -->
    <div style="background:${meta.color};padding:24px 32px;">
      <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png"
           alt="BTREE Ambiental" style="height:40px;margin-bottom:12px;display:block;" />
      <h2 style="margin:0;color:#fff;font-size:20px;">${meta.icon} ${meta.label}</h2>
    </div>
    <!-- Body -->
    <div style="padding:24px 32px;">
      <p style="color:#374151;margin:0 0 20px;">${payload.title}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
      ${payload.registeredBy ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Registrado por: <strong>${payload.registeredBy}</strong></p>` : ""}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      BTREE Ambiental — Sistema de Gestão Operacional<br/>
      Este é um e-mail automático, não responda.
    </div>
  </div>
</body>
</html>`;
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Envia notificação por e-mail para todos os destinatários configurados em NOTIFY_EMAILS.
 * Falhas são silenciadas para não bloquear o fluxo principal.
 */
export async function notifyTeam(payload: NotifyPayload): Promise<void> {
  const rawEmails = process.env.NOTIFY_EMAILS || "";
  const recipients = rawEmails
    .split(",")
    .map(e => e.trim())
    .filter(e => e.includes("@"));

  if (recipients.length === 0) {
    console.log(`[notifyTeam] NOTIFY_EMAILS não configurado — evento ${payload.event} não enviado por e-mail.`);
    return;
  }

  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log(`[notifyTeam] SMTP não configurado — evento ${payload.event} não enviado.`);
      return;
    }

    const meta = EVENT_LABELS[payload.event];
    const subject = `${meta.icon} ${meta.label} — BTREE Ambiental`;
    const html = buildHtml(payload);

    // Texto simples como fallback
    const text = [
      payload.title,
      "",
      ...Object.entries(payload.details)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${v}`),
      payload.registeredBy ? `\nRegistrado por: ${payload.registeredBy}` : "",
    ].join("\n");

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BTREE Ambiental" <noreply@btreeambiental.com>',
      to: recipients.join(", "),
      subject,
      html,
      text,
    });

    console.log(`[notifyTeam] E-mail enviado (${payload.event}) para: ${recipients.join(", ")}`);
  } catch (err) {
    console.error(`[notifyTeam] Erro ao enviar e-mail (${payload.event}):`, err);
  }
}

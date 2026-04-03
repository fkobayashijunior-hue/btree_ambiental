/**
 * pdfTemplate.ts
 * Utilitário centralizado para geração de PDFs com cabeçalho e rodapé padrão BTREE.
 * Todos os PDFs do sistema devem usar este template.
 */

export const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
export const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
export const BTREE_SITE = "btreeambiental.com";
export const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

/**
 * Gera o HTML completo de um PDF com cabeçalho e rodapé BTREE padronizados.
 * @param title Título do documento (ex: "Ficha do Colaborador")
 * @param subtitle Subtítulo (ex: "BTREE Empreendimentos LTDA · btreeambiental.com")
 * @param content HTML do conteúdo interno (entre cabeçalho e rodapé)
 * @param extraStyles CSS adicional específico do documento
 */
export function buildPdfHtml(
  title: string,
  subtitle: string,
  content: string,
  extraStyles = ""
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} - BTREE Ambiental</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

    /* ── CABEÇALHO ─────────────────────────────────────────────────────── */
    .pdf-header {
      background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%);
      color: white;
      padding: 16px 28px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .pdf-header img { height: 52px; filter: brightness(0) invert(1); }
    .pdf-header-text h1 { font-size: 18px; font-weight: bold; margin: 0; }
    .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }

    /* ── CONTEÚDO ───────────────────────────────────────────────────────── */
    .pdf-content { padding: 20px 28px; }

    /* ── RODAPÉ ─────────────────────────────────────────────────────────── */
    .pdf-footer {
      margin-top: 24px;
      padding: 12px 28px;
      border-top: 2px solid #0d4f2e;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
    .pdf-footer-left img { height: 28px; }
    .pdf-footer-text { font-size: 10px; color: #555; }
    .pdf-footer-text strong { color: #0d4f2e; }
    .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
    .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .pdf-footer-right img { width: 60px; height: 60px; }
    .pdf-footer-right span { font-size: 9px; color: #555; }

    /* ── UTILITÁRIOS ────────────────────────────────────────────────────── */
    .section-title {
      font-size: 13px; font-weight: bold; color: #0d4f2e;
      border-bottom: 2px solid #0d4f2e; padding-bottom: 4px;
      margin: 16px 0 10px; text-transform: uppercase; letter-spacing: 0.05em;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0d4f2e; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f0fdf4; }
    .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .field-value { font-size: 12px; font-weight: 500; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .field { margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .badge-yellow { background: #fef9c3; color: #92400e; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .summary-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
    .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 14px; min-width: 110px; }
    .summary-card .label { font-size: 10px; color: #555; text-transform: uppercase; }
    .summary-card .value { font-size: 14px; font-weight: bold; color: #15803d; }
    .summary-card.red .value { color: #b91c1c; }
    .summary-card.blue .value { color: #1d4ed8; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    ${extraStyles}
  </style>
</head>
<body>
  <!-- CABEÇALHO -->
  <div class="pdf-header">
    <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
    <div class="pdf-header-text">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
  </div>

  <!-- CONTEÚDO -->
  <div class="pdf-content">
    ${content}
  </div>

  <!-- RODAPÉ -->
  <div class="pdf-footer">
    <div class="pdf-footer-left">
      <img src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
      <div class="pdf-footer-text">
        Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
        <a href="https://${BTREE_SITE}">${BTREE_SITE}</a>
      </div>
    </div>
    <div class="pdf-footer-right">
      <img src="${BTREE_QR}" alt="QR Code" />
      <span>Acesse nosso site</span>
    </div>
  </div>

  <script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
</body>
</html>`;
}

/**
 * Abre uma nova janela e imprime o HTML gerado como PDF.
 */
export function openPdfWindow(html: string, onBlocked?: () => void): void {
  const win = window.open("", "_blank");
  if (!win) {
    onBlocked?.();
    return;
  }
  win.document.write(html);
  win.document.close();
}

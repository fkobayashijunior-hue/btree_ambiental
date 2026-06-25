/**
 * Shared PDF utilities for BTREE Ambiental
 * All PDF generation in the system should use these helpers to ensure
 * consistent branding: BTREE logo (base64, no CORS), Kobayashi footer, QR code.
 */

import { BTREE_LOGO_B64 } from "@/lib/btreeLogo";

// ─── External asset URLs (fetched via server proxy to avoid CORS) ─────────────
export const KOBAYASHI_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
export const BTREE_QR_URL =
  "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

// Re-export for convenience
export { BTREE_LOGO_B64 };

// ─── Date helper (handles MySQL timestamp strings like "2026-05-28 00:00:00") ──
export function safeDate(dateStr: string | Date | null | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const s = String(dateStr);
  // MySQL timestamp: "2026-05-28 00:00:00" — replace space with T to make it ISO
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(' ', 'T'));
  }
  // ISO date only: "2026-05-28"
  if (s.length === 10 && s[4] === '-') return new Date(s + 'T12:00:00');
  // ISO with Z and midnight: avoid timezone shift
  if (s.includes('T') && s.endsWith('Z') && s.includes('T00:00:00')) {
    return new Date(s.replace('T00:00:00.000Z', 'T12:00:00'));
  }
  return new Date(s);
}

export function formatDateBR(dateStr: string | Date | null | undefined): string {
  const d = safeDate(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

// ─── Image proxy helper ───────────────────────────────────────────────────────
/**
 * Fetches an external image via the server-side /api/image-proxy endpoint
 * and returns a base64 data URI. Falls back to the original URL on error.
 * This avoids CORS issues when html2canvas tries to render external images.
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return url;
    const data = await res.json();
    return data.base64 || url;
  } catch {
    return url;
  }
}

/**
 * Pre-loads the Kobayashi logo and QR code as base64 via proxy.
 * Returns [kobayashiB64, qrB64] — both ready to embed in PDF HTML.
 */
export async function loadPdfAssets(): Promise<[string, string]> {
  return Promise.all([
    fetchImageAsBase64(KOBAYASHI_LOGO_URL),
    fetchImageAsBase64(BTREE_QR_URL),
  ]);
}

// ─── PDF HTML building blocks ─────────────────────────────────────────────────

/**
 * Returns the standard BTREE header HTML for PDF documents.
 * Uses the embedded base64 logo (no CORS).
 */
export function buildPdfHeaderHtml(title: string, subtitle?: string): string {
  return `
<div class="pdf-header">
  <div class="pdf-header-logo">
    <img src="${BTREE_LOGO_B64}" alt="BTREE Ambiental" />
  </div>
  <div class="pdf-header-info">
    <h1 class="pdf-title">${title}</h1>
    ${subtitle ? `<p class="pdf-subtitle">${subtitle}</p>` : ""}
  </div>
</div>`;
}

/**
 * Returns the standard Kobayashi footer HTML for PDF documents.
 * @param kobayashiB64 - base64 data URI of the Kobayashi logo
 * @param qrB64 - base64 data URI of the QR code
 */
export function buildPdfFooterHtml(kobayashiB64: string, qrB64: string): string {
  return `
<div class="pdf-footer">
  <div class="pdf-footer-left">
    ${kobayashiB64 ? `<img src="${kobayashiB64}" alt="Kobayashi" />` : ""}
    <div class="pdf-footer-text">
      Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
      <a href="https://btreeambiental.com">btreeambiental.com</a>
    </div>
  </div>
  <div class="pdf-footer-right">
    ${qrB64 ? `<img src="${qrB64}" alt="QR Code" />` : ""}
    <span>Acesse nosso site</span>
  </div>
</div>`;
}

/**
 * Standard CSS styles for PDF documents.
 * Include this inside a <style> tag in your PDF HTML.
 */
export const PDF_BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

  /* Header */
  .pdf-header { display: flex; align-items: center; gap: 16px; padding: 16px 32px 12px; border-bottom: 3px solid #0d4f2e; background: #f0fdf4; }
  .pdf-header-logo img { height: 48px; width: auto; }
  .pdf-header-info { flex: 1; }
  .pdf-title { font-size: 18px; font-weight: 700; color: #0d4f2e; }
  .pdf-subtitle { font-size: 12px; color: #4b7c5e; margin-top: 2px; }

  /* Footer */
  .pdf-footer { padding: 12px 32px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; margin-top: auto; background: #f9fafb; }
  .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
  .pdf-footer-left img { height: 28px; }
  .pdf-footer-text { font-size: 10px; color: #555; line-height: 1.5; }
  .pdf-footer-text strong { color: #0d4f2e; }
  .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
  .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-footer-right img { width: 60px; height: 60px; }
  .pdf-footer-right span { font-size: 9px; color: #888; }

  /* Content area */
  .pdf-content { padding: 16px 32px; flex: 1; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #0d4f2e; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }

  /* Section titles */
  .section-title { font-size: 14px; font-weight: 700; color: #0d4f2e; margin: 16px 0 8px; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }

  /* Info cards */
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .info-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 12px; }
  .info-card-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-card-value { font-size: 14px; font-weight: 700; color: #0d4f2e; margin-top: 2px; }

  /* Photo grid */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
  .photo-grid img { width: 100%; height: 140px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }

  /* Page wrapper */
  .pdf-page { min-height: 1050px; display: flex; flex-direction: column; }
`;

// ─── PDF generation engine ────────────────────────────────────────────────────

/**
 * Computes smart page-break offsets by scanning the rendered DOM for
 * block-level elements (.section, tr, .photo-item, .cargo-block) and
 * ensuring none are sliced across a page boundary.
 *
 * Returns an array of Y pixel offsets (in canvas pixels at `scale`) where
 * each new page should start.
 */
function computeSmartBreaks(
  doc: Document,
  scale: number,
  pageHeightPx: number
): number[] {
  const canvasPageH = Math.floor(pageHeightPx * scale);
  // Elements we never want to cut through
  const blockSelectors = [
    ".section",
    ".cargo-block",
    ".photo-item",
    ".photos-grid",
    ".summary-box",
    "tr",
    "tfoot",
    "thead",
  ];
  const elements = Array.from(
    doc.querySelectorAll(blockSelectors.join(","))
  ) as HTMLElement[];

  const bodyTop = doc.body.getBoundingClientRect().top;

  // Build sorted list of element boundaries (top, bottom) in canvas coords
  const boundaries: { top: number; bottom: number }[] = elements.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: Math.floor((rect.top - bodyTop) * scale),
      bottom: Math.ceil((rect.bottom - bodyTop) * scale),
    };
  });

  const totalH = Math.ceil(doc.body.scrollHeight * scale);
  const breaks: number[] = [0];
  let pageStart = 0;

  while (pageStart + canvasPageH < totalH) {
    const idealEnd = pageStart + canvasPageH;

    // Find the best cut point: just before any element that straddles idealEnd
    let cutAt = idealEnd;
    for (const b of boundaries) {
      if (b.top < idealEnd && b.bottom > idealEnd) {
        // This element straddles the cut — move cut to just before it
        cutAt = Math.min(cutAt, b.top);
      }
    }

    // Safety: if cutAt hasn't moved or moved too far back, just use idealEnd
    if (cutAt <= pageStart + 100) cutAt = idealEnd;

    pageStart = cutAt;
    breaks.push(pageStart);
  }

  return breaks;
}

/**
 * Renders an HTML string in a hidden iframe, captures it with html2canvas,
 * and saves as a multi-page PDF. Uses smart page-break detection to avoid
 * slicing sections, photos, and table rows across page boundaries.
 */
export async function generatePDFFromHtml(
  html: string,
  filename: string,
  onProgress?: (msg: string) => void,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  const isLandscape = orientation === 'landscape';
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    const iframeW = isLandscape ? 1400 : 794;
    const iframeMinH = isLandscape ? 794 : 1123;
    iframe.style.cssText =
      `position:fixed;top:-9999px;left:-9999px;width:${iframeW}px;height:auto;min-height:${iframeMinH}px;border:none;visibility:hidden;`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      reject(new Error("iframe error"));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for all images to load before capturing
    const allImgs = Array.from(doc.querySelectorAll("img"));
    const imgPromises = allImgs.map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete && img.naturalHeight > 0) {
            res();
            return;
          }
          img.onload = () => res();
          img.onerror = () => res();
          // Longer timeout for Cloudinary images
          setTimeout(res, 8000);
        })
    );

    Promise.all(imgPromises).then(async () => {
      try {
        onProgress?.("Gerando PDF...");
        const { default: html2canvas } = await import("html2canvas");
        const { jsPDF } = await import("jspdf");

        const pageWidthPx = isLandscape ? 1400 : 794;
        const pageHeightPx = isLandscape ? 794 : 1123;
        const scale = 1.5;

        // Compute smart breaks BEFORE capturing (DOM is still live)
        const breaks = computeSmartBreaks(doc, scale, pageHeightPx);

        const canvas = await html2canvas(doc.body, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          width: pageWidthPx,
          windowWidth: pageWidthPx,
          scrollX: 0,
          scrollY: 0,
          logging: false,
        });

        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: "px",
          format: "a4",
          compress: true,
        });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        const totalCanvasH = canvas.height;
        const totalCanvasW = canvas.width;
        const canvasPageH = Math.floor(pageHeightPx * scale);

        for (let i = 0; i < breaks.length; i++) {
          if (i > 0) pdf.addPage();

          const srcY = breaks[i];
          const nextBreak = breaks[i + 1] ?? totalCanvasH;
          const srcH = Math.min(nextBreak - srcY, canvasPageH, totalCanvasH - srcY);
          if (srcH <= 0) break;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = totalCanvasW;
          pageCanvas.height = canvasPageH;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0, srcY,
              totalCanvasW, srcH,
              0, 0,
              totalCanvasW, srcH
            );
          }

          const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
        }

        pdf.save(filename);
        document.body.removeChild(iframe);
        resolve();
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    });
  });
}

/**
 * Wraps HTML content in a full PDF document with standard header and footer.
 * @param title - Main title shown in the header
 * @param subtitle - Optional subtitle (e.g. date range, location)
 * @param bodyHtml - The main content HTML
 * @param kobayashiB64 - base64 Kobayashi logo (from loadPdfAssets)
 * @param qrB64 - base64 QR code (from loadPdfAssets)
 */
export function wrapInPdfDocument(
  title: string,
  subtitle: string,
  bodyHtml: string,
  kobayashiB64: string,
  qrB64: string,
  extraStyles = ""
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
${PDF_BASE_STYLES}
${extraStyles}
</style>
</head>
<body>
<div class="pdf-page">
  ${buildPdfHeaderHtml(title, subtitle)}
  <div class="pdf-content">
    ${bodyHtml}
  </div>
  ${buildPdfFooterHtml(kobayashiB64, qrB64)}
</div>
</body>
</html>`;
}

import { useState, useMemo, useRef } from "react";
import { formatBR, formatBRL } from "@/lib/formatBR";
import { BTREE_LOGO_B64, fetchImageAsBase64, loadPdfAssets, generatePDFFromHtml, buildPdfFooterHtml, PDF_BASE_STYLES } from "@/lib/pdfUtils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Truck, Plus, Search, Package, Calendar, User, MapPin, FileText,
  Camera, Loader2, X, Image as ImageIcon, Weight, Navigation,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Pencil, Trash2,
  BarChart3, Download, Eye, RefreshCw, Building2, ChevronDown, ChevronUp,
  Filter, Users, Receipt, CreditCard, FileCheck, Upload, ExternalLink,
  DollarSign, CalendarClock, AlertTriangle
} from "lucide-react";
import { useFilePicker } from "@/hooks/useFilePicker";
import WorkLocationSelect from "@/components/WorkLocationSelect";
import { usePermissions } from "@/hooks/usePermissions";

// ===== HELPERS =====
// Fix timezone issue: date-only strings like "2026-05-08" are parsed as UTC midnight,
// which in Brazil (UTC-3) becomes May 7 at 21:00. Adding T12:00:00 prevents day shift.
function safeDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  // If it's a date-only string (YYYY-MM-DD), add T12:00:00 to avoid timezone shift
  if (s.length === 10 && s[4] === '-') return new Date(s + 'T12:00:00');
  // MySQL timestamps like '2026-05-08 00:00:00' - extract date part and use T12:00:00
  // This avoids timezone conversion that would shift midnight to previous day
  if (s.length >= 10 && s[4] === '-' && s[7] === '-' && !s.includes('T')) {
    return new Date(s.slice(0, 10) + 'T12:00:00');
  }
  // ISO format ending in Z with midnight - shift to noon to avoid day shift
  if (s.includes('T') && s.endsWith('Z') && s.includes('T00:00:00')) {
    return new Date(s.replace('T00:00:00.000Z', 'T12:00:00'));
  }
  return new Date(s);
}

// ===== TIPOS =====
type TrackingStatus = "aguardando" | "carregando" | "em_transito" | "pesagem_saida" | "descarregando" | "pesagem_chegada" | "finalizado";

const TRACKING_STEPS: { key: TrackingStatus; label: string; icon: string }[] = [
  { key: "aguardando", label: "Aguardando", icon: "⏳" },
  { key: "carregando", label: "Carregando", icon: "📦" },
  { key: "em_transito", label: "Em Trânsito", icon: "🚛" },
  { key: "pesagem_saida", label: "Pesagem Saída", icon: "⚖️" },
  { key: "descarregando", label: "Descarregando", icon: "🏭" },
  { key: "pesagem_chegada", label: "Pesagem Chegada", icon: "⚖️" },
  { key: "finalizado", label: "Finalizado", icon: "✅" },
];

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const TRACKING_COLORS: Record<TrackingStatus, string> = {
  aguardando: "bg-gray-100 text-gray-700",
  carregando: "bg-blue-100 text-blue-700",
  em_transito: "bg-orange-100 text-orange-700",
  pesagem_saida: "bg-purple-100 text-purple-700",
  descarregando: "bg-yellow-100 text-yellow-700",
  pesagem_chegada: "bg-indigo-100 text-indigo-700",
  finalizado: "bg-green-100 text-green-700",
};

// Cores distintas para cada grupo de cliente
const CLIENT_COLORS = [
  { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", headerBg: "bg-emerald-600" },
  { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700", headerBg: "bg-blue-600" },
  { border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700", headerBg: "bg-purple-600" },
  { border: "border-l-orange-500", bg: "bg-orange-50", text: "text-orange-700", headerBg: "bg-orange-600" },
  { border: "border-l-pink-500", bg: "bg-pink-50", text: "text-pink-700", headerBg: "bg-pink-600" },
  { border: "border-l-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700", headerBg: "bg-cyan-600" },
  { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", headerBg: "bg-amber-600" },
  { border: "border-l-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", headerBg: "bg-indigo-600" },
];

function calcVolume(h: string, w: string, l: string): string {
  const hN = parseFloat(h.replace(",", "."));
  const wN = parseFloat(w.replace(",", "."));
  const lN = parseFloat(l.replace(",", "."));
  if (isNaN(hN) || isNaN(wN) || isNaN(lN)) return "";
  return (hN * wN * lN).toFixed(3);
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ===== GERAÇÃO DE PDF =====
// Logo constants are now imported from pdfUtils (base64 for CORS-free rendering)
const BTREE_LOGO = BTREE_LOGO_B64; // base64 embedded, no CORS
const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

const PDF_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
  @page { size: A4; margin: 0; }
  .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; filter: brightness(0) invert(1); }
  .pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-subheader { background: #f0fdf4; padding: 10px 32px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .pdf-subheader .badge { display: inline-block; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-pendente { background: #fef9c3; color: #854d0e; }
  .badge-entregue { background: #dcfce7; color: #166534; }
  .badge-cancelado { background: #fee2e2; color: #991b1b; }
  .pdf-content { padding: 20px 32px; flex: 1; }
  .pdf-footer { padding: 12px 32px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
  .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
  .pdf-footer-left img { height: 28px; }
  .pdf-footer-text { font-size: 10px; color: #555; }
  .pdf-footer-text strong { color: #0d4f2e; }
  .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
  .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-footer-right img { width: 60px; height: 60px; }
  .pdf-footer-right span { font-size: 9px; color: #555; }
  .section { margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
  .section-title { background: #f0fdf4; padding: 10px 16px; font-weight: bold; font-size: 13px; color: #0d4f2e; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
  .field { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
  .field:last-child { border-bottom: none; }
  .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .field-value { font-size: 13px; font-weight: 500; margin-top: 2px; color: #111; }
  .field-value.highlight { color: #0d4f2e; font-weight: 700; font-size: 15px; }
  .driver-card { display: flex; gap: 16px; padding: 16px; align-items: center; page-break-inside: avoid; break-inside: avoid; }
  .driver-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #0d4f2e; }
  .driver-avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #9ca3af; border: 3px solid #0d4f2e; }
  .driver-info { flex: 1; }
  .driver-name { font-size: 18px; font-weight: bold; color: #0d4f2e; }
  .driver-role { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .vehicle-badge { display: inline-flex; align-items: center; gap: 6px; background: #0d4f2e; color: white; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-top: 6px; }
  .tracking { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 16px; }
  .tracking-step { padding: 5px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .step-done { background: #dcfce7; color: #166534; }
  .step-current { background: #0d4f2e; color: white; }
  .step-pending { background: #f3f4f6; color: #9ca3af; }
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px 16px; page-break-inside: avoid; break-inside: avoid; }
  .photo-item { text-align: center; page-break-inside: avoid; break-inside: avoid; }
  .photo-item img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
  .photo-item .photo-label { font-size: 10px; color: #6b7280; margin-top: 4px; text-transform: uppercase; font-weight: 600; }
  .doc-link { color: #0d4f2e; text-decoration: none; font-weight: 600; font-size: 12px; }
  /* Relatório completo */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table th { background: #0d4f2e; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
  table td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  table tr { page-break-inside: avoid; break-inside: avoid; }
  table tr:nth-child(even) { background: #f9fafb; }
  table tr:hover { background: #f0fdf4; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 18px; display: flex; gap: 24px; flex-wrap: wrap; page-break-inside: avoid; break-inside: avoid; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 20px; font-weight: bold; color: #0d4f2e; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

// PDF_FOOTER_HTML is now built dynamically with base64 logos via loadPdfAssets()
// Use buildPdfFooterHtml(kobayashiB64, qrB64) from pdfUtils instead

// ===== PDF INDIVIDUAL: FICHA DA CARGA =====
async function generateCargoPDF(cargo: Record<string, unknown>, _companyName = "BTREE Ambiental") {
  const [kobayashiB64, qrB64] = await loadPdfAssets();
  // Pre-load photos via proxy to avoid CORS
  const photos: string[] = cargo.photosJson ? (() => { try { return JSON.parse(cargo.photosJson as string); } catch { return []; } })() : [];
  const [driverPhotoB64, weightOutPhotoB64, weightInPhotoB64, ...photoB64s] = await Promise.all([
    (cargo as any).driverPhotoUrl ? fetchImageAsBase64((cargo as any).driverPhotoUrl) : Promise.resolve(''),
    (cargo as any).weightOutPhotoUrl ? fetchImageAsBase64((cargo as any).weightOutPhotoUrl) : Promise.resolve(''),
    (cargo as any).weightInPhotoUrl ? fetchImageAsBase64((cargo as any).weightInPhotoUrl) : Promise.resolve(''),
    ...photos.map((p: string) => fetchImageAsBase64(p)),
  ]);
  const footerHtml = buildPdfFooterHtml(kobayashiB64, qrB64);
  const date = cargo.date ? safeDate(cargo.date as string).toLocaleDateString("pt-BR") : "-";
  const statusBadge = cargo.status === "entregue" ? "Entregue" : cargo.status === "cancelado" ? "Cancelado" : "Pendente";
  const statusClass = cargo.status === "entregue" ? "badge-entregue" : cargo.status === "cancelado" ? "badge-cancelado" : "badge-pendente";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha de Carga #${cargo.id} - BTREE Ambiental</title>
<style>${PDF_BASE_STYLES}
  @page { size: A4; margin: 0; }
  .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: auto; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; }
  .pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-subheader { background: #f0fdf4; padding: 10px 32px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .pdf-subheader .badge { display: inline-block; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-pendente { background: #fef9c3; color: #854d0e; }
  .badge-entregue { background: #dcfce7; color: #166534; }
  .badge-cancelado { background: #fee2e2; color: #991b1b; }
  .pdf-content { padding: 20px 32px; flex: 1; }
  .section { margin-bottom: 18px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
  .section-title { background: #f0fdf4; padding: 10px 16px; font-weight: bold; font-size: 13px; color: #0d4f2e; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
  .field { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
  .field:last-child { border-bottom: none; }
  .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .field-value { font-size: 13px; font-weight: 500; margin-top: 2px; color: #111; }
  .field-value.highlight { color: #0d4f2e; font-weight: 700; font-size: 15px; }
  .driver-card { display: flex; gap: 16px; padding: 16px; align-items: center; page-break-inside: avoid; break-inside: avoid; }
  .driver-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #0d4f2e; }
  .driver-avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #9ca3af; border: 3px solid #0d4f2e; }
  .driver-info { flex: 1; }
  .driver-name { font-size: 18px; font-weight: bold; color: #0d4f2e; }
  .driver-role { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .vehicle-badge { display: inline-flex; align-items: center; gap: 6px; background: #0d4f2e; color: white; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-top: 6px; }
  .tracking { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 16px; }
  .tracking-step { padding: 5px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .step-done { background: #dcfce7; color: #166534; }
  .step-current { background: #0d4f2e; color: white; }
  .step-pending { background: #f3f4f6; color: #9ca3af; }
  .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px 16px; page-break-inside: avoid; break-inside: avoid; }
  .photo-item { text-align: center; page-break-inside: avoid; break-inside: avoid; }
  .photo-item img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
  .photo-item .photo-label { font-size: 10px; color: #6b7280; margin-top: 4px; text-transform: uppercase; font-weight: 600; }
  .doc-link { color: #0d4f2e; text-decoration: none; font-weight: 600; font-size: 12px; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 18px; display: flex; gap: 24px; flex-wrap: wrap; page-break-inside: avoid; break-inside: avoid; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 20px; font-weight: bold; color: #0d4f2e; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="page">
  <div class="pdf-header">
    <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
    <div class="pdf-header-text">
      <h1>Ficha de Carga #${cargo.id}</h1>
      <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString("pt-BR")}</p>
    </div>
  </div>
  <div class="pdf-subheader">
    <span style="font-size:13px;font-weight:600;color:#0d4f2e;">Data: ${date}</span>
    <span class="badge ${statusClass}">${statusBadge}</span>
  </div>
  <div class="pdf-content">

    <!-- Motorista e Veículo -->
    <div class="section">
      <div class="section-title">&#128104;&#8205;&#9877;&#65039; Motorista e Veículo</div>
      <div class="driver-card">
        ${driverPhotoB64 ? `<img class="driver-avatar" src="${driverPhotoB64}" alt="${cargo.driverName || 'Motorista'}" />` : `<div class="driver-avatar-placeholder">&#128100;</div>`}
        <div class="driver-info">
          <div class="driver-name">${cargo.driverName || "Não informado"}</div>
          <div class="driver-role">Motorista</div>
          <div class="vehicle-badge">&#128666; ${cargo.vehiclePlate || cargo.vehicleName || "Veículo não informado"}</div>
        </div>
      </div>
    </div>

    <!-- Cliente e Destino -->
    <div class="section">
      <div class="section-title">&#127970; Cliente e Destino</div>
      <div class="grid">
        <div class="field"><div class="field-label">Cliente</div><div class="field-value highlight">${cargo.clientName || "-"}</div></div>
        <div class="field"><div class="field-label">Destino</div><div class="field-value">${cargo.destination || "-"}</div></div>
        <div class="field"><div class="field-label">Nº Nota Fiscal</div><div class="field-value">${cargo.invoiceNumber || "-"}</div></div>
        <div class="field"><div class="field-label">Tipo de Madeira</div><div class="field-value">${cargo.woodType || "-"}</div></div>
      </div>
    </div>

    <!-- Medições e Peso -->
    <div class="section">
      <div class="section-title">&#128230; Medições e Peso</div>
      <div class="grid-3">
        <div class="field"><div class="field-label">Altura (m)</div><div class="field-value">${cargo.heightM || "-"}</div></div>
        <div class="field"><div class="field-label">Largura (m)</div><div class="field-value">${cargo.widthM || "-"}</div></div>
        <div class="field"><div class="field-label">Comprimento (m)</div><div class="field-value">${cargo.lengthM || "-"}</div></div>
        <div class="field"><div class="field-label">Volume (m³)</div><div class="field-value highlight">${cargo.volumeM3 ? formatBR(parseFloat(String(cargo.volumeM3)), 3) : "-"} m³</div></div>
        <div class="field"><div class="field-label">Peso Bruto Saída</div><div class="field-value">${(cargo as any).weightOutKg ? (cargo as any).weightOutKg + " kg" : "-"}</div></div>
        <div class="field"><div class="field-label">Peso Bruto Chegada</div><div class="field-value">${(cargo as any).weightInKg ? (cargo as any).weightInKg + " kg" : "-"}</div></div>
        <div class="field"><div class="field-label">Peso Líquido</div><div class="field-value highlight">${(cargo as any).weightNetKg ? (cargo as any).weightNetKg + " kg" : "-"}</div></div>
        <div class="field"><div class="field-label">Peso (kg)</div><div class="field-value">${cargo.weightKg ? cargo.weightKg + " kg" : "-"}</div></div>
        <div class="field"><div class="field-label">&nbsp;</div><div class="field-value">&nbsp;</div></div>
      </div>
    </div>

    <!-- Acompanhamento -->
    ${cargo.trackingStatus ? `
    <div class="section">
      <div class="section-title">&#128205; Acompanhamento</div>
      <div class="tracking">
        ${TRACKING_STEPS.map(step => {
          const idx = TRACKING_STEPS.findIndex(s => s.key === cargo.trackingStatus);
          const stepIdx = TRACKING_STEPS.findIndex(s => s.key === step.key);
          const cls = stepIdx < idx ? "step-done" : stepIdx === idx ? "step-current" : "step-pending";
          return `<span class="tracking-step ${cls}">${step.icon} ${step.label}</span>`;
        }).join("")}
      </div>
      ${cargo.trackingNotes ? `<p style="padding:8px 16px;font-size:12px;color:#374151;">${cargo.trackingNotes}</p>` : ""}
    </div>` : ""}

    <!-- Documentos -->
    ${((cargo as any).invoiceUrl || (cargo as any).boletoUrl || (cargo as any).paymentReceiptUrl) ? `
    <div class="section">
      <div class="section-title">&#128196; Documentos Financeiros</div>
      <div class="grid">
        <div class="field"><div class="field-label">Nota Fiscal</div><div class="field-value">${(cargo as any).invoiceUrl ? '<a class="doc-link" href="' + (cargo as any).invoiceUrl + '" target="_blank">&#10004; Anexada</a>' : "Não anexada"}</div></div>
        <div class="field"><div class="field-label">Boleto</div><div class="field-value">${(cargo as any).boletoUrl ? '<a class="doc-link" href="' + (cargo as any).boletoUrl + '" target="_blank">&#10004; Anexado</a>' + ((cargo as any).boletoAmount ? ' - R$ ' + (cargo as any).boletoAmount : '') : "Não anexado"}</div></div>
        <div class="field"><div class="field-label">Comprovante Pgto</div><div class="field-value">${(cargo as any).paymentReceiptUrl ? '<a class="doc-link" href="' + (cargo as any).paymentReceiptUrl + '" target="_blank">&#10004; Pago</a>' : ((cargo as any).boletoUrl ? "A pagar" : "-")}</div></div>
        <div class="field"><div class="field-label">Status Pagamento</div><div class="field-value">${(cargo as any).paymentStatus === 'pago' ? '<span style="color:#166534;font-weight:700;">&#9989; Pago</span>' : (cargo as any).boletoUrl ? '<span style="color:#854d0e;font-weight:700;">&#9888; A Pagar</span>' : "-"}</div></div>
      </div>
    </div>` : ""}

    ${cargo.notes ? `
    <div class="section">
      <div class="section-title">&#128221; Observações</div>
      <div style="padding:12px 16px;font-size:13px;color:#374151;">${cargo.notes}</div>
    </div>` : ""}

    <!-- Fotos -->
    ${(photos.length > 0 || cargo.weightOutPhotoUrl || cargo.weightInPhotoUrl) ? `
    <div class="section">
      <div class="section-title">&#128247; Registro Fotográfico</div>
      <div class="photos-grid">
        ${weightOutPhotoB64 ? `<div class="photo-item"><img src="${weightOutPhotoB64}" alt="Pesagem saída" /><div class="photo-label">Pesagem Saída</div></div>` : ""}
        ${weightInPhotoB64 ? `<div class="photo-item"><img src="${weightInPhotoB64}" alt="Pesagem chegada" /><div class="photo-label">Pesagem Chegada</div></div>` : ""}
        ${photoB64s.map((p: string, i: number) => p ? `<div class="photo-item"><img src="${p}" alt="Foto ${i + 1}" /><div class="photo-label">Foto ${i + 1}</div></div>` : '').join("")}
      </div>
    </div>` : ""}

  </div>
  ${footerHtml}
</div>
</body></html>`;
  await generatePDFFromHtml(html, `carga-${cargo.id}-btree.pdf`);
}

// ===== PDF RELATÓRIO COMPLETO POR CLIENTE =====
async function generateClientReportPDF(clientName: string, cargas: Array<Record<string, unknown>>, pricePerTon: number = 0, deductions: Array<{cargoLoadId: number | null; amount: string}> = []) {
  const totalCargas = cargas.length;
  const totalVolume = formatBR(cargas.reduce((acc, c) => acc + parseFloat((c.volumeM3 as string) || "0"), 0), 2);
  const totalPendentes = cargas.filter(c => c.status === "pendente").length;
  const totalEntregues = cargas.filter(c => c.status === "entregue").length;
  const totalPesoLiquido = cargas.reduce((acc, c) => {
    const w = parseFloat(((c as any).weightNetKg || "0").replace(",", "."));
    return acc + (isNaN(w) ? 0 : w);
  }, 0);
  const totalValor = pricePerTon > 0 && totalPesoLiquido > 0 ? (totalPesoLiquido / 1000) * pricePerTon : 0;

  const rows = cargas.map(c => {
    const date = c.date ? safeDate(c.date as string).toLocaleDateString("pt-BR") : "-";
    const statusLabel = c.status === "entregue" ? "Entregue" : c.status === "cancelado" ? "Cancelado" : "Pendente";
    const statusColor = c.status === "entregue" ? "#166534" : c.status === "cancelado" ? "#991b1b" : "#854d0e";
    const weightNet = parseFloat(((c as any).weightNetKg || "0").replace(",", "."));
    const valorCarga = pricePerTon > 0 && weightNet > 0 ? (weightNet / 1000) * pricePerTon : 0;
    // Abatimento via adiantamento para esta carga
    const cargoDeductions = deductions.filter(d => d.cargoLoadId === (c.id as number));
    const totalDeducted = cargoDeductions.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
    const remaining = Math.max(0, valorCarga - totalDeducted);
    const isPago = (c as any).paymentStatus === 'pago';
    // Label de pagamento
    let pagLabel = '-'; let pagColor = '#6b7280';
    if (isPago) { pagLabel = '&#9989; Pago'; pagColor = '#166534'; }
    else if (totalDeducted > 0 && remaining <= 0) { pagLabel = '&#128176; Via Adiant.'; pagColor = '#166534'; }
    else if (totalDeducted > 0) { pagLabel = '&#9889; Parcial'; pagColor = '#b45309'; }
    else if (c.status === 'entregue') { pagLabel = '&#9203; Pendente'; pagColor = '#991b1b'; }
    // Dimensões compactadas em 1 coluna: Alt×Larg×Comp
    const dims = [c.heightM, c.widthM, c.lengthM].filter(Boolean).join("×") || "-";
    // Motorista: apenas primeiro nome + sobrenome
    const driverShort = (() => { const parts = String(c.driverName || "-").split(" "); return parts.length > 2 ? parts[0] + " " + parts[parts.length - 1] : parts.join(" "); })();
    // Destino: truncar após 16 chars
    const destShort = String(c.destination || "-").substring(0, 16);
    // Madeira: truncar após 14 chars
    const woodShort = String(c.woodType || "-").substring(0, 14);
    return `<tr>
      <td style="font-weight:600;">${date}</td>
      <td>${c.vehiclePlate || c.vehicleName || "-"}</td>
      <td title="${c.driverName || ''}">${driverShort}</td>
      <td title="${c.destination || ''}">${destShort}</td>
      <td title="${c.woodType || ''}">${woodShort}</td>
      <td style="text-align:center;">${dims}</td>
      <td style="text-align:right;font-weight:700;color:#0d4f2e;">${c.volumeM3 ? formatBR(parseFloat(String(c.volumeM3)), 3) : "-"}</td>
      <td style="text-align:right;">${(c as any).weightOutKg || "-"}</td>
      <td style="text-align:right;">${(c as any).weightInKg || "-"}</td>
      <td style="text-align:right;font-weight:700;">${(c as any).weightNetKg || "-"}</td>
      <td>${c.invoiceNumber || "-"}</td>
      ${pricePerTon > 0 ? `<td style="text-align:right;font-weight:600;color:#1d4ed8;">${valorCarga > 0 ? "R$ " + formatBR(valorCarga, 2) : "-"}</td>` : ""}
      <td style="color:${statusColor};font-weight:600;">${statusLabel}</td>
      <td style="color:${pagColor};font-weight:600;font-size:7px;">${pagLabel}${totalDeducted > 0 ? `<br><span style="color:#166534;font-size:6.5px;">-R$ ${formatBR(totalDeducted, 2)}</span>` : ''}</td>
    </tr>`;
  }).join("");

  const [kobayashiB64, qrB64] = await loadPdfAssets();
  const footerHtml = buildPdfFooterHtml(kobayashiB64, qrB64);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Cargas - ${clientName} - BTREE Ambiental</title>
<style>${PDF_BASE_STYLES}
  @page { size: A4 landscape; margin: 0; }
  .page { min-height: 100vh; display: flex; flex-direction: column; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
  .pdf-header img { height: 40px; }
  .pdf-header-text h1 { font-size: 17px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .pdf-subheader { background: #f0fdf4; padding: 7px 24px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .pdf-content { padding: 12px 24px; flex: 1; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 16px; margin-bottom: 12px; display: flex; gap: 18px; flex-wrap: wrap; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 9px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 16px; font-weight: bold; color: #0d4f2e; }
  table { width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; }
  table th { background: #0d4f2e; color: white; padding: 5px 4px; text-align: left; font-size: 7.5px; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  table td { padding: 4px 4px; border-bottom: 1px solid #e5e7eb; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; font-size: 8px; }
  table td:last-child { white-space: normal; word-break: break-word; line-height: 1.3; }
  table tr:nth-child(even) { background: #f9fafb; }
  /* 13 colunas: data veiculo motorista destino madeira dims vol saida chegada liquido nota [valor] status pagamento */
  col.col-data     { width: 6.5%; }
  col.col-veiculo  { width: 6.5%; }
  col.col-motorista{ width: 10%; }
  col.col-destino  { width: 10%; }
  col.col-madeira  { width: 9%; }
  col.col-dims     { width: 9%; }
  col.col-vol      { width: 5.5%; }
  col.col-peso     { width: 5.5%; }
  col.col-nota     { width: 4.5%; }
  col.col-valor    { width: 8%; }
  col.col-status   { width: 6%; }
  col.col-pagamento{ width: 10%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="page">
  <div class="pdf-header">
    <img src="${BTREE_LOGO}" alt="BTREE Ambiental" />
    <div class="pdf-header-text">
      <h1>Relatório de Cargas</h1>
      <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString("pt-BR")}</p>
    </div>
  </div>
  <div class="pdf-subheader">
    <span style="font-size:15px;font-weight:700;color:#0d4f2e;">&#127970; Cliente: ${clientName}</span>
    <span style="font-size:12px;color:#6b7280;">Período: ${cargas.length > 0 ? safeDate(cargas[cargas.length - 1].date as string).toLocaleDateString("pt-BR") : "-"} a ${cargas.length > 0 ? safeDate(cargas[0].date as string).toLocaleDateString("pt-BR") : "-"}</span>
  </div>
  <div class="pdf-content">

    <!-- Resumo -->
    <div class="summary-box">
      <div class="summary-item"><div class="label">Total de Cargas</div><div class="value">${totalCargas}</div></div>
      <div class="summary-item"><div class="label">Volume Total</div><div class="value">${totalVolume} m³</div></div>
      <div class="summary-item"><div class="label">Peso Líquido Total</div><div class="value">${totalPesoLiquido > 0 ? formatBR(totalPesoLiquido, 0) + " kg" : "-"}</div></div>
      ${pricePerTon > 0 ? `<div class="summary-item"><div class="label">Preço/Ton</div><div class="value" style="color:#1d4ed8;">R$ ${formatBR(pricePerTon, 0)}</div></div>` : ""}
      ${totalValor > 0 ? `<div class="summary-item"><div class="label">Valor Total</div><div class="value" style="color:#1d4ed8;">R$ ${formatBR(totalValor, 2)}</div></div>` : ""}
      <div class="summary-item"><div class="label">Entregues</div><div class="value" style="color:#166534;">${totalEntregues}</div></div>
      <div class="summary-item"><div class="label">Pendentes</div><div class="value" style="color:#854d0e;">${totalPendentes}</div></div>
    </div>

    <!-- Tabela -->
    <table>
      <colgroup>
        <col class="col-data" />
        <col class="col-veiculo" />
        <col class="col-motorista" />
        <col class="col-destino" />
        <col class="col-madeira" />
        <col class="col-dims" />
        <col class="col-vol" />
        <col class="col-peso" />
        <col class="col-peso" />
        <col class="col-peso" />
        <col class="col-nota" />
        ${pricePerTon > 0 ? '<col class="col-valor" />' : ''}
        <col class="col-status" />
        <col class="col-pagamento" />
      </colgroup>
      <thead>
        <tr>
          <th>Data</th>
          <th>Veículo</th>
          <th>Motorista</th>
          <th>Destino</th>
          <th>Madeira</th>
          <th style="text-align:center;">Dim. (A×L×C)</th>
          <th style="text-align:right;">Vol.(m³)</th>
          <th style="text-align:right;">P.Saída</th>
          <th style="text-align:right;">P.Cheg.</th>
          <th style="text-align:right;">P.Líq.</th>
          <th>Nota</th>
          ${pricePerTon > 0 ? `<th style="text-align:right;">Valor</th>` : ""}
          <th>Status</th>
          <th>Pagamento</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background:#f0fdf4;font-weight:bold;">
          <td colspan="6" style="text-align:right;color:#0d4f2e;">TOTAIS:</td>
          <td style="text-align:right;color:#0d4f2e;font-size:8px;">${totalVolume} m³</td>
          <td colspan="2"></td>
          <td style="text-align:right;color:#0d4f2e;font-size:8px;">${totalPesoLiquido > 0 ? formatBR(totalPesoLiquido, 0) + " kg" : "-"}</td>
          <td></td>
          ${pricePerTon > 0 ? `<td style="text-align:right;color:#1d4ed8;font-size:8px;">R$ ${formatBR(totalValor, 2)}</td>` : ""}
          <td style="text-align:center;color:#0d4f2e;">${totalCargas}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

  </div>
  ${footerHtml}
</div>
</body></html>`;
  await generatePDFFromHtml(html, `relatorio-cargas-${clientName.replace(/\s+/g,'-')}.pdf`, undefined, 'landscape');
}

// ===== COMPONENTE PRINCIPAL =====
// ===== COMPONENTE: FECHAMENTOS SEMANAIS =====
async function generateWeeklyClosingPDF(closing: any, clientName: string, loadsAll: any[], pricePerTon: number) {
  const weekStartFmt = closing.weekStart ? safeDate(closing.weekStart).toLocaleDateString('pt-BR') : '-';
  const weekEndFmt = closing.weekEnd ? safeDate(closing.weekEnd).toLocaleDateString('pt-BR') : '-';
  const totalWeightTon = closing.totalWeightKg ? formatBR(parseFloat(closing.totalWeightKg) / 1000, 2) : '0';
  const dueDateFmt = closing.dueDate ? safeDate(closing.dueDate).toLocaleDateString('pt-BR') : '-';
  const statusLabel = closing.status === 'pago' ? 'PAGO' : closing.status === 'atrasado' ? 'ATRASADO' : 'AGUARDANDO PAGAMENTO';
  const statusClass = closing.status === 'pago' ? 'badge-pago' : closing.status === 'atrasado' ? 'badge-atrasado' : 'badge-pendente';

  const weekStart = safeDate(closing.weekStart);
  const weekEnd = safeDate(closing.weekEnd);
  weekEnd.setHours(23, 59, 59, 999);
  const weekLoads = loadsAll.filter((l: any) => {
    const d = safeDate(l.deliveryDate || l.date);
    return d >= weekStart && d <= weekEnd;
  });

  // Use actual filtered loads count (not the saved totalLoads which may be stale)
  const actualTotalLoads = weekLoads.length;
  const actualTotalWeightKg = weekLoads.reduce((sum: number, l: any) => {
    const w = parseFloat(l.weightNetKg || l.weightOutKg || '0');
    return sum + w;
  }, 0);
  const actualTotalWeightTon = formatBR(actualTotalWeightKg / 1000, 2);
  const actualTotalAmount = formatBR(actualTotalWeightKg / 1000 * (closing.pricePerTon || pricePerTon), 2);

  const loadsRows = weekLoads.map((l: any, i: number) => {
    const date = (l.deliveryDate || l.date) ? safeDate(l.deliveryDate || l.date).toLocaleDateString('pt-BR') : '-';
    const weight = l.weightNetKg || l.weightOutKg || '-';
    const weightTon = parseFloat(weight) > 0 ? formatBR(parseFloat(weight) / 1000, 3) : '-';
    const vol = l.volumeM3 || '-';
    const dest = l.destination || '-';
    const plate = l.vehiclePlate || '-';
    const driver = l.driverName || '-';
    const nf = l.invoiceNumber || '-';
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${date}</td>
      <td>${nf}</td>
      <td>${dest}</td>
      <td>${plate}</td>
      <td>${driver}</td>
      <td style="text-align:right">${vol} m\u00b3</td>
      <td style="text-align:right">${weight} kg</td>
      <td style="text-align:right">${weightTon} ton</td>
    </tr>`;
  }).join('');

  const [kobayashiB64, qrB64] = await loadPdfAssets();
  const footerHtml = buildPdfFooterHtml(kobayashiB64, qrB64);
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Fechamento Semanal - ${clientName} - BTREE Ambiental</title>
<style>
  ${PDF_BASE_STYLES}
  @page { size: A4; margin: 0; }
  .page { min-height: 100vh; display: flex; flex-direction: column; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; }
  .pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-subheader { background: #f0fdf4; padding: 12px 32px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .badge-pago { background: #dcfce7; color: #166534; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-pendente { background: #fef9c3; color: #854d0e; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .badge-atrasado { background: #fee2e2; color: #991b1b; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; }
  .pdf-content { padding: 20px 32px; flex: 1; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 24px; margin-bottom: 20px; display: flex; gap: 32px; flex-wrap: wrap; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 20px; font-weight: bold; color: #0d4f2e; }
  .summary-item .value.blue { color: #1d4ed8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="page">
  <div class="pdf-header">
    <img src="${BTREE_LOGO}" alt="BTREE Ambiental" />
    <div class="pdf-header-text">
      <h1>Fechamento Semanal</h1>
      <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
  <div class="pdf-subheader">
    <div>
      <span style="font-size:15px;font-weight:700;color:#0d4f2e;">Cliente: ${clientName}</span><br/>
      <span style="font-size:12px;color:#6b7280;">Per\u00edodo: ${weekStartFmt} a ${weekEndFmt}</span>
    </div>
    <span class="${statusClass}">${statusLabel}</span>
  </div>
  <div class="pdf-content">
    <div class="summary-box">
      <div class="summary-item"><div class="label">Cargas</div><div class="value">${actualTotalLoads}</div></div>
      <div class="summary-item"><div class="label">Peso Total</div><div class="value">${actualTotalWeightTon} ton</div></div>
      <div class="summary-item"><div class="label">Pre\u00e7o/Ton</div><div class="value">R$ ${formatBR(parseFloat(String(closing.pricePerTon || pricePerTon)))}</div></div>
      <div class="summary-item"><div class="label">Valor Total</div><div class="value blue">R$ ${actualTotalAmount}</div></div>
      <div class="summary-item"><div class="label">Vencimento</div><div class="value">${dueDateFmt}</div></div>
    </div>
    ${weekLoads.length > 0 ? `
    <h3 style="font-size:13px;color:#0d4f2e;margin-bottom:8px;">Detalhamento das Cargas</h3>
    <table>
      <thead><tr>
        <th style="text-align:center">#</th>
        <th>Data</th>
        <th>Nota Fiscal</th>
        <th>Destino</th>
        <th>Placa</th>
        <th>Motorista</th>
        <th style="text-align:right">Volume</th>
        <th style="text-align:right">Peso</th>
        <th style="text-align:right">Tonelada</th>
      </tr></thead>
      <tbody>${loadsRows}</tbody>
    </table>` : ''}
  </div>
  ${footerHtml}
</div>
</body></html>`;
  await generatePDFFromHtml(html, `fechamento-semanal-${clientName.replace(/\s+/g,'-')}.pdf`);
}

function WeeklyClosingsView({
  clientsList, loads, closingClientId, setClosingClientId,
  closingWeekStart, setClosingWeekStart, closingWeekEnd, setClosingWeekEnd,
  isClosingFormOpen, setIsClosingFormOpen,
}: {
  clientsList: Array<{ id: number; name: string; pricePerTon?: string | null; paymentTermDays?: number | null }>;
  loads: Array<any>;
  closingClientId: number;
  setClosingClientId: (v: number) => void;
  closingWeekStart: string;
  setClosingWeekStart: (v: string) => void;
  closingWeekEnd: string;
  setClosingWeekEnd: (v: string) => void;
  isClosingFormOpen: boolean;
  setIsClosingFormOpen: (v: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { data: closings = [], isLoading } = trpc.cargoLoads.listWeeklyClosings.useQuery(
    closingClientId ? { clientId: closingClientId } : undefined
  );
  const createClosing = trpc.cargoLoads.createWeeklyClosing.useMutation({
    onSuccess: (data) => {
      toast.success(`Fechamento criado! ${data.totalLoads} cargas, R$ ${data.totalAmount}`);
      utils.cargoLoads.listWeeklyClosings.invalidate();
      setIsClosingFormOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.cargoLoads.updateWeeklyClosingStatus.useMutation({
    onSuccess: () => { toast.success('Status atualizado!'); utils.cargoLoads.listWeeklyClosings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteClosing = trpc.cargoLoads.deleteWeeklyClosing.useMutation({
    onSuccess: () => { toast.success('Fechamento removido!'); utils.cargoLoads.listWeeklyClosings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateClosingPaymentDate = trpc.cargoLoads.updateWeeklyClosingPaymentDate.useMutation({
    onSuccess: () => { toast.success('Data de pagamento atualizada!'); utils.cargoLoads.listWeeklyClosings.invalidate(); setEditClosingPaymentId(null); setEditClosingPaymentValue(''); },
    onError: (e) => toast.error(e.message),
  });
  const [editClosingPaymentId, setEditClosingPaymentId] = useState<number | null>(null);
  const [editClosingPaymentValue, setEditClosingPaymentValue] = useState('');

  // Auto-calculate next friday from current date for week end
  const getNextFriday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day <= 5 ? 5 - day : 7 - day + 5;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };
  const getLastSaturday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day >= 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  };

  // ── Calcular semana atual e passada (Sábado a Sexta) ──
  const getWeekStart = (d: Date) => {
    const day = d.getDay();
    // Week starts on Saturday: if today is Sat (6), start is today; otherwise go back (day+1) days
    const diff = day >= 6 ? 0 : -(day + 1);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };
  const today = new Date();
  const thisWeekStart = getWeekStart(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const thisWeekLoads = loads.filter((c: any) => {
    const d = safeDate(c.date);
    return d >= thisWeekStart && d <= thisWeekEnd;
  });
  const lastWeekLoads = loads.filter((c: any) => {
    const d = safeDate(c.date);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });

  const calcStats = (arr: any[]) => ({
    count: arr.length,
    peso: arr.reduce((acc: number, c: any) => acc + parseFloat(c.weightNetKg || c.weightOutKg || '0'), 0),
    entregues: arr.filter((c: any) => c.status === 'entregue').length,
  });

  const thisWeek = { ...calcStats(thisWeekLoads), start: thisWeekStart, end: thisWeekEnd };
  const lastWeek = { ...calcStats(lastWeekLoads), start: lastWeekStart, end: lastWeekEnd };

  // Financial summary from closings
  const totalAReceber = closings.filter(c => c.status === 'fechado').reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0);
  const totalPago = closings.filter(c => c.status === 'pago').reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0);
  const totalAtrasado = closings.filter(c => {
    if (c.status !== 'fechado') return false;
    return c.dueDate && new Date(c.dueDate) < new Date();
  }).reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0);

  const formatCurrency = (v: number) => `R$ ${formatBR(v, 2)}`;

  return (
    <div className="space-y-5">
      {/* ── RESUMO FINANCEIRO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">A Receber</p>
          <p className="text-amber-800 text-xl font-black">{formatCurrency(totalAReceber)}</p>
          <p className="text-amber-600 text-[10px] mt-1">{closings.filter(c => c.status === 'fechado').length} fechamento(s) pendente(s)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 text-xs font-semibold uppercase tracking-wide mb-1">Total Recebido</p>
          <p className="text-green-800 text-xl font-black">{formatCurrency(totalPago)}</p>
          <p className="text-green-600 text-[10px] mt-1">{closings.filter(c => c.status === 'pago').length} fechamento(s) pago(s)</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-xs font-semibold uppercase tracking-wide mb-1">Atrasados</p>
          <p className="text-red-800 text-xl font-black">{formatCurrency(totalAtrasado)}</p>
          <p className="text-red-600 text-[10px] mt-1">{closings.filter(c => c.status === 'fechado' && c.dueDate && new Date(c.dueDate) < new Date()).length} vencido(s)</p>
        </div>
      </div>

      {/* ── RESUMO SEMANAL ── */}
      <div className="bg-gradient-to-r from-emerald-50/80 to-emerald-100/40 rounded-xl border border-emerald-200/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-emerald-800">Resumo Semanal</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Semana Atual */}
          <div className="bg-white rounded-xl p-3 border border-emerald-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Semana Atual</span>
              <span className="text-[9px] text-gray-400">
                {thisWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {thisWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Cargas</span>
                <span className="text-lg font-black text-emerald-800">{thisWeek.count}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Peso</span>
                <span className="text-sm font-bold text-emerald-700">{thisWeek.peso > 0 ? formatBR(thisWeek.peso / 1000) : '0'} ton</span>
              </div>
              {thisWeek.entregues > 0 && (
                <p className="text-[10px] text-green-600 text-right">{thisWeek.entregues} entregue{thisWeek.entregues > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          {/* Semana Passada */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Semana Passada</span>
              <span className="text-[9px] text-gray-400">
                {lastWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {lastWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Cargas</span>
                <span className="text-lg font-black text-gray-700">{lastWeek.count}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">Peso</span>
                <span className="text-sm font-bold text-emerald-600">{lastWeek.peso > 0 ? formatBR(lastWeek.peso / 1000) : '0'} ton</span>
              </div>
              {lastWeek.entregues > 0 && (
                <p className="text-[10px] text-green-600 text-right">{lastWeek.entregues} entregue{lastWeek.entregues > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEMANA ATUAL EM ANDAMENTO ── */}
      {thisWeek.count > 0 && (
        <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-sm">
                  Semana {thisWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {thisWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-700 animate-pulse">
                  Em andamento
                </span>
              </div>
              <div className="text-gray-500 text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                <span>{thisWeek.count} carga{thisWeek.count !== 1 ? 's' : ''}</span>
                <span>{formatBR(thisWeek.peso / 1000)} ton</span>
              </div>
              <p className="text-[10px] text-blue-600 mt-1.5 italic">Fechamento na sexta-feira</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-blue-400 font-medium">parcial</p>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER + ACTIONS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={closingClientId}
            onChange={e => setClosingClientId(parseInt(e.target.value))}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value={0}>Todos os clientes</option>
            {clientsList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          size="sm"
          onClick={() => {
            setClosingWeekStart(getLastSaturday());
            setClosingWeekEnd(getNextFriday());
            setIsClosingFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Novo Fechamento
        </Button>
      </div>

      {/* Form para novo fechamento */}
      {isClosingFormOpen && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-emerald-800">Novo Fechamento Semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Cliente *</Label>
                <select
                  value={closingClientId}
                  onChange={e => setClosingClientId(parseInt(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar cliente...</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Início (Sábado)</Label>
                <Input type="date" value={closingWeekStart} onChange={e => setClosingWeekStart(e.target.value)} />
              </div>
              <div>
                <Label>Fim (Sexta)</Label>
                <Input type="date" value={closingWeekEnd} onChange={e => setClosingWeekEnd(e.target.value)} />
              </div>
            </div>
            {closingClientId > 0 && closingWeekStart && closingWeekEnd && (() => {
              const client = clientsList.find(c => c.id === closingClientId);
              const pricePerTon = parseFloat((client as any)?.pricePerTon || '130');
              const weekStartDate = safeDate(closingWeekStart);
              const weekEndDate = safeDate(closingWeekEnd);
              weekEndDate.setHours(23, 59, 59, 999);
              const loadsInPeriod = loads.filter((l: any) => {
                if (l.clientId !== closingClientId) return false;
                const loadDate = safeDate(l.deliveryDate || l.date);
                return loadDate >= weekStartDate && loadDate <= weekEndDate;
              });
              const totalWeight = loadsInPeriod.reduce((sum: number, l: any) => sum + parseFloat(l.weightNetKg || l.weightOutKg || '0'), 0);
              const totalValue = (totalWeight / 1000) * pricePerTon;
              const paymentTermDays = (client as any)?.paymentTermDays || 21;
              const dueDate = safeDate(closingWeekEnd);
              dueDate.setDate(dueDate.getDate() + paymentTermDays);
              return (
                <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                  <p><strong>Preview:</strong> {loadsInPeriod.length} cargas no período</p>
                  <p>Peso total: {formatBR(totalWeight / 1000)} toneladas ({formatBR(totalWeight, 0)} kg)</p>
                  <p>Valor: <strong className="text-blue-700">R$ {formatBR(totalValue)}</strong> ({formatBR(totalWeight / 1000)} ton x R$ {formatBR(pricePerTon, 0)}/ton)</p>
                  <p>Vencimento: <strong>{dueDate.toLocaleDateString('pt-BR')}</strong> ({paymentTermDays} dias após fechamento)</p>
                </div>
              );
            })()}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsClosingFormOpen(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!closingClientId || !closingWeekStart || !closingWeekEnd || createClosing.isPending}
                onClick={() => {
                  const client = clientsList.find(c => c.id === closingClientId);
                  const pricePerTon = parseFloat((client as any)?.pricePerTon || '130');
                  const effectivePrice = pricePerTon > 0 ? pricePerTon : 130;
                  createClosing.mutate({
                    clientId: closingClientId,
                    weekStart: closingWeekStart,
                    weekEnd: closingWeekEnd,
                    pricePerTon: String(effectivePrice),
                  });
                }}
              >
                {createClosing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fechar Semana'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FECHAMENTOS OFICIAIS ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : closings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum fechamento encontrado</p>
          <p className="text-sm mt-1">Crie o primeiro fechamento semanal</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            Fechamentos Oficiais ({closings.length})
          </p>
          {closings.map(closing => {
            const isOverdue = closing.status === 'fechado' && closing.dueDate && safeDate(closing.dueDate) < new Date();
            const clientForClosing = clientsList.find(c => c.id === closing.clientId);
            const pricePerTon = parseFloat(closing.pricePerTon || (clientForClosing as any)?.pricePerTon || '130');
            return (
              <div key={closing.id} className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                closing.status === 'pago' ? 'border-green-200 bg-green-50/30' :
                isOverdue ? 'border-red-200 bg-red-50/30' :
                'border-yellow-100 bg-yellow-50/30'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm" translate="no">
                        {closing.clientName || 'Cliente'}
                      </span>
                      <span className="font-semibold text-gray-600 text-xs">
                        Semana {closing.weekStart ? safeDate(closing.weekStart).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''} a {closing.weekEnd ? safeDate(closing.weekEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        closing.status === 'pago' ? 'bg-green-100 text-green-700' :
                        isOverdue ? 'bg-red-100 text-red-700' :
                        closing.status === 'fechado' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {closing.status === 'pago' ? 'Pago' : isOverdue ? 'Atrasado' : closing.status === 'fechado' ? 'Aguardando' : 'Aberto'}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {(() => {
                        // Use real count from actual loads in period
                        const wStart = safeDate(closing.weekStart);
                        const wEnd = safeDate(closing.weekEnd);
                        wEnd.setHours(23, 59, 59, 999);
                        const realLoads = loads.filter((l: any) => {
                          if (l.clientId !== closing.clientId) return false;
                          const d = safeDate(l.date);
                          return d >= wStart && d <= wEnd;
                        });
                        const realWeight = realLoads.reduce((acc: number, l: any) => acc + parseFloat(l.weightNetKg || l.weightOutKg || '0'), 0);
                        const realCount = realLoads.length;
                        return (
                          <>
                            <span>{realCount} carga{realCount !== 1 ? 's' : ''}</span>
                            <span>{formatBR(realWeight / 1000)} ton</span>
                          </>
                        );
                      })()}
                      {closing.pricePerTon && <span>R$ {formatBR(parseFloat(closing.pricePerTon))}/ton</span>}
                    </div>
                    {closing.status !== 'pago' && closing.dueDate && (
                      <p className={`text-xs mt-1.5 font-medium ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                        Vencimento: {safeDate(closing.dueDate).toLocaleDateString('pt-BR')}
                        {isOverdue && ' (VENCIDO)'}
                      </p>
                    )}
                    {closing.status === 'pago' && closing.paidAt && (
                      <p className="text-xs mt-1.5 text-green-700 font-medium flex items-center gap-1">
                        Pago em: {safeDate(closing.paidAt).toLocaleDateString('pt-BR')}
                        <button
                          type="button"
                          title="Corrigir data de pagamento"
                          className="p-0.5 rounded hover:bg-green-100 text-green-600 hover:text-green-800 transition-colors"
                          onClick={() => {
                            const dateVal = safeDate(closing.paidAt!).toISOString().slice(0, 10);
                            setEditClosingPaymentValue(dateVal);
                            setEditClosingPaymentId(closing.id);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </p>
                    )}
                    {(closing as any).receiptUrl && (
                      <a
                        href={(closing as any).receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 transition-colors"
                      >
                        <FileCheck className="h-3 w-3" /> Ver Comprovante
                      </a>
                    )}
                    {closing.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 italic">{closing.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="font-black text-emerald-800 text-lg">{formatCurrency(parseFloat(closing.totalAmount || '0'))}</p>
                    {/* PDF Button */}
                    <button
                      onClick={() => {
                        const clientLoads = loads.filter((l: any) => l.clientId === closing.clientId);
                        generateWeeklyClosingPDF(closing, closing.clientName || 'Cliente', clientLoads, pricePerTon);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-semibold hover:bg-emerald-200 transition-colors mt-1"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                    {/* Action buttons */}
                    <div className="flex gap-1 mt-1 flex-wrap justify-end">
                      {closing.status === 'fechado' && (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,application/pdf';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                toast.info('Enviando comprovante...');
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('upload_preset', 'azaconnect');
                                formData.append('folder', 'btree-receipts');
                                const res = await fetch('https://api.cloudinary.com/v1_1/djob7pxme/auto/upload', {
                                  method: 'POST', body: formData
                                });
                                const data = await res.json();
                                if (data.secure_url) {
                                  updateStatus.mutate({ id: closing.id, status: 'pago', receiptUrl: data.secure_url });
                                } else {
                                  toast.error('Erro no upload do comprovante');
                                }
                              } catch {
                                toast.error('Erro ao enviar comprovante');
                              }
                            };
                            input.click();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-semibold hover:bg-green-200 transition-colors"
                        >
                          <Upload className="h-3 w-3" /> Pago
                        </button>
                      )}
                      {closing.status === 'fechado' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: closing.id, status: 'pago' })}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-semibold hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Sem comp.
                        </button>
                      )}
                      {closing.status === 'pago' && !(closing as any).receiptUrl && (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,application/pdf';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                toast.info('Enviando comprovante...');
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('upload_preset', 'azaconnect');
                                formData.append('folder', 'btree-receipts');
                                const res = await fetch('https://api.cloudinary.com/v1_1/djob7pxme/auto/upload', {
                                  method: 'POST', body: formData
                                });
                                const data = await res.json();
                                if (data.secure_url) {
                                  updateStatus.mutate({ id: closing.id, status: 'pago', receiptUrl: data.secure_url });
                                } else {
                                  toast.error('Erro no upload do comprovante');
                                }
                              } catch {
                                toast.error('Erro ao enviar comprovante');
                              }
                            };
                            input.click();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-semibold hover:bg-blue-100 transition-colors"
                        >
                          <Upload className="h-3 w-3" /> Comprovante
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Remover este fechamento?')) deleteClosing.mutate({ id: closing.id }); }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-red-500 rounded-lg text-[10px] transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== DIALOG: EDITAR DATA DE PAGAMENTO DO FECHAMENTO ===== */}
      <Dialog open={!!editClosingPaymentId} onOpenChange={v => { if (!v) { setEditClosingPaymentId(null); setEditClosingPaymentValue(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Corrigir Data de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Informe a data correta em que o pagamento foi recebido:</p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-closing-payment-date">Data de Pagamento</Label>
              <Input
                id="edit-closing-payment-date"
                type="date"
                value={editClosingPaymentValue}
                onChange={e => setEditClosingPaymentValue(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setEditClosingPaymentId(null); setEditClosingPaymentValue(''); }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!editClosingPaymentValue || updateClosingPaymentDate.isPending}
                onClick={() => {
                  if (editClosingPaymentId && editClosingPaymentValue) {
                    updateClosingPaymentDate.mutate({ id: editClosingPaymentId, paidAt: editClosingPaymentValue });
                  }
                }}
              >
                {updateClosingPaymentDate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CargoControl() {
  const utils = trpc.useUtils();
  const { allowedClientIds, isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "pendente" | "entregue" | "cancelado">("")
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"" | "pago" | "a_pagar" | "sem_boleto">("");
  const [filterClientId, setFilterClientId] = useState<number>(0);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"cliente" | "lista" | "tracking" | "fechamentos">("cliente");
  const [closingClientId, setClosingClientId] = useState<number>(0);
  const [closingWeekStart, setClosingWeekStart] = useState("");
  const [closingWeekEnd, setClosingWeekEnd] = useState("");
  const [isClosingFormOpen, setIsClosingFormOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [trackingCargoId, setTrackingCargoId] = useState<number | null>(null);
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [newDestCity, setNewDestCity] = useState("");
  const [newDestState, setNewDestState] = useState("");
  const [newDestClientId, setNewDestClientId] = useState(0);
  const [newDestPricePerTon, setNewDestPricePerTon] = useState("");
  const [newDestPricePerM3, setNewDestPricePerM3] = useState("");
  const [newDestPriceType, setNewDestPriceType] = useState<'ton' | 'm3'>('ton');
  const [newDestIsBuyer, setNewDestIsBuyer] = useState(false);
  const [newDestPhone, setNewDestPhone] = useState("");
  const [newDestEmail, setNewDestEmail] = useState("");
  const [newDestCnpj, setNewDestCnpj] = useState("");
  const [newDestContact, setNewDestContact] = useState("");
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const { openFilePicker } = useFilePicker();

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    vehicleId: 0,
    vehiclePlate: "",
    driverCollaboratorId: 0,
    driverName: "",
    heightM: "", widthM: "", lengthM: "",
    weightKg: "",
    weightOutKg: "",
    weightInKg: "",
    weightNetKg: "",
    woodType: "",
    destinationId: 0,
    destination: "",
    invoiceNumber: "",
    clientId: 0,
    clientName: "",
    notes: "",
    status: "pendente" as "pendente" | "entregue" | "cancelado",
    workLocationId: "",
    humidity: "",
    deliveryDate: "",
    receiverName: "",
    thirdPartyContractor: "",
    thirdPartyCost: "",
  });
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Tracking state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("aguardando");
  const [trackingNotes, setTrackingNotes] = useState("");
  const [weightPhotoType, setWeightPhotoType] = useState<"weight_out" | "weight_in" | null>(null);

  // Queries
  const { data: loads = [], isLoading } = trpc.cargoLoads.list.useQuery({ search: search || undefined });
  const { data: trucks = [] } = trpc.cargoLoads.listTrucks.useQuery();
  const { data: drivers = [] } = trpc.cargoLoads.listDrivers.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  // Deduções de adiantamento para exibir resumo financeiro por carga (todas, sem filtro)
  const { data: allDeductions = [] } = trpc.clientAdvances.listAllDeductions.useQuery();
  const { data: destinations = [] } = trpc.cargoLoads.listDestinations.useQuery();
  const { data: buyersList = [] } = trpc.buyerClients.listActive.useQuery();
  const { data: contractorsList = [] } = trpc.thirdPartyContractors.listActive.useQuery();
  const { data: detailCargo } = trpc.cargoLoads.getById.useQuery(
    { id: detailId! }, { enabled: !!detailId }
  );
  const { data: detailTrackingPhotos = [] } = trpc.cargoLoads.listTrackingPhotos.useQuery(
    { cargoId: detailId! }, { enabled: !!detailId }
  );

  // Verificação de nota fiscal duplicada em tempo real
  const { data: invoiceDuplicate } = trpc.cargoLoads.checkInvoice.useQuery(
    { invoiceNumber: form.invoiceNumber, excludeId: editId || undefined },
    { enabled: !!form.invoiceNumber && form.invoiceNumber.trim().length > 0 }
  );

  // Mutations
  const createMutation = trpc.cargoLoads.create.useMutation({
    onSuccess: () => { toast.success("Carga registrada!"); utils.cargoLoads.list.invalidate(); setIsFormOpen(false); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.cargoLoads.update.useMutation({
    onSuccess: () => { toast.success("Carga atualizada!"); utils.cargoLoads.list.invalidate(); setIsFormOpen(false); setEditId(null); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.cargoLoads.delete.useMutation({
    onSuccess: () => { toast.success("Carga removida!"); utils.cargoLoads.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateTracking = trpc.cargoLoads.updateTracking.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.cargoLoads.list.invalidate(); utils.cargoLoads.getById.invalidate(); setTrackingCargoId(null); },
    onError: (e) => toast.error(e.message),
  });
  const uploadPhotoMutation = trpc.cargoLoads.uploadPhoto.useMutation({
    onSuccess: (data) => {
      if (weightPhotoType) {
        toast.success("Foto de pesagem salva!");
        utils.cargoLoads.getById.invalidate();
        utils.cargoLoads.list.invalidate();
      } else {
        setPendingPhotos(prev => [...prev, data.url]);
        toast.success("Foto adicionada!");
      }
      setUploadingPhoto(false);
      setWeightPhotoType(null);
    },
    onError: (e) => { toast.error(e.message); setUploadingPhoto(false); },
  });
  const createDestination = trpc.cargoLoads.createDestination.useMutation({
    onSuccess: () => { toast.success("Destino cadastrado!"); utils.cargoLoads.listDestinations.invalidate(); setIsDestinationOpen(false); setNewDestName(""); setNewDestCity(""); setNewDestState(""); setNewDestClientId(0); setNewDestPricePerTon(""); setNewDestPricePerM3(""); setNewDestPriceType('ton'); },
    onError: (e) => toast.error(e.message),
  });
  const uploadDocMutation = trpc.cargoLoads.uploadDocument.useMutation({
    onSuccess: (data, vars) => {
      const labels: Record<string, string> = { invoice: 'Nota fiscal', boleto: 'Boleto', payment_receipt: 'Comprovante de pagamento' };
      toast.success(`${labels[vars.docType]} salvo!`);
      utils.cargoLoads.getById.invalidate();
      utils.cargoLoads.list.invalidate();
      setUploadingDoc(null);
    },
    onError: (e) => { toast.error(e.message); setUploadingDoc(null); },
  });
  const markAsPaidMutation = trpc.cargoLoads.markAsPaid.useMutation({
    onSuccess: () => { toast.success('Marcado como pago!'); utils.cargoLoads.getById.invalidate(); utils.cargoLoads.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updatePaymentDateMutation = trpc.cargoLoads.updatePaymentDate.useMutation({
    onSuccess: () => { toast.success('Data de pagamento atualizada!'); utils.cargoLoads.getById.invalidate(); utils.cargoLoads.list.invalidate(); setEditPaymentDateId(null); setEditPaymentDateValue(''); },
    onError: (e) => toast.error(e.message),
  });
  const [editPaymentDateId, setEditPaymentDateId] = useState<number | null>(null);
  const [editPaymentDateValue, setEditPaymentDateValue] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [boletoAmount, setBoletoAmount] = useState('');
  const [boletoDueDate, setBoletoDueDate] = useState('');

  const autoCalcNet = (saidaRoca: string, entradaCliente: string, saidaCliente: string) => {
    const entrada = parseFloat(entradaCliente) || 0;
    const saida = parseFloat(saidaCliente) || 0;
    if (entrada > 0 && saida > 0) {
      setForm(f => ({ ...f, weightNetKg: String(entrada - saida) }));
    } else if (parseFloat(saidaRoca) > 0 && saida > 0) {
      setForm(f => ({ ...f, weightNetKg: String(parseFloat(saidaRoca) - saida) }));
    }
  };

  const volume = useMemo(() => calcVolume(form.heightM, form.widthM, form.lengthM), [form.heightM, form.widthM, form.lengthM]);

  const resetForm = () => {
    // Auto-selecionar cliente se usuário só tem acesso a um cliente
    let autoClientId = 0;
    let autoClientName = "";
    if (allowedClientIds && allowedClientIds.length === 1) {
      autoClientId = allowedClientIds[0];
      const c = clientsList.find((cl: { id: number; name: string }) => cl.id === autoClientId);
      autoClientName = c?.name || "";
    }
    setForm({ date: new Date().toISOString().slice(0, 10), deliveryDate: "", vehicleId: 0, vehiclePlate: "", driverCollaboratorId: 0, driverName: "", heightM: "", widthM: "", lengthM: "", weightKg: "", weightOutKg: "", weightInKg: "", weightNetKg: "", woodType: "", destinationId: 0, destination: "", invoiceNumber: "", clientId: autoClientId, clientName: autoClientName, notes: "", status: "pendente", workLocationId: "", humidity: "", receiverName: "", thirdPartyContractor: "", thirdPartyCost: "" });
    setPendingPhotos([]);
  };

  const openEdit = (cargo: typeof loads[number]) => {
    setEditId(cargo.id);
    setForm({
      date: cargo.date ? safeDate(cargo.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      vehicleId: cargo.vehicleId || 0,
      vehiclePlate: cargo.vehiclePlate || "",
      driverCollaboratorId: cargo.driverCollaboratorId || 0,
      driverName: cargo.driverName || "",
      heightM: cargo.heightM || "",
      widthM: cargo.widthM || "",
      lengthM: cargo.lengthM || "",
      weightKg: cargo.weightKg || "",
      weightOutKg: (cargo as any).weightOutKg || "",
      weightInKg: (cargo as any).weightInKg || "",
      weightNetKg: (cargo as any).weightNetKg || "",
      woodType: cargo.woodType || "",
      destinationId: cargo.destinationId || 0,
      destination: cargo.destination || "",
      invoiceNumber: cargo.invoiceNumber || "",
      clientId: cargo.clientId || 0,
      clientName: cargo.clientName || "",
      notes: cargo.notes || "",
      status: cargo.status as "pendente" | "entregue" | "cancelado",
      workLocationId: (cargo as any).workLocationId ? String((cargo as any).workLocationId) : "",
      humidity: (cargo as any).humidity || "",
      deliveryDate: (cargo as any).deliveryDate ? safeDate((cargo as any).deliveryDate).toISOString().slice(0, 10) : "",
      receiverName: (cargo as any).receiverName || "",
      thirdPartyContractor: (cargo as any).thirdPartyContractor || "",
      thirdPartyCost: (cargo as any).thirdPartyCost || "",
    });
    // Load existing photos when editing
    const existingPhotos: string[] = cargo.photosJson ? (() => { try { return JSON.parse(cargo.photosJson); } catch { return []; } })() : [];
    setPendingPhotos(existingPhotos);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      vehicleId: form.vehicleId || undefined,
      driverCollaboratorId: form.driverCollaboratorId || undefined,
      destinationId: form.destinationId || undefined,
      clientId: form.clientId || undefined,
      volumeM3: volume || "0",
      weightOutKg: form.weightOutKg || undefined,
      weightInKg: form.weightInKg || undefined,
      weightNetKg: form.weightNetKg || undefined,
      photosJson: pendingPhotos.length ? JSON.stringify(pendingPhotos) : undefined,
      workLocationId: form.workLocationId ? parseInt(form.workLocationId) : undefined,
      humidity: form.humidity || undefined,
      deliveryDate: form.deliveryDate || undefined,
      receiverName: form.receiverName || undefined,
      thirdPartyContractor: form.thirdPartyContractor || undefined,
      thirdPartyCost: form.thirdPartyCost || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddPhoto = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      if (editId && weightPhotoType) {
        uploadPhotoMutation.mutate({ cargoId: editId, photoBase64: compressed, photoType: weightPhotoType });
      } else if (editId) {
        uploadPhotoMutation.mutate({ cargoId: editId, photoBase64: compressed, photoType: "cargo" });
      } else {
        setPendingPhotos(prev => [...prev, compressed]);
        setUploadingPhoto(false);
      }
    } catch {
      toast.error("Erro ao processar imagem");
      setUploadingPhoto(false);
    }
  };

  const handleWeightPhoto = (type: "weight_out" | "weight_in", cargoId: number) => {
    setWeightPhotoType(type);
    setEditId(cargoId);
    openFilePicker({ accept: "image/*" }, handleAddPhoto);
  };

  const handleDocUpload = (cargoId: number, docType: 'invoice' | 'boleto' | 'payment_receipt') => {
    setUploadingDoc(docType);
    openFilePicker({ accept: 'image/*,application/pdf' }, async (files: FileList) => {
      const file = files[0];
      if (!file) { setUploadingDoc(null); return; }
      try {
        let base64: string;
        if (file.type.startsWith('image/')) {
          base64 = await compressImage(file);
        } else {
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          bytes.forEach(b => binary += String.fromCharCode(b));
          base64 = `data:${file.type};base64,${btoa(binary)}`;
        }
        uploadDocMutation.mutate({
          cargoId,
          docBase64: base64,
          docType,
          ...(docType === 'boleto' ? { boletoAmount: boletoAmount || undefined, boletoDueDate: boletoDueDate || undefined } : {}),
        });
      } catch {
        toast.error('Erro ao processar arquivo');
        setUploadingDoc(null);
      }
    });
  };

  // Filtrar cargas (respeitar allowedClientIds para encarregados)
  const filtered = useMemo(() => {
    return loads.filter(c => {
      // Filtro de permissão: encarregado só vê cargas dos clientes permitidos
      if (allowedClientIds && allowedClientIds.length > 0) {
        if (!c.clientId || !allowedClientIds.includes(c.clientId)) return false;
      }
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterPaymentStatus && (c as any).paymentStatus !== filterPaymentStatus) return false;
      if (filterClientId && c.clientId !== filterClientId) return false;
      if (filterDateFrom || filterDateTo) {
        const d = c.date ? safeDate(c.date as string) : null;
        if (!d) return false;
        if (filterDateFrom && d < new Date(filterDateFrom + 'T00:00:00')) return false;
        if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [loads, filterStatus, filterPaymentStatus, filterClientId, filterDateFrom, filterDateTo, allowedClientIds]);

  // Agrupar por cliente (ordenado por data dentro de cada grupo)
  const groupedByClient = useMemo(() => {
    const groups: Record<string, { clientName: string; clientId: number | null; cargas: typeof filtered; totalVolume: number; totalCargas: number; pendentes: number; entregues: number }> = {};
    
    for (const cargo of filtered) {
      const clientKey = cargo.clientName || "Sem Cliente";
      if (!groups[clientKey]) {
        groups[clientKey] = {
          clientName: clientKey,
          clientId: cargo.clientId,
          cargas: [],
          totalVolume: 0,
          totalCargas: 0,
          pendentes: 0,
          entregues: 0,
        };
      }
      groups[clientKey].cargas.push(cargo);
      groups[clientKey].totalCargas++;
      groups[clientKey].totalVolume += parseFloat(cargo.volumeM3 || "0");
      if (cargo.status === "pendente") groups[clientKey].pendentes++;
      if (cargo.status === "entregue") groups[clientKey].entregues++;
    }

    // Ordenar cargas dentro de cada grupo por data (mais recente primeiro)
    for (const key of Object.keys(groups)) {
      groups[key].cargas.sort((a, b) => {
        const dateA = a.date ? safeDate(a.date).getTime() : 0;
        const dateB = b.date ? safeDate(b.date).getTime() : 0;
        return dateB - dateA;
      });
    }

    // Retornar como array ordenado por nome do cliente
    return Object.values(groups).sort((a, b) => {
      // "Sem Cliente" vai para o final
      if (a.clientName === "Sem Cliente") return 1;
      if (b.clientName === "Sem Cliente") return -1;
      return a.clientName.localeCompare(b.clientName, "pt-BR");
    });
  }, [filtered]);

  const toggleClientCollapse = (clientName: string) => {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  // Estatísticas
  const stats = useMemo(() => ({
    total: loads.length,
    pendente: loads.filter(c => c.status === "pendente").length,
    entregue: loads.filter(c => c.status === "entregue").length,
    volumeTotal: formatBR(loads.reduce((acc, c) => acc + parseFloat(c.volumeM3 || "0"), 0), 2),
    pesoTotal: loads.reduce((acc, c) => acc + parseFloat((c as any).weightNetKg || (c as any).weightOutKg || "0"), 0),
  }), [loads]);

  // Resumo semanal (semana atual vs semana passada)
  const weeklyStats = useMemo(() => {
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      // Week starts on Saturday: if today is Sat (6), start is today; otherwise go back (day+1) days
      const diff = day >= 6 ? 0 : -(day + 1);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };
    const today = new Date();
    const thisWeekStart = getWeekStart(today);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);

    const thisWeekLoads = loads.filter(c => {
      const d = safeDate(c.date);
      return d >= thisWeekStart && d <= thisWeekEnd;
    });
    const lastWeekLoads = loads.filter(c => {
      const d = safeDate(c.date);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });

    const calcStats = (arr: typeof loads) => ({
      count: arr.length,
      volume: arr.reduce((acc, c) => acc + parseFloat(c.volumeM3 || "0"), 0),
      peso: arr.reduce((acc, c) => acc + parseFloat((c as any).weightNetKg || (c as any).weightOutKg || "0"), 0),
      entregues: arr.filter(c => c.status === "entregue").length,
    });

    return {
      thisWeek: { ...calcStats(thisWeekLoads), start: thisWeekStart, end: thisWeekEnd },
      lastWeek: { ...calcStats(lastWeekLoads), start: lastWeekStart, end: lastWeekEnd },
    };
  }, [loads]);

  // Lista de clientes únicos para filtro
  const uniqueClients = useMemo(() => {
    const map = new Map<number, string>();
    loads.forEach(c => {
      if (c.clientId && c.clientName) map.set(c.clientId, c.clientName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [loads]);

  // Renderizar um card de carga individual
  const renderCargoCard = (cargo: typeof loads[number], colorIdx: number) => {
    const trackStep = TRACKING_STEPS.find(s => s.key === cargo.trackingStatus);
    const colors = CLIENT_COLORS[colorIdx % CLIENT_COLORS.length];
    // Resumo financeiro por carga
    const cargoDeductions = allDeductions.filter((d: any) => d.cargoLoadId === cargo.id);
    const totalDeducted = cargoDeductions.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0);
    const client = clientsList.find(c => c.id === cargo.clientId);
    const pricePerTon = parseFloat((client as any)?.pricePerTon || '0');
    const weightNet = parseFloat((cargo as any).weightNetKg || (cargo as any).weightOutKg || '0');
    const loadValue = weightNet > 0 && pricePerTon > 0 ? (weightNet / 1000) * pricePerTon : 0;
    const remaining = Math.max(0, loadValue - totalDeducted);
    const isPago = (cargo as any).paymentStatus === 'pago';
    return (
      <div key={cargo.id} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${colors.border} hover:shadow-md transition-shadow`}>
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Linha 1: Placa + Status + Tracking */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-bold text-gray-800 text-sm sm:text-base">
                  {cargo.vehiclePlate || cargo.vehicleName || "Veículo"}
                </span>
                <Badge className={`text-[10px] sm:text-xs ${STATUS_COLORS[cargo.status]}`}>{cargo.status}</Badge>
                {isPago ? (
                  <Badge className="text-[10px] sm:text-xs bg-green-100 text-green-700 border border-green-300">✅ Pago</Badge>
                ) : totalDeducted > 0 ? (
                  <Badge className="text-[10px] sm:text-xs bg-amber-100 text-amber-700 border border-amber-300">⚡ Abatido R$ {formatBR(totalDeducted)}</Badge>
                ) : (cargo as any).paymentStatus === 'a_pagar' ? (
                  <Badge className="text-[10px] sm:text-xs bg-yellow-100 text-yellow-700 border border-yellow-300">⏳ A Pagar</Badge>
                ) : null}
                {trackStep && (
                  <Badge className={`text-[10px] sm:text-xs ${TRACKING_COLORS[cargo.trackingStatus as TrackingStatus]}`}>
                    {trackStep.icon} <span translate="no">{trackStep.label}</span>
                  </Badge>
                )}
              </div>
              {/* Linha 2: Data, motorista, destino, volume */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium text-gray-700">
                  <Calendar className="h-3 w-3" />
                  {cargo.date ? safeDate(cargo.date).toLocaleDateString("pt-BR") : "-"}
                </span>
                {cargo.driverName && <span className="flex items-center gap-1"><User className="h-3 w-3" /><span translate="no">{cargo.driverName}</span></span>}
                {cargo.destination && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span translate="no">{cargo.destination}</span></span>}
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Package className="h-3 w-3" />{cargo.volumeM3 ? formatBR(parseFloat(cargo.volumeM3), 3) : '0'} m³{(cargo as any).weightNetKg ? ` · ${formatBR(parseFloat((cargo as any).weightNetKg), 0)} kg (líq.)` : cargo.weightKg ? ` · ${formatBR(parseFloat(cargo.weightKg), 0)} kg` : ""}
                </span>
                {((cargo as any).weightOutKg || (cargo as any).weightInKg) && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                    <Weight className="h-2.5 w-2.5" />
                    {(cargo as any).weightOutKg ? `Saída: ${formatBR(parseFloat((cargo as any).weightOutKg), 0)}` : ''}
                    {(cargo as any).weightOutKg && (cargo as any).weightInKg ? ' | ' : ''}
                    {(cargo as any).weightInKg ? `Entrada: ${formatBR(parseFloat((cargo as any).weightInKg), 0)}` : ''}
                    {(cargo as any).weightNetKg ? ` | Líq: ${formatBR(parseFloat((cargo as any).weightNetKg), 0)}` : ''}
                  </span>
                )}
                {loadValue > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-blue-700">
                    <DollarSign className="h-3 w-3" />R$ {formatBR(loadValue)}
                    {totalDeducted > 0 && !isPago && (
                      <span className="text-[10px] text-orange-600 font-normal ml-1">
                        (falta R$ {formatBR(remaining)})
                      </span>
                    )}
                    {isPago && (
                      <span className="text-[10px] text-green-600 font-normal ml-1">✔ quitado</span>
                    )}
                  </span>
                )}
                {cargo.invoiceNumber && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{cargo.invoiceNumber}</span>}
                {(cargo as any).locationName && <span className="flex items-center gap-1 text-emerald-600"><MapPin className="h-3 w-3" /><span translate="no">{(cargo as any).locationName}</span></span>}
              </div>
            </div>
            {/* Ações */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Ver detalhes" onClick={() => setDetailId(cargo.id)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" title="Atualizar tracking" onClick={() => { setTrackingCargoId(cargo.id); setTrackingStatus((cargo.trackingStatus as TrackingStatus) || "aguardando"); setTrackingNotes(""); }}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Editar" onClick={() => openEdit(cargo)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" title="Gerar PDF" onClick={() => generateCargoPDF(cargo as unknown as Record<string, unknown>)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              {!isPago && cargo.status === 'entregue' && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-green-600" title="Marcar como Pago" onClick={() => { if (confirm('Marcar esta carga como paga?')) markAsPaidMutation.mutate({ id: cargo.id }); }} disabled={markAsPaidMutation.isPending}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" title="Excluir" onClick={() => { if (confirm("Remover esta carga?")) deleteMutation.mutate({ id: cargo.id }); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Truck className="h-7 w-7" /> <span translate="no">Controle de Cargas</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registre e acompanhe as saídas de carga</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs ${viewMode === "cliente" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : ""}`}
            onClick={() => setViewMode("cliente")}
          >
            <Users className="h-3.5 w-3.5" /> Por Cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs ${viewMode === "lista" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : ""}`}
            onClick={() => setViewMode("lista")}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Lista
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs ${viewMode === "tracking" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : ""}`}
            onClick={() => setViewMode("tracking")}
          >
            <Navigation className="h-3.5 w-3.5" /> Tracking
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs ${viewMode === "fechamentos" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : ""}`}
            onClick={() => setViewMode("fechamentos")}
          >
            <CalendarClock className="h-3.5 w-3.5" /> Fechamentos
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
            onClick={() => { resetForm(); setEditId(null); setIsFormOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nova Carga
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
          { label: "Pendentes", value: stats.pendente, color: "text-red-700", bg: "bg-red-50" },
          { label: "Entregues", value: stats.entregue, color: "text-green-700", bg: "bg-green-50" },
          { label: "Volume Total", value: `${stats.volumeTotal} m³`, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Peso Total", value: stats.pesoTotal > 0 ? `${formatBR(stats.pesoTotal / 1000)} ton` : "-", color: "text-purple-700", bg: "bg-purple-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Resumo Semanal */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">Resumo Semanal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Semana Atual */}
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Semana Atual</span>
              <span className="text-[10px] text-gray-400">
                {weeklyStats.thisWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {weeklyStats.thisWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-700">{weeklyStats.thisWeek.count}</p>
                <p className="text-[10px] text-gray-500">Cargas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{formatBR(weeklyStats.thisWeek.volume, 1)}</p>
                <p className="text-[10px] text-gray-500">m³</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-700">{weeklyStats.thisWeek.peso > 0 ? formatBR(weeklyStats.thisWeek.peso / 1000, 1) : '-'}</p>
                <p className="text-[10px] text-gray-500">ton</p>
              </div>
            </div>
            {weeklyStats.thisWeek.entregues > 0 && (
              <p className="text-[10px] text-green-600 mt-1 text-center">{weeklyStats.thisWeek.entregues} entregue{weeklyStats.thisWeek.entregues > 1 ? 's' : ''}</p>
            )}
          </div>
          {/* Semana Passada */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 opacity-90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Semana Passada</span>
              <span className="text-[10px] text-gray-400">
                {weeklyStats.lastWeek.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {weeklyStats.lastWeek.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-700">{weeklyStats.lastWeek.count}</p>
                <p className="text-[10px] text-gray-500">Cargas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{formatBR(weeklyStats.lastWeek.volume, 1)}</p>
                <p className="text-[10px] text-gray-500">m³</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">{weeklyStats.lastWeek.peso > 0 ? formatBR(weeklyStats.lastWeek.peso / 1000, 1) : '-'}</p>
                <p className="text-[10px] text-gray-500">ton</p>
              </div>
            </div>
            {weeklyStats.lastWeek.entregues > 0 && (
              <p className="text-[10px] text-green-600 mt-1 text-center">{weeklyStats.lastWeek.entregues} entregue{weeklyStats.lastWeek.entregues > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar placa, cliente, destino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select
          value={filterClientId}
          onChange={e => setFilterClientId(parseInt(e.target.value))}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value={0}>Todos os clientes</option>
          {uniqueClients.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="entregue">Entregue</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select
          value={filterPaymentStatus}
          onChange={e => setFilterPaymentStatus(e.target.value as typeof filterPaymentStatus)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Todos pagamentos</option>
          <option value="pago">✅ Pago</option>
          <option value="a_pagar">⏳ A Pagar</option>
          <option value="sem_boleto">— Sem Boleto</option>
        </select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="h-10 text-sm w-36"
            title="Data inicial"
            placeholder="De"
          />
          <span className="text-gray-400 text-xs">até</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="h-10 text-sm w-36"
            title="Data final"
            placeholder="Até"
          />
          {(filterDateFrom || filterDateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
              className="h-10 px-2 text-gray-400 hover:text-gray-600"
              title="Limpar filtro de data"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Cargas */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma carga encontrada</p>
          <p className="text-sm mt-1">Registre a primeira saída de carga</p>
        </div>
      ) : viewMode === "cliente" ? (
        /* ===== VIEW: AGRUPADO POR CLIENTE ===== */
        <div className="space-y-6">
          {groupedByClient.map((group, groupIdx) => {
            const colors = CLIENT_COLORS[groupIdx % CLIENT_COLORS.length];
            const isCollapsed = collapsedClients.has(group.clientName);
            return (
              <div key={group.clientName} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {/* Header do grupo (cliente) */}
                <button
                  onClick={() => toggleClientCollapse(group.clientName)}
                  className={`w-full ${colors.headerBg} text-white px-4 py-3 flex items-center justify-between hover:opacity-95 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-bold text-sm sm:text-base" translate="no">{group.clientName}</h3>
                      <p className="text-xs opacity-90">
                        {group.totalCargas} carga{group.totalCargas !== 1 ? "s" : ""} · {formatBR(group.totalVolume)} m³
                        {group.pendentes > 0 && ` · ${group.pendentes} pendente${group.pendentes !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini badges de resumo */}
                    <div className="hidden sm:flex gap-2">
                      {group.pendentes > 0 && (
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                          {group.pendentes} pendente{group.pendentes !== 1 ? "s" : ""}
                        </span>
                      )}
                      {group.entregues > 0 && (
                        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                          {group.entregues} entregue{group.entregues !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                  </div>
                </button>

                {/* Cargas do cliente */}
                {!isCollapsed && (
                  <div className="bg-gray-50/50 divide-y divide-gray-100">
                    {/* Subheader com datas */}
                    {(() => {
                      let lastDate = "";
                      return group.cargas.map((cargo) => {
                        const cargoDate = cargo.date ? safeDate(cargo.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "Sem data";
                        const showDateHeader = cargoDate !== lastDate;
                        lastDate = cargoDate;
                        return (
                          <div key={cargo.id}>
                            {showDateHeader && (
                              <div className="px-4 py-2 bg-gray-100/80 border-b border-gray-200">
                                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" />
                                  {cargoDate}
                                </span>
                              </div>
                            )}
                            <div className="px-3 py-2">
                              {renderCargoCard(cargo, groupIdx)}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* Rodapé do grupo com totais */}
                    <div className={`px-4 py-3 ${colors.bg} flex flex-wrap items-center gap-4 text-xs`}>
                      <span className={`font-semibold ${colors.text}`}>
                        Total: {group.totalCargas} carga{group.totalCargas !== 1 ? "s" : ""}
                      </span>
                      <span className={`font-semibold ${colors.text}`}>
                        Volume: {formatBR(group.totalVolume)} m³
                      </span>
                      {(() => {
                        const client = clientsList.find(c => c.id === group.clientId);
                        const pricePerTon = parseFloat((client as any)?.pricePerTon || '0');
                        const totalWeight = group.cargas.reduce((sum, c) => {
                          return sum + parseFloat((c as any).weightNetKg || (c as any).weightOutKg || '0');
                        }, 0);
                        return (
                          <>
                            {totalWeight > 0 && (
                              <span className="font-semibold text-emerald-700">
                                Peso líq.: {formatBR(totalWeight / 1000)} ton ({formatBR(totalWeight, 0)} kg)
                              </span>
                            )}
                            {pricePerTon > 0 && totalWeight > 0 && (
                              <span className="font-semibold text-blue-700">
                                Valor: R$ {formatBR((totalWeight / 1000) * pricePerTon)} ({formatBR(totalWeight / 1000)} ton x R$ {formatBR(pricePerTon, 0)}/ton)
                              </span>
                            )}
                          </>
                        );
                      })()}
                      {group.pendentes > 0 && (
                        <span className="font-semibold text-red-600">
                          Pendentes: {group.pendentes}
                        </span>
                      )}
                      {group.entregues > 0 && (
                        <span className="font-semibold text-green-600">
                          Entregues: {group.entregues}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto gap-1.5 text-xs bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          const client = clientsList.find(c => c.id === group.clientId);
                          const price = parseFloat((client as any)?.pricePerTon || '0');
                          generateClientReportPDF(group.clientName, group.cargas as unknown as Array<Record<string, unknown>>, price, (allDeductions as any[]).filter(d => d.clientId === group.clientId));
                        }}
                      >
                        <Download className="h-3.5 w-3.5" /> Relatório PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "fechamentos" ? (
        /* ===== VIEW: FECHAMENTOS SEMANAIS ===== */
        <WeeklyClosingsView
          clientsList={clientsList}
          loads={loads}
          closingClientId={closingClientId}
          setClosingClientId={setClosingClientId}
          closingWeekStart={closingWeekStart}
          setClosingWeekStart={setClosingWeekStart}
          closingWeekEnd={closingWeekEnd}
          setClosingWeekEnd={setClosingWeekEnd}
          isClosingFormOpen={isClosingFormOpen}
          setIsClosingFormOpen={setIsClosingFormOpen}
        />
      ) : viewMode === "tracking" ? (
        /* ===== VIEW: TRACKING TIMELINE ===== */
        <div className="space-y-4">
          {filtered.map(cargo => {
            const currentIdx = TRACKING_STEPS.findIndex(s => s.key === cargo.trackingStatus);
            const photos: string[] = cargo.photosJson ? (() => { try { return JSON.parse(cargo.photosJson); } catch { return []; } })() : [];
            return (
              <Card key={cargo.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {photos[0] ? (
                        <img src={photos[0]} alt="Carga" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-emerald-500" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{cargo.vehiclePlate || cargo.vehicleName || "Veículo"}</span>
                          <Badge className={`text-xs ${STATUS_COLORS[cargo.status]}`}>{cargo.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                          <span>{cargo.date ? safeDate(cargo.date).toLocaleDateString("pt-BR") : "-"}</span>
                          {cargo.clientName && <span translate="no">{cargo.clientName}</span>}
                          {cargo.destination && <span>→ <span translate="no">{cargo.destination}</span></span>}
                          <span>{cargo.volumeM3} m³</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600" title="Atualizar tracking" onClick={() => { setTrackingCargoId(cargo.id); setTrackingStatus((cargo.trackingStatus as TrackingStatus) || "aguardando"); setTrackingNotes(""); }}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600" title="Ver detalhes" onClick={() => setDetailId(cargo.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  {/* Timeline horizontal */}
                  <div className="flex items-center gap-0 overflow-x-auto pb-2">
                    {TRACKING_STEPS.map((step, idx) => {
                      const isDone = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <div key={step.key} className="flex items-center">
                          <div className="flex flex-col items-center min-w-[70px]">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                              isDone ? "bg-emerald-500 text-white shadow-sm" : isCurrent ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md" : "bg-gray-100 text-gray-400"
                            }`}>
                              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <span>{step.icon}</span>}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight font-medium ${
                              isDone ? "text-emerald-600" : isCurrent ? "text-emerald-700 font-bold" : "text-gray-400"
                            }`}>{step.label}</span>
                          </div>
                          {idx < TRACKING_STEPS.length - 1 && (
                            <div className={`h-0.5 w-6 mx-0.5 rounded-full ${
                              idx < currentIdx ? "bg-emerald-400" : "bg-gray-200"
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {cargo.trackingNotes && (
                    <p className="text-xs text-gray-500 italic mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      "{cargo.trackingNotes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ===== VIEW: LISTA PADRÃO (ordenada por data) ===== */
        <div className="space-y-3">
          {filtered.map(cargo => renderCargoCard(cargo, 0))}
        </div>
      )}

      {/* ===== DIALOG: FORMULÁRIO DE CARGA ===== */}
      <Sheet open={isFormOpen} onOpenChange={(v) => { setIsFormOpen(v); if (!v) { setEditId(null); resetForm(); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-emerald-800">{editId ? "Editar Carga" : "Nova Carga"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-4 pb-8">
            {/* Data */}
            <div>
              <Label>Data (Carregamento) *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <Label>Data de Entrega</Label>
              <Input type="date" value={form.deliveryDate || ''} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
              <p className="text-[10px] text-gray-500 mt-0.5">Usada no fechamento semanal. Se vazio, usa a data de carregamento.</p>
            </div>
            <div>
              <Label>Responsável pelo Recebimento</Label>
              <Input
                value={form.receiverName || ''}
                onChange={e => setForm(f => ({ ...f, receiverName: e.target.value }))}
                placeholder="Ex: João da Silva (granjeiro)"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Nome de quem assinou o recibo na granja/destino.</p>
            </div>

            {/* Corte Terceirizado - apenas para admin */}
            {isAdmin && (
              <div className="space-y-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-sm font-semibold text-orange-800">🔧 Corte Terceirizado (Interno)</p>
                <div>
                  <Label>Terceirizado</Label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={form.thirdPartyContractor || ''}
                    onChange={e => {
                      const selected = contractorsList.find((c: any) => c.name === e.target.value);
                      const volStr = calcVolume(form.heightM, form.widthM, form.lengthM);
                      const vol = parseFloat(volStr || '0');
                      const rate = selected ? parseFloat(selected.ratePerM3 || '0') : 0;
                      const autoCost = selected && vol > 0 ? (vol * rate).toFixed(2) : form.thirdPartyCost;
                      setForm(f => ({ ...f, thirdPartyContractor: e.target.value, thirdPartyCost: autoCost || '' }));
                    }}
                  >
                    <option value="">-- Selecionar terceirizado --</option>
                    {contractorsList.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name} (R$ {parseFloat(c.ratePerM3 || '0').toFixed(2)}/m³)</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-0.5">Selecione o terceirizado. Cadastre novos em <strong>Terceirizados</strong> no menu.</p>
                </div>
                <div>
                  <Label>Custo do Corte (R$)</Label>
                  <Input
                    value={form.thirdPartyCost || ''}
                    onChange={e => setForm(f => ({ ...f, thirdPartyCost: e.target.value }))}
                    placeholder="Calculado automaticamente (volume × taxa/m³)"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">Calculado automaticamente. Pode ser editado manualmente.</p>
                </div>
              </div>
            )}

            {/* Veículo */}
            <div className="space-y-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2"><Truck className="h-4 w-4" /> Veículo e Motorista</p>
              <div>
                <Label>Caminhão</Label>
                <select
                  value={form.vehicleId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const truck = trucks.find(t => t.id === id);
                    setForm(f => ({
                      ...f,
                      vehicleId: id,
                      vehiclePlate: truck?.licensePlate || f.vehiclePlate,
                      heightM: (truck as any)?.defaultHeightM || f.heightM || "2.4",
                      widthM: (truck as any)?.defaultWidthM || f.widthM || "2.4",
                      lengthM: (truck as any)?.defaultLengthM || f.lengthM || "13.80",
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar caminhão cadastrado...</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.licensePlate ? ` — ${t.licensePlate}` : ""}</option>
                  ))}
                </select>
              </div>
              {!form.vehicleId && (
                <div>
                  <Label>Placa (manual)</Label>
                  <Input value={form.vehiclePlate} onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))} placeholder="ABC-1234" className="uppercase" />
                </div>
              )}
              <div>
                <Label>Motorista</Label>
                <select
                  value={form.driverCollaboratorId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const driver = drivers.find(d => d.id === id);
                    setForm(f => ({ ...f, driverCollaboratorId: id, driverName: driver?.name || f.driverName }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar motorista cadastrado...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {!form.driverCollaboratorId && (
                <div>
                  <Label>Motorista (manual)</Label>
                  <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Nome do motorista" />
                </div>
              )}
            </div>

            {/* Carga */}
            <div className="space-y-3 p-3 bg-emerald-50 rounded-xl">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><Package className="h-4 w-4" /> Informações da Carga</p>
              <div>
                <Label>Tipo de Madeira</Label>
                <Input value={form.woodType} onChange={e => setForm(f => ({ ...f, woodType: e.target.value }))} placeholder="ex: Eucalipto, Pinus" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Altura (m) *</Label>
                  <Input value={form.heightM} onChange={e => setForm(f => ({ ...f, heightM: e.target.value }))} placeholder="0.00" required />
                </div>
                <div>
                  <Label>Largura (m) *</Label>
                  <Input value={form.widthM} onChange={e => setForm(f => ({ ...f, widthM: e.target.value }))} placeholder="0.00" required />
                </div>
                <div>
                  <Label>Comp. (m) *</Label>
                  <Input value={form.lengthM} onChange={e => setForm(f => ({ ...f, lengthM: e.target.value }))} placeholder="0.00" required />
                </div>
              </div>
              {volume && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <span className="text-xs text-gray-500">Volume calculado: </span>
                  <span className="font-bold text-emerald-700">{volume ? formatBR(parseFloat(volume), 3) : '0'} m³</span>
                </div>
              )}
              <div>
                <Label className="flex items-center gap-1 text-xs text-muted-foreground"><Weight className="h-3.5 w-3.5" /> Saída de Roça (kg) <span className="text-[10px] italic">(se houver pesagem)</span></Label>
                <Input value={form.weightKg} onChange={e => { setForm(f => ({ ...f, weightKg: e.target.value })); autoCalcNet(e.target.value, form.weightInKg, form.weightOutKg); }} placeholder="ex: 63000" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Entrada Cliente (kg)</Label>
                  <Input value={form.weightInKg} onChange={e => { setForm(f => ({ ...f, weightInKg: e.target.value })); autoCalcNet(form.weightKg, e.target.value, form.weightOutKg); }} placeholder="ex: 63000" type="number" />
                </div>
                <div>
                  <Label className="text-xs">Saída Cliente (kg)</Label>
                  <Input value={form.weightOutKg} onChange={e => { setForm(f => ({ ...f, weightOutKg: e.target.value })); autoCalcNet(form.weightKg, form.weightInKg, e.target.value); }} placeholder="ex: 21000" type="number" />
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <Label className="text-xs font-semibold text-green-800">Peso Líquido (kg) — calculado automaticamente</Label>
                <div className="text-lg font-bold text-green-700">{form.weightNetKg ? `${formatBR(Number(form.weightNetKg), 0)} kg` : '—'}</div>
                <p className="text-[10px] text-green-600">Entrada - Saída = Líquido (usado para cálculo de pagamento)</p>
              </div>
              <div>
                <Label>Nº Nota Fiscal</Label>
                <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="ex: NF-001234" className={invoiceDuplicate?.exists ? 'border-red-500 ring-red-200' : ''} />
                {invoiceDuplicate?.exists && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Nota já usada na carga {invoiceDuplicate.cargo?.vehiclePlate || ''} ({invoiceDuplicate.cargo?.date ? safeDate(invoiceDuplicate.cargo.date).toLocaleDateString('pt-BR') : ''}) - {invoiceDuplicate.cargo?.clientName || ''}
                  </p>
                )}
              </div>
            </div>

            {/* Cliente e Destino */}
            <div className="space-y-3 p-3 bg-purple-50 rounded-xl">
              <p className="text-sm font-semibold text-purple-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> Cliente e Destino</p>
              <div>
                <Label>Cliente</Label>
                <select
                  value={form.clientId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    const client = clientsList.find((c: { id: number; name: string }) => c.id === id);
                    setForm(f => ({ ...f, clientId: id, clientName: client?.name || f.clientName }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar cliente cadastrado...</option>
                  {clientsList.map((c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {!form.clientId && (
                <div>
                  <Label>Cliente (manual)</Label>
                  <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Destino</Label>
                  <button type="button" onClick={() => setIsDestinationOpen(true)} className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Cadastrar novo
                  </button>
                </div>
                <select
                  value={form.destinationId}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    // Check if it's a buyer (id >= 10000)
                    if (id >= 10000) {
                      const buyerId = id - 10000;
                      const buyer = (buyersList as any[]).find(b => b.id === buyerId);
                      setForm(f => ({
                        ...f,
                        destinationId: id,
                        destination: buyer?.name || f.destination,
                      }));
                    } else {
                      const dest = destinations.find(d => d.id === id) as (typeof destinations[number] & { clientId?: number | null; pricePerTon?: string | null; pricePerM3?: string | null; priceType?: string | null }) | undefined;
                      const linkedClientId = dest?.clientId;
                      const linkedClient = linkedClientId ? (clientsList as { id: number; name: string }[]).find(c => c.id === linkedClientId) : null;
                      setForm(f => ({
                        ...f,
                        destinationId: id,
                        destination: dest?.name || f.destination,
                        ...(linkedClientId ? { clientId: linkedClientId, clientName: linkedClient?.name || f.clientName } : {}),
                      }));
                    }
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={0}>Selecionar destino cadastrado...</option>
                  {destinations.length > 0 && <optgroup label="Destinos">
                    {[...destinations].sort((a, b) => {
                      const countA = loads.filter(l => l.destinationId === a.id).length;
                      const countB = loads.filter(l => l.destinationId === b.id).length;
                      return countB - countA;
                    }).map(d => {
                      const dExt = d as typeof d & { pricePerTon?: string | null; pricePerM3?: string | null; priceType?: string | null };
                      const priceLabel = dExt.priceType === 'm3' && dExt.pricePerM3 ? ` (R$${dExt.pricePerM3}/m³)` : dExt.pricePerTon ? ` (R$${dExt.pricePerTon}/ton)` : '';
                      return <option key={`dest-${d.id}`} value={d.id}>{d.name}{d.city ? ` — ${d.city}/${d.state}` : ""}{priceLabel}</option>;
                    })}
                  </optgroup>}
                  {buyersList.length > 0 && <optgroup label="💰 Compradores">
                    {buyersList.map((b: any) => (
                      <option key={`buyer-${b.id}`} value={10000 + b.id}>{b.name}{b.pricePerUnit ? ` (R$${b.pricePerUnit}/${b.unit === 'm3' ? 'm³' : 'ton'})` : ''}{b.city ? ` — ${b.city}/${b.state}` : ''}</option>
                    ))}
                  </optgroup>}
                </select>
              </div>
              {!form.destinationId && (
                <div>
                  <Label>Destino (manual)</Label>
                  <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Nome do destino" />
                </div>
              )}
              {/* Exibe o preço cadastrado no destino selecionado */}
              {form.destinationId > 0 && form.destinationId < 10000 && (() => {
                const dExt = destinations.find(d => d.id === form.destinationId) as (typeof destinations[number] & { pricePerTon?: string | null; pricePerM3?: string | null; priceType?: string | null }) | undefined;
                const price = dExt?.priceType === 'm3' ? dExt?.pricePerM3 : dExt?.pricePerTon;
                const unit = dExt?.priceType === 'm3' ? 'm³' : 'ton';
                if (!price) return null;
                return (
                  <div className="flex items-center gap-2 mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded-md">
                    <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-700">
                      Valor cadastrado: <strong>R$ {price}/{unit}</strong>
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Local de Trabalho */}
            <WorkLocationSelect
              value={form.workLocationId}
              onChange={(id) => setForm(f => ({ ...f, workLocationId: id }))}
            />

            {/* Status e Observações */}
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="pendente">Pendente</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Umidade (%)</Label>
                  <Input
                    type="text"
                    value={form.humidity}
                    onChange={e => setForm(f => ({ ...f, humidity: e.target.value }))}
                    placeholder="Ex: 35"
                  />
                </div>
              </div>
              <Label>Observações</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações sobre a carga..."
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Fotos */}
            <div>
              <Label className="flex items-center gap-2 mb-2"><Camera className="h-4 w-4" /> Fotos da Carga</Label>
              <div className="flex flex-wrap gap-2">
                {pendingPhotos.map((p, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-200 cursor-pointer" onClick={() => window.open(p, '_blank')} />
                    <button type="button" onClick={() => setPendingPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openFilePicker({ accept: "image/*" }, handleAddPhoto)}
                  disabled={uploadingPhoto}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-xs mt-1">Foto</span></>}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Salvar" : "Registrar Carga"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ===== DIALOG: DETALHE DA CARGA ===== */}
      <Dialog open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Detalhes da Carga #{detailId}</DialogTitle>
          </DialogHeader>
          {detailCargo && (
            <div className="space-y-4">
              {/* Tracking timeline */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Acompanhamento</p>
                <div className="flex flex-wrap gap-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const currentIdx = TRACKING_STEPS.findIndex(s => s.key === detailCargo.trackingStatus);
                    const cls = idx < currentIdx ? "bg-green-100 text-green-700" : idx === currentIdx ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400";
                    return (
                      <span key={step.key} className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 ${cls}`}>
                        {step.icon} {step.label}
                      </span>
                    );
                  })}
                </div>
                {detailCargo.trackingNotes && <p className="text-sm text-gray-600 mt-2 italic">"{detailCargo.trackingNotes}"</p>}
              </div>

              {/* Dados */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Data", detailCargo.date ? safeDate(detailCargo.date).toLocaleDateString("pt-BR") : "-"],
                  ["Veículo", detailCargo.vehiclePlate || detailCargo.vehicleName || "-"],
                  ["Motorista", detailCargo.driverName || "-"],
                  ["Cliente", detailCargo.clientName || "-"],
                  ["Destino", detailCargo.destination || "-"],
                  ["Tipo de Madeira", detailCargo.woodType || "-"],
                  ["Volume Previsto", `${detailCargo.volumeM3 ? formatBR(parseFloat(detailCargo.volumeM3), 3) : '-'} m³`],
                  ["Peso Previsto", detailCargo.weightKg ? `${detailCargo.weightKg} kg` : "-"],
                  ["Nota Fiscal", detailCargo.invoiceNumber || "-"],
                  ["Status", detailCargo.status],
                  ["Peso Bruto Saída (kg)", (detailCargo as any).weightOutKg ? `${(detailCargo as any).weightOutKg} kg` : "-"],
                  ["Peso Bruto Chegada (kg)", (detailCargo as any).weightInKg ? `${(detailCargo as any).weightInKg} kg` : "-"],
                  ["Peso Líquido (kg)", (detailCargo as any).weightNetKg ? `${(detailCargo as any).weightNetKg} kg` : "-"],
                  ["Metragem Final", (detailCargo as any).finalHeightM ? `${(detailCargo as any).finalHeightM} x ${(detailCargo as any).finalWidthM} x ${(detailCargo as any).finalLengthM} m = ${calcVolume((detailCargo as any).finalHeightM || "0", (detailCargo as any).finalWidthM || "0", (detailCargo as any).finalLengthM || "0")} m³` : "-"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Fotos de Tracking por Etapa */}
              {detailTrackingPhotos.length > 0 && (() => {
                const grouped = detailTrackingPhotos.reduce<Record<string, typeof detailTrackingPhotos>>((acc, p) => {
                  if (!acc[p.stage]) acc[p.stage] = [];
                  acc[p.stage]!.push(p);
                  return acc;
                }, {});
                return (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Fotos por Etapa</p>
                    <div className="space-y-3">
                      {TRACKING_STEPS.filter(s => grouped[s.key]).map(step => (
                        <div key={step.key}>
                          <p className="text-xs font-medium text-gray-600 mb-1">{step.icon} {step.label}</p>
                          <div className="flex gap-2 flex-wrap">
                            {grouped[step.key]!.map((tp) => (
                              <div key={tp.id} className="relative group">
                                <img
                                  src={tp.photoUrl}
                                  alt={step.label}
                                  className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(tp.photoUrl, "_blank")}
                                />
                                {tp.notes && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">
                                    {tp.notes}
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {tp.registeredByName} · {safeDate(tp.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Fotos de pesagem */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Fotos de Pesagem</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Pesagem Saída</p>
                    {detailCargo.weightOutPhotoUrl ? (
                      <img src={detailCargo.weightOutPhotoUrl} alt="Pesagem saída" className="w-full h-32 object-cover rounded-lg border" />
                    ) : (
                      <button onClick={() => handleWeightPhoto("weight_out", detailCargo.id)} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 text-xs gap-1">
                        <Camera className="h-5 w-5" /> Adicionar foto
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Pesagem Chegada</p>
                    {detailCargo.weightInPhotoUrl ? (
                      <img src={detailCargo.weightInPhotoUrl} alt="Pesagem chegada" className="w-full h-32 object-cover rounded-lg border" />
                    ) : (
                      <button onClick={() => handleWeightPhoto("weight_in", detailCargo.id)} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 text-xs gap-1">
                        <Camera className="h-5 w-5" /> Adicionar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fotos da carga */}
              {detailCargo.photosJson && (() => {
                try {
                  const photos: string[] = JSON.parse(detailCargo.photosJson);
                  if (!photos.length) return null;
                  return (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Fotos da Carga ({photos.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {photos.map((p, i) => (
                          <div key={i} className="relative group cursor-pointer" onClick={() => window.open(p, '_blank')}>
                            <img src={p} alt={`Foto ${i + 1}`} className="w-32 h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                              <ExternalLink className="h-6 w-6 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* ===== DOCUMENTOS FINANCEIROS ===== */}
              <div className="border border-amber-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Documentos Financeiros
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Nota Fiscal */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">Nota Fiscal</p>
                        {(detailCargo as any).invoiceUrl ? (
                          <a href={(detailCargo as any).invoiceUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                            <ExternalLink className="h-3 w-3 flex-shrink-0" /> Ver documento
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Nenhum arquivo anexado</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs flex-shrink-0"
                      disabled={uploadingDoc === 'invoice'}
                      onClick={() => handleDocUpload(detailCargo.id, 'invoice')}
                    >
                      {uploadingDoc === 'invoice' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {(detailCargo as any).invoiceUrl ? 'Substituir' : 'Anexar'}
                    </Button>
                  </div>

                  {/* Boleto */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700">Boleto</p>
                          {(detailCargo as any).boletoUrl ? (
                            <div>
                              <a href={(detailCargo as any).boletoUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                                <ExternalLink className="h-3 w-3 flex-shrink-0" /> Ver boleto
                              </a>
                              {((detailCargo as any).boletoAmount || (detailCargo as any).boletoDueDate) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {(detailCargo as any).boletoAmount && <span className="font-medium">R$ {(detailCargo as any).boletoAmount}</span>}
                                  {(detailCargo as any).boletoDueDate && <span> · Venc: {safeDate((detailCargo as any).boletoDueDate).toLocaleDateString('pt-BR')}</span>}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Nenhum boleto anexado</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs flex-shrink-0"
                        disabled={uploadingDoc === 'boleto'}
                        onClick={() => handleDocUpload(detailCargo.id, 'boleto')}
                      >
                        {uploadingDoc === 'boleto' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {(detailCargo as any).boletoUrl ? 'Substituir' : 'Anexar'}
                      </Button>
                    </div>
                    {/* Campos valor e vencimento do boleto */}
                    {!(detailCargo as any).boletoUrl && (
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <div>
                          <Label className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" /> Valor (R$)</Label>
                          <Input
                            value={boletoAmount}
                            onChange={e => setBoletoAmount(e.target.value)}
                            placeholder="ex: 1500.00"
                            type="number"
                            step="0.01"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Vencimento</Label>
                          <Input
                            value={boletoDueDate}
                            onChange={e => setBoletoDueDate(e.target.value)}
                            type="date"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comprovante de Pagamento */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">Comprovante de Pagamento</p>
                        {(detailCargo as any).paymentReceiptUrl ? (
                          <a href={(detailCargo as any).paymentReceiptUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                            <ExternalLink className="h-3 w-3 flex-shrink-0" /> Ver comprovante
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400">Nenhum comprovante anexado</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {(detailCargo as any).boletoUrl && (detailCargo as any).paymentStatus !== 'pago' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs border-green-300 text-green-700 hover:bg-green-50"
                          disabled={markAsPaidMutation.isPending}
                          onClick={() => { if (confirm('Marcar como pago?')) markAsPaidMutation.mutate({ id: detailCargo.id }); }}
                        >
                          {markAsPaidMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Pago
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs flex-shrink-0"
                        disabled={uploadingDoc === 'payment_receipt'}
                        onClick={() => handleDocUpload(detailCargo.id, 'payment_receipt')}
                      >
                        {uploadingDoc === 'payment_receipt' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {(detailCargo as any).paymentReceiptUrl ? 'Substituir' : 'Anexar'}
                      </Button>
                    </div>
                  </div>

                  {/* Status de pagamento */}
                  {(detailCargo as any).paymentStatus && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      (detailCargo as any).paymentStatus === 'pago'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {(detailCargo as any).paymentStatus === 'pago' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Pago{(detailCargo as any).paidAt && ` em ${safeDate((detailCargo as any).paidAt).toLocaleDateString('pt-BR')}`}</span>
                          <button
                            type="button"
                            title="Corrigir data de pagamento"
                            className="ml-auto p-0.5 rounded hover:bg-green-100 text-green-600 hover:text-green-800 transition-colors"
                            onClick={() => {
                              const current = (detailCargo as any).paidAt;
                              const dateVal = current
                                ? safeDate(current).toISOString().slice(0, 10)
                                : new Date().toISOString().slice(0, 10);
                              setEditPaymentDateValue(dateVal);
                              setEditPaymentDateId(detailCargo.id);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <><Clock className="h-3.5 w-3.5" /> A Pagar{(detailCargo as any).boletoDueDate && ` · Venc: ${safeDate((detailCargo as any).boletoDueDate).toLocaleDateString('pt-BR')}`}</>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo financeiro no modal de detalhes */}
              {(() => {
                const detailClient = clientsList.find(c => c.id === detailCargo.clientId);
                const detailPricePerTon = parseFloat((detailClient as any)?.pricePerTon || '0');
                const detailWeightNet = parseFloat((detailCargo as any).weightNetKg || (detailCargo as any).weightOutKg || '0');
                const detailLoadValue = detailWeightNet > 0 && detailPricePerTon > 0 ? (detailWeightNet / 1000) * detailPricePerTon : 0;
                const detailDeductions = allDeductions.filter((d: any) => d.cargoLoadId === detailCargo.id);
                const detailTotalDeducted = detailDeductions.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0);
                const detailRemaining = Math.max(0, detailLoadValue - detailTotalDeducted);
                const detailIsPago = (detailCargo as any).paymentStatus === 'pago';
                if (detailLoadValue <= 0 && detailDeductions.length === 0) return null;
                return (
                  <div className={`rounded-xl p-3 border ${
                    detailIsPago ? 'bg-green-50 border-green-200' :
                    detailTotalDeducted > 0 ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-600">Resumo Financeiro</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Valor da Carga</p>
                        <p className="text-sm font-bold text-blue-700">{detailLoadValue > 0 ? `R$ ${formatBR(detailLoadValue)}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Abatido (Adiant.)</p>
                        <p className={`text-sm font-bold ${detailTotalDeducted > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          {detailTotalDeducted > 0 ? `R$ ${formatBR(detailTotalDeducted)}` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{detailIsPago ? 'Status' : 'A Receber'}</p>
                        <p className={`text-sm font-bold ${detailIsPago ? 'text-green-700' : detailRemaining > 0 ? 'text-orange-600' : 'text-green-700'}`}>
                          {detailIsPago ? '✅ Pago' : detailRemaining > 0 ? `R$ ${formatBR(detailRemaining)}` : '✅ Quitado'}
                        </p>
                      </div>
                    </div>
                    {detailDeductions.length > 0 && (
                      <div className="mt-2 border-t border-gray-200 pt-2 space-y-1">
                        <p className="text-xs text-gray-500">Abatimentos registrados:</p>
                        {detailDeductions.map((d: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{d.description || `Abatimento #${i + 1}`}</span>
                            <span className="font-medium text-green-700">- R$ {formatBR(parseFloat(d.amount || '0'))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailId(null); openEdit(detailCargo as unknown as typeof loads[number]); }}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => generateCargoPDF(detailCargo as unknown as Record<string, unknown>)}>
                  <Download className="h-4 w-4" /> Ficha PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: ATUALIZAR TRACKING ===== */}
      <Dialog open={!!trackingCargoId} onOpenChange={v => { if (!v) setTrackingCargoId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Atualizar Acompanhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {TRACKING_STEPS.map(step => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setTrackingStatus(step.key)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${trackingStatus === step.key ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 hover:border-emerald-300"}`}
                >
                  <span className="text-lg">{step.icon}</span>
                  <p className="mt-1">{step.label}</p>
                </button>
              ))}
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <textarea
                value={trackingNotes}
                onChange={e => setTrackingNotes(e.target.value)}
                placeholder="ex: Saiu da fazenda às 14h30..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setTrackingCargoId(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updateTracking.isPending}
                onClick={() => {
                  if (trackingCargoId) {
                    updateTracking.mutate({ id: trackingCargoId, trackingStatus, trackingNotes: trackingNotes || undefined });
                  }
                }}
              >
                {updateTracking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: CADASTRAR DESTINO ===== */}
      <Dialog open={isDestinationOpen} onOpenChange={v => { setIsDestinationOpen(v); if (!v) { setNewDestName(""); setNewDestCity(""); setNewDestState(""); setNewDestClientId(0); setNewDestPricePerTon(""); setNewDestPricePerM3(""); setNewDestPriceType('ton'); setNewDestIsBuyer(false); setNewDestPhone(""); setNewDestEmail(""); setNewDestCnpj(""); setNewDestContact(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Destino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do Destino *</Label>
              <Input value={newDestName} onChange={e => setNewDestName(e.target.value)} placeholder="ex: Fazenda São João, Usina Boa Vista" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade</Label>
                <Input value={newDestCity} onChange={e => setNewDestCity(e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={newDestState} onChange={e => setNewDestState(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} className="uppercase" />
              </div>
            </div>
            {/* Toggle: É comprador? */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="isBuyerToggle"
                checked={newDestIsBuyer}
                onChange={e => setNewDestIsBuyer(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              <label htmlFor="isBuyerToggle" className="text-sm font-medium text-blue-800 cursor-pointer">
                Este destino é um <strong>Cliente Comprador</strong> (compra lenha/madeira)
              </label>
            </div>
            {/* Campos extras para comprador */}
            {newDestIsBuyer && (
              <div className="space-y-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700">Dados do Comprador</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>CNPJ / CPF</Label>
                    <Input value={newDestCnpj} onChange={e => setNewDestCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <Label>Contato</Label>
                    <Input value={newDestContact} onChange={e => setNewDestContact(e.target.value)} placeholder="Nome do responsável" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={newDestPhone} onChange={e => setNewDestPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newDestEmail} onChange={e => setNewDestEmail(e.target.value)} placeholder="email@empresa.com" />
                  </div>
                </div>
              </div>
            )}
            {/* Tipo de preço */}
            <div>
              <Label>Tipo de Preço</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setNewDestPriceType('ton')}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${newDestPriceType === 'ton' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-background border-input text-foreground'}`}
                >
                  Por Tonelada (ton)
                </button>
                <button
                  type="button"
                  onClick={() => setNewDestPriceType('m3')}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${newDestPriceType === 'm3' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-background border-input text-foreground'}`}
                >
                  Por M³
                </button>
              </div>
            </div>
            {/* Valor */}
            <div>
              <Label>{newDestPriceType === 'ton' ? 'Valor por Tonelada (R$)' : 'Valor por M³ (R$)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={newDestPriceType === 'ton' ? newDestPricePerTon : newDestPricePerM3}
                onChange={e => newDestPriceType === 'ton' ? setNewDestPricePerTon(e.target.value) : setNewDestPricePerM3(e.target.value)}
                placeholder={newDestPriceType === 'ton' ? 'ex: 130.00' : 'ex: 45.00'}
              />
              <p className="text-xs text-muted-foreground mt-1">Ao selecionar este destino na carga, o valor será preenchido automaticamente.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsDestinationOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!newDestName || createDestination.isPending}
                onClick={() => createDestination.mutate({
                  name: newDestName,
                  city: newDestCity || undefined,
                  state: newDestState || undefined,
                  isBuyer: newDestIsBuyer ? 1 : 0,
                  cnpjCpf: newDestCnpj || undefined,
                  contactPerson: newDestContact || undefined,
                  phone: newDestPhone || undefined,
                  email: newDestEmail || undefined,
                  pricePerTon: newDestPriceType === 'ton' && newDestPricePerTon ? newDestPricePerTon : undefined,
                  pricePerM3: newDestPriceType === 'm3' && newDestPricePerM3 ? newDestPricePerM3 : undefined,
                  priceType: newDestPriceType,
                  pricePerUnit: newDestIsBuyer ? (newDestPriceType === 'ton' ? newDestPricePerTon || undefined : newDestPricePerM3 || undefined) : undefined,
                  unit: newDestIsBuyer ? newDestPriceType : undefined,
                })}
              >
                {createDestination.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: EDITAR DATA DE PAGAMENTO ===== */}
      <Dialog open={!!editPaymentDateId} onOpenChange={v => { if (!v) { setEditPaymentDateId(null); setEditPaymentDateValue(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Corrigir Data de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Informe a data correta em que o pagamento foi recebido:</p>
            <div className="space-y-1.5">
              <Label htmlFor="edit-payment-date">Data de Pagamento</Label>
              <Input
                id="edit-payment-date"
                type="date"
                value={editPaymentDateValue}
                onChange={e => setEditPaymentDateValue(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setEditPaymentDateId(null); setEditPaymentDateValue(''); }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!editPaymentDateValue || updatePaymentDateMutation.isPending}
                onClick={() => {
                  if (editPaymentDateId && editPaymentDateValue) {
                    updatePaymentDateMutation.mutate({ id: editPaymentDateId, paidAt: editPaymentDateValue });
                  }
                }}
              >
                {updatePaymentDateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

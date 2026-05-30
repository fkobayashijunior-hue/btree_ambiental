import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileBarChart, Download, CheckCircle2, Clock, Package, Weight, Image as ImageIcon, X, DollarSign, FileText, FileImage, Loader2, CreditCard, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBR, formatBRL } from "@/lib/formatBR";
import { BTREE_LOGO_B64, fetchImageAsBase64, generatePDFFromHtml } from "@/lib/pdfUtils";

// ─── Constants ───────────────────────────────────────────────────────────────
const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

// ─── PDF Styles ───────────────────────────────────────────────────────────────
const PDF_DEST_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; background: #fff; }
  .page { display: block; }
  .pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
  .pdf-header img { height: 52px; filter: brightness(0) invert(1); }
  .pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
  .pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .pdf-subheader { background: #f0fdf4; padding: 10px 32px; border-bottom: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; }
  .pdf-content { padding: 20px 32px; flex: 1; }
  .pdf-footer { padding: 12px 32px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; margin-top: 32px; }
  .pdf-footer-left { display: flex; align-items: center; gap: 10px; }
  .pdf-footer-left img { height: 28px; }
  .pdf-footer-text { font-size: 10px; color: #555; }
  .pdf-footer-text strong { color: #0d4f2e; }
  .pdf-footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
  .pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .pdf-footer-right img { width: 60px; height: 60px; }
  .pdf-footer-right span { font-size: 9px; color: #555; }
  .stats { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
  .stat { background: #f0fdf4; padding: 8px 16px; border-radius: 8px; font-size: 11px; border: 1px solid #bbf7d0; }
  .stat strong { color: #0d4f2e; font-size: 15px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #0d4f2e; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 7px 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) { background: #f9fafb; }
  tfoot td { background: #f0fdf4; font-weight: bold; padding: 8px 6px; font-size: 11px; color: #0d4f2e; border-top: 2px solid #0d4f2e; }
  .badge-finalizado { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
  .badge-transito { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
  .financial { margin-top: 20px; padding: 16px 20px; background: #f0fdf4; border: 2px solid #0d4f2e; border-radius: 8px; }
  .financial h3 { color: #0d4f2e; font-size: 14px; margin-bottom: 10px; }
  .financial table { margin-top: 0; }
  .financial td { border: none; padding: 4px 0; font-size: 12px; }
  .financial .total-row td { border-top: 2px solid #0d4f2e; padding-top: 8px; font-size: 15px; font-weight: bold; color: #0d4f2e; }
  .card { page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fff; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .card-title { font-size: 15px; font-weight: bold; color: #0d4f2e; }
  .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; }
  .card-label { color: #6b7280; }
  .card-value { font-weight: 500; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .photos img { width: 160px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

// ─── Helper functions ─────────────────────────────────────────────────────────
function safeDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  if (s.length === 10 && s[4] === '-') return new Date(s + 'T12:00:00');
  if (s.includes('T') && s.endsWith('Z') && s.includes('T00:00:00')) {
    return new Date(s.replace('T00:00:00.000Z', 'T12:00:00'));
  }
  return new Date(s);
}

function getTrackingLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    aguardando: 'Aguardando',
    carregando: 'Carregando',
    em_transito: 'Em Trânsito',
    pesagem_saida: 'Pesagem Saída',
    descarregando: 'Descarregando',
    pesagem_chegada: 'Pesagem Chegada',
    finalizado: 'Finalizado',
  };
  return map[status || ''] || status || '-';
}

function getPaymentLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    sem_boleto: 'Sem Boleto',
    a_pagar: 'A Pagar',
    pago: 'Pago',
  };
  return map[status || ''] || 'Sem Boleto';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DestinationReportPage() {
  const [selectedDestId, setSelectedDestId] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receivedFilter, setReceivedFilter] = useState<"all" | "received" | "pending">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "sem_boleto" | "a_pagar" | "pago">("all");
  const [photoModal, setPhotoModal] = useState<string[] | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<'resumido' | 'completo' | null>(null);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: new Date().toISOString().slice(0,10), paymentMethod: 'pix', invoiceNumber: '', notes: '' });

  // Fetch destinations and buyers
  const { data: destinations = [] } = trpc.cargoLoads.listDestinations.useQuery();
  const { data: buyersList = [] } = trpc.buyerClients.listActive.useQuery();

  // Combined list for the select
  const allDestinations = useMemo(() => {
    const dests = destinations.map((d: any) => ({ id: d.id, name: d.name, city: d.city, state: d.state, type: 'destination' as const }));
    const buyers = (buyersList as any[]).map(b => ({ id: 10000 + b.id, name: b.name, city: b.city, state: b.state, type: 'buyer' as const }));
    return [...dests, ...buyers];
  }, [destinations, buyersList]);

  // Fetch loads filtered by destination
  const { data: responseData, refetch } = trpc.cargoLoads.listByDestination.useQuery(
    {
      destinationId: selectedDestId > 0 ? selectedDestId : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      receivedFilter,
      statusFilter: 'all',
      paymentStatusFilter: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    },
    { enabled: selectedDestId > 0 }
  );

  // Handle both old format (array) and new format ({ loads, buyerInfo })
  const loads: any[] = Array.isArray(responseData) ? responseData : (responseData?.loads ?? []);
  const buyerInfo = Array.isArray(responseData) ? null : (responseData?.buyerInfo ?? null);

  const markReceivedMut = trpc.cargoLoads.markReceivedByBuyer.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
    onError: (err) => toast.error(err.message),
  });

  // Payment registration for buyers
  const addPaymentMut = trpc.buyerClients.addPayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!');
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().slice(0,10), paymentMethod: 'pix', invoiceNumber: '', notes: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleRegisterPayment() {
    if (!paymentForm.amount || !paymentForm.paymentDate) {
      toast.error('Preencha o valor e a data do pagamento');
      return;
    }
    const buyerId = selectedDestId - 10000;
    addPaymentMut.mutate({
      buyerId,
      amount: paymentForm.amount,
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod || undefined,
      invoiceNumber: paymentForm.invoiceNumber || undefined,
      notes: paymentForm.notes || undefined,
      status: 'pago',
    });
  }

  // Stats
  const totalLoads = loads.length;
  const totalReceived = loads.filter((l: any) => l.receivedByBuyer === 1).length;
  const totalPending = totalLoads - totalReceived;
  const totalWeight = loads.reduce((sum: number, l: any) => sum + (parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.')) || 0), 0);
  const totalVolume = loads.reduce((sum: number, l: any) => sum + (parseFloat(String(l.volumeM3 || 0).replace(',', '.')) || 0), 0);

  // Financial calculations (buyer receivables)
  const pricePerUnit = buyerInfo?.pricePerUnit ? parseFloat(String(buyerInfo.pricePerUnit).replace(',', '.')) : 0;
  const unit = buyerInfo?.unit || 'ton';
  const isBuyer = selectedDestId >= 10000;

  // Calculate total value based on unit (ton or m³)
  const totalQuantity = unit === 'ton' ? totalWeight / 1000 : totalVolume;
  const totalValue = pricePerUnit * totalQuantity;

  // Get selected destination info
  const selectedDest = allDestinations.find(d => d.id === selectedDestId);

  // ─── PDF Footer HTML (with base64 logos via proxy) ─────────────────────────
  function buildFooterHtml(kobayashiB64: string, qrB64: string): string {
    return `
<div class="pdf-footer">
  <div class="pdf-footer-left">
    ${kobayashiB64 ? `<img src="${kobayashiB64}" alt="Kobayashi" />` : ''}
    <div class="pdf-footer-text">
      Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
      <a href="https://btreeambiental.com">btreeambiental.com</a>
    </div>
  </div>
  <div class="pdf-footer-right">
    ${qrB64 ? `<img src="${qrB64}" alt="QR Code" />` : ''}
    <span>Acesse nosso site</span>
  </div>
</div>`;
  }

  // ─── PDF RESUMIDO (sem imagens) ─────────────────────────────────────────────
  async function generatePDFResumido() {
    if (loads.length === 0) { toast.error("Nenhuma carga para gerar relatório"); return; }
    setIsGeneratingPDF('resumido');
    setPdfProgress('Carregando logos...');
    try {
      // Pre-load logos as base64 via proxy
      const [kobayashiB64, qrB64] = await Promise.all([
        fetchImageAsBase64(KOBAYASHI_LOGO),
        fetchImageAsBase64(BTREE_QR),
      ]);

      setPdfProgress('Gerando tabela...');
      const destName = selectedDest?.name || "Todos";
      const periodStr = startDate && endDate
        ? `${safeDate(startDate).toLocaleDateString('pt-BR')} a ${safeDate(endDate).toLocaleDateString('pt-BR')}`
        : "Todo período";

      // loads already come ordered ASC from backend (oldest first = #1)
      const rows = loads.map((l: any, i: number) => {
        const loadDate = safeDate(l.date).toLocaleDateString('pt-BR');
        const delivDate = l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : '-';
        const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
        const weightTon = weight / 1000;
        const vol = parseFloat(String(l.volumeM3 || 0).replace(',', '.'));
        const lineValue = pricePerUnit > 0 ? (unit === 'ton' ? pricePerUnit * weightTon : pricePerUnit * vol) : 0;
        const obs = l.notes ? `<tr><td colspan="12" style="padding:3px 4px 6px;font-size:10px;color:#6b7280;font-style:italic;">Obs: ${l.notes}</td></tr>` : '';
        const receiverRow = l.receiverName ? `<tr><td colspan="12" style="padding:2px 4px 5px;font-size:10px;color:#166534;">✍ Recebido por: <strong>${l.receiverName}</strong></td></tr>` : '';

        return `<tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:6px 4px;text-align:center;font-size:11px;">${i + 1}</td>
          <td style="padding:6px 4px;font-size:11px;">${loadDate}</td>
          <td style="padding:6px 4px;font-size:11px;">${delivDate}</td>
          <td style="padding:6px 4px;font-size:11px;">${l.invoiceNumber || '-'}</td>
          <td style="padding:6px 4px;font-size:11px;font-family:monospace;">${l.vehiclePlate || '-'}</td>
          <td style="padding:6px 4px;font-size:11px;">${l.driverName || '-'}</td>
          <td style="padding:6px 4px;font-size:11px;">${l.woodType || '-'}</td>
          <td style="padding:6px 4px;text-align:right;font-size:11px;">${formatBR(vol, 3)}</td>
          <td style="padding:6px 4px;text-align:right;font-size:11px;">${weight > 0 ? formatBR(weightTon) + ' ton' : '-'}</td>
          <td style="padding:6px 4px;text-align:center;font-size:11px;">${l.weightOutKg ? formatBR(parseFloat(String(l.weightOutKg).replace(',', '.'))) : '-'}</td>
          <td style="padding:6px 4px;text-align:center;font-size:11px;">${l.weightInKg ? formatBR(parseFloat(String(l.weightInKg).replace(',', '.'))) : '-'}</td>
          <td style="padding:6px 4px;text-align:center;font-size:10px;">
            <span style="padding:2px 6px;border-radius:4px;background:${l.trackingStatus === 'finalizado' ? '#dcfce7' : '#fef3c7'};color:${l.trackingStatus === 'finalizado' ? '#166534' : '#92400e'};">
              ${getTrackingLabel(l.trackingStatus)}
            </span>
          </td>
          ${pricePerUnit > 0 ? `<td style="padding:6px 4px;text-align:right;font-size:11px;font-weight:600;">R$ ${formatBR(lineValue)}</td>` : ''}
        </tr>${obs}${receiverRow}`;
      }).join('');

      const financialSection = pricePerUnit > 0 ? `
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
        <h3 style="margin:0 0 8px;color:#166534;font-size:14px;">💰 Resumo Financeiro</h3>
        <table style="width:100%;font-size:12px;">
          <tr><td style="padding:4px 0;">Preço por ${unit}:</td><td style="text-align:right;font-weight:bold;">R$ ${formatBR(pricePerUnit)}</td></tr>
          <tr><td style="padding:4px 0;">Quantidade total (${unit}):</td><td style="text-align:right;font-weight:bold;">${formatBR(totalQuantity, 3)}</td></tr>
          <tr style="border-top:2px solid #166534;"><td style="padding:8px 0;font-size:14px;font-weight:bold;color:#166534;">VALOR TOTAL A RECEBER:</td><td style="text-align:right;font-size:16px;font-weight:bold;color:#166534;">R$ ${formatBR(totalValue)}</td></tr>
        </table>
      </div>` : '';

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório - ${destName}</title>
      <style>${PDF_DEST_STYLES}</style></head><body>
      <div class="page">
      <div class="pdf-header">
        <img src="${BTREE_LOGO_B64}" alt="BTREE Ambiental" />
        <div class="pdf-header-text">
          <h1>Relatório de Entregas</h1>
          <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
      <div class="pdf-subheader">
        <span style="font-size:15px;font-weight:700;color:#0d4f2e;">📍 Destino: ${destName}</span>
        <span style="font-size:12px;color:#6b7280;">Período: ${periodStr}</span>
      </div>
      <div class="pdf-content">
      <div class="stats">
        <div class="stat"><strong>${totalLoads}</strong> cargas</div>
        <div class="stat"><strong>${formatBR(totalWeight / 1000)} ton</strong> peso total</div>
        <div class="stat"><strong>${formatBR(totalVolume, 3)} m³</strong> volume total</div>
        <div class="stat"><strong>${totalReceived}</strong> recebidas | <strong>${totalPending}</strong> pendentes</div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>DATA</th><th>DT.ENTREGA</th><th>NF</th><th>PLACA</th><th>MOTORISTA</th><th>MADEIRA</th><th>VOLUME</th><th>PESO LÍQ.</th><th>P.SAÍDA</th><th>P.CHEG.</th><th>SITUAÇÃO</th>${pricePerUnit > 0 ? '<th style="text-align:right;">VALOR</th>' : ''}
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="7">TOTAIS (${totalLoads} cargas)</td>
            <td style="text-align:right;">${formatBR(totalVolume, 3)} m³</td>
            <td style="text-align:right;">${formatBR(totalWeight / 1000)} ton</td>
            <td colspan="3"></td>
            ${pricePerUnit > 0 ? `<td style="text-align:right;">R$ ${formatBR(totalValue)}</td>` : ''}
          </tr>
        </tfoot>
      </table>
      ${financialSection}
      </div>
      ${buildFooterHtml(kobayashiB64, qrB64)}
      </div>
      </body></html>`;

      const filename = `relatorio-${(selectedDest?.name || 'destino').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`;
      await generatePDFFromHtml(html, filename, setPdfProgress);
      toast.success('PDF gerado e salvo! Compartilhe o arquivo pelo WhatsApp.');
    } catch (err) {
      toast.error('Erro ao gerar PDF. Tente novamente.');
      console.error(err);
    } finally {
      setIsGeneratingPDF(null);
      setPdfProgress('');
    }
  }

  // ─── PDF COMPLETO (com imagens) ─────────────────────────────────────────────
  async function generatePDFCompleto() {
    if (loads.length === 0) { toast.error("Nenhuma carga para gerar relatório"); return; }
    setIsGeneratingPDF('completo');
    setPdfProgress('Carregando logos...');
    try {
      // Pre-load logos as base64 via proxy
      const [kobayashiB64, qrB64] = await Promise.all([
        fetchImageAsBase64(KOBAYASHI_LOGO),
        fetchImageAsBase64(BTREE_QR),
      ]);

      // Pre-load all cargo photos as base64 via proxy
      setPdfProgress('Carregando fotos das cargas...');
      const allPhotoUrls: string[] = [];
      for (const l of loads) {
        if (l.photosJson) {
          try {
            const photos: string[] = JSON.parse(l.photosJson);
            allPhotoUrls.push(...photos);
          } catch {}
        }
      }

      // Fetch all photos in parallel (max 10 at a time to avoid overload)
      const photoBase64Map: Record<string, string> = {};
      const batchSize = 10;
      for (let i = 0; i < allPhotoUrls.length; i += batchSize) {
        const batch = allPhotoUrls.slice(i, i + batchSize);
        setPdfProgress(`Carregando fotos ${i + 1}–${Math.min(i + batchSize, allPhotoUrls.length)} de ${allPhotoUrls.length}...`);
        const results = await Promise.all(batch.map(url => fetchImageAsBase64(url)));
        batch.forEach((url, idx) => { photoBase64Map[url] = results[idx]; });
      }

      setPdfProgress('Gerando PDF completo...');
      const destName = selectedDest?.name || "Todos";
      const periodStr = startDate && endDate
        ? `${safeDate(startDate).toLocaleDateString('pt-BR')} a ${safeDate(endDate).toLocaleDateString('pt-BR')}`
        : "Todo período";

      // loads already come ordered ASC from backend (oldest first = #1)
      const cards = loads.map((l: any, i: number) => {
        const loadDate = safeDate(l.date).toLocaleDateString('pt-BR');
        const delivDate = l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : null;
        const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
        const weightTon = weight / 1000;
        const vol = parseFloat(String(l.volumeM3 || 0).replace(',', '.'));
        const photos: string[] = l.photosJson ? JSON.parse(l.photosJson) : [];
        const lineValue = pricePerUnit > 0 ? (unit === 'ton' ? pricePerUnit * weightTon : pricePerUnit * vol) : 0;

        // Use base64 versions of photos (no CORS issues)
        const photoHtml = photos.length > 0
          ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
              ${photos.map((p: string) => {
                const b64 = photoBase64Map[p] || p;
                return `<img src="${b64}" style="width:180px;height:135px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />`;
              }).join('')}
             </div>`
          : '';

        const obsHtml = l.notes
          ? `<div style="margin-top:8px;padding:8px 10px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;font-size:11px;color:#78350f;"><strong>Obs:</strong> ${l.notes}</div>`
          : '';
        const receiverHtml = l.receiverName
          ? `<div style="margin-top:6px;padding:6px 10px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;font-size:11px;color:#166534;">✍ <strong>Recebido por:</strong> ${l.receiverName}</div>`
          : '';

        return `<div style="page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;background:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div>
              <span style="font-size:16px;font-weight:bold;color:#1a5c3a;">#${i + 1}</span>
              <span style="font-size:14px;font-weight:bold;margin-left:8px;">${l.vehiclePlate || '-'}</span>
              <span style="margin-left:12px;padding:3px 8px;border-radius:4px;font-size:10px;background:${l.trackingStatus === 'finalizado' ? '#dcfce7' : '#fef3c7'};color:${l.trackingStatus === 'finalizado' ? '#166534' : '#92400e'};">
                ${getTrackingLabel(l.trackingStatus)}
              </span>
            </div>
            <div style="text-align:right;font-size:11px;color:#666;">
              <div>Saída: ${loadDate}</div>
              ${delivDate ? `<div style="color:#166534;font-weight:600;">Entrega: ${delivDate}</div>` : ''}
            </div>
          </div>
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 0;color:#666;width:120px;">Motorista:</td><td style="font-weight:500;">${l.driverName || '-'}</td>
              <td style="padding:3px 0;color:#666;width:100px;">Nota Fiscal:</td><td style="font-weight:500;">${l.invoiceNumber || '-'}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#666;">Madeira:</td><td style="font-weight:500;">${l.woodType || '-'}</td>
              <td style="padding:3px 0;color:#666;">Volume:</td><td style="font-weight:500;">${formatBR(vol, 3)} m³</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#666;">Peso Líquido:</td><td style="font-weight:500;">${weight > 0 ? formatBR(weightTon) + ' ton' : '-'}</td>
              <td style="padding:3px 0;color:#666;">Medidas:</td><td style="font-weight:500;">${l.heightM || '-'} × ${l.widthM || '-'} × ${l.lengthM || '-'} m</td>
            </tr>
            <tr>
              <td style="padding:3px 0;color:#666;">P. Saída:</td><td style="font-weight:500;">${l.weightOutKg ? formatBR(parseFloat(String(l.weightOutKg).replace(',', '.'))) + ' kg' : '-'}</td>
              <td style="padding:3px 0;color:#666;">P. Chegada:</td><td style="font-weight:500;">${l.weightInKg ? formatBR(parseFloat(String(l.weightInKg).replace(',', '.'))) + ' kg' : '-'}</td>
            </tr>
            ${pricePerUnit > 0 ? `<tr>
              <td style="padding:3px 0;color:#666;">Valor:</td><td style="font-weight:bold;color:#166534;">R$ ${formatBR(lineValue)}</td>
              <td></td><td></td>
            </tr>` : ''}
          </table>
          ${obsHtml}
          ${receiverHtml}
          ${photoHtml}
        </div>`;
      }).join('');

      const financialSection = pricePerUnit > 0 ? `
      <div style="page-break-inside:avoid;margin-top:20px;padding:16px;background:#f0fdf4;border:2px solid #166534;border-radius:8px;">
        <h3 style="margin:0 0 12px;color:#166534;font-size:16px;">💰 Resumo Financeiro</h3>
        <table style="width:100%;font-size:13px;">
          <tr><td style="padding:4px 0;">Preço por ${unit}:</td><td style="text-align:right;font-weight:bold;">R$ ${formatBR(pricePerUnit)}</td></tr>
          <tr><td style="padding:4px 0;">Quantidade total (${unit}):</td><td style="text-align:right;font-weight:bold;">${formatBR(totalQuantity, 3)}</td></tr>
          <tr style="border-top:2px solid #166534;"><td style="padding:8px 0;font-size:16px;font-weight:bold;color:#166534;">VALOR TOTAL A RECEBER:</td><td style="text-align:right;font-size:20px;font-weight:bold;color:#166534;">R$ ${formatBR(totalValue)}</td></tr>
        </table>
      </div>` : '';

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Completo - ${destName}</title>
      <style>${PDF_DEST_STYLES}</style></head><body>
      <div class="page">
      <div class="pdf-header">
        <img src="${BTREE_LOGO_B64}" alt="BTREE Ambiental" />
        <div class="pdf-header-text">
          <h1>Relatório Completo de Entregas</h1>
          <p>BTREE Empreendimentos LTDA &middot; btreeambiental.com &middot; Emitido em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
      <div class="pdf-subheader">
        <span style="font-size:15px;font-weight:700;color:#0d4f2e;">📍 Destino: ${destName}</span>
        <span style="font-size:12px;color:#6b7280;">Período: ${periodStr}</span>
      </div>
      <div class="pdf-content">
      <div class="stats">
        <div class="stat"><strong>${totalLoads}</strong> cargas</div>
        <div class="stat"><strong>${formatBR(totalWeight / 1000)} ton</strong> peso total</div>
        <div class="stat"><strong>${formatBR(totalVolume, 3)} m³</strong> volume total</div>
        <div class="stat"><strong>${totalReceived}</strong> recebidas | <strong>${totalPending}</strong> pendentes</div>
      </div>
      <div style="margin-top:16px;">${cards}</div>
      ${financialSection}
      </div>
      ${buildFooterHtml(kobayashiB64, qrB64)}
      </div>
      </body></html>`;

      const filename = `relatorio-completo-${(selectedDest?.name || 'destino').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`;
      await generatePDFFromHtml(html, filename, setPdfProgress);
      toast.success('PDF completo gerado! Compartilhe o arquivo pelo WhatsApp.');
    } catch (err) {
      toast.error('Erro ao gerar PDF completo. Tente novamente.');
      console.error(err);
    } finally {
      setIsGeneratingPDF(null);
      setPdfProgress('');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-green-700" />
          <h1 className="text-xl font-bold text-green-800">Relatório por Destino</h1>
        </div>
        {loads.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {isBuyer && (
              <Button onClick={() => setShowPaymentModal(true)} className="gap-2 text-xs bg-green-700 hover:bg-green-800 text-white">
                <CreditCard className="h-4 w-4" />
                Registrar Pagamento
              </Button>
            )}
            <Button onClick={generatePDFResumido} variant="outline" className="gap-2 text-xs" disabled={isGeneratingPDF !== null}>
              {isGeneratingPDF === 'resumido' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isGeneratingPDF === 'resumido' ? (pdfProgress || 'Gerando...') : 'PDF Resumido'}
            </Button>
            <Button onClick={generatePDFCompleto} variant="outline" className="gap-2 text-xs" disabled={isGeneratingPDF !== null}>
              {isGeneratingPDF === 'completo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
              {isGeneratingPDF === 'completo' ? (pdfProgress || 'Gerando...') : 'PDF Completo'}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Destino / Comprador</label>
              <select
                value={selectedDestId}
                onChange={e => setSelectedDestId(parseInt(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={0}>Selecionar...</option>
                {destinations.length > 0 && (
                  <optgroup label="Destinos">
                    {(destinations as any[]).map(d => (
                      <option key={`dest-${d.id}`} value={d.id}>{d.name}{d.city ? ` — ${d.city}/${d.state}` : ''}</option>
                    ))}
                  </optgroup>
                )}
                {buyersList.length > 0 && (
                  <optgroup label="💰 Compradores">
                    {(buyersList as any[]).map(b => (
                      <option key={`buyer-${b.id}`} value={10000 + b.id}>{b.name}{b.city ? ` — ${b.city}/${b.state}` : ''}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recebimento</label>
              <select
                value={receivedFilter}
                onChange={e => setReceivedFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">Todos</option>
                <option value="received">Recebidos pelo comprador</option>
                <option value="pending">Pendente recebimento</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status de Pagamento</label>
              <select
                value={paymentStatusFilter}
                onChange={e => setPaymentStatusFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">Todos</option>
                <option value="a_pagar">A Pagar (pendente)</option>
                <option value="pago">Pago</option>
                <option value="sem_boleto">Sem Boleto</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedDestId > 0 && loads.length > 0 && (
        <div className={`grid grid-cols-2 ${isBuyer && pricePerUnit > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto text-green-700 mb-1" />
              <div className="text-lg font-bold text-green-800">{totalLoads}</div>
              <div className="text-xs text-green-600">Cargas</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 text-center">
              <Weight className="h-5 w-5 mx-auto text-blue-700 mb-1" />
              <div className="text-lg font-bold text-blue-800">{formatBR(totalWeight / 1000)} ton</div>
              <div className="text-xs text-blue-600">Peso Total</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-700 mb-1" />
              <div className="text-lg font-bold text-emerald-800">{totalReceived}</div>
              <div className="text-xs text-emerald-600">Recebidos</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto text-amber-700 mb-1" />
              <div className="text-lg font-bold text-amber-800">{totalPending}</div>
              <div className="text-xs text-amber-600">Pend. Recebimento</div>
            </CardContent>
          </Card>
          {isBuyer && pricePerUnit > 0 && (
            <Card className="border-green-300 bg-green-100 col-span-2 sm:col-span-1">
              <CardContent className="p-3 text-center">
                <DollarSign className="h-5 w-5 mx-auto text-green-800 mb-1" />
                <div className="text-lg font-bold text-green-900">R$ {formatBR(totalValue)}</div>
                <div className="text-xs text-green-700">Valor a Receber</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Buyer financial info */}
      {isBuyer && buyerInfo && pricePerUnit > 0 && loads.length > 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-700" />
              <h3 className="font-semibold text-green-800">Resumo Financeiro — {buyerInfo.name}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-600 text-xs">Preço por {unit}</span>
                <div className="font-bold text-green-900">R$ {formatBR(pricePerUnit)}</div>
              </div>
              <div>
                <span className="text-green-600 text-xs">Qtd. Total ({unit})</span>
                <div className="font-bold text-green-900">{formatBR(totalQuantity, 3)}</div>
              </div>
              <div>
                <span className="text-green-600 text-xs">Total Cargas</span>
                <div className="font-bold text-green-900">{totalLoads}</div>
              </div>
              <div>
                <span className="text-green-600 text-xs">Valor Total a Receber</span>
                <div className="font-bold text-green-900 text-lg">R$ {formatBR(totalValue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {selectedDestId > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {selectedDest?.name || "Cargas"}
              {selectedDest?.city && <span className="text-sm font-normal text-muted-foreground">— {selectedDest.city}/{selectedDest.state}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma carga entregue encontrada para este destino no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-800 text-white text-xs">
                      <th className="p-2 text-center w-10">✓</th>
                      <th className="p-2">#</th>
                      <th className="p-2">DATA</th>
                      <th className="p-2">ENTREGA</th>
                      <th className="p-2">NF</th>
                      <th className="p-2">PLACA</th>
                      <th className="p-2">MOTORISTA</th>
                      <th className="p-2">MADEIRA</th>
                      <th className="p-2 text-right">VOLUME</th>
                      <th className="p-2 text-right">PESO</th>
                      <th className="p-2 text-center">FOTOS</th>
                      <th className="p-2 text-center">SITUAÇÃO</th>
                      {isBuyer && pricePerUnit > 0 && <th className="p-2 text-right">VALOR</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loads.map((l: any, idx: number) => {
                      const photos: string[] = l.photosJson ? JSON.parse(l.photosJson) : [];
                      const date = l.deliveryDate
                        ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR')
                        : safeDate(l.date).toLocaleDateString('pt-BR');
                      const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
                      const weightTon = weight / 1000;
                      const vol = parseFloat(String(l.volumeM3 || 0).replace(',', '.'));
                      const lineValue = pricePerUnit > 0 ? (unit === 'ton' ? pricePerUnit * weightTon : pricePerUnit * vol) : 0;

                      return (
                        <tr key={l.id} className={`border-b hover:bg-gray-50 ${l.receivedByBuyer ? 'bg-green-50/50' : ''}`}>
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={l.receivedByBuyer === 1}
                              onCheckedChange={(checked) => {
                                markReceivedMut.mutate({ id: l.id, received: !!checked });
                              }}
                            />
                          </td>
                          <td className="p-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 whitespace-nowrap">{date}</td>
                          <td className="p-2 whitespace-nowrap text-xs text-green-700">{l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="p-2 font-mono">{l.invoiceNumber || '-'}</td>
                          <td className="p-2 font-mono">{l.vehiclePlate || '-'}</td>
                          <td className="p-2">{l.driverName || '-'}</td>
                          <td className="p-2">{l.woodType || '-'}</td>
                          <td className="p-2 text-right">{formatBR(vol, 3)} m³</td>
                          <td className="p-2 text-right">{weight > 0 ? `${formatBR(weightTon)} ton` : '-'}</td>
                          <td className="p-2 text-center">
                            {photos.length > 0 ? (
                              <button
                                onClick={() => setPhotoModal(photos)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <ImageIcon className="h-4 w-4" />
                                <span className="text-xs">{photos.length}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {l.trackingStatus === 'finalizado' ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Finalizado</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">{getTrackingLabel(l.trackingStatus)}</Badge>
                            )}
                            {l.receiverName && <div className="text-xs text-green-700 mt-0.5">✍ {l.receiverName}</div>}
                          </td>
                          {isBuyer && pricePerUnit > 0 && (
                            <td className="p-2 text-right font-semibold text-green-700">
                              R$ {formatBR(lineValue)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold text-xs">
                      <td className="p-2" colSpan={7}>TOTAIS ({totalLoads} cargas)</td>
                      <td className="p-2 text-right">{formatBR(totalVolume, 3)} m³</td>
                      <td className="p-2 text-right">{formatBR(totalWeight / 1000)} ton</td>
                      <td className="p-2" colSpan={2}></td>
                      {isBuyer && pricePerUnit > 0 && (
                        <td className="p-2 text-right text-green-700 font-bold">R$ {formatBR(totalValue)}</td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedDestId === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Selecione um destino ou comprador acima para visualizar o relatório de entregas.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Registration Modal */}
      {showPaymentModal && isBuyer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-700" />
                <h3 className="font-semibold text-lg">Registrar Pagamento</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Comprador: <strong className="text-green-800">{selectedDest?.name}</strong>
              {pricePerUnit > 0 && (
                <div className="mt-1">Valor sugerido: <strong className="text-green-700">R$ {formatBR(totalValue)}</strong> ({formatBR(totalQuantity, 3)} {unit} × R$ {formatBR(pricePerUnit)}/{unit})</div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Valor Recebido (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={pricePerUnit > 0 ? formatBR(totalValue) : '0,00'}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data do Pagamento *</label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Método de Pagamento</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="boleto">Boleto</option>
                  <option value="cheque">Cheque</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nº da Nota Fiscal / Referência</label>
                <Input
                  placeholder="Ex: NF-001234"
                  value={paymentForm.invoiceNumber}
                  onChange={e => setPaymentForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Observações</label>
                <Input
                  placeholder="Observações sobre o pagamento..."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                onClick={handleRegisterPayment}
                disabled={addPaymentMut.isPending}
              >
                {addPaymentMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {addPaymentMut.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Comprovantes de Entrega</h3>
              <button onClick={() => setPhotoModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {photoModal.map((url, i) => (
                <img key={i} src={url} alt={`Comprovante ${i + 1}`} className="w-full rounded-lg border" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileBarChart, Download, CheckCircle2, Clock, Package, Weight, Image as ImageIcon, X, DollarSign, FileText, FileImage } from "lucide-react";
import { toast } from "sonner";
import { formatBR, formatBRL } from "@/lib/formatBR";

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

export default function DestinationReportPage() {
  const [selectedDestId, setSelectedDestId] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receivedFilter, setReceivedFilter] = useState<"all" | "received" | "pending">("all");
  const [photoModal, setPhotoModal] = useState<string[] | null>(null);

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

  // ========= PDF RESUMIDO (sem imagens) =========
  function generatePDFResumido() {
    if (loads.length === 0) { toast.error("Nenhuma carga para gerar relatório"); return; }
    const destName = selectedDest?.name || "Todos";
    const periodStr = startDate && endDate
      ? `${safeDate(startDate).toLocaleDateString('pt-BR')} a ${safeDate(endDate).toLocaleDateString('pt-BR')}`
      : "Todo período";

    const rows = loads.map((l: any, i: number) => {
      const date = l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : safeDate(l.date).toLocaleDateString('pt-BR');
      const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
      const weightTon = weight / 1000;
      const vol = parseFloat(String(l.volumeM3 || 0).replace(',', '.'));
      const lineValue = pricePerUnit > 0 ? (unit === 'ton' ? pricePerUnit * weightTon : pricePerUnit * vol) : 0;

      return `<tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:6px 4px;text-align:center;font-size:11px;">${i + 1}</td>
        <td style="padding:6px 4px;font-size:11px;">${date}</td>
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
      </tr>`;
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

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório - ${destName}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #1a5c3a; color: white; padding: 8px 4px; text-align: left; font-size: 10px; text-transform: uppercase; }
      h1 { color: #1a5c3a; margin-bottom: 4px; font-size: 18px; }
      .stats { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
      .stat { background: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-size: 11px; }
      .stat strong { color: #1a5c3a; }
      tfoot td { background: #f3f4f6; font-weight: bold; padding: 8px 4px; font-size: 11px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
    <h1>📋 Relatório de Entregas — ${destName}</h1>
    <p style="color:#666;font-size:11px;">Período: ${periodStr} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
    <div class="stats">
      <div class="stat"><strong>${totalLoads}</strong> cargas</div>
      <div class="stat"><strong>${formatBR(totalWeight / 1000)} ton</strong> peso total</div>
      <div class="stat"><strong>${formatBR(totalVolume, 3)} m³</strong> volume total</div>
      <div class="stat"><strong>${totalReceived}</strong> recebidas | <strong>${totalPending}</strong> pendentes</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>DATA</th><th>NF</th><th>PLACA</th><th>MOTORISTA</th><th>MADEIRA</th><th>VOLUME</th><th>PESO LÍQ.</th><th>P.SAÍDA</th><th>P.CHEG.</th><th>SITUAÇÃO</th>${pricePerUnit > 0 ? '<th style="text-align:right;">VALOR</th>' : ''}
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align:left;">TOTAIS (${totalLoads} cargas)</td>
          <td style="text-align:right;">${formatBR(totalVolume, 3)} m³</td>
          <td style="text-align:right;">${formatBR(totalWeight / 1000)} ton</td>
          <td colspan="3"></td>
          ${pricePerUnit > 0 ? `<td style="text-align:right;font-size:12px;color:#166534;">R$ ${formatBR(totalValue)}</td>` : ''}
        </tr>
      </tfoot>
    </table>
    ${financialSection}
    <div style="margin-top:24px;text-align:center;color:#999;font-size:10px;">
      BTREE Ambiental — Sistema de Gestão | btreeambiental.com
    </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }

  // ========= PDF COMPLETO (com imagens) =========
  function generatePDFCompleto() {
    if (loads.length === 0) { toast.error("Nenhuma carga para gerar relatório"); return; }
    const destName = selectedDest?.name || "Todos";
    const periodStr = startDate && endDate
      ? `${safeDate(startDate).toLocaleDateString('pt-BR')} a ${safeDate(endDate).toLocaleDateString('pt-BR')}`
      : "Todo período";

    const cards = loads.map((l: any, i: number) => {
      const date = l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : safeDate(l.date).toLocaleDateString('pt-BR');
      const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
      const weightTon = weight / 1000;
      const vol = parseFloat(String(l.volumeM3 || 0).replace(',', '.'));
      const photos: string[] = l.photosJson ? JSON.parse(l.photosJson) : [];
      const lineValue = pricePerUnit > 0 ? (unit === 'ton' ? pricePerUnit * weightTon : pricePerUnit * vol) : 0;

      const photoHtml = photos.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
            ${photos.map((p: string) => `<img src="${p}" style="width:180px;height:135px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />`).join('')}
           </div>`
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
          <span style="font-size:12px;color:#666;">${date}</span>
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

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Completo - ${destName}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; background: #f9fafb; }
      h1 { color: #1a5c3a; margin-bottom: 4px; font-size: 20px; }
      .stats { display: flex; gap: 12px; margin: 12px 0; flex-wrap: wrap; }
      .stat { background: white; padding: 8px 16px; border-radius: 8px; font-size: 12px; border: 1px solid #e5e7eb; }
      .stat strong { color: #1a5c3a; }
      @media print { body { padding: 10px; background: white; } }
    </style></head><body>
    <h1>📦 Relatório Completo de Entregas — ${destName}</h1>
    <p style="color:#666;font-size:11px;">Período: ${periodStr} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
    <div class="stats">
      <div class="stat"><strong>${totalLoads}</strong> cargas</div>
      <div class="stat"><strong>${formatBR(totalWeight / 1000)} ton</strong> peso total</div>
      <div class="stat"><strong>${formatBR(totalVolume, 3)} m³</strong> volume total</div>
      <div class="stat"><strong>${totalReceived}</strong> recebidas | <strong>${totalPending}</strong> pendentes</div>
    </div>
    <div style="margin-top:16px;">${cards}</div>
    ${financialSection}
    <div style="margin-top:24px;text-align:center;color:#999;font-size:10px;">
      BTREE Ambiental — Sistema de Gestão | btreeambiental.com
    </div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-green-700" />
          <h1 className="text-xl font-bold text-green-800">Relatório por Destino</h1>
        </div>
        {loads.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={generatePDFResumido} variant="outline" className="gap-2 text-xs">
              <FileText className="h-4 w-4" /> PDF Resumido
            </Button>
            <Button onClick={generatePDFCompleto} variant="outline" className="gap-2 text-xs">
              <FileImage className="h-4 w-4" /> PDF Completo
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
                      <th className="p-2">DATA</th>
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
                    {loads.map((l: any) => {
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
                          <td className="p-2 whitespace-nowrap">{date}</td>
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
                      <td className="p-2" colSpan={6}>TOTAIS ({totalLoads} cargas)</td>
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

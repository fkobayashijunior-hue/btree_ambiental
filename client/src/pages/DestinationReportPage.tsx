import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileBarChart, Download, CheckCircle2, Clock, Package, Weight, Image as ImageIcon, X } from "lucide-react";
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
  const { data: loads = [], refetch } = trpc.cargoLoads.listByDestination.useQuery(
    {
      destinationId: selectedDestId > 0 ? selectedDestId : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      receivedFilter,
      statusFilter: 'all',
    },
    { enabled: selectedDestId > 0 }
  );

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

  // Get selected destination info
  const selectedDest = allDestinations.find(d => d.id === selectedDestId);

  // PDF Generation
  function generatePDF() {
    if (loads.length === 0) { toast.error("Nenhuma carga para gerar relatório"); return; }
    const destName = selectedDest?.name || "Todos";
    const periodStr = startDate && endDate
      ? `${safeDate(startDate).toLocaleDateString('pt-BR')} a ${safeDate(endDate).toLocaleDateString('pt-BR')}`
      : "Todo período";

    const rows = loads.map((l: any, i: number) => {
      const date = l.deliveryDate ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR') : safeDate(l.date).toLocaleDateString('pt-BR');
      const photos: string[] = l.photosJson ? JSON.parse(l.photosJson) : [];
      const photoHtml = photos.length > 0
        ? photos.map((p: string) => `<img src="${p}" style="width:120px;height:90px;object-fit:cover;border-radius:4px;margin:2px;" />`).join('')
        : '<span style="color:#999;">Sem fotos</span>';
      return `<tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px;text-align:center;">${i + 1}</td>
        <td style="padding:8px;">${date}</td>
        <td style="padding:8px;">${l.invoiceNumber || '-'}</td>
        <td style="padding:8px;">${l.vehiclePlate || '-'}</td>
        <td style="padding:8px;">${l.driverName || '-'}</td>
        <td style="padding:8px;">${l.woodType || '-'}</td>
        <td style="padding:8px;text-align:right;">${formatBR(l.volumeM3, 3)}</td>
        <td style="padding:8px;text-align:right;">${formatBR(parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.')) / 1000)} ton</td>
        <td style="padding:8px;text-align:center;">${l.receivedByBuyer ? '✅ Recebido' : '⏳ Pendente'}</td>
      </tr>
      <tr><td colspan="9" style="padding:4px 8px;">${photoHtml}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório - ${destName}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1a5c3a; color: white; padding: 10px 8px; text-align: left; font-size: 11px; }
      h1 { color: #1a5c3a; margin-bottom: 4px; }
      .stats { display: flex; gap: 20px; margin: 12px 0; }
      .stat { background: #f3f4f6; padding: 8px 16px; border-radius: 8px; }
      .stat strong { color: #1a5c3a; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>📦 Relatório de Entregas — ${destName}</h1>
    <p style="color:#666;">Período: ${periodStr} | Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
    <div class="stats">
      <div class="stat"><strong>${totalLoads}</strong> cargas</div>
      <div class="stat"><strong>${formatBR(totalWeight / 1000)} ton</strong> peso total</div>
      <div class="stat"><strong>${formatBR(totalVolume, 3)} m³</strong> volume total</div>
      <div class="stat"><strong>${totalReceived}</strong> recebidas | <strong>${totalPending}</strong> pendentes</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>DATA</th><th>NOTA FISCAL</th><th>PLACA</th><th>MOTORISTA</th><th>MADEIRA</th><th>VOLUME (m³)</th><th>PESO</th><th>STATUS</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
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
          <Button onClick={generatePDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={receivedFilter}
                onChange={e => setReceivedFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">Todos</option>
                <option value="received">✅ Recebidos</option>
                <option value="pending">⏳ Pendentes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedDestId > 0 && loads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div className="text-xs text-amber-600">Pendentes</div>
            </CardContent>
          </Card>
        </div>
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
                      <th className="p-2 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loads.map((l: any) => {
                      const photos: string[] = l.photosJson ? JSON.parse(l.photosJson) : [];
                      const date = l.deliveryDate
                        ? safeDate(l.deliveryDate).toLocaleDateString('pt-BR')
                        : safeDate(l.date).toLocaleDateString('pt-BR');
                      const weight = parseFloat(String(l.weightNetKg || l.weightKg || 0).replace(',', '.'));
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
                          <td className="p-2 text-right">{formatBR(l.volumeM3, 3)} m³</td>
                          <td className="p-2 text-right">{weight > 0 ? `${formatBR(weight / 1000)} ton` : '-'}</td>
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
                            {l.receivedByBuyer ? (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Recebido</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 text-xs">Pendente</Badge>
                            )}
                          </td>
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

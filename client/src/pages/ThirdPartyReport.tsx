// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Filter, Wrench, DollarSign, Package, Calendar, FileText, CheckCircle2, Clock, Loader2, CheckCheck, XCircle } from "lucide-react";
import { BTREE_LOGO_B64, loadPdfAssets, buildPdfFooterHtml, PDF_BASE_STYLES, generatePDFFromHtml } from "@/lib/pdfUtils";

function safeDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  if (s.length === 10 && s[4] === '-') return new Date(s + 'T12:00:00');
  return new Date(s);
}

function formatBRL(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return "R$ 0,00";
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return safeDate(dateStr).toLocaleDateString('pt-BR');
}

type CargoLoad = {
  id: number;
  date: string;
  deliveryDate: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  destination: string | null;
  clientName: string | null;
  invoiceNumber: string | null;
  volumeM3: string;
  weightNetKg: string | null;
  woodType: string | null;
  status: string;
  thirdPartyContractor: string | null;
  thirdPartyCost: string | null;
  thirdPartyPaid: number | null;
  thirdPartyPaidAt: string | null;
  thirdPartyPaymentNotes: string | null;
  notes: string | null;
};

type PaymentFilter = "todos" | "pendentes" | "pagos";

export default function ThirdPartyReport() {
  const utils = trpc.useUtils();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [contractorFilter, setContractorFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Payment dialog state
  const [payDialog, setPayDialog] = useState<{ open: boolean; loadId: number | null; bulk: boolean; bulkIds: number[]; contractorName: string }>({
    open: false, loadId: null, bulk: false, bulkIds: [], contractorName: ""
  });
  const [payDate, setPayDate] = useState(today.toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");

  const { data: loads = [], isLoading } = trpc.cargoLoads.listThirdParty.useQuery({
    startDate,
    endDate,
    contractor: contractorFilter || undefined,
  });

  const markPaidMutation = trpc.cargoLoads.markThirdPartyPaid.useMutation({
    onSuccess: () => {
      toast.success("Pagamento registrado!");
      utils.cargoLoads.listThirdParty.invalidate();
      closePayDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const markUnpaidMutation = trpc.cargoLoads.markThirdPartyUnpaid.useMutation({
    onSuccess: () => {
      toast.success("Pagamento desfeito.");
      utils.cargoLoads.listThirdParty.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaidBulkMutation = trpc.cargoLoads.markThirdPartyPaidBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} pagamento(s) registrado(s)!`);
      utils.cargoLoads.listThirdParty.invalidate();
      closePayDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  function openPaySingle(load: CargoLoad) {
    setPayDate(today.toISOString().slice(0, 10));
    setPayNotes("");
    setPayDialog({ open: true, loadId: load.id, bulk: false, bulkIds: [], contractorName: load.thirdPartyContractor || "" });
  }

  function openPayBulk(contractorName: string, unpaidIds: number[]) {
    setPayDate(today.toISOString().slice(0, 10));
    setPayNotes("");
    setPayDialog({ open: true, loadId: null, bulk: true, bulkIds: unpaidIds, contractorName });
  }

  function closePayDialog() {
    setPayDialog({ open: false, loadId: null, bulk: false, bulkIds: [], contractorName: "" });
    setPayDate(today.toISOString().slice(0, 10));
    setPayNotes("");
  }

  function handleConfirmPayment() {
    if (!payDate) { toast.error("Selecione a data de pagamento"); return; }
    if (payDialog.bulk) {
      markPaidBulkMutation.mutate({ ids: payDialog.bulkIds, paidAt: payDate, notes: payNotes || undefined });
    } else if (payDialog.loadId) {
      markPaidMutation.mutate({ id: payDialog.loadId, paidAt: payDate, notes: payNotes || undefined });
    }
  }

  // Filter loads by payment status
  const filteredLoads = useMemo(() => {
    if (paymentFilter === "pendentes") return loads.filter(l => !l.thirdPartyPaid);
    if (paymentFilter === "pagos") return loads.filter(l => l.thirdPartyPaid);
    return loads;
  }, [loads, paymentFilter]);

  // Group by contractor
  const groupedByContractor = useMemo(() => {
    const groups: Record<string, {
      loads: CargoLoad[];
      totalCost: number;
      totalVolume: number;
      paidCost: number;
      pendingCost: number;
      paidCount: number;
    }> = {};
    for (const load of filteredLoads) {
      const name = load.thirdPartyContractor || "Desconhecido";
      if (!groups[name]) {
        groups[name] = { loads: [], totalCost: 0, totalVolume: 0, paidCost: 0, pendingCost: 0, paidCount: 0 };
      }
      groups[name].loads.push(load as CargoLoad);
      const cost = parseFloat(String(load.thirdPartyCost || "0").replace(',', '.'));
      const vol = parseFloat(String(load.volumeM3 || "0").replace(',', '.'));
      if (!isNaN(cost)) {
        groups[name].totalCost += cost;
        if (load.thirdPartyPaid) { groups[name].paidCost += cost; groups[name].paidCount++; }
        else groups[name].pendingCost += cost;
      }
      if (!isNaN(vol)) groups[name].totalVolume += vol;
    }
    return groups;
  }, [filteredLoads]);

  // Grand totals (from ALL loads, not filtered)
  const grandTotals = useMemo(() => {
    let totalCost = 0, paidCost = 0, pendingCost = 0, totalVol = 0;
    for (const l of loads) {
      const cost = parseFloat(String(l.thirdPartyCost || "0").replace(',', '.'));
      const vol = parseFloat(String(l.volumeM3 || "0").replace(',', '.'));
      if (!isNaN(cost)) {
        totalCost += cost;
        if (l.thirdPartyPaid) paidCost += cost;
        else pendingCost += cost;
      }
      if (!isNaN(vol)) totalVol += vol;
    }
    return { totalCost, paidCost, pendingCost, totalVol, paidCount: loads.filter(l => l.thirdPartyPaid).length, pendingCount: loads.filter(l => !l.thirdPartyPaid).length };
  }, [loads]);

  const contractors = useMemo(() => {
    const set = new Set<string>();
    loads.forEach(l => { if (l.thirdPartyContractor) set.add(l.thirdPartyContractor); });
    return Array.from(set).sort();
  }, [loads]);

  const generatePDF = async () => {
    setGeneratingPdf(true);
    try {
      const [kobayashiB64, qrB64] = await loadPdfAssets();
      const footerHtml = buildPdfFooterHtml(kobayashiB64, qrB64);
      const periodStr = `${formatDate(startDate)} a ${formatDate(endDate)}`;

      const contractorRows = Object.entries(groupedByContractor).map(([name, data]) => {
        const rows = data.loads.map((l, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${formatDate(l.date)}</td>
            <td>${l.vehiclePlate || '-'}</td>
            <td>${l.destination || l.clientName || '-'}</td>
            <td>${l.invoiceNumber || '-'}</td>
            <td>${parseFloat(String(l.volumeM3 || '0').replace(',', '.')).toFixed(3)} m³</td>
            <td style="color:#0d4f2e;font-weight:bold">${formatBRL(l.thirdPartyCost)}</td>
            <td style="color:${l.thirdPartyPaid ? '#15803d' : '#b45309'};font-weight:bold">${l.thirdPartyPaid ? '✅ Pago' + (l.thirdPartyPaidAt ? ' ' + formatDate(l.thirdPartyPaidAt) : '') : '⏳ Pendente'}</td>
          </tr>
        `).join('');
        return `
          <div class="contractor-section">
            <div class="contractor-header">
              <span>🔧 ${name}</span>
              <span>${data.loads.length} carga(s) | ${data.totalVolume.toFixed(3)} m³ | Total: ${formatBRL(data.totalCost)} | Pago: ${formatBRL(data.paidCost)} | Pendente: ${formatBRL(data.pendingCost)}</span>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>Data</th><th>Placa</th><th>Destino</th><th>NF</th><th>Volume</th><th>Custo Corte</th><th>Pagamento</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }).join('');

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Corte Terceirizado - BTREE Ambiental</title>
<style>
${PDF_BASE_STYLES}
@page { size: A4; margin: 0; }
.page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; }
.pdf-header { background: linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%); color: white; padding: 18px 32px; display: flex; align-items: center; gap: 20px; }
.pdf-header img { height: 52px; }
.pdf-header-text h1 { font-size: 20px; font-weight: bold; margin: 0; }
.pdf-header-text p { font-size: 11px; opacity: 0.85; margin-top: 3px; }
.pdf-content { padding: 20px 32px; flex: 1; }
.summary-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 18px; display: flex; gap: 24px; flex-wrap: wrap; }
.summary-item { text-align: center; }
.summary-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
.summary-item .value { font-size: 18px; font-weight: bold; }
.summary-item .value.red { color: #c2410c; }
.summary-item .value.green { color: #15803d; }
.summary-item .value.orange { color: #b45309; }
.contractor-section { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
.contractor-header { background: #fff7ed; padding: 10px 16px; font-weight: bold; font-size: 11px; color: #c2410c; border-bottom: 1px solid #fed7aa; display: flex; justify-content: space-between; align-items: center; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
table th { background: #0d4f2e; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
table td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
table tr:nth-child(even) { background: #f9fafb; }
.pdf-footer { padding: 12px 32px; border-top: 2px solid #0d4f2e; display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.pdf-footer-left { display: flex; align-items: center; gap: 10px; }
.pdf-footer-left img { height: 28px; }
.pdf-footer-text { font-size: 10px; color: #555; }
.pdf-footer-text strong { color: #0d4f2e; }
.pdf-footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pdf-footer-right img { width: 60px; height: 60px; }
.pdf-footer-right span { font-size: 9px; color: #555; }
</style>
</head><body>
<div class="page">
  <div class="pdf-header">
    <img src="${BTREE_LOGO_B64}" alt="BTREE Ambiental" />
    <div class="pdf-header-text">
      <h1>Relatório de Corte Terceirizado</h1>
      <p>Período: ${periodStr} | ${contractorFilter ? 'Terceirizado: ' + contractorFilter : 'Todos os terceirizados'} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  </div>
  <div class="pdf-content">
    <div class="summary-box">
      <div class="summary-item"><div class="label">Total de Cargas</div><div class="value red">${loads.length}</div></div>
      <div class="summary-item"><div class="label">Volume Total</div><div class="value red">${grandTotals.totalVol.toFixed(3)} m³</div></div>
      <div class="summary-item"><div class="label">Custo Total</div><div class="value red">${formatBRL(grandTotals.totalCost)}</div></div>
      <div class="summary-item"><div class="label">Total Pago</div><div class="value green">${formatBRL(grandTotals.paidCost)}</div></div>
      <div class="summary-item"><div class="label">Total Pendente</div><div class="value orange">${formatBRL(grandTotals.pendingCost)}</div></div>
    </div>
    ${contractorRows}
  </div>
  ${footerHtml}
</div>
</body></html>`;

      const fileName = `corte-terceirizado-${startDate}-${endDate}.pdf`;
      await generatePDFFromHtml(html, fileName);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const isSavingPayment = markPaidMutation.isPending || markPaidBulkMutation.isPending;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-orange-600" />
            Corte Terceirizado
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle financeiro e de pagamentos de cortes terceirizados</p>
        </div>
        <Button
          onClick={generatePDF}
          disabled={generatingPdf || loads.length === 0}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {generatingPdf ? "Gerando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Terceirizado</Label>
              <select
                value={contractorFilter}
                onChange={e => setContractorFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {contractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Pagamento</Label>
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value as PaymentFilter)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="pendentes">Pendentes</option>
                <option value="pagos">Pagos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-orange-700">{loads.length}</p>
            <p className="text-xs text-orange-600">Cargas</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-700">{grandTotals.totalVol.toFixed(1)} m³</p>
            <p className="text-xs text-blue-600">Volume</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 text-red-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-red-700">{formatBRL(grandTotals.totalCost)}</p>
            <p className="text-xs text-red-600">Custo Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-green-700">{formatBRL(grandTotals.paidCost)}</p>
            <p className="text-xs text-green-600">Total Pago ({grandTotals.paidCount})</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-amber-700">{formatBRL(grandTotals.pendingCost)}</p>
            <p className="text-xs text-amber-600">Pendente ({grandTotals.pendingCount})</p>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Carregando...</div>
      ) : filteredLoads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma carga encontrada</p>
            <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou registre cargas com o campo "Corte Terceirizado" preenchido</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByContractor).map(([name, data]) => {
            const unpaidIds = data.loads.filter(l => !l.thirdPartyPaid).map(l => l.id);
            return (
              <Card key={name} className="border-orange-200">
                <CardHeader className="pb-2 bg-orange-50">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <CardTitle className="text-base font-bold text-orange-800 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      {name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-600">{data.loads.length} carga(s)</span>
                        <span className="text-blue-700 font-medium">{data.totalVolume.toFixed(3)} m³</span>
                        <span className="text-red-700 font-bold">{formatBRL(data.totalCost)}</span>
                      </div>
                      {/* Payment summary badges */}
                      {data.paidCost > 0 && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          ✅ Pago: {formatBRL(data.paidCost)}
                        </Badge>
                      )}
                      {data.pendingCost > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          ⏳ Pendente: {formatBRL(data.pendingCost)}
                        </Badge>
                      )}
                      {/* Pay all button */}
                      {unpaidIds.length > 0 && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openPayBulk(name, unpaidIds)}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Pagar Todas ({unpaidIds.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">#</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Data</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Placa</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Destino</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">NF</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Volume</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Custo Corte</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Pagamento</th>
                          <th className="text-left p-3 text-xs text-gray-500 font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.loads.map((load, i) => (
                          <tr key={load.id} className={`border-b hover:bg-gray-50 ${load.thirdPartyPaid ? 'bg-green-50/30' : ''}`}>
                            <td className="p-3 text-gray-500 text-xs">{i + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-xs">{formatDate(load.date)}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                {load.vehiclePlate || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-gray-700">
                              {load.destination || load.clientName || '-'}
                            </td>
                            <td className="p-3">
                              {load.invoiceNumber ? (
                                <span className="flex items-center gap-1 text-xs">
                                  <FileText className="h-3 w-3 text-gray-400" />
                                  {load.invoiceNumber}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="p-3 text-xs font-medium text-blue-700">
                              {parseFloat(String(load.volumeM3 || '0').replace(',', '.')).toFixed(3)} m³
                            </td>
                            <td className="p-3 text-sm font-bold text-red-700">
                              {formatBRL(load.thirdPartyCost)}
                            </td>
                            <td className="p-3">
                              {load.thirdPartyPaid ? (
                                <div>
                                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                    ✅ Pago
                                  </Badge>
                                  {load.thirdPartyPaidAt && (
                                    <p className="text-xs text-green-600 mt-0.5">{formatDate(load.thirdPartyPaidAt)}</p>
                                  )}
                                  {load.thirdPartyPaymentNotes && (
                                    <p className="text-xs text-gray-400 mt-0.5 italic">{load.thirdPartyPaymentNotes}</p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                  ⏳ Pendente
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              {load.thirdPartyPaid ? (
                                <button
                                  className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                  title="Desfazer pagamento"
                                  onClick={() => {
                                    if (confirm('Desfazer o registro de pagamento desta carga?')) {
                                      markUnpaidMutation.mutate({ id: load.id });
                                    }
                                  }}
                                  disabled={markUnpaidMutation.isPending}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => openPaySingle(load)}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Pagar
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={payDialog.open} onOpenChange={v => { if (!v) closePayDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {payDialog.bulk
                ? `Registrar Pagamento — ${payDialog.contractorName}`
                : `Registrar Pagamento`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {payDialog.bulk && (
              <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Marcando <strong>{payDialog.bulkIds.length} carga(s) pendente(s)</strong> de <strong>{payDialog.contractorName}</strong> como pagas.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Data de Pagamento *</Label>
              <Input
                id="pay-date"
                type="date"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
                max={today.toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Observação (opcional)</Label>
              <Textarea
                id="pay-notes"
                placeholder="Ex: Pago via PIX, transferência, etc."
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closePayDialog}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={!payDate || isSavingPayment}
                onClick={handleConfirmPayment}
              >
                {isSavingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

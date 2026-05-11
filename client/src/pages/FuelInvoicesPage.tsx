import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, FileText, Calendar, DollarSign, Truck, CheckCircle2, Clock, AlertTriangle, X, Search, Filter, Pencil, Trash2, Eye, Camera, Upload, Loader2, Image as ImageIcon, Download
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pago: "bg-green-100 text-green-800 border-green-300",
  vencido: "bg-red-100 text-red-800 border-red-300",
  cancelado: "bg-gray-100 text-gray-500 border-gray-300",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pendente: Clock,
  pago: CheckCircle2,
  vencido: AlertTriangle,
  cancelado: X,
};

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  if (dateStr.includes("/")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(val: string | null | undefined) {
  if (!val) return "-";
  const num = parseFloat(val);
  return isNaN(num) ? val : `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function isOverdue(dueDate: string, status: string) {
  if (status === "pago" || status === "cancelado") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  return due < today;
}

const emptyForm = {
  supplierId: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  totalAmount: "",
  liters: "",
  pricePerLiter: "",
  fuelType: "diesel" as "diesel" | "gasolina" | "etanol" | "gnv",
  paymentMethod: "boleto",
  bankName: "",
  barcodeNumber: "",
  transporterName: "",
  transporterPlate: "",
  deliveryLocation: "",
  notes: "",
  invoicePhotoUrl: "",
};

export default function FuelInvoicesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ paidAt: "", paidAmount: "" });
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: invoices = [], isLoading } = trpc.fuelSuppliers.listInvoices.useQuery(
    filterStatus ? { status: filterStatus as any } : undefined
  );
  const { data: suppliers = [] } = trpc.fuelSuppliers.list.useQuery();

  const createMutation = trpc.fuelSuppliers.createInvoice.useMutation({
    onSuccess: () => { utils.fuelSuppliers.listInvoices.invalidate(); toast.success("Nota cadastrada com sucesso! Mary será notificada."); setIsOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.fuelSuppliers.updateInvoice.useMutation({
    onSuccess: () => { utils.fuelSuppliers.listInvoices.invalidate(); toast.success("Nota atualizada!"); setIsOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const markPaidMutation = trpc.fuelSuppliers.markInvoicePaid.useMutation({
    onSuccess: () => { utils.fuelSuppliers.listInvoices.invalidate(); toast.success("Pagamento registrado!"); setPayingId(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.fuelSuppliers.deleteInvoice.useMutation({
    onSuccess: () => { utils.fuelSuppliers.listInvoices.invalidate(); toast.success("Nota excluída!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const extractMutation = trpc.fuelSuppliers.extractInvoiceFromPhoto.useMutation({
    onSuccess: (data: any) => {
      const ext = data.extracted || {};
      // Try to match supplier by CNPJ or name
      let matchedSupplierId = "";
      if (ext.supplierCnpj || ext.supplierName) {
        const supplierList = suppliers as any[];
        const match = supplierList.find((s: any) =>
          (ext.supplierCnpj && s.cnpj && s.cnpj.replace(/\D/g, "") === ext.supplierCnpj.replace(/\D/g, "")) ||
          (ext.supplierName && s.name && s.name.toLowerCase().includes(ext.supplierName.toLowerCase().substring(0, 15)))
        );
        if (match) matchedSupplierId = String(match.id);
      }

      setForm(f => ({
        ...f,
        supplierId: matchedSupplierId || f.supplierId,
        invoiceNumber: ext.invoiceNumber || f.invoiceNumber,
        invoiceDate: ext.invoiceDate || f.invoiceDate,
        dueDate: ext.dueDate || f.dueDate,
        totalAmount: ext.totalAmount || f.totalAmount,
        liters: ext.liters || f.liters,
        pricePerLiter: ext.pricePerLiter || f.pricePerLiter,
        fuelType: (ext.fuelType as any) || f.fuelType,
        bankName: ext.bankName || f.bankName,
        barcodeNumber: ext.barcodeNumber || f.barcodeNumber,
        transporterName: ext.transporterName || f.transporterName,
        transporterPlate: ext.transporterPlate || f.transporterPlate,
        deliveryLocation: ext.deliveryLocation || f.deliveryLocation,
        paymentMethod: ext.paymentMethod || f.paymentMethod,
        invoicePhotoUrl: data.photoUrl || f.invoicePhotoUrl,
      }));
      setIsScanning(false);
      toast.success("Dados extraídos com sucesso! Confira e ajuste se necessário.");
    },
    onError: (e: any) => {
      setIsScanning(false);
      toast.error("Erro ao extrair dados: " + e.message);
    },
  });

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setScanPreview(null); };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setIsScanning(true);
    setScanPreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      extractMutation.mutate({
        photoBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices as any[];
    if (filterSupplier) {
      result = result.filter((inv: any) => String(inv.supplierId) === filterSupplier);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((inv: any) =>
        inv.invoiceNumber?.toLowerCase().includes(term) ||
        inv.supplierName?.toLowerCase().includes(term) ||
        inv.supplierTradeName?.toLowerCase().includes(term)
      );
    }
    return result.map((inv: any) => ({
      ...inv,
      effectiveStatus: isOverdue(inv.dueDate, inv.status) ? "vencido" : inv.status,
    }));
  }, [invoices, filterSupplier, searchTerm]);

  const totals = useMemo(() => {
    const pending = filteredInvoices.filter((i: any) => i.effectiveStatus === "pendente" || i.effectiveStatus === "vencido");
    const paid = filteredInvoices.filter((i: any) => i.effectiveStatus === "pago");
    const overdue = filteredInvoices.filter((i: any) => i.effectiveStatus === "vencido");
    return {
      pendingTotal: pending.reduce((s: number, i: any) => s + (parseFloat(i.totalAmount) || 0), 0),
      paidTotal: paid.reduce((s: number, i: any) => s + (parseFloat(i.paidAmount || i.totalAmount) || 0), 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((s: number, i: any) => s + (parseFloat(i.totalAmount) || 0), 0),
    };
  }, [filteredInvoices]);

  const handleSubmit = () => {
    if (!form.supplierId || !form.invoiceNumber || !form.invoiceDate || !form.dueDate || !form.totalAmount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const payload = {
      supplierId: parseInt(form.supplierId),
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      totalAmount: form.totalAmount,
      liters: form.liters || undefined,
      pricePerLiter: form.pricePerLiter || undefined,
      fuelType: form.fuelType,
      paymentMethod: form.paymentMethod || undefined,
      bankName: form.bankName || undefined,
      barcodeNumber: form.barcodeNumber || undefined,
      transporterName: form.transporterName || undefined,
      transporterPlate: form.transporterPlate || undefined,
      deliveryLocation: form.deliveryLocation || undefined,
      notes: form.notes || undefined,
      invoicePhotoUrl: form.invoicePhotoUrl || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (inv: any) => {
    setEditingId(inv.id);
    setForm({
      supplierId: String(inv.supplierId),
      invoiceNumber: inv.invoiceNumber || "",
      invoiceDate: inv.invoiceDate || "",
      dueDate: inv.dueDate || "",
      totalAmount: inv.totalAmount || "",
      liters: inv.liters || "",
      pricePerLiter: inv.pricePerLiter || "",
      fuelType: inv.fuelType || "diesel",
      paymentMethod: inv.paymentMethod || "boleto",
      bankName: inv.bankName || "",
      barcodeNumber: inv.barcodeNumber || "",
      transporterName: inv.transporterName || "",
      transporterPlate: inv.transporterPlate || "",
      deliveryLocation: inv.deliveryLocation || "",
      notes: inv.notes || "",
      invoicePhotoUrl: inv.invoicePhotoUrl || "",
    });
    setScanPreview(inv.invoicePhotoUrl || null);
    setIsOpen(true);
  };

  // PDF Report generation
  const generatePDFReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Permita popups para gerar o PDF"); return; }

    const rows = filteredInvoices.map((inv: any) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${inv.supplierName || ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${inv.invoiceNumber}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${formatDate(inv.invoiceDate)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${formatDate(inv.dueDate)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(inv.totalAmount)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${inv.liters ? inv.liters + "L" : "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;"><span style="padding:2px 8px;border-radius:12px;font-size:11px;${inv.effectiveStatus === "pago" ? "background:#dcfce7;color:#166534;" : inv.effectiveStatus === "vencido" ? "background:#fee2e2;color:#991b1b;" : "background:#fef9c3;color:#854d0e;"}">${STATUS_LABELS[inv.effectiveStatus]}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${inv.effectiveStatus === "pago" && inv.paidAt ? formatDate(inv.paidAt) : "-"}</td>
      </tr>
    `).join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Relatório Contas a Pagar - Combustível</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#333;}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;}th{background:#166534;color:white;padding:8px;text-align:left;}h1{color:#166534;font-size:20px;}
      .summary{display:flex;gap:20px;margin:16px 0;}.summary-card{padding:12px 20px;border-radius:8px;text-align:center;}.summary-card h3{margin:0;font-size:14px;}.summary-card p{margin:4px 0 0;font-size:20px;font-weight:bold;}
      @media print{body{margin:10px;}}</style></head><body>
      <h1>📋 Relatório de Contas a Pagar — Combustível</h1>
      <p style="color:#666;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
      <div class="summary">
        <div class="summary-card" style="background:#fef9c3;"><h3>A Pagar</h3><p style="color:#854d0e;">R$ ${totals.pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div class="summary-card" style="background:#fee2e2;"><h3>Vencidos (${totals.overdueCount})</h3><p style="color:#991b1b;">R$ ${totals.overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        <div class="summary-card" style="background:#dcfce7;"><h3>Pagos</h3><p style="color:#166534;">R$ ${totals.paidTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
      </div>
      <table><thead><tr><th>Fornecedor</th><th>NF</th><th>Emissão</th><th>Vencimento</th><th style="text-align:right;">Valor</th><th>Litros</th><th>Status</th><th>Pago em</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:20px;font-size:11px;color:#999;">BTREE Ambiental — Sistema de Gestão</p>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Excel (CSV) export
  const exportExcel = () => {
    const header = "Fornecedor;NF;Emissão;Vencimento;Valor;Litros;Preço/L;Status;Pago em;Valor Pago;Banco;Transportadora;Placa\n";
    const rows = filteredInvoices.map((inv: any) =>
      `${inv.supplierName || ""};${inv.invoiceNumber};${formatDate(inv.invoiceDate)};${formatDate(inv.dueDate)};${inv.totalAmount};${inv.liters || ""};${inv.pricePerLiter || ""};${STATUS_LABELS[inv.effectiveStatus]};${inv.paidAt ? formatDate(inv.paidAt) : ""};${inv.paidAmount || ""};${inv.bankName || ""};${inv.transporterName || ""};${inv.transporterPlate || ""}`
    ).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contas-pagar-combustivel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exportado!");
  };

  const supplierMap = useMemo(() => Object.fromEntries((suppliers as any[]).map((s: any) => [s.id, s])), [suppliers]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600" />
            Contas a Pagar — Combustível
          </h1>
          <p className="text-sm text-gray-500 mt-1">Notas fiscais, boletos e controle de pagamentos dos fornecedores.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={generatePDFReport} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportExcel} className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => { resetForm(); setIsOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Nova Nota / Boleto
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-yellow-700">{formatCurrency(String(totals.pendingTotal.toFixed(2)))}</p>
            <p className="text-xs text-gray-500">A pagar</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-700">{totals.overdueCount} vencido(s)</p>
            <p className="text-xs text-gray-500">{formatCurrency(String(totals.overdueTotal.toFixed(2)))}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-700">{formatCurrency(String(totals.paidTotal.toFixed(2)))}</p>
            <p className="text-xs text-gray-500">Pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Search className="h-3 w-3" /> Buscar</label>
          <Input
            placeholder="Nº nota, fornecedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Filter className="h-3 w-3" /> Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Fornecedor</label>
          <select
            value={filterSupplier}
            onChange={e => setFilterSupplier(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Todos</option>
            {(suppliers as any[]).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Notas */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma nota/boleto encontrado</p>
          <p className="text-xs mt-1">Clique em "Nova Nota / Boleto" para cadastrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv: any) => {
            const StatusIcon = STATUS_ICONS[inv.effectiveStatus] || Clock;
            return (
              <Card key={inv.id} className={`${inv.effectiveStatus === "vencido" ? "border-red-300 bg-red-50/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${inv.effectiveStatus === "pago" ? "bg-green-100" : inv.effectiveStatus === "vencido" ? "bg-red-100" : "bg-yellow-100"}`}>
                      <StatusIcon className={`h-6 w-6 ${inv.effectiveStatus === "pago" ? "text-green-600" : inv.effectiveStatus === "vencido" ? "text-red-600" : "text-yellow-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{inv.supplierName}</span>
                          {inv.supplierTradeName && <span className="text-xs text-gray-500">({inv.supplierTradeName})</span>}
                          <Badge className={`text-xs ${STATUS_COLORS[inv.effectiveStatus]}`}>
                            {STATUS_LABELS[inv.effectiveStatus]}
                          </Badge>
                          {inv.invoicePhotoUrl && (
                            <span className="text-xs text-blue-500 flex items-center gap-0.5" title="Nota com foto anexada">
                              <ImageIcon className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">{formatCurrency(inv.totalAmount)}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> NF {inv.invoiceNumber}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Emissão: {formatDate(inv.invoiceDate)}</span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Venc: <span className={inv.effectiveStatus === "vencido" ? "text-red-600 font-semibold" : ""}>{formatDate(inv.dueDate)}</span>
                        </span>
                        {inv.liters && <span>{inv.liters}L</span>}
                        {inv.transporterName && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {inv.transporterName}</span>}
                        {inv.effectiveStatus === "pago" && inv.paidAt && (
                          <span className="text-green-600 font-medium">Pago em {formatDate(inv.paidAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setViewInvoice(inv)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </button>
                      {inv.effectiveStatus !== "pago" && inv.effectiveStatus !== "cancelado" && (
                        <button
                          onClick={() => { setPayingId(inv.id); setPayForm({ paidAt: new Date().toISOString().slice(0, 10), paidAmount: inv.totalAmount }); }}
                          className="p-2 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600"
                          title="Marcar como pago"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(inv)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Excluir esta nota?")) deleteMutation.mutate({ id: inv.id }); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Pagamento */}
      {payingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayingId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Registrar Pagamento
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Data do Pagamento *</label>
                <Input type="date" value={payForm.paidAt} onChange={e => setPayForm(p => ({ ...p, paidAt: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor Pago (R$)</label>
                <Input value={payForm.paidAmount} onChange={e => setPayForm(p => ({ ...p, paidAmount: e.target.value }))} placeholder="Ex: 17100.00" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPayingId(null)}>Cancelar</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (!payForm.paidAt) { toast.error("Informe a data do pagamento"); return; }
                  markPaidMutation.mutate({ id: payingId, paidAt: payForm.paidAt, paidAmount: payForm.paidAmount || undefined });
                }}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? "Salvando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewInvoice(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Detalhes da Nota</h3>
              <button onClick={() => setViewInvoice(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {viewInvoice.invoicePhotoUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <img src={viewInvoice.invoicePhotoUrl} alt="Foto da NF" className="w-full max-h-[300px] object-contain bg-gray-50" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Fornecedor:</span><p className="font-medium">{viewInvoice.supplierName}</p></div>
              <div><span className="text-gray-500">NF:</span><p className="font-medium">{viewInvoice.invoiceNumber}</p></div>
              <div><span className="text-gray-500">Data Emissão:</span><p className="font-medium">{formatDate(viewInvoice.invoiceDate)}</p></div>
              <div><span className="text-gray-500">Vencimento:</span><p className="font-medium">{formatDate(viewInvoice.dueDate)}</p></div>
              <div><span className="text-gray-500">Valor Total:</span><p className="font-bold text-lg">{formatCurrency(viewInvoice.totalAmount)}</p></div>
              <div><span className="text-gray-500">Status:</span><p><Badge className={STATUS_COLORS[viewInvoice.effectiveStatus || viewInvoice.status]}>{STATUS_LABELS[viewInvoice.effectiveStatus || viewInvoice.status]}</Badge></p></div>
              {viewInvoice.liters && <div><span className="text-gray-500">Litros:</span><p className="font-medium">{viewInvoice.liters}L</p></div>}
              {viewInvoice.pricePerLiter && <div><span className="text-gray-500">Preço/L:</span><p className="font-medium">R$ {viewInvoice.pricePerLiter}</p></div>}
              {viewInvoice.fuelType && <div><span className="text-gray-500">Combustível:</span><p className="font-medium capitalize">{viewInvoice.fuelType}</p></div>}
              {viewInvoice.paymentMethod && <div><span className="text-gray-500">Forma Pgto:</span><p className="font-medium capitalize">{viewInvoice.paymentMethod}</p></div>}
              {viewInvoice.bankName && <div><span className="text-gray-500">Banco:</span><p className="font-medium">{viewInvoice.bankName}</p></div>}
              {viewInvoice.barcodeNumber && <div className="col-span-2"><span className="text-gray-500">Cód. Barras:</span><p className="font-mono text-xs break-all">{viewInvoice.barcodeNumber}</p></div>}
              {viewInvoice.transporterName && <div><span className="text-gray-500">Transportadora:</span><p className="font-medium">{viewInvoice.transporterName}</p></div>}
              {viewInvoice.transporterPlate && <div><span className="text-gray-500">Placa:</span><p className="font-medium">{viewInvoice.transporterPlate}</p></div>}
              {viewInvoice.deliveryLocation && <div><span className="text-gray-500">Local Entrega:</span><p className="font-medium">{viewInvoice.deliveryLocation}</p></div>}
              {viewInvoice.paidAt && <div><span className="text-gray-500">Pago em:</span><p className="font-medium text-green-600">{formatDate(viewInvoice.paidAt)}</p></div>}
              {viewInvoice.paidAmount && <div><span className="text-gray-500">Valor Pago:</span><p className="font-medium text-green-600">{formatCurrency(viewInvoice.paidAmount)}</p></div>}
              {viewInvoice.notes && <div className="col-span-2"><span className="text-gray-500">Observações:</span><p className="text-gray-700">{viewInvoice.notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Cadastro/Edição */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => { setIsOpen(false); resetForm(); }}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 space-y-4 animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "Editar Nota" : "Nova Nota / Boleto"}</h3>
              <button onClick={() => { setIsOpen(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            {/* OCR Scanner Section */}
            {!editingId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800 text-sm">Escanear Nota Fiscal / Boleto</span>
                </div>
                <p className="text-xs text-blue-600">Tire uma foto ou envie uma imagem da NF/boleto. A IA extrai os dados automaticamente!</p>

                {isScanning ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-sm text-blue-700 font-medium">Analisando documento...</p>
                    <p className="text-xs text-blue-500">A IA está extraindo os dados da nota fiscal</p>
                    {scanPreview && (
                      <img src={scanPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-blue-200 mt-2" />
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" /> Câmera
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> Galeria
                    </Button>
                  </div>
                )}

                {scanPreview && !isScanning && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
                    <img src={scanPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-xs text-green-700 font-medium">Dados extraídos com sucesso!</p>
                      <p className="text-xs text-green-600">Confira os campos abaixo e ajuste se necessário.</p>
                    </div>
                    <button onClick={() => { setScanPreview(null); setForm(f => ({ ...f, invoicePhotoUrl: "" })); }} className="p-1 rounded hover:bg-green-100">
                      <X className="h-4 w-4 text-green-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* Fornecedor */}
              <div>
                <label className="text-sm font-medium text-gray-700">Fornecedor *</label>
                <select
                  value={form.supplierId}
                  onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Selecione o fornecedor</option>
                  {(suppliers as any[]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} {s.tradeName ? `(${s.tradeName})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* NF e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nº Nota Fiscal *</label>
                  <Input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Ex: 97377" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Data Emissão *</label>
                  <Input type="date" value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} />
                </div>
              </div>

              {/* Vencimento e Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vencimento *</label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Valor Total (R$) *</label>
                  <Input value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="Ex: 17100.00" />
                </div>
              </div>

              {/* Litros e Preço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Litros</label>
                  <Input value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="Ex: 3000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preço/Litro</label>
                  <Input value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="Ex: 5.70" />
                </div>
              </div>

              {/* Combustível */}
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo de Combustível</label>
                <select
                  value={form.fuelType}
                  onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="diesel">Diesel</option>
                  <option value="gasolina">Gasolina</option>
                  <option value="etanol">Etanol</option>
                  <option value="gnv">GNV</option>
                </select>
              </div>

              <hr className="border-gray-200" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do Pagamento</p>

              {/* Forma de pagamento e Banco */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="boleto">Boleto</option>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência</option>
                    <option value="cheque">Cheque</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Banco</label>
                  <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Ex: Bradesco" />
                </div>
              </div>

              {/* Código de barras */}
              <div>
                <label className="text-sm font-medium text-gray-700">Código de Barras do Boleto</label>
                <Input value={form.barcodeNumber} onChange={e => setForm(f => ({ ...f, barcodeNumber: e.target.value }))} placeholder="Linha digitável do boleto" />
              </div>

              <hr className="border-gray-200" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transporte / Entrega</p>

              {/* Transportadora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Transportadora</label>
                  <Input value={form.transporterName} onChange={e => setForm(f => ({ ...f, transporterName: e.target.value }))} placeholder="Ex: Wilhen Transportes" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Placa Veículo</label>
                  <Input value={form.transporterPlate} onChange={e => setForm(f => ({ ...f, transporterPlate: e.target.value }))} placeholder="Ex: ASA2980" />
                </div>
              </div>

              {/* Local de entrega */}
              <div>
                <label className="text-sm font-medium text-gray-700">Local de Entrega</label>
                <Input value={form.deliveryLocation} onChange={e => setForm(f => ({ ...f, deliveryLocation: e.target.value }))} placeholder="Ex: SIMFLOR, Astorga..." />
              </div>

              {/* Observações */}
              <div>
                <label className="text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-y"
                  placeholder="Notas adicionais..."
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
    </div>
  );
}

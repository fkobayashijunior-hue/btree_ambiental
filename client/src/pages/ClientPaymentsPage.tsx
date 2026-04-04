import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Plus, Search, Calendar, AlertTriangle, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(val: string | null | undefined) {
  if (!val) return "R$ 0,00";
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-red-100 text-red-800 border-red-200", icon: Clock },
  pago: { label: "Pago", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-800 border-gray-200", icon: XCircle },
};

export default function ClientPaymentsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    referenceDate: new Date().toISOString().split("T")[0],
    description: "",
    volumeM3: "",
    pricePerM3: "",
    grossAmount: "",
    deductions: "0",
    netAmount: "",
    status: "pendente" as string,
    dueDate: "",
    pixKey: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: allPayments, isLoading } = trpc.clientPortal.listAllPayments.useQuery();

  const addPayment = trpc.clientPortal.addPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!");
      setOpen(false);
      resetForm();
      utils.clientPortal.listAllPayments.invalidate();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setSaving(false),
  });

  const updatePayment = trpc.clientPortal.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento atualizado!");
      utils.clientPortal.listAllPayments.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePayment = trpc.clientPortal.deletePayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento excluído!");
      utils.clientPortal.listAllPayments.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({
      clientId: "",
      referenceDate: new Date().toISOString().split("T")[0],
      description: "",
      volumeM3: "",
      pricePerM3: "",
      grossAmount: "",
      deductions: "0",
      netAmount: "",
      status: "pendente",
      dueDate: "",
      pixKey: "",
      notes: "",
    });
  }

  function calcNet() {
    const gross = parseFloat(form.grossAmount) || 0;
    const ded = parseFloat(form.deductions) || 0;
    return (gross - ded).toFixed(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) return toast.error("Selecione um cliente");
    if (!form.grossAmount) return toast.error("Informe o valor bruto");
    setSaving(true);
    const net = calcNet();
    addPayment.mutate({
      clientId: parseInt(form.clientId),
      referenceDate: form.referenceDate,
      description: form.description || undefined,
      volumeM3: form.volumeM3 || undefined,
      pricePerM3: form.pricePerM3 || undefined,
      grossAmount: form.grossAmount,
      deductions: form.deductions || "0",
      netAmount: net,
      status: form.status as any,
      dueDate: form.dueDate || undefined,
      pixKey: form.pixKey || undefined,
      notes: form.notes || undefined,
    });
  }

  function handleMarkPaid(id: number) {
    updatePayment.mutate({
      id,
      status: "pago",
      paidAt: new Date().toISOString(),
    });
  }

  function handleMarkOverdue(id: number) {
    updatePayment.mutate({ id, status: "atrasado" });
  }

  const filtered = useMemo(() => {
    if (!allPayments) return [];
    let list = [...allPayments];
    if (clientFilter && clientFilter !== "all") {
      list = list.filter((p: any) => String(p.clientId) === clientFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((p: any) => p.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p: any) =>
        p.description?.toLowerCase().includes(s) ||
        p.clientName?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [allPayments, clientFilter, statusFilter, search]);

  // Totais
  const totals = useMemo(() => {
    const pending = filtered.filter((p: any) => p.status === "pendente" || p.status === "atrasado");
    const paid = filtered.filter((p: any) => p.status === "pago");
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s: number, p: any) => s + (parseFloat(p.netAmount) || 0), 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s: number, p: any) => s + (parseFloat(p.netAmount) || 0), 0),
      total: filtered.reduce((s: number, p: any) => s + (parseFloat(p.netAmount) || 0), 0),
    };
  }, [filtered]);

  return (
    <div className="space-y-4 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Pagamentos de Clientes</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Registrar Pagamento
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data Referência *</Label>
                  <Input type="date" value={form.referenceDate} onChange={(e) => setForm({ ...form, referenceDate: e.target.value })} />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Compra de eucalipto - Talhão 3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Volume (m³)</Label>
                  <Input value={form.volumeM3} onChange={(e) => setForm({ ...form, volumeM3: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Preço/m³</Label>
                  <Input value={form.pricePerM3} onChange={(e) => setForm({ ...form, pricePerM3: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Valor Bruto *</Label>
                  <Input value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Descontos</Label>
                  <Input value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Valor Líquido</Label>
                  <Input value={calcNet()} readOnly className="bg-gray-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chave PIX</Label>
                  <Input value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} placeholder="Chave PIX do cliente" />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving}>
                {saving ? "Salvando..." : "Registrar Pagamento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Pendentes</p>
            <p className="text-lg font-bold text-red-600">{totals.pendingCount}</p>
            <p className="text-xs text-gray-500">{formatCurrency(String(totals.pendingAmount))}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Pagos</p>
            <p className="text-lg font-bold text-blue-600">{totals.paidCount}</p>
            <p className="text-xs text-gray-500">{formatCurrency(String(totals.paidAmount))}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 col-span-2">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Total Geral</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(String(totals.total))}</p>
            <p className="text-xs text-gray-500">{filtered.length} registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients?.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum pagamento encontrado</p>
            <p className="text-sm">Registre o primeiro pagamento clicando no botão acima.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pendente;
            const StatusIcon = cfg.icon;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800 truncate">
                          {p.clientName || `Cliente #${p.clientId}`}
                        </span>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-600 truncate">{p.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Ref: {formatDate(p.referenceDate)}
                        </span>
                        {p.dueDate && (
                          <span>Venc: {formatDate(p.dueDate)}</span>
                        )}
                        {p.volumeM3 && <span>{p.volumeM3} m³</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">{formatCurrency(p.netAmount)}</p>
                        {p.grossAmount !== p.netAmount && (
                          <p className="text-xs text-gray-400 line-through">{formatCurrency(p.grossAmount)}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {p.status === "pendente" && (
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleMarkPaid(p.id)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {p.status === "pendente" && (
                          <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50" onClick={() => handleMarkOverdue(p.id)}>
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            if (confirm("Excluir este pagamento?")) deletePayment.mutate({ id: p.id });
                          }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

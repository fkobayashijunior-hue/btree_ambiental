import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Users, Plus, Calendar, Search, CheckCircle2, Clock, DollarSign,
  User, ChevronDown, ChevronUp, Loader2, Filter, FileDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EMPLOYMENT_LABELS: Record<string, string> = {
  clt: "CLT",
  terceirizado: "Terceirizado",
  diarista: "Diarista",
};

const PAYMENT_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  pago: "bg-green-100 text-green-800",
};

const emptyForm = {
  collaboratorId: "",
  date: new Date().toISOString().slice(0, 10),
  employmentType: "diarista" as "clt" | "terceirizado" | "diarista",
  dailyValue: "",
  pixKey: "",
  activity: "",
  observations: "",
};

export default function AttendanceList() {
  const [searchDate, setSearchDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchName, setSearchName] = useState("");
  const [filterPayment, setFilterPayment] = useState<"" | "pendente" | "pago">("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const utils = trpc.useUtils();

  // Buscar colaboradores para o select
  const { data: collaboratorsList = [] } = trpc.collaborators.list.useQuery({});

  // Buscar presenças
  const { data: records = [], isLoading } = trpc.attendance.list.useQuery({
    dateFrom: searchDate,
    dateTo: searchDate,
    paymentStatus: filterPayment || undefined,
  });

  const createMutation = trpc.attendance.create.useMutation({
    onSuccess: () => {
      toast.success("Presença registrada com sucesso!");
      utils.attendance.list.invalidate();
      setIsOpen(false);
      setForm({ ...emptyForm });
    },
    onError: (e) => toast.error(e.message || "Erro ao registrar presença"),
  });

  const markPaidMutation = trpc.attendance.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.attendance.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.collaboratorId) { toast.error("Selecione o colaborador"); return; }
    if (!form.dailyValue) { toast.error("Informe o valor da diária"); return; }
    createMutation.mutate({
      collaboratorId: parseInt(form.collaboratorId),
      date: form.date,
      employmentType: form.employmentType,
      dailyValue: form.dailyValue,
      pixKey: form.pixKey || undefined,
      activity: form.activity || undefined,
      observations: form.observations || undefined,
    });
  };

  // Preencher dados do colaborador ao selecionar
  const handleCollaboratorChange = (id: string) => {
    const collab = (collaboratorsList as any[]).find((c: any) => String(c.id) === id);
    setForm(f => ({
      ...f,
      collaboratorId: id,
      employmentType: collab?.employmentType || "diarista",
      dailyValue: collab?.dailyRate || "",
      pixKey: collab?.pixKey || "",
    }));
  };

  // Filtrar por nome
  const filtered = useMemo(() => {
    let result = records as any[];
    if (searchName) {
      result = result.filter(r => r.collaboratorName?.toLowerCase().includes(searchName.toLowerCase()));
    }
    return result;
  }, [records, searchName]);

  // Agrupar por status de pagamento
  const pendentes = filtered.filter(r => r.paymentStatus === "pendente");
  const pagos = filtered.filter(r => r.paymentStatus === "pago");

  // Totais
  const totalDiarias = filtered.length;
  const totalValor = filtered.reduce((acc, r) => acc + parseFloat(r.dailyValue || "0"), 0);
  const totalPendente = pendentes.reduce((acc, r) => acc + parseFloat(r.dailyValue || "0"), 0);

  // Gerar PDF do relatório de presenças
  const handleExportPDF = async () => {
    if (filtered.length === 0) { toast.error("Nenhuma presença para exportar"); return; }
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();

      // Cabeçalho
      doc.setFontSize(16);
      doc.setTextColor(22, 101, 52); // verde escuro
      doc.text("BTREE Ambiental", 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text("Relatório de Presenças — " + dateLabel, 14, 26);

      // Resumo
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(`Total de presenças: ${totalDiarias}`, 14, 36);
      doc.text(`Total a pagar (pendentes): R$ ${totalPendente.toFixed(2)}`, 14, 42);
      doc.text(`Total geral: R$ ${totalValor.toFixed(2)}`, 14, 48);

      // Tabela
      const rows = filtered.map((r: any) => [
        r.collaboratorName || "-",
        r.activity || "-",
        r.employmentType === "clt" ? "CLT" : r.employmentType === "terceirizado" ? "Terceirizado" : "Diarista",
        `R$ ${parseFloat(r.dailyValue || "0").toFixed(2)}`,
        r.pixKey || "-",
        r.paymentStatus === "pago" ? "Pago" : "Pendente",
        r.registeredByName || "-",
      ]);

      autoTable(doc, {
        startY: 55,
        head: [["Colaborador", "Atividade", "Vínculo", "Valor", "PIX", "Status", "Registrado por"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          3: { halign: "right" },
          5: { halign: "center" },
        },
      });

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — Kobayashi Desenvolvimento`, 14, doc.internal.pageSize.height - 8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
      }

      doc.save(`presencas-${searchDate}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const dateLabel = (() => {
    try {
      return format(new Date(searchDate + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch { return searchDate; }
  })();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Controle de Presenças
          </h1>
          <p className="text-gray-500 text-sm mt-1">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button onClick={() => { setForm({ ...emptyForm }); setIsOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Registrar Presença
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{totalDiarias}</p>
            <p className="text-xs text-gray-500">Presenças</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">R$ {totalPendente.toFixed(2)}</p>
            <p className="text-xs text-gray-500">A Pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">R$ {totalValor.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="pl-10 w-44"
          />
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar colaborador..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value as any)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma presença nesta data</p>
          <p className="text-sm mt-1">Clique em "Registrar Presença" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div>
              <button
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-yellow-800 font-semibold text-sm mb-2"
                onClick={() => toggleGroup("pendente")}
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Pendente de Pagamento ({pendentes.length})
                  <span className="font-bold">R$ {totalPendente.toFixed(2)}</span>
                </span>
                {expandedGroups["pendente"] === false ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              {expandedGroups["pendente"] !== false && (
                <div className="space-y-2">
                  {pendentes.map((r: any) => (
                    <AttendanceCard key={r.id} record={r} onMarkPaid={(paid) => markPaidMutation.mutate({ id: r.id, paid })} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagos */}
          {pagos.length > 0 && (
            <div>
              <button
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-800 font-semibold text-sm mb-2"
                onClick={() => toggleGroup("pago")}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Pagos ({pagos.length})
                </span>
                {expandedGroups["pago"] === false ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              {expandedGroups["pago"] !== false && (
                <div className="space-y-2">
                  {pagos.map((r: any) => (
                    <AttendanceCard key={r.id} record={r} onMarkPaid={(paid) => markPaidMutation.mutate({ id: r.id, paid })} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sheet de cadastro */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setForm({ ...emptyForm }); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800">Registrar Presença</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div>
              <Label>Colaborador *</Label>
              <select
                value={form.collaboratorId}
                onChange={e => handleCollaboratorChange(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o colaborador</option>
                {(collaboratorsList as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Tipo de Vínculo *</Label>
              <select
                value={form.employmentType}
                onChange={e => setForm(f => ({ ...f, employmentType: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="diarista">Diarista</option>
                <option value="terceirizado">Terceirizado</option>
                <option value="clt">CLT</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor da Diária (R$) *</Label>
                <Input
                  value={form.dailyValue}
                  onChange={e => setForm(f => ({ ...f, dailyValue: e.target.value }))}
                  placeholder="ex: 150,00"
                  required
                />
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input
                  value={form.pixKey}
                  onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))}
                  placeholder="CPF, email, telefone..."
                />
              </div>
            </div>

            <div>
              <Label>Função / Atividade</Label>
              <Input
                value={form.activity}
                onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}
                placeholder="ex: Plantio, Corte, Carregamento..."
              />
            </div>

            <div>
              <Label>Observações</Label>
              <textarea
                value={form.observations}
                onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                placeholder="Observações adicionais..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                ) : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AttendanceCard({ record, onMarkPaid }: { record: any; onMarkPaid: (paid: boolean) => void }) {
  const isPago = record.paymentStatus === "pago";
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
            {record.collaboratorPhoto ? (
              <img src={record.collaboratorPhoto} alt={record.collaboratorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-emerald-600 font-bold text-sm">
                {record.collaboratorName?.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800">{record.collaboratorName}</p>
                <p className="text-xs text-gray-500">{record.activity || record.collaboratorRole}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-700">R$ {parseFloat(record.dailyValue || "0").toFixed(2)}</span>
                <Badge className={`text-xs ${PAYMENT_COLORS[record.paymentStatus]}`}>
                  {isPago ? "Pago" : "Pendente"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-gray-400">{EMPLOYMENT_LABELS[record.employmentType]}</span>
              {record.pixKey && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> {record.pixKey}
                </span>
              )}
              {record.registeredByName && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> {record.registeredByName}
                </span>
              )}
            </div>

            {record.observations && (
              <p className="text-xs text-gray-400 mt-1 italic">{record.observations}</p>
            )}

            {/* Botão marcar pago/pendente */}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                className={`text-xs h-7 gap-1 ${isPago ? "text-yellow-600 border-yellow-200 hover:bg-yellow-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                onClick={() => onMarkPaid(!isPago)}
              >
                {isPago ? (
                  <><Clock className="h-3 w-3" /> Marcar Pendente</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3" /> Marcar Pago</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

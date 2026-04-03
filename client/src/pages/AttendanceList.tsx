import { useState, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Users, Plus, Calendar, ChevronDown, ChevronUp, Loader2,
  FileDown, ChevronLeft, ChevronRight, CheckCircle2, Clock,
  DollarSign, User, CalendarDays, LayoutList, Trash2
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<string, string> = {
  clt: "CLT",
  terceirizado: "Terceirizado",
  diarista: "Diarista",
};

function weekRange(ref: Date) {
  const start = startOfWeek(ref, { weekStartsOn: 0 }); // domingo
  const end = endOfWeek(ref, { weekStartsOn: 0 });       // sábado
  return { start, end };
}

function fmtDate(d: Date | string) {
  return format(typeof d === "string" ? parseISO(d) : d, "dd/MM", { locale: ptBR });
}

function fmtDateFull(d: Date | string) {
  return format(typeof d === "string" ? parseISO(d) : d, "EEE dd/MM", { locale: ptBR });
}

const emptyForm = {
  collaboratorId: "",
  date: new Date().toISOString().slice(0, 10),
  employmentType: "diarista" as "clt" | "terceirizado" | "diarista",
  dailyValue: "",
  pixKey: "",
  activity: "",
  observations: "",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function AttendanceList() {
  const { isAdmin } = usePermissions();
  const [tab, setTab] = useState<"semanal" | "diario">("semanal");
  const [weekRef, setWeekRef] = useState(new Date());
  const [searchDate, setSearchDate] = useState(new Date().toISOString().slice(0, 10));
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [expandedCollab, setExpandedCollab] = useState<Record<number, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const utils = trpc.useUtils();
  const { data: collaboratorsList = [] } = trpc.collaborators.list.useQuery({});

  // ── Dados da semana ──────────────────────────────────────────────────────
  const { start: weekStart, end: weekEnd } = weekRange(weekRef);

  const { data: weekRecords = [], isLoading: weekLoading } = trpc.attendance.list.useQuery({
    dateFrom: weekStart.toISOString().slice(0, 10),
    dateTo: weekEnd.toISOString().slice(0, 10),
  });

  // ── Dados do dia ────────────────────────────────────────────────────────
  const { data: dayRecords = [], isLoading: dayLoading } = trpc.attendance.list.useQuery({
    dateFrom: searchDate,
    dateTo: searchDate,
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

  const deleteMutation = trpc.attendance.delete.useMutation({
    onSuccess: () => {
      toast.success("Presença excluída!");
      utils.attendance.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro ao excluir"),
  });

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Excluir a presença de ${name}?`)) return;
    deleteMutation.mutate({ id });
  };

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

  // ── Agrupamento semanal por colaborador ──────────────────────────────────
  const weekByCollab = useMemo(() => {
    const map: Record<number, {
      id: number; name: string; photo: string | null; role: string;
      pixKey: string | null; employmentType: string;
      days: any[]; total: number; pendente: number; pago: number;
    }> = {};

    for (const r of weekRecords as any[]) {
      if (!map[r.collaboratorId]) {
        map[r.collaboratorId] = {
          id: r.collaboratorId, name: r.collaboratorName,
          photo: r.collaboratorPhoto, role: r.collaboratorRole,
          pixKey: r.pixKey, employmentType: r.employmentType,
          days: [], total: 0, pendente: 0, pago: 0,
        };
      }
      const v = parseFloat(r.dailyValue || "0");
      map[r.collaboratorId].days.push(r);
      map[r.collaboratorId].total += v;
      if (r.paymentStatus === "pago") map[r.collaboratorId].pago += v;
      else map[r.collaboratorId].pendente += v;
    }

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [weekRecords]);

  const weekTotals = useMemo(() => ({
    diarias: (weekRecords as any[]).length,
    total: weekByCollab.reduce((s, c) => s + c.total, 0),
    pendente: weekByCollab.reduce((s, c) => s + c.pendente, 0),
    pago: weekByCollab.reduce((s, c) => s + c.pago, 0),
  }), [weekByCollab, weekRecords]);

  // ── Agrupamento diário ───────────────────────────────────────────────────
  const dayPendentes = (dayRecords as any[]).filter(r => r.paymentStatus === "pendente");
  const dayPagos = (dayRecords as any[]).filter(r => r.paymentStatus === "pago");
  const dayTotal = (dayRecords as any[]).reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
  const dayPendenteTotal = dayPendentes.reduce((s: number, r: any) => s + parseFloat(r.dailyValue || "0"), 0);

  // ── Marcar todos como pago (semana de um colaborador) ───────────────────
  const markAllPaid = async (collab: typeof weekByCollab[0]) => {
    const pending = collab.days.filter(d => d.paymentStatus === "pendente");
    for (const d of pending) {
      await markPaidMutation.mutateAsync({ id: d.id, paid: true });
    }
    toast.success(`${collab.name} marcado como pago!`);
  };

  // ── Constantes de logo para PDF ────────────────────────────────────────────
  const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
  const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
  const BTREE_SITE = "btreeambiental.com";
  const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

  // ── Exportar PDF semanal ─────────────────────────────────────────────────
  const handleExportWeekPDF = () => {
    if (weekByCollab.length === 0) { toast.error("Nenhuma presença na semana"); return; }
    const weekLabel = `${fmtDate(weekStart)} a ${fmtDate(weekEnd)}/${format(weekEnd, "yyyy")}`;
    const rows = weekByCollab.map(c => `
      <tr>
        <td>${c.name}</td>
        <td style="text-align:center">${c.days.length}</td>
        <td style="font-size:11px">${c.days.map(d => fmtDateFull(d.date)).join(", ")}</td>
        <td style="text-align:center">${EMPLOYMENT_LABELS[c.employmentType] || c.employmentType}</td>
        <td style="font-size:11px">${c.pixKey || "—"}</td>
        <td style="text-align:right">R$ ${c.total.toFixed(2)}</td>
        <td style="text-align:right;color:${c.pendente > 0 ? "#b91c1c" : "#15803d"}">${c.pendente > 0 ? `R$ ${c.pendente.toFixed(2)}` : "—"}</td>
        <td style="text-align:right;color:#15803d">${c.pago > 0 ? `R$ ${c.pago.toFixed(2)}` : "—"}</td>
      </tr>
    `).join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Presenças Semanal - BTREE Ambiental</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
        .header { background: #14532d; color: white; padding: 18px 24px; display: flex; align-items: center; gap: 18px; }
        .header img { height: 50px; }
        .header-text h1 { font-size: 20px; font-weight: bold; }
        .header-text p { font-size: 12px; opacity: 0.85; margin-top: 2px; }
        .content { padding: 20px 24px; }
        .title { font-size: 15px; font-weight: bold; color: #14532d; margin-bottom: 6px; }
        .subtitle { font-size: 12px; color: #555; margin-bottom: 14px; }
        .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 14px; min-width: 120px; }
        .summary-card .label { font-size: 10px; color: #555; text-transform: uppercase; }
        .summary-card .value { font-size: 14px; font-weight: bold; color: #15803d; }
        .summary-card.red .value { color: #b91c1c; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #14532d; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f0fdf4; }
        .footer { margin-top: 24px; padding: 14px 24px; border-top: 2px solid #14532d; display: flex; align-items: center; justify-content: space-between; }
        .footer-left { display: flex; align-items: center; gap: 10px; }
        .footer-left img.kobayashi { height: 28px; }
        .footer-text { font-size: 10px; color: #555; }
        .footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
        .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .footer-right img { width: 60px; height: 60px; }
        .footer-right span { font-size: 9px; color: #555; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
        <div class="header-text">
          <h1>BTREE Ambiental</h1>
          <p>Relatório Semanal de Presenças — Semana ${weekLabel}</p>
        </div>
      </div>
      <div class="content">
        <div class="title">Controle de Presença Semanal</div>
        <div class="subtitle">Semana: ${weekLabel} | Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
        <div class="summary">
          <div class="summary-card"><div class="label">Presenças</div><div class="value">${weekTotals.diarias}</div></div>
          <div class="summary-card"><div class="label">Total Geral</div><div class="value">R$ ${weekTotals.total.toFixed(2)}</div></div>
          <div class="summary-card red"><div class="label">A Pagar</div><div class="value">R$ ${weekTotals.pendente.toFixed(2)}</div></div>
          <div class="summary-card"><div class="label">Pago</div><div class="value">R$ ${weekTotals.pago.toFixed(2)}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>Colaborador</th><th>Dias</th><th>Datas</th><th>Vínculo</th>
            <th>PIX</th><th>Total</th><th>A Pagar</th><th>Pago</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="footer">
        <div class="footer-left">
          <img class="kobayashi" src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
          <div class="footer-text">
            Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
            <a href="https://${BTREE_SITE}">${BTREE_SITE}</a>
          </div>
        </div>
        <div class="footer-right">
          <img src="${BTREE_QR}" alt="QR Code" />
          <span>Acesse nosso site</span>
        </div>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita popups para gerar o PDF"); return; }
    win.document.write(html);
    win.document.close();
  };

  // ── Exportar PDF diário ──────────────────────────────────────────────────
  const handleExportDayPDF = () => {
    if ((dayRecords as any[]).length === 0) { toast.error("Nenhuma presença para exportar"); return; }
    const dateLabel = format(parseISO(searchDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const rows = (dayRecords as any[]).map((r: any) => `
      <tr>
        <td>${r.collaboratorName || "—"}</td>
        <td>${r.activity || "—"}</td>
        <td style="text-align:center">${EMPLOYMENT_LABELS[r.employmentType] || r.employmentType}</td>
        <td style="text-align:right">R$ ${parseFloat(r.dailyValue || "0").toFixed(2)}</td>
        <td style="font-size:11px">${r.pixKey || "—"}</td>
        <td style="text-align:center">
          <span style="background:${r.paymentStatus === "pago" ? "#dcfce7" : "#fee2e2"};color:${r.paymentStatus === "pago" ? "#15803d" : "#b91c1c"};padding:2px 8px;border-radius:4px;font-size:10px">
            ${r.paymentStatus === "pago" ? "Pago" : "Pendente"}
          </span>
        </td>
      </tr>
    `).join("");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Presenças ${searchDate} - BTREE Ambiental</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
        .header { background: #14532d; color: white; padding: 18px 24px; display: flex; align-items: center; gap: 18px; }
        .header img { height: 50px; }
        .header-text h1 { font-size: 20px; font-weight: bold; }
        .header-text p { font-size: 12px; opacity: 0.85; margin-top: 2px; }
        .content { padding: 20px 24px; }
        .title { font-size: 15px; font-weight: bold; color: #14532d; margin-bottom: 6px; }
        .subtitle { font-size: 12px; color: #555; margin-bottom: 14px; }
        .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 14px; min-width: 120px; }
        .summary-card .label { font-size: 10px; color: #555; text-transform: uppercase; }
        .summary-card .value { font-size: 14px; font-weight: bold; color: #15803d; }
        .summary-card.red .value { color: #b91c1c; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #14532d; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f0fdf4; }
        .footer { margin-top: 24px; padding: 14px 24px; border-top: 2px solid #14532d; display: flex; align-items: center; justify-content: space-between; }
        .footer-left { display: flex; align-items: center; gap: 10px; }
        .footer-left img.kobayashi { height: 28px; }
        .footer-text { font-size: 10px; color: #555; }
        .footer-text a { color: #15803d; text-decoration: none; font-weight: bold; }
        .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .footer-right img { width: 60px; height: 60px; }
        .footer-right span { font-size: 9px; color: #555; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <img src="${BTREE_LOGO}" alt="BTREE Ambiental" onerror="this.style.display='none'" />
        <div class="header-text">
          <h1>BTREE Ambiental</h1>
          <p>Relatório de Presenças — ${dateLabel}</p>
        </div>
      </div>
      <div class="content">
        <div class="title">Controle de Presença Diário</div>
        <div class="subtitle">Data: ${dateLabel} | Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
        <div class="summary">
          <div class="summary-card"><div class="label">Presenças</div><div class="value">${(dayRecords as any[]).length}</div></div>
          <div class="summary-card"><div class="label">Total Geral</div><div class="value">R$ ${dayTotal.toFixed(2)}</div></div>
          <div class="summary-card red"><div class="label">A Pagar</div><div class="value">R$ ${dayPendenteTotal.toFixed(2)}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>Colaborador</th><th>Atividade</th><th>Vínculo</th>
            <th>Valor</th><th>PIX</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="footer">
        <div class="footer-left">
          <img class="kobayashi" src="${KOBAYASHI_LOGO}" alt="Kobayashi" onerror="this.style.display='none'" />
          <div class="footer-text">
            Desenvolvido por <strong>Kobayashi Desenvolvimento de Sistemas</strong><br/>
            <a href="https://${BTREE_SITE}">${BTREE_SITE}</a>
          </div>
        </div>
        <div class="footer-right">
          <img src="${BTREE_QR}" alt="QR Code" />
          <span>Acesse nosso site</span>
        </div>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); }, 400); }</script>
    </body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita popups para gerar o PDF"); return; }
    win.document.write(html);
    win.document.close();
  };

  const weekLabel = `${fmtDate(weekStart)} a ${fmtDate(weekEnd)}/${format(weekEnd, "yyyy")}`;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Controle de Presenças
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Registro e pagamento de colaboradores</p>
        </div>
        <Button
          onClick={() => { setForm({ ...emptyForm }); setIsOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Registrar Presença
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="semanal" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Semanal
          </TabsTrigger>
          <TabsTrigger value="diario" className="gap-1.5">
            <LayoutList className="h-4 w-4" /> Por Dia
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA SEMANAL ─────────────────────────────────────────────── */}
        <TabsContent value="semanal" className="space-y-4 mt-4">
          {/* Navegação de semana */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => setWeekRef(w => subWeeks(w, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-gray-800">{weekLabel}</p>
              <p className="text-xs text-gray-400">
                {format(weekStart, "EEEE", { locale: ptBR })} → {format(weekEnd, "EEEE", { locale: ptBR })}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWeekRef(w => addWeeks(w, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{weekTotals.diarias}</p>
              <p className="text-xs text-gray-500">Presenças</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-gray-700">{weekByCollab.length}</p>
              <p className="text-xs text-gray-500">Colaboradores</p>
            </CardContent></Card>
            {isAdmin && (<Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-yellow-600">R$ {weekTotals.pendente.toFixed(2)}</p>
              <p className="text-xs text-gray-500">A Pagar</p>
            </CardContent></Card>)}
            {isAdmin && (<Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-600">R$ {weekTotals.total.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Semana</p>
            </CardContent></Card>)}
          </div>

          {/* Botão PDF */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExportWeekPDF} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <FileDown className="h-4 w-4" /> Exportar PDF Semanal
            </Button>
          </div>

          {/* Lista por colaborador */}
          {weekLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : weekByCollab.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma presença nesta semana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weekByCollab.map(collab => (
                <Card key={collab.id} className={`border-l-4 ${collab.pendente > 0 ? "border-l-yellow-400" : "border-l-green-400"}`}>
                  <CardContent className="p-4">
                    {/* Linha principal do colaborador */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                        {collab.photo ? (
                          <img src={collab.photo} alt={collab.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-600 font-bold text-sm">{collab.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-800">{collab.name}</p>
                            <p className="text-xs text-gray-500">{collab.days.length} dia{collab.days.length !== 1 ? "s" : ""} · {EMPLOYMENT_LABELS[collab.employmentType] || collab.employmentType}</p>
                          </div>
                          <div className="text-right">
                            {isAdmin ? (
                              <>
                                <p className="font-bold text-emerald-700 text-lg">R$ {collab.total.toFixed(2)}</p>
                                {collab.pendente > 0 && (
                                  <p className="text-xs text-yellow-600 font-medium">R$ {collab.pendente.toFixed(2)} pendente</p>
                                )}
                                {collab.pago > 0 && collab.pendente === 0 && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Pago</Badge>
                                )}
                              </>
                            ) : (
                              <Badge className={collab.pendente > 0 ? "bg-yellow-100 text-yellow-700 text-xs" : "bg-green-100 text-green-700 text-xs"}>
                                {collab.pendente > 0 ? "Pendente" : "Pago"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* PIX */}
                        {isAdmin && collab.pixKey && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> PIX: {collab.pixKey}
                          </p>
                        )}

                        {/* Ações */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {isAdmin && collab.pendente > 0 && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                              onClick={() => markAllPaid(collab)}
                              disabled={markPaidMutation.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Marcar Semana Paga
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-gray-500 gap-1"
                            onClick={() => setExpandedCollab(prev => ({ ...prev, [collab.id]: !prev[collab.id] }))}
                          >
                            {expandedCollab[collab.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {expandedCollab[collab.id] ? "Ocultar dias" : "Ver dias"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes dos dias */}
                    {expandedCollab[collab.id] && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {collab.days.map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <span className="font-medium text-gray-700">{fmtDateFull(d.date)}</span>
                              {d.activity && <span className="text-gray-400 ml-2 text-xs">· {d.activity}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && <span className="font-semibold text-emerald-700">R$ {parseFloat(d.dailyValue || "0").toFixed(2)}</span>}
                              <button
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                                  d.paymentStatus === "pago"
                                    ? "bg-green-100 text-green-700 hover:bg-yellow-100 hover:text-yellow-700"
                                    : "bg-yellow-100 text-yellow-700 hover:bg-green-100 hover:text-green-700"
                                }`}
                                onClick={() => markPaidMutation.mutate({ id: d.id, paid: d.paymentStatus !== "pago" })}
                              >
                                {d.paymentStatus === "pago" ? "✓ Pago" : "Pendente"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA DIÁRIA ──────────────────────────────────────────────── */}
        <TabsContent value="diario" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="pl-10 w-44"
              />
            </div>
            <Button variant="outline" onClick={handleExportDayPDF} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>

          {/* Resumo do dia */}
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{(dayRecords as any[]).length}</p>
              <p className="text-xs text-gray-500">Presenças</p>
            </CardContent></Card>
            {isAdmin && (<Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-yellow-600">R$ {dayPendenteTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-500">A Pagar</p>
            </CardContent></Card>)}
            {isAdmin && (<Card><CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-600">R$ {dayTotal.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent></Card>)}
          </div>

          {dayLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (dayRecords as any[]).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma presença neste dia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayPendentes.length > 0 && (
                <div>
                  <button
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-yellow-800 font-semibold text-sm mb-2"
                    onClick={() => setExpandedGroups(p => ({ ...p, pendente: !p.pendente }))}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pendente de Pagamento ({dayPendentes.length}){isAdmin ? ` — R$ ${dayPendenteTotal.toFixed(2)}` : ""}
                    </span>
                    {expandedGroups.pendente === false ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  {expandedGroups.pendente !== false && (
                    <div className="space-y-2">
                      {dayPendentes.map((r: any) => (
                        <AttendanceCard key={r.id} record={r} onMarkPaid={(paid) => markPaidMutation.mutate({ id: r.id, paid })} onDelete={() => handleDelete(r.id, r.collaboratorName)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {dayPagos.length > 0 && (
                <div>
                  <button
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-800 font-semibold text-sm mb-2"
                    onClick={() => setExpandedGroups(p => ({ ...p, pago: !p.pago }))}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Pagos ({dayPagos.length})
                    </span>
                    {expandedGroups.pago === false ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  {expandedGroups.pago !== false && (
                    <div className="space-y-2">
                      {dayPagos.map((r: any) => (
                        <AttendanceCard key={r.id} record={r} onMarkPaid={(paid) => markPaidMutation.mutate({ id: r.id, paid })} onDelete={() => handleDelete(r.id, r.collaboratorName)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Sheet de cadastro ───────────────────────────────────────────── */}
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

// ─── Card de presença individual ─────────────────────────────────────────────

function AttendanceCard({ record, onMarkPaid, onDelete }: { record: any; onMarkPaid: (paid: boolean) => void; onDelete?: () => void }) {
  const isPago = record.paymentStatus === "pago";
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
            {record.collaboratorPhoto ? (
              <img src={record.collaboratorPhoto} alt={record.collaboratorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-emerald-600 font-bold text-sm">{record.collaboratorName?.charAt(0)}</span>
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
                <Badge className={`text-xs ${isPago ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
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
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={`text-xs h-7 gap-1 ${isPago ? "text-yellow-600 border-yellow-200 hover:bg-yellow-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                onClick={() => onMarkPaid(!isPago)}
              >
                {isPago ? <><Clock className="h-3 w-3" /> Marcar Pendente</> : <><CheckCircle2 className="h-3 w-3" /> Marcar Pago</>}
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

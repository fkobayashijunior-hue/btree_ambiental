import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Plus, FileDown,
  Loader2, Trash2, Edit2, ChevronDown, ChevronUp,
  BarChart3, PieChart, Calendar, ArrowUpCircle, ArrowDownCircle,
  Wallet, CheckCircle2, Clock, XCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constantes ──────────────────────────────────────────────────────────────

const INCOME_CATEGORIES: Record<string, string> = {
  venda_madeira: "Venda de Madeira",
  servico_corte: "Serviço de Corte",
  servico_plantio: "Serviço de Plantio",
  servico_transporte: "Serviço de Transporte",
  servico_consultoria: "Consultoria",
  outro_receita: "Outras Receitas",
};

const EXPENSE_CATEGORIES: Record<string, string> = {
  folha_pagamento: "Folha de Pagamento",
  combustivel: "Combustível",
  manutencao: "Manutenção",
  material: "Materiais",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  impostos: "Impostos/Taxas",
  aluguel: "Aluguel",
  servico_terceiro: "Serviço de Terceiros",
  outro_despesa: "Outras Despesas",
};

const PAYMENT_METHODS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  transferencia: "Transferência",
  boleto: "Boleto",
  cheque: "Cheque",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

const COLORS_INCOME = ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"];
const COLORS_EXPENSE = ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2", "#fef9c3", "#fef08a", "#fde047"];

const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
const BTREE_SITE = "btreeambiental.com";
const BTREE_QR = "https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://btreeambiental.com";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return format(new Date(parseInt(y), parseInt(mo) - 1, 1), "MMM/yy", { locale: ptBR });
}

function fmtDate(d: Date | string) {
  return format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy", { locale: ptBR });
}

const emptyForm = {
  type: "receita" as "receita" | "despesa",
  category: "",
  description: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "pix" as any,
  status: "confirmado" as any,
  clientName: "",
  notes: "",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function FinancialModule() {
  const [tab, setTab] = useState<"dashboard" | "lancamentos" | "relatorio">("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterType, setFilterType] = useState<"all" | "receita" | "despesa">("all");
  const [expandedEntry, setExpandedEntry] = useState<Record<number, boolean>>({});

  const utils = trpc.useUtils();

  const { data: summary, isLoading: summaryLoading } = trpc.financial.monthlySummary.useQuery({ referenceMonth: selectedMonth });
  const { data: incomeBreakdown = [] } = trpc.financial.categoryBreakdown.useQuery({ referenceMonth: selectedMonth, type: "receita" });
  const { data: expenseBreakdown = [] } = trpc.financial.categoryBreakdown.useQuery({ referenceMonth: selectedMonth, type: "despesa" });
  const { data: monthlyHistory = [] } = trpc.financial.monthlyHistory.useQuery();
  const { data: entries = [], isLoading: entriesLoading } = trpc.financial.list.useQuery({
    referenceMonth: selectedMonth,
    type: filterType,
  });

  const createMutation = trpc.financial.create.useMutation({
    onSuccess: () => {
      toast.success("Lançamento registrado!");
      utils.financial.list.invalidate();
      utils.financial.monthlySummary.invalidate();
      utils.financial.categoryBreakdown.invalidate();
      utils.financial.monthlyHistory.invalidate();
      setIsOpen(false);
      setForm({ ...emptyForm });
      setEditingEntry(null);
    },
    onError: (e) => toast.error(e.message || "Erro ao registrar"),
  });

  const updateMutation = trpc.financial.update.useMutation({
    onSuccess: () => {
      toast.success("Lançamento atualizado!");
      utils.financial.list.invalidate();
      utils.financial.monthlySummary.invalidate();
      utils.financial.categoryBreakdown.invalidate();
      utils.financial.monthlyHistory.invalidate();
      setIsOpen(false);
      setForm({ ...emptyForm });
      setEditingEntry(null);
    },
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const deleteMutation = trpc.financial.delete.useMutation({
    onSuccess: () => {
      toast.success("Lançamento excluído!");
      utils.financial.list.invalidate();
      utils.financial.monthlySummary.invalidate();
      utils.financial.categoryBreakdown.invalidate();
      utils.financial.monthlyHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpenCreate = (type: "receita" | "despesa") => {
    setEditingEntry(null);
    setForm({ ...emptyForm, type });
    setIsOpen(true);
  };

  const handleOpenEdit = (entry: any) => {
    setEditingEntry(entry);
    setForm({
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      paymentMethod: entry.paymentMethod,
      status: entry.status,
      clientName: entry.clientName || "",
      notes: entry.notes || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { toast.error("Selecione a categoria"); return; }
    if (!form.amount) { toast.error("Informe o valor"); return; }
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: number, desc: string) => {
    if (!confirm(`Excluir o lançamento "${desc}"?`)) return;
    deleteMutation.mutate({ id });
  };

  // ── Dados para gráficos ──────────────────────────────────────────────────
  const incomeChartData = (incomeBreakdown as any[]).map(r => ({
    name: INCOME_CATEGORIES[r.category] || r.category,
    value: r.total,
  }));
  const expenseChartData = (expenseBreakdown as any[]).map(r => ({
    name: EXPENSE_CATEGORIES[r.category] || r.category,
    value: r.total,
  }));
  const historyChartData = (monthlyHistory as any[]).map(r => ({
    month: fmtMonth(r.month),
    Receitas: r.receitas,
    Despesas: r.despesas,
    Saldo: r.saldo,
  }));

  // ── Exportar PDF mensal ──────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!summary || (summary.entries as any[]).length === 0) {
      toast.error("Nenhum lançamento neste mês");
      return;
    }
    const monthLabel = fmtMonth(selectedMonth);
    const allEntries = summary.entries as any[];
    const receitas = allEntries.filter(e => e.type === "receita");
    const despesas = allEntries.filter(e => e.type === "despesa");

    const rowsReceitas = receitas.map(e => `
      <tr>
        <td>${fmtDate(e.date)}</td>
        <td>${INCOME_CATEGORIES[e.category] || e.category}</td>
        <td>${e.description}</td>
        <td>${PAYMENT_METHODS[e.paymentMethod] || e.paymentMethod}</td>
        <td style="text-align:right;color:#15803d;font-weight:bold">R$ ${parseFloat(e.amount || "0").toFixed(2)}</td>
        <td style="text-align:center">${STATUS_LABELS[e.status] || e.status}</td>
      </tr>
    `).join("");

    const rowsDespesas = despesas.map(e => `
      <tr>
        <td>${fmtDate(e.date)}</td>
        <td>${EXPENSE_CATEGORIES[e.category] || e.category}</td>
        <td>${e.description}</td>
        <td>${PAYMENT_METHODS[e.paymentMethod] || e.paymentMethod}</td>
        <td style="text-align:right;color:#b91c1c;font-weight:bold">R$ ${parseFloat(e.amount || "0").toFixed(2)}</td>
        <td style="text-align:center">${STATUS_LABELS[e.status] || e.status}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Relatório Financeiro - ${monthLabel} - BTREE Ambiental</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
        .header { background: #14532d; color: white; padding: 18px 24px; display: flex; align-items: center; gap: 18px; }
        .header img { height: 50px; }
        .header-text h1 { font-size: 20px; font-weight: bold; }
        .header-text p { font-size: 12px; opacity: 0.85; margin-top: 2px; }
        .content { padding: 20px 24px; }
        .section-title { font-size: 14px; font-weight: bold; color: #14532d; margin: 16px 0 8px; border-bottom: 2px solid #14532d; padding-bottom: 4px; }
        .subtitle { font-size: 12px; color: #555; margin-bottom: 14px; }
        .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .summary-card { border-radius: 6px; padding: 10px 16px; min-width: 130px; }
        .summary-card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
        .summary-card.red { background: #fef2f2; border: 1px solid #fecaca; }
        .summary-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
        .summary-card .label { font-size: 10px; color: #555; text-transform: uppercase; }
        .summary-card .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
        .summary-card.green .value { color: #15803d; }
        .summary-card.red .value { color: #b91c1c; }
        .summary-card.blue .value { color: #1d4ed8; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
        th { background: #14532d; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
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
          <p>Relatório Financeiro Mensal — ${monthLabel}</p>
        </div>
      </div>
      <div class="content">
        <div class="subtitle">Competência: ${monthLabel} | Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
        <div class="summary">
          <div class="summary-card green">
            <div class="label">Total Receitas</div>
            <div class="value">R$ ${(summary?.totalReceitas || 0).toFixed(2)}</div>
          </div>
          <div class="summary-card red">
            <div class="label">Total Despesas</div>
            <div class="value">R$ ${(summary?.totalDespesas || 0).toFixed(2)}</div>
          </div>
          <div class="summary-card ${(summary?.saldo || 0) >= 0 ? "blue" : "red"}">
            <div class="label">Saldo do Mês</div>
            <div class="value">R$ ${(summary?.saldo || 0).toFixed(2)}</div>
          </div>
        </div>

        ${receitas.length > 0 ? `
        <div class="section-title">Receitas (${receitas.length})</div>
        <table>
          <thead><tr>
            <th>Data</th><th>Categoria</th><th>Descrição</th>
            <th>Forma Pgto</th><th>Valor</th><th>Status</th>
          </tr></thead>
          <tbody>${rowsReceitas}</tbody>
          <tfoot><tr>
            <td colspan="4" style="text-align:right;font-weight:bold;padding:6px 8px">Total Receitas:</td>
            <td style="text-align:right;font-weight:bold;color:#15803d;padding:6px 8px">R$ ${(summary?.totalReceitas || 0).toFixed(2)}</td>
            <td></td>
          </tr></tfoot>
        </table>` : ""}

        ${despesas.length > 0 ? `
        <div class="section-title">Despesas (${despesas.length})</div>
        <table>
          <thead><tr>
            <th>Data</th><th>Categoria</th><th>Descrição</th>
            <th>Forma Pgto</th><th>Valor</th><th>Status</th>
          </tr></thead>
          <tbody>${rowsDespesas}</tbody>
          <tfoot><tr>
            <td colspan="4" style="text-align:right;font-weight:bold;padding:6px 8px">Total Despesas:</td>
            <td style="text-align:right;font-weight:bold;color:#b91c1c;padding:6px 8px">R$ ${(summary?.totalDespesas || 0).toFixed(2)}</td>
            <td></td>
          </tr></tfoot>
        </table>` : ""}
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

  const categories = form.type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Wallet className="h-7 w-7" /> Módulo Financeiro
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle de receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => handleOpenCreate("receita")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" /> Nova Receita
          </Button>
          <Button
            onClick={() => handleOpenCreate("despesa")}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 gap-2"
          >
            <ArrowDownCircle className="h-4 w-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium text-gray-600">Competência:</Label>
        <Input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> Lançamentos
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-1.5">
            <FileDown className="h-4 w-4" /> Relatório
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA DASHBOARD ───────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5 mt-4">
          {summaryLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Receitas</p>
                        <p className="text-2xl font-bold text-emerald-700">R$ {(summary?.totalReceitas || 0).toFixed(2)}</p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Despesas</p>
                        <p className="text-2xl font-bold text-red-600">R$ {(summary?.totalDespesas || 0).toFixed(2)}</p>
                      </div>
                      <TrendingDown className="h-10 w-10 text-red-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-l-4 ${(summary?.saldo || 0) >= 0 ? "border-l-blue-500" : "border-l-red-500"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Saldo do Mês</p>
                        <p className={`text-2xl font-bold ${(summary?.saldo || 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>
                          R$ {(summary?.saldo || 0).toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className={`h-10 w-10 ${(summary?.saldo || 0) >= 0 ? "text-blue-200" : "text-red-200"}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico histórico */}
              {historyChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Histórico Mensal (últimos 12 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={historyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                        <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="Receitas" fill="#16a34a" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Gráficos de pizza */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomeChartData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                        <PieChart className="h-4 w-4" /> Receitas por Categoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                          <Pie data={incomeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {incomeChartData.map((_, i) => <Cell key={i} fill={COLORS_INCOME[i % COLORS_INCOME.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
                {expenseChartData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                        <PieChart className="h-4 w-4" /> Despesas por Categoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RePieChart>
                          <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {expenseChartData.map((_, i) => <Cell key={i} fill={COLORS_EXPENSE[i % COLORS_EXPENSE.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                        </RePieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Breakdown por categoria */}
              {(incomeBreakdown as any[]).length > 0 || (expenseBreakdown as any[]).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(incomeBreakdown as any[]).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-emerald-700">Receitas por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(incomeBreakdown as any[]).map(r => (
                          <div key={r.category} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{INCOME_CATEGORIES[r.category] || r.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{r.count}x</span>
                              <span className="font-semibold text-emerald-700">R$ {r.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {(expenseBreakdown as any[]).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-red-600">Despesas por Categoria</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(expenseBreakdown as any[]).map(r => (
                          <div key={r.category} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{EXPENSE_CATEGORIES[r.category] || r.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{r.count}x</span>
                              <span className="font-semibold text-red-600">R$ {r.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Wallet className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhum lançamento neste mês</p>
                  <p className="text-sm mt-1">Clique em "Nova Receita" ou "Nova Despesa" para começar</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── ABA LANÇAMENTOS ─────────────────────────────────────────── */}
        <TabsContent value="lancamentos" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {(["all", "receita", "despesa"] as const).map(t => (
              <Button
                key={t}
                size="sm"
                variant={filterType === t ? "default" : "outline"}
                onClick={() => setFilterType(t)}
                className={filterType === t
                  ? t === "receita" ? "bg-emerald-600 text-white" : t === "despesa" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
                  : ""}
              >
                {t === "all" ? "Todos" : t === "receita" ? "Receitas" : "Despesas"}
              </Button>
            ))}
          </div>

          {entriesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (entries as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(entries as any[]).map((entry: any) => (
                <Card key={entry.id} className={`border-l-4 ${entry.type === "receita" ? "border-l-emerald-400" : "border-l-red-400"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${entry.type === "receita" ? "bg-emerald-100" : "bg-red-100"}`}>
                          {entry.type === "receita"
                            ? <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                            : <ArrowDownCircle className="h-5 w-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{entry.description}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-xs text-gray-400">{fmtDate(entry.date)}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">
                              {entry.type === "receita"
                                ? INCOME_CATEGORIES[entry.category] || entry.category
                                : EXPENSE_CATEGORIES[entry.category] || entry.category}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{PAYMENT_METHODS[entry.paymentMethod]}</span>
                            <Badge className={`text-xs ${
                              entry.status === "confirmado" ? "bg-green-100 text-green-700" :
                              entry.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {STATUS_LABELS[entry.status]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`font-bold text-lg ${entry.type === "receita" ? "text-emerald-700" : "text-red-600"}`}>
                          {entry.type === "receita" ? "+" : "-"}R$ {parseFloat(entry.amount || "0").toFixed(2)}
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={() => handleOpenEdit(entry)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={() => handleDelete(entry.id, entry.description)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic pl-12">{entry.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA RELATÓRIO ───────────────────────────────────────────── */}
        <TabsContent value="relatorio" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Relatório Financeiro Mensal</h3>
                <p className="text-sm text-gray-500">
                  Gere um PDF completo com todas as receitas e despesas do mês selecionado,
                  incluindo totais, categorias e saldo final.
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-gray-700">Competência: <span className="text-emerald-700">{fmtMonth(selectedMonth)}</span></p>
                  <p className="text-sm text-gray-500">Receitas: <span className="text-emerald-700 font-semibold">R$ {(summary?.totalReceitas || 0).toFixed(2)}</span></p>
                  <p className="text-sm text-gray-500">Despesas: <span className="text-red-600 font-semibold">R$ {(summary?.totalDespesas || 0).toFixed(2)}</span></p>
                  <p className="text-sm text-gray-500">Saldo: <span className={`font-semibold ${(summary?.saldo || 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>R$ {(summary?.saldo || 0).toFixed(2)}</span></p>
                </div>
                <Button
                  onClick={handleExportPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <FileDown className="h-4 w-4" /> Gerar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Sheet de cadastro ───────────────────────────────────────────── */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setForm({ ...emptyForm }); setEditingEntry(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className={editingEntry ? "text-gray-800" : form.type === "receita" ? "text-emerald-800" : "text-red-700"}>
              {editingEntry ? "Editar Lançamento" : form.type === "receita" ? "Nova Receita" : "Nova Despesa"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-8">
            {!editingEntry && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className={`flex-1 gap-1 ${form.type === "receita" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  onClick={() => setForm(f => ({ ...f, type: "receita", category: "" }))}
                >
                  <ArrowUpCircle className="h-4 w-4" /> Receita
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={`flex-1 gap-1 ${form.type === "despesa" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  onClick={() => setForm(f => ({ ...f, type: "despesa", category: "" }))}
                >
                  <ArrowDownCircle className="h-4 w-4" /> Despesa
                </Button>
              </div>
            )}

            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div>
              <Label>Categoria *</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione a categoria</option>
                {Object.entries(categories).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o lançamento..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="ex: 1500.00"
                  required
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <select
                  value={form.paymentMethod}
                  onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="confirmado">Confirmado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {form.type === "receita" && (
              <div>
                <Label>Cliente (opcional)</Label>
                <Input
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nome do cliente..."
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className={`flex-1 text-white ${form.type === "receita" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                ) : editingEntry ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

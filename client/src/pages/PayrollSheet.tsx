import { Fragment, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CollaboratorEditSheet from "@/components/CollaboratorEditSheet";
import CommissionModal from "@/components/CommissionModal";
import { toast } from "sonner";
import {
  Loader2, FileDown, LockOpen, CheckCircle2, Users, Wallet, Coins, Save, ChevronDown, ChevronUp, CalendarDays, Calculator,
} from "lucide-react";

// Rastreados por Presença (dias trabalhados, status semanal vem de lá). "Semanal" não conta
// dias — é pago toda sexta com valor fixo, então segue o mesmo fluxo de botão do CLT/PJ.
const DAILY_TYPES = ["diarista", "terceirizado"];

// Motorista/Terceirizado e Operador têm regra automática de comissão (por carga/destino e
// por tonelada do cliente, respectivamente) — para os demais, a comissão continua sendo um
// valor livre. Terceirizado usa a mesma regra do Motorista (por carga entregue no veículo).
// commissionAuto (do cadastro do colaborador) permite exceções individuais (ex: José Marcelo
// é operador mas tem comissão fixa, não calculada automaticamente).
function hasCommissionRule(role: string | undefined, commissionAuto?: boolean): boolean {
  return (role === "motorista" || role === "terceirizado" || role === "operador") && commissionAuto !== false;
}

function fmtWeekLabel(weekStart: string, weekEnd: string) {
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(s)} – ${fmt(e)}`;
}

const ROLE_LABELS: Record<string, string> = {
  administrativo: "Administrativo",
  encarregado: "Encarregado",
  mecanico: "Mecânico",
  motosserrista: "Motosserrista",
  carregador: "Carregador",
  operador: "Operador",
  motorista: "Motorista",
  terceirizado: "Terceirizado",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  diarista: "Diarista",
  terceirizado: "Terceirizado",
  semanal: "Semanalmente",
};

const EMPLOYMENT_BADGE: Record<string, string> = {
  clt: "bg-blue-100 text-blue-800",
  pj: "bg-purple-100 text-purple-800",
  diarista: "bg-amber-100 text-amber-800",
  terceirizado: "bg-orange-100 text-orange-800",
  semanal: "bg-teal-100 text-teal-800",
};

function fmtBRL(v: string | number | null | undefined) {
  const n = parseFloat(String(v ?? "0")) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Detalhe do desconto de combustível (Terceirizado): um abastecimento por linha, com data,
// litros e preço cobrado — usado como tooltip do valor na coluna Desconto.
function discountTooltip(records: any[] | undefined): string {
  if (!records || records.length === 0) return "";
  const lines = records.map(r => {
    const [, m, d] = String(r.date).split("-");
    return `${d}/${m} — ${r.equipmentName}: ${fmtBRL(r.liters)} L x R$ ${fmtBRL(r.precoCobrado)}/L = R$ ${fmtBRL(r.subtotal)}`;
  });
  return lines.join("\n");
}

// Quantas sextas-feiras caem no mês de referência ("YYYY-MM") — mesma regra usada no servidor
// para o tipo "Semanal" (pago toda sexta, sem contar dias trabalhados).
function countFridaysInMonth(referenceMonth: string): number {
  const [y, m] = referenceMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(y, m - 1, d).getDay() === 5) count++;
  }
  return count;
}

// Recalcula o Total da linha ao vivo, com a comissão que está sendo digitada (antes de salvar).
// Desconto (combustível de Terceirizado) sempre é subtraído do total.
function computeLiveTotal(r: any, commissionStr: string, referenceMonth: string): number {
  const commission = parseFloat(commissionStr || "0") || 0;
  const discount = parseFloat(r.discount || "0") || 0;
  const base = parseFloat(r.baseValue || "0");
  if (r.employmentType === "clt" || r.employmentType === "pj") return base + commission - discount;
  if (r.employmentType === "semanal") return base * countFridaysInMonth(referenceMonth) + commission - discount;
  return base * (r.daysWorked || 0) + commission - discount;
}

export default function PayrollSheet({ referenceMonth }: { referenceMonth: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.payroll.getMonth.useQuery({ referenceMonth });

  // Comissão editada localmente (por collaboratorId), antes de salvar
  const [commissionDrafts, setCommissionDrafts] = useState<Record<number, string>>({});

  // Colaborador cujo painel de dados (Dados Pessoais/Endereço/EPI) está aberto, sem sair da Folha
  const [viewCollaboratorId, setViewCollaboratorId] = useState<number | null>(null);

  // Linhas (diarista/terceirizado) com o detalhamento por semana expandido
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  // Linha (Motorista/Operador) cujo modal de cálculo de comissão está aberto
  const [commissionModalRow, setCommissionModalRow] = useState<any | null>(null);

  const saveEntry = trpc.payroll.saveEntry.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); },
    onError: (e) => toast.error(e.message || "Erro ao salvar"),
  });
  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); toast.success("Marcado como pago"); },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const unmarkPaid = trpc.payroll.unmarkPaid.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); toast.success("Pagamento desfeito"); },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const reopenEntry = trpc.payroll.reopenEntry.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); toast.success("Linha reaberta — voltará a ser recalculada"); },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const markWeeklyPaid = trpc.payroll.markWeeklyPaid.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); },
    onError: (e) => toast.error(e.message || "Erro"),
  });
  const unmarkWeeklyPaid = trpc.payroll.unmarkWeeklyPaid.useMutation({
    onSuccess: () => { utils.payroll.getMonth.invalidate({ referenceMonth }); },
    onError: (e) => toast.error(e.message || "Erro"),
  });

  const rows = data?.rows || [];
  const summary = data?.summary;

  const monthLabel = useMemo(() => {
    const [y, m] = referenceMonth.split("-").map(Number);
    const names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${names[(m || 1) - 1]} de ${y}`;
  }, [referenceMonth]);

  // Salva o snapshot da linha já marcando como pago (botão "Pagar" nas linhas em rascunho).
  // overrideCommission é usado pelo modal de comissão de Motorista/Operador (já vem calculado).
  const handlePayRow = (row: any, overrideCommission?: string) => {
    const commissionStr = overrideCommission ?? commissionDrafts[row.collaboratorId] ?? row.commission ?? "0";
    const commission = parseFloat(commissionStr || "0") || 0;
    const total = computeLiveTotal(row, commissionStr, referenceMonth);
    saveEntry.mutate({
      collaboratorId: row.collaboratorId,
      referenceMonth,
      commission: String(commission),
      markPaid: true,
      paidAt: new Date().toISOString().slice(0, 10),
    }, {
      onSuccess: () => toast.success(
        commission > 0
          ? `${row.name}: comissão de R$ ${fmtBRL(commission)} confirmada — total pago R$ ${fmtBRL(total)}`
          : `${row.name}: pagamento confirmado — total R$ ${fmtBRL(total)}`
      ),
    });
  };

  // Diarista/Terceirizado: pagamento é feito em Presenças, não na Folha.
  // Aqui só grava a comissão (o "Total" e o status continuam vindos do cálculo ao vivo).
  // overrideCommission é usado pelo modal de comissão de Motorista/Operador (já vem calculado).
  const handleSaveCommission = (row: any, overrideCommission?: string) => {
    const commissionStr = overrideCommission ?? commissionDrafts[row.collaboratorId] ?? row.commission ?? "0";
    const commission = parseFloat(commissionStr || "0") || 0;
    const total = computeLiveTotal(row, commissionStr, referenceMonth);
    saveEntry.mutate({
      collaboratorId: row.collaboratorId,
      referenceMonth,
      commission: String(commission),
    }, {
      onSuccess: () => toast.success(
        commission > 0
          ? `${row.name}: comissão de R$ ${fmtBRL(commission)} confirmada — novo total R$ ${fmtBRL(total)}`
          : `${row.name}: comissão zerada`
      ),
    });
  };

  const toggleWeeks = (collaboratorId: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(collaboratorId)) next.delete(collaboratorId);
      else next.add(collaboratorId);
      return next;
    });
  };

  const handleExportExcel = async () => {
    if (rows.length === 0) { toast.error("Nenhum colaborador para exportar"); return; }
    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");
      const now = new Date().toLocaleString("pt-BR");

      const wb = new ExcelJS.Workbook();
      wb.creator = "BTREE Ambiental";
      wb.created = new Date();
      const ws = wb.addWorksheet("Folha de Pagamento", {
        properties: { defaultRowHeight: 18 },
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
      });

      const GREEN_DARK = "0D4F2E";
      const GREEN_LIGHT = "F0FDF4";
      const GREEN_BORDER = "BBF7D0";
      const WHITE = "FFFFFF";
      const GRAY_BORDER = "E5E7EB";
      const GRAY_TEXT = "6B7280";

      const headers = ["Nome", "Cargo", "CPF", "Tipo de Vínculo", "Salário/Diária (R$)", "Dias Trabalhados", "Comissão (R$)", "Desconto (R$)", "Total (R$)", "Status"];
      ws.columns = [22, 16, 16, 16, 16, 14, 14, 14, 16, 14].map((w, i) => ({ key: `c${i}`, width: w }));

      ws.mergeCells(1, 1, 1, headers.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = "BTREE AMBIENTAL — FOLHA DE PAGAMENTO";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: WHITE } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 36;

      ws.mergeCells(2, 1, 2, headers.length);
      const subtitleCell = ws.getCell(2, 1);
      subtitleCell.value = `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Referência: ${monthLabel}  •  Emitido em ${now}`;
      subtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: WHITE } };
      subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 22;

      ws.getRow(3).height = 8;

      const headerRow = ws.getRow(4);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { top: { style: "thin", color: { argb: GREEN_DARK } }, bottom: { style: "thin", color: { argb: GREEN_DARK } }, left: { style: "thin", color: { argb: GREEN_DARK } }, right: { style: "thin", color: { argb: GREEN_DARK } } };
      });
      headerRow.height = 24;

      rows.forEach((r: any, idx: number) => {
        const rowNum = 5 + idx;
        const row = ws.getRow(rowNum);
        const isEven = idx % 2 === 0;
        const values = [
          r.name,
          ROLE_LABELS[r.role] || r.role || "-",
          r.cpf || "-",
          EMPLOYMENT_LABELS[r.employmentType] || r.employmentType,
          parseFloat(r.baseValue || "0"),
          r.daysWorked ?? "-",
          parseFloat(r.commission || "0"),
          parseFloat(r.discount || "0"),
          parseFloat(r.totalAmount || "0"),
          r.status === "pago" ? "Pago" : "Pendente",
        ];
        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v;
          cell.font = { name: "Arial", size: 10 };
          cell.alignment = { horizontal: i >= 4 && i <= 8 ? "right" : "left", vertical: "middle" };
          if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_LIGHT } };
          cell.border = { bottom: { style: "thin", color: { argb: GRAY_BORDER } } };
          if ([4, 6, 7, 8].includes(i) && typeof v === "number") cell.numFmt = '#,##0.00';
        });
        row.height = 20;
      });

      const totalsRowNum = 5 + rows.length;
      const totalsRow = ws.getRow(totalsRowNum);
      const totalsValues = ["TOTAIS", "", "", `${rows.length} colaborador(es)`, "", "", "", "", summary?.totalGeral || 0, ""];
      totalsValues.forEach((v, i) => {
        const cell = totalsRow.getCell(i + 1);
        cell.value = v;
        cell.font = { name: "Arial", size: 11, bold: true, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_DARK } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (i === 8 && typeof v === "number") cell.numFmt = '#,##0.00';
      });
      totalsRow.height = 26;

      const footerRowNum = totalsRowNum + 2;
      ws.mergeCells(footerRowNum, 1, footerRowNum, headers.length);
      const footerCell = ws.getCell(footerRowNum, 1);
      footerCell.value = "Desenvolvido por Kobayashi Desenvolvimento de Sistemas  •  btreeambiental.com";
      footerCell.font = { name: "Arial", size: 9, italic: true, color: { argb: GRAY_TEXT } };
      footerCell.alignment = { horizontal: "center", vertical: "middle" };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `folha-pagamento-${referenceMonth}.xlsx`);
      toast.success("Excel gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar Excel");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-gray-700">{rows.length}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Colaboradores</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-blue-700">R$ {fmtBRL(summary?.totalSalarios)}</p>
          <p className="text-xs text-gray-500">Salários (CLT/PJ)</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-amber-700">R$ {fmtBRL(summary?.totalDiarias)}</p>
          <p className="text-xs text-gray-500">Diárias/Terceiros</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">R$ {fmtBRL(summary?.totalGeral)}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Wallet className="h-3 w-3" /> Total da Folha</p>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {summary?.fechados || 0} de {rows.length} fechado(s) · {summary?.pagos || 0} pago(s) — valores não fechados são calculados ao vivo e podem mudar.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <FileDown className="h-3.5 w-3.5" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Coins className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum colaborador ativo</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cargo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CPF</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Salário/Diária</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Dias</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Comissão</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Desconto</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const isWeeklyFixed = r.employmentType === "semanal" || !!r.weeklyCommission;
                  const isDaily = DAILY_TYPES.includes(r.employmentType) && !isWeeklyFixed;
                  const isLocked = !isDaily && !isWeeklyFixed && !r.isDraft;
                  const commissionValue = commissionDrafts[r.collaboratorId] ?? r.commission ?? "0";
                  const weeks = r.weeks || [];
                  const isExpanded = expandedWeeks.has(r.collaboratorId);
                  return (
                    <Fragment key={r.collaboratorId}>
                      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium" translate="no">
                          <div className="flex items-center gap-1">
                            {(isDaily || isWeeklyFixed) && weeks.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleWeeks(r.collaboratorId)}
                                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                title="Ver detalhamento por semana"
                              >
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewCollaboratorId(r.collaboratorId)}
                              className="text-gray-800 hover:text-emerald-700 hover:underline text-left"
                              title="Abrir ficha do colaborador"
                            >
                              {r.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{ROLE_LABELS[r.role] || r.role || "—"}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{r.cpf || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge className={EMPLOYMENT_BADGE[r.employmentType] || ""}>{EMPLOYMENT_LABELS[r.employmentType] || r.employmentType}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">R$ {fmtBRL(r.baseValue)}</td>
                        <td className="py-3 px-4 text-center text-sm">{r.daysWorked ?? "—"}</td>
                        <td className="py-3 px-4 text-right">
                          {hasCommissionRule(r.role, r.commissionAuto) ? (
                            <button
                              type="button"
                              onClick={() => r.status !== "pago" && setCommissionModalRow(r)}
                              disabled={r.status === "pago"}
                              className="h-8 w-28 ml-auto flex items-center justify-end gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                              title={r.status === "pago" ? "Já pago — não é possível editar" : "Abrir cálculo de comissão"}
                            >
                              <Calculator className="h-3.5 w-3.5" /> R$ {fmtBRL(commissionValue)}
                            </button>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={commissionValue}
                              disabled={isLocked}
                              onChange={e => setCommissionDrafts(prev => ({ ...prev, [r.collaboratorId]: e.target.value }))}
                              className="h-8 w-28 text-right ml-auto"
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-red-600">
                          {parseFloat(r.discount || "0") > 0 ? (
                            <div title={discountTooltip(r.discountRecords)} className="cursor-help">
                              <div>- R$ {fmtBRL(r.discount)}</div>
                              <div className="text-[11px] text-red-400 font-normal">
                                {fmtBRL(r.discountLiters)} L
                              </div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-800">R$ {fmtBRL(computeLiveTotal(r, commissionValue, referenceMonth))}</td>
                        <td className="py-3 px-4 text-center">
                          {r.status === "pago" ? (
                            <Badge className="bg-green-100 text-green-800">Pago</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Pendente</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {(isDaily || isWeeklyFixed) ? (
                              <Button
                                size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => handleSaveCommission(r)} disabled={saveEntry.isPending}
                                title={isDaily ? "Salvar comissão (o pagamento é feito em Presenças)" : "Salvar comissão (o pagamento é feito por semana, abaixo)"}
                              >
                                <Save className="h-3 w-3" /> Salvar
                              </Button>
                            ) : (
                              <>
                                {!isLocked && (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleSaveCommission(r)} disabled={saveEntry.isPending} title="Salvar comissão sem marcar como pago">
                                      <Save className="h-3 w-3" /> Salvar
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handlePayRow(r)} disabled={saveEntry.isPending}>
                                      <CheckCircle2 className="h-3 w-3" /> Pagar
                                    </Button>
                                  </>
                                )}
                                {isLocked && r.status !== "pago" && (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => markPaid.mutate({ id: r.id, paidAt: new Date().toISOString().slice(0, 10) })} disabled={markPaid.isPending}>
                                      <CheckCircle2 className="h-3 w-3" /> Pago
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-400 hover:text-gray-600" onClick={() => reopenEntry.mutate({ id: r.id })} disabled={reopenEntry.isPending} title="Reabrir (volta a calcular ao vivo)">
                                      <LockOpen className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                {r.status === "pago" && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-400 hover:text-gray-600" onClick={() => unmarkPaid.mutate({ id: r.id })} disabled={unmarkPaid.isPending}>
                                    Desfazer Pago
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isDaily && isExpanded && weeks.length > 0 && (
                        <tr className="border-b border-gray-50 bg-gray-50/60">
                          <td colSpan={11} className="px-4 py-2">
                            <div className="flex items-center gap-2 flex-wrap pl-5">
                              <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              {weeks.map((w: any) => (
                                <span key={w.weekStart} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                  <span className="text-gray-600">Semana {fmtWeekLabel(w.weekStart, w.weekEnd)}:</span>
                                  <span className="font-medium text-gray-800">{w.days} dia{w.days !== 1 ? "s" : ""}</span>
                                  {w.allPaid ? (
                                    <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Pago</Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">Pendente</Badge>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isWeeklyFixed && isExpanded && weeks.length > 0 && (
                        <tr className="border-b border-gray-50 bg-gray-50/60">
                          <td colSpan={11} className="px-4 py-2">
                            <div className="flex items-center gap-2 flex-wrap pl-5">
                              <CalendarDays className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              {weeks.map((w: any) => (
                                <span key={w.weekStart} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                  {w.cargas !== undefined ? (
                                    <>
                                      <span className="text-gray-600">Semana {fmtWeekLabel(w.weekStart, w.weekEnd)}:</span>
                                      <span className="text-gray-500">
                                        {w.unit === "tonelada"
                                          ? `${(w.quantidade ?? 0).toFixed(2)} ton (${w.cargas} carga${w.cargas !== 1 ? "s" : ""})`
                                          : `${w.cargas} carga${w.cargas !== 1 ? "s" : ""}`}
                                      </span>
                                      {(w.desconto ?? 0) > 0 && (
                                        <span className="text-red-500" title="Desconto de combustível dessa semana">
                                          (- R$ {fmtBRL(w.desconto)} comb.)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-600">Sexta {fmtWeekLabel(w.weekStart, w.weekEnd).split(" – ")[0]}:</span>
                                  )}
                                  <span className="font-medium text-gray-800">R$ {fmtBRL(w.valor)}</span>
                                  {w.allPaid ? (
                                    <>
                                      <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Pago</Badge>
                                      <button
                                        type="button"
                                        className="text-gray-400 hover:text-gray-600 underline"
                                        onClick={() => unmarkWeeklyPaid.mutate({ collaboratorId: r.collaboratorId, weekFriday: w.friday ?? w.weekStart })}
                                        disabled={unmarkWeeklyPaid.isPending}
                                      >
                                        desfazer
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 text-green-700 hover:text-green-800 font-medium"
                                      onClick={() => markWeeklyPaid.mutate({ collaboratorId: r.collaboratorId, weekFriday: w.friday ?? w.weekStart })}
                                      disabled={markWeeklyPaid.isPending}
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Pagar
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <CollaboratorEditSheet
        open={viewCollaboratorId !== null}
        onOpenChange={(v) => { if (!v) setViewCollaboratorId(null); }}
        collaboratorId={viewCollaboratorId}
        onSaved={() => utils.payroll.getMonth.invalidate({ referenceMonth })}
      />

      <CommissionModal
        open={commissionModalRow !== null}
        onOpenChange={(v) => { if (!v) setCommissionModalRow(null); }}
        collaboratorId={commissionModalRow?.collaboratorId ?? null}
        collaboratorName={commissionModalRow?.name ?? ""}
        referenceMonth={referenceMonth}
        onApplied={(commission) => handleSaveCommission(commissionModalRow, commission)}
      />
    </div>
  );
}

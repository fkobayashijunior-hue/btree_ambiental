import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft, ChevronRight, RefreshCw, Search, AlertCircle,
  Link2, Link2Off, Settings, FileDown, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { exportMultiSheetExcel } from "@/lib/exportExcel";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const SITUACAO_LABEL: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  1: { label: "Em Aberto", variant: "outline" },
  2: { label: "Baixado",   variant: "secondary" },
  3: { label: "Liquidado", variant: "default" },
};

const STATUS_FISCAL: Record<string, { label: string; color: string }> = {
  autorizado:  { label: "Autorizada",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  cancelado:   { label: "Cancelada",   color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  pendente:    { label: "Pendente",    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  processando: { label: "Processando", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
};

const STATUS_NF_INTERNO: Record<string, { label: string; color: string }> = {
  em_aberto: { label: "Em aberto", color: "text-foreground" },
  pago:      { label: "Pago",      color: "text-emerald-600" },
  cancelado: { label: "Cancelado", color: "text-red-600" },
};

const TRACKING_LABEL: Record<string, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
function fmtPesoTon(kg?: string | number | null) {
  if (kg == null || kg === "") return "—";
  const n = typeof kg === "string" ? parseFloat(kg.replace(",", ".")) : kg;
  if (!n || isNaN(n)) return "—";
  return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ton`;
}
function fmtVolumeM3(v?: string | number | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (!n || isNaN(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m³`;
}
function fmtQuantidadeNf(quantidade?: string | number | null, unidade?: string | null) {
  if (quantidade == null || quantidade === "") return "—";
  const n = typeof quantidade === "string" ? parseFloat(quantidade.replace(",", ".")) : quantidade;
  if (n == null || isNaN(n)) return "—";
  const u = (unidade ?? "").trim().toUpperCase();
  const sufixo = u === "TON" ? "ton" : u === "M3" ? "m³" : (unidade ?? "");
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}${sufixo ? " " + sufixo : ""}`;
}

// Diferença entre a quantidade declarada na NF (unidade da própria NF: TON ou M3) e a quantidade
// registrada na carga vinculada (peso líquido convertido pra ton, ou volume em m³, conforme a
// unidade da NF) — serve pra flagar cargas onde o que saiu na nota não bate com o que foi pesado/
// medido na entrega.
function calcDiferencaNfCarga(nf: any): { diff: number | null; unidade: string } {
  const qtdNf = nf.quantidade != null && nf.quantidade !== "" ? parseFloat(String(nf.quantidade).replace(",", ".")) : null;
  if (qtdNf == null || isNaN(qtdNf)) return { diff: null, unidade: "" };
  const u = (nf.unidade ?? "").trim().toUpperCase();
  if (u === "TON") {
    const pesoKg = nf.carga_peso_kg != null && nf.carga_peso_kg !== "" ? parseFloat(String(nf.carga_peso_kg).replace(",", ".")) : null;
    if (pesoKg == null || isNaN(pesoKg)) return { diff: null, unidade: "ton" };
    return { diff: qtdNf - pesoKg / 1000, unidade: "ton" };
  }
  if (u === "M3") {
    const vol = nf.carga_volume_m3 != null && nf.carga_volume_m3 !== "" ? parseFloat(String(nf.carga_volume_m3).replace(",", ".")) : null;
    if (vol == null || isNaN(vol)) return { diff: null, unidade: "m³" };
    return { diff: qtdNf - vol, unidade: "m³" };
  }
  return { diff: null, unidade: "" };
}
const TOLERANCIA_DIFERENCA = 0.01;

function fmtMoeda(valor: string | number) {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return isNaN(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(data?: string | Date | null) {
  if (!data) return "—";
  try {
    const parsed = data instanceof Date ? data : parseISO(data);
    return format(parsed, "dd/MM/yyyy");
  } catch { return typeof data === "string" ? data : "—"; }
}
// Datas de cargo_loads (TIMESTAMP) chegam como Date com hora zero em UTC — extrai o dia/mês/ano em
// UTC (não no fuso local do navegador), senão a virada de fuso pode exibir o dia anterior. Mesma
// lógica usada em CargoControl.tsx (toISOString().slice(0,10)) pra manter os dois telas coerentes.
function fmtDataCarga(data?: string | Date | null) {
  if (!data) return "—";
  const d = data instanceof Date ? data : new Date(data);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
// Data + hora da última sincronização — o valor vem do banco como TIMESTAMP e chega aqui
// como objeto Date (via superjson). Correção pontual: essa conexão específica com o MySQL
// tem um deslocamento fixo de +3h em colunas TIMESTAMP (confirmado testando um valor
// conhecido numa transação sempre revertida — não é bug de exibição, é de leitura/escrita
// no driver/conexão). Em vez de corrigir na conexão (afetaria toda coluna TIMESTAMP do
// sistema), compensamos só aqui: subtrai as 3h "fantasma" antes de converter pro fuso real
// de Brasília. Se algum dia a conexão for corrigida na raiz, remova o `- 3h` abaixo.
const OFFSET_TIMESTAMP_CONEXAO_MS = 3 * 60 * 60 * 1000;
function fmtDataHora(v?: string | Date | null) {
  if (!v) return "—";
  try {
    const bruto = v instanceof Date ? v : parseISO(String(v));
    const corrigido = new Date(bruto.getTime() - OFFSET_TIMESTAMP_CONEXAO_MS);
    const formatado = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(corrigido);
    return formatado.replace(",", " às");
  } catch { return String(v); }
}
function fmtCnpj(cnpj?: string | null) {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return cnpj;
}

type Tab = "boletos" | "nfs" | "cargas";

// Ordenação de coluna (A-Z / Z-A para texto, Maior-Menor / Menor-Maior para número, cronológica
// pra data) — cada aba (Boletos/NFs/Cargas) mantém seu próprio estado de ordenação.
type SortState = { field: string; dir: "asc" | "desc" } | null;

function sortRows<T>(rows: T[], sort: SortState, getValue: (row: T, field: string) => string | number | null | undefined): T[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => {
    const va = getValue(a, sort.field);
    const vb = getValue(b, sort.field);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" });
  });
  if (sort.dir === "desc") sorted.reverse();
  return sorted;
}

function SortableHeader({ label, field, sort, onSort, className, align }: {
  label: string; field: string; sort: SortState; onSort: (field: string) => void;
  className?: string; align?: "right" | "center";
}) {
  const active = sort?.field === field;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground ${align === "right" ? "text-right" : align === "center" ? "text-center" : ""} ${className ?? ""}`}
      onClick={() => onSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {active ? (
          sort!.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export default function ContasAReceberPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [pesquisa, setPesquisa] = useState("");
  const [tab, setTab] = useState<Tab>("boletos");
  const [showSetup, setShowSetup] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [filtroDestinatario, setFiltroDestinatario] = useState("todos");
  const [filtroStatusNf, setFiltroStatusNf] = useState<"todos" | "em_aberto" | "pago" | "cancelado">("todos");

  // Ordenação — um estado por aba, alterna asc/desc ao clicar de novo na mesma coluna
  const [sortBoletos, setSortBoletos] = useState<SortState>(null);
  const [sortNfs, setSortNfs] = useState<SortState>(null);
  const [sortCargas, setSortCargas] = useState<SortState>(null);
  const toggleSort = (current: SortState, setSort: (s: SortState) => void) => (field: string) => {
    if (current?.field === field) setSort({ field, dir: current.dir === "asc" ? "desc" : "asc" });
    else setSort({ field, dir: "asc" });
  };

  const navMes = (delta: number) => {
    let m = mes + delta, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  // ── Sicoob ──────────────────────────────────────────────────────────────────
  const { data: summary, refetch: refetchSummary } = trpc.sicoob.summaryBoletos.useQuery(
    { mes, ano }, { refetchOnWindowFocus: false }
  );
  const { data: listData, refetch: refetchList, isLoading } = trpc.sicoob.listBoletos.useQuery(
    { mes, ano, pesquisa: pesquisa || undefined }, { refetchOnWindowFocus: false }
  );
  const { data: statusData } = trpc.sicoob.syncStatus.useQuery(undefined, { refetchOnWindowFocus: false });

  const updateValorMutation = trpc.sicoob.updateValor.useMutation({
    onSuccess: () => { refetchSummary(); refetchList(); },
    onError: () => toast.error("Falha ao atualizar valor"),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValor, setEditingValor] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (id: number, valor: string) => {
    setEditingId(id);
    setEditingValor(parseFloat(valor).toFixed(2).replace(".", ","));
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const commitEdit = (id: number) => {
    const num = parseFloat(editingValor.replace(/\./g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0) updateValorMutation.mutate({ id, valor: String(num) });
    setEditingId(null);
  };

  const syncSicoobMutation = trpc.sicoob.syncBoletos.useMutation({
    onSuccess: (res) => {
      if (res.errors?.length) toast.error(`Boletos Sicoob — erros: ${res.errors.join(" | ")}`);
      else if (res.synced > 0) toast.success(`${res.synced} boleto(s) Sicoob sincronizados`);
      else toast.info("Nenhum boleto encontrado para os CNPJs cadastrados");
      refetchSummary(); refetchList();
    },
    onError: () => toast.error("Falha ao sincronizar Sicoob"),
  });

  const boletosBrutos = listData?.boletos ?? [];
  const getBoletoValue = (b: any, field: string): string | number | null => {
    switch (field) {
      case "data_emissao": case "data_vencimento": case "data_pagamento": return b[field] ?? null;
      case "nome_pagador": return b.nome_pagador ?? "";
      case "cnpj_pagador": return b.cnpj_pagador ?? "";
      case "nf_referente": return b.nf_referente ?? "";
      case "seu_numero": return b.seu_numero ?? "";
      case "nosso_numero": return b.nosso_numero ?? "";
      case "valor": return parseFloat(b.valor ?? "0");
      case "situacao": return b.situacao ?? 0;
      default: return null;
    }
  };
  const boletos = useMemo(() => sortRows(boletosBrutos, sortBoletos, getBoletoValue), [boletosBrutos, sortBoletos]);

  // ── Conta Azul ──────────────────────────────────────────────────────────────
  const { data: caStatus, refetch: refetchCaStatus } = trpc.contaAzul.syncStatus.useQuery(
    undefined, { refetchOnWindowFocus: false }
  );
  const { data: nfData, isLoading: nfLoading, refetch: refetchNFs } = trpc.contaAzul.listNotasFiscais.useQuery(
    { mes, ano, pesquisa: pesquisa || undefined, incluirCanceladas: true },
    { refetchOnWindowFocus: false, enabled: tab === "nfs" }
  );
  const { data: nfSummary, refetch: refetchNFSummary } = trpc.contaAzul.summaryNFsSemBoleto.useQuery(
    { mes, ano }, { refetchOnWindowFocus: false }
  );

  const syncCaMutation = trpc.contaAzul.syncNotasFiscais.useMutation({
    onSuccess: (res) => {
      if (!res.success) toast.error(`NFs Conta Azul — erro: ${res.errors?.[0] ?? "Falha"}`);
      else if (res.errors?.length) toast.warning(`${res.synced} NFs sincronizadas, ${res.errors.length} erro(s)`);
      else toast.success(`${res.synced} NF(s) Conta Azul sincronizadas`);
      refetchNFs(); refetchCaStatus(); refetchNFSummary();
    },
    onError: (e) => toast.error(`Falha Conta Azul: ${e.message}`),
  });

  // Um único botão dispara os dois sincronismos (Sicoob + Conta Azul) de uma vez — cada
  // mutation já mostra seu próprio toast de resultado (sucesso/erro) via onSuccess/onError.
  const isSyncingAll = syncSicoobMutation.isPending || syncCaMutation.isPending;
  const handleSyncAll = () => {
    syncSicoobMutation.mutate();
    if (caStatus?.configurado) syncCaMutation.mutate({ mes, ano });
    else toast.info("Conta Azul não configurada — sincronizando só os boletos Sicoob. Clique em \"Configurar\" para habilitar as NFs.");
  };

  const setTokenMutation = trpc.contaAzul.setRefreshToken.useMutation({
    onSuccess: () => {
      toast.success("Token salvo com sucesso");
      setShowSetup(false);
      setSetupToken("");
      refetchCaStatus();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateStatusNfMutation = trpc.contaAzul.updateStatusNf.useMutation({
    onSuccess: () => {
      refetchNFs(); refetchNFSummary();
    },
    onError: (e) => toast.error(`Falha ao atualizar status: ${e.message}`),
  });

  const updateValorNfMutation = trpc.contaAzul.updateValorNF.useMutation({
    onSuccess: () => { refetchNFs(); refetchNFSummary(); },
    onError: () => toast.error("Falha ao atualizar valor da NF"),
  });

  const [editingNfId, setEditingNfId] = useState<number | null>(null);
  const [editingNfValor, setEditingNfValor] = useState("");
  const nfInputRef = useRef<HTMLInputElement>(null);

  const startEditNf = (id: number, valor: string) => {
    setEditingNfId(id);
    setEditingNfValor(parseFloat(valor || "0").toFixed(2).replace(".", ","));
    setTimeout(() => nfInputRef.current?.select(), 0);
  };
  const commitEditNf = (id: number) => {
    const num = parseFloat(editingNfValor.replace(/\./g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0) updateValorNfMutation.mutate({ id, valor: String(num) });
    setEditingNfId(null);
  };

  const todasNotas = nfData?.notas ?? [];

  const destinatarios = useMemo(() => {
    const nomes = new Set<string>();
    for (const nf of todasNotas) if (nf.nome_destinatario) nomes.add(nf.nome_destinatario);
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todasNotas]);

  const notasFiltradas = useMemo(() => {
    return todasNotas.filter((nf: any) => {
      if (filtroDestinatario !== "todos" && nf.nome_destinatario !== filtroDestinatario) return false;
      if (filtroStatusNf !== "todos" && nf.status_nf_interno !== filtroStatusNf) return false;
      return true;
    });
  }, [todasNotas, filtroDestinatario, filtroStatusNf]);

  const getNfValue = (nf: any, field: string): string | number | null => {
    switch (field) {
      case "data_emissao": case "data_previsao_pagamento": return nf[field] ?? null;
      case "nome_destinatario": return nf.nome_destinatario ?? "";
      case "cnpj_destinatario": return nf.cnpj_destinatario ?? "";
      case "numero_nota": return nf.numero_nota ?? "";
      case "unidade": return nf.unidade ?? "";
      case "quantidade": return nf.quantidade ? parseFloat(nf.quantidade) : null;
      case "valor_total": return parseFloat(nf.valor_total ?? "0");
      case "status_fiscal_conta_azul": return nf.status_fiscal_conta_azul ?? "";
      case "status_nf_interno": return nf.status_nf_interno ?? "";
      case "tem_boleto": return nf.tem_boleto ? 1 : 0;
      case "boleto_situacao": return nf.tem_boleto ? (nf.boleto_situacao ?? 0) : -1;
      case "carga_data_carregamento": case "carga_data_entrega": {
        const v = nf[field];
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(v);
        return isNaN(d.getTime()) ? null : d.getTime();
      }
      case "carga_placa": return nf.carga_placa ?? "";
      case "carga_motorista": return nf.carga_motorista ?? "";
      case "carga_madeira": return nf.carga_madeira ?? "";
      case "carga_volume_m3": return nf.carga_volume_m3 ? parseFloat(nf.carga_volume_m3) : null;
      case "carga_peso_kg": return nf.carga_peso_kg ? parseFloat(nf.carga_peso_kg) : null;
      case "carga_situacao": return nf.carga_situacao ?? "";
      case "diferenca_nf_carga": return calcDiferencaNfCarga(nf).diff;
      default: return null;
    }
  };
  const notas = useMemo(() => sortRows(notasFiltradas, sortNfs, getNfValue), [notasFiltradas, sortNfs]);

  const handleStatusChange = (nf: any, novoStatus: "em_aberto" | "pago" | "cancelado") => {
    if (novoStatus === "pago") {
      const hoje = new Date().toISOString().slice(0, 10);
      const dataInformada = window.prompt(
        `Data de confirmação do pagamento (AAAA-MM-DD):`,
        hoje
      );
      if (dataInformada === null) return; // usuário cancelou o prompt
      const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataInformada) ? dataInformada : hoje;
      updateStatusNfMutation.mutate({ id: nf.id, novoStatus, dataPagamentoConfirmado: dataValida });
      return;
    }
    if (novoStatus === "cancelado") {
      if (!window.confirm(`Confirma cancelar a NF ${nf.numero_nota ?? nf.id}? Ela deixará de contar nos totais.`)) return;
    }
    updateStatusNfMutation.mutate({ id: nf.id, novoStatus });
  };

  // ── Cargas Entregues a Receber (compradores sem boleto/NF, ex: Enerbio) ──────
  const { data: cargasData, isLoading: cargasLoading, refetch: refetchCargas } = trpc.buyerClients.listCargasAReceber.useQuery(
    { mes, ano, pesquisa: pesquisa || undefined }, { refetchOnWindowFocus: false }
  );
  const cargasBrutas = cargasData?.cargas ?? [];
  const getCargaValue = (c: any, field: string): string | number | null => {
    switch (field) {
      case "invoiceNumber": return c.invoiceNumber || `#${c.id}`;
      case "dataEntrega": case "vencimento": return c[field] ?? null;
      case "destinoNome": return c.destinoNome ?? "";
      case "cnpj": return c.cnpj ?? "";
      case "qtd": return c.unit === "m3" ? c.volumeM3 : c.pesoKg / 1000;
      case "precoUnit": return parseFloat(c.precoUnit ?? "0");
      case "valor": return parseFloat(c.valor ?? "0");
      case "situacao": return c.recebido ? 1 : 0;
      default: return null;
    }
  };
  const cargas = useMemo(() => sortRows(cargasBrutas, sortCargas, getCargaValue), [cargasBrutas, sortCargas]);
  const cargasSummary = cargasData?.summary;

  // Campo próprio (buyer_paid_at) — não tem relação com o "Marcar como Pago" de Controle de
  // Cargas, que controla o pagamento da BTREE ao cliente/fornecedor daquela carga.
  const markCargaRecebidaMutation = trpc.buyerClients.markCargaRecebida.useMutation({
    onSuccess: () => { refetchCargas(); toast.success("Carga marcada como recebida"); },
    onError: (e) => toast.error(`Falha: ${e.message}`),
  });
  const unmarkCargaRecebidaMutation = trpc.buyerClients.unmarkCargaRecebida.useMutation({
    onSuccess: () => { refetchCargas(); toast.success("Desfeito"); },
    onError: (e) => toast.error(`Falha: ${e.message}`),
  });

  const handleExportExcel = async () => {
    if (boletos.length === 0 && notas.length === 0 && cargas.length === 0) {
      toast.error("Nenhum dado para exportar neste período");
      return;
    }
    const periodo = `${MESES[mes - 1]}/${ano}`;
    const emitido = new Date().toLocaleString("pt-BR");
    const subtitleBase = `BTREE Empreendimentos LTDA  •  btreeambiental.com  •  Período: ${periodo}  •  Emitido em ${emitido}`;

    await exportMultiSheetExcel({
      sheets: [
        {
          sheetName: "Boletos Sicoob",
          title: "BTREE AMBIENTAL — BOLETOS SICOOB",
          subtitle: subtitleBase,
          columns: [
            { header: "Emissão", width: 14 },
            { header: "Vencimento", width: 14 },
            { header: "Pagamento", width: 14 },
            { header: "Pagador", width: 30 },
            { header: "CNPJ", width: 20 },
            { header: "NF", width: 12 },
            { header: "Seu Número", width: 16 },
            { header: "Nosso Número", width: 16 },
            { header: "Total (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
            { header: "A Receber (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
            { header: "Situação", width: 14 },
          ],
          rows: boletos.map((b: any) => {
            const sit = SITUACAO_LABEL[b.situacao] ?? SITUACAO_LABEL[1];
            const valor = parseFloat(b.valor ?? "0");
            const aRec = (b.situacao === 3 || b.situacao === 2) ? 0 : valor;
            return [
              fmtData(b.data_emissao), fmtData(b.data_vencimento), fmtData(b.data_pagamento),
              b.nome_pagador ?? "-", fmtCnpj(b.cnpj_pagador), b.nf_referente ?? "-",
              b.seu_numero ?? "-", b.nosso_numero ?? "-", valor, aRec, sit.label,
            ];
          }),
          totalsRow: ["TOTAL", "", "", `${boletos.length} boleto(s)`, "", "", "", "", boletos.reduce((s: number, b: any) => s + parseFloat(b.valor ?? "0"), 0), "", ""],
        },
        {
          sheetName: "Notas Fiscais",
          title: "BTREE AMBIENTAL — NOTAS FISCAIS (CONTA AZUL)",
          subtitle: subtitleBase,
          columns: [
            { header: "Emissão", width: 14 },
            { header: "Destinatário", width: 30 },
            { header: "Nº NF", width: 12 },
            { header: "Unidade", width: 12 },
            { header: "Quantidade", width: 14, align: "right" },
            { header: "Valor (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
            { header: "Status NF", width: 14 },
            { header: "Prev. Pagamento", width: 16 },
            { header: "Dt. Carregamento", width: 16 },
            { header: "Dt. Entrega", width: 16 },
            { header: "Placa", width: 12 },
            { header: "Motorista", width: 24 },
            { header: "Madeira", width: 14 },
            { header: "Volume", width: 12 },
            { header: "Peso", width: 12 },
            { header: "Diferença (NF x Carga)", width: 18 },
            { header: "Situação Carga", width: 16 },
          ],
          rows: notas.map((nf: any) => {
            const statusNfInfo = STATUS_NF_INTERNO[nf.status_nf_interno] ?? STATUS_NF_INTERNO.em_aberto;
            const { diff, unidade: unidadeDiff } = calcDiferencaNfCarga(nf);
            const igual = diff != null && Math.abs(diff) < TOLERANCIA_DIFERENCA;
            const diffTexto = diff == null ? "-" : `${igual ? "" : "⚠ "}${diff > 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unidadeDiff}`;
            return [
              fmtData(nf.data_emissao), nf.nome_destinatario ?? "-", nf.numero_nota ?? "-",
              nf.unidade ?? "-", fmtQuantidadeNf(nf.quantidade, nf.unidade),
              parseFloat(nf.valor_total ?? "0"), statusNfInfo.label,
              nf.tem_boleto ? "—" : fmtData(nf.data_previsao_pagamento),
              fmtDataCarga(nf.carga_data_carregamento), fmtDataCarga(nf.carga_data_entrega), nf.carga_placa ?? "-",
              nf.carga_motorista ?? "-", nf.carga_madeira ?? "-", fmtVolumeM3(nf.carga_volume_m3),
              fmtPesoTon(nf.carga_peso_kg), diffTexto, nf.carga_situacao ? (TRACKING_LABEL[nf.carga_situacao] ?? nf.carga_situacao) : "-",
            ];
          }),
          totalsRow: ["TOTAL", `${notas.length} NF(s)`, "", "", "", notas.reduce((s: number, nf: any) => s + parseFloat(nf.valor_total ?? "0"), 0), "", "", "", "", "", "", "", "", "", "", ""],
        },
        {
          sheetName: "Cargas Entregues a Receber",
          title: "BTREE AMBIENTAL — CARGAS ENTREGUES A RECEBER",
          subtitle: subtitleBase,
          columns: [
            { header: "Nº Carga", width: 14 },
            { header: "Entrega", width: 14 },
            { header: "Comprador", width: 26 },
            { header: "CNPJ", width: 20 },
            { header: "Quantidade", width: 16, align: "right" },
            { header: "Preço/Unid. (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
            { header: "Valor (R$)", width: 16, align: "right", numFmt: "#,##0.00" },
            { header: "Vencimento", width: 14 },
            { header: "Situação", width: 14 },
          ],
          rows: cargas.map((c: any) => {
            const hoje = new Date().toISOString().slice(0, 10);
            const situacao = c.recebido ? "Recebido" : c.vencimento < hoje ? "Vencido" : c.vencimento === hoje ? "Vence hoje" : "A vencer";
            const qtd = c.unit === "m3" ? c.volumeM3 : c.pesoKg / 1000;
            return [
              c.invoiceNumber || `#${c.id}`, fmtData(c.dataEntrega), c.destinoNome ?? "-", fmtCnpj(c.cnpj), `${qtd.toFixed(2)} ${c.unit === "m3" ? "m³" : "ton"}`,
              c.precoUnit, c.valor, fmtData(c.vencimento), situacao,
            ];
          }),
          totalsRow: ["TOTAL", "", "", "", `${cargas.length} carga(s)`, "", cargas.reduce((s: number, c: any) => s + c.valor, 0), "", ""],
        },
      ],
      filename: `contas-a-receber-${ano}-${String(mes).padStart(2, "0")}.xlsx`,
    });
  };

  // ── Cards (Sicoob + NFs sem boleto correspondente + Cargas entregues sem boleto/NF) ──
  const cards = [
    { label: "Vencidos (R$)",        value: (summary?.vencidos   ?? 0) + (nfSummary?.vencidos   ?? 0) + (cargasSummary?.vencidos   ?? 0), color: "text-red-600"     },
    { label: "Vencem hoje (R$)",      value: (summary?.vencemHoje ?? 0) + (nfSummary?.vencemHoje ?? 0) + (cargasSummary?.vencemHoje ?? 0), color: "text-orange-500"  },
    { label: "A vencer (R$)",         value: (summary?.aVencer    ?? 0) + (nfSummary?.aVencer    ?? 0) + (cargasSummary?.aVencer    ?? 0), color: "text-blue-600"    },
    { label: "Recebidos (R$)",        value: (summary?.recebidos  ?? 0) + (nfSummary?.recebidos  ?? 0) + (cargasSummary?.recebidos  ?? 0), color: "text-emerald-600" },
    { label: "Total do período (R$)", value: (summary?.total      ?? 0) + (nfSummary?.total       ?? 0) + (cargasSummary?.total      ?? 0), color: "text-foreground",  highlight: true },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Contas a receber</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          {tab === "nfs" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowSetup(v => !v)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Configurar
            </Button>
          )}
          {tab === "cargas" ? (
            <span className="text-xs text-muted-foreground">
              Puxado direto do Controle de Cargas — não precisa sincronizar
            </span>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncingAll}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingAll ? "animate-spin" : ""}`} />
                {isSyncingAll ? "Sincronizando..." : "Sincronizar Boletos e NFs"}
              </Button>
              {caStatus?.configurado && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => syncCaMutation.mutate({ mes, ano })}
                  disabled={syncCaMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncCaMutation.isPending ? "animate-spin" : ""}`} />
                  {syncCaMutation.isPending ? "Sincronizando..." : "Sincronizar só NFs"}
                </Button>
              )}
              {(statusData?.ultimaSincronizacao || caStatus?.ultimaSincronizacao) && (
                <span className="text-xs text-muted-foreground">
                  {statusData?.ultimaSincronizacao && `Sicoob: ${fmtDataHora(statusData.ultimaSincronizacao)}`}
                  {statusData?.ultimaSincronizacao && caStatus?.ultimaSincronizacao && " • "}
                  {caStatus?.ultimaSincronizacao && `Conta Azul: ${fmtDataHora(caStatus.ultimaSincronizacao)}`}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Setup de token Conta Azul */}
      {tab === "nfs" && showSetup && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Configurar refresh token da Conta Azul</p>
          <p className="text-xs text-muted-foreground">
            Faça o fluxo OAuth2 com a Conta Azul, obtenha o <code>refresh_token</code> inicial e cole abaixo.
            O sistema rotaciona automaticamente nas próximas renovações.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="refresh_token..."
              value={setupToken}
              onChange={e => setSetupToken(e.target.value)}
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={() => setTokenMutation.mutate({ refreshToken: setupToken })} disabled={!setupToken || setTokenMutation.isPending}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Navegação de mês + pesquisa */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[130px] text-center">{MESES[mes - 1]} de {ano}</span>
          <button className="p-1 hover:text-foreground text-muted-foreground" onClick={() => navMes(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar pagador ou CNPJ..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {tab === "nfs" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Destinatário:</span>
              <select
                className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary max-w-[220px]"
                value={filtroDestinatario}
                onChange={e => setFiltroDestinatario(e.target.value)}
              >
                <option value="todos">Todos</option>
                {destinatarios.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status NF:</span>
              <select
                className="h-9 text-sm bg-background border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                value={filtroStatusNf}
                onChange={e => setFiltroStatusNf(e.target.value as typeof filtroStatusNf)}
              >
                <option value="todos">Todos</option>
                <option value="em_aberto">Em aberto</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Cards de resumo (boletos + NFs sem boleto) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-lg border bg-card p-4 ${(c as any).highlight ? "border-primary/40 bg-primary/5" : ""}`}>
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{fmtMoeda(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: "boletos", label: "Boletos Sicoob" },
          { key: "nfs",     label: `Notas Fiscais${caStatus?.totalNFs ? ` (${caStatus.totalNFs})` : ""}` },
          { key: "cargas",  label: `Cargas Entregues a Receber${cargas.length ? ` (${cargas.length})` : ""}` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA: BOLETOS ───────────────────────────────────────────────────────── */}
      {tab === "boletos" && (
        <>
          {statusData?.totalBoletos === 0 && !isLoading && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Nenhum boleto sincronizado</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  Configure <code className="font-mono">SICOOB_CERT_PATH</code>, <code className="font-mono">SICOOB_CLIENT_ID</code> e{" "}
                  <code className="font-mono">SICOOB_NUMERO_CLIENTE</code> no <code>.env</code> e clique em "Sincronizar Sicoob".
                </p>
              </div>
            </div>
          )}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHeader label="Emissão" field="data_emissao" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-28" />
                  <SortableHeader label="Vencimento" field="data_vencimento" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-28" />
                  <SortableHeader label="Pagamento" field="data_pagamento" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-28" />
                  <SortableHeader label="Pagador" field="nome_pagador" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} />
                  <SortableHeader label="CNPJ" field="cnpj_pagador" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} />
                  <SortableHeader label="NF" field="nf_referente" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-20" />
                  <SortableHeader label="Seu Número" field="seu_numero" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-32" />
                  <SortableHeader label="Nosso Número" field="nosso_numero" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-32" />
                  <SortableHeader label="Total (R$)" field="valor" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-32" align="right" />
                  <TableHead className="text-right w-32">A receber (R$)</TableHead>
                  <SortableHeader label="Situação" field="situacao" sort={sortBoletos} onSort={toggleSort(sortBoletos, setSortBoletos)} className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!isLoading && boletos.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum boleto para {MESES[mes - 1]}/{ano}</TableCell></TableRow>
                )}
                {boletos.map((b: any) => {
                  const sit    = SITUACAO_LABEL[b.situacao] ?? SITUACAO_LABEL[1];
                  const valor  = parseFloat(b.valor ?? "0");
                  const aRec   = (b.situacao === 3 || b.situacao === 2) ? 0 : valor;
                  return (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{fmtData(b.data_emissao)}</TableCell>
                      <TableCell className="text-sm">{fmtData(b.data_vencimento)}</TableCell>
                      <TableCell className="text-sm">{fmtData(b.data_pagamento)}</TableCell>
                      <TableCell><div className="font-medium text-sm">{b.nome_pagador ?? "—"}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{fmtCnpj(b.cnpj_pagador)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{b.nf_referente ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{b.seu_numero ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{b.nosso_numero ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {editingId === b.id ? (
                          <input
                            ref={inputRef}
                            className="w-28 text-right border rounded px-1 py-0.5 text-sm font-medium bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            value={editingValor}
                            onChange={e => setEditingValor(e.target.value)}
                            onBlur={() => commitEdit(b.id)}
                            onKeyDown={e => { if (e.key === "Enter") commitEdit(b.id); if (e.key === "Escape") setEditingId(null); }}
                          />
                        ) : (
                          <span className="cursor-pointer hover:underline hover:text-primary" title="Clique para editar" onClick={() => startEdit(b.id, b.valor)}>
                            {fmtMoeda(b.valor)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{fmtMoeda(aRec)}</TableCell>
                      <TableCell>
                        <Badge variant={sit.variant} className="text-xs">{sit.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {boletos.length > 0 && (
            <p className="text-xs text-muted-foreground">{boletos.length} registro(s) • Dados sincronizados do Sicoob</p>
          )}
        </>
      )}

      {/* ── ABA: NOTAS FISCAIS ─────────────────────────────────────────────────── */}
      {tab === "nfs" && (
        <>
          {!caStatus?.configurado && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Conta Azul não configurada</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  Configure <code className="font-mono">CONTAAZUL_CLIENT_ID</code> e <code className="font-mono">CONTAAZUL_CLIENT_SECRET</code> no{" "}
                  <code>.env</code>, depois clique em <strong>Configurar</strong> para inserir o <code>refresh_token</code> inicial.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHeader label="Emissão" field="data_emissao" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-28" />
                  <SortableHeader label="Destinatário" field="nome_destinatario" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} />
                  <SortableHeader label="Nº NF" field="numero_nota" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-20" />
                  <SortableHeader label="Unidade" field="unidade" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-14" />
                  <SortableHeader label="Quantidade" field="quantidade" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-16" align="right" />
                  <SortableHeader label="Valor (R$)" field="valor_total" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-32" align="right" />
                  <SortableHeader label="Status NF" field="status_nf_interno" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-36" />
                  <SortableHeader label="Prev. Pagamento" field="data_previsao_pagamento" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-28" />
                  <SortableHeader label="Dt. Carregamento" field="carga_data_carregamento" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-28" />
                  <SortableHeader label="Dt. Entrega" field="carga_data_entrega" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-28" />
                  <SortableHeader label="Placa" field="carga_placa" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-24" />
                  <SortableHeader label="Motorista" field="carga_motorista" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} />
                  <SortableHeader label="Madeira" field="carga_madeira" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-24" />
                  <SortableHeader label="Volume" field="carga_volume_m3" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-24" align="right" />
                  <SortableHeader label="Peso" field="carga_peso_kg" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-24" align="right" />
                  <SortableHeader label="Diferença (NF x Carga)" field="diferenca_nf_carga" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-20" align="right" />
                  <SortableHeader label="Situação" field="carga_situacao" sort={sortNfs} onSort={toggleSort(sortNfs, setSortNfs)} className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfLoading && (
                  <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!nfLoading && notas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                      {caStatus?.totalNFs === 0
                        ? `Nenhuma NF para ${MESES[mes - 1]}/${ano} — clique em "Sincronizar Conta Azul"`
                        : "Nenhuma NF encontrada no filtro"}
                    </TableCell>
                  </TableRow>
                )}
                {notas.map((nf: any) => {
                  const isCancelada = nf.status_nf_interno === "cancelado";
                  return (
                    <TableRow key={nf.id} className={`hover:bg-muted/30 ${isCancelada ? "opacity-50" : ""}`}>
                      <TableCell className={`text-sm ${isCancelada ? "line-through" : ""}`}>{fmtData(nf.data_emissao)}</TableCell>
                      <TableCell><div className={`font-medium text-sm ${isCancelada ? "line-through" : ""}`}>{nf.nome_destinatario ?? "—"}</div></TableCell>
                      <TableCell className="text-sm font-mono text-xs text-muted-foreground">{nf.numero_nota ?? "—"}</TableCell>
                      <TableCell className="text-xs">{nf.unidade ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right">{fmtQuantidadeNf(nf.quantidade, nf.unidade)}</TableCell>
                      <TableCell className={`text-right font-medium text-sm ${isCancelada ? "line-through" : ""}`}>
                        {editingNfId === nf.id ? (
                          <input
                            ref={nfInputRef}
                            className="w-28 text-right border rounded px-1 py-0.5 text-sm font-medium bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            value={editingNfValor}
                            onChange={e => setEditingNfValor(e.target.value)}
                            onBlur={() => commitEditNf(nf.id)}
                            onKeyDown={e => { if (e.key === "Enter") commitEditNf(nf.id); if (e.key === "Escape") setEditingNfId(null); }}
                          />
                        ) : (
                          <span
                            className={`cursor-pointer hover:underline hover:text-primary ${isCancelada ? "pointer-events-none" : ""}`}
                            title="Clique para editar"
                            onClick={() => !isCancelada && startEditNf(nf.id, nf.valor_total)}
                          >
                            {fmtMoeda(nf.valor_total ?? "0")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <select
                          className={`text-xs font-medium bg-background border rounded px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${(STATUS_NF_INTERNO[nf.status_nf_interno] ?? STATUS_NF_INTERNO.em_aberto).color}`}
                          value={nf.status_nf_interno}
                          onChange={e => handleStatusChange(nf, e.target.value as "em_aberto" | "pago" | "cancelado")}
                          disabled={updateStatusNfMutation.isPending}
                        >
                          <option value="em_aberto">Em aberto</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                        {nf.status_nf_interno === "pago" && nf.data_pagamento_confirmado && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">em {fmtData(nf.data_pagamento_confirmado)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {nf.tem_boleto ? (
                          <span title="Usa o vencimento do boleto Sicoob">—</span>
                        ) : (
                          fmtData(nf.data_previsao_pagamento)
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{fmtDataCarga(nf.carga_data_carregamento)}</TableCell>
                      <TableCell className="text-xs">{fmtDataCarga(nf.carga_data_entrega)}</TableCell>
                      <TableCell className="text-xs font-mono">{nf.carga_placa ?? "—"}</TableCell>
                      <TableCell className="text-xs">{nf.carga_motorista ?? "—"}</TableCell>
                      <TableCell className="text-xs">{nf.carga_madeira ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right">{fmtVolumeM3(nf.carga_volume_m3)}</TableCell>
                      <TableCell className="text-xs text-right">{fmtPesoTon(nf.carga_peso_kg)}</TableCell>
                      <TableCell className="text-xs text-right">
                        {(() => {
                          const { diff, unidade } = calcDiferencaNfCarga(nf);
                          if (diff == null) return <span className="text-muted-foreground">—</span>;
                          const igual = Math.abs(diff) < TOLERANCIA_DIFERENCA;
                          return (
                            <span className={igual ? "text-muted-foreground" : "font-semibold text-red-600 dark:text-red-400"}>
                              {diff > 0 ? "+" : ""}{diff.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {unidade}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {nf.carga_situacao ? (
                          <span className={`px-2 py-0.5 rounded-full ${
                            nf.carga_situacao === "entregue" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : nf.carga_situacao === "cancelado" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          }`}>
                            {TRACKING_LABEL[nf.carga_situacao] ?? nf.carga_situacao}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {notas.length > 0 && (
            <p className="text-xs text-muted-foreground">{notas.length} NF(s) • Dados da Conta Azul • "Status NF" é controle manual interno</p>
          )}
        </>
      )}

      {/* ── ABA: CARGAS ENTREGUES A RECEBER ───────────────────────────────────── */}
      {tab === "cargas" && (
        <>
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 text-sm">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-blue-800 dark:text-blue-300">
              Cargas entregues para compradores <strong>sem boleto ou NF</strong> (configurado no cadastro do comprador em
              "Prazo de pagamento após entrega"). Vencimento = data da entrega + esse prazo.
            </p>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHeader label="Nº Carga" field="invoiceNumber" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-24" />
                  <SortableHeader label="Entrega" field="dataEntrega" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-28" />
                  <SortableHeader label="Comprador" field="destinoNome" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} />
                  <SortableHeader label="CNPJ" field="cnpj" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} />
                  <SortableHeader label="Qtd." field="qtd" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-28" align="right" />
                  <SortableHeader label="Preço/Unid." field="precoUnit" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-28" align="right" />
                  <SortableHeader label="Valor (R$)" field="valor" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-32" align="right" />
                  <SortableHeader label="Vencimento" field="vencimento" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-28" />
                  <SortableHeader label="Situação" field="situacao" sort={sortCargas} onSort={toggleSort(sortCargas, setSortCargas)} className="w-32" />
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargasLoading && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!cargasLoading && cargas.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhuma carga a receber para {MESES[mes - 1]}/{ano}</TableCell></TableRow>
                )}
                {cargas.map((c: any) => {
                  const hoje = new Date().toISOString().slice(0, 10);
                  const recebido = c.recebido;
                  const situacao = recebido
                    ? { label: "Recebido", variant: "default" as const }
                    : c.vencimento < hoje
                      ? { label: "Vencido", variant: "destructive" as const }
                      : c.vencimento === hoje
                        ? { label: "Vence hoje", variant: "outline" as const }
                        : { label: "A vencer", variant: "secondary" as const };
                  const qtd = c.unit === "m3" ? c.volumeM3 : c.pesoKg / 1000;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{c.invoiceNumber || `#${c.id}`}</TableCell>
                      <TableCell className="text-sm">{fmtData(c.dataEntrega)}</TableCell>
                      <TableCell><div className="font-medium text-sm">{c.destinoNome}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">{fmtCnpj(c.cnpj)}</TableCell>
                      <TableCell className="text-right text-sm">{qtd.toFixed(2)} {c.unit === "m3" ? "m³" : "ton"}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{fmtMoeda(c.precoUnit)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmtMoeda(c.valor)}</TableCell>
                      <TableCell className="text-sm">{fmtData(c.vencimento)}</TableCell>
                      <TableCell>
                        <Badge variant={situacao.variant} className="text-xs">{situacao.label}</Badge>
                        {recebido && c.buyerPaidAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">em {fmtData(c.buyerPaidAt)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {recebido ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => unmarkCargaRecebidaMutation.mutate({ id: c.id })} disabled={unmarkCargaRecebidaMutation.isPending}>
                            Desfazer
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => markCargaRecebidaMutation.mutate({ id: c.id })} disabled={markCargaRecebidaMutation.isPending}>
                            Marcar Recebido
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {cargas.length > 0 && (
            <p className="text-xs text-muted-foreground">{cargas.length} carga(s) • Dados do Controle de Cargas</p>
          )}
        </>
      )}
    </div>
  );
}

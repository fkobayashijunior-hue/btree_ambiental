// @ts-nocheck
// Aba "Custos": lista simples (cartões no celular) de gastos lançados, com filtros básicos e botão "+ Novo gasto".
import { Fragment, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, FileDown, RefreshCw, Upload, Paperclip, Plus, Search, Undo2, Ban, Trash2, CheckCircle2, CornerUpLeft, ChevronDown } from "lucide-react";
import { exportStyledExcel } from "@/lib/exportExcel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ImportarCustosDialog from "./ImportarCustosDialog";
import CustoFormSheet, { FORMAS } from "./CustoFormSheet";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "-");
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const formaLabel = (v?: string | null) => FORMAS.find((f) => f.v === v)?.l ?? "";
const CENTROS = ["Financeiro/Administrativo", "Produção", "Logístico"];

// Célula que vira campo de edição ao clicar (só quando "ativo"). Enter ou sair do campo salva; Esc cancela.
function CelulaEdit({ ativo, tipo, valor, opcoes, onSave, className, children }: any) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState("");
  const [cancelou, setCancelou] = useState(false);
  if (!ativo) return <TableCell className={className}>{children}</TableCell>;
  if (!edit) {
    return (
      <TableCell className={`${className ?? ""} cursor-pointer hover:bg-amber-50`} title="Clique para editar"
        onClick={() => { setV(valor == null ? "" : String(valor)); setCancelou(false); setEdit(true); }}>{children}</TableCell>
    );
  }
  const concluir = (salvar: boolean) => {
    setEdit(false);
    if (salvar && !cancelou && v !== (valor == null ? "" : String(valor))) onSave(v === "" ? null : v);
  };
  return (
    <TableCell className={className}>
      {tipo === "select" ? (
        <select autoFocus value={v} className="h-8 rounded-md border border-input bg-background px-1 text-sm"
          onChange={(e) => { setEdit(false); if (e.target.value !== (valor == null ? "" : String(valor))) onSave(e.target.value === "" ? null : e.target.value); }}
          onBlur={() => setEdit(false)}>
          {(opcoes ?? []).map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <Input autoFocus type={tipo === "data" ? "date" : "text"} value={v} onChange={(e) => setV(e.target.value)} className="h-8 min-w-28 px-2 text-sm"
          onBlur={() => concluir(true)}
          onKeyDown={(e) => { if (e.key === "Enter") concluir(true); if (e.key === "Escape") { setCancelou(true); setEdit(false); } }} />
      )}
    </TableCell>
  );
}

export default function CustosTab() {
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [plantaId, setPlantaId] = useState<number | undefined>();
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [tipo, setTipo] = useState<"fixo" | "variavel" | undefined>();
  const [centroCustoF, setCentroCustoF] = useState<string | undefined>();
  const [tipoCustoF, setTipoCustoF] = useState<string | undefined>();
  const [busca, setBusca] = useState("");
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [importando, setImportando] = useState(false);
  const [pagando, setPagando] = useState<{ item: any; data: string } | null>(null);
  const [conferindo, setConferindo] = useState<{ item: any; centro: string; tipoCusto: string } | null>(null);
  const [escolhendoCartao, setEscolhendoCartao] = useState<{ item: any; forma: "cartao_credito" | "cartao_debito" } | null>(null);
  const [agrupar, setAgrupar] = useState<"lista" | "dia" | "semana">("lista");
  const [dataBase, setDataBase] = useState<"gasto" | "vencimento">("vencimento"); // uma data só: o vencimento
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [semPlanta, setSemPlanta] = useState(false);
  const [plantaLote, setPlantaLote] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [conferencia, setConferencia] = useState<"pendente" | "conferido" | "devolvido" | undefined>();
  const [form, setForm] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });

  const utils = trpc.useUtils();
  const plantas = trpc.custos.plantas.useQuery();
  const colabs = trpc.custos.colaboradores.useQuery();
  const cartoes = trpc.custos.cartoes.useQuery();
  const categorias = trpc.custos.categorias.useQuery({ incluirInativas: true });
  const dados = trpc.custos.listar.useQuery({ mes, ano, plantaId, categoriaId, tipo, status, busca: busca.trim() || undefined, conferencia, semPlanta: semPlanta || undefined, base: dataBase, centroCusto: centroCustoF as any, tipoCusto: tipoCustoF as any });
  const atualizarPedagios = trpc.custos.atualizarPedagios.useMutation({
    onSuccess: (r) => { utils.custos.listar.invalidate(); toast.success(r.criados > 0 ? `${r.criados} pedágio(s) trazido(s) do extrato` : "Nenhum pedágio novo no extrato"); },
    onError: (e) => toast.error(e.message),
  });
  const atribuirPlanta = trpc.custos.atribuirPlanta.useMutation({
    onSuccess: (r) => { utils.custos.listar.invalidate(); setPlantaLote(""); toast.success(`Local atribuído a ${r.atualizados} gasto(s)`); },
    onError: (e) => toast.error(e.message),
  });
  const minha = trpc.custos.minhaConferencia.useQuery();
  const podeConferir = !!minha.data?.podeConferir;
  const conferir = trpc.custos.conferir.useMutation({
    onSuccess: (_, v) => { utils.custos.listar.invalidate(); toast.success(v.resultado === "conferido" ? "Gasto conferido" : "Gasto devolvido para correção"); },
    onError: (e) => toast.error(e.message),
  });
  const cancelarSerie = trpc.custos.cancelarSerie.useMutation({
    onSuccess: (r) => { utils.custos.listar.invalidate(); toast.success(`${r.cancelados} lançamento(s) cancelado(s)`); },
    onError: (e) => toast.error(e.message),
  });
  const cancelar = (i: any) => {
    if (i.serieId && confirm("Este gasto se repete todo mês. Cancelar também os próximos meses que ainda não foram pagos?\n\nOK = este e os próximos\nCancelar = escolher só este")) {
      cancelarSerie.mutate({ id: i.id });
      return;
    }
    if (confirm("Cancelar só este gasto? Ele sai dos totais, mas pode ser restaurado.")) alterar.mutate({ id: i.id, status: "cancelado" });
  };
  // Exclusão definitiva: só administrador, e não vale para pedágios do extrato (para esses, Cancelar)
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const excluirMut = trpc.custos.excluir.useMutation({
    onSuccess: (r) => { utils.custos.listar.invalidate(); toast.success(r.excluidos > 1 ? `${r.excluidos} lançamentos excluídos` : "Gasto excluído"); },
    onError: (e) => toast.error(e.message),
  });
  const podeExcluir = (i: any) => isAdmin && i.origem !== "extrato_pedagio";
  const excluir = (i: any) => {
    if (!confirm(`Excluir DEFINITIVAMENTE "${i.descricao}" (${moeda(i.valor)})?\n\nIsso não pode ser desfeito. Se você só quer tirar dos totais, use "Cancelar".`)) return;
    const serie = !!i.serieId && confirm("Este gasto se repete todo mês. Excluir também os próximos meses que ainda não foram pagos?\n\nOK = este e os próximos\nCancelar = só este");
    excluirMut.mutate({ id: i.id, serie });
  };
  const botaoExcluir = (i: any) => (
    <Button size="sm" variant="ghost" title="Excluir definitivamente" className="h-7 px-2 text-gray-400 hover:text-red-700" disabled={excluirMut.isPending} onClick={() => excluir(i)}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
  const devolver = (id: number) => {
    const motivo = window.prompt("O que precisa ser corrigido?");
    if (motivo && motivo.trim()) conferir.mutate({ ids: [id], resultado: "devolvido", motivo: motivo.trim() });
  };
  const alterar = trpc.custos.alterarStatus.useMutation({
    onSuccess: () => utils.custos.listar.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const itens = dados.data?.itens ?? [];
  const resumo = dados.data?.resumo;

  const navMes = (d: number) => {
    let m = mes + d, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  const exportar = async () => {
    if (!itens.length) return toast.error("Nenhum gasto para exportar");
    await exportStyledExcel({
      title: "BTREE AMBIENTAL — CUSTOS LANÇADOS",
      subtitle: `Período: ${MESES[mes - 1]}/${ano}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
      sheetName: "Custos",
      columns: [
        { header: "Vencimento", width: 14 }, { header: "Pagamento", width: 14 }, { header: "Descrição", width: 36 }, { header: "Complemento", width: 28 },
        { header: "Nº Documento", width: 16 }, { header: "Grupo", width: 18 }, { header: "Centro de Custo", width: 22 }, { header: "Categoria", width: 20 }, { header: "Custo", width: 16 },
        { header: "Valor (R$)", width: 16, align: "right", numFmt: "#,##0.00" }, { header: "Situação", width: 14 },
        { header: "Local", width: 20 }, { header: "Fixo/Variável", width: 14 }, { header: "Quem gastou", width: 22 },
        { header: "Como pagou", width: 18 }, { header: "Cartão", width: 18 }, { header: "Conferência", width: 16 },
      ],
      rows: itens.filter((i) => i.status !== "cancelado").map((i) => [
        dataBR(i.dataVencimento ?? i.dataCompetencia), i.status === "pago" ? dataBR(i.dataPagamento) : "-", i.descricao, i.observacoes ?? "-",
        i.nfNumero ?? "-", i.tipo === "fixo" ? "Despesas Fixas" : "Despesas Variáveis", i.centroCusto ?? "-", i.categoriaNome, i.tipoCusto === "direto" ? "Custo Direto" : i.tipoCusto === "indireto" ? "Custo Indireto" : "-",
        i.valor, i.status === "pago" ? "Pago" : i.dataVencimento && i.dataVencimento < hojeLocal() ? "Vencido" : "A pagar",
        i.plantaNome ?? "-", i.tipo === "fixo" ? "Fixo" : "Variável", i.gastoPorNome ?? "-",
        formaLabel(i.formaPagamento) || "-", i.cartaoNome ?? "-",
        i.conferencia === "conferido" ? "Conferido" : i.conferencia === "devolvido" ? "Devolvido" : "Aguardando",
      ]),
      totalsRow: ["TOTAL", "", `${resumo?.quantidade ?? 0} gasto(s)`, "", "", "", "", "", resumo?.total ?? 0, "", "", "", "", "", "", "", ""],
      filename: `custos-${ano}-${String(mes).padStart(2, "0")}.xlsx`,
    });
  };

  // ── Agrupamento por dia / semana (semana de segunda a domingo) ──
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const somaDias = (d: string, n: number) => { const [a, m, dd] = d.split("-").map(Number); const t = new Date(Date.UTC(a, m - 1, dd + n)); return t.toISOString().slice(0, 10); };
  const segunda = (d: string) => { const [a, m, dd] = d.split("-").map(Number); const dow = (new Date(Date.UTC(a, m - 1, dd)).getUTCDay() + 6) % 7; return somaDias(d, -dow); };
  const dataDe = (i: any) => (dataBase === "vencimento" ? i.dataVencimento : i.dataCompetencia) as string | null;
  const grupos = (() => {
    if (agrupar === "lista") return [];
    const mapa = new Map<string, any>();
    for (const i of itens) {
      const d = dataDe(i);
      if (!d) continue;
      const chave = agrupar === "dia" ? d : segunda(d);
      const g = mapa.get(chave) ?? mapa.set(chave, { chave, itens: [], total: 0, qtd: 0, aPagar: 0, qtdAPagar: 0 }).get(chave);
      g.itens.push(i);
      if (i.status !== "cancelado") {
        g.total += i.valor; g.qtd += 1;
        if (i.status === "pendente") { g.aPagar += i.valor; g.qtdAPagar += 1; }
      }
    }
    const lista = Array.from(mapa.values());
    // por vencimento: do mais próximo para o mais distante (o que vem a pagar); por gasto: mais recente primeiro
    lista.sort((a, b) => (dataBase === "vencimento" ? a.chave.localeCompare(b.chave) : b.chave.localeCompare(a.chave)));
    return lista;
  })();
  const tituloGrupo = (g: any) => {
    if (agrupar === "dia") { const [a, m, d] = g.chave.split("-").map(Number); return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${dataBR(g.chave)}`; }
    return `Semana de ${dataBR(g.chave).slice(0, 5)} a ${dataBR(somaDias(g.chave, 6)).slice(0, 5)}`;
  };
  const chaveAberta = (g: any) => `${agrupar}:${dataBase}:${g.chave}`;
  const aberto = (g: any) => abertos.has(chaveAberta(g));
  const alternarGrupo = (g: any) => setAbertos((s) => { const n = new Set(s); const k = chaveAberta(g); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const expandirTudo = () => setAbertos(new Set(grupos.map(chaveAberta)));
  const recolherTudo = () => setAbertos(new Set());
  const resumoGrupo = (g: any) => (
    <>
      <span className="text-xs text-gray-500">{g.qtd} gasto(s)</span>
      <span className="ml-auto text-sm font-semibold">{moeda(g.total)}</span>
      {g.qtdAPagar > 0
        ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">A pagar {moeda(g.aPagar)} ({g.qtdAPagar})</span>
        : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Nada a pagar</span>}
    </>
  );

  const linhaTabela = (i: any) => {
    const cancelado = i.status === "cancelado";
    return (
                  <TableRow key={i.id} className={cancelado ? "opacity-50" : i.conferencia === "devolvido" ? "bg-red-50/60" : ""}>
                    <CelulaEdit ativo={ed(i, "dataVencimento")} tipo="data" valor={i.dataVencimento ?? i.dataCompetencia} onSave={(v: any) => salvarCampo(i, "dataVencimento", v)} className="whitespace-nowrap">{dataBR(i.dataVencimento ?? i.dataCompetencia)}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "dataPagamento")} tipo="data" valor={i.status === "pago" ? i.dataPagamento : ""} onSave={(v: any) => salvarCampo(i, "dataPagamento", v)} className="whitespace-nowrap">{i.status === "pago" ? <span className="text-emerald-700">{dataBR(i.dataPagamento)}</span> : "-"}</CelulaEdit>
                    <TableCell className="max-w-72">
                      <button type="button" className="text-left hover:underline" onClick={() => !cancelado && setForm({ open: true, item: i })}>
                        <span className={cancelado ? "line-through" : "font-medium"}>{i.descricao}</span>
                      </button>
                      {(cancelado || i.origem === "extrato_pedagio") && (
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                        {i.origem === "extrato_pedagio" && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">Do extrato</span>}
                        {cancelado && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Cancelado</span>}
                        </div>
                      )}
                      {!cancelado && i.conferencia === "devolvido" && i.conferenciaObs && (
                        <p className="mt-1 text-xs text-red-700">Corrigir: {i.conferenciaObs}</p>
                      )}
                    </TableCell>
                    <CelulaEdit ativo={ed(i, "observacoes")} tipo="texto" valor={i.observacoes} onSave={(v: any) => salvarCampo(i, "observacoes", v)} className="max-w-48 truncate">{i.observacoes || "-"}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "nfNumero")} tipo="texto" valor={i.nfNumero} onSave={(v: any) => salvarCampo(i, "nfNumero", v)} className="whitespace-nowrap">{i.nfNumero || "-"}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "tipo")} tipo="select" opcoes={opGrupo} valor={i.tipo} onSave={(v: any) => salvarCampo(i, "tipo", v)} className="whitespace-nowrap">{i.tipo === "fixo" ? "Despesas Fixas" : "Despesas Variáveis"}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "centroCusto")} tipo="select" opcoes={opCentros} valor={i.centroCusto ?? ""} onSave={(v: any) => salvarCampo(i, "centroCusto", v)} className="whitespace-nowrap">{i.centroCusto || <span className="text-gray-400">definir</span>}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "categoriaId")} tipo="select" opcoes={opCategorias} valor={String(i.categoriaId)} onSave={(v: any) => salvarCampo(i, "categoriaId", v)}>{i.categoriaNome}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "tipoCusto")} tipo="select" opcoes={opTipoCusto} valor={i.tipoCusto ?? ""} onSave={(v: any) => salvarCampo(i, "tipoCusto", v)} className="whitespace-nowrap">{i.tipoCusto === "direto" ? "Custo Direto" : i.tipoCusto === "indireto" ? "Custo Indireto" : <span className="text-gray-400">definir</span>}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "plantaId")} tipo="select" opcoes={opLocais} valor={i.plantaId == null ? "" : String(i.plantaId)} onSave={(v: any) => salvarCampo(i, "plantaId", v)}>{i.plantaNome ?? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Sem local</span>}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "gastoPorColaboradorId")} tipo="select" opcoes={opColabs} valor={String(colabDe(i)?.id ?? "")} onSave={(v: any) => salvarCampo(i, "gastoPorColaboradorId", v)}>{i.gastoPorNome ?? "-"}</CelulaEdit>
                    <CelulaEdit ativo={ed(i, "formaPagamento")} tipo="select" opcoes={opFormas} valor={i.formaPagamento ?? ""} onSave={(v: any) => escolherForma(i, v)}>{formaLabel(i.formaPagamento) || "-"}{i.cartaoNome ? ` · ${i.cartaoNome}` : ""}</CelulaEdit>
                    <TableCell>
                      {i.nfUrl ? (
                        <a href={i.nfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline"><Paperclip className="h-3.5 w-3.5" /> {i.nfNumero || "Ver"}</a>
                      ) : i.nfNumero ? i.nfNumero : !cancelado ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">Sem nota</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {cancelado ? "-" : i.conferencia === "conferido" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {i.conferidoPorNome ?? "Conferido"}</span>
                      ) : i.conferencia === "devolvido" ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Corrigir</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Aguardando</span>
                      )}
                    </TableCell>
                    <CelulaEdit ativo={ed(i, "valor")} tipo="texto" valor={String(i.valor).replace(".", ",")} onSave={(v: any) => salvarCampo(i, "valor", v)} className="whitespace-nowrap text-right font-semibold">{moeda(i.valor)}</CelulaEdit>
                    <TableCell className="whitespace-nowrap">
                      {cancelado ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Cancelado</span>
                        : i.status === "pago" ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Pago</span>
                        : i.dataVencimento && i.dataVencimento < hojeLocal() ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Vencido</span>
                        : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">A pagar</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {cancelado ? (
                          <>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => alterar.mutate({ id: i.id, status: "pago" })}><Undo2 className="h-3 w-3" /> Restaurar</Button>
                          {podeExcluir(i) && botaoExcluir(i)}
                          </>
                        ) : (
                          <>
                            {podeConferir && i.conferencia !== "conferido" && (
                              <Button size="sm" title="Conferir" className="h-7 bg-emerald-600 px-2 text-white hover:bg-emerald-700" disabled={conferir.isPending}
                                onClick={() => iniciarConferencia(i)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                            )}
                            {podeConferir && i.conferencia !== "devolvido" && (
                              <Button size="sm" variant="outline" title="Devolver para correção" className="h-7 px-2" disabled={conferir.isPending} onClick={() => devolver(i.id)}><CornerUpLeft className="h-3.5 w-3.5" /></Button>
                            )}
                            {i.status === "pendente" && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPagando({ item: i, data: hojeLocal() })}>Marcar pago</Button>
                            )}
                            <Button size="sm" variant="ghost" title="Cancelar gasto" className="h-7 px-2 text-gray-400 hover:text-red-600"
                              onClick={() => cancelar(i)}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                            {podeExcluir(i) && botaoExcluir(i)}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
    );
  };
  const cartao = (i: any) => {
    const cancelado = i.status === "cancelado";
    return (
              <li key={i.id} className={`rounded-xl border bg-white p-3 ${cancelado ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => !cancelado && setForm({ open: true, item: i })}>
                    <p className={`truncate font-medium ${cancelado ? "line-through" : ""}`}>{i.descricao}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {dataBR(i.dataVencimento ?? i.dataCompetencia)} · {i.plantaNome ?? "Sem local"} · {i.categoriaNome}
                      {i.gastoPorNome ? ` · ${i.gastoPorNome}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span className={`rounded-full px-2 py-0.5 ${i.tipo === "fixo" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>{i.tipo === "fixo" ? "Fixo" : "Variável"}</span>
                      {i.status === "pendente" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">A pagar{i.dataVencimento ? ` · vence ${dataBR(i.dataVencimento)}` : ""}</span>}
                      {i.status === "pago" && i.dataPagamento && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Pago em {dataBR(i.dataPagamento)}</span>}
                      {!cancelado && i.conferencia === "conferido" && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Conferido{i.conferidoPorNome ? ` por ${i.conferidoPorNome}` : ""}</span>}
                      {!cancelado && i.conferencia === "pendente" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Aguardando conferência</span>}
                      {!cancelado && i.conferencia === "devolvido" && <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">Corrigir</span>}
                      {cancelado && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Cancelado</span>}
                      {i.formaPagamento && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{formaLabel(i.formaPagamento)}{i.cartaoNome ? ` · ${i.cartaoNome}` : ""}</span>}
                      {i.nfUrl ? (
                        <a href={i.nfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"><Paperclip className="h-3 w-3" /> Nota</a>
                      ) : !cancelado && !i.nfNumero ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">Sem nota</span>
                      ) : null}
                    </div>
                    {!cancelado && i.conferencia === "devolvido" && i.conferenciaObs && (
                      <p className="mt-1 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Para corrigir: {i.conferenciaObs}. Toque para alterar e salvar de novo.</p>
                    )}
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    <p className="whitespace-nowrap text-base font-bold">{moeda(i.valor)}</p>
                    {cancelado ? (
                      <>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => alterar.mutate({ id: i.id, status: "pago" })}><Undo2 className="h-3 w-3" /> Restaurar</Button>
                      {podeExcluir(i) && botaoExcluir(i)}
                      </>
                    ) : (
                      <>
                        {podeConferir && i.conferencia !== "conferido" && (
                          <Button size="sm" className="h-7 gap-1 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700" disabled={conferir.isPending}
                            onClick={() => iniciarConferencia(i)}><CheckCircle2 className="h-3 w-3" /> Conferir</Button>
                        )}
                        {podeConferir && i.conferencia !== "devolvido" && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={conferir.isPending} onClick={() => devolver(i.id)}><CornerUpLeft className="h-3 w-3" /> Devolver</Button>
                        )}
                        {i.status === "pendente" && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPagando({ item: i, data: hojeLocal() })}>Marcar pago</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-gray-400 hover:text-red-600"
                          onClick={() => cancelar(i)}>
                          <Ban className="h-3 w-3" /> Cancelar
                        </Button>
                        {podeExcluir(i) && botaoExcluir(i)}
                      </>
                    )}
                  </div>
                </div>
              </li>
    );
  };
  const blocosTabela = () => agrupar === "lista" ? itens.map(linhaTabela) : grupos.map((g) => (
    <Fragment key={chaveAberta(g)}>
      <TableRow className="cursor-pointer bg-gray-50 hover:bg-gray-100" onClick={() => alternarGrupo(g)}>
        <TableCell colSpan={17}>
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-4 w-4 shrink-0 transition ${aberto(g) ? "" : "-rotate-90"}`} />
            <span className="font-semibold capitalize">{tituloGrupo(g)}</span>
            {resumoGrupo(g)}
          </div>
        </TableCell>
      </TableRow>
      {aberto(g) && g.itens.map(linhaTabela)}
    </Fragment>
  ));
  const blocosCartao = () => agrupar === "lista" ? itens.map(cartao) : grupos.map((g) => (
    <li key={chaveAberta(g)} className="list-none space-y-2">
      <button type="button" onClick={() => alternarGrupo(g)} className="flex w-full flex-wrap items-center gap-2 rounded-xl border bg-gray-50 p-3 text-left">
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${aberto(g) ? "" : "-rotate-90"}`} />
        <span className="font-semibold capitalize">{tituloGrupo(g)}</span>
        {resumoGrupo(g)}
      </button>
      {aberto(g) && <ul className="space-y-2">{g.itens.map(cartao)}</ul>}
    </li>
  ));

  // Já tem centro de custo: confere direto. Sem centro de custo: pergunta (escolha manual) antes de conferir.
  const iniciarConferencia = (i: any) => {
    if (i.centroCusto) conferir.mutate({ ids: [i.id], resultado: "conferido", centroCusto: i.centroCusto });
    else setConferindo({ item: i, centro: "", tipoCusto: i.tipoCusto ?? "" });
  };
  const editarCampoMut = trpc.custos.editarCampo.useMutation({
    onSuccess: () => { utils.custos.listar.invalidate(); toast.success("Salvo"); },
    onError: (e) => toast.error(e.message),
  });
  const salvarCampo = (i: any, campo: string, valor: any) => editarCampoMut.mutate({ id: i.id, campo, valor });
  const CAMPOS_PEDAGIO = ["plantaId", "observacoes", "nfNumero", "centroCusto", "tipoCusto"];
  const ed = (i: any, campo: string) => podeConferir && i.status !== "cancelado" && (i.origem !== "extrato_pedagio" || CAMPOS_PEDAGIO.includes(campo));
  const opColabs = [{ v: "", l: "Não informado" }, ...(colabs.data ?? []).map((c) => ({ v: String(c.id), l: c.nome }))];
  const colabDe = (i: any) => (colabs.data ?? []).find((c) => c.nome.toLowerCase() === String(i.gastoPorNome ?? "").trim().toLowerCase());
  const opCategorias = (categorias.data ?? []).filter((c) => c.ativa && !c.automatica).map((c) => ({ v: String(c.id), l: c.nome }));
  const opLocais = [{ v: "", l: "Sem local" }, ...(plantas.data ?? []).map((p) => ({ v: String(p.id), l: p.nome }))];
  const opFormas = [{ v: "", l: "Não informado" }, ...FORMAS.map((f) => ({ v: f.v, l: f.l }))];
  // Escolheu cartão de crédito/débito: abre uma subjanela para dizer qual cartão
  const escolherForma = (i: any, v: string | null) => {
    if (v === "cartao_credito" || v === "cartao_debito") setEscolhendoCartao({ item: i, forma: v });
    else salvarCampo(i, "formaPagamento", v);
  };
  const opTipoCusto = [{ v: "", l: "Não definido" }, { v: "direto", l: "Custo Direto" }, { v: "indireto", l: "Custo Indireto" }];
  const opCentros = [{ v: "", l: "Não definido" }, ...CENTROS.map((c) => ({ v: c, l: c }))];
  const opGrupo = [{ v: "fixo", l: "Despesas Fixas" }, { v: "variavel", l: "Despesas Variáveis" }];
  const select = "h-10 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-4 pb-24">
      {/* Mês */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navMes(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-36 text-center text-base font-semibold">{MESES[mes - 1]} {ano}</span>
          <Button variant="outline" size="icon" onClick={() => navMes(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
        {podeConferir && <Button variant="outline" size="sm" className="gap-1" disabled={atualizarPedagios.isPending} onClick={() => atualizarPedagios.mutate({ mes, ano })}><RefreshCw className={`h-4 w-4 ${atualizarPedagios.isPending ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Atualizar pedágios</span></Button>}
        {podeConferir && <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportando(true)}><Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importar planilha</span></Button>}
        <Button variant="outline" size="sm" className="gap-1" onClick={exportar}><FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Excel</span></Button>
        </div>
      </div>

      {/* Totais */}
      {resumo && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Total do mês</p><p className="text-lg font-bold">{moeda(resumo.total)}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Fixos</p><p className="text-lg font-bold text-blue-700">{moeda(resumo.fixo)}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Variáveis</p><p className="text-lg font-bold text-orange-600">{moeda(resumo.variavel)}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">A pagar</p><p className="text-lg font-bold text-amber-700">{moeda(resumo.pendente)}</p></div>
        </div>
      )}

      {resumo && (resumo.aguardandoConferencia > 0 || resumo.devolvidos > 0 || resumo.semPlanta > 0 || semPlanta) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {(resumo.semPlanta > 0 || semPlanta) && (
            <button type="button" onClick={() => setSemPlanta((v) => !v)}
              className={`rounded-full border px-3 py-1 font-medium ${semPlanta ? "border-red-500 bg-red-100" : "border-red-300 bg-red-50"} text-red-700`}>
              {resumo.semPlanta} sem local
            </button>
          )}
          {resumo.aguardandoConferencia > 0 && (
            <button type="button" onClick={() => setConferencia(conferencia === "pendente" ? undefined : "pendente")}
              className={`rounded-full border px-3 py-1 font-medium ${conferencia === "pendente" ? "border-amber-500 bg-amber-100" : "border-amber-300 bg-amber-50"} text-amber-800`}>
              {resumo.aguardandoConferencia} aguardando conferência
            </button>
          )}
          {resumo.devolvidos > 0 && (
            <button type="button" onClick={() => setConferencia(conferencia === "devolvido" ? undefined : "devolvido")}
              className={`rounded-full border px-3 py-1 font-medium ${conferencia === "devolvido" ? "border-red-500 bg-red-100" : "border-red-300 bg-red-50"} text-red-700`}>
              {resumo.devolvidos} devolvido(s) para correção
            </button>
          )}
        </div>
      )}

      {semPlanta && itens.some((i) => i.status !== "cancelado") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <span className="font-medium">Atribuir o local aos {itens.filter((i) => i.status !== "cancelado").length} gastos listados:</span>
          <select className={select} value={plantaLote} onChange={(e) => setPlantaLote(e.target.value)}>
            <option value="">Escolha o local...</option>
            {(plantas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <Button size="sm" disabled={!plantaLote || atribuirPlanta.isPending}
            onClick={() => atribuirPlanta.mutate({ ids: itens.filter((i) => i.status !== "cancelado").map((i) => i.id), plantaId: Number(plantaLote) })}>Aplicar</Button>
        </div>
      )}

      {/* Filtros básicos */}
      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={plantaId ?? ""} onChange={(e) => setPlantaId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todos os locais</option>
          {(plantas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select className={select} value={categoriaId ?? ""} onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Todas as categorias</option>
          {(categorias.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className={select} value={tipo ?? ""} onChange={(e) => setTipo((e.target.value || undefined) as any)}>
          <option value="">Todos os grupos</option><option value="fixo">Despesas Fixas</option><option value="variavel">Despesas Variáveis</option>
        </select>
        <select className={select} value={centroCustoF ?? ""} onChange={(e) => setCentroCustoF(e.target.value || undefined)}>
          <option value="">Todos os centros de custo</option>
          {CENTROS.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__nenhum">Centro de custo não definido</option>
        </select>
        <select className={select} value={tipoCustoF ?? ""} onChange={(e) => setTipoCustoF(e.target.value || undefined)}>
          <option value="">Todos os custos</option><option value="direto">Custo Direto</option><option value="indireto">Custo Indireto</option><option value="__nenhum">Custo não definido</option>
        </select>
        <Button variant="ghost" size="sm" onClick={() => setMaisFiltros((v) => !v)}>{maisFiltros ? "Menos filtros" : "Mais filtros"}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">Agrupar</label>
        <select className={select} value={agrupar} onChange={(e) => setAgrupar(e.target.value as any)}>
          <option value="lista">Lista (sem agrupar)</option><option value="dia">Por dia</option><option value="semana">Por semana</option>
        </select>
        {agrupar !== "lista" && (
          <>
            <Button variant="outline" size="sm" onClick={expandirTudo}>Expandir tudo</Button>
            <Button variant="outline" size="sm" onClick={recolherTudo}>Recolher tudo</Button>
          </>
        )}
      </div>
      {maisFiltros && (
        <div className="flex flex-wrap items-center gap-2">
          <select className={select} value={conferencia ?? ""} onChange={(e) => setConferencia((e.target.value || undefined) as any)}>
            <option value="">Toda conferência</option><option value="pendente">Aguardando conferência</option><option value="conferido">Conferidos</option><option value="devolvido">Devolvidos para correção</option>
          </select>
          <select className={select} value={status ?? ""} onChange={(e) => setStatus(e.target.value || undefined)}>
            <option value="">Todas as situações</option><option value="pago">Pagos</option><option value="pendente">A pagar</option><option value="cancelado">Cancelados</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="h-10 w-48 pl-8" />
          </div>
        </div>
      )}

      {/* Lista */}
      {dados.isLoading ? (
        <p className="py-8 text-center text-gray-500">Carregando...</p>
      ) : itens.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed py-12 text-center">
          <p className="font-medium text-gray-700">Nenhum gasto neste período</p>
          <p className="text-sm text-gray-500">Toque em “Novo gasto” para lançar o primeiro.</p>
        </div>
      ) : (
        <>
        {/* Computador: tabela */}
        {podeConferir && <p className="hidden text-xs text-gray-500 md:block">Dica: clique numa célula (data, complemento, nº documento, grupo, centro de custo, categoria, custo, local, quem gastou, como pagou ou valor) para editar direto na tabela.</p>}
        <div className="hidden max-h-[70vh] overflow-auto rounded-xl border bg-white md:block">
          <table className="w-full caption-bottom text-sm">
            {(agrupar === "lista" || grupos.some((g) => aberto(g))) && (
            <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
              <TableRow>
                <TableHead>Data de Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Complemento</TableHead>
                <TableHead>Nº Documento</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Quem gastou</TableHead>
                <TableHead>Como pagou</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Conferência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            )}
            <TableBody>
              {blocosTabela()}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell colSpan={14}>Total ({resumo?.quantidade ?? 0} gasto(s), sem cancelados)</TableCell>
                <TableCell className="text-right">{moeda(resumo?.total ?? 0)}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </table>
        </div>

        <ul className="space-y-2 md:hidden">
          {blocosCartao()}
        </ul>
        </>
      )}

      {/* Botão fixo */}
      <Button
        onClick={() => setForm({ open: true, item: null })}
        className="fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-full bg-emerald-600 px-6 text-base text-white shadow-lg hover:bg-emerald-700"
      >
        <Plus className="h-5 w-5" /> Novo gasto
      </Button>

      <Dialog open={!!pagando} onOpenChange={(v) => !v && setPagando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Marcar como pago</DialogTitle></DialogHeader>
          {pagando && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700"><b>{pagando.item.descricao}</b><br />{moeda(pagando.item.valor)}{pagando.item.dataVencimento ? ` · vence em ${dataBR(pagando.item.dataVencimento)}` : ""}</p>
              <div>
                <label className="mb-1 block text-sm font-medium">Data do pagamento</label>
                <Input type="date" value={pagando.data} max={hojeLocal()} onChange={(e) => setPagando({ ...pagando, data: e.target.value })} className="h-11" />
              </div>
              <div className="flex gap-2">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!pagando.data || alterar.isPending}
                  onClick={() => alterar.mutate({ id: pagando.item.id, status: "pago", dataPagamento: pagando.data }, { onSuccess: () => { setPagando(null); toast.success("Pagamento registrado"); } })}>Confirmar</Button>
                <Button variant="outline" onClick={() => setPagando(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!conferindo} onOpenChange={(v) => !v && setConferindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Conferir gasto</DialogTitle></DialogHeader>
          {conferindo && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700"><b>{conferindo.item.descricao}</b><br />{moeda(conferindo.item.valor)} · {conferindo.item.categoriaNome}</p>
              <div>
                <label className="mb-1 block text-sm font-medium">Centro de custo</label>
                <select value={conferindo.centro} onChange={(e) => setConferindo({ ...conferindo, centro: e.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">Escolha...</option>
                  {CENTROS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Custo (opcional)</label>
                <select value={conferindo.tipoCusto} onChange={(e) => setConferindo({ ...conferindo, tipoCusto: e.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">Não definido</option>
                  <option value="direto">Custo Direto</option>
                  <option value="indireto">Custo Indireto</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!conferindo.centro || conferir.isPending}
                  onClick={() => conferir.mutate({ ids: [conferindo.item.id], resultado: "conferido", centroCusto: conferindo.centro as any, tipoCusto: (conferindo.tipoCusto || undefined) as any }, { onSuccess: () => setConferindo(null) })}>Confirmar conferência</Button>
                <Button variant="outline" onClick={() => setConferindo(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!escolhendoCartao} onOpenChange={(v) => !v && setEscolhendoCartao(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Qual cartão?</DialogTitle></DialogHeader>
          {escolhendoCartao && (() => {
            const credito = escolhendoCartao.forma === "cartao_credito";
            const lista = (cartoes.data ?? []).filter((k) => (credito ? k.tipo === "credito" : k.tipo === "debito"));
            return (
              <div className="space-y-3">
                <p className="text-sm text-gray-700"><b>{escolhendoCartao.item.descricao}</b> · {credito ? "cartão de crédito" : "cartão de débito"}</p>
                {lista.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Nenhum cartão de {credito ? "crédito" : "débito"} cadastrado. Cadastre em <b>Cadastros</b> e tente de novo.</p>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((k) => (
                      <li key={k.id}>
                        <button type="button" onClick={() => { salvarCampo(escolhendoCartao.item, "formaPagamento", `cartao:${k.id}`); setEscolhendoCartao(null); }}
                          className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 p-3 text-left hover:border-emerald-500 hover:bg-emerald-50">
                          <span className="font-medium">{k.nome}</span>
                          <span className="text-xs text-gray-500">{k.banco ?? ""}{k.final ? ` · final ${k.final}` : ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="outline" onClick={() => setEscolhendoCartao(null)}>Cancelar</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      <ImportarCustosDialog open={importando} onClose={() => setImportando(false)} onImported={() => utils.custos.listar.invalidate()} />
      <CustoFormSheet
        open={form.open} item={form.item}
        onClose={() => setForm({ open: false, item: null })}
        onSaved={() => utils.custos.listar.invalidate()}
      />
    </div>
  );
}

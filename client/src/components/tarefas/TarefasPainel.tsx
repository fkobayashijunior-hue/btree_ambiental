// @ts-nocheck
// Tarefas da operação. modo "minhas": o colaborador vê e cria as próprias tarefas.
// modo "equipe": o supervisor vê toda a equipe, filtra e atribui. Quadro (colunas) e lista.
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { WeeklyGoalForm } from "@/components/WeeklyGoalForm";
import WeeklyGoalDetail from "@/pages/WeeklyGoalDetail";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useAreaVisivel, estiloTelaCheia } from "@/hooks/useAreaVisivel";
import { AlertTriangle, Camera, CalendarDays, CheckCircle2, LayoutGrid, List, Loader2, MapPin, MessageSquare, Paperclip, Pencil, Play, Plus, Send, FileText, Download, Search, SlidersHorizontal, Target, Trash2, User, X } from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "djob7pxme";
const CLOUDINARY_UPLOAD_PRESET = "btree_ambiental";

const COLUNAS = [
  { v: "a_fazer", l: "A fazer", cor: "border-slate-300 bg-slate-50", chip: "bg-slate-100 text-slate-700" },
  { v: "andamento", l: "Em andamento", cor: "border-blue-300 bg-blue-50", chip: "bg-blue-100 text-blue-700" },
  { v: "concluida", l: "Concluída", cor: "border-emerald-300 bg-emerald-50", chip: "bg-emerald-100 text-emerald-700" },
];
const PRIORIDADES = [
  { v: "alta", l: "Alta", cls: "bg-red-100 text-red-700" },
  { v: "media", l: "Média", cls: "bg-amber-100 text-amber-700" },
  { v: "baixa", l: "Baixa", cls: "bg-gray-100 text-gray-600" },
];
// Pendência: o que impede a tarefa de andar (separado da coluna). Ex.: aguardando aprovação do supervisor.
const PENDENCIAS = [
  { v: "aprovacao", l: "Aguardando aprovação", cls: "bg-purple-100 text-purple-700", dica: "Quem precisa aprovar?" },
  { v: "resposta", l: "Aguardando resposta", cls: "bg-amber-100 text-amber-800", dica: "De quem? (cliente, fornecedor...)" },
  { v: "material", l: "Aguardando material/peça", cls: "bg-orange-100 text-orange-700", dica: "O que está faltando?" },
  { v: "bloqueada", l: "Bloqueada", cls: "bg-red-100 text-red-700", dica: "O que está bloqueando? (obrigatório)" },
  { v: "espera", l: "Em espera", cls: "bg-slate-200 text-slate-700", dica: "Por que está em espera?" },
];
const diasDesde = (iso?: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dataBR = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "");
const soDataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
const dataHoraBR = (iso?: string | null) => { if (!iso) return ""; const x = new Date(iso); return `${x.toLocaleDateString("pt-BR")} ${x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`; };
const atrasada = (t: any) => !!t.prazo && t.prazo < hojeLocal() && t.status !== "concluida";
const tamanhoBR = (b?: number | null) => (!b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
const ACEITA_ANEXO = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,image/*";
const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export default function TarefasPainel({ modo }: { modo: "minhas" | "equipe" }) {
  const equipe = modo === "equipe";
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  // Tarefa vinda da Meta Semanal abre a própria meta (com o chat); as demais abrem o detalhe da tarefa.
  const ehMeta = (t: any) => t.origem === "meta_semanal";
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("abrir");
      if (p && Number(p) > 0) { setDetalheId(Number(p)); window.history.replaceState({}, "", window.location.pathname); }
    } catch {}
  }, []);
  const [metaJanela, setMetaJanela] = useState<{ id?: number } | null>(null);
  const sincronizar = trpc.tarefas.sincronizarMetasAgora.useMutation();
  const { hasAccess, isAdmin } = usePermissions();
  const podeCriarMeta = equipe && (isAdmin || hasAccess("metas-semanais-gestao"));
  const abrir = (t: any) => { if (ehMeta(t) && t.origemId) setMetaJanela({ id: Number(t.origemId) }); else setDetalheId(t.id); };
  const ctxQ = trpc.tarefas.contexto.useQuery();
  const locais = trpc.gpsLocations.listActive.useQuery();

  const [visao, setVisao] = useState<"quadro" | "lista">((lerLS("tarefas.visao") as any) === "lista" ? "lista" : "quadro");
  const [aba, setAba] = useState("a_fazer"); // coluna aberta no celular
  const [filtroColab, setFiltroColab] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [atrasadas, setAtrasadas] = useState(false);
  const [filtroPend, setFiltroPend] = useState("");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const qMinhas = trpc.tarefas.minhas.useQuery(undefined, { enabled: !equipe, refetchInterval: 60000 });
  const qEquipe = trpc.tarefas.equipe.useQuery(
    { colaboradorId: filtroColab ? Number(filtroColab) : undefined, localId: filtroLocal ? Number(filtroLocal) : undefined, status: (filtroStatus || undefined) as any, atrasadas: atrasadas || undefined, pendencia: (filtroPend || undefined) as any, busca: busca.trim() || undefined },
    { enabled: equipe, refetchInterval: 60000 }
  );
  const itens = (equipe ? qEquipe.data?.itens : qMinhas.data?.itens) ?? [];
  const resumo = equipe ? qEquipe.data?.resumo : null;
  const carregando = equipe ? qEquipe.isLoading : qMinhas.isLoading;
  const semVinculo = !equipe && qMinhas.data?.semVinculo;
  const gestor = !!ctxQ.data?.gestor;

  const trocarVisao = (v: "quadro" | "lista") => { setVisao(v); try { localStorage.setItem("tarefas.visao", v); } catch {} };
  const atualizar = () => Promise.all([utils.tarefas.minhas.invalidate(), utils.tarefas.equipe.invalidate(), utils.tarefas.detalhe.invalidate()]);

  const mudar = trpc.tarefas.mudarStatus.useMutation({ onSuccess: atualizar, onError: (e) => toast.error(e.message) });

  // Arrastar e soltar (computador): o cartão muda de coluna na hora e a mudança é confirmada no servidor.
  const toque = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [otimista, setOtimista] = useState<Record<number, string>>({});
  const porStatus = useMemo(
    () => Object.fromEntries(COLUNAS.map((c) => [c.v, itens.map((t) => (otimista[t.id] ? { ...t, status: otimista[t.id] } : t)).filter((t) => t.status === c.v)])),
    [itens, otimista]
  );
  const mover = (id: number, novo: string) => {
    const t = itens.find((x) => x.id === id);
    if (!t || t.status === novo) return;
    if (ehMeta(t)) { toast.info("O andamento desta tarefa vem da Meta Semanal."); return; }
    setOtimista((o) => ({ ...o, [id]: novo }));
    mudar.mutateAsync({ id, status: novo as any })
      .catch(() => {}) // o aviso de erro já é mostrado pela própria mutação (ex.: aguardando aprovação)
      .finally(() => setOtimista((o) => { const n = { ...o }; delete n[id]; return n; }));
  };

  const Card = ({ t }: { t: any }) => {
    const prio = PRIORIDADES.find((p) => p.v === t.prioridade);
    const atr = atrasada(t);
    const pend = PENDENCIAS.find((p) => p.v === t.pendencia);
    return (
      <div draggable={visao === "quadro" && !toque && !ehMeta(t)} onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; setArrastando(t.id); }} onDragEnd={() => { setArrastando(null); setSobre(null); }}
        className={`rounded-xl border bg-white p-3 shadow-sm ${visao === "quadro" && !toque ? "cursor-grab active:cursor-grabbing" : ""} ${arrastando === t.id ? "opacity-40" : ""} ${atr ? "border-red-300" : pend ? "border-dashed border-amber-300" : ""}`}>
        <button type="button" onClick={() => abrir(t)} className="block w-full text-left">
          <p className="font-medium leading-snug">{t.titulo}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
            {ehMeta(t) && <span className="rounded-full bg-lime-100 px-2 py-0.5 font-medium text-lime-800">🎯 Meta semanal</span>}
            <span className={`rounded-full px-2 py-0.5 ${prio?.cls}`}>{prio?.l}</span>
            {t.prazo && <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${atr ? "bg-red-100 font-medium text-red-700" : "bg-gray-100 text-gray-600"}`}><CalendarDays className="h-3 w-3" />{atr ? "Atrasada · " : ""}{dataBR(t.prazo)}</span>}
            {t.localNome && <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600"><MapPin className="h-3 w-3" />{t.localNome}</span>}
            {t.qtdComentarios > 0 && <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600"><MessageSquare className="h-3 w-3" />{t.qtdComentarios}</span>}
          </div>
          {pend && <p className={`mt-1.5 rounded-lg px-2 py-1 text-xs font-medium ${pend.cls}`}>⏸ {pend.l}{t.pendenciaMotivo ? ` · ${t.pendenciaMotivo}` : ""}{t.pendenciaDesde ? ` · desde ${soDataBR(t.pendenciaDesde)}` : ""}{diasDesde(t.pendenciaDesde) > 0 ? ` (há ${diasDesde(t.pendenciaDesde)} dia(s))` : ""}{t.pendenciaRespNomes ? ` · 👤 ${t.pendenciaRespNomes}` : ""}</p>}
          {equipe && <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500"><User className="h-3 w-3" />{t.responsavelNome ?? "-"}</p>}
          {ehMeta(t) && <p className="mt-1.5 text-[11px] font-medium text-lime-700">Toque para abrir a meta →</p>}
        </button>
        {t.status !== "concluida" && !t.pendencia && !ehMeta(t) && (
          <div className="mt-2 flex gap-2">
            {t.status === "a_fazer" && <Button size="sm" variant="outline" className="h-8 flex-1 gap-1 text-xs" disabled={mudar.isPending} onClick={() => mudar.mutate({ id: t.id, status: "andamento" })}><Play className="h-3 w-3" /> Iniciar</Button>}
            <Button size="sm" className="h-8 flex-1 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700" disabled={mudar.isPending} onClick={() => mudar.mutate({ id: t.id, status: "concluida" })}><CheckCircle2 className="h-3 w-3" /> Concluir</Button>
          </div>
        )}
      </div>
    );
  };

  const select = "h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm";
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const filtrosAtivos = [filtroColab, filtroLocal, filtroStatus, filtroPend].filter(Boolean).length + (atrasadas ? 1 : 0);

  return (
    <div className="space-y-4 p-4 pb-24 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{equipe ? "Tarefas da equipe" : "Minhas tarefas"}</h1>
        <p className="hidden text-sm text-gray-500 md:block">{equipe ? "Veja o andamento de toda a equipe e atribua tarefas." : "O que você precisa fazer. Toque numa tarefa para ver os detalhes."}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-10 flex-1 gap-1 bg-emerald-600 px-3 text-white hover:bg-emerald-700 md:flex-none" onClick={() => setForm({ open: true, item: null })}><Plus className="h-4 w-4" /> Nova tarefa</Button>
        {podeCriarMeta && <Button variant="outline" className="h-10 flex-1 gap-1 border-emerald-600 px-3 text-emerald-700 md:flex-none" onClick={() => setMetaJanela({})}><Target className="h-4 w-4" /> <span className="md:hidden">Nova meta</span><span className="hidden md:inline">Nova meta semanal</span></Button>}
        <div className="flex h-10 overflow-hidden rounded-md border md:ml-auto" role="group" aria-label="Forma de exibir">
          <button type="button" aria-label="Ver em quadro" onClick={() => trocarVisao("quadro")} className={`flex w-11 items-center justify-center gap-1 text-sm md:w-auto md:px-3 ${visao === "quadro" ? "bg-emerald-600 text-white" : "bg-white text-gray-600"}`}><LayoutGrid className="h-4 w-4" /><span className="hidden md:inline">Quadro</span></button>
          <button type="button" aria-label="Ver em lista" onClick={() => trocarVisao("lista")} className={`flex w-11 items-center justify-center gap-1 border-l text-sm md:w-auto md:px-3 ${visao === "lista" ? "bg-emerald-600 text-white" : "bg-white text-gray-600"}`}><List className="h-4 w-4" /><span className="hidden md:inline">Lista</span></button>
        </div>
      </div>

      {equipe && resumo && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Em aberto</p><p className="text-lg font-bold">{resumo.abertas}</p></div>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Em andamento</p><p className="text-lg font-bold text-blue-700">{resumo.andamento}</p></div>
          <button type="button" onClick={() => setAtrasadas((v) => !v)} className={`rounded-xl border p-3 text-left ${atrasadas ? "border-red-400 bg-red-50" : "bg-white"}`}><p className="text-xs text-gray-500">Atrasadas</p><p className={`text-lg font-bold ${resumo.atrasadas ? "text-red-600" : ""}`}>{resumo.atrasadas}</p></button>
          <button type="button" onClick={() => setFiltroPend(filtroPend === "qualquer" ? "" : "qualquer")} className={`rounded-xl border p-3 text-left ${filtroPend === "qualquer" ? "border-amber-400 bg-amber-50" : "bg-white"}`}><p className="text-xs text-gray-500">Com pendência</p><p className={`text-lg font-bold ${resumo.aguardando ? "text-amber-700" : ""}`}>{resumo.aguardando}</p></button>
          <div className="rounded-xl border bg-white p-3"><p className="text-xs text-gray-500">Concluídas (14 dias)</p><p className="text-lg font-bold text-emerald-700">{resumo.concluidas}</p></div>
        </div>
      )}

      {equipe && (
        <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="h-10 w-full pl-8" /></div>
          <button type="button" onClick={() => setFiltrosAbertos((v) => !v)} className={`flex h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-sm md:hidden ${filtrosAtivos ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "bg-white"}`}><SlidersHorizontal className="h-4 w-4" /> Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ""}</button>
        </div>
        <div className={`flex-wrap items-center gap-2 ${filtrosAbertos ? "grid grid-cols-2" : "hidden"} md:flex`}>
          <select className={select} value={filtroColab} onChange={(e) => setFiltroColab(e.target.value)}>
            <option value="">Toda a equipe</option>
            {(ctxQ.data?.colaboradores ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select className={select} value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)}>
            <option value="">Todos os locais</option>
            {(locais.data ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className={select} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todas as situações</option>
            {COLUNAS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <select className={select} value={filtroPend} onChange={(e) => setFiltroPend(e.target.value)}>
            <option value="">Todas as pendências</option>
            <option value="qualquer">Qualquer pendência</option>
            {PENDENCIAS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </div>
        </div>
      )}

      {semVinculo && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Seu usuário ainda não está ligado a um colaborador, então não há tarefas para você. Peça ao escritório para vincular seu login ao seu cadastro de colaborador.</span>
        </div>
      )}

      {carregando ? <p className="py-8 text-center text-gray-500">Carregando...</p> : visao === "quadro" ? (
        <>
          {/* Computador: colunas */}
          <div className="hidden gap-3 md:grid md:grid-cols-3">
            {COLUNAS.map((col) => (
              <div key={col.v}
                onDragOver={(e) => { if (arrastando != null) { e.preventDefault(); if (sobre !== col.v) setSobre(col.v); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null); }}
                onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData("text/plain")) || arrastando; setSobre(null); setArrastando(null); if (id) mover(id, col.v); }}
                className={`rounded-xl border-2 p-2 transition ${col.cor} ${sobre === col.v ? "ring-2 ring-emerald-500 ring-offset-1" : ""}`}>
                <p className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">{col.l}<span className={`rounded-full px-2 py-0.5 text-xs ${col.chip}`}>{porStatus[col.v].length}</span></p>
                <div className="space-y-2">
                  {porStatus[col.v].map((t) => <Card key={t.id} t={t} />)}
                  {porStatus[col.v].length === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">{arrastando != null ? "Solte aqui" : "Nenhuma tarefa"}</p>}
                </div>
              </div>
            ))}
          </div>
          {/* Celular: uma coluna por vez */}
          <div className="md:hidden">
            <div className="mb-3 grid grid-cols-3 gap-1">
              {COLUNAS.map((col) => (
                <button key={col.v} type="button" onClick={() => setAba(col.v)} className={`rounded-lg border-2 px-1 py-2 text-xs font-medium ${aba === col.v ? col.cor : "border-gray-200 bg-white"}`}>
                  {col.l} <span className={`ml-1 rounded-full px-1.5 ${col.chip}`}>{porStatus[col.v].length}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {porStatus[aba].map((t) => <Card key={t.id} t={t} />)}
              {porStatus[aba].length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nenhuma tarefa aqui</p>}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Computador: tabela */}
          <div className="hidden overflow-x-auto rounded-xl border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr><th className="px-3 py-2">Tarefa</th>{equipe && <th className="px-3 py-2">Responsável</th>}<th className="px-3 py-2">Prazo</th><th className="px-3 py-2">Prioridade</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Pendência</th><th className="px-3 py-2">Local</th><th className="px-3 py-2 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {itens.map((t) => {
                  const col = COLUNAS.find((c) => c.v === t.status); const prio = PRIORIDADES.find((p) => p.v === t.prioridade);
                  return (
                    <tr key={t.id} className={`border-t ${atrasada(t) ? "bg-red-50/50" : ""}`}>
                      <td className="px-3 py-2">{ehMeta(t) && <span className="mr-1.5 rounded-full bg-lime-100 px-2 py-0.5 text-[11px] font-medium text-lime-800">🎯 Meta</span>}<button type="button" className="text-left font-medium hover:underline" onClick={() => abrir(t)}>{t.titulo}</button>{t.qtdComentarios > 0 && <span className="ml-2 text-xs text-gray-400">💬 {t.qtdComentarios}</span>}</td>
                      {equipe && <td className="px-3 py-2">{t.responsavelNome ?? "-"}</td>}
                      <td className={`whitespace-nowrap px-3 py-2 ${atrasada(t) ? "font-medium text-red-700" : ""}`}>{t.prazo ? dataBR(t.prazo) : "-"}{atrasada(t) ? " ⚠" : ""}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${prio?.cls}`}>{prio?.l}</span></td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${col?.chip}`}>{col?.l}</span></td>
                      <td className="px-3 py-2">
                        {(() => {
                          const pend = PENDENCIAS.find((p) => p.v === t.pendencia);
                          if (!pend || t.status === "concluida") return <span className="text-gray-400">-</span>;
                          const dias = diasDesde(t.pendenciaDesde);
                          return (
                            <div title={t.pendenciaMotivo ?? ""}>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pend.cls}`}>⏸ {pend.l}</span>
                              {t.pendenciaDesde && <p className="mt-0.5 text-[11px] text-gray-500">Desde {soDataBR(t.pendenciaDesde)}{dias > 0 ? ` (há ${dias} dia(s))` : ""}</p>}
                              {t.pendenciaMotivo && <p className="mt-0.5 text-[11px] text-gray-500">{t.pendenciaMotivo}</p>}
                              {t.pendenciaRespNomes && <p className="mt-0.5 text-[11px] text-gray-600">👤 {t.pendenciaRespNomes}</p>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">{t.localNome ?? "-"}</td>
                      <td className="px-3 py-2 text-right">
                        {t.status !== "concluida" && !t.pendencia && !ehMeta(t) && <Button size="sm" variant="outline" className="h-7 text-xs" disabled={mudar.isPending} onClick={() => mudar.mutate({ id: t.id, status: t.status === "a_fazer" ? "andamento" : "concluida" })}>{t.status === "a_fazer" ? "Iniciar" : "Concluir"}</Button>}
                      </td>
                    </tr>
                  );
                })}
                {itens.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Nenhuma tarefa</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {itens.map((t) => <Card key={t.id} t={t} />)}
            {itens.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nenhuma tarefa</p>}
          </div>
        </>
      )}

      <TarefaForm open={form.open} item={form.item} gestor={gestor} colaboradores={ctxQ.data?.colaboradores ?? []} locais={locais.data ?? []}
        onClose={() => setForm({ open: false, item: null })} onSaved={atualizar} />
      <TarefaDetalhe id={detalheId} onClose={() => setDetalheId(null)} onChanged={atualizar}
        onEditar={(t) => { setDetalheId(null); setForm({ open: true, item: t }); }} />
      <MetaJanela estado={metaJanela} onClose={() => { setMetaJanela(null); sincronizar.mutateAsync().then(atualizar).catch(() => {}); }} />
    </div>
  );
}

// ───────── Meta semanal dentro das Tarefas (criar / abrir com chat) ─────────
function MetaJanela({ estado, onClose }: { estado: { id?: number } | null; onClose: () => void }) {
  const aberto = !!estado;
  const { toque, vv } = useAreaVisivel(aberto);
  const semanaQ = trpc.weeklyGoals.list.useQuery(undefined, { enabled: aberto && !estado?.id });
  const utils = trpc.useUtils();
  const titulo = estado?.id ? "Meta semanal" : "Nova meta semanal";
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className={`flex max-h-[94dvh] max-w-3xl flex-col gap-0 overflow-hidden p-0 ${toque ? "z-[70]" : ""}`} style={estiloTelaCheia(toque, vv)} onOpenAutoFocus={(e) => { if (toque) e.preventDefault(); }}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-2.5 text-left">
          <DialogTitle className="text-lg">{titulo}</DialogTitle>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium text-gray-700 active:bg-gray-100"><X className="h-4 w-4" /> Fechar</button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {aberto && estado?.id && <WeeklyGoalDetail goalId={estado.id} onVoltar={onClose} />}
          {aberto && !estado?.id && (semanaQ.data
            ? <div className="p-4"><WeeklyGoalForm semanaInicio={semanaQ.data.semana.start} onDone={() => { utils.weeklyGoals.invalidate(); onClose(); }} onCancel={onClose} /></div>
            : <div className="p-6"><div className="h-32 animate-pulse rounded-xl bg-gray-100" /></div>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────── Nova tarefa / editar ─────────
function TarefaForm({ open, item, gestor, colaboradores, locais, onClose, onSaved }: any) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [prazo, setPrazo] = useState("");
  const [localId, setLocalId] = useState("");
  const [resp, setResp] = useState("");
  const criar = trpc.tarefas.criar.useMutation();
  const editar = trpc.tarefas.editar.useMutation();
  const { toque, vv } = useAreaVisivel(open);

  useEffect(() => {
    if (!open) return;
    setTitulo(item?.titulo ?? ""); setDescricao(item?.descricao ?? ""); setPrioridade(item?.prioridade ?? "media");
    setPrazo(item?.prazo ?? ""); setLocalId(item?.localId ? String(item.localId) : ""); setResp(item?.responsavelId ? String(item.responsavelId) : "");
  }, [open, item]);

  const salvar = async () => {
    if (titulo.trim().length < 2) return toast.error("Dê um título à tarefa");
    if (gestor && !resp) return toast.error("Escolha o responsável");
    const base = { titulo: titulo.trim(), descricao: descricao.trim() || null, prioridade, prazo: prazo || null, localId: localId ? Number(localId) : null };
    try {
      if (item) await editar.mutateAsync({ id: item.id, ...base, responsavelColaboradorId: gestor && resp ? Number(resp) : undefined });
      else await criar.mutateAsync({ ...base, responsavelColaboradorId: gestor && resp ? Number(resp) : undefined });
      toast.success(item ? "Tarefa alterada" : "Tarefa criada");
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message ?? "Não foi possível salvar"); }
  };
  const pend = criar.isPending || editar.isPending;
  const sel = "h-11 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className={`flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 ${toque ? "z-[70]" : ""}`} style={estiloTelaCheia(toque, vv)} onOpenAutoFocus={(e) => { if (toque) e.preventDefault(); }}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-2.5 text-left"><DialogTitle className="text-lg">{item ? "Alterar tarefa" : "Nova tarefa"}</DialogTitle><button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium text-gray-700 active:bg-gray-100"><X className="h-4 w-4" /> Fechar</button></DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div><label className="mb-1 block text-sm font-medium">O que precisa ser feito?</label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Trocar o óleo do trator 02" className="h-11" maxLength={200} /></div>
          <div><label className="mb-1 block text-sm font-medium">Detalhes (opcional)</label><Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          {gestor ? (
            <div><label className="mb-1 block text-sm font-medium">Responsável</label>
              <select className={sel} value={resp} onChange={(e) => setResp(e.target.value)}><option value="">Escolha...</option>{colaboradores.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          ) : !item && <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600">A tarefa será atribuída a você.</p>}
          <div>
            <label className="mb-1 block text-sm font-medium">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORIDADES.map((p) => <button key={p.v} type="button" onClick={() => setPrioridade(p.v)} className={`h-11 rounded-xl border-2 text-sm font-medium ${prioridade === p.v ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-gray-200"}`}>{p.l}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="min-w-0"><label className="mb-1 block text-sm font-medium">Prazo</label><Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="block h-11 w-full min-w-0 appearance-none" /></div>
            <div className="min-w-0"><label className="mb-1 block text-sm font-medium">Local</label>
              <select className={sel} value={localId} onChange={(e) => setLocalId(e.target.value)}><option value="">Sem local</option>{locais.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          </div>
          <div className="flex gap-2">
            <Button className="h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={pend} onClick={salvar}>{pend ? "Salvando..." : item ? "Salvar alterações" : "Criar tarefa"}</Button>
            <Button variant="outline" className="h-11" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────── Detalhe: andamento, comentários e fotos ─────────
function TarefaDetalhe({ id, onClose, onChanged, onEditar }: any) {
  const { openFilePicker } = useFilePicker();
  const q = trpc.tarefas.detalhe.useQuery({ id: id ?? 0 }, { enabled: !!id, refetchInterval: id ? 30000 : false });
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pendSel, setPendSel] = useState("");
  const [pendMotivo, setPendMotivo] = useState("");
  const [pendDesc, setPendDesc] = useState("");
  const [pendDesde, setPendDesde] = useState(""); // quando a pendência começou (vazio = agora)
  const [pendResp, setPendResp] = useState<number[]>([]); // pessoas (colaboradores com usuário) responsáveis pela pendência
  const ctxPessoas = trpc.tarefas.contexto.useQuery();
  const pessoas: { id: number; nome: string }[] = (ctxPessoas.data as any)?.pessoas ?? [];
  const { toque, vv } = useAreaVisivel(!!id);
  const refresh = () => { q.refetch(); onChanged?.(); };
  const mudar = trpc.tarefas.mudarStatus.useMutation({ onSuccess: () => { setTexto(""); setFoto(""); refresh(); }, onError: (e) => toast.error(e.message) });
  const comentar = trpc.tarefas.comentar.useMutation({ onSuccess: () => { setTexto(""); setFoto(""); refresh(); }, onError: (e) => toast.error(e.message) });
  const definirPend = trpc.tarefas.definirPendencia.useMutation({ onSuccess: () => { setPendSel(""); setPendMotivo(""); setPendDesc(""); setPendDesde(""); setPendResp([]); refresh(); toast.success("Situação atualizada"); }, onError: (e) => toast.error(e.message) });
  const aprovar = trpc.tarefas.aprovar.useMutation({ onSuccess: () => { setTexto(""); refresh(); toast.success("Resposta registrada"); }, onError: (e) => toast.error(e.message) });
  const excluir = trpc.tarefas.excluir.useMutation({ onSuccess: () => { toast.success("Tarefa excluída"); onChanged?.(); onClose(); }, onError: (e) => toast.error(e.message) });
  const anexarArq = trpc.tarefas.anexar.useMutation({ onSuccess: () => { refresh(); toast.success("Arquivo anexado"); }, onError: (e) => toast.error(e.message) });
  const removerArq = trpc.tarefas.removerAnexo.useMutation({ onSuccess: () => refresh(), onError: (e) => toast.error(e.message) });
  const [enviandoArq, setEnviandoArq] = useState(false);
  const anexarArquivo = () => openFilePicker({ accept: ACEITA_ANEXO }, async (files: FileList) => {
    const file = files[0]; if (!file || !id) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo muito grande. Máximo 10 MB.");
    setEnviandoArq(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); fd.append("folder", "btree-tarefas");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (!j.secure_url) return toast.error("Não foi possível enviar o arquivo.");
      await anexarArq.mutateAsync({ id, nome: file.name.slice(0, 255), url: j.secure_url, mime: file.type || null, tamanho: file.size });
    } catch { toast.error("Não foi possível enviar o arquivo."); } finally { setEnviandoArq(false); }
  });
  const fimConversa = useRef<HTMLDivElement>(null);
  useEffect(() => { setTexto(""); setFoto(""); setPendSel(""); setPendMotivo(""); setPendDesc(""); setPendDesde(""); setPendResp([]); }, [id]);

  const t = q.data?.tarefa;
  const hist = q.data?.historico ?? [];
  const mensagens = hist.filter((h: any) => h.tipo === "comentario");
  const eventos = hist.filter((h: any) => h.tipo !== "comentario");
  const anexos = q.data?.anexos ?? [];
  useEffect(() => { fimConversa.current?.scrollIntoView?.({ block: "nearest" }); }, [mensagens.length]);

  const anexar = () => openFilePicker({ accept: "image/*" }, async (files: FileList) => {
    const file = files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo muito grande. Máximo 10 MB.");
    setEnviando(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (j.secure_url) setFoto(j.secure_url); else toast.error("Não foi possível enviar a foto.");
    } catch { toast.error("Não foi possível enviar a foto."); } finally { setEnviando(false); }
  });

  const col = COLUNAS.find((c) => c.v === t?.status);
  const prio = PRIORIDADES.find((p) => p.v === t?.prioridade);

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className={`flex max-h-[92dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 ${toque ? "z-[70]" : ""}`} style={estiloTelaCheia(toque, vv)} onOpenAutoFocus={(e) => { if (toque) e.preventDefault(); }}>
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-2.5 text-left"><DialogTitle className="line-clamp-2 text-base leading-snug">{t?.titulo ?? "Tarefa"}</DialogTitle><button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium text-gray-700 active:bg-gray-100"><X className="h-4 w-4" /> Fechar</button></DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {q.isLoading || !t ? <p className="py-6 text-center text-gray-500">Carregando...</p> : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${col?.chip}`}>{col?.l}</span>
              <span className={`rounded-full px-2 py-0.5 ${prio?.cls}`}>Prioridade {prio?.l.toLowerCase()}</span>
              {t.prazo && <span className={`rounded-full px-2 py-0.5 ${atrasada(t) ? "bg-red-100 font-medium text-red-700" : "bg-gray-100 text-gray-600"}`}>Prazo {dataBR(t.prazo)}{atrasada(t) ? " (atrasada)" : ""}</span>}
              {t.localNome && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{t.localNome}</span>}
            </div>
            <p className="text-xs text-gray-500">Responsável: <b>{t.responsavelNome ?? "-"}</b> · criada por {t.criadoPorNome ?? "-"} em {dataHoraBR(t.criadaEm)}</p>
            {t.descricao && <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm">{t.descricao}</p>}

            <div className="flex flex-wrap gap-2">
              {COLUNAS.filter((c) => c.v !== t.status && !(c.v === "concluida" && ((t.pendencia === "aprovacao" && !q.data?.gestor) || t.pendencia === "bloqueada"))).map((c) => (
                <Button key={c.v} size="sm" variant={c.v === "concluida" ? "default" : "outline"} className={c.v === "concluida" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""} disabled={mudar.isPending}
                  onClick={() => mudar.mutate({ id: t.id, status: c.v, comentario: texto.trim() || null, fotoUrl: foto || null })}>
                  {c.v === "concluida" ? "Concluir" : c.v === "andamento" ? (t.status === "concluida" ? "Reabrir" : "Iniciar") : "Voltar para A fazer"}
                </Button>
              ))}
              {q.data?.podeEditar && <Button size="sm" variant="ghost" className="gap-1" onClick={() => onEditar(t)}><Pencil className="h-3.5 w-3.5" /> Alterar</Button>}
              {q.data?.podeEditar && <Button size="sm" variant="ghost" className="gap-1 text-red-600 hover:text-red-700" disabled={excluir.isPending} onClick={() => confirm("Excluir esta tarefa e todo o histórico dela?") && excluir.mutate({ id: t.id })}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>}
            </div>

            {t.status !== "concluida" && (
              <div className="space-y-2 rounded-xl border p-3">
                <p className="text-sm font-medium">Pendência</p>
                {t.pendencia ? (
                  <p className={`rounded-lg px-2 py-1.5 text-sm font-medium ${PENDENCIAS.find((p) => p.v === t.pendencia)?.cls}`}>
                    ⏸ {PENDENCIAS.find((p) => p.v === t.pendencia)?.l}{t.pendenciaMotivo ? ` · ${t.pendenciaMotivo}` : ""}
                    {t.pendenciaDesde && <span className="mt-0.5 block text-xs font-normal">📅 Iniciada em <b>{soDataBR(t.pendenciaDesde)}</b>{diasDesde(t.pendenciaDesde) > 0 ? ` (há ${diasDesde(t.pendenciaDesde)} dia(s))` : ""}</span>}
                    {t.pendenciaRespNomes &&<span className="mt-0.5 block text-xs font-normal">👤 Responsável: <b>{t.pendenciaRespNomes}</b></span>}
                    {t.pendenciaDescricao && <span className="mt-1 block whitespace-pre-wrap text-xs font-normal">{t.pendenciaDescricao}</span>}
                  </p>
                ) : <p className="text-xs text-gray-500">Nada impedindo a tarefa. Se estiver esperando algo, marque abaixo.</p>}
                {t.pendencia === "aprovacao" && q.data?.gestor && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={aprovar.isPending} onClick={() => aprovar.mutate({ id: t.id, aprovar: true, comentario: texto.trim() || null })}>Aprovar e concluir</Button>
                    <Button size="sm" variant="outline" disabled={aprovar.isPending} onClick={() => aprovar.mutate({ id: t.id, aprovar: false, comentario: texto.trim() || null })}>Devolver para ajustes</Button>
                    <p className="w-full text-[11px] text-gray-500">Para devolver, escreva o que ajustar no campo de comentário abaixo.</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {PENDENCIAS.map((p) => (
                    <button key={p.v} type="button" onClick={() => setPendSel(pendSel === p.v ? "" : p.v)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${pendSel === p.v ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white"}`}>{p.l}</button>
                  ))}
                </div>
                {pendSel && (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-700">{PENDENCIAS.find((p) => p.v === pendSel)?.dica} <span className="font-normal text-gray-500">(escolha uma ou mais pessoas)</span></p>
                      {pessoas.length === 0 ? <p className="text-xs text-gray-500">Nenhum colaborador ativo com usuário no sistema. Use o texto abaixo.</p> : (
                        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                          {pessoas.map((p) => {
                            const on = pendResp.includes(p.id);
                            return <button key={p.id} type="button" onClick={() => setPendResp(on ? pendResp.filter((x) => x !== p.id) : [...pendResp, p.id])} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800" : "border-gray-200 bg-white hover:bg-gray-100"}`}>{on ? "✓ " : ""}{p.nome}</button>;
                          })}
                        </div>
                      )}
                      <Input value={pendMotivo} onChange={(e) => setPendMotivo(e.target.value)} placeholder={pessoas.length ? "Outro? Digite aqui (cliente, fornecedor...)" : PENDENCIAS.find((p) => p.v === pendSel)?.dica} maxLength={300} className="h-10" />
                    </div>
                    <Textarea value={pendDesc} onChange={(e) => setPendDesc(e.target.value)} placeholder="Descrição da pendência: explique com detalhes o que está pendente (opcional)" rows={3} maxLength={2000} />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs font-medium text-gray-700">Começou em</label>
                      <Input type="date" value={pendDesde} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} onChange={(e) => setPendDesde(e.target.value)} className="h-9 w-auto" />
                      <span className="text-[11px] text-gray-500">{pendDesde ? "" : "vazio = agora"}</span>
                    </div>
                    <Button size="sm" disabled={definirPend.isPending} onClick={() => definirPend.mutate({ id: t.id, pendencia: pendSel as any, motivo: pendMotivo.trim() || null, descricao: pendDesc.trim() || null, responsaveis: pendResp, desde: pendDesde || null })}>Marcar pendência</Button>
                  </div>
                )}
                {t.pendencia && (t.pendencia !== "aprovacao" || q.data?.gestor) && (
                  <Button size="sm" variant="ghost" className="gap-1 text-gray-600" disabled={definirPend.isPending} onClick={() => definirPend.mutate({ id: t.id, pendencia: null })}>Remover pendência (liberar)</Button>
                )}
              </div>
            )}

            {/* Histórico das pendências (fica visível mesmo com a tarefa concluída) */}
            {(q.data as any)?.pendencias?.length > 0 && (
              <details className="rounded-xl border p-3" open={t.status === "concluida"}>
                <summary className="cursor-pointer text-sm font-medium">Pendências desta tarefa ({(q.data as any).pendencias.length})</summary>
                <ul className="mt-2 space-y-2">
                  {[...(q.data as any).pendencias].reverse().map((p: any) => {
                    const info = PENDENCIAS.find((x) => x.v === p.tipo);
                    const fim = p.resolvidaEm ? new Date(p.resolvidaEm).getTime() : Date.now();
                    const min = Math.max(0, Math.round((fim - new Date(p.abertaEm).getTime()) / 60000));
                    const durou = min < 60 ? `${min} min` : min < 1440 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} dia(s)`;
                    const COMO: Record<string, string> = { removida: "Liberada", trocada: "Substituída por outra pendência", concluida: "Resolvida ao concluir a tarefa", aprovada: "Aprovada pelo supervisor", devolvida: "Devolvida para ajustes pelo supervisor" };
                    return (
                      <li key={p.id} className="space-y-1 rounded-lg bg-gray-50 p-2.5 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info?.cls}`}>⏸ {info?.l ?? p.tipo}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${p.resolvidaEm ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{p.resolvidaEm ? "Resolvida" : "Em aberto"}</span>
                          <span className="text-xs text-gray-500">{durou}{p.resolvidaEm ? "" : " até agora"}</span>
                        </div>
                        {p.respNomes && <p className="text-xs text-gray-700">👤 Responsável: <b>{p.respNomes}</b></p>}
                        {p.motivo && <p className="text-xs text-gray-700"><b>Motivo:</b> {p.motivo}</p>}
                        {p.descricao && <p className="whitespace-pre-wrap text-xs text-gray-700"><b>Descrição:</b> {p.descricao}</p>}
                        <p className="text-[11px] text-gray-500">Aberta por {p.abertaPor ?? "-"} · iniciada em {soDataBR(p.abertaEm)}</p>
                        {p.resolvidaEm && <p className="text-[11px] text-gray-500">{COMO[p.resolucao] ?? "Encerrada"} por {p.resolvidaPor ?? "-"} em {dataHoraBR(p.resolvidaEm)}</p>}
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}

            {/* Anexos */}
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Anexos <span className="text-xs font-normal text-gray-500">({anexos.length})</span></p>
                <Button size="sm" variant="outline" className="gap-1" disabled={enviandoArq} onClick={anexarArquivo}>{enviandoArq ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Anexar arquivo</Button>
              </div>
              {anexos.length === 0 ? <p className="text-xs text-gray-500">Nenhum arquivo. Anexe documentos, planilhas, PDFs ou fotos (até 10 MB).</p> : (
                <ul className="space-y-1.5">
                  {anexos.map((a: any) => (
                    <li key={a.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                      <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                      <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-emerald-800">{a.nome}</span>
                        <span className="block text-[11px] text-gray-500">{[tamanhoBR(a.tamanho), a.por, dataHoraBR(a.em)].filter(Boolean).join(" · ")}</span>
                      </a>
                      <a href={a.url} target="_blank" rel="noreferrer" aria-label="Abrir" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white"><Download className="h-4 w-4" /></a>
                      {(q.data?.gestor || a.porId === q.data?.meuUserId) && <button type="button" aria-label="Remover anexo" onClick={() => confirm(`Remover "${a.nome}"?`) && removerArq.mutate({ id: a.id })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 active:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Conversa entre o responsável e o supervisor */}
            <div className="space-y-2 rounded-xl border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Conversa da tarefa</p>
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-2">
                {mensagens.length === 0 && <p className="py-4 text-center text-xs text-gray-500">Ninguém escreveu ainda. O responsável e o supervisor podem conversar aqui sobre a tarefa; o outro lado recebe um aviso.</p>}
                {mensagens.map((h: any) => {
                  const minha = h.porId != null && h.porId === q.data?.meuUserId;
                  return (
                    <div key={h.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${minha ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm border bg-white"}`}>
                        <p className={`text-[11px] ${minha ? "text-emerald-100" : "text-gray-400"}`}>{minha ? "Você" : h.por ?? "Sistema"} · {dataHoraBR(h.em)}</p>
                        {h.texto && <p className="whitespace-pre-wrap break-words">{h.texto}</p>}
                        {h.fotoUrl && <a href={h.fotoUrl} target="_blank" rel="noreferrer"><img src={h.fotoUrl} alt="Foto" className="mt-1 max-h-40 rounded-lg" /></a>}
                      </div>
                    </div>
                  );
                })}
                <div ref={fimConversa} />
              </div>
              <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma mensagem..." />
              {foto && (
                <div className="flex items-center gap-2"><img src={foto} alt="Foto" className="h-16 w-16 rounded-lg object-cover" /><Button size="sm" variant="ghost" onClick={() => setFoto("")}><X className="h-4 w-4" /></Button></div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" disabled={enviando} onClick={anexar}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Foto</Button>
                <Button size="sm" className="ml-auto gap-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={comentar.isPending || (!texto.trim() && !foto)} onClick={() => comentar.mutate({ id: t.id, texto: texto.trim() || undefined, fotoUrl: foto || null })}><Send className="h-4 w-4" /> Enviar</Button>
              </div>
              <p className="text-[11px] text-gray-400">O texto também vai junto ao mudar a situação da tarefa (Iniciar, Concluir...).</p>
            </div>

            {/* Histórico: só os eventos (mudanças de situação, anexos...) */}
            <details className="rounded-xl border p-3">
              <summary className="cursor-pointer text-sm font-medium">Histórico de mudanças ({eventos.length})</summary>
              <ul className="mt-2 space-y-2">
                {[...eventos].reverse().map((h: any) => (
                  <li key={h.id} className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
                    <p className="text-[11px] text-gray-400">{h.por ?? "Sistema"} · {dataHoraBR(h.em)}</p>
                    {h.texto && <p className="whitespace-pre-wrap">{h.texto}</p>}
                    {h.fotoUrl && <a href={h.fotoUrl} target="_blank" rel="noreferrer"><img src={h.fotoUrl} alt="Foto" className="mt-1 max-h-40 rounded-lg" /></a>}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

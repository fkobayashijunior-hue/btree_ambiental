// @ts-nocheck
import { useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WeeklyGoalForm } from "@/components/WeeklyGoalForm";
import { BarraProgresso, ALERTA_LABEL, STATUS_LABEL } from "./WeeklyGoals";
import {
  ArrowLeft, AlertTriangle, ChevronDown, ChevronRight, Camera, Send, Pencil, XCircle, Flag, MessageCircleQuestion, Truck, Trash2,
  Paperclip, FileText, X, Loader2,
} from "lucide-react";

const DIA_NOME = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const fmtBR = (d: string) => d.split("-").reverse().join("/");
const nomeDia = (d: string) => `${DIA_NOME[new Date(d + "T12:00:00").getDay()]} ${fmtBR(d).slice(0, 5)}`;
const hora = (v: any) => (v ? new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");

const KIND: Record<string, { label: string; cls: string }> = {
  inicio_dia: { label: "Início do dia", cls: "bg-emerald-100 text-emerald-800" },
  andamento: { label: "Andamento", cls: "bg-blue-100 text-blue-800" },
  problema: { label: "Problema", cls: "bg-red-100 text-red-700" },
  fechamento_dia: { label: "Fechamento do dia", cls: "bg-violet-100 text-violet-800" },
};
const SITUACAO: Record<string, string> = { ok: "Tudo certo", atencao: "Atenção", problema: "Problema" };

async function enviarFoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "btree_ambiental");
  fd.append("folder", "btree-metas");
  const r = await fetch("https://api.cloudinary.com/v1_1/djob7pxme/auto/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!j.secure_url) throw new Error("Falha no envio da foto");
  return j.secure_url;
}

const ehImagem = (nome: string, url: string) => /\.(jpe?g|png|gif|webp|heic)$/i.test(nome) || /\/image\/upload\//.test(url);

/** Mostra os anexos de uma mensagem: fotos em miniatura e arquivos como link. */
function AnexosMsg({ anexos, claro = false }: { anexos?: { url: string; nome: string }[]; claro?: boolean }) {
  if (!anexos?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {anexos.map(a => ehImagem(a.nome, a.url)
        ? <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.nome} className="h-24 w-24 rounded-lg border object-cover" /></a>
        : <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className={`flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm ${claro ? "bg-white/20 text-white" : "bg-white text-emerald-800"}`}><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{a.nome}</span></a>)}
    </div>
  );
}

/** Botão "Anexar" (foto ou arquivo, até 10 MB cada, no máximo 5 por mensagem). */
function BotaoAnexar({ anexos, setAnexos, className = "" }: { anexos: { url: string; nome: string }[]; setAnexos: (a: { url: string; nome: string }[]) => void; className?: string }) {
  const arq = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const aoEscolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - anexos.length);
    e.target.value = "";
    if (!files.length) return;
    const grandes = files.filter(f => f.size > 10 * 1024 * 1024);
    if (grandes.length) toast.error("Arquivo muito grande. Máximo 10 MB.");
    const ok = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (!ok.length) return;
    setEnviando(true);
    try {
      const novos = await Promise.all(ok.map(async f => ({ url: await enviarFoto(f), nome: f.name.slice(0, 255) })));
      setAnexos([...anexos, ...novos]);
    } catch { toast.error("Não foi possível enviar o arquivo."); }
    finally { setEnviando(false); }
  };
  return (
    <div className={className}>
      {anexos.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {anexos.map(a => (
            <span key={a.url} className="flex max-w-full items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs">
              <Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{a.nome}</span>
              <button type="button" aria-label="Remover anexo" onClick={() => setAnexos(anexos.filter(x => x.url !== a.url))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" className="h-11 gap-1 px-3" disabled={enviando || anexos.length >= 5} onClick={() => arq.current?.click()}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}<span className="text-sm">{enviando ? "Enviando..." : "Anexar"}</span>
      </Button>
      <input ref={arq} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip" className="hidden" onChange={aoEscolher} />
    </div>
  );
}

// Como página (rota /metas-semanais/:id) ou embutida numa janela das Tarefas (props goalId + onVoltar).
export default function WeeklyGoalDetail({ goalId: goalIdProp, onVoltar }: { goalId?: number; onVoltar?: () => void } = {}) {
  const { id } = useParams();
  const goalId = goalIdProp ?? Number(id);
  const [, navigateReal] = useLocation();
  const navigate = (p: string) => (onVoltar ? onVoltar() : navigateReal(p));
  const utils = trpc.useUtils();
  const q = trpc.weeklyGoals.getById.useQuery({ id: goalId }, { refetchInterval: 30000 });
  const [editar, setEditar] = useState(false);
  const d = q.data;
  const invalida = () => utils.weeklyGoals.invalidate();

  const ack = trpc.weeklyGoals.acknowledge.useMutation({
    onSuccess: (_r, v) => {
      toast.success(v.ack === "com_ressalva" ? "Ressalva enviada." : "Ciência registrada.");
      setMostraRessalva(false); setRessalva(""); // fecha e limpa o campo depois de enviar
      invalida();
    },
    onError: e => toast.error(e.message),
  });
  const cancelar = trpc.weeklyGoals.cancel.useMutation({ onSuccess: () => { toast.success("Meta cancelada."); invalida(); }, onError: e => toast.error(e.message) });
  const manter = trpc.weeklyGoals.keepGoal.useMutation({ onSuccess: () => { toast.success("Meta mantida. Aguardando confirmação do responsável."); invalida(); }, onError: e => toast.error(e.message) });
  const excluir = trpc.weeklyGoals.delete.useMutation({
    onSuccess: () => { toast.success("Meta excluída."); invalida(); navigate("/metas-semanais"); },
    onError: e => toast.error(e.message),
  });
  const encerrar = trpc.weeklyGoals.close.useMutation({ onSuccess: () => { toast.success("Semana encerrada."); invalida(); }, onError: e => toast.error(e.message) });
  const [ressalva, setRessalva] = useState("");
  const [mostraRessalva, setMostraRessalva] = useState(false);
  // Visão simples do responsável: resumo + conversa. "Ver detalhes por dia" abre a tela completa.
  const [verDetalhes, setVerDetalhes] = useState(false);
  const [msgSimples, setMsgSimples] = useState("");
  const [diaChat, setDiaChat] = useState<string | null>(null); // null = hoje
  const [anexosSimples, setAnexosSimples] = useState<{ url: string; nome: string }[]>([]);
  const [respondendoId, setRespondendoId] = useState<number | null>(null);
  const enviarMsg = trpc.weeklyGoals.addMessage.useMutation({
    onSuccess: () => { setMsgSimples(""); setAnexosSimples([]); setRespondendoId(null); invalida(); },
    onError: e => toast.error(e.message),
  });

  if (q.isLoading) return <div className="p-6"><div className="h-40 rounded-xl bg-gray-100 animate-pulse" /></div>;
  if (q.isError || !d) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" className="gap-1 mb-3" onClick={() => navigate("/metas-semanais")}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{q.error?.message ?? "Meta não encontrada"}</div>
      </div>
    );
  }
  const g = d.goal;
  const encerrada = ["encerrada", "cancelada"].includes(g.status);

  if (!verDetalhes) {
    const souResp = d.papel === "responsavel";
    const tot = d.progresso.total;
    const comecou = g.weekStart <= d.hoje;
    const situacao = souResp
      ? (g.status === "aguardando_ciencia" ? "Falta você dar o seu de acordo."
        : g.status === "em_negociacao" ? "Você fez uma ressalva. A supervisão vai responder."
        : g.status === "encerrada" ? "Esta semana já foi encerrada."
        : g.status === "cancelada" ? "Esta meta foi cancelada."
        : !comecou ? `A meta começa no dia ${fmtBR(g.weekStart).slice(0, 5)}.` : "Meta em andamento. Boa semana!")
      : (g.status === "aguardando_ciencia" ? `Aguardando o de acordo de ${g.responsibleName}.`
        : g.status === "em_negociacao" ? `${g.responsibleName} fez uma ressalva. Responda na conversa ou ajuste a meta.`
        : g.status === "encerrada" ? "Esta semana já foi encerrada."
        : g.status === "cancelada" ? "Esta meta foi cancelada."
        : !comecou ? `A meta começa no dia ${fmtBR(g.weekStart).slice(0, 5)}.` : "Meta em andamento.");
    // A conversa é separada por dia: cada dia começa em branco e o histórico fica guardado no dia em que aconteceu.
    const diaDe = (m: any): string => m.data ?? new Date(m.criadoEm).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const todas = [...d.mensagens].filter((m: any) => m.kind !== "sistema").sort((a: any, b: any) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());
    const diaSel = diaChat ?? d.hoje;
    const ehHojeChat = diaSel === d.hoje;
    const diasComConversa = Array.from(new Set<string>([d.hoje, ...todas.map(diaDe)])).sort().reverse();
    const conversa = todas.filter((m: any) => diaDe(m) === diaSel);
    const nomeDiaCurto = (iso: string) => iso === d.hoje ? "Hoje" : `${nomeDia(iso)}`;
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{souResp ? "Sua meta da semana" : `Meta de ${g.responsibleName}`}</h1>
          <p className="text-base text-gray-600">De {fmtBR(g.weekStart).slice(0, 5)} a {fmtBR(g.weekEnd).slice(0, 5)}</p>
        </div>

        <p className={`rounded-xl p-3 text-base font-medium ${g.status === "aguardando_ciencia" ? "bg-amber-50 text-amber-900" : g.status === "em_negociacao" ? "bg-orange-50 text-orange-900" : "bg-emerald-50 text-emerald-900"}`}>{situacao}</p>

        {d.ultimaAlteracao && g.status === "aguardando_ciencia" && (
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">{souResp ? "A supervisão alterou a sua meta. Confira abaixo." : "A meta foi alterada. O responsável precisa dar o de acordo de novo."}</p>
            <p className="mt-1">{d.ultimaAlteracao.texto.replace(/ A ciência do responsável foi pedida de novo\.$/, "")}</p>
          </div>
        )}

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-lg font-semibold">Meta: {tot.meta} {tot.meta === 1 ? "carga" : "cargas"} para {d.itens.length} {d.itens.length === 1 ? "cliente" : "clientes"}</p>
          {d.itens.map((it: any, i: number) => {
            const p = d.progresso.itens[i];
            return (
              <div key={it.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold">{it.destinationName}</span>
                  <span className="text-base">{p.meta} {p.meta === 1 ? "carga" : "cargas"}</span>
                </div>
                <BarraProgresso pct={p.pct} cor={p.pct >= 100 ? "bg-emerald-500" : "bg-blue-500"} />
                <p className="text-sm text-gray-600">{comecou ? `Já saíram ${p.carregadas} de ${p.meta}${p.carregadas < p.meta ? ` · faltam ${p.meta - p.carregadas}` : " · meta cumprida!"}` : "Ainda não começou"}</p>
              </div>
            );
          })}
          {comecou && <p className="border-t pt-2 text-sm text-gray-600">No total: saíram {tot.carregadas} de {tot.meta} cargas.</p>}
          {g.description && <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm"><b>Orientações:</b> {g.description}</p>}
        </div>

        {d.permissoes.ciencia && (
          <div className="space-y-2 rounded-xl border-2 border-emerald-300 p-4">
            <p className="text-base font-semibold">{g.status === "em_negociacao" ? "Chegaram a um acordo?" : "Você concorda com esta meta?"}</p>
            <Button className="h-12 w-full bg-emerald-600 text-base text-white hover:bg-emerald-700" disabled={ack.isPending} onClick={() => ack.mutate({ id: goalId, ack: "de_acordo" })}>Sim, estou de acordo</Button>
            <Button variant="outline" className="h-12 w-full text-base" onClick={() => setMostraRessalva(v => !v)}>Não concordo ou tenho dúvida</Button>
            {mostraRessalva && (
              <div className="space-y-2">
                <Textarea rows={3} value={ressalva} onChange={e => setRessalva(e.target.value)} placeholder="Explique o que não está certo. Ex.: o trator está quebrado." />
                <Button className="h-11 w-full" disabled={!ressalva.trim() || ack.isPending} onClick={() => ack.mutate({ id: goalId, ack: "com_ressalva", comentario: ressalva })}>Enviar</Button>
              </div>
            )}
          </div>
        )}

        {!encerrada && (d.permissoes.editar || d.permissoes.encerrar) && (
          <div className="flex flex-wrap gap-2">
            {d.permissoes.editar && <Button variant="outline" className="h-11 gap-1" onClick={() => setEditar(true)}><Pencil className="h-4 w-4" /> Editar meta</Button>}
            {d.permissoes.resolverRessalva && g.status === "em_negociacao" && (
              <Button variant="outline" className="h-11" disabled={manter.isPending} onClick={() => {
                const j = window.prompt("Justificativa para manter a meta (o responsável será pedido para confirmar):");
                if (j && j.trim()) manter.mutate({ id: goalId, justificativa: j.trim() });
              }}>Manter a meta</Button>
            )}
            {d.permissoes.encerrar && (
              <Button variant="outline" className="h-11 gap-1" onClick={() => {
                const a = window.prompt("Avaliação final da semana (obrigatória):");
                if (a && a.trim()) encerrar.mutate({ id: goalId, avaliacao: a.trim() });
              }}><Flag className="h-4 w-4" /> Encerrar semana</Button>
            )}
            {d.permissoes.editar && (
              <Button variant="ghost" className="h-11 gap-1 text-red-600" onClick={() => {
                const m = window.prompt("Motivo do cancelamento:");
                if (m && m.trim()) cancelar.mutate({ id: goalId, motivo: m.trim() });
              }}><XCircle className="h-4 w-4" /> Cancelar meta</Button>
            )}
          </div>
        )}

        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-base font-semibold">{souResp ? "Conversa com a supervisão" : `Conversa com ${g.responsibleName}`}</p>
          {diasComConversa.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {diasComConversa.map(iso => (
                <button key={iso} type="button" onClick={() => { setDiaChat(iso === d.hoje ? null : iso); setRespondendoId(null); }}
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm ${iso === diaSel ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white text-gray-700"}`}>{nomeDiaCurto(iso)}</button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">{ehHojeChat ? "Conversa de hoje. Amanhã começa uma conversa nova; esta fica guardada neste dia." : `Conversa de ${fmtBR(diaSel).slice(0, 5)} (somente leitura).`}</p>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-2">
            {conversa.length === 0 && <p className="py-4 text-center text-sm text-gray-500">{ehHojeChat ? "Nenhuma mensagem hoje. Escreva abaixo se tiver alguma dúvida." : "Nenhuma mensagem neste dia."}</p>}
            {conversa.map((m: any) => {
              const minha = souResp ? m.papel === "responsavel" : m.papel !== "responsavel";
              return (
                <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-base ${minha ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm border bg-white"}`}>
                    <p className={`text-xs ${minha ? "text-emerald-100" : "text-gray-500"}`}>{minha ? "Você" : m.autor} · {hora(m.criadoEm)}</p>
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <AnexosMsg anexos={m.anexos} claro={minha} />
                    {!minha && m.kind === "pergunta" && !m.respondida && d.permissoes.mensagens.includes("resposta") && (
                      <button type="button" onClick={() => setRespondendoId(m.id)} className="mt-1 rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-800">Responder esta pergunta</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {respondendoId && <p className="text-sm text-blue-800">Respondendo a uma pergunta. <button type="button" className="underline" onClick={() => setRespondendoId(null)}>cancelar</button></p>}
          {ehHojeChat && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={msgSimples} onChange={e => setMsgSimples(e.target.value)} placeholder="Escreva sua mensagem..." className="h-11 text-base" />
                <Button className="h-11 bg-emerald-600 px-4 text-white hover:bg-emerald-700" disabled={(!msgSimples.trim() && !anexosSimples.length) || enviarMsg.isPending}
                  onClick={() => enviarMsg.mutate(respondendoId ? { goalId, kind: "resposta", body: msgSimples, parentId: respondendoId, anexos: anexosSimples } : { goalId, kind: "comentario", body: msgSimples, dia: d.hoje, anexos: anexosSimples })}><Send className="h-4 w-4" /></Button>
              </div>
              <BotaoAnexar anexos={anexosSimples} setAnexos={setAnexosSimples} />
            </div>
          )}
        </div>

        <button type="button" onClick={() => setVerDetalhes(true)} className="w-full py-2 text-center text-sm text-gray-500 underline">Ver detalhes dia a dia</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <Button variant="ghost" className="gap-1 -ml-2" onClick={() => setVerDetalhes(false)}><ArrowLeft className="h-4 w-4" /> Voltar ao resumo</Button>

      {/* Cabeçalho */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{g.responsibleName} · {g.title}</h1>
            <p className="text-xs text-gray-500">
              Semana {fmtBR(g.weekStart)} a {fmtBR(g.weekEnd)} · criada por {g.createdByName} · supervisores: {d.supervisores.map(s => s.name).join(", ") || "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.status === "em_andamento" && g.weekStart > new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
              ? <Badge className="bg-sky-100 text-sky-800">Começa em {fmtBR(g.weekStart).slice(0, 5)}</Badge>
              : <Badge className={STATUS_LABEL[g.status]?.cls}>{STATUS_LABEL[g.status]?.label}</Badge>}
            {g.ack === "de_acordo" && <Badge className="bg-emerald-100 text-emerald-800">De acordo</Badge>}
            {g.ack === "com_ressalva" && <Badge className="bg-amber-100 text-amber-800">Com ressalvas</Badge>}
          </div>
        </div>

        {d.ultimaAlteracao && g.status === "aguardando_ciencia" && (
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="flex items-center gap-1.5 font-semibold"><Pencil className="h-4 w-4" /> A supervisão alterou esta meta{d.ultimaAlteracao.criadoEm ? ` em ${new Date(d.ultimaAlteracao.criadoEm).toLocaleDateString("pt-BR")} às ${new Date(d.ultimaAlteracao.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            <p className="mt-1">{d.ultimaAlteracao.texto.replace(/ A ciência do responsável foi pedida de novo.$/, "")}</p>
            {d.permissoes.ciencia && <p className="mt-1 font-medium">Confira as mudanças e dê a sua ciência abaixo.</p>}
          </div>
        )}
        {g.description && <p className="text-sm bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{g.description}</p>}
        {g.ack === "com_ressalva" && g.ackComment && <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3"><b>Ressalva do responsável:</b> {g.ackComment}</p>}
        {g.closingSummary && <p className="text-sm bg-gray-50 border rounded-lg p-3"><b>{g.status === "cancelada" ? "Motivo do cancelamento" : "Avaliação final"}:</b> {g.closingSummary}</p>}

        <div className="space-y-2">
          {d.itens.map((it, i) => {
            const p = d.progresso.itens[i];
            return (
              <div key={it.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate font-medium">{it.destinationName}</span>
                <div className="flex-1"><BarraProgresso pct={p.pct} cor={p.pct >= 100 ? "bg-emerald-500" : "bg-blue-500"} /></div>
                <span className="w-44 text-right text-xs text-gray-600">{p.carregadas} de {p.meta} cargas{p.entregues ? ` · ${p.entregues} entregue(s)` : ""}</span>
              </div>
            );
          })}
          <p className="text-xs text-gray-500">Total: {d.progresso.total.carregadas} de {d.progresso.total.meta} cargas ({d.progresso.total.pct}%). As cargas vêm do Controle de Cargas, pela data de saída.</p>
        </div>

        {d.alertas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {d.alertas.map(a => (
              <span key={a} className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200"><AlertTriangle className="h-3 w-3" /> {ALERTA_LABEL[a]}</span>
            ))}
          </div>
        )}

        {/* Ações */}
        {d.permissoes.ciencia && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">{g.status === "em_negociacao" ? "Chegaram a um acordo? Retire a ressalva para a meta começar a valer." : "Você concorda com esta meta?"}</p>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={ack.isPending} onClick={() => ack.mutate({ id: goalId, ack: "de_acordo" })}>{g.status === "em_negociacao" ? "De acordo, retirar ressalva" : "De acordo"}</Button>
              <Button variant="outline" onClick={() => setMostraRessalva(v => !v)}>{g.status === "em_negociacao" ? "Manter ressalva (nova explicação)" : "Tenho ressalvas"}</Button>
            </div>
            {mostraRessalva && (
              <div className="space-y-2">
                <Textarea rows={2} value={ressalva} onChange={e => setRessalva(e.target.value)} placeholder="Explique o que não está de acordo (obrigatório)" />
                <Button size="sm" disabled={!ressalva.trim() || ack.isPending} onClick={() => ack.mutate({ id: goalId, ack: "com_ressalva", comentario: ressalva })}>Enviar ressalva</Button>
              </div>
            )}
          </div>
        )}
        {!encerrada && (d.permissoes.editar || d.permissoes.encerrar) && (
          <div className="flex flex-wrap gap-2">
            {d.permissoes.editar && <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditar(true)}><Pencil className="h-3.5 w-3.5" /> Editar meta</Button>}
            {d.permissoes.encerrar && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                const a = window.prompt("Avaliação final da semana (obrigatória):");
                if (a && a.trim()) encerrar.mutate({ id: goalId, avaliacao: a.trim() });
              }}><Flag className="h-3.5 w-3.5" /> Encerrar semana</Button>
            )}
            {d.permissoes.editar && (
              <Button size="sm" variant="ghost" className="gap-1 text-red-600" onClick={() => {
                const m = window.prompt("Motivo do cancelamento:");
                if (m && m.trim()) cancelar.mutate({ id: goalId, motivo: m.trim() });
              }}><XCircle className="h-3.5 w-3.5" /> Cancelar meta</Button>
            )}
          </div>
        )}
      </div>

      {(g.status === "em_negociacao" || d.conversaMeta.length > 0) && (
        <div className={`rounded-xl border p-4 space-y-3 ${g.status === "em_negociacao" ? "border-orange-300 bg-orange-50/50" : "bg-card"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-sm">{g.status === "em_negociacao" ? "Meta em negociação" : "Conversa sobre a meta"}</p>
            {g.status === "em_negociacao" && <Badge className="bg-orange-100 text-orange-800">Não está valendo até haver acordo</Badge>}
          </div>
          {g.status === "em_negociacao" && (
            <p className="text-xs text-gray-600">
              O responsável fez ressalvas. Enquanto não houver acordo, a meta não segue em andamento e não aceita relatos do dia. Conversem abaixo:
              a supervisão pode <b>editar a meta</b> (o responsável confirma de novo) ou <b>manter a meta</b> com uma justificativa; o responsável encerra a negociação ao dar o "de acordo".
            </p>
          )}
          <RelatosEConversa dia={{ relatos: [], mensagens: d.conversaMeta }} d={d} goalId={goalId} onChange={invalida} />
          <NovaMensagemGeral goalId={goalId} permitePergunta={d.permissoes.mensagens.includes("pergunta")} onChange={invalida} />
          {d.permissoes.resolverRessalva && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" disabled={manter.isPending} onClick={() => {
                const j = window.prompt("Justificativa para manter a meta (o responsável será pedido para confirmar):");
                if (j && j.trim()) manter.mutate({ id: goalId, justificativa: j.trim() });
              }}>Manter a meta e pedir confirmação</Button>
              {d.permissoes.editar && <Button size="sm" variant="outline" onClick={() => setEditar(true)}>Ajustar a meta</Button>}
            </div>
          )}
        </div>
      )}

      {d.permissoes.editar && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="gap-1 text-red-600 hover:text-red-700" disabled={excluir.isPending}
            onClick={() => {
              if (window.confirm("Excluir esta meta de vez? Os relatos, perguntas, respostas e avisos dela também serão apagados e não dá para desfazer.")) excluir.mutate({ id: goalId });
            }}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir meta
          </Button>
        </div>
      )}

      <Tabs defaultValue="dias">
        <TabsList>
          <TabsTrigger value="dias">Dia a dia</TabsTrigger>
          <TabsTrigger value="linha">Linha do tempo</TabsTrigger>
        </TabsList>
        <TabsContent value="dias" className="mt-3 space-y-3">
          {d.dias.map(dia => <CartaoDia key={dia.data} dia={dia} d={d} goalId={goalId} onChange={invalida} />)}
        </TabsContent>
        <TabsContent value="linha" className="mt-3">
          <LinhaDoTempo d={d} />
        </TabsContent>
      </Tabs>

      <Sheet open={editar} onOpenChange={setEditar}>
        <SheetContent className="z-[80] w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle className="text-emerald-800">Editar meta</SheetTitle></SheetHeader>
          <p className="text-xs text-amber-700 mt-1">Ao salvar, o responsável precisa dar ciência de novo e a alteração fica registrada na linha do tempo.</p>
          <div className="pt-4">
            {editar && (
              <WeeklyGoalForm semanaInicio={g.weekStart}
                inicial={{ id: g.id, title: g.title, description: g.description, responsibleUserId: g.responsibleUserId, supervisorIds: d.supervisores.map(s => s.userId).filter(u => u !== g.createdBy), itens: d.itens }}
                onDone={() => { setEditar(false); invalida(); }} onCancel={() => setEditar(false)} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ───────────────────────── Dia a dia ─────────────────────────

function CartaoDia({ dia: diaBruto, d, goalId, onChange }: { dia: any; d: any; goalId: number; onChange: () => void }) {
  // As movimentações do sistema (meta criada, alterada, ciência, encerrada...) ficam só na "Linha do tempo".
  const dia = { ...diaBruto, mensagens: diaBruto.mensagens.filter((m: any) => m.kind !== "sistema") };
  const ehHoje = dia.data === d.hoje;
  const futuro = dia.data > d.hoje;
  const temAtividade = dia.relatos.length > 0 || dia.cargas.length > 0 || dia.mensagens.length > 0;
  const [aberto, setAberto] = useState(ehHoje);
  const planejado = dia.porComprador.reduce((s, x) => s + (x.planejado ?? 0), 0);
  const temPlano = dia.porComprador.some(x => x.planejado != null);
  const saiu = dia.porComprador.reduce((s, x) => s + x.carregadas, 0);
  const problemas = dia.relatos.filter(r => r.kind === "problema" || r.situacao === "problema").length;
  const faltou = dia.porComprador.filter(x => x.planejado != null && x.carregadas < x.planejado);

  return (
    <div className={`rounded-xl border bg-card ${ehHoje ? "border-emerald-300" : ""}`}>
      <button className="w-full flex flex-wrap items-center justify-between gap-2 p-3 text-left" onClick={() => setAberto(a => !a)}>
        <span className="flex items-center gap-2 font-medium">
          {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {nomeDia(dia.data)}{ehHoje && <Badge className="bg-emerald-100 text-emerald-800">Hoje</Badge>}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          {temPlano && <Badge className="bg-gray-100 text-gray-700">Planejado {planejado}</Badge>}
          <Badge className={saiu > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}>Saíram {saiu}</Badge>
          {problemas > 0 && <Badge className="bg-red-100 text-red-700">{problemas} problema(s)</Badge>}
          {dia.mensagens.some(m => m.kind === "pergunta" && !m.respondida) && <Badge className="bg-blue-100 text-blue-800">Pergunta aberta</Badge>}
          {!futuro && !temAtividade && <span className="text-gray-400">sem registro</span>}
        </span>
      </button>

      {aberto && (
        <div className="border-t p-3 space-y-4">
          {/* Planejado × feito por comprador */}
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500"><tr><th className="text-left font-normal">Comprador</th><th className="text-right font-normal">Planejado</th><th className="text-right font-normal">Saíram</th><th className="text-right font-normal">Entregues</th></tr></thead>
            <tbody>
              {dia.porComprador.map(x => (
                <tr key={x.itemId} className="border-t">
                  <td className="py-1.5">{x.comprador}</td>
                  <td className="py-1.5 text-right">{x.planejado ?? "—"}</td>
                  <td className={`py-1.5 text-right font-medium ${x.planejado != null && x.carregadas < x.planejado && !futuro ? "text-red-700" : ""}`}>{x.carregadas}</td>
                  <td className="py-1.5 text-right">{x.entregues}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!futuro && faltou.length > 0 && <p className="text-xs text-red-700">Faltou: {faltou.map(x => `${x.planejado - x.carregadas} de ${x.comprador}`).join(", ")}.</p>}

          {/* Cargas do dia */}
          {dia.cargas.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Cargas do dia (Controle de Cargas)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-gray-500"><tr><th className="text-left font-normal">Registro</th><th className="text-left font-normal">Comprador</th><th className="text-left font-normal">Placa</th><th className="text-left font-normal">Motorista</th><th className="text-right font-normal">Peso</th><th className="text-left font-normal pl-2">Status</th></tr></thead>
                  <tbody>
                    {dia.cargas.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="py-1">{hora(c.registradoEm)}</td><td>{c.comprador}</td><td>{c.placa ?? "—"}</td><td>{c.motorista ?? "—"}</td>
                        <td className="text-right">{c.pesoKg ? `${(c.pesoKg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t` : "—"}</td>
                        <td className="pl-2"><Badge className={c.status === "entregue" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}>{c.status === "entregue" ? "Entregue" : "Em rota"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {dia.outrasCargas > 0 && <p className="text-xs text-gray-500">+ {dia.outrasCargas} carga(s) de outros compradores neste dia (fora da meta).</p>}

          {/* Relatos e conversa do dia */}
          <RelatosEConversa dia={dia} d={d} goalId={goalId} onChange={onChange} />

          {/* Conversa do dia: o que se escreve aqui conta como o relato do dia */}
          {!futuro && d.permissoes.mensagens.length > 0 && <NovaMensagem goalId={goalId} dia={dia.data} permitePergunta={d.permissoes.mensagens.includes("pergunta")} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

function RelatosEConversa({ dia, d, goalId, onChange }: any) {
  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const msg = trpc.weeklyGoals.addMessage.useMutation({ onSuccess: () => { setTexto(""); setRespondendo(null); onChange(); }, onError: e => toast.error(e.message) });
  const raizes = dia.mensagens.filter(m => !m.parentId);
  const respostasDe = (id: number) => dia.mensagens.filter(m => m.parentId === id);
  const podeResponder = d.permissoes.mensagens.includes("resposta");

  const eventos = [
    ...dia.relatos.map(r => ({ tipo: "relato", t: new Date(r.criadoEm).getTime(), r })),
    ...raizes.map(m => ({ tipo: "msg", t: new Date(m.criadoEm).getTime(), m })),
  ].sort((a, b) => a.t - b.t);

  if (eventos.length === 0) return <p className="text-xs text-gray-400">Sem relatos nem mensagens neste dia.</p>;
  return (
    <div className="space-y-3">
      {eventos.map((e, i) => e.tipo === "relato" ? (
        <div key={`r${e.r.id}`} className="text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">{hora(e.r.criadoEm)}</span>
            <Badge className={KIND[e.r.kind]?.cls}>{KIND[e.r.kind]?.label}</Badge>
            {e.r.situacao !== "ok" && e.r.kind !== "problema" && <Badge className={e.r.situacao === "problema" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}>{SITUACAO[e.r.situacao]}</Badge>}
            <span className="text-xs text-gray-500">{e.r.autor}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{e.r.body}</p>
          {e.r.fotos?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {e.r.fotos.map((u: string) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Foto do relato" className="h-20 w-20 object-cover rounded-lg border" /></a>)}
            </div>
          )}
        </div>
      ) : (
        <div key={`m${e.m.id}`} className="text-sm">
          {e.m.kind === "sistema" ? (
            <p className="text-xs text-gray-500 italic">{hora(e.m.criadoEm)} · {e.m.body}</p>
          ) : (
            <div className={`rounded-lg px-3 py-2 ${e.m.kind === "pergunta" ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MessageCircleQuestion className="h-3.5 w-3.5" /> <b>{e.m.autor}</b> · {e.m.papel === "responsavel" ? "responsável" : "supervisão"} · {hora(e.m.criadoEm)}
                {e.m.kind === "pergunta" && <Badge className={e.m.respondida ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{e.m.respondida ? "Respondida" : "Sem resposta"}</Badge>}
              </div>
              {e.m.body && <p className="mt-1 whitespace-pre-wrap">{e.m.body}</p>}
              <AnexosMsg anexos={e.m.anexos} />
              {respostasDe(e.m.id).map(r => (
                <div key={r.id} className="mt-2 ml-4 rounded bg-white border px-3 py-1.5">
                  <div className="text-xs text-gray-600"><b>{r.autor}</b> · {hora(r.criadoEm)}</div>
                  {r.body && <p className="whitespace-pre-wrap">{r.body}</p>}
                  <AnexosMsg anexos={r.anexos} />
                </div>
              ))}
              {podeResponder && (e.m.kind === "pergunta" || e.m.kind === "comentario") && (
                respondendo === e.m.id ? (
                  <div className="mt-2 flex gap-2">
                    <Input value={texto} onChange={ev => setTexto(ev.target.value)} placeholder="Sua resposta" className="h-9" />
                    <Button size="sm" disabled={!texto.trim() || msg.isPending} onClick={() => msg.mutate({ goalId, kind: "resposta", body: texto, parentId: e.m.id })}><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => { setRespondendo(e.m.id); setTexto(""); }}>Responder</Button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NovoRelato({ goalId, data, onChange, simples = false }: { goalId: number; data: string; onChange: () => void; simples?: boolean }) {
  const [kind, setKind] = useState<string>("andamento");
  const [situacao, setSituacao] = useState("ok");
  const [body, setBody] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const add = trpc.weeklyGoals.addEntry.useMutation({
    onSuccess: () => { toast.success("Relato registrado."); setBody(""); setFotos([]); setSituacao("ok"); onChange(); },
    onError: e => toast.error(e.message),
  });

  const aoFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - fotos.length);
    e.target.value = "";
    if (files.length === 0) return;
    setEnviando(true);
    try { const urls = await Promise.all(files.map(enviarFoto)); setFotos(f => [...f, ...urls]); }
    catch { toast.error("Não foi possível enviar a foto."); }
    finally { setEnviando(false); }
  };

  return (
    <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
      <p className="text-sm font-medium">{simples ? "Conte como está o dia de hoje" : `Registrar relato de ${nomeDia(data)}`}</p>
      {!simples && <div className="flex flex-wrap gap-1.5">
        {Object.entries(KIND).map(([k, v]) => (
          <button key={k} onClick={() => setKind(k)} className={`text-xs rounded-md border px-2.5 py-1.5 ${kind === k ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium" : "bg-white"}`}>{v.label}</button>
        ))}
      </div>}
      {!simples && kind !== "problema" && (
        <div className="flex gap-1.5">
          {Object.entries(SITUACAO).map(([k, v]) => (
            <button key={k} onClick={() => setSituacao(k)} className={`text-xs rounded-md border px-2 py-1 ${situacao === k ? "border-gray-700 bg-white font-medium" : "bg-white text-gray-500"}`}>{v}</button>
          ))}
        </div>
      )}
      <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={kind === "problema" ? "O que aconteceu?" : kind === "fechamento_dia" ? "Como foi a operação hoje?" : "Como está a operação?"} />
      {fotos.length > 0 && <div className="flex flex-wrap gap-2">{fotos.map(u => <img key={u} src={u} alt="Foto anexada" className="h-16 w-16 object-cover rounded-lg border" />)}</div>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" disabled={!body.trim() || add.isPending || enviando}
          onClick={() => add.mutate({ goalId, entryDate: data, kind, situacao, body, photoUrls: fotos })}><Send className="h-3.5 w-3.5" /> Enviar relato</Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={enviando || fotos.length >= 5} onClick={() => arq.current?.click()}><Camera className="h-3.5 w-3.5" /> {enviando ? "Enviando..." : "Foto"}</Button>
        <input ref={arq} type="file" accept="image/*" multiple className="hidden" onChange={aoFoto} />
      </div>
    </div>
  );
}

function NovaMensagem({ goalId, dia, permitePergunta = true, onChange }: { goalId: number; dia: string; permitePergunta?: boolean; onChange: () => void }) {
  const [kind, setKind] = useState<"pergunta" | "comentario">(permitePergunta ? "pergunta" : "comentario");
  const [body, setBody] = useState("");
  const [anexos, setAnexos] = useState<{ url: string; nome: string }[]>([]);
  const msg = trpc.weeklyGoals.addMessage.useMutation({ onSuccess: () => { setBody(""); setAnexos([]); onChange(); }, onError: e => toast.error(e.message) });
  return (
    <div className="space-y-2">
      <BotaoAnexar anexos={anexos} setAnexos={setAnexos} className="[&_button]:h-9" />
      <div className="flex items-center gap-2">
        {permitePergunta && (
          <select value={kind} onChange={e => setKind(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="pergunta">Perguntar</option><option value="comentario">Comentar</option>
          </select>
        )}
        <Input value={body} onChange={e => setBody(e.target.value)} placeholder={permitePergunta ? `${kind === "pergunta" ? "Pergunta" : "Comentário"} sobre ${nomeDia(dia)}` : `Como está a operação em ${nomeDia(dia)}?`} className="h-9" />
        <Button size="sm" disabled={(!body.trim() && !anexos.length) || msg.isPending} onClick={() => msg.mutate({ goalId, kind, body, dia, anexos })}><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function NovaMensagemGeral({ goalId, permitePergunta, onChange }: { goalId: number; permitePergunta: boolean; onChange: () => void }) {
  const [kind, setKind] = useState<"pergunta" | "comentario">(permitePergunta ? "pergunta" : "comentario");
  const [body, setBody] = useState("");
  const msg = trpc.weeklyGoals.addMessage.useMutation({ onSuccess: () => { setBody(""); onChange(); }, onError: e => toast.error(e.message) });
  return (
    <div className="flex items-center gap-2">
      {permitePergunta && (
        <select value={kind} onChange={e => setKind(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="pergunta">Perguntar</option><option value="comentario">Comentar</option>
        </select>
      )}
      <Input value={body} onChange={e => setBody(e.target.value)} placeholder="Escreva para o outro lado sobre a meta" className="h-9" />
      <Button size="sm" disabled={!body.trim() || msg.isPending} onClick={() => msg.mutate({ goalId, kind, body, geral: true })}><Send className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

// ───────────────────────── Linha do tempo ─────────────────────────

function LinhaDoTempo({ d }: { d: any }) {
  const eventos = useMemo(() => {
    const e = [
      ...d.relatos.map(r => ({ t: new Date(r.criadoEm).getTime(), tipo: "relato", r })),
      ...d.mensagens.map(m => ({ t: new Date(m.criadoEm).getTime(), tipo: "msg", m })),
    ];
    return e.sort((a, b) => a.t - b.t);
  }, [d]);
  if (eventos.length === 0) return <p className="text-sm text-gray-500">Ainda não há registros.</p>;
  return (
    <div className="border-l-2 ml-2 pl-4 space-y-3">
      {eventos.map((e, i) => (
        <div key={i} className="text-sm">
          <span className="text-xs text-gray-500">{new Date(e.t).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>{" "}
          {e.tipo === "relato" ? (
            <>
              <Badge className={KIND[e.r.kind]?.cls}>{KIND[e.r.kind]?.label}</Badge> <span className="text-xs text-gray-500">{e.r.autor}</span>
              <p className="whitespace-pre-wrap">{e.r.body}</p>
            </>
          ) : e.m.kind === "sistema" ? (
            <span className="text-xs italic text-gray-500">{e.m.body}</span>
          ) : (
            <>
              <Badge className={e.m.kind === "pergunta" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}>{e.m.kind === "pergunta" ? "Pergunta" : e.m.kind === "resposta" ? "Resposta" : "Comentário"}</Badge>{" "}
              <span className="text-xs text-gray-500">{e.m.autor}</span>
              <p className="whitespace-pre-wrap">{e.m.body}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

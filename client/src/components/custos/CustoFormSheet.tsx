// @ts-nocheck
// Formulário de lançamento de custo — feito para quem nunca usou o sistema:
// 4 passos visíveis (valor, o que foi, planta, tipo de gasto) + foto da nota; o resto fica em "Mais opções".
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useFilePicker } from "@/hooks/useFilePicker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Camera, Check, ChevronDown, Droplet, Fuel, Home, Loader2, MapPin, MoreHorizontal, Package,
  Route, Users, Utensils, Wifi, Wrench, X, Zap, FileText, Ban,
} from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "djob7pxme";
const CLOUDINARY_UPLOAD_PRESET = "btree_ambiental";

const ICONES: Record<string, any> = {
  fuel: Fuel, utensils: Utensils, wrench: Wrench, package: Package, users: Users, home: Home, zap: Zap,
  droplet: Droplet, wifi: Wifi, route: Route, more: MoreHorizontal,
};

export const FORMAS = [
  { v: "dinheiro", l: "Dinheiro" }, { v: "pix", l: "Pix" }, { v: "cartao_credito", l: "Cartão de crédito" },
  { v: "cartao_debito", l: "Cartão de débito" }, { v: "transferencia", l: "Transferência" }, { v: "boleto", l: "Boleto" },
  { v: "cheque", l: "Cheque" }, { v: "debito_conta", l: "Débito em conta" }, { v: "outro", l: "Outro" },
];

export const MOTIVOS_SEM_NOTA = [
  { v: "cheque", l: "Pago com cheque" },
  { v: "parcelado", l: "Compra parcelada" },
  { v: "sem_nota", l: "Pagamento sem nota (autônomo, informal)" },
  { v: "nota_depois", l: "A nota ainda vai chegar" },
  { v: "outro", l: "Outro motivo" },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

type Props = { open: boolean; onClose: () => void; onSaved: () => void; item?: any | null; modo?: "colaborador" };

export default function CustoFormSheet({ open, onClose, onSaved, item, modo }: Props) {
  const colab = modo === "colaborador";
  // Celular (toque): não abre o teclado sozinho ao abrir o formulário e acompanha a área visível,
  // para a janela não ficar escondida atrás do teclado.
  const toque = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    if (!open || !toque || typeof window === "undefined" || !window.visualViewport) return;
    const v = window.visualViewport;
    const atualizar = () => setVv({ h: v.height, top: v.offsetTop });
    atualizar();
    // Ao fechar o teclado o iPhone costuma deixar a página deslocada: volta ao topo e recalcula a área visível.
    let t: any;
    const aoSairDoCampo = () => { clearTimeout(t); t = setTimeout(() => { window.scrollTo(0, 0); atualizar(); }, 120); };
    v.addEventListener("resize", atualizar); v.addEventListener("scroll", atualizar);
    document.addEventListener("focusout", aoSairDoCampo);
    const aoEntrarNoCampo = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      setTimeout(() => el.scrollIntoView?.({ block: "center", behavior: "smooth" }), 320); // espera o teclado terminar de abrir
    };
    document.addEventListener("focusin", aoEntrarNoCampo);
    return () => { clearTimeout(t); v.removeEventListener("resize", atualizar); v.removeEventListener("scroll", atualizar); document.removeEventListener("focusout", aoSairDoCampo); document.removeEventListener("focusin", aoEntrarNoCampo); setVv(null); };
  }, [open, toque]);
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { openFilePicker } = useFilePicker();
  const plantas = trpc.custos.plantas.useQuery(undefined, { enabled: open });
  const categorias = trpc.custos.categorias.useQuery(undefined, { enabled: open });
  const cartoes = trpc.custos.cartoes.useQuery(undefined, { enabled: open });
  const colabs = trpc.custos.colaboradores.useQuery(undefined, { enabled: open });

  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [plantaId, setPlantaId] = useState<number | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [nfUrl, setNfUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mais, setMais] = useState(false);
  const [forma, setForma] = useState<string>("");
  const [cartaoId, setCartaoId] = useState<number | null>(null);
  const [gastoPor, setGastoPor] = useState("");
  const [gastoPorId, setGastoPorId] = useState<number | null>(null);
  const [data, setData] = useState(hoje());
  const [aPagar, setAPagar] = useState(false);
  const [repetir, setRepetir] = useState(false);
  const [meses, setMeses] = useState("12");
  const [parcelas, setParcelas] = useState(1);
  const [primeiraPaga, setPrimeiraPaga] = useState(false); // parcelado: a 1ª parcela só entra como paga se marcar
  const [vencimento, setVencimento] = useState("");
  const [favorecido, setFavorecido] = useState("");
  const [nfNumero, setNfNumero] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [temNota, setTemNota] = useState<"sim" | "nao" | null>(null); // gasto novo começa perguntando se tem nota
  const [semMotivo, setSemMotivo] = useState("");
  const [leitura, setLeitura] = useState<{ avisos: string[]; preenchidos: string[] } | null>(null);

  const bloqueado = item?.origem === "extrato_pedagio";
  const listaPlantas = plantas.data ?? [];
  const listaCats = (categorias.data ?? []).filter((c) => !c.automatica);

  // Preenche ao abrir: edição traz o lançamento; novo traz os "lembrados".
  useEffect(() => {
    if (!open) return;
    setErro(null);
    setLeitura(null);
    setLendo(false);
    if (item) {
      setValor(String(item.valor).replace(".", ","));
      setDescricao(item.descricao ?? "");
      setPlantaId(item.plantaId ?? null);
      setCategoriaId(item.categoriaId ?? null);
      setNfUrl(item.nfUrl ?? "");
      setTemNota(item.semNotaMotivo ? "nao" : "sim");
      setSemMotivo(item.semNotaMotivo ?? "");
      setForma(item.formaPagamento ?? "");
      setCartaoId(item.cartaoId ?? null);
      setGastoPor(item.gastoPorNome ?? "");
      setData(item.dataVencimento ?? item.dataCompetencia ?? hoje());
      setAPagar(item.status === "pendente"); setPrimeiraPaga(item.status === "pago");
      setRepetir(false); setParcelas(1);
      setVencimento(item.dataVencimento ?? "");
      setFavorecido(item.favorecido ?? "");
      setNfNumero(item.nfNumero ?? "");
      setObs(item.observacoes ?? "");
      setMais(true);
    } else {
      setValor(""); setDescricao(""); setCategoriaId(null); setNfUrl("");
      setTemNota(null); setSemMotivo("");
      setPlantaId(null); // o local é opcional e começa sem seleção
      setForma(lerLS("custo.forma") || "");
      setCartaoId(Number(lerLS("custo.cartao")) || null);
      setGastoPor("");
      setData(hoje()); setAPagar(false); setRepetir(false); setParcelas(1); setPrimeiraPaga(false); setMeses("12"); setVencimento(""); setFavorecido(""); setNfNumero(""); setObs("");
      setMais(false);
    }
  }, [open, item]);

  // "Quem gastou": edição acha o colaborador pelo nome gravado; gasto novo já vem com o colaborador de quem está logado.
  useEffect(() => {
    if (!open || !colabs.data) return;
    const lista = colabs.data;
    if (item) {
      const nome = (item.gastoPorNome ?? "").trim().toLowerCase();
      const m = nome ? lista.find((c) => c.nome.toLowerCase() === nome) : null;
      setGastoPorId(m ? m.id : null);
    } else {
      const eu = lista.find((c) => c.userId !== null && c.userId === user?.id);
      if (eu) { setGastoPorId(eu.id); setGastoPor(eu.nome); } else setGastoPorId(null);
    }
  }, [open, colabs.data, item]);

  // Se só existe uma planta liberada, já vem marcada; planta lembrada que não existe mais é descartada.
  useEffect(() => {
    if (!open || !plantas.data) return;
    if (plantas.data.length === 1) setPlantaId(plantas.data[0].id);
    else if (plantaId && !plantas.data.some((p) => p.id === plantaId)) setPlantaId(null);
  }, [open, plantas.data]);

  const criarAdm = trpc.custos.criar.useMutation();
  const criarMeu = trpc.custos.meusCriar.useMutation();
  const editarAdm = trpc.custos.editar.useMutation();
  const editarMeu = trpc.custos.meusEditar.useMutation();
  const criar = colab ? criarMeu : criarAdm;
  const editar = colab ? editarMeu : editarAdm;
  const alterar = trpc.custos.alterarStatus.useMutation();
  const cancelarMeu = trpc.custos.meusCancelar.useMutation();
  const salvando = criar.isPending || editar.isPending;
  const precisaCartao = forma === "cartao_credito" || forma === "cartao_debito";
  // parcelamento: cartão de crédito, boleto ou cheque (o valor informado é o total)
  const podeParcelar = forma === "cartao_credito" || forma === "boleto" || forma === "cheque";
  const qtdParcelas = podeParcelar && !item?.serieId ? parcelas : 1;
  const totalNum = Number(valor.replace(/\./g, "").replace(",", "."));
  const previaParcelas = totalNum > 0 && qtdParcelas > 1
    ? (totalNum / qtdParcelas).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;
  const lerNota = trpc.custos.lerNota.useMutation();

  // Lê a nota por IA e preenche só o que ainda está vazio (nunca apaga o que a pessoa já digitou)
  const lerPorIA = async (url: string) => {
    setLendo(true);
    setLeitura(null);
    try {
      const r = await lerNota.mutateAsync({ url });
      const p: string[] = [];
      if (r.valor && !valor.trim()) { setValor(r.valor.toFixed(2).replace(".", ",")); p.push("valor"); }
      if (r.descricao && !descricao.trim()) { setDescricao(r.descricao); p.push("descrição"); }
      if (r.data && (!data || data === hoje())) { setData(r.data); p.push("data"); }
      if (r.categoriaId && !categoriaId) { setCategoriaId(r.categoriaId); p.push("tipo de gasto"); }
      if (r.favorecido && !favorecido.trim()) { setFavorecido(r.favorecido); p.push("fornecedor"); }
      if (r.nfNumero && !nfNumero.trim()) { setNfNumero(r.nfNumero); p.push("nº da NF"); }
      if (r.formaPagamento) { setForma(r.formaPagamento); p.push("forma de pagamento"); }
      setLeitura({ avisos: r.avisos, preenchidos: p });
    } catch (e: any) {
      setLeitura({ avisos: [e?.message ?? "Não foi possível ler a nota. Preencha os campos à mão."], preenchidos: [] });
    } finally {
      setLendo(false);
    }
  };

  const enviarFoto = () =>
    openFilePicker({ accept: "image/*,application/pdf" }, async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo muito grande. Máximo 10 MB.");
      setEnviando(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
        const j = await res.json();
        if (j.secure_url) { setNfUrl(j.secure_url); if (!item && !bloqueado) lerPorIA(j.secure_url); }
        else toast.error("Não foi possível enviar a foto. Tente de novo.");
      } catch {
        toast.error("Não foi possível enviar a foto. Tente de novo.");
      } finally {
        setEnviando(false);
      }
    });

  const validar = () => {
    if (!valor.trim() || !(Number(valor.replace(/\./g, "").replace(",", ".")) > 0)) return "Informe o valor";
    if (!descricao.trim()) return "Diga o que foi o gasto";
    if (!categoriaId) return "Escolha o tipo de gasto";
    if (precisaCartao && !cartaoId) { setMais(true); return "Escolha o cartão"; }
    // novo gasto: com nota, a foto é obrigatória (a IA lê e preenche o resto); sem nota, é preciso dizer o motivo
    if (!item && temNota === "sim" && !nfUrl) return "Tire a foto ou anexe a nota/comprovante";
    if (!item && temNota === "nao" && !semMotivo) return "Escolha por que o gasto não tem nota";
    if (!item && temNota === "nao" && semMotivo === "outro" && !obs.trim()) { setMais(true); return "Explique nas observações por que o gasto não tem nota"; }
    if (enviando) return "Aguarde terminar o envio da foto";
    if (lendo) return "Aguarde terminar a leitura da nota";
    return null;
  };

  const salvar = async (outro: boolean) => {
    const e = validar();
    setErro(e);
    if (e) return;
    const payload = {
      valor: valor.trim(), descricao: descricao.trim(), plantaId, categoriaId, dataCompetencia: data || hoje(),
      formaPagamento: forma || null, cartaoId: precisaCartao ? cartaoId : null,
      gastoPorNome: gastoPor.trim() || null, gastoPorColaboradorId: gastoPorId || null, favorecido: favorecido.trim() || null,
      nfNumero: nfNumero.trim() || null, nfUrl: nfUrl || null, semNotaMotivo: !nfUrl && temNota === "nao" ? ((semMotivo || null) as any) : null, observacoes: obs.trim() || null,
      status: qtdParcelas > 1 ? (primeiraPaga ? "pago" : "pendente") : aPagar || repetir ? "pendente" : "pago",
      primeiraPaga: qtdParcelas > 1 ? primeiraPaga : undefined, dataVencimento: data || hoje(),
      repetirMeses: !item && repetir && qtdParcelas === 1 ? Math.min(36, Math.max(2, Math.floor(Number(meses)) || 2)) : undefined,
      parcelas: qtdParcelas > 1 ? qtdParcelas : undefined,
    };
    try {
      if (item) {
        await editar.mutateAsync({ ...payload, id: item.id });
        toast.success("Alterações salvas");
      } else {
        const r = await criar.mutateAsync(payload);
        if (forma) gravarLS("custo.forma", forma);
        if (cartaoId) gravarLS("custo.cartao", String(cartaoId));
        toast.success(qtdParcelas > 1 ? `Compra parcelada em ${r.criados}x: uma parcela por mês` : r.criados > 1 ? `${r.criados} lançamentos programados (um por mês)` : "Custo lançado", {
          duration: 8000,
          action: {
            label: "Desfazer",
            onClick: async () => {
              if (colab) await cancelarMeu.mutateAsync({ id: r.id });
              else await alterar.mutateAsync({ id: r.id, status: "cancelado" });
              utils.custos.listar.invalidate();
              utils.custos.meusListar.invalidate();
              toast.message("Lançamento cancelado");
            },
          },
        });
      }
      onSaved();
      if (outro && !item) {
        setValor(""); setDescricao(""); setNfUrl(""); setNfNumero(""); setObs(""); setFavorecido("");
        setTemNota(null); setSemMotivo(""); setLeitura(null); setParcelas(1);
        setErro(null);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErro(err?.message ?? "Não foi possível salvar");
    }
  };

  const Chip = ({ ativo, onClick, children, className = "" }: any) => (
    <button
      type="button" onClick={onClick}
      className={`min-h-12 rounded-xl border-2 px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2 text-center
        ${ativo ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"} ${className}`}
    >
      {children}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" showClose={false}
        className={toque ? "z-[60] flex flex-col overflow-hidden rounded-none border-0 p-0" : "flex max-h-[94dvh] flex-col overflow-hidden rounded-t-2xl p-0 md:mx-auto md:max-w-xl md:inset-y-auto md:top-[8dvh] md:bottom-auto md:max-h-[84dvh] md:rounded-2xl md:border"}
        onOpenAutoFocus={(e) => { if (toque) e.preventDefault(); }}
        style={toque ? { top: vv?.top ?? 0, bottom: "auto", height: vv?.h ?? "100dvh", maxHeight: "none" } : undefined}>
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-2.5">
          <SheetTitle className="text-lg">{item ? "Alterar gasto" : "Novo gasto"}</SheetTitle>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium text-gray-700 active:bg-gray-100">
            <X className="h-4 w-4" /> Fechar
          </button>
        </SheetHeader>

        {!item && temNota === null && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
            <p className="text-lg font-semibold">Este gasto tem nota fiscal?</p>
            <button type="button" onClick={() => setTemNota("sim")}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4 text-left active:bg-emerald-100">
              <Camera className="h-9 w-9 shrink-0 text-emerald-700" />
              <span>
                <span className="block text-base font-semibold text-emerald-900">Sim, tenho a nota ou o comprovante</span>
                <span className="block text-sm text-emerald-800">Tire a foto ou anexe o arquivo: o sistema lê e preenche os dados para você conferir.</span>
              </span>
            </button>
            <button type="button" onClick={() => setTemNota("nao")}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-gray-300 bg-white p-4 text-left active:bg-gray-50">
              <Ban className="h-9 w-9 shrink-0 text-gray-500" />
              <span>
                <span className="block text-base font-semibold text-gray-900">Não, este gasto não tem nota</span>
                <span className="block text-sm text-gray-600">Por exemplo: cheque, compra parcelada, pagamento sem nota. Você preenche à mão e diz o motivo.</span>
              </span>
            </button>
          </div>
        )}

        <div className={`min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-3 ${!item && temNota === null ? "hidden" : ""}`}>
          {bloqueado && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">Este pedágio veio do extrato do banco. Valor, data e tipo não mudam; você pode informar a planta, a nota e observações.</p>
          )}
          {/* 1. Foto da nota: primeiro, porque a leitura automática preenche o resto */}
          {(item || temNota === "sim") && (
          <div>
            <p className="mb-1 flex items-center justify-between text-base font-semibold"><span>Nota ou comprovante {!item && <span className="text-red-600">*</span>}</span>
              {!item && <button type="button" onClick={() => { setTemNota(null); setNfUrl(""); setLeitura(null); }} className="text-sm font-medium text-gray-500 underline">Não tem nota?</button>}</p>
            {nfUrl ? (
              <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-2">
                {/\.pdf($|\?)/i.test(nfUrl) ? (
                  <FileText className="h-12 w-12 text-emerald-700" />
                ) : (
                  <img src={nfUrl} alt="Nota" className="h-16 w-16 rounded-lg object-cover" />
                )}
                <span className="flex-1 text-sm font-medium text-emerald-800">Foto anexada</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setNfUrl("")}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button type="button" variant="outline" disabled={enviando} onClick={enviarFoto} className={`h-14 w-full gap-2 border-2 border-dashed text-base ${erro && !item && !nfUrl && /nota|comprovante/i.test(erro) ? "border-red-400 text-red-700" : ""}`}>
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {enviando ? "Enviando..." : "Tirar foto da nota"}
              </Button>
            )}
            {!item && !nfUrl && !enviando && <p className="mt-1 text-xs text-gray-500">Tire a foto primeiro: os campos abaixo são preenchidos pela leitura da nota.</p>}
            {lendo && <p className="mt-2 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800"><Loader2 className="h-4 w-4 animate-spin" /> Lendo a nota...</p>}
            {leitura && !lendo && (
              <div className={`mt-2 space-y-1 rounded-lg px-3 py-2 text-sm ${leitura.preenchidos.length ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                {leitura.preenchidos.length > 0 && <p className="font-medium">Preenchido pela leitura da nota: {leitura.preenchidos.join(", ")}. Confira antes de salvar.</p>}
                {leitura.avisos.map((a, i) => <p key={i} className="text-amber-800">⚠ {a}</p>)}
              </div>
            )}
          </div>
          )}

          {/* Sem nota: precisa dizer o motivo (cheque, compra parcelada...) */}
          {temNota === "nao" && (
            <div className="rounded-xl border-2 border-gray-200 p-3">
              <p className="mb-2 flex items-center justify-between text-base font-semibold"><span className="flex items-center gap-1"><Ban className="h-4 w-4 text-gray-500" /> Por que não tem nota? {!item && <span className="text-red-600">*</span>}</span>
                <button type="button" onClick={() => { setTemNota(item ? "sim" : null); setSemMotivo(""); }} className="text-sm font-medium text-gray-500 underline">{item ? "Anexar nota" : "Tem nota?"}</button></p>
              <div className="grid grid-cols-1 gap-2">
                {MOTIVOS_SEM_NOTA.map((m) => <Chip key={m.v} ativo={semMotivo === m.v} onClick={() => setSemMotivo(m.v)}>{semMotivo === m.v && <Check className="h-4 w-4" />} {m.l}</Chip>)}
              </div>
              {semMotivo === "outro" && <p className="mt-2 text-xs text-gray-600">Explique em “Mais opções → Observações”.</p>}
            </div>
          )}

          {/* 2. Valor */}
          <div>
            <label htmlFor="custo-valor" className="mb-1 block text-base font-semibold">Quanto foi?</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-gray-500">R$</span>
              <Input
                id="custo-valor" autoFocus={!toque && !!item} inputMode="decimal" placeholder="0,00" value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-14 text-2xl font-semibold" disabled={bloqueado || !!item?.parcelasTotal}
              />
            </div>
            {!!item?.parcelasTotal && <p className="mt-1 text-xs text-amber-800">Compra parcelada em {item.parcelasTotal}x: o valor de cada parcela não pode ser alterado.</p>}
          </div>

          {/* 3. O que foi */}
          <div>
            <label htmlFor="custo-desc" className="mb-1 block text-base font-semibold">O que foi?</label>
            <Input
              id="custo-desc" placeholder="Ex.: Conta de energia de novembro" value={descricao}
              onChange={(e) => setDescricao(e.target.value)} className="h-12 text-base" maxLength={255} disabled={bloqueado}
            />
          </div>

          {/* 4. Planta */}
          <div>
            <p className="mb-1 flex items-center gap-1 text-base font-semibold"><MapPin className="h-4 w-4 text-emerald-600" /> De qual local? <span className="text-xs font-normal text-gray-500">(opcional)</span></p>
            {plantas.isLoading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : listaPlantas.length === 0 ? (
              <p className="text-sm text-amber-700">Nenhum local liberado para o seu usuário. Fale com o escritório.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {listaPlantas.map((p) => (
                  <Chip key={p.id} ativo={plantaId === p.id} onClick={() => setPlantaId(plantaId === p.id ? null : p.id)}>
                    {plantaId === p.id && <Check className="h-4 w-4" />} {p.nome}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {/* 5. Tipo de gasto */}
          <div>
            <p className="mb-1 text-base font-semibold">Que tipo de gasto?</p>
            <div className="grid grid-cols-2 gap-2">
              {listaCats.map((c) => {
                const Icone = ICONES[c.icone ?? "more"] ?? MoreHorizontal;
                return (
                  <Chip key={c.id} ativo={categoriaId === c.id} onClick={() => !bloqueado && setCategoriaId(c.id)}>
                    <Icone className="h-4 w-4 shrink-0" /> {c.nome}
                  </Chip>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">Combustível é lançado no Controle de Abastecimento.</p>
          </div>

          {/* Mais opções */}
          <div className="rounded-xl border">
            <button type="button" onClick={() => setMais((m) => !m)} className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium text-gray-700">
              Mais opções
              <ChevronDown className={`h-4 w-4 transition ${mais ? "rotate-180" : ""}`} />
            </button>
            {mais && (
              <div className="space-y-4 border-t px-3 py-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Como foi pago?</label>
                  <select value={forma} disabled={bloqueado} onChange={(e) => setForma(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">Não sei / não informar</option>
                    {FORMAS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
                  </select>
                </div>
                {podeParcelar && !item?.serieId && (
                  <div className="rounded-lg bg-amber-50 p-2">
                    <label className="mb-1 block text-sm font-medium text-amber-900">{item ? "Dividir este gasto em parcelas?" : "Em quantas parcelas?"}</label>
                    <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value={1}>À vista (1x)</option>
                      {Array.from({ length: 35 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}x</option>)}
                    </select>
                    {qtdParcelas > 1 && (
                      <p className="mt-1 text-xs text-amber-900">
                        {previaParcelas
                          ? <>O valor informado é o <b>total</b>: {qtdParcelas}x de <b>{previaParcelas}</b>, vencendo todo mês a partir da data abaixo. {item ? "Este gasto vira a 1ª parcela e as demais são criadas como pendentes." : "Todas as parcelas ficam pendentes, a não ser que você marque que a 1ª já foi paga."}</>
                          : "Informe o valor total para ver o valor de cada parcela."}
                      </p>
                    )}
                  </div>
                )}
                {precisaCartao && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Qual cartão?</label>
                    <select value={cartaoId ?? ""} onChange={(e) => setCartaoId(e.target.value ? Number(e.target.value) : null)} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">Escolha...</option>
                      {(cartoes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}{c.final ? ` (final ${c.final})` : ""}</option>)}
                    </select>
                    {(cartoes.data ?? []).length === 0 && <p className="mt-1 text-xs text-amber-700">Nenhum cartão cadastrado. Peça ao escritório para cadastrar.</p>}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Quem gastou?</label>
                  <select
                    value={gastoPorId ? String(gastoPorId) : gastoPor ? "legado" : ""}
                    onChange={(e) => {
                      if (e.target.value === "legado") return;
                      const c = (colabs.data ?? []).find((x) => String(x.id) === e.target.value);
                      setGastoPorId(c ? c.id : null); setGastoPor(c ? c.nome : "");
                    }}
                    className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Não informado</option>
                    {(colabs.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    {!gastoPorId && gastoPor && <option value="legado">{gastoPor} (nome antigo)</option>}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Data (vencimento, ou o dia do gasto se já foi pago)</label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-11" disabled={bloqueado} />
                </div>
                {qtdParcelas > 1 && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={primeiraPaga} onChange={(e) => setPrimeiraPaga(e.target.checked)} className="h-4 w-4" />
                    A 1ª parcela já foi paga
                  </label>
                )}
                <label className={`flex items-center gap-2 text-sm ${colab || qtdParcelas > 1 ? "hidden" : ""}`}>
                  <input type="checkbox" checked={aPagar} onChange={(e) => setAPagar(e.target.checked)} className="h-4 w-4" />
                  Ainda não foi pago (conta a pagar)
                </label>
                {!item && !colab && (
                  <div className="rounded-lg bg-blue-50 p-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
                      <input type="checkbox" checked={repetir} onChange={(e) => { setRepetir(e.target.checked); if (e.target.checked) setAPagar(true); }} className="h-4 w-4" />
                      Repetir todo mês (programar gastos futuros)
                    </label>
                    {repetir && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          Por <Input type="number" inputMode="numeric" min={2} max={36} value={meses} onChange={(e) => setMeses(e.target.value)} className="h-10 w-20 text-center" /> meses
                        </div>
                        <p className="text-xs text-blue-800">Serão criados vários lançamentos “a pagar”, um por mês, a partir da data acima. Quando a conta chegar, abra o lançamento do mês, ajuste o valor e marque como pago.</p>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Para quem foi pago (loja, empresa)</label>
                  <Input value={favorecido} onChange={(e) => setFavorecido(e.target.value)} className="h-11" maxLength={150} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Número da nota fiscal</label>
                  <Input value={nfNumero} onChange={(e) => setNfNumero(e.target.value)} className="h-11" maxLength={40} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Observações</label>
                  <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}

          <div className="flex gap-2 border-t pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <Button type="button" disabled={salvando || enviando} onClick={() => salvar(false)} className="h-11 flex-1 bg-emerald-600 text-base text-white hover:bg-emerald-700">
              {salvando ? "Salvando..." : item ? "Salvar alterações" : "Salvar"}
            </Button>
            {!item && (
              <Button type="button" variant="outline" disabled={salvando || enviando} onClick={() => salvar(true)} className="h-11 px-3 text-sm">
                Salvar e novo
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

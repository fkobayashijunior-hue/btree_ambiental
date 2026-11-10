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
  Route, Users, Utensils, Wifi, Wrench, X, Zap, FileText,
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
  { v: "debito_conta", l: "Débito em conta" }, { v: "outro", l: "Outro" },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

type Props = { open: boolean; onClose: () => void; onSaved: () => void; item?: any | null; modo?: "colaborador" };

export default function CustoFormSheet({ open, onClose, onSaved, item, modo }: Props) {
  const colab = modo === "colaborador";
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
  const [vencimento, setVencimento] = useState("");
  const [favorecido, setFavorecido] = useState("");
  const [nfNumero, setNfNumero] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const bloqueado = item?.origem === "extrato_pedagio";
  const listaPlantas = plantas.data ?? [];
  const listaCats = (categorias.data ?? []).filter((c) => !c.automatica);

  // Preenche ao abrir: edição traz o lançamento; novo traz os "lembrados".
  useEffect(() => {
    if (!open) return;
    setErro(null);
    if (item) {
      setValor(String(item.valor).replace(".", ","));
      setDescricao(item.descricao ?? "");
      setPlantaId(item.plantaId ?? null);
      setCategoriaId(item.categoriaId ?? null);
      setNfUrl(item.nfUrl ?? "");
      setForma(item.formaPagamento ?? "");
      setCartaoId(item.cartaoId ?? null);
      setGastoPor(item.gastoPorNome ?? "");
      setData(item.dataVencimento ?? item.dataCompetencia ?? hoje());
      setAPagar(item.status === "pendente");
      setRepetir(false);
      setVencimento(item.dataVencimento ?? "");
      setFavorecido(item.favorecido ?? "");
      setNfNumero(item.nfNumero ?? "");
      setObs(item.observacoes ?? "");
      setMais(true);
    } else {
      setValor(""); setDescricao(""); setCategoriaId(null); setNfUrl("");
      setPlantaId(null); // o local é opcional e começa sem seleção
      setForma(lerLS("custo.forma") || "");
      setCartaoId(Number(lerLS("custo.cartao")) || null);
      setGastoPor("");
      setData(hoje()); setAPagar(false); setRepetir(false); setMeses("12"); setVencimento(""); setFavorecido(""); setNfNumero(""); setObs("");
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
        if (j.secure_url) setNfUrl(j.secure_url);
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
      nfNumero: nfNumero.trim() || null, nfUrl: nfUrl || null, observacoes: obs.trim() || null,
      status: aPagar || repetir ? "pendente" : "pago", dataVencimento: data || hoje(),
      repetirMeses: !item && repetir ? Math.min(36, Math.max(2, Math.floor(Number(meses)) || 2)) : undefined,
    };
    try {
      if (item) {
        await editar.mutateAsync({ ...payload, id: item.id });
        toast.success("Alterações salvas");
      } else {
        const r = await criar.mutateAsync(payload);
        if (forma) gravarLS("custo.forma", forma);
        if (cartaoId) gravarLS("custo.cartao", String(cartaoId));
        toast.success(r.criados > 1 ? `${r.criados} lançamentos programados (um por mês)` : "Custo lançado", {
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
        setErro(null);
        document.getElementById("custo-valor")?.focus();
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
      <SheetContent side="bottom" className="max-h-[94vh] overflow-y-auto rounded-t-2xl p-0 md:mx-auto md:max-w-xl">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="text-xl">{item ? "Alterar gasto" : "Novo gasto"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4 pt-2">
          {bloqueado && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">Este pedágio veio do extrato do banco. Valor, data e tipo não mudam; você pode informar a planta, a nota e observações.</p>
          )}
          {/* 1. Valor */}
          <div>
            <label htmlFor="custo-valor" className="mb-1 block text-base font-semibold">Quanto foi?</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-gray-500">R$</span>
              <Input
                id="custo-valor" autoFocus inputMode="decimal" placeholder="0,00" value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-14 text-2xl font-semibold" disabled={bloqueado}
              />
            </div>
          </div>

          {/* 2. O que foi */}
          <div>
            <label htmlFor="custo-desc" className="mb-1 block text-base font-semibold">O que foi?</label>
            <Input
              id="custo-desc" placeholder="Ex.: Conta de energia de novembro" value={descricao}
              onChange={(e) => setDescricao(e.target.value)} className="h-12 text-base" maxLength={255} disabled={bloqueado}
            />
          </div>

          {/* 3. Planta */}
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

          {/* 4. Tipo de gasto */}
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

          {/* 5. Foto da nota */}
          <div>
            <p className="mb-1 text-base font-semibold">Nota ou comprovante</p>
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
              <Button type="button" variant="outline" disabled={enviando} onClick={enviarFoto} className="h-14 w-full gap-2 border-2 border-dashed text-base">
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                {enviando ? "Enviando..." : "Tirar foto da nota"}
              </Button>
            )}
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
                <label className={`flex items-center gap-2 text-sm ${colab ? "hidden" : ""}`}>
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

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-white px-4 pb-1 pt-3">
            <Button type="button" disabled={salvando || enviando} onClick={() => salvar(false)} className="h-12 bg-emerald-600 text-base text-white hover:bg-emerald-700">
              {salvando ? "Salvando..." : item ? "Salvar alterações" : "Salvar"}
            </Button>
            {!item && (
              <Button type="button" variant="outline" disabled={salvando || enviando} onClick={() => salvar(true)} className="h-11">
                Salvar e lançar outro
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

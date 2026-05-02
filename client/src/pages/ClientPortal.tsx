import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Truck, Leaf, DollarSign, LogOut, TreePine, Mail, Lock, Eye, EyeOff, Phone, X, Weight, MapPin, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";

type TrackingStatus = "aguardando" | "carregando" | "em_transito" | "pesagem_saida" | "descarregando" | "pesagem_chegada" | "finalizado";

const TRACKING_STEPS: { key: TrackingStatus; label: string; icon: string; desc: string }[] = [
  { key: "aguardando", label: "Aguardando", icon: "⏳", desc: "Carga aguardando início do carregamento" },
  { key: "carregando", label: "Carregando", icon: "📦", desc: "Carga sendo carregada no caminhão" },
  { key: "em_transito", label: "Em Trânsito", icon: "🚛", desc: "Caminhão a caminho do destino" },
  { key: "pesagem_saida", label: "Pesagem Saída", icon: "⚖️", desc: "Realizando pesagem na saída" },
  { key: "descarregando", label: "Descarregando", icon: "🏭", desc: "Carga sendo descarregada no destino" },
  { key: "pesagem_chegada", label: "Pesagem Chegada", icon: "⚖️", desc: "Realizando pesagem na chegada" },
  { key: "finalizado", label: "Finalizado", icon: "✅", desc: "Entrega concluída com sucesso" },
];

const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://res.cloudinary.com/djob7pxme/image/upload/v1773053506/btree-static/bubi6hkzpedz2tj7ti8v.png";

function DevContactButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity group"
        title="Desenvolvido por Kobayashi Dev"
      >
        <img
          src={KOBAYASHI_LOGO}
          alt="Desenvolvido por Kobayashi"
          className="h-10 object-contain group-hover:scale-105 transition-transform"
        />
        <span className="text-[10px] text-white/50 group-hover:text-white/80">Desenvolvedor</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-5">
              <img
                src={KOBAYASHI_LOGO}
                alt="Kobayashi Desenvolvimento"
                className="h-12 w-auto object-contain mx-auto mb-3"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h3 className="font-black text-gray-900 text-lg">Kobayashi Desenvolvimento</h3>
              <p className="text-gray-500 text-sm">Sistemas para seu negócio</p>
            </div>
            <div className="space-y-3">
              <a
                href="https://wa.me/5515997056890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">WhatsApp</p>
                  <p className="text-gray-500 text-xs">(15) 99705-6890</p>
                </div>
              </a>
              <a
                href="mailto:fkobayashijunior@gmail.com"
                className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">E-mail</p>
                  <p className="text-gray-500 text-xs">fkobayashijunior@gmail.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ClientSession = {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientCity: string | null;
};

// ── LOGIN ──
function ClientLogin({ onLogin }: { onLogin: (session: ClientSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.clientPortal.login.useMutation({
    onSuccess: (data) => {
      onLogin(data);
    },
    onError: (err) => {
      toast.error(err.message || "E-mail ou senha incorretos.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0d4f2e] to-[#1a5c3a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={BTREE_LOGO}
            alt="BTREE Ambiental"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-white text-2xl font-black">Área do Cliente</h1>
          <p className="text-green-200 text-sm mt-1">
            Acompanhe suas cargas, replantio e pagamentos
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-gray-900 font-bold text-lg mb-1">Acesse sua conta</h2>
          <p className="text-gray-500 text-sm mb-6">
            Use o e-mail e senha cadastrados pela BTREE Ambiental
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  inputMode="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  autoComplete="email"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-[#2e7d32] focus:outline-none transition-colors text-gray-900 placeholder-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-10 rounded-xl border-2 border-gray-200 focus:border-[#2e7d32] focus:outline-none transition-colors text-gray-900 placeholder-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-xl font-bold text-white text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #0d4f2e 0%, #1a5c3a 100%)",
              }}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                "Acessar Portal"
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">
            Problemas para acessar?{" "}
            <a
              href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+preciso+de+ajuda+para+acessar+o+portal+do+cliente+BTREE!"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d4f2e] font-semibold hover:underline"
            >
              Fale com a BTREE
            </a>
          </p>
        </div>

        <p className="text-center text-green-300/60 text-xs mt-4">
          Confiança que floresce, futuro que se constrói.
        </p>
        <div className="flex justify-center mt-4">
          <DevContactButton />
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD DO CLIENTE ──
function ClientDashboard({ session, onLogout }: { session: ClientSession; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"cargas" | "replantio" | "pagamentos">("cargas");

  const { data, isLoading } = trpc.clientPortal.getPortalData.useQuery(
    { clientId: session.clientId, email: session.clientEmail ?? "" },
    { retry: false }
  );

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (v: string | null) => {
    if (!v) return "—";
    const num = parseFloat(v);
    if (isNaN(num)) return v;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const statusColor = (s: string) => {
    if (s === "pago" || s === "entregue") return "bg-green-100 text-green-700";
    if (s === "pendente") return "bg-yellow-100 text-yellow-700";
    if (s === "atrasado") return "bg-red-100 text-red-700";
    if (s === "cancelado") return "bg-gray-100 text-gray-500";
    return "bg-blue-100 text-blue-700";
  };

  const totalPago = data?.payments
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + parseFloat(p.netAmount || "0"), 0) ?? 0;

  const totalPendente = data?.payments
    .filter((p) => p.status === "pendente" || p.status === "atrasado")
    .reduce((acc, p) => acc + parseFloat(p.netAmount || "0"), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={BTREE_LOGO}
              alt="BTREE Ambiental"
              className="h-8 w-auto object-contain"
            />
            <div>
              <p className="font-bold text-sm leading-none">{session.clientName}</p>
              <p className="text-green-300 text-xs mt-0.5">Portal do Cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-sm"
              title="Voltar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              Voltar
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Cards de resumo */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <Truck className="h-5 w-5 text-[#0d4f2e] mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{data?.loads.length ?? 0}</div>
              <div className="text-gray-500 text-xs">Cargas</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <TreePine className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{data?.replanting.length ?? 0}</div>
              <div className="text-gray-500 text-xs">Replantios</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <DollarSign className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{data?.payments.length ?? 0}</div>
              <div className="text-gray-500 text-xs">Pagamentos</div>
            </div>
          </div>
        )}

        {/* Resumo financeiro */}
        {!isLoading && (data?.payments.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-green-700 text-xs font-semibold uppercase tracking-wide mb-1">Total Recebido</p>
              <p className="text-green-800 text-lg font-black">{formatCurrency(totalPago.toString())}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">A Receber</p>
              <p className="text-amber-800 text-lg font-black">{formatCurrency(totalPendente.toString())}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { id: "cargas" as const, label: "Cargas", icon: Truck },
              { id: "replantio" as const, label: "Replantio", icon: Leaf },
              { id: "pagamentos" as const, label: "Pagamentos", icon: DollarSign },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
                  activeTab === id
                    ? "text-[#0d4f2e] border-b-2 border-[#0d4f2e] bg-green-50/50"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* ── CARGAS ── */}
                {activeTab === "cargas" && (
                  <div className="space-y-3">
                    {(data?.loads.length ?? 0) === 0 ? (
                      <EmptyState icon={<Truck />} text="Nenhuma carga registrada ainda." />
                    ) : (
                      data?.loads.map((load) => (
                        <CargoCard key={load.id} load={load} formatDate={formatDate} statusColor={statusColor} clientId={session.clientId} />
                      ))
                    )}
                  </div>
                )}

                {/* ── REPLANTIO ── */}
                {activeTab === "replantio" && (
                  <div className="space-y-3">
                    {(data?.replanting.length ?? 0) === 0 ? (
                      <EmptyState icon={<TreePine />} text="Nenhum replantio registrado ainda." />
                    ) : (
                      data?.replanting.map((r) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-emerald-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {r.species || "Eucalipto"}
                                {r.area && ` — ${r.area}`}
                              </p>
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                                <span>{formatDate(r.date)}</span>
                                {r.quantity && <span>{r.quantity.toLocaleString("pt-BR")} mudas</span>}
                                {r.areaHectares && <span>{r.areaHectares} ha</span>}
                              </div>
                              {r.notes && <p className="text-gray-400 text-xs mt-1 italic">{r.notes}</p>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── PAGAMENTOS ── */}
                {activeTab === "pagamentos" && (
                  <div className="space-y-3">
                    {(data?.payments.length ?? 0) === 0 ? (
                      <EmptyState icon={<DollarSign />} text="Nenhum pagamento registrado ainda." />
                    ) : (
                      data?.payments.map((p) => (
                        <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-amber-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {p.description || "Pagamento"}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>
                                  {p.status}
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                                <span>Ref: {formatDate(p.referenceDate)}</span>
                                {p.dueDate && <span>Venc: {formatDate(p.dueDate)}</span>}
                                {p.volumeM3 && <span>{p.volumeM3} m³</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-gray-900 text-sm">{formatCurrency(p.netAmount)}</p>
                              {p.grossAmount !== p.netAmount && (
                                <p className="text-gray-400 text-xs line-through">{formatCurrency(p.grossAmount)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Rodapé com logo do desenvolvedor */}
      <footer className="bg-gradient-to-r from-[#0d4f2e] to-[#1a5c3a] py-4 px-4 mt-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <DevContactButton />
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="w-10 h-10 mx-auto mb-3 opacity-30">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── CARGO CARD COM TRACKING ──
type CargoLoad = {
  id: number;
  date: Date | string | null;
  destination: string | null;
  status: string;
  volumeM3: string | null;
  woodType: string | null;
  weightKg: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  invoiceNumber: string | null;
  trackingStatus: string | null;
  trackingNotes: string | null;
  trackingUpdatedAt: Date | string | null;
  weightOutPhotoUrl: string | null;
  weightInPhotoUrl: string | null;
  photosJson: string | null;
};

function CargoCard({ load, formatDate, statusColor, clientId }: { load: CargoLoad; formatDate: (d: Date | string | null) => string; statusColor: (s: string) => string; clientId: number }) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = TRACKING_STEPS.find(s => s.key === load.trackingStatus);
  const currentIdx = TRACKING_STEPS.findIndex(s => s.key === load.trackingStatus);
  const photos: string[] = load.photosJson ? (() => { try { return JSON.parse(load.photosJson); } catch { return []; } })() : [];

  // Buscar fotos de tracking por etapa
  const { data: trackingPhotos } = trpc.cargoLoads.getTrackingPhotosPublic.useQuery(
    { cargoId: load.id, clientId },
    { enabled: expanded }
  );

  // Agrupar fotos por etapa
  const photosByStage = (trackingPhotos ?? []).reduce<Record<string, typeof trackingPhotos>>((acc, p) => {
    if (!acc[p.stage]) acc[p.stage] = [];
    acc[p.stage]!.push(p);
    return acc;
  }, {});

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#2e7d32]/30 transition-colors">
      {/* Header da carga */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">
                {load.destination || "Destino não informado"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(load.status)}`}>
                {load.status}
              </span>
              {currentStep && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                  {currentStep.icon} {currentStep.label}
                </span>
              )}
            </div>
            <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
              <span>{formatDate(load.date)}</span>
              {load.volumeM3 && <span>{load.volumeM3} m³</span>}
              {load.weightKg && <span className="flex items-center gap-0.5"><Weight className="h-3 w-3" />{load.weightKg} kg</span>}
              {load.woodType && <span>{load.woodType}</span>}
              {load.vehiclePlate && <span className="flex items-center gap-0.5"><Truck className="h-3 w-3" />{load.vehiclePlate}</span>}
            </div>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-gray-400 hover:text-[#2e7d32] transition-colors p-1"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Timeline de tracking */}
          {load.trackingStatus && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Acompanhamento</p>
              <div className="relative">
                {TRACKING_STEPS.map((step, idx) => {
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isPending = idx > currentIdx;
                  return (
                    <div key={step.key} className="flex items-start gap-3 mb-2 last:mb-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${
                        isDone ? "bg-green-500 text-white" : isCurrent ? "bg-[#2e7d32] text-white ring-4 ring-green-100" : "bg-gray-200 text-gray-400"
                      }`}>
                        {isDone ? "✓" : step.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isDone ? "text-green-700" : isCurrent ? "text-[#2e7d32] font-bold" : "text-gray-400"
                        }`}>{step.label}</p>
                        {isCurrent && load.trackingNotes && (
                          <p className="text-xs text-gray-500 italic mt-0.5">"{load.trackingNotes}"</p>
                        )}
                        {isCurrent && load.trackingUpdatedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Atualizado em {formatDate(load.trackingUpdatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fotos de Tracking por Etapa */}
          {Object.keys(photosByStage).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Fotos por Etapa
              </p>
              <div className="space-y-3">
                {TRACKING_STEPS.filter(s => photosByStage[s.key]).map(step => (
                  <div key={step.key}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{step.icon} {step.label}</p>
                    <div className="flex gap-2 flex-wrap">
                      {photosByStage[step.key]!.map((tp: any) => (
                        <div key={tp.id} className="relative group">
                          <img
                            src={tp.photoUrl}
                            alt={`${step.label}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(tp.photoUrl, "_blank")}
                          />
                          {tp.notes && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">
                              {tp.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fotos de pesagem */}
          {(load.weightOutPhotoUrl || load.weightInPhotoUrl) && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fotos de Pesagem</p>
              <div className="flex gap-3">
                {load.weightOutPhotoUrl && (
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Saída</p>
                    <img
                      src={load.weightOutPhotoUrl}
                      alt="Pesagem saída"
                      className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => window.open(load.weightOutPhotoUrl!, "_blank")}
                    />
                  </div>
                )}
                {load.weightInPhotoUrl && (
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Chegada</p>
                    <img
                      src={load.weightInPhotoUrl}
                      alt="Pesagem chegada"
                      className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => window.open(load.weightInPhotoUrl!, "_blank")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fotos da carga */}
          {photos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fotos da Carga ({photos.length})</p>
              <div className="flex gap-2 flex-wrap">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`Foto ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                    onClick={() => window.open(p, "_blank")}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dados adicionais */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {load.driverName && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Motorista</p>
                <p className="font-medium text-gray-700">{load.driverName}</p>
              </div>
            )}
            {load.invoiceNumber && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Nota Fiscal</p>
                <p className="font-medium text-gray-700">{load.invoiceNumber}</p>
              </div>
            )}
            {(load as any).weightOutKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Bruto Saída</p>
                <p className="font-medium text-gray-700">{(load as any).weightOutKg} kg</p>
              </div>
            )}
            {(load as any).weightInKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Bruto Chegada</p>
                <p className="font-medium text-gray-700">{(load as any).weightInKg} kg</p>
              </div>
            )}
            {(load as any).weightNetKg && (
              <div className="bg-white rounded-lg p-2">
                <p className="text-gray-400">Peso Líquido</p>
                <p className="font-medium text-emerald-700 font-bold">{(load as any).weightNetKg} kg</p>
              </div>
            )}
            {(load as any).finalHeightM && (
              <div className="bg-white rounded-lg p-2 col-span-2">
                <p className="text-gray-400">Metragem Final</p>
                <p className="font-medium text-gray-700">
                  {(load as any).finalHeightM} x {(load as any).finalWidthM} x {(load as any).finalLengthM} m
                  {' = '}{(parseFloat(((load as any).finalHeightM || '0').replace(',','.')) * parseFloat(((load as any).finalWidthM || '0').replace(',','.')) * parseFloat(((load as any).finalLengthM || '0').replace(',','.'))).toFixed(2)} m³
                </p>
              </div>
            )}
          </div>

          {/* Documentos compartilhados */}
          {((load as any).invoiceUrl || (load as any).boletoUrl || (load as any).paymentReceiptUrl) && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">📄 Documentos</p>
              <div className="flex flex-wrap gap-2">
                {(load as any).invoiceUrl && (
                  <a
                    href={(load as any).invoiceUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    📋 Nota Fiscal
                  </a>
                )}
                {(load as any).boletoUrl && (
                  <a
                    href={(load as any).boletoUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors border border-orange-200"
                  >
                    🧾 Boleto
                    {(load as any).boletoAmount && <span className="ml-1">R$ {(load as any).boletoAmount}</span>}
                  </a>
                )}
                {(load as any).paymentReceiptUrl && (
                  <a
                    href={(load as any).paymentReceiptUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors border border-green-200"
                  >
                    ✅ Comprovante
                  </a>
                )}
              </div>
              {(load as any).paymentStatus && (
                <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                  (load as any).paymentStatus === 'pago'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {(load as any).paymentStatus === 'pago' ? '✅ Pago' : '⏳ A Pagar'}
                  {(load as any).boletoDueDate && (load as any).paymentStatus !== 'pago' && (
                    <span className="ml-1">· Venc: {new Date((load as any).boletoDueDate).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(() => {
    try {
      const saved = localStorage.getItem("btree_client_session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const handleLogin = (data: ClientSession) => {
    setSession(data);
    localStorage.setItem("btree_client_session", JSON.stringify(data));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("btree_client_session");
  };

  if (!session) {
    return <ClientLogin onLogin={handleLogin} />;
  }

  return (
    <ClientDashboard
      session={session}
      onLogout={handleLogout}
    />
  );
}

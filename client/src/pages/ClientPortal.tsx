import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Truck, Leaf, DollarSign, LogOut, TreePine, Mail, Lock, Eye, EyeOff, Phone, X } from "lucide-react";

const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://res.cloudinary.com/djob7pxme/image/upload/v1773053506/btree-static/bubi6hkzpedz2tj7ti8v.png";

function DevContactButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity group"
        title="Desenvolvido por Kobayashi"
      >
        <span className="text-xs text-green-200 group-hover:text-white transition-colors">Desenvolvido por</span>
        <img
          src={KOBAYASHI_LOGO}
          alt="Kobayashi Desenvolvimento"
          className="h-8 w-auto object-contain filter brightness-0 invert"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const span = document.createElement('span');
            span.textContent = 'Kobayashi';
            span.className = 'text-xs font-bold text-white';
            img.parentNode?.appendChild(span);
          }}
        />
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1b5e20] to-[#2e7d32] px-4">
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
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
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
              className="text-[#2e7d32] font-semibold hover:underline"
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
      <header className="bg-[#1b5e20] text-white px-4 py-4 shadow-lg">
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
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-sm"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
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
              <Truck className="h-5 w-5 text-[#2e7d32] mx-auto mb-1" />
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
                    ? "text-[#2e7d32] border-b-2 border-[#2e7d32] bg-green-50/50"
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
                        <div key={load.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#2e7d32]/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {load.destination || "Destino não informado"}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(load.status)}`}>
                                  {load.status}
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-3 flex-wrap">
                                <span>{formatDate(load.date)}</span>
                                {load.volumeM3 && <span>{load.volumeM3} m³</span>}
                                {load.woodType && <span>{load.woodType}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
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
      <footer className="bg-[#1b5e20] py-4 px-4 mt-4">
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

// ── COMPONENTE PRINCIPAL ──
export default function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(null);

  if (!session) {
    return <ClientLogin onLogin={setSession} />;
  }

  return (
    <ClientDashboard
      session={session}
      onLogout={() => setSession(null)}
    />
  );
}

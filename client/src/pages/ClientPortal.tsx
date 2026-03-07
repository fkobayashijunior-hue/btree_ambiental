import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Truck, Leaf, DollarSign, LogOut, TreePine, Calendar, MapPin, Package } from "lucide-react";

const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";

type ClientSession = {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientCity: string | null;
  accessCode: string;
};

// ── LOGIN ──
function ClientLogin({ onLogin }: { onLogin: (session: ClientSession) => void }) {
  const [code, setCode] = useState("");

  const loginMutation = trpc.clientPortal.login.useMutation({
    onSuccess: (data) => {
      onLogin({ ...data, accessCode: code.trim().toUpperCase() });
    },
    onError: (err) => {
      toast.error(err.message || "Código inválido. Verifique com a BTREE Ambiental.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    loginMutation.mutate({ accessCode: code.trim().toUpperCase() });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1b5e20] to-[#2e7d32] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={BTREE_LOGO}
            alt="BTREE Ambiental"
            className="h-16 w-auto object-contain mx-auto mb-4 brightness-0 invert"
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
            Digite o código de acesso fornecido pela BTREE Ambiental
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                Código de Acesso
              </label>
              <input
                type="text"
                placeholder="Ex: 482931"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full h-14 px-4 text-center text-2xl font-bold tracking-widest rounded-xl border-2 border-gray-200 focus:border-[#2e7d32] focus:outline-none transition-colors text-gray-900 placeholder-gray-300"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || !code.trim()}
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
            Não tem seu código?{" "}
            <a
              href="https://wa.me/5544988334679?text=Ol%C3%A1%2C+preciso+do+meu+c%C3%B3digo+de+acesso+ao+portal+do+cliente+BTREE!"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2e7d32] font-semibold hover:underline"
            >
              Fale com a BTREE
            </a>
          </p>
        </div>

        <p className="text-center text-green-300/60 text-xs mt-6">
          Confiança que floresce, futuro que se constrói.
        </p>
      </div>
    </div>
  );
}

// ── DASHBOARD DO CLIENTE ──
function ClientDashboard({ session, onLogout }: { session: ClientSession; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"cargas" | "replantio" | "pagamentos">("cargas");

  const { data, isLoading } = trpc.clientPortal.getPortalData.useQuery(
    { clientId: session.clientId, accessCode: session.accessCode },
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
              className="h-8 w-auto object-contain brightness-0 invert"
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
                                  {load.woodType || "Eucalipto"}
                                </span>
                                {load.volumeM3 && (
                                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                    {load.volumeM3} m³
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(load.date)}
                                </span>
                                {load.destination && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {load.destination}
                                  </span>
                                )}
                                {load.invoiceNumber && (
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    NF {load.invoiceNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusColor(load.status)}`}>
                              {load.status === "entregue" ? "Entregue" : load.status === "pendente" ? "Em trânsito" : "Cancelado"}
                            </span>
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
                      <EmptyState icon={<Leaf />} text="Nenhum replantio registrado ainda." />
                    ) : (
                      data?.replanting.map((r) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#2e7d32]/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {r.species || "Eucalipto"}
                                </span>
                                {r.quantity && (
                                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    {r.quantity.toLocaleString("pt-BR")} mudas
                                  </span>
                                )}
                                {r.areaHectares && (
                                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                    {r.areaHectares} ha
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(r.date)}
                                </span>
                                {r.area && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {r.area}
                                  </span>
                                )}
                              </div>
                              {r.notes && (
                                <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{r.notes}</p>
                              )}
                            </div>
                            <TreePine className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
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
                        <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#2e7d32]/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">
                                {p.description || "Compra de eucalipto"}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Ref: {formatDate(p.referenceDate)}
                                </span>
                                {p.dueDate && (
                                  <span>Venc: {formatDate(p.dueDate)}</span>
                                )}
                                {p.paidAt && (
                                  <span className="text-green-600">Pago em {formatDate(p.paidAt)}</span>
                                )}
                              </div>
                              {p.volumeM3 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {p.volumeM3} m³ × {p.pricePerM3 ? formatCurrency(p.pricePerM3) + "/m³" : ""}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-gray-900 text-base">{formatCurrency(p.netAmount)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${statusColor(p.status)}`}>
                                {p.status === "pago" ? "Pago" : p.status === "pendente" ? "Pendente" : p.status === "atrasado" ? "Atrasado" : "Cancelado"}
                              </span>
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

        {/* Contato */}
        <div className="bg-[#1b5e20]/5 border border-[#2e7d32]/20 rounded-2xl p-4 text-center">
          <p className="text-gray-600 text-sm mb-2">Dúvidas? Fale com a BTREE Ambiental</p>
          <a
            href="https://wa.me/5544988334679"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2e7d32] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#1b5e20] transition-colors"
          >
            WhatsApp — (44) 98833-4679
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm">{text}</p>
      <p className="text-xs mt-1">Os registros aparecerão aqui quando forem lançados.</p>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(null);

  if (!session) {
    return <ClientLogin onLogin={setSession} />;
  }

  return <ClientDashboard session={session} onLogout={() => setSession(null)} />;
}

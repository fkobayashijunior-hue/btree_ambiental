import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Fuel, Users, Calendar, Leaf, DollarSign, Wrench, AlertTriangle, ShoppingCart, CheckCircle2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function StatCard({
  title, value, description, icon: Icon, color, loading
}: {
  title: string; value: string | number; description: string; icon: React.ElementType; color: string; loading?: boolean;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery(
    { month: selectedMonth, year: selectedYear },
    { refetchInterval: 60_000 }
  );

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const periodLabel = `${MONTHS_PT[selectedMonth]} de ${selectedYear}`;
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Painel</h1>
          <p className="text-muted-foreground mt-1 text-sm">Visão geral das operações BTREE Ambiental</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="capitalize">{today}</span>
        </div>
      </div>

      {/* Seletor de Período */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 w-fit">
        <button
          onClick={goToPrevMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center min-w-[160px]">
          <p className="font-semibold text-foreground capitalize">{periodLabel}</p>
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              Voltar ao mês atual
            </button>
          )}
        </div>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Grid — Linha 1: Pessoas e Clientes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pessoas</p>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title="Colaboradores"
            value={stats?.totalCollaborators ?? "—"}
            description="cadastrados no sistema"
            icon={Users}
            color="text-emerald-600"
            loading={isLoading}
          />
          <StatCard
            title="Clientes"
            value={stats?.totalClients ?? "—"}
            description="contratos ativos"
            icon={Leaf}
            color="text-green-600"
            loading={isLoading}
          />
          <StatCard
            title="Presenças Hoje"
            value={stats?.attendanceToday ?? "—"}
            description={`${stats?.attendanceThisMonth ?? "—"} em ${periodLabel}`}
            icon={CheckCircle2}
            color="text-blue-600"
            loading={isLoading}
          />
          <StatCard
            title="A Pagar (Presenças)"
            value={isLoading ? "—" : formatCurrency(stats?.pendingPaymentThisMonth ?? 0)}
            description={`pendente em ${periodLabel}`}
            icon={DollarSign}
            color="text-orange-500"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Stats Grid — Linha 2: Operações */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operações — {periodLabel}</p>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            title="Cargas Registradas"
            value={stats?.cargoThisMonth ?? "—"}
            description={`${stats?.cargoVolumeThisMonth?.toFixed(1) ?? "—"} m³ total`}
            icon={Package}
            color="text-teal-600"
            loading={isLoading}
          />
          <StatCard
            title="Abastecimentos"
            value={stats?.fuelThisMonth ?? "—"}
            description={isLoading ? "carregando..." : formatCurrency(stats?.fuelCostThisMonth ?? 0)}
            icon={Fuel}
            color="text-yellow-600"
            loading={isLoading}
          />
          <StatCard
            title="Equipamentos"
            value={stats?.totalEquipment ?? "—"}
            description="cadastrados no sistema"
            icon={Wrench}
            color="text-purple-600"
            loading={isLoading}
          />
          <StatCard
            title="Peças Estoque Baixo"
            value={stats?.lowStockParts ?? "—"}
            description="itens com menos de 5 unidades"
            icon={AlertTriangle}
            color={stats?.lowStockParts && stats.lowStockParts > 0 ? "text-red-500" : "text-gray-400"}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Atividades Recentes + Pedidos Pendentes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Últimas Cargas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-teal-600" /> Últimas Cargas
            </CardTitle>
            <CardDescription>5 registros mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !stats?.recentCargos?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma carga registrada ainda
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentCargos.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.destination || "Destino não informado"}</p>
                      <p className="text-xs text-muted-foreground">{c.vehiclePlate || "Sem placa"} · {c.volumeM3} m³</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "entregue" ? "bg-green-100 text-green-700" :
                      c.status === "cancelado" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Presenças */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" /> Últimas Presenças
            </CardTitle>
            <CardDescription>5 registros mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
            ) : !stats?.recentAttendance?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma presença registrada ainda
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentAttendance.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.activity || "Atividade não informada"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.date).toLocaleDateString("pt-BR")} · R$ {a.dailyValue}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.paymentStatus === "pago" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}>{a.paymentStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(stats?.lowStockParts ?? 0) > 0 || (stats?.pendingOrders ?? 0) > 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.lowStockParts ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span><strong>{stats?.lowStockParts}</strong> peça(s) com estoque abaixo de 5 unidades</span>
              </div>
            )}
            {(stats?.pendingOrders ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                <span><strong>{stats?.pendingOrders}</strong> pedido(s) de compra aguardando aprovação</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <button onClick={() => setLocation("/cargas")} className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
              <Package className="h-7 w-7 text-teal-600 mb-1.5" />
              <span className="text-xs font-medium text-center">Nova Carga</span>
            </button>
            <button onClick={() => setLocation("/presencas")} className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
              <CheckCircle2 className="h-7 w-7 text-blue-600 mb-1.5" />
              <span className="text-xs font-medium text-center">Registrar Presença</span>
            </button>
            <button onClick={() => setLocation("/abastecimento")} className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
              <Fuel className="h-7 w-7 text-yellow-600 mb-1.5" />
              <span className="text-xs font-medium text-center">Abastecimento</span>
            </button>
            <button onClick={() => setLocation("/colaboradores")} className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
              <Users className="h-7 w-7 text-emerald-600 mb-1.5" />
              <span className="text-xs font-medium text-center">Colaboradores</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

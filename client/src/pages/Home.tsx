import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Fuel, Users, TrendingUp, Calendar } from "lucide-react";
import { useLocation } from "wouter";
export default function Home() {
  const [, setLocation] = useLocation();
  // Dados de exemplo para o dashboard
  const stats = [
    {
      title: "Equipamentos Ativos",
      value: "24",
      description: "+2 este mês",
      icon: Truck,
      color: "text-primary",
    },
    {
      title: "Cargas Hoje",
      value: "8",
      description: "156.5 m³ total",
      icon: Package,
      color: "text-chart-2",
    },
    {
      title: "Combustível (mês)",
      value: "2.450 L",
      description: "R$ 14.700,00",
      icon: Fuel,
      color: "text-chart-3",
    },
    {
      title: "Colaboradores",
      value: "45",
      description: "32 presentes hoje",
      icon: Users,
      color: "text-chart-4",
    },
  ];

  const recentActivities = [
    {
      title: "Nova carga registrada",
      description: "Caminhão MB 1620 - 12.5 m³",
      time: "Há 15 minutos",
    },
    {
      title: "Abastecimento realizado",
      description: "Trator John Deere - 120L diesel",
      time: "Há 1 hora",
    },
    {
      title: "Presença registrada",
      description: "8 colaboradores marcados",
      time: "Há 2 horas",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão geral das operações BTREE Ambiental
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString("pt-BR", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts and Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Chart Card */}
          <Card className="col-span-full lg:col-span-4">
            <CardHeader>
              <CardTitle>Volume de Cargas (Últimos 7 dias)</CardTitle>
              <CardDescription>
                Acompanhamento diário do volume transportado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Gráfico de volume será implementado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="col-span-full lg:col-span-3">
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas movimentações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex flex-col space-y-1 border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <button onClick={() => setLocation("/cargas")} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <Package className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Nova Carga</span>
              </button>
              <button onClick={() => setLocation("/maquinas")} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <Fuel className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Horas Máquinas</span>
              </button>
              <button onClick={() => setLocation("/presenca")} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <Users className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Registrar Presença</span>
              </button>
              <button onClick={() => setLocation("/setores")} className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors">
                <Truck className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-medium">Setores & Equipamentos</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

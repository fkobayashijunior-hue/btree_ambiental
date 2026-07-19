// @ts-nocheck
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Fuel, Wrench, Clock, TrendingUp, Search, ChevronDown, ChevronUp,
  Gauge, Droplets, Calendar, DollarSign, BarChart3, Activity
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Legend
} from "recharts";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const FUEL_LABELS: Record<string, string> = {
  diesel: "Diesel S500",
  diesel_s10: "Diesel S10",
  gasolina: "Gasolina",
  etanol: "Etanol",
  gnv: "GNV",
};

const RECORD_TYPE_COLORS: Record<string, string> = {
  abastecimento: "bg-blue-100 text-blue-800",
  manutencao: "bg-orange-100 text-orange-800",
  km: "bg-green-100 text-green-800",
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  abastecimento: "Abastecimento",
  manutencao: "Manutenção",
  km: "Quilometragem",
};

// Tipos de equipamento que usam horímetro
const HOUR_METER_TYPES = ["máquina", "maquina", "trator", "forwarder", "escavadeira", "retroescavadeira", "motoniveladora", "rolo compactador"];

function isHourMeterType(typeName: string) {
  if (!typeName) return false;
  return HOUR_METER_TYPES.some(t => typeName.toLowerCase().includes(t));
}

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getRecordDate(r: any): Date {
  const raw = r.date || r.createdAt;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return new Date(raw);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function EquipmentHistoryPage() {
  const now = new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth());
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMode, setFilterMode] = useState<"month" | "all">("all");
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "charts">("charts");

  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: allRecords = [], isLoading: loadingRecords } = trpc.vehicleRecords.list.useQuery(
    { equipmentId: selectedEquipmentId ?? undefined },
    { enabled: !!selectedEquipmentId }
  );

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y];
  }, []);

  // Filtrar equipamentos pela busca
  const filteredEquipments = useMemo(() => {
    const list = equipmentList as any[];
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter((eq: any) =>
      eq.name?.toLowerCase().includes(lower) ||
      eq.typeName?.toLowerCase().includes(lower) ||
      eq.brand?.toLowerCase().includes(lower) ||
      eq.model?.toLowerCase().includes(lower)
    );
  }, [equipmentList, searchTerm]);

  // Agrupar equipamentos por tipo
  const equipmentsByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const eq of filteredEquipments as any[]) {
      const type = eq.typeName || "Outros";
      if (!groups[type]) groups[type] = [];
      groups[type].push(eq);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([type, items]) => ({
        type,
        items: items.sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR")),
      }));
  }, [filteredEquipments]);

  // Filtrar registros por período
  const filteredRecords = useMemo(() => {
    return (allRecords as any[]).filter((r: any) => {
      if (filterMode === "all") return true;
      const d = getRecordDate(r);
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
  }, [allRecords, filterMode, filterMonth, filterYear]);

  const selectedEquipment = useMemo(() =>
    (equipmentList as any[]).find((eq: any) => eq.id === selectedEquipmentId),
    [equipmentList, selectedEquipmentId]
  );

  const usesHourMeter = useMemo(() =>
    isHourMeterType(selectedEquipment?.typeName || ""),
    [selectedEquipment]
  );

  // Estatísticas do equipamento selecionado
  const stats = useMemo(() => {
    if (!selectedEquipmentId) return null;
    const fuelRecords = filteredRecords.filter((r: any) => r.recordType === "abastecimento");
    const maintenanceRecords = filteredRecords.filter((r: any) => r.recordType === "manutencao");
    const totalLiters = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.liters) || 0), 0);
    const totalFuelCost = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.fuelCost) || 0), 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.maintenanceCost) || 0), 0);
    const totalOil2t = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.oil2tMl) || 0), 0);

    // Calcular custo/km ou custo/hora
    const odometerRecords = filteredRecords.filter((r: any) => r.odometer && parseFloat(r.odometer) > 0);
    const hourMeterRecords = filteredRecords.filter((r: any) => r.hourMeter && parseFloat(r.hourMeter) > 0);

    let costPerUnit: number | null = null;
    let costPerUnitLabel = "";
    if (usesHourMeter && hourMeterRecords.length >= 2) {
      const sorted = [...hourMeterRecords].sort((a, b) => parseFloat(a.hourMeter) - parseFloat(b.hourMeter));
      const hoursWorked = parseFloat(sorted[sorted.length - 1].hourMeter) - parseFloat(sorted[0].hourMeter);
      if (hoursWorked > 0) {
        costPerUnit = totalFuelCost / hoursWorked;
        costPerUnitLabel = "R$/hora";
      }
    } else if (!usesHourMeter && odometerRecords.length >= 2) {
      const sorted = [...odometerRecords].sort((a, b) => parseFloat(a.odometer) - parseFloat(b.odometer));
      const kmDriven = parseFloat(sorted[sorted.length - 1].odometer) - parseFloat(sorted[0].odometer);
      if (kmDriven > 0) {
        costPerUnit = totalFuelCost / kmDriven;
        costPerUnitLabel = "R$/km";
      }
    }

    const lastOdometer = [...filteredRecords]
      .filter((r: any) => r.odometer && parseFloat(r.odometer) > 0)
      .sort((a: any, b: any) => getRecordDate(b).getTime() - getRecordDate(a).getTime())[0]?.odometer;
    const lastHourMeter = [...filteredRecords]
      .filter((r: any) => r.hourMeter && parseFloat(r.hourMeter) > 0)
      .sort((a: any, b: any) => getRecordDate(b).getTime() - getRecordDate(a).getTime())[0]?.hourMeter;

    return {
      fuelCount: fuelRecords.length,
      maintenanceCount: maintenanceRecords.length,
      totalLiters,
      totalFuelCost,
      totalMaintenanceCost,
      totalCost: totalFuelCost + totalMaintenanceCost,
      totalOil2t,
      lastOdometer,
      lastHourMeter,
      costPerUnit,
      costPerUnitLabel,
    };
  }, [filteredRecords, selectedEquipmentId, usesHourMeter]);

  // Dados para gráfico de consumo mensal (últimos 12 meses)
  const monthlyChartData = useMemo(() => {
    if (!selectedEquipmentId || (allRecords as any[]).length === 0) return [];
    const now = new Date();
    const months: { key: string; label: string; year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map(({ key, label, year, month }) => {
      const monthRecords = (allRecords as any[]).filter((r: any) => {
        const d = getRecordDate(r);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const fuelRecords = monthRecords.filter((r: any) => r.recordType === "abastecimento");
      const maintRecords = monthRecords.filter((r: any) => r.recordType === "manutencao");
      const liters = fuelRecords.reduce((s: number, r: any) => s + (parseFloat(r.liters) || 0), 0);
      const fuelCost = fuelRecords.reduce((s: number, r: any) => s + (parseFloat(r.fuelCost) || 0), 0);
      const maintCost = maintRecords.reduce((s: number, r: any) => s + (parseFloat(r.maintenanceCost) || 0), 0);
      return { label, liters: +liters.toFixed(1), fuelCost: +fuelCost.toFixed(2), maintCost: +maintCost.toFixed(2) };
    });
  }, [allRecords, selectedEquipmentId]);

  // Dados para gráfico de custo/km ou custo/hora mensal
  const efficiencyChartData = useMemo(() => {
    if (!selectedEquipmentId || (allRecords as any[]).length === 0) return [];
    const now = new Date();
    const months: { key: string; label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map(({ label, year, month }) => {
      const monthRecords = (allRecords as any[]).filter((r: any) => {
        const d = getRecordDate(r);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const fuelRecords = monthRecords.filter((r: any) => r.recordType === "abastecimento");
      const fuelCost = fuelRecords.reduce((s: number, r: any) => s + (parseFloat(r.fuelCost) || 0), 0);
      const liters = fuelRecords.reduce((s: number, r: any) => s + (parseFloat(r.liters) || 0), 0);

      let efficiency: number | null = null;
      if (usesHourMeter) {
        const hrRecs = monthRecords.filter((r: any) => r.hourMeter && parseFloat(r.hourMeter) > 0)
          .sort((a: any, b: any) => parseFloat(a.hourMeter) - parseFloat(b.hourMeter));
        if (hrRecs.length >= 2) {
          const hrs = parseFloat(hrRecs[hrRecs.length - 1].hourMeter) - parseFloat(hrRecs[0].hourMeter);
          if (hrs > 0) efficiency = +(fuelCost / hrs).toFixed(2);
        }
      } else {
        const odRecs = monthRecords.filter((r: any) => r.odometer && parseFloat(r.odometer) > 0)
          .sort((a: any, b: any) => parseFloat(a.odometer) - parseFloat(b.odometer));
        if (odRecs.length >= 2) {
          const km = parseFloat(odRecs[odRecs.length - 1].odometer) - parseFloat(odRecs[0].odometer);
          if (km > 0) efficiency = +(fuelCost / km).toFixed(2);
        }
      }

      return {
        label,
        liters: liters > 0 ? +liters.toFixed(1) : null,
        efficiency,
      };
    }).filter(d => d.liters !== null || d.efficiency !== null);
  }, [allRecords, selectedEquipmentId, usesHourMeter]);

  const sortedRecords = useMemo(() =>
    [...filteredRecords].sort((a: any, b: any) =>
      getRecordDate(b).getTime() - getRecordDate(a).getTime()
    ),
    [filteredRecords]
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
          <BarChart3 className="h-7 w-7" /> Histórico de Equipamentos
        </h1>
        <p className="text-gray-500 text-sm mt-1">Análise de consumo, abastecimentos e manutenções por equipamento</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel esquerdo: lista de equipamentos */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar equipamento..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {equipmentsByType.map(({ type, items }) => (
              <div key={type}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 py-1">{type}</p>
                {items.map((eq: any) => {
                  const equipRecords = (allRecords as any[]).filter((r: any) => r.equipmentId === eq.id);
                  const fuelCount = equipRecords.filter((r: any) => r.recordType === "abastecimento").length;
                  const maintCount = equipRecords.filter((r: any) => r.recordType === "manutencao").length;
                  return (
                    <button
                      key={eq.id}
                      onClick={() => setSelectedEquipmentId(eq.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                        selectedEquipmentId === eq.id
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{eq.name}</span>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          {fuelCount > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{fuelCount}</span>
                          )}
                          {maintCount > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5">
                              <Wrench className="h-2.5 w-2.5 inline" /> {maintCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {(eq.brand || eq.model) && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{[eq.brand, eq.model].filter(Boolean).join(" · ")}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {filteredEquipments.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Nenhum equipamento encontrado</p>
            )}
          </div>
        </div>

        {/* Painel direito */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEquipmentId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">Selecione um equipamento</p>
              <p className="text-sm mt-1">Clique em um equipamento à esquerda para ver o histórico</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do equipamento */}
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEquipment?.name}</h2>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedEquipment?.typeName && (
                      <Badge variant="outline" className="text-xs">{selectedEquipment.typeName}</Badge>
                    )}
                    {selectedEquipment?.brand && (
                      <Badge variant="outline" className="text-xs">{selectedEquipment.brand}</Badge>
                    )}
                    {selectedEquipment?.model && (
                      <Badge variant="outline" className="text-xs">{selectedEquipment.model}</Badge>
                    )}
                    {selectedEquipment?.licensePlate && (
                      <Badge className="text-xs bg-gray-800 text-white">{selectedEquipment.licensePlate}</Badge>
                    )}
                  </div>
                </div>
                {/* Filtro de período */}
                <div className="flex gap-2 items-center flex-wrap">
                  <Button
                    size="sm"
                    variant={filterMode === "all" ? "default" : "outline"}
                    onClick={() => setFilterMode("all")}
                    className={filterMode === "all" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    Tudo
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === "month" ? "default" : "outline"}
                    onClick={() => setFilterMode("month")}
                    className={filterMode === "month" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    Por Mês
                  </Button>
                  {filterMode === "month" && (
                    <>
                      <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(parseInt(e.target.value))}
                        className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                      >
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select
                        value={filterYear}
                        onChange={e => setFilterYear(parseInt(e.target.value))}
                        className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* Cards de estatísticas */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Fuel className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">Total Abastecido</span>
                      </div>
                      <p className="text-xl font-bold text-blue-800">{stats.totalLiters.toFixed(1)} L</p>
                      <p className="text-xs text-blue-500">{stats.fuelCount} abastecimento{stats.fuelCount !== 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-orange-600 font-medium">Manutenções</span>
                      </div>
                      <p className="text-xl font-bold text-orange-800">{stats.maintenanceCount}</p>
                      <p className="text-xs text-orange-500">{formatCurrency(stats.totalMaintenanceCost)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">Custo Total</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-800">{formatCurrency(stats.totalCost)}</p>
                      <p className="text-xs text-emerald-500">Combustível + Manutenção</p>
                    </CardContent>
                  </Card>
                  <Card className={`border-gray-200 ${stats.costPerUnit ? "bg-violet-50 border-violet-200" : "bg-gray-50"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {usesHourMeter
                          ? <Activity className="h-4 w-4 text-violet-600" />
                          : <Gauge className="h-4 w-4 text-gray-600" />
                        }
                        <span className={`text-xs font-medium ${stats.costPerUnit ? "text-violet-600" : "text-gray-600"}`}>
                          {stats.costPerUnit
                            ? stats.costPerUnitLabel
                            : usesHourMeter ? "Último Horímetro" : "Último Hodômetro"
                          }
                        </span>
                      </div>
                      {stats.costPerUnit ? (
                        <>
                          <p className="text-xl font-bold text-violet-800">{formatCurrency(stats.costPerUnit)}</p>
                          <p className="text-xs text-violet-500">custo de combustível</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-gray-800">
                            {stats.lastHourMeter
                              ? `${stats.lastHourMeter} h`
                              : stats.lastOdometer
                                ? `${stats.lastOdometer} km`
                                : "—"
                            }
                          </p>
                          {stats.totalOil2t > 0 && (
                            <p className="text-xs text-amber-600">
                              <Droplets className="h-3 w-3 inline mr-0.5" />
                              Óleo 2T: {stats.totalOil2t.toFixed(0)} ml
                            </p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabs: Gráficos / Histórico */}
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("charts")}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "charts"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-1.5" />
                  Gráficos
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "history"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Clock className="h-4 w-4 inline mr-1.5" />
                  Histórico ({filteredRecords.length})
                </button>
              </div>

              {/* Conteúdo das tabs */}
              {activeTab === "charts" && (
                <div className="space-y-4">
                  {loadingRecords ? (
                    <div className="h-48 flex items-center justify-center text-gray-400">Carregando dados...</div>
                  ) : monthlyChartData.every(d => d.liters === 0 && d.fuelCost === 0) ? (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
                      <p>Sem dados de abastecimento para este equipamento</p>
                    </div>
                  ) : (
                    <>
                      {/* Gráfico de litros por mês */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Fuel className="h-4 w-4 text-blue-600" />
                            Consumo Mensal (Litros) — últimos 12 meses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip
                                formatter={(val: any) => [`${val} L`, "Litros"]}
                                contentStyle={{ fontSize: 12 }}
                              />
                              <Bar dataKey="liters" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Litros" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Gráfico de custo por mês */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            Custo Mensal (R$) — últimos 12 meses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                              <Tooltip
                                formatter={(val: any, name: string) => [
                                  `R$ ${Number(val).toFixed(2)}`,
                                  name === "fuelCost" ? "Combustível" : "Manutenção"
                                ]}
                                contentStyle={{ fontSize: 12 }}
                              />
                              <Legend formatter={(v) => v === "fuelCost" ? "Combustível" : "Manutenção"} />
                              <Bar dataKey="fuelCost" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" name="fuelCost" />
                              <Bar dataKey="maintCost" fill="#f97316" radius={[3, 3, 0, 0]} stackId="a" name="maintCost" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Gráfico de eficiência (custo/km ou custo/hora) */}
                      {efficiencyChartData.length > 0 && efficiencyChartData.some(d => d.efficiency !== null) && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4 text-violet-600" />
                              {usesHourMeter ? "Custo por Hora (R$/h)" : "Custo por Km (R$/km)"} — últimos 6 meses
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={efficiencyChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                                <Tooltip
                                  formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, usesHourMeter ? "R$/hora" : "R$/km"]}
                                  contentStyle={{ fontSize: 12 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="efficiency"
                                  stroke="#7c3aed"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                  connectNulls={false}
                                  name={usesHourMeter ? "R$/hora" : "R$/km"}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Histórico de Registros
                      <span className="text-sm font-normal text-gray-400">({filteredRecords.length} registros)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sortedRecords.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p>Nenhum registro no período selecionado</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {sortedRecords.map((r: any) => (
                          <div key={r.id} className="px-4 py-3">
                            <button
                              className="w-full text-left"
                              onClick={() => setExpandedRecord(expandedRecord === r.id ? null : r.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-lg ${
                                    r.recordType === "abastecimento" ? "bg-blue-100" :
                                    r.recordType === "manutencao" ? "bg-orange-100" : "bg-green-100"
                                  }`}>
                                    {r.recordType === "abastecimento" ? (
                                      <Fuel className="h-4 w-4 text-blue-600" />
                                    ) : r.recordType === "manutencao" ? (
                                      <Wrench className="h-4 w-4 text-orange-600" />
                                    ) : (
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-xs ${RECORD_TYPE_COLORS[r.recordType] || "bg-gray-100 text-gray-700"}`}>
                                        {RECORD_TYPE_LABELS[r.recordType] || r.recordType}
                                      </Badge>
                                      {r.recordType === "abastecimento" && r.fuelType && (
                                        <span className="text-xs text-gray-500">{FUEL_LABELS[r.fuelType] || r.fuelType}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.date || r.createdAt)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                  {r.recordType === "abastecimento" && r.liters && (
                                    <div>
                                      <p className="text-sm font-semibold text-blue-700">{r.liters} L</p>
                                      {r.fuelCost && <p className="text-xs text-gray-400">R$ {r.fuelCost}</p>}
                                    </div>
                                  )}
                                  {r.recordType === "manutencao" && r.maintenanceCost && (
                                    <p className="text-sm font-semibold text-orange-700">R$ {r.maintenanceCost}</p>
                                  )}
                                  {r.odometer && (
                                    <p className="text-xs text-gray-400">{r.odometer} km</p>
                                  )}
                                  {r.hourMeter && (
                                    <p className="text-xs text-gray-400">{r.hourMeter} h</p>
                                  )}
                                  {expandedRecord === r.id ? (
                                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            </button>

                            {/* Detalhes expandidos */}
                            {expandedRecord === r.id && (
                              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                                {r.supplier && (
                                  <div><span className="text-gray-400 text-xs">Fornecedor/Posto</span><p className="font-medium">{r.supplier}</p></div>
                                )}
                                {r.pricePerLiter && (
                                  <div><span className="text-gray-400 text-xs">Preço/L</span><p className="font-medium">R$ {r.pricePerLiter}</p></div>
                                )}
                                {r.maintenanceType && (
                                  <div><span className="text-gray-400 text-xs">Tipo de Manutenção</span><p className="font-medium">{r.maintenanceType}</p></div>
                                )}
                                {r.mechanicName && (
                                  <div><span className="text-gray-400 text-xs">Mecânico/Oficina</span><p className="font-medium">{r.mechanicName}</p></div>
                                )}
                                {r.oil2tMl && parseFloat(r.oil2tMl) > 0 && (
                                  <div><span className="text-gray-400 text-xs">Óleo 2T</span><p className="font-medium text-amber-700">{r.oil2tMl} ml</p></div>
                                )}
                                {r.kmDriven && (
                                  <div><span className="text-gray-400 text-xs">KM Percorridos</span><p className="font-medium">{r.kmDriven} km</p></div>
                                )}
                                {r.fuelLocation && (
                                  <div>
                                    <span className="text-gray-400 text-xs">Local de Abastecimento</span>
                                    <p className="font-medium capitalize">
                                      {r.fuelLocation === "simflor" ? "SIMFLOR" : r.fuelLocation === "astorga" ? "Sede Astorga" : "Posto Externo"}
                                    </p>
                                  </div>
                                )}
                                {r.notes && (
                                  <div className="col-span-2"><span className="text-gray-400 text-xs">Observações</span><p className="font-medium">{r.notes}</p></div>
                                )}
                                {r.registeredByName && (
                                  <div><span className="text-gray-400 text-xs">Registrado por</span><p className="font-medium">{r.registeredByName}</p></div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

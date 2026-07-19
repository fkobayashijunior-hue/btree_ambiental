import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Fuel, Wrench, Clock, TrendingUp, Search, ChevronDown, ChevronUp,
  Gauge, Droplets, Calendar, DollarSign, BarChart3, AlertTriangle
} from "lucide-react";

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

export default function EquipmentHistoryPage() {
  const now = new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth());
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMode, setFilterMode] = useState<"month" | "all">("month");
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);

  const { data: equipmentList = [] } = trpc.sectors.listEquipment.useQuery({});
  const { data: allRecords = [] } = trpc.vehicleRecords.list.useQuery({
    equipmentId: selectedEquipmentId ?? undefined,
  });

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

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
      const rawDate = r.date || r.createdAt;
      let month: number, year: number;
      if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        const parts = rawDate.slice(0, 10).split("-");
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
      } else {
        const d = new Date(rawDate);
        month = d.getMonth();
        year = d.getFullYear();
      }
      return month === filterMonth && year === filterYear;
    });
  }, [allRecords, filterMode, filterMonth, filterYear]);

  // Estatísticas do equipamento selecionado
  const stats = useMemo(() => {
    if (!selectedEquipmentId) return null;
    const fuelRecords = filteredRecords.filter((r: any) => r.recordType === "abastecimento");
    const maintenanceRecords = filteredRecords.filter((r: any) => r.recordType === "manutencao");
    const totalLiters = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.liters) || 0), 0);
    const totalFuelCost = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.fuelCost) || 0), 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.maintenanceCost) || 0), 0);
    const totalOil2t = fuelRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.oil2tMl) || 0), 0);
    const lastOdometer = [...filteredRecords]
      .filter((r: any) => r.odometer)
      .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())[0]?.odometer;
    const lastHourMeter = [...filteredRecords]
      .filter((r: any) => r.hourMeter)
      .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())[0]?.hourMeter;
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
    };
  }, [filteredRecords, selectedEquipmentId]);

  const selectedEquipment = useMemo(() =>
    (equipmentList as any[]).find((eq: any) => eq.id === selectedEquipmentId),
    [equipmentList, selectedEquipmentId]
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

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

        {/* Painel direito: histórico do equipamento selecionado */}
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
                    variant={filterMode === "month" ? "default" : "outline"}
                    onClick={() => setFilterMode("month")}
                    className={filterMode === "month" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    Por Mês
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === "all" ? "default" : "outline"}
                    onClick={() => setFilterMode("all")}
                    className={filterMode === "all" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    Tudo
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
                      <p className="text-xs text-orange-500">R$ {stats.totalMaintenanceCost.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">Custo Total</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-800">R$ {stats.totalCost.toFixed(2)}</p>
                      <p className="text-xs text-emerald-500">Combustível + Manutenção</p>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200 bg-gray-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Gauge className="h-4 w-4 text-gray-600" />
                        <span className="text-xs text-gray-600 font-medium">
                          {stats.lastHourMeter ? "Último Horímetro" : "Último Hodômetro"}
                        </span>
                      </div>
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
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lista de registros */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Histórico de Registros
                    <span className="text-sm font-normal text-gray-400">({filteredRecords.length} registros)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>Nenhum registro no período selecionado</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {[...filteredRecords]
                        .sort((a: any, b: any) => {
                          const da = new Date(a.date || a.createdAt).getTime();
                          const db = new Date(b.date || b.createdAt).getTime();
                          return db - da;
                        })
                        .map((r: any) => (
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
                                  <div><span className="text-gray-400 text-xs">Local de Abastecimento</span><p className="font-medium capitalize">{r.fuelLocation === "simflor" ? "SIMFLOR" : r.fuelLocation === "astorga" ? "Sede Astorga" : "Posto Externo"}</p></div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

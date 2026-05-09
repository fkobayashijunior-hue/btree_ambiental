import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet, Fuel, MapPin, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const LOCATION_LABELS: Record<string, string> = {
  simflor: "SIMFLOR",
  astorga: "Sede Astorga",
  postos: "Postos",
};

export default function FuelReportsPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => now.toISOString().slice(0, 10));
  const [filterLocation, setFilterLocation] = useState<string>("all");

  const { data: records = [], isLoading } = trpc.fuelSuppliers.fuelReport.useQuery({
    startDate,
    endDate,
  });

  const { data: suppliers = [] } = trpc.fuelSuppliers.list.useQuery();
  const { data: priceHistory = [] } = trpc.fuelSuppliers.priceHistory.useQuery({});

  // Filter records by location (based on supplier name matching)
  const filteredRecords = useMemo(() => {
    if (filterLocation === "all") return records as any[];
    // Match supplier name to supplier locationType
    const supplierMap = new Map((suppliers as any[]).map((s: any) => [s.name, s.locationType]));
    return (records as any[]).filter((r: any) => {
      const loc = supplierMap.get(r.supplier);
      if (filterLocation === "postos") {
        return loc === "postos" || !loc; // If supplier not found in DB, assume it's a posto
      }
      return loc === filterLocation;
    });
  }, [records, filterLocation, suppliers]);

  // Summary stats
  const stats = useMemo(() => {
    const totalLiters = filteredRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.liters?.replace(',', '.') || '0') || 0), 0);
    const totalCost = filteredRecords.reduce((sum: number, r: any) => sum + (parseFloat(r.fuelCost?.replace(',', '.') || '0') || 0), 0);
    const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;
    return { totalLiters, totalCost, avgPrice, count: filteredRecords.length };
  }, [filteredRecords]);

  // Group by supplier
  const bySupplier = useMemo(() => {
    const map = new Map<string, { liters: number; cost: number; count: number }>();
    filteredRecords.forEach((r: any) => {
      const name = r.supplier || "Sem fornecedor";
      const existing = map.get(name) || { liters: 0, cost: 0, count: 0 };
      existing.liters += parseFloat(r.liters?.replace(',', '.') || '0') || 0;
      existing.cost += parseFloat(r.fuelCost?.replace(',', '.') || '0') || 0;
      existing.count += 1;
      map.set(name, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [filteredRecords]);

  // Export to Excel (CSV)
  function exportExcel() {
    if (filteredRecords.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const headers = ["Data", "Equipamento", "Combustível", "Fornecedor", "Litros", "Preço/L", "Total R$"];
    const rows = filteredRecords.map((r: any) => [
      r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '',
      r.equipmentId || '',
      r.fuelType || '',
      r.supplier || '',
      r.liters || '',
      r.pricePerLiter || '',
      r.fuelCost || '',
    ]);
    
    // Add summary
    rows.push([]);
    rows.push(["RESUMO"]);
    rows.push(["Total Litros", stats.totalLiters.toFixed(1)]);
    rows.push(["Total Gasto", `R$ ${stats.totalCost.toFixed(2)}`]);
    rows.push(["Preço Médio/L", `R$ ${stats.avgPrice.toFixed(2)}`]);
    rows.push(["Qtd Abastecimentos", String(stats.count)]);
    rows.push([]);
    rows.push(["POR FORNECEDOR"]);
    rows.push(["Fornecedor", "Litros", "Custo Total", "Qtd"]);
    bySupplier.forEach(([name, data]) => {
      rows.push([name, data.liters.toFixed(1), `R$ ${data.cost.toFixed(2)}`, String(data.count)]);
    });

    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-combustivel-${startDate}-a-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exportado!");
  }

  // Export to PDF (printable HTML)
  function exportPDF() {
    if (filteredRecords.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup bloqueado. Permita popups para gerar PDF.");
      return;
    }

    const supplierRows = bySupplier.map(([name, data]) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd">${name}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">${data.liters.toFixed(1)} L</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">R$ ${data.cost.toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${data.count}</td>
      </tr>
    `).join('');

    const detailRows = filteredRecords.map((r: any) => `
      <tr>
        <td style="padding:4px;border:1px solid #eee;font-size:11px">${r.date ? new Date(r.date).toLocaleDateString('pt-BR') : ''}</td>
        <td style="padding:4px;border:1px solid #eee;font-size:11px">${r.supplier || '-'}</td>
        <td style="padding:4px;border:1px solid #eee;font-size:11px;text-align:right">${r.liters || '0'} L</td>
        <td style="padding:4px;border:1px solid #eee;font-size:11px;text-align:right">R$ ${r.pricePerLiter || '0'}</td>
        <td style="padding:4px;border:1px solid #eee;font-size:11px;text-align:right">R$ ${r.fuelCost || '0'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Combustível - BTREE Ambiental</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #15803d; margin-bottom: 5px; }
          h2 { color: #166534; margin-top: 30px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
          .stat-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; min-width: 150px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #15803d; }
          .stat-label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #15803d; color: white; padding: 8px; text-align: left; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>BTREE Ambiental</h1>
        <p class="subtitle">Relatório de Consumo de Combustível — ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}${filterLocation !== 'all' ? ` — Local: ${LOCATION_LABELS[filterLocation] || filterLocation}` : ''}</p>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${stats.totalLiters.toFixed(0)} L</div>
            <div class="stat-label">Total Litros</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">R$ ${stats.totalCost.toFixed(2)}</div>
            <div class="stat-label">Total Gasto</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">R$ ${stats.avgPrice.toFixed(2)}/L</div>
            <div class="stat-label">Preço Médio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.count}</div>
            <div class="stat-label">Abastecimentos</div>
          </div>
        </div>

        <h2>Resumo por Fornecedor</h2>
        <table>
          <thead><tr><th>Fornecedor</th><th style="text-align:right">Litros</th><th style="text-align:right">Custo</th><th style="text-align:center">Qtd</th></tr></thead>
          <tbody>${supplierRows}</tbody>
        </table>

        <h2>Detalhamento</h2>
        <table>
          <thead><tr><th>Data</th><th>Fornecedor</th><th style="text-align:right">Litros</th><th style="text-align:right">Preço/L</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>

        <p style="margin-top:30px;font-size:11px;color:#999">Gerado em ${new Date().toLocaleString('pt-BR')} — BTREE Ambiental</p>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    toast.success("PDF gerado! Use Ctrl+P para salvar.");
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6 text-green-700" />
            Relatórios de Combustível
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consumo por local, fornecedor e período. Exporte em PDF ou Excel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button onClick={exportExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Data Início</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Local</label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  <SelectItem value="simflor">SIMFLOR</SelectItem>
                  <SelectItem value="astorga">Sede Astorga</SelectItem>
                  <SelectItem value="postos">Postos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.totalLiters.toFixed(0)} L</div>
            <div className="text-xs text-muted-foreground">Total Litros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-700">R$ {stats.totalCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Gasto</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-700">R$ {stats.avgPrice.toFixed(2)}/L</div>
            <div className="text-xs text-muted-foreground">Preço Médio</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.count}</div>
            <div className="text-xs text-muted-foreground">Abastecimentos</div>
          </CardContent>
        </Card>
      </div>

      {/* By Supplier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-700" />
            Consumo por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Carregando...</p>
          ) : bySupplier.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum abastecimento no período selecionado.</p>
          ) : (
            <div className="space-y-3">
              {bySupplier.map(([name, data]) => {
                const pct = stats.totalCost > 0 ? (data.cost / stats.totalCost) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{name}</span>
                        <span className="text-sm font-semibold text-green-700">R$ {data.cost.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>{data.liters.toFixed(0)} L • {data.count} abast.</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History Summary */}
      {(priceHistory as any[]).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Últimas Alterações de Preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(priceHistory as any[]).slice(0, 10).map((h: any) => {
                const supplier = (suppliers as any[]).find((s: any) => s.id === h.supplierId);
                const oldP = parseFloat(h.oldPrice);
                const newP = parseFloat(h.newPrice);
                const increased = newP > oldP;
                return (
                  <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-sm">{supplier?.name || `Fornecedor #${h.supplierId}`}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="line-through text-muted-foreground">R$ {oldP.toFixed(2)}</span>
                        <span className="font-semibold">→ R$ {newP.toFixed(2)}</span>
                        <Badge variant="outline" className={increased ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}>
                          {increased ? '+' : ''}{((newP - oldP) / oldP * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {h.changedAt ? new Date(h.changedAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detalhamento ({filteredRecords.length} registros)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum registro encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Fornecedor</th>
                  <th className="text-right py-2 px-2">Litros</th>
                  <th className="text-right py-2 px-2">R$/L</th>
                  <th className="text-right py-2 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.slice(0, 50).map((r: any, i: number) => (
                  <tr key={r.id || i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-2">{r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="py-2 px-2">{r.supplier || '-'}</td>
                    <td className="py-2 px-2 text-right">{r.liters || '0'} L</td>
                    <td className="py-2 px-2 text-right">R$ {r.pricePerLiter || '0'}</td>
                    <td className="py-2 px-2 text-right font-medium">R$ {r.fuelCost || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filteredRecords.length > 50 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Mostrando 50 de {filteredRecords.length} registros. Exporte para ver todos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

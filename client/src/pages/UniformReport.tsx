import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Shirt, Download, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SHIRT_ORDER = ["PP", "P", "M", "G", "GG", "XGG"];

function sizeBadgeColor(size: string) {
  const map: Record<string, string> = {
    PP: "bg-purple-100 text-purple-800",
    P: "bg-blue-100 text-blue-800",
    M: "bg-green-100 text-green-800",
    G: "bg-yellow-100 text-yellow-800",
    GG: "bg-orange-100 text-orange-800",
    XGG: "bg-red-100 text-red-800",
  };
  return map[size] || "bg-gray-100 text-gray-700";
}

export default function UniformReport() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterShirtSize, setFilterShirtSize] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "all">("active");

  // Busca todos os colaboradores (sem filtro de active) para poder alternar entre ativos/inativos
  const { data: collaborators = [], isLoading } = trpc.collaborators.list.useQuery({});

  const roles = useMemo(() => {
    const set = new Set<string>();
    collaborators.forEach((c: any) => { if (c.role) set.add(c.role); });
    return Array.from(set).sort();
  }, [collaborators]);

  const filtered = useMemo(() => {
    return collaborators.filter((c: any) => {
      // Filtro de status ativo/inativo
      if (filterStatus === "active" && !c.active) return false;
      if (filterStatus === "inactive" && c.active) return false;
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRole !== "all" && c.role !== filterRole) return false;
      if (filterShirtSize !== "all" && c.shirtSize !== filterShirtSize) return false;
      return true;
    });
  }, [collaborators, search, filterRole, filterShirtSize, filterStatus]);

  // Totais por tipo de uniforme
  const shirtTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach((c: any) => {
      if (c.shirtSize) totals[c.shirtSize] = (totals[c.shirtSize] || 0) + 1;
    });
    return totals;
  }, [filtered]);

  const pantsTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach((c: any) => {
      if (c.pantsSize) totals[c.pantsSize] = (totals[c.pantsSize] || 0) + 1;
    });
    return totals;
  }, [filtered]);

  const bootTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach((c: any) => {
      if (c.bootSize) totals[c.bootSize] = (totals[c.bootSize] || 0) + 1;
    });
    return totals;
  }, [filtered]);

  const shoeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach((c: any) => {
      if (c.shoeSize) totals[c.shoeSize] = (totals[c.shoeSize] || 0) + 1;
    });
    return totals;
  }, [filtered]);

  function exportCSV() {
    const header = ["Nome", "Função", "Camisa", "Calça", "Bota", "Calçado"];
    const rows = filtered.map((c: any) => [
      c.name || "",
      c.role || "",
      c.shirtSize || "",
      c.pantsSize || "",
      c.bootSize || "",
      c.shoeSize || "",
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uniformes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    const shirtSummary = SHIRT_ORDER
      .filter(s => shirtTotals[s])
      .map(s => `${shirtTotals[s]}x ${s}`)
      .join(" &nbsp;|&nbsp; ");
    const pantsSummary = Object.entries(pantsTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([s, n]) => `${n}x ${s}`)
      .join(" &nbsp;|&nbsp; ");
    const bootSummary = Object.entries(bootTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([s, n]) => `${n}x ${s}`)
      .join(" &nbsp;|&nbsp; ");
    const shoeSummary = Object.entries(shoeTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([s, n]) => `${n}x ${s}`)
      .join(" &nbsp;|&nbsp; ");

    const rows = filtered.map((c: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${c.name || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${c.role || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold">${c.shirtSize || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${c.pantsSize || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${c.bootSize || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center">${c.shoeSize || "—"}</td>
      </tr>`).join("");

    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Relatório de Uniformes</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { color: #1b5e20; font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #555; font-size: 13px; margin-bottom: 20px; }
        .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
        .summary-box h2 { font-size: 13px; color: #166534; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-row { font-size: 14px; margin-bottom: 6px; }
        .summary-row strong { display: inline-block; width: 80px; color: #555; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #1b5e20; color: white; padding: 8px 10px; text-align: left; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: center; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>📋 Relatório de Uniformes — BTREE Ambiental</h1>
      <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${filtered.length} funcionário(s)</div>
      <div class="summary-box">
        <h2>Resumo de Quantidades</h2>
        ${shirtSummary ? `<div class="summary-row"><strong>Camisa:</strong> ${shirtSummary}</div>` : ''}
        ${pantsSummary ? `<div class="summary-row"><strong>Calça:</strong> ${pantsSummary}</div>` : ''}
        ${bootSummary ? `<div class="summary-row"><strong>Bota:</strong> ${bootSummary}</div>` : ''}
        ${shoeSummary ? `<div class="summary-row"><strong>Calçado:</strong> ${shoeSummary}</div>` : ''}
      </div>
      <table>
        <thead><tr>
          <th>Nome</th><th>Função</th><th>Camisa</th><th>Calça</th><th>Bota</th><th>Calçado</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    win.document.close();
  }

  const roleLabel: Record<string, string> = {
    administrativo: "Administrativo",
    encarregado: "Encarregado",
    mecanico: "Mecânico",
    motosserrista: "Motosserrista",
    carregador: "Carregador",
    operador: "Operador",
    motorista: "Motorista",
    terceirizado: "Terceirizado",
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shirt className="w-6 h-6 text-green-700" />
            Relatório de Uniformes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Tamanhos de uniformes por funcionário</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
            <Download className="w-4 h-4" /> PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Camisas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <Shirt className="w-4 h-4 text-green-700" /> Camisas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(shirtTotals).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum dado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {SHIRT_ORDER.filter(s => shirtTotals[s]).map(size => (
                  <div key={size} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${sizeBadgeColor(size)}`}>
                    <span className="text-lg font-black">{shirtTotals[size]}</span>
                    <span>× {size}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calças */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Calças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(pantsTotals).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum dado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(pantsTotals).sort(([a], [b]) => a.localeCompare(b)).map(([size, count]) => (
                  <div key={size} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800">
                    <span className="text-lg font-black">{count}</span>
                    <span>× {size}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Botas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(bootTotals).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum dado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(bootTotals).sort(([a], [b]) => a.localeCompare(b)).map(([size, count]) => (
                  <div key={size} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-800">
                    <span className="text-lg font-black">{count}</span>
                    <span>× {size}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calçados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Calçados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(shoeTotals).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum dado</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(shoeTotals).sort(([a], [b]) => a.localeCompare(b)).map(([size, count]) => (
                  <div key={size} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-800">
                    <span className="text-lg font-black">{count}</span>
                    <span>× {size}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar funcionário..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="sm:max-w-[180px]">
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            {roles.map(r => (
              <SelectItem key={r} value={r}>{roleLabel[r] || r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterShirtSize} onValueChange={setFilterShirtSize}>
          <SelectTrigger className="sm:max-w-[160px]">
            <SelectValue placeholder="Tamanho camisa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tamanhos</SelectItem>
            {SHIRT_ORDER.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="sm:max-w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">✅ Ativos</SelectItem>
            <SelectItem value="inactive">❌ Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 ml-auto">
          <Users className="w-4 h-4" />
          <span>{filtered.length} funcionário(s)</span>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum funcionário encontrado.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-800 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Nome</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Função</th>
                  <th className="text-center px-4 py-3 font-semibold">Camisa</th>
                  <th className="text-center px-4 py-3 font-semibold">Calça</th>
                  <th className="text-center px-4 py-3 font-semibold">Bota</th>
                  <th className="text-center px-4 py-3 font-semibold">Calçado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any, i: number) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {c.active
                        ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Ativo</span>
                        : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Inativo</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{roleLabel[c.role] || c.role || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {c.shirtSize ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${sizeBadgeColor(c.shirtSize)}`}>
                          {c.shirtSize}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{c.pantsSize || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{c.bootSize || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{c.shoeSize || <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

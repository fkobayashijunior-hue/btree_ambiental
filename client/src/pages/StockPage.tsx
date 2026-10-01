// @ts-nocheck
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportMultiSheetExcel } from "@/lib/exportExcel";
import {
  Boxes, Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, FileDown,
  AlertTriangle, Warehouse, Package, Search, Download, PackagePlus, Scale, Trash2,
} from "lucide-react";

type Tab = "saldo" | "movimentacoes" | "devolucoes" | "produtos" | "locais";

const LOCATION_TYPES: Record<string, string> = {
  almoxarifado: "Almoxarifado", oficina: "Oficina", veiculo: "Veículo", obra: "Frente de serviço / obra", outro: "Outro",
};
const MOVEMENT_LABEL: Record<string, { label: string; cls: string }> = {
  entrada: { label: "Entrada", cls: "bg-emerald-100 text-emerald-700" },
  saida: { label: "Saída", cls: "bg-red-100 text-red-700" },
  transferencia: { label: "Transferência", cls: "bg-blue-100 text-blue-700" },
  ajuste: { label: "Ajuste", cls: "bg-amber-100 text-amber-700" },
  devolucao: { label: "Devolução", cls: "bg-teal-100 text-teal-700" },
  estorno: { label: "Estorno", cls: "bg-gray-100 text-gray-600" },
};

const fmtQty = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const fmtMoney = (v: any) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const fmtDateTime = (v: any) => (v ? new Date(v).toLocaleString("pt-BR") : "—");
const num = (s: string) => parseFloat(String(s).replace(/\./g, "").replace(",", "."));

// Destino final de uma movimentação: o estoque de destino (entrada/transferência) ou, nas saídas,
// pra onde o item foi (local GPS/observação; sem ele, cai no equipamento ou colaborador).
const movementDestination = (m: any): string | null =>
  m.toLocationName ?? (m.destinationNote || m.destinationEquipmentName || m.destinationCollaboratorName || null);

const selectCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

// Opções de quantidade pro dropdown de saída/transferência: 1..saldo (inteiros) + o saldo exato
// no fim, caso ele tenha casas decimais (ex: saldo 8,5 -> 1,2,...,8,8,5).
// Produtos medidos em m/L/kg (mangueira, cabo de aço...) aceitam quantidade decimal digitada, não lista de inteiros.
const isDecimalUnit = (p: any) => ["m", "l", "kg"].includes(String(p?.unit || "").trim().toLowerCase());

function qtyOptions(balance: number): number[] {
  const whole = Math.floor(balance + 1e-9);
  const opts: number[] = [];
  for (let i = 1; i <= whole; i++) opts.push(i);
  if (balance > whole + 1e-9) opts.push(Number(balance.toFixed(3)));
  return opts;
}

export default function StockPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("saldo");

  const { data: locations = [] } = trpc.stock.listLocations.useQuery();
  const { data: products = [] } = trpc.stock.listProducts.useQuery();
  const { data: categories = [] } = trpc.purchaseCategories.list.useQuery();
  const { data: equipmentList = [] } = trpc.cargoLoads.listTrucks.useQuery();
  const { data: collaborators = [] } = trpc.collaborators.list.useQuery({ active: true });
  const { data: gpsLocationsList = [] } = trpc.gpsLocations.list.useQuery();

  const activeLocations = locations.filter((l: any) => l.active);
  const activeProducts = products.filter((p: any) => p.active);
  const activeGpsLocations = (gpsLocationsList as any[]).filter(g => g.isActive);

  const refreshAll = () => {
    utils.stock.balances.invalidate(); utils.stock.movements.invalidate();
    utils.stock.listProducts.invalidate(); utils.stock.listLocations.invalidate();
  };
  const onError = (e: any) => toast.error(e.message);

  // ── filtros ──
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: balances = [] } = trpc.stock.balances.useQuery({
    locationId: filterLocation !== "all" ? Number(filterLocation) : undefined,
    productId: filterProduct !== "all" ? Number(filterProduct) : undefined,
  });
  const { data: movements = [] } = trpc.stock.movements.useQuery({
    locationId: filterLocation !== "all" ? Number(filterLocation) : undefined,
    productId: filterProduct !== "all" ? Number(filterProduct) : undefined,
    type: filterType !== "all" ? filterType : undefined,
    from: dateFrom || undefined, to: dateTo || undefined,
  }, { enabled: tab === "movimentacoes" });

  const filteredBalances = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (balances as any[]).filter(b => !q || `${b.productName} ${b.code || ""} ${b.locationName}`.toLowerCase().includes(q));
  }, [balances, search]);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products as any[]).filter(p => !q || `${p.name} ${p.code || ""} ${p.categoryName || ""}`.toLowerCase().includes(q));
  }, [products, search]);

  // ── mutations ──
  const manualEntryMut = trpc.stock.manualEntry.useMutation({ onSuccess: () => { toast.success("Item adicionado ao estoque"); setDialog(null); refreshAll(); }, onError });
  const [loanStatus, setLoanStatus] = useState<"aberta" | "devolvida">("aberta");
  const { data: loans = [] } = trpc.stock.loans.useQuery({ status: loanStatus }, { enabled: tab === "devolucoes" });
  const returnMut = trpc.stock.returnLoan.useMutation({
    onSuccess: (r) => { toast.success(`Devolução registrada — consumo: ${fmtQty(r.consumedKg)} kg${r.unit !== "kg" ? ` = ${fmtQty(r.consumed)} ${r.unit}` : ""} (baixado do estoque)`); setDialog(null); refreshAll(); utils.stock.loans.invalidate(); },
    onError,
  });
  const exitMut = trpc.stock.registerExit.useMutation({ onSuccess: () => { toast.success("Saída registrada"); setDialog(null); refreshAll(); utils.stock.loans.invalidate(); }, onError });
  const transferMut = trpc.stock.transfer.useMutation({ onSuccess: () => { toast.success("Transferência registrada"); setDialog(null); refreshAll(); }, onError });
  const adjustMut = trpc.stock.adjust.useMutation({ onSuccess: () => { toast.success("Ajuste registrado"); setDialog(null); refreshAll(); }, onError });
  const createProductMut = trpc.stock.createProduct.useMutation({ onSuccess: () => { toast.success("Produto criado"); setDialog(null); refreshAll(); }, onError });
  const updateProductMut = trpc.stock.updateProduct.useMutation({ onSuccess: () => { toast.success("Produto atualizado"); setDialog(null); refreshAll(); }, onError });
  const deleteProductMut = trpc.stock.deleteProduct.useMutation({ onSuccess: () => { toast.success("Produto excluído"); setDialog(null); refreshAll(); }, onError });
  const createLocationMut = trpc.stock.createLocation.useMutation({ onSuccess: () => { toast.success("Local criado"); setDialog(null); refreshAll(); }, onError });
  const updateLocationMut = trpc.stock.updateLocation.useMutation({ onSuccess: () => { toast.success("Local atualizado"); setDialog(null); refreshAll(); }, onError });
  const importMut = trpc.stock.importProducts.useMutation({ onSuccess: (r) => { toast.success(`${r.created} produto(s) importado(s)`); setDialog(null); refreshAll(); }, onError });

  // ── dialogs ──
  const [dialog, setDialog] = useState<null | { kind: string; data?: any }>(null);
  const [form, setForm] = useState<any>({});
  const { data: openLoans = [] } = trpc.stock.loans.useQuery({ status: "aberta" }, { enabled: dialog?.kind === "returnLoan" && !dialog?.data });
  const openDialog = (kind: string, data?: any, initial: any = {}) => { setForm(initial); setDialog({ kind, data }); };
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const { data: suggestions = [] } = trpc.stock.suggestProductsFromPurchases.useQuery(undefined, { enabled: dialog?.kind === "import" });

  const exportMovements = async () => {
    await exportMultiSheetExcel({
      filename: `estoque_movimentacoes_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [{
        sheetName: "Movimentações", title: "Movimentações de Estoque", subtitle: `${movements.length} registro(s)`,
        columns: [
          { header: "Data/hora", width: 18 }, { header: "Tipo", width: 14 }, { header: "Produto", width: 30 },
          { header: "Quantidade", width: 12, align: "right", numFmt: "#,##0.000" }, { header: "Un", width: 6 },
          { header: "Origem", width: 20 }, { header: "Destino", width: 20 }, { header: "Retirado por (colaborador)", width: 28 },
          { header: "Realizado por", width: 22 }, { header: "Solicitação", width: 24 }, { header: "Fornecedor", width: 24 },
          { header: "Custo unit.", width: 12, align: "right", numFmt: "#,##0.00" }, { header: "Motivo", width: 32 },
        ],
        rows: (movements as any[]).map(m => [
          fmtDateTime(m.createdAt), MOVEMENT_LABEL[m.type]?.label ?? m.type, m.productName, Number(m.quantity), m.unit,
          m.fromLocationName ?? "", movementDestination(m) ?? "",
          [m.destinationCollaboratorName, m.destinationEquipmentName].filter(Boolean).join(" · "),
          m.performedByName ?? "", m.purchaseRequestId ? `#${m.purchaseRequestId} ${m.purchaseRequestTitle ?? ""}` : "",
          m.supplierName ?? "", m.unitCost != null ? Number(m.unitCost) : "", m.reason ?? "",
        ]),
      }],
    });
  };

  const TabBtn = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => { setTab(id); setSearch(""); }}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 ${tab === id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="w-6 h-6 text-emerald-600" /> Estoque</h1>
          <p className="text-sm text-gray-500">Entradas, saídas e transferências com rastreabilidade completa</p>
        </div>
        {tab !== "produtos" && tab !== "locais" && (
          <div className="flex flex-wrap gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openDialog("manualEntry", null, { mode: "existing", quantity: "" })}><PackagePlus className="w-4 h-4 mr-1.5" /> Adicionar ao estoque</Button>
            <Button variant="outline" onClick={() => openDialog("exit", null, { quantity: "" })}><ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Registrar saída</Button>
            <Button variant="outline" onClick={() => openDialog("transfer", null, { quantity: "" })}><ArrowLeftRight className="w-4 h-4 mr-1.5" /> Transferir</Button>
            <Button variant="outline" onClick={() => openDialog("returnLoan", null, { loanId: "", grossWeightIn: "" })}><Scale className="w-4 h-4 mr-1.5" /> Devolução</Button>
          </div>
        )}
      </div>

      <div className="flex border-b overflow-x-auto">
        <TabBtn id="saldo" icon={Package} label="Saldo" />
        <TabBtn id="movimentacoes" icon={ArrowDownToLine} label="Movimentações" />
        <TabBtn id="produtos" icon={Boxes} label="Produtos" />
        <TabBtn id="devolucoes" icon={Scale} label="Devoluções" />
        <TabBtn id="locais" icon={Warehouse} label="Locais" />
      </div>

      {/* filtros */}
      {(tab === "saldo" || tab === "movimentacoes") && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="relative col-span-2">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <Input className="pl-8 h-9" placeholder="Buscar produto ou local..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={selectCls} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="all">Todos os produtos</option>
            {activeProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={selectCls} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="all">Todos os locais</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {tab === "movimentacoes" && (
            <>
              <select className={selectCls} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">Todos os tipos</option>
                {Object.entries(MOVEMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="flex gap-1">
                <Input type="date" className="h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <Input type="date" className="h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SALDO ── */}
      {tab === "saldo" && (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-emerald-700 text-white text-left text-xs">
              <th className="px-3 py-2">Produto</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Local</th>
              <th className="px-3 py-2 text-right">Saldo</th><th className="px-3 py-2">Un</th><th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {filteredBalances.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum saldo. Os itens entram aqui ao receber uma Solicitação de Compra.</td></tr>}
              {filteredBalances.map((b: any) => (
                <tr key={`${b.productId}-${b.locationId}`} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{b.productName}{b.code && <span className="text-xs text-gray-400 ml-1">({b.code})</span>}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{b.categoryName ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{b.locationName}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtQty(b.quantity)}</td>
                  <td className="px-3 py-2 text-xs">{b.unit}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog("exit", null, { productId: b.productId, locationId: b.locationId, quantity: "" })}>Saída</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog("transfer", null, { productId: b.productId, fromLocationId: b.locationId, quantity: "" })}>Transferir</Button>
                    {isAdmin && <Button size="sm" variant="ghost" className="h-7 text-xs" title="Contagem de inventário" onClick={() => openDialog("adjust", b, { newQuantity: fmtQty(b.quantity), reason: "" })}><SlidersHorizontal className="w-3.5 h-3.5" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* ── MOVIMENTAÇÕES ── */}
      {tab === "movimentacoes" && (
        <>
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={exportMovements} disabled={!movements.length}><FileDown className="w-4 h-4 mr-1.5" /> Exportar Excel</Button></div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-700 text-white text-left text-xs">
                <th className="px-3 py-2">Data/hora</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2 text-right">Qtd</th><th className="px-3 py-2">Origem → Destino</th>
                <th className="px-3 py-2">Retirado por (colaborador)</th><th className="px-3 py-2">Realizado por</th>
                <th className="px-3 py-2">Compra / Fornecedor</th><th className="px-3 py-2">Motivo</th>
              </tr></thead>
              <tbody>
                {movements.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma movimentação</td></tr>}
                {(movements as any[]).filter(m => !search.trim() || `${m.productName} ${m.fromLocationName || ""} ${m.toLocationName || ""}`.toLowerCase().includes(search.trim().toLowerCase())).map(m => (
                  <tr key={m.id} className="border-b hover:bg-gray-50 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDateTime(m.createdAt)}</td>
                    <td className="px-3 py-2"><Badge className={`text-xs ${MOVEMENT_LABEL[m.type]?.cls}`}>{MOVEMENT_LABEL[m.type]?.label}</Badge></td>
                    <td className="px-3 py-2 font-medium">{m.productName}</td>
                    <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${m.type === "saida" ? "text-red-600" : (m.type === "entrada" || m.type === "devolucao") ? "text-emerald-600" : ""}`}>
                      {m.type === "saida" ? "−" : (m.type === "entrada" || m.type === "devolucao") ? "+" : ""}{fmtQty(m.quantity)} {m.unit}
                    </td>
                    <td className="px-3 py-2 text-xs">{m.fromLocationName ?? "—"} → {movementDestination(m) ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{[m.destinationCollaboratorName, m.destinationEquipmentName].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-xs">{m.performedByName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {m.purchaseRequestId ? <a className="text-blue-600 hover:underline" href={`/compras/${m.purchaseRequestId}`}>#{m.purchaseRequestId} {m.purchaseRequestTitle}</a> : "—"}
                      {m.supplierName && <div className="text-gray-500">{m.supplierName}{m.unitCost != null && ` · ${fmtMoney(m.unitCost)}/un`}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[220px]">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      {/* ── PRODUTOS ── */}
      {tab === "produtos" && (
        <>
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" /><Input className="pl-8 h-9" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openDialog("import", null, { selected: {} })}><Download className="w-4 h-4 mr-1.5" /> Importar das compras</Button>
              <Button onClick={() => openDialog("product", null, { name: "", code: "", brand: "", tracksWeight: false, densityKgL: "", unit: "un", categoryId: "", minStock: "0", notes: "" })}><Plus className="w-4 h-4 mr-1.5" /> Novo produto</Button>
            </div>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-700 text-white text-left text-xs">
                <th className="px-3 py-2">Produto</th><th className="px-3 py-2">Marca</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Un</th>
                <th className="px-3 py-2 text-right">Saldo total</th><th className="px-3 py-2 text-right">Mínimo</th><th className="px-3 py-2"></th>
              </tr></thead>
              <tbody>
                {filteredProducts.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum produto. Use "Importar das compras" pra começar com o que já foi comprado.</td></tr>}
                {filteredProducts.map((p: any) => (
                  <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.active ? "" : "opacity-50"}`}>
                    <td className="px-3 py-2 font-medium">{p.name} {!!p.tracks_weight && <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-300">Por peso</Badge>} {!p.active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}</td>
                    <td className="px-3 py-2 text-xs">{p.brand ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{p.code ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{p.categoryName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{p.unit}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtQty(p.totalQuantity)} {p.belowMin && <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500" title="Abaixo do mínimo" />}</td>
                    <td className="px-3 py-2 text-right text-xs">{fmtQty(p.min_stock)}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog("product", p, { name: p.name, code: p.code ?? "", brand: p.brand ?? "", tracksWeight: !!p.tracks_weight, densityKgL: p.density_kg_l ? String(Number(p.density_kg_l)).replace(".", ",") : "", unit: p.unit, categoryId: p.category_id ?? "", minStock: fmtQty(p.min_stock), notes: p.notes ?? "", active: !!p.active })}>Editar</Button>
                      {isAdmin && <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" title="Excluir produto" onClick={() => openDialog("deleteProduct", p)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      {/* ── DEVOLUÇÕES (produtos controlados por peso) ── */}
      {tab === "devolucoes" && (
        <>
          <div className="flex gap-2 items-center">
            <select className={selectCls + " max-w-[220px]"} value={loanStatus} onChange={e => setLoanStatus(e.target.value as any)}>
              <option value="aberta">Em aberto (com o colaborador)</option>
              <option value="devolvida">Devolvidas</option>
            </select>
            <p className="text-xs text-gray-500">Líquidos e pastas controlados por peso: consumo = peso na saída − peso na devolução.</p>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-700 text-white text-left text-xs">
                <th className="px-3 py-2">Retirada</th><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Retirado por / Destino</th>
                <th className="px-3 py-2 text-right">Peso saída</th><th className="px-3 py-2 text-right">Peso devolução</th>
                <th className="px-3 py-2 text-right">Consumo</th><th className="px-3 py-2"></th>
              </tr></thead>
              <tbody>
                {(loans as any[]).length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">{loanStatus === "aberta" ? "Nenhuma retirada em aberto." : "Nenhuma devolução registrada."}</td></tr>}
                {(loans as any[]).map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50 align-top">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">#{l.id}<div className="text-gray-500">{fmtDateTime(l.createdAt)}</div></td>
                    <td className="px-3 py-2 font-medium">{l.productName}</td>
                    <td className="px-3 py-2 text-xs">{l.locationName}</td>
                    <td className="px-3 py-2 text-xs">{[l.destinationCollaboratorName, l.destinationEquipmentName].filter(Boolean).join(" · ") || "—"}{l.destinationNote && <div className="text-gray-500">{l.destinationNote}</div>}</td>
                    <td className="px-3 py-2 text-right">{fmtQty(l.grossWeightOut)}</td>
                    <td className="px-3 py-2 text-right">{l.status === "devolvida" ? fmtQty(l.grossWeightIn) : "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{l.status === "devolvida" ? (Number(l.densityKgL) > 0 ? `${fmtQty(l.consumed)} kg (${fmtQty(l.consumedStock)} ${l.unit})` : `${fmtQty(l.consumed)} kg`) : "—"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {l.status === "aberta"
                        ? <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={() => openDialog("returnLoan", l, { grossWeightIn: "" })}>Devolver</Button>
                        : <span className="text-[11px] text-gray-500">{l.returnedByName ?? ""}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      {/* ── LOCAIS ── */}
      {tab === "locais" && (
        <>
          <div className="flex justify-end"><Button onClick={() => openDialog("location", null, { name: "", type: "almoxarifado", equipmentId: "", notes: "" })}><Plus className="w-4 h-4 mr-1.5" /> Novo local</Button></div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-emerald-700 text-white text-left text-xs"><th className="px-3 py-2">Local</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Veículo/equipamento</th><th className="px-3 py-2">Observações</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {locations.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Cadastre pelo menos um local (ex: Almoxarifado Sede).</td></tr>}
                {(locations as any[]).map(l => (
                  <tr key={l.id} className={`border-b hover:bg-gray-50 ${l.active ? "" : "opacity-50"}`}>
                    <td className="px-3 py-2 font-medium">{l.name} {!l.active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}</td>
                    <td className="px-3 py-2 text-xs">{LOCATION_TYPES[l.type]}</td>
                    <td className="px-3 py-2 text-xs">{l.equipmentName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{l.notes ?? "—"}</td>
                    <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog("location", l, { name: l.name, type: l.type, equipmentId: l.equipment_id ?? "", notes: l.notes ?? "", active: !!l.active })}>Editar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      {/* ── DIALOGS ── */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {dialog?.kind === "manualEntry" && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="w-4 h-4 text-emerald-600" /> Adicionar ao estoque</DialogTitle></DialogHeader>
            <p className="text-xs text-gray-500">Pra item que entra sem passar por uma Solicitação de Compra (saldo inicial, doação, sobra de obra, item achado na conferência etc.).</p>
            <div className="space-y-3">
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={(form.mode ?? "existing") === "existing"} onChange={() => set("mode", "existing")} /> Produto do catálogo</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={form.mode === "new"} onChange={() => set("mode", "new")} /> Produto novo</label>
              </div>
              {(form.mode ?? "existing") === "existing" ? (
                <div><Label>Produto *</Label>
                  <select className={selectCls} value={form.productId ?? ""} onChange={e => set("productId", e.target.value)}>
                    <option value="">Selecione...</option>{activeProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select></div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Label>Nome do produto *</Label><Input value={form.newProductName ?? ""} onChange={e => set("newProductName", e.target.value)} placeholder="Ex: Graxa universal" /></div>
                  <div><Label>Unidade *</Label><Input value={form.newProductUnit ?? "un"} onChange={e => set("newProductUnit", e.target.value)} placeholder="un, L, kg, m..." /></div>
                </div>
              )}
              <div><Label>Estoque de destino *</Label>
                <select className={selectCls} value={form.locationId ?? ""} onChange={e => set("locationId", e.target.value)}>
                  <option value="">Selecione...</option>{activeLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantidade *</Label><Input value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} placeholder="0" /></div>
                <div><Label>Custo unitário (opcional)</Label><Input value={form.unitCost ?? ""} onChange={e => set("unitCost", e.target.value)} placeholder="0,00" /></div>
              </div>
              <div><Label>Observação</Label><Textarea rows={2} value={form.reason ?? ""} onChange={e => set("reason", e.target.value)} placeholder="Ex: saldo inicial do cadastro" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={manualEntryMut.isPending} onClick={() => {
                const isNew = form.mode === "new";
                if (isNew && !form.newProductName?.trim()) return toast.error("Informe o nome do produto novo");
                if (!isNew && !form.productId) return toast.error("Selecione um produto do catálogo");
                if (!form.locationId || !(num(form.quantity) > 0)) return toast.error("Informe o estoque de destino e a quantidade");
                manualEntryMut.mutate({
                  productId: isNew ? undefined : Number(form.productId),
                  newProductName: isNew ? form.newProductName.trim() : undefined,
                  newProductUnit: isNew ? (form.newProductUnit || "un").trim() : undefined,
                  locationId: Number(form.locationId), quantity: num(form.quantity),
                  unitCost: form.unitCost ? num(form.unitCost) : undefined,
                  reason: form.reason || undefined,
                });
              }}>{manualEntryMut.isPending ? "Salvando..." : "Adicionar"}</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "exit" && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-red-500" /> Registrar saída</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Produto *</Label>
                <select className={selectCls} value={form.productId ?? ""} onChange={e => setForm((f: any) => ({ ...f, productId: e.target.value, quantity: "" }))}>
                  <option value="">Selecione...</option>{activeProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select></div>
              <div><Label>Sai de qual estoque *</Label>
                <select className={selectCls} value={form.locationId ?? ""} onChange={e => setForm((f: any) => ({ ...f, locationId: e.target.value, quantity: "" }))}>
                  <option value="">Selecione...</option>{activeLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
              {(() => {
                const exitBalance = Number((form.productId && form.locationId ? (balances as any[]).find(b => b.productId == form.productId && b.locationId == form.locationId)?.quantity : 0) ?? 0);
                const exitOptions = qtyOptions(exitBalance);
                return (<>
                  {form.productId && form.locationId && (
                    <p className="text-xs text-gray-500">Saldo disponível: <b>{fmtQty(exitBalance)}</b></p>
                  )}
                  {activeProducts.find((p: any) => p.id == form.productId)?.tracks_weight ? (
                    <div>
                      <Label>Peso na balança, na saída (kg) *</Label>
                      <Input value={form.grossWeightOut ?? ""} onChange={e => set("grossWeightOut", e.target.value)} placeholder="Ex: 19,2 (com a embalagem)" />
                      <p className="text-[11px] text-teal-700 mt-1">Produto controlado por peso: fica como retirada em aberto até a devolução (aba Devoluções). Use a mesma balança e embalagem na devolução. O estoque baixa só o que for consumido.</p>
                    </div>
                  ) : isDecimalUnit(activeProducts.find((p: any) => p.id == form.productId)) ? (
                    <div><Label>Quantidade ({activeProducts.find((p: any) => p.id == form.productId)?.unit}) *</Label><Input value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} placeholder="Ex: 12,5" /></div>
                  ) : (
                  <div><Label>Quantidade *</Label>
                    <select className={selectCls} value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} disabled={!form.productId || !form.locationId || exitOptions.length === 0}>
                      <option value="">{!form.productId || !form.locationId ? "Selecione produto e estoque..." : exitOptions.length === 0 ? "Sem saldo" : "Selecione..."}</option>
                      {exitOptions.map(q => <option key={q} value={q}>{fmtQty(q)}</option>)}
                    </select>
                  </div>
                  )}
                </>);
              })()}
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Retirado por (colaborador)</Label>
                  <select className={selectCls} value={form.collaboratorId ?? ""} onChange={e => set("collaboratorId", e.target.value)}>
                    <option value="">—</option>{(collaborators as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><Label>Equipamento de destino</Label>
                  <select className={selectCls} value={form.equipmentId ?? ""} onChange={e => set("equipmentId", e.target.value)}>
                    <option value="">—</option>{(equipmentList as any[]).map(e => <option key={e.id} value={e.id}>{e.name}{e.licensePlate ? ` (${e.licensePlate})` : ""}</option>)}
                  </select></div>
              </div>
              <div><Label>Destino</Label>
                <select className={selectCls} value={form.destinationNote ?? ""} onChange={e => set("destinationNote", e.target.value)}>
                  <option value="">—</option>
                  {activeGpsLocations.map((g: any) => <option key={g.id} value={g.name}>{g.name}</option>)}
                  <option value="__outro__">Outro (digitar)...</option>
                </select>
                {form.destinationNote === "__outro__" && (
                  <Input className="mt-1.5" value={form.destinationNoteCustom ?? ""} onChange={e => set("destinationNoteCustom", e.target.value)} placeholder="Ex: Frente de serviço Fazenda X" />
                )}
              </div>
              <p className="text-[11px] text-gray-400">Informe ao menos um: colaborador, equipamento ou destino.</p>
              <div><Label>Motivo</Label><Textarea rows={2} value={form.reason ?? ""} onChange={e => set("reason", e.target.value)} placeholder="Ex: troca de óleo do caminhão" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button disabled={exitMut.isPending} onClick={() => {
                const isWeight = !!activeProducts.find((p: any) => p.id == form.productId)?.tracks_weight;
                const exitProd = activeProducts.find((p: any) => p.id == form.productId);
                const qty = isWeight ? undefined : (isDecimalUnit(exitProd) ? num(form.quantity) : Number(form.quantity));
                const grossOut = isWeight ? num(form.grossWeightOut) : undefined;
                if (!form.productId || !form.locationId) return toast.error("Informe produto e estoque de origem");
                if (isWeight ? !(grossOut! > 0) : !(qty! > 0)) return toast.error(isWeight ? "Informe o peso na balança na saída" : "Informe a quantidade");
                const destinationNote = form.destinationNote === "__outro__" ? (form.destinationNoteCustom || "").trim() : (form.destinationNote || "");
                exitMut.mutate({ productId: Number(form.productId), locationId: Number(form.locationId), quantity: qty, grossWeightOut: grossOut,
                  destinationCollaboratorId: form.collaboratorId ? Number(form.collaboratorId) : null,
                  destinationEquipmentId: form.equipmentId ? Number(form.equipmentId) : null,
                  destinationNote: destinationNote || undefined, reason: form.reason || undefined });
              }}>{exitMut.isPending ? "Salvando..." : "Registrar saída"}</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "transfer" && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-blue-500" /> Transferir entre estoques</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Produto *</Label>
                <select className={selectCls} value={form.productId ?? ""} onChange={e => setForm((f: any) => ({ ...f, productId: e.target.value, quantity: "" }))}>
                  <option value="">Selecione...</option>{activeProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>De *</Label>
                  <select className={selectCls} value={form.fromLocationId ?? ""} onChange={e => setForm((f: any) => ({ ...f, fromLocationId: e.target.value, quantity: "" }))}>
                    <option value="">Selecione...</option>{activeLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select></div>
                <div><Label>Para *</Label>
                  <select className={selectCls} value={form.toLocationId ?? ""} onChange={e => set("toLocationId", e.target.value)}>
                    <option value="">Selecione...</option>{activeLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select></div>
              </div>
              {(() => {
                const transferBalance = Number((form.productId && form.fromLocationId ? (balances as any[]).find(b => b.productId == form.productId && b.locationId == form.fromLocationId)?.quantity : 0) ?? 0);
                const transferOptions = qtyOptions(transferBalance);
                return (<>
                  {form.productId && form.fromLocationId && (
                    <p className="text-xs text-gray-500">Saldo disponível na origem: <b>{fmtQty(transferBalance)}</b></p>
                  )}
                  {(activeProducts.find((p: any) => p.id == form.productId)?.tracks_weight || isDecimalUnit(activeProducts.find((p: any) => p.id == form.productId))) ? (
                    <div><Label>Quantidade ({activeProducts.find((p: any) => p.id == form.productId)?.unit ?? "un"}) *</Label><Input value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} placeholder="Ex: 5,5" /></div>
                  ) : (
                  <div><Label>Quantidade *</Label>
                    <select className={selectCls} value={form.quantity ?? ""} onChange={e => set("quantity", e.target.value)} disabled={!form.productId || !form.fromLocationId || transferOptions.length === 0}>
                      <option value="">{!form.productId || !form.fromLocationId ? "Selecione produto e origem..." : transferOptions.length === 0 ? "Sem saldo" : "Selecione..."}</option>
                      {transferOptions.map(q => <option key={q} value={q}>{fmtQty(q)}</option>)}
                    </select>
                  </div>
                  )}
                </>);
              })()}
              <div><Label>Transferido por (colaborador)</Label>
                <select className={selectCls} value={form.collaboratorId ?? ""} onChange={e => set("collaboratorId", e.target.value)}>
                  <option value="">—</option>{(collaborators as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><Label>Motivo</Label><Textarea rows={2} value={form.reason ?? ""} onChange={e => set("reason", e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button disabled={transferMut.isPending} onClick={() => {
                const tProd = activeProducts.find((p: any) => p.id == form.productId);
                const tQty = (tProd?.tracks_weight || isDecimalUnit(tProd)) ? num(form.quantity) : Number(form.quantity);
                if (!form.productId || !form.fromLocationId || !form.toLocationId || !(tQty > 0)) return toast.error("Preencha produto, origem, destino e quantidade");
                transferMut.mutate({ productId: Number(form.productId), fromLocationId: Number(form.fromLocationId), toLocationId: Number(form.toLocationId), quantity: tQty, collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : null, reason: form.reason || undefined });
              }}>{transferMut.isPending ? "Salvando..." : "Transferir"}</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "returnLoan" && (() => {
            const l = dialog.data ?? (openLoans as any[]).find(x => String(x.id) === String(form.loanId));
            if (!l) return (<>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Scale className="w-4 h-4 text-teal-600" /> Registrar devolução</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Retirada em aberto *</Label>
                  <select className={selectCls} value={form.loanId ?? ""} onChange={e => set("loanId", e.target.value)}>
                    <option value="">{(openLoans as any[]).length === 0 ? "Nenhuma retirada em aberto" : "Selecione..."}</option>
                    {(openLoans as any[]).map(x => <option key={x.id} value={x.id}>#{x.id} — {x.productName} · {[x.destinationCollaboratorName, x.destinationEquipmentName, x.destinationNote].filter(Boolean).join(" · ") || "sem destino"} · {fmtDateTime(x.createdAt)}</option>)}
                  </select></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button></DialogFooter>
            </>);
            const gin = num(form.grossWeightIn ?? "");
            const valid = !isNaN(gin) && gin >= 0;
            const consumed = valid ? Number(l.grossWeightOut) - gin : null;
            const bad = consumed !== null && consumed < -1e-9;
            return (<>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Scale className="w-4 h-4 text-teal-600" /> Devolução — retirada #{l.id}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm">{l.productName} — {l.locationName}<br /><span className="text-gray-500">Peso na balança na saída: <b>{fmtQty(l.grossWeightOut)}</b></span></p>
                <div><Label>Peso na balança, na devolução (kg) *</Label><Input value={form.grossWeightIn ?? ""} onChange={e => set("grossWeightIn", e.target.value)} placeholder="Mesma balança e embalagem da saída" /></div>
                {consumed !== null && (
                  <p className={`text-sm rounded-md border p-2 ${bad ? "bg-red-50 border-red-200 text-red-700" : "bg-teal-50 border-teal-200 text-teal-800"}`}>
                    {bad ? "Peso inconsistente: confira a balança." : <>Consumo: <b>{fmtQty(consumed)} kg</b>{Number(l.densityKgL) > 0 && <> = <b>{fmtQty(consumed / Number(l.densityKgL))} {l.unit}</b> (densidade {fmtQty(l.densityKgL)} kg/L)</>} — é o que baixa do estoque</>}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
                <Button className="bg-teal-600 hover:bg-teal-700" disabled={returnMut.isPending || !valid || bad} onClick={() => returnMut.mutate({ loanId: l.id, grossWeightIn: gin })}>{returnMut.isPending ? "Salvando..." : "Confirmar devolução"}</Button>
              </DialogFooter>
            </>);
          })()}

          {dialog?.kind === "adjust" && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-amber-500" /> Ajuste de inventário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm">{dialog.data.productName} — {dialog.data.locationName}<br /><span className="text-gray-500">Saldo no sistema: <b>{fmtQty(dialog.data.quantity)} {dialog.data.unit}</b></span></p>
              <div><Label>Saldo contado (real) *</Label><Input value={form.newQuantity ?? ""} onChange={e => set("newQuantity", e.target.value)} /></div>
              <div><Label>Motivo do ajuste *</Label><Textarea rows={3} value={form.reason ?? ""} onChange={e => set("reason", e.target.value)} placeholder="Ex: contagem física de setembro/2026" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button disabled={adjustMut.isPending} onClick={() => {
                const n = num(form.newQuantity);
                if (isNaN(n) || n < 0 || !(form.reason || "").trim()) return toast.error("Informe o saldo contado e o motivo");
                adjustMut.mutate({ productId: dialog.data.productId, locationId: dialog.data.locationId, newQuantity: n, reason: form.reason.trim() });
              }}>{adjustMut.isPending ? "Salvando..." : "Salvar ajuste"}</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "deleteProduct" && (<>
            <DialogHeader><DialogTitle>Excluir produto</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p>Excluir <b>{dialog.data?.name}</b> do catálogo? Essa ação não pode ser desfeita.</p>
              <p className="text-xs text-gray-500">Só é possível excluir produtos que nunca tiveram movimentação no estoque. Se ele já foi usado, desmarque "Ativo" em Editar para tirá-lo de uso sem perder o histórico.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteProductMut.isPending} onClick={() => deleteProductMut.mutate({ id: dialog.data.id })}>Excluir</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "product" && (<>
            <DialogHeader><DialogTitle>{dialog.data ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>Marca</Label><Input value={form.brand ?? ""} onChange={e => set("brand", e.target.value)} placeholder="Opcional (ex: Mann, Valvoline)" /></div>
              <label className="flex items-start gap-2 text-sm rounded-md border p-2 bg-teal-50/50">
                <input type="checkbox" className="mt-0.5" checked={!!form.tracksWeight} onChange={e => setForm((f: any) => ({ ...f, tracksWeight: e.target.checked, unit: e.target.checked ? (f.densityKgL ? "L" : "kg") : f.unit }))} />
                <span><b>Controla consumo por peso</b> (líquido ou pasta, como graxa, óleo em balde, tinta)<br /><span className="text-xs text-gray-500">A saída exige o peso na balança e a devolução calcula o quanto foi consumido. Sem densidade, o estoque é em kg.</span></span>
              </label>
              {form.tracksWeight && (
                <div><Label>Densidade (kg por litro) — só para líquidos</Label>
                  <Input value={form.densityKgL ?? ""} onChange={e => setForm((f: any) => ({ ...f, densityKgL: e.target.value, unit: e.target.value.trim() ? "L" : "kg" }))} placeholder="Ex: 0,90 (deixe vazio para pasta/graxa em kg)" />
                  <p className="text-[11px] text-gray-500 mt-1">Com densidade, o estoque fica em litros e o consumo (kg na balança) é convertido em litros. Para calibrar: peso líquido de um balde cheio ÷ litros do balde.</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Código</Label><Input value={form.code ?? ""} onChange={e => set("code", e.target.value)} /></div>
                <div><Label>Unidade *</Label><Input value={form.unit ?? ""} onChange={e => set("unit", e.target.value)} placeholder="un, L, kg..." /></div>
                <div><Label>Estoque mínimo</Label><Input value={form.minStock ?? ""} onChange={e => set("minStock", e.target.value)} /></div>
              </div>
              <div><Label>Categoria</Label>
                <select className={selectCls} value={form.categoryId ?? ""} onChange={e => set("categoryId", e.target.value)}>
                  <option value="">—</option>{(categories as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><Label>Observações</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>
              {dialog.data && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.active} onChange={e => set("active", e.target.checked)} /> Ativo</label>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (!form.name?.trim() || !form.unit?.trim()) return toast.error("Informe nome e unidade");
                const payload = { name: form.name.trim(), code: form.code || undefined, brand: form.brand?.trim() || undefined, tracksWeight: !!form.tracksWeight, densityKgL: form.tracksWeight && String(form.densityKgL ?? "").trim() ? num(form.densityKgL) : null, unit: form.unit.trim(), categoryId: form.categoryId ? Number(form.categoryId) : null, minStock: num(form.minStock) || 0, notes: form.notes || undefined };
                if (dialog.data) updateProductMut.mutate({ id: dialog.data.id, ...payload, active: !!form.active }); else createProductMut.mutate(payload);
              }}>Salvar</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "location" && (<>
            <DialogHeader><DialogTitle>{dialog.data ? "Editar local" : "Novo local de estoque"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} placeholder="Ex: Almoxarifado Sede" /></div>
              <div><Label>Tipo</Label>
                <select className={selectCls} value={form.type ?? "almoxarifado"} onChange={e => set("type", e.target.value)}>
                  {Object.entries(LOCATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              {form.type === "veiculo" && (
                <div><Label>Veículo / equipamento</Label>
                  <select className={selectCls} value={form.equipmentId ?? ""} onChange={e => set("equipmentId", e.target.value)}>
                    <option value="">—</option>{(equipmentList as any[]).map(e => <option key={e.id} value={e.id}>{e.name}{e.licensePlate ? ` (${e.licensePlate})` : ""}</option>)}
                  </select></div>
              )}
              <div><Label>Observações</Label><Textarea rows={2} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>
              {dialog.data && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.active} onChange={e => set("active", e.target.checked)} /> Ativo</label>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (!form.name?.trim()) return toast.error("Informe o nome");
                const payload = { name: form.name.trim(), type: form.type, equipmentId: form.equipmentId ? Number(form.equipmentId) : null, notes: form.notes || undefined };
                if (dialog.data) updateLocationMut.mutate({ id: dialog.data.id, ...payload, active: !!form.active }); else createLocationMut.mutate(payload);
              }}>Salvar</Button>
            </DialogFooter>
          </>)}

          {dialog?.kind === "import" && (<>
            <DialogHeader><DialogTitle>Importar produtos das compras</DialogTitle></DialogHeader>
            <p className="text-xs text-gray-500">Nomes de itens já comprados que ainda não estão no catálogo. Marque os que quer criar (variações do mesmo nome já foram agrupadas).</p>
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {(suggestions as any[]).length === 0 && <p className="p-3 text-sm text-gray-400">Nada pendente pra importar.</p>}
              {(suggestions as any[]).map((s, i) => (
                <label key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={!!form.selected?.[i]} onChange={e => set("selected", { ...form.selected, [i]: e.target.checked })} />
                  <span className="flex-1">{s.name}</span><span className="text-xs text-gray-400">{s.unit}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => set("selected", Object.fromEntries((suggestions as any[]).map((_, i) => [i, true])))}>Marcar todos</Button>
              <Button disabled={importMut.isPending} onClick={() => {
                const chosen = (suggestions as any[]).filter((_, i) => form.selected?.[i]).map(s => ({ name: s.name, unit: s.unit || "un", categoryId: s.categoryId ?? null }));
                if (!chosen.length) return toast.error("Selecione ao menos um");
                importMut.mutate({ products: chosen });
              }}>Importar selecionados</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

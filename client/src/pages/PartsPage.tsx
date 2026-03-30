import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Package, Plus, Search, AlertTriangle, ShoppingCart, Camera,
  Trash2, FileText, ChevronDown, ChevronUp, CheckSquare, Square,
  Printer, X, Minus, Filter
} from "lucide-react";

// ─── Logos e dados de contato ────────────────────────────────────────────────
const BTREE_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";
const BTREE_SITE = "https://btreeambiental.com";
const BTREE_CONTATO = "(44) 99999-9999 | contato@btreeambiental.com";
const BTREE_ENDERECO = "Astorga - PR | BTREE Ambiental";

type ActiveTab = "estoque" | "pedidos";

// ─── Carrinho ─────────────────────────────────────────────────────────────────
type CartItem = {
  partId?: number;
  partName: string;
  partCode?: string;
  partCategory?: string;
  supplier?: string;
  unit: string;
  quantity: number;
  unitCost?: string;
};

// ─── Geração de PDF ───────────────────────────────────────────────────────────
function generatePDF(items: CartItem[], title: string, supplierFilter?: string) {
  const filteredItems = supplierFilter
    ? items.filter(i => (i.supplier || "Sem fornecedor") === supplierFilter)
    : items;

  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(BTREE_SITE)}`;

  const rows = filteredItems.map(item => {
    const total = item.unitCost
      ? `R$ ${(parseFloat(item.unitCost.replace(",", ".")) * item.quantity).toFixed(2)}`
      : "—";
    return `
      <tr>
        <td>${item.partCode || "—"}</td>
        <td>${item.partName}</td>
        <td>${item.partCategory || "—"}</td>
        <td>${item.supplier || "—"}</td>
        <td style="text-align:center">${item.quantity} ${item.unit}</td>
        <td style="text-align:right">${item.unitCost ? `R$ ${item.unitCost}` : "—"}</td>
        <td style="text-align:right">${total}</td>
      </tr>`;
  }).join("");

  const totalGeral = filteredItems.reduce((acc, item) => {
    if (item.unitCost) acc += parseFloat(item.unitCost.replace(",", ".")) * item.quantity;
    return acc;
  }, 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2e7d32; padding-bottom: 12px; margin-bottom: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left img { height: 50px; object-fit: contain; }
    .header-info h1 { font-size: 18px; color: #2e7d32; font-weight: bold; }
    .header-info p { font-size: 11px; color: #555; margin-top: 2px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 11px; color: #444; }
    .supplier-badge { background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-bottom: 10px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #2e7d32; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .total-row td { font-weight: bold; background: #e8f5e9 !important; border-top: 2px solid #2e7d32; }
    .footer { margin-top: 20px; border-top: 2px solid #2e7d32; padding-top: 12px; display: flex; align-items: flex-end; justify-content: space-between; }
    .footer-left { font-size: 10px; color: #555; line-height: 1.6; }
    .footer-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .footer-right img.qr { width: 70px; height: 70px; }
    .footer-right .qr-label { font-size: 9px; color: #888; text-align: center; }
    .dev-credit { font-size: 9px; color: #aaa; text-align: center; margin-top: 6px; }
    .dev-credit img { height: 18px; vertical-align: middle; opacity: 0.6; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${BTREE_LOGO}" alt="BTREE Ambiental" />
      <div class="header-info">
        <h1>Lista de Compras</h1>
        <p>${BTREE_ENDERECO}</p>
        <p>${BTREE_CONTATO}</p>
      </div>
    </div>
    <div style="text-align:right; font-size:11px; color:#555;">
      <strong>${title}</strong><br/>
      Data: ${now}
    </div>
  </div>

  ${supplierFilter ? `<div class="supplier-badge">Fornecedor: ${supplierFilter}</div>` : ""}

  <div class="meta">
    <span>${filteredItems.length} ite${filteredItems.length !== 1 ? "ns" : "m"}</span>
    ${totalGeral > 0 ? `<span>Total estimado: <strong>R$ ${totalGeral.toFixed(2)}</strong></span>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Peça / Material</th>
        <th>Categoria</th>
        <th>Fornecedor</th>
        <th style="text-align:center">Qtd</th>
        <th style="text-align:right">Custo Unit.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      ${totalGeral > 0 ? `<tr class="total-row"><td colspan="6">Total Estimado</td><td style="text-align:right">R$ ${totalGeral.toFixed(2)}</td></tr>` : ""}
    </tbody>
  </table>

  <div style="margin-top:16px; padding:10px; background:#f5f5f5; border-radius:6px; font-size:11px; color:#666;">
    <strong>Assinatura / Aprovação:</strong> _____________________________________ &nbsp;&nbsp; Data: ___/___/______
  </div>

  <div class="footer">
    <div class="footer-left">
      <strong>BTREE Ambiental</strong><br/>
      ${BTREE_ENDERECO}<br/>
      ${BTREE_CONTATO}<br/>
      <a href="${BTREE_SITE}" style="color:#2e7d32;">${BTREE_SITE}</a>
      <div class="dev-credit" style="margin-top:8px;">
        Desenvolvido por <img src="${KOBAYASHI_LOGO}" alt="Kobayashi" /> Kobayashi Desenvolvimento de Sistemas
      </div>
    </div>
    <div class="footer-right">
      <img class="qr" src="${qrUrl}" alt="QR Code" />
      <span class="qr-label">Acesse nosso site</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error("Permita pop-ups para gerar o PDF"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function PartsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("estoque");
  const [search, setSearch] = useState("");
  const [isPartOpen, setIsPartOpen] = useState(false);
  const [editPartId, setEditPartId] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderTitle, setOrderTitle] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedForPDF, setSelectedForPDF] = useState<Set<number>>(new Set());
  const [pdfSupplierFilter, setPdfSupplierFilter] = useState<string>("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const [partForm, setPartForm] = useState({
    name: "", category: "", unit: "un", stockQuantity: "0",
    minStock: "0", unitCost: "", supplier: "", notes: "",
  });
  const [partPhotoBase64, setPartPhotoBase64] = useState<string | null>(null);
  const [partPhotoPreview, setPartPhotoPreview] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: partsList = [], isLoading: loadingParts } = trpc.parts.listParts.useQuery({ search: search || undefined });
  const { data: orders = [], isLoading: loadingOrders } = trpc.purchaseOrders.listOrders.useQuery();

  const createPartMutation = trpc.parts.createPart.useMutation({
    onSuccess: () => { toast.success("Peça cadastrada!"); utils.parts.listParts.invalidate(); setIsPartOpen(false); resetPartForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updatePartMutation = trpc.parts.updatePart.useMutation({
    onSuccess: () => { toast.success("Peça atualizada!"); utils.parts.listParts.invalidate(); setIsPartOpen(false); setEditPartId(null); resetPartForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deletePartMutation = trpc.parts.deletePart.useMutation({
    onSuccess: () => { toast.success("Peça removida!"); utils.parts.listParts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createOrderMutation = trpc.purchaseOrders.createOrder.useMutation({
    onSuccess: () => {
      toast.success("Pedido de compra salvo!");
      utils.purchaseOrders.listOrders.invalidate();
      setCart([]);
      setOrderTitle("");
      setOrderNotes("");
      setIsCartOpen(false);
      setActiveTab("pedidos");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.purchaseOrders.updateOrderStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.purchaseOrders.listOrders.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetPartForm = () => {
    setPartForm({ name: "", category: "", unit: "un", stockQuantity: "0", minStock: "0", unitCost: "", supplier: "", notes: "" });
    setPartPhotoBase64(null);
    setPartPhotoPreview(null);
  };

  const openEditPart = (p: any) => {
    setEditPartId(p.id);
    setPartForm({
      name: p.name, category: p.category || "", unit: p.unit || "un",
      stockQuantity: String(p.stockQuantity || 0), minStock: String(p.minStock || 0),
      unitCost: p.unitCost || "", supplier: p.supplier || "", notes: p.notes || "",
    });
    setPartPhotoBase64(null);
    setPartPhotoPreview(p.photoUrl || null);
    setIsPartOpen(true);
  };

  const openPhotoPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
    document.body.appendChild(input);
    const cleanup = () => setTimeout(() => { try { if (document.body.contains(input)) document.body.removeChild(input); } catch {} }, 300);
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 5MB."); cleanup(); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { const b64 = ev.target?.result as string; setPartPhotoBase64(b64); setPartPhotoPreview(b64); };
        reader.readAsDataURL(file);
      }
      cleanup();
    });
    input.addEventListener("cancel", cleanup);
    setTimeout(cleanup, 60000);
    input.click();
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: partForm.name, category: partForm.category || undefined, unit: partForm.unit,
      stockQuantity: parseInt(partForm.stockQuantity) || 0, minStock: parseInt(partForm.minStock) || 0,
      unitCost: partForm.unitCost || undefined, supplier: partForm.supplier || undefined,
      notes: partForm.notes || undefined, photoBase64: partPhotoBase64 || undefined,
    };
    if (editPartId) updatePartMutation.mutate({ id: editPartId, ...data });
    else createPartMutation.mutate(data);
  };

  // Carrinho
  const addToCart = (part: any) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.partId === part.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [...prev, {
        partId: part.id, partName: part.name, partCode: part.code || undefined,
        partCategory: part.category || undefined, supplier: part.supplier || undefined,
        unit: part.unit || "un", quantity: 1, unitCost: part.unitCost || undefined,
      }];
    });
    toast.success(`${part.name} adicionado ao pedido`);
  };

  const updateCartQty = (idx: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter((_, i) => i !== idx)); return; }
    setCart(prev => { const u = [...prev]; u[idx] = { ...u[idx], quantity: qty }; return u; });
  };

  const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const suppliers = useMemo(() => {
    const s = new Set(cart.map(i => i.supplier || "Sem fornecedor"));
    return Array.from(s);
  }, [cart]);

  const cartBySupplier = useMemo(() => {
    const map: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const key = item.supplier || "Sem fornecedor";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [cart]);

  const handleSaveOrder = () => {
    if (!orderTitle.trim()) { toast.error("Informe um título para o pedido"); return; }
    if (cart.length === 0) { toast.error("Adicione pelo menos uma peça ao pedido"); return; }
    createOrderMutation.mutate({ title: orderTitle, notes: orderNotes || undefined, items: cart });
  };

  const handleGeneratePDF = (orderItems: CartItem[], title: string, supplier?: string) => {
    generatePDF(orderItems, title, supplier);
  };

  const lowStockCount = partsList.filter((p: any) => p.stockQuantity <= (p.minStock || 0)).length;

  const STATUS_COLORS: Record<string, string> = {
    rascunho: "bg-gray-100 text-gray-700",
    enviado: "bg-blue-100 text-blue-700",
    aprovado: "bg-green-100 text-green-700",
    rejeitado: "bg-red-100 text-red-700",
    comprado: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Package className="h-7 w-7" /> Peças e Acessórios
          </h1>
          <p className="text-gray-500 text-sm mt-1">Estoque e pedidos de compra</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === "estoque" && (
            <>
              <Button onClick={() => { setEditPartId(null); resetPartForm(); setIsPartOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <Plus className="h-4 w-4" /> Nova Peça
              </Button>
              {cart.length > 0 && (
                <Button onClick={() => setIsCartOpen(true)} variant="outline" className="gap-2 border-emerald-600 text-emerald-700">
                  <ShoppingCart className="h-4 w-4" /> Pedido ({cart.length})
                </Button>
              )}
            </>
          )}
          {activeTab === "pedidos" && (
            <Button onClick={() => { setActiveTab("estoque"); }} variant="outline" className="gap-2 border-emerald-600 text-emerald-700">
              <ShoppingCart className="h-4 w-4" /> Novo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{partsList.length}</p>
          <p className="text-xs text-gray-500">Peças cadastradas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
          <p className="text-xs text-gray-500">Estoque baixo</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{cart.length}</p>
          <p className="text-xs text-gray-500">Itens no pedido</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["estoque", "pedidos"] as ActiveTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab === "estoque" ? <><Package className="h-4 w-4 inline mr-1" />Estoque</> : <><FileText className="h-4 w-4 inline mr-1" />Pedidos de Compra</>}
          </button>
        ))}
      </div>

      {/* ─── ABA ESTOQUE ─── */}
      {activeTab === "estoque" && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar peça..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {loadingParts ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : partsList.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><Package className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Nenhuma peça cadastrada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Peça</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 hidden md:table-cell">Fornecedor</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Estoque</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr></thead>
                <tbody>
                  {partsList.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          {p.stockQuantity <= (p.minStock || 0) && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.category || "Sem categoria"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">{p.supplier || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${p.stockQuantity <= (p.minStock || 0) ? "text-red-600" : "text-emerald-700"}`}>
                          {p.stockQuantity} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditPart(p)} className="text-emerald-700 hover:bg-emerald-50">Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => addToCart(p)} className="text-blue-600 hover:bg-blue-50 gap-1">
                            <ShoppingCart className="h-3.5 w-3.5" /> Pedir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── ABA PEDIDOS ─── */}
      {activeTab === "pedidos" && (
        loadingOrders ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum pedido de compra</p>
            <p className="text-sm mt-1">Vá para Estoque, selecione peças e clique em "Pedir"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(orders as any[]).map((order: any) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800">{order.title}</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>{order.status}</Badge>
                      {expandedOrder === order.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {expandedOrder === order.id && (
                    <OrderDetail
                      orderId={order.id}
                      orderTitle={order.title}
                      orderStatus={order.status}
                      onStatusChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
                      onGeneratePDF={handleGeneratePDF}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ─── Sheet: Cadastro de Peça ─── */}
      <Sheet open={isPartOpen} onOpenChange={(v) => { setIsPartOpen(v); if (!v) { setEditPartId(null); resetPartForm(); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle className="text-emerald-800">{editPartId ? "Editar Peça" : "Nova Peça"}</SheetTitle></SheetHeader>
          <form onSubmit={handlePartSubmit} className="space-y-4 pb-8">
            {/* Foto */}
            <div>
              <Label>Foto da Peça</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                  {partPhotoPreview ? (
                    <img src={partPhotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openPhotoPicker} className="gap-1.5 text-xs">
                    <Camera className="h-3.5 w-3.5" /> Câmera / Galeria
                  </Button>
                  {partPhotoPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setPartPhotoBase64(null); setPartPhotoPreview(null); }} className="text-red-500 text-xs">
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div><Label>Nome *</Label><Input value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} required placeholder="Nome da peça" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={partForm.category} onChange={e => setPartForm(f => ({ ...f, category: e.target.value }))} placeholder="ex: Filtros, Correias..." /></div>
              <div><Label>Unidade</Label><Input value={partForm.unit} onChange={e => setPartForm(f => ({ ...f, unit: e.target.value }))} placeholder="un, L, kg..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Estoque Atual</Label><Input type="number" value={partForm.stockQuantity} onChange={e => setPartForm(f => ({ ...f, stockQuantity: e.target.value }))} /></div>
              <div><Label>Estoque Mínimo</Label><Input type="number" value={partForm.minStock} onChange={e => setPartForm(f => ({ ...f, minStock: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo Unitário (R$)</Label><Input value={partForm.unitCost} onChange={e => setPartForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0,00" /></div>
              <div><Label>Fornecedor</Label><Input value={partForm.supplier} onChange={e => setPartForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nome" /></div>
            </div>
            <div><Label>Observações</Label><textarea value={partForm.notes} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" /></div>

            {editPartId && (
              <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 w-full" onClick={() => { if (confirm("Remover esta peça?")) { deletePartMutation.mutate({ id: editPartId }); setIsPartOpen(false); setEditPartId(null); resetPartForm(); } }}>
                <Trash2 className="h-4 w-4 mr-1" /> Remover Peça
              </Button>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPartOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createPartMutation.isPending || updatePartMutation.isPending}>
                {createPartMutation.isPending || updatePartMutation.isPending ? "Salvando..." : editPartId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ─── Sheet: Carrinho / Pedido de Compra ─── */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-emerald-800 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Pedido de Compra
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-8">
            <div><Label>Título do Pedido *</Label>
              <Input value={orderTitle} onChange={e => setOrderTitle(e.target.value)} placeholder="ex: Pedido 001 - Filtros e Correias" className="mt-1" />
            </div>

            {/* Itens por fornecedor */}
            {suppliers.map(supplier => (
              <div key={supplier} className="border rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-2 flex items-center justify-between">
                  <span className="font-semibold text-emerald-800 text-sm">{supplier}</span>
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="text-xs text-emerald-700 gap-1 h-7"
                    onClick={() => handleGeneratePDF(cart, orderTitle || "Lista de Compras", supplier)}
                  >
                    <Printer className="h-3.5 w-3.5" /> PDF deste fornecedor
                  </Button>
                </div>
                <div className="divide-y">
                  {cartBySupplier[supplier].map((item, globalIdx) => {
                    const idx = cart.findIndex(c => c.partId === item.partId && c.partName === item.partName);
                    return (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{item.partName}</p>
                          <p className="text-xs text-gray-400">{item.partCategory || "—"} · {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateCartQty(idx, item.quantity - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateCartQty(idx, item.quantity + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeFromCart(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma peça adicionada</p>
              </div>
            )}

            <div><Label>Observações</Label>
              <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="w-full min-h-[60px] mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Observações gerais do pedido..." />
            </div>

            {cart.length > 0 && (
              <Button type="button" variant="outline" className="w-full gap-2 border-emerald-600 text-emerald-700" onClick={() => handleGeneratePDF(cart, orderTitle || "Lista de Compras")}>
                <Printer className="h-4 w-4" /> Gerar PDF Completo
              </Button>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCartOpen(false)}>Cancelar</Button>
              <Button type="button" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createOrderMutation.isPending || cart.length === 0} onClick={handleSaveOrder}>
                {createOrderMutation.isPending ? "Salvando..." : "Salvar Pedido"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Componente de detalhe do pedido ─────────────────────────────────────────
function OrderDetail({ orderId, orderTitle, orderStatus, onStatusChange, onGeneratePDF }: {
  orderId: number;
  orderTitle: string;
  orderStatus: string;
  onStatusChange: (status: any) => void;
  onGeneratePDF: (items: CartItem[], title: string, supplier?: string) => void;
}) {
  const { data: order, isLoading } = trpc.purchaseOrders.getOrder.useQuery({ id: orderId });

  const suppliers = useMemo(() => {
    if (!order?.items) return [];
    const s = new Set(order.items.map((i: any) => i.supplier || "Sem fornecedor"));
    return Array.from(s) as string[];
  }, [order?.items]);

  if (isLoading) return <div className="p-4 text-center text-sm text-gray-400">Carregando...</div>;
  if (!order) return null;

  const items: CartItem[] = order.items.map((i: any) => ({
    partId: i.partId, partName: i.partName, partCode: i.partCode,
    partCategory: i.partCategory, supplier: i.supplier,
    unit: i.unit || "un", quantity: i.quantity, unitCost: i.unitCost,
  }));

  return (
    <div className="border-t px-4 pb-4 pt-3 space-y-3">
      {order.notes && <p className="text-sm text-gray-500 italic">{order.notes}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left py-2 text-xs text-gray-500">Peça</th>
            <th className="text-left py-2 text-xs text-gray-500 hidden sm:table-cell">Fornecedor</th>
            <th className="text-center py-2 text-xs text-gray-500">Qtd</th>
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2">
                  <p className="font-medium">{item.partName}</p>
                  <p className="text-xs text-gray-400">{item.partCategory || "—"}</p>
                </td>
                <td className="py-2 text-gray-500 hidden sm:table-cell">{item.supplier || "—"}</td>
                <td className="py-2 text-center font-bold text-emerald-700">{item.quantity} {item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ações de PDF por fornecedor */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs border-emerald-600 text-emerald-700" onClick={() => onGeneratePDF(items, orderTitle)}>
          <Printer className="h-3.5 w-3.5" /> PDF Completo
        </Button>
        {suppliers.map(s => (
          <Button key={s} size="sm" variant="ghost" className="gap-1.5 text-xs text-gray-600" onClick={() => onGeneratePDF(items, orderTitle, s)}>
            <FileText className="h-3.5 w-3.5" /> {s}
          </Button>
        ))}
      </div>

      {/* Ações de status */}
      <div className="flex flex-wrap gap-2 pt-1">
        {orderStatus === "rascunho" && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => onStatusChange("enviado")}>Marcar como Enviado</Button>
        )}
        {orderStatus === "enviado" && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => onStatusChange("aprovado")}>Aprovar</Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 text-xs" onClick={() => onStatusChange("rejeitado")}>Rejeitar</Button>
          </>
        )}
        {orderStatus === "aprovado" && (
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs" onClick={() => onStatusChange("comprado")}>Marcar como Comprado</Button>
        )}
      </div>
    </div>
  );
}

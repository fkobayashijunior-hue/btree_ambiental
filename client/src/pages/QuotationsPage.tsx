import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Tag, TrendingDown, Clock, Building2, ChevronDown, ChevronUp,
  Pencil, Trash2, Star, History, Settings, X
} from "lucide-react";

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function fmtPrice(price: string) {
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PRESET_COLORS = [
  '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#10B981',
  '#F97316', '#EC4899', '#6B7280', '#14B8A6', '#84CC16',
];

export default function QuotationsPage() {
  
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState('catalog');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProd, setExpandedProd] = useState<string | null>(null);

  // New quotation form
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [qSupplierId, setQSupplierId] = useState('');
  const [qCategoryId, setQCategoryId] = useState('');
  const [qProductName, setQProductName] = useState('');
  const [qUnit, setQUnit] = useState('un');
  const [qPrice, setQPrice] = useState('');
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qNotes, setQNotes] = useState('');

  // Category management
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');
  const [editCatId, setEditCatId] = useState<number | null>(null);

  const { data: grouped, isLoading } = trpc.quotations.listByCategory.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery({ activeOnly: true });
  const { data: categories } = trpc.purchaseCategories.list.useQuery();

  const createQuoteMutation = trpc.quotations.create.useMutation({
    onSuccess: () => {
      utils.quotations.listByCategory.invalidate();
      toast.success("Orçamento registrado!");
      resetQuoteForm();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteQuoteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => {
      utils.quotations.listByCategory.invalidate();
      toast.success("Orçamento excluído");
    },
  });

  const createCatMutation = trpc.purchaseCategories.create.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria criada!");
      resetCatForm();
    },
  });

  const updateCatMutation = trpc.purchaseCategories.update.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria atualizada!");
      resetCatForm();
    },
  });

  const deleteCatMutation = trpc.purchaseCategories.delete.useMutation({
    onSuccess: () => {
      utils.purchaseCategories.list.invalidate();
      utils.quotations.listByCategory.invalidate();
      toast.success("Categoria excluída");
    },
  });

  function resetQuoteForm() {
    setQSupplierId(''); setQCategoryId(''); setQProductName('');
    setQUnit('un'); setQPrice(''); setQNotes('');
    setQDate(new Date().toISOString().slice(0, 10));
    setShowQuoteForm(false);
  }

  function resetCatForm() {
    setCatName(''); setCatColor('#6B7280'); setEditCatId(null); setShowCatForm(false);
  }

  function handleSubmitQuote() {
    if (!qSupplierId || !qProductName || !qPrice) {
      toast.error("Preencha fornecedor, produto e preço");
      return;
    }
    createQuoteMutation.mutate({
      supplierId: parseInt(qSupplierId),
      categoryId: qCategoryId ? parseInt(qCategoryId) : undefined,
      productName: qProductName,
      unit: qUnit,
      price: qPrice,
      quotationDate: qDate + ' 00:00:00',
      notes: qNotes || undefined,
    });
  }

  function handleSubmitCat() {
    if (!catName.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    if (editCatId) {
      updateCatMutation.mutate({ id: editCatId, name: catName, color: catColor });
    } else {
      createCatMutation.mutate({ name: catName, color: catColor });
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-purple-600" />
            Orçamentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de preços por produto e fornecedor</p>
        </div>
        <Button onClick={() => setShowQuoteForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="catalog">Catálogo de Preços</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        {/* CATALOG TAB */}
        <TabsContent value="catalog" className="space-y-3 mt-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : !grouped || grouped.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum orçamento registrado</p>
              <Button variant="outline" className="mt-3" onClick={() => setShowQuoteForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Registrar primeiro orçamento
              </Button>
            </div>
          ) : (
            grouped.map(cat => {
              const catKey = cat.categoryId?.toString() ?? 'sem_categoria';
              const isExpanded = expandedCat === catKey;
              return (
                <Card key={catKey} className="overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedCat(isExpanded ? null : catKey)}
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                          <span className="font-semibold text-gray-900">{cat.categoryName}</span>
                          <Badge variant="outline" className="text-xs">{cat.products.length} produto(s)</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-3">
                      {cat.products.map(prod => {
                        const prodKey = `${catKey}-${prod.productName}`;
                        const isProdExpanded = expandedProd === prodKey;
                        const latestQuote = prod.quotes.reduce((latest, q) =>
                          q.quotationDate > latest.quotationDate ? q : latest, prod.quotes[0]);

                        return (
                          <div key={prod.productName} className="border rounded-lg overflow-hidden">
                            <button
                              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                              onClick={() => setExpandedProd(isProdExpanded ? null : prodKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-800">{prod.productName}</span>
                                  {prod.unit && <span className="text-xs text-gray-400 ml-1">/ {prod.unit}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="w-3 h-3 text-green-500" />
                                      <span className="text-sm font-bold text-green-700">{fmtPrice(prod.lowestPrice)}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">menor preço</div>
                                  </div>
                                  {isProdExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                              </div>
                            </button>

                            {isProdExpanded && (
                              <div className="divide-y">
                                {prod.quotes.map((q, idx) => {
                                  const isLowest = q.price === prod.lowestPrice;
                                  const isLatest = q.id === latestQuote?.id;
                                  return (
                                    <div key={q.id} className={`p-3 flex items-center justify-between ${isLowest ? 'bg-green-50' : ''}`}>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-3 h-3 text-gray-400" />
                                          <span className="text-sm font-medium text-gray-700">{q.supplierName}</span>
                                          {isLowest && (
                                            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                              <TrendingDown className="w-2 h-2 mr-1" /> Menor
                                            </Badge>
                                          )}
                                          {isLatest && (
                                            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                              <Clock className="w-2 h-2 mr-1" /> Último
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className={`text-sm font-bold ${isLowest ? 'text-green-700' : 'text-gray-700'}`}>
                                            {fmtPrice(q.price)}
                                          </span>
                                          <span className="text-xs text-gray-400">{fmt(q.quotationDate)}</span>
                                          {q.supplierPhone && (
                                            <a href={`tel:${q.supplierPhone}`} className="text-xs text-blue-500 hover:underline">
                                              {q.supplierPhone}
                                            </a>
                                          )}
                                          {q.supplierWhatsapp && (
                                            <a
                                              href={`https://wa.me/55${q.supplierWhatsapp.replace(/\D/g, '')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-green-500 hover:underline"
                                            >
                                              WhatsApp
                                            </a>
                                          )}
                                        </div>
                                        {q.notes && <p className="text-xs text-gray-400 mt-0.5">{q.notes}</p>}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteQuoteMutation.mutate({ id: q.id })}
                                        className="text-red-300 hover:text-red-500 p-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-3 mt-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Gerencie os tipos de produtos</p>
            <Button size="sm" onClick={() => { setCatName(''); setCatColor('#6B7280'); setEditCatId(null); setShowCatForm(true); }} className="bg-gray-700 hover:bg-gray-800">
              <Plus className="w-3 h-3 mr-1" /> Nova Categoria
            </Button>
          </div>
          <div className="space-y-2">
            {(categories || []).map(cat => (
              <Card key={cat.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCatName(cat.name); setCatColor(cat.color); setEditCatId(cat.id); setShowCatForm(true); }}
                      className="text-blue-400 hover:text-blue-600 p-1"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCatMutation.mutate({ id: cat.id })}
                      className="text-red-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Quotation Dialog */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-purple-600" />
              Registrar Orçamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={qSupplierId} onValueChange={setQSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={qCategoryId} onValueChange={setQCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {(categories || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Produto / Item *</Label>
              <Input value={qProductName} onChange={e => setQProductName(e.target.value)} placeholder="Ex: Óleo Motor 15W40" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preço (R$) *</Label>
                <Input value={qPrice} onChange={e => setQPrice(e.target.value)} placeholder="0,00" type="number" step="0.01" />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input value={qUnit} onChange={e => setQUnit(e.target.value)} placeholder="un, L, kg..." />
              </div>
            </div>

            <div>
              <Label>Data do orçamento</Label>
              <Input type="date" value={qDate} onChange={e => setQDate(e.target.value)} />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={qNotes} onChange={e => setQNotes(e.target.value)} placeholder="Condições, validade, frete..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetQuoteForm}>Cancelar</Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={createQuoteMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createQuoteMutation.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCatId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Óleos e Lubrificantes" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${catColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCatColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCatForm}>Cancelar</Button>
            <Button
              onClick={handleSubmitCat}
              disabled={createCatMutation.isPending || updateCatMutation.isPending}
            >
              {(createCatMutation.isPending || updateCatMutation.isPending) ? 'Salvando...' : editCatId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

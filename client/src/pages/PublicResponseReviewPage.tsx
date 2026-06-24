import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2, Phone, Globe, Instagram, Package, Plus, X,
  CheckCircle, AlertCircle, Edit2, Send, ChevronDown, ChevronUp, Clock
} from "lucide-react";

const COMPANY = {
  name: 'BTREE Ambiental',
  commercial: 'Fábio Jundy Kobayashi',
  phone: '(44) 98833-4679',
  whatsapp: '5544988334679',
  instagram: '@btree_ambiental',
  site: 'btreeambiental.com',
  logoUrl: 'https://storage.manus.space/webdev-static-assets/logo-btree-final_5d1c1c12.png',
};

type ResponseItem = {
  name: string;
  quantity: string;
  unit: string;
  price: string;
  brand: string;
  notes: string;
};

export default function PublicResponseReviewPage() {
  const { responseToken } = useParams<{ responseToken: string }>();

  const { data, isLoading } = trpc.quotationRequests.getByResponseToken.useQuery(
    { responseToken: responseToken || '' },
    { enabled: !!responseToken }
  );

  const [supplierName, setSupplierName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [responseItems, setResponseItems] = useState<ResponseItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showItems, setShowItems] = useState(true);

  // Inicializar formulário com dados existentes
  if (data?.found && data.response && !initialized) {
    setSupplierName(data.response.supplierName || '');
    setCnpj(data.response.cnpj || '');
    setAddress(data.response.address || '');
    setSellerName(data.response.sellerName || '');
    setSellerPhone(data.response.sellerPhone || '');
    setSellerEmail(data.response.sellerEmail || '');
    setNotes(data.response.notes || '');
    setResponseItems(data.response.items.map((item: any) => ({
      name: item.name || '',
      quantity: item.quantity || '1',
      unit: item.unit || 'un',
      price: item.price || '',
      brand: item.brand || '',
      notes: item.notes || '',
    })));
    setInitialized(true);
  }

  const updateMutation = trpc.quotationRequests.updateResponseByToken.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Orçamento atualizado com sucesso!");
    },
    onError: (err) => toast.error("Erro ao atualizar: " + err.message),
  });

  function addExtraItem() {
    setResponseItems([...responseItems, { name: '', quantity: '1', unit: 'un', price: '', brand: '', notes: '' }]);
  }

  function removeItem(idx: number) {
    setResponseItems(responseItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ResponseItem, value: string) {
    setResponseItems(responseItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function handleSave() {
    if (!supplierName.trim()) { toast.error("Informe o nome da empresa"); return; }
    const validItems = responseItems.filter(i => i.name.trim() && i.price.trim());
    if (validItems.length === 0) { toast.error("Informe o preço de pelo menos um item"); return; }

    updateMutation.mutate({
      responseToken: responseToken || '',
      supplierName,
      cnpj: cnpj || undefined,
      address: address || undefined,
      sellerName: sellerName || undefined,
      sellerPhone: sellerPhone || undefined,
      sellerEmail: sellerEmail || undefined,
      items: validItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        price: i.price,
        brand: i.brand || undefined,
        notes: i.notes || undefined,
      })),
      notes: notes || undefined,
    });
  }

  // ===== LOADING =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  // ===== NÃO ENCONTRADO =====
  if (!data || !data.found) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-gray-500 mb-4">Este link de revisão não existe ou expirou.</p>
          <p className="text-sm text-gray-400">Entre em contato com a BTREE Ambiental para obter um novo link.</p>
          <div className="mt-4 text-sm">
            <a href={`tel:${COMPANY.phone}`} className="text-green-600 hover:underline font-medium">{COMPANY.phone}</a>
          </div>
        </div>
      </div>
    );
  }

  // ===== CANCELADO =====
  if (data.isCancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Solicitação Cancelada</h2>
          <p className="text-gray-500">Esta solicitação de orçamento foi cancelada e não pode mais ser revisada.</p>
        </div>
      </div>
    );
  }

  const request = data.request!;
  const originalItemCount = request.items.length;

  // ===== SALVO COM SUCESSO =====
  if (saved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <img src={COMPANY.logoUrl} alt="BTREE Ambiental" className="h-14 mx-auto mb-3" />
          </div>
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Orçamento Atualizado!</h2>
              <p className="text-gray-500 mb-2">
                Obrigado, <strong>{supplierName}</strong>!
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Suas correções foram salvas. Nossa equipe já foi notificada.
              </p>
              <Button
                variant="outline"
                className="w-full mb-3"
                onClick={() => setSaved(false)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Fazer mais alterações
              </Button>
              <div className="bg-green-50 rounded-lg p-4 text-sm text-green-700">
                <p className="font-medium">📞 Contato Comercial</p>
                <p className="mt-1">{COMPANY.commercial}</p>
                <a href={`tel:${COMPANY.phone}`} className="font-bold text-green-800">{COMPANY.phone}</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d4f2e 0%, #1a6b3c 60%, #1a8a4a 100%)' }} className="text-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 shadow-md">
              <img src={COMPANY.logoUrl} alt="BTREE Ambiental" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{COMPANY.name}</h1>
              <p className="text-green-200 text-xs mt-0.5">Revisão de Orçamento</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-green-100">
              <Phone className="w-3.5 h-3.5 text-green-300" />
              <a href={`tel:${COMPANY.phone}`} className="font-semibold text-white hover:text-green-200">{COMPANY.phone}</a>
              <span className="text-green-300 text-xs">· {COMPANY.commercial}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Banner de revisão */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <Edit2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 font-medium">Você está revisando seu orçamento enviado</p>
            <p className="text-xs text-amber-600 mt-0.5">Corrija os valores ou informações necessárias e clique em "Salvar Alterações"</p>
          </div>
        </div>

        {/* Solicitação original */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Solicitação Original</p>
                <h2 className="text-lg font-bold text-green-900">{request.title}</h2>
                {request.requesterName && (
                  <p className="text-sm text-green-700 mt-1">Solicitado por: <strong>{request.requesterName}</strong></p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens solicitados (colapsável) */}
        <Card>
          <button className="w-full text-left" onClick={() => setShowItems(!showItems)}>
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  Itens Solicitados ({request.items.length})
                </CardTitle>
                {showItems ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </CardHeader>
          </button>
          {showItems && (
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {request.items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
                    <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span className="font-medium text-gray-800 flex-1">{item.name}</span>
                    <span className="text-gray-500 text-xs">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Dados da empresa */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              Dados da Sua Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Razão Social ou Nome Fantasia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CNPJ / CPF</Label>
                <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <Label>Cidade / Estado</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex: Maringá - PR" />
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Contato do Vendedor</p>
              <div className="space-y-2">
                <Input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Nome do vendedor responsável" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="Telefone / WhatsApp" type="tel" />
                  <Input value={sellerEmail} onChange={e => setSellerEmail(e.target.value)} placeholder="E-mail" type="email" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preços */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preços dos Itens</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addExtraItem}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {responseItems.map((item, idx) => {
              const isOriginal = idx < originalItemCount;
              return (
                <div key={idx} className={`border rounded-lg p-3 space-y-2 ${isOriginal ? 'border-green-200 bg-green-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {isOriginal ? `Item ${idx + 1}` : `Item extra ${idx - originalItemCount + 1}`}
                    </span>
                    {!isOriginal && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 h-auto">
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Nome do produto" />
                    </div>
                    <div>
                      <Input value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} placeholder="Preço unitário (R$)" type="number" step="0.01" />
                    </div>
                    <div>
                      <Input value={item.brand} onChange={e => updateItem(idx, 'brand', e.target.value)} placeholder="Marca (opcional)" />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.notes} onChange={e => updateItem(idx, 'notes', e.target.value)} placeholder="Observações" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Observações gerais */}
        <Card>
          <CardContent className="p-4">
            <Label>Observações Gerais</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega, validade do orçamento..."
              rows={3}
              className="mt-1"
            />
          </CardContent>
        </Card>

        {/* Botão salvar */}
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base font-semibold"
        >
          {updateMutation.isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Salvar Alterações
            </span>
          )}
        </Button>

        {/* Rodapé */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>BTREE Ambiental · <a href={`https://${COMPANY.site}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{COMPANY.site}</a></p>
        </div>
      </div>
    </div>
  );
}

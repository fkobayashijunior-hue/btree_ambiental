import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, DollarSign, CheckCircle2, AlertCircle, Users, Package,
  ChevronDown, ChevronUp, Phone, Mail, CreditCard, Loader2, X, PlusCircle, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "@/lib/formatBR";

export default function FinancialDashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedBuyer, setExpandedBuyer] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<number | null>(null); // buyerId
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'pix',
    invoiceNumber: '',
    notes: '',
  });

  const { data, isLoading, refetch } = trpc.buyerClients.financialDashboard.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: paymentsData, refetch: refetchPayments } = trpc.buyerClients.getPayments.useQuery(
    { buyerId: expandedBuyer! },
    { enabled: expandedBuyer !== null }
  );

  const addPaymentMut = trpc.buyerClients.addPayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!');
      setShowPaymentModal(null);
      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'pix', invoiceNumber: '', notes: '' });
      refetch();
      refetchPayments();
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePaymentMut = trpc.buyerClients.deletePayment.useMutation({
    onSuccess: () => {
      toast.success('Pagamento removido!');
      refetch();
      refetchPayments();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleRegisterPayment() {
    if (!paymentForm.amount || !paymentForm.paymentDate || !showPaymentModal) {
      toast.error('Preencha o valor e a data do pagamento');
      return;
    }
    // Buscar nome do comprador para a entrada financeira
    const buyerName = buyers.find((b: any) => b.id === showPaymentModal)?.name || 'Comprador';
    const dateObj = new Date(paymentForm.paymentDate + 'T12:00:00');
    const periodDescription = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    addPaymentMut.mutate({
      buyerId: showPaymentModal,
      amount: paymentForm.amount,
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod || undefined,
      invoiceNumber: paymentForm.invoiceNumber || undefined,
      notes: paymentForm.notes || undefined,
      status: 'pago',
      // Cria entrada no módulo financeiro automaticamente
      createFinancialEntry: true,
      destinationName: buyerName,
      periodDescription,
    });
  }

  const buyers = data?.buyers ?? [];
  const totals = data?.totals;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-green-700" />
        <h1 className="text-xl font-bold text-green-800">Dashboard Financeiro — Compradores</h1>
      </div>

      {/* Date filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals summary */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 mx-auto text-green-700 mb-1" />
              <div className="text-2xl font-bold text-green-800">R$ {formatBR(totals.grandTotalReceivable)}</div>
              <div className="text-sm text-green-600">Total a Receber</div>
            </CardContent>
          </Card>
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto text-blue-700 mb-1" />
              <div className="text-2xl font-bold text-blue-800">R$ {formatBR(totals.grandTotalPaid)}</div>
              <div className="text-sm text-blue-600">Total Recebido</div>
            </CardContent>
          </Card>
          <Card className={`border-2 ${totals.grandBalance > 0 ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
            <CardContent className="p-4 text-center">
              <AlertCircle className={`h-6 w-6 mx-auto mb-1 ${totals.grandBalance > 0 ? 'text-amber-700' : 'text-green-700'}`} />
              <div className={`text-2xl font-bold ${totals.grandBalance > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                R$ {formatBR(totals.grandBalance)}
              </div>
              <div className={`text-sm ${totals.grandBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {totals.grandBalance > 0 ? 'Saldo Pendente' : 'Saldo Quitado'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Buyers list */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      ) : buyers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum comprador ativo cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {buyers.map((buyer: any) => {
            const isExpanded = expandedBuyer === buyer.id;
            const balanceColor = buyer.balance > 0 ? 'text-amber-700' : 'text-green-700';
            const balanceBg = buyer.balance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';

            return (
              <Card key={buyer.id} className={`border-2 ${buyer.balance > 0 ? 'border-amber-200' : 'border-green-200'}`}>
                <CardContent className="p-4">
                  {/* Buyer header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900">{buyer.name}</h3>
                        {buyer.city && (
                          <span className="text-xs text-muted-foreground">{buyer.city}/{buyer.state}</span>
                        )}
                        <Badge className={`text-xs ${buyer.balance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {buyer.balance > 0 ? 'Pendente' : 'Quitado'}
                        </Badge>
                      </div>
                      {buyer.pricePerUnit && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          R$ {formatBR(parseFloat(String(buyer.pricePerUnit).replace(',', '.')))} / {buyer.unit} · {buyer.totalLoads} cargas
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Saldo</div>
                      <div className={`text-lg font-bold ${balanceColor}`}>
                        R$ {formatBR(buyer.balance)}
                      </div>
                    </div>
                  </div>

                  {/* Financial summary row */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">A Receber</div>
                      <div className="font-bold text-sm text-green-700">R$ {formatBR(buyer.totalReceivable)}</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Recebido</div>
                      <div className="font-bold text-sm text-blue-700">R$ {formatBR(buyer.totalPaid)}</div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${balanceBg}`}>
                      <div className="text-xs text-muted-foreground">Pendente</div>
                      <div className={`font-bold text-sm ${balanceColor}`}>R$ {formatBR(buyer.balance)}</div>
                    </div>
                  </div>

                  {/* Quantity info */}
                  {buyer.totalLoads > 0 && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span><Package className="h-3 w-3 inline mr-1" />{buyer.totalLoads} cargas</span>
                      {buyer.unit === 'ton' && buyer.totalWeightKg > 0 && (
                        <span>{formatBR(buyer.totalWeightKg / 1000, 3)} ton</span>
                      )}
                      {buyer.unit === 'm3' && buyer.totalVolumeM3 > 0 && (
                        <span>{formatBR(buyer.totalVolumeM3, 3)} m³</span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      className="gap-1 text-xs bg-green-700 hover:bg-green-800 text-white"
                      onClick={() => {
                        setShowPaymentModal(buyer.id);
                        setPaymentForm(f => ({ ...f, amount: buyer.balance > 0 ? String(buyer.balance.toFixed(2)) : '' }));
                      }}
                    >
                      <CreditCard className="h-3 w-3" />
                      Registrar Pagamento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        setExpandedBuyer(isExpanded ? null : buyer.id);
                      }}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Ocultar' : 'Ver Pagamentos'}
                      {buyer.paymentCount > 0 && (
                        <Badge className="ml-1 text-xs bg-blue-100 text-blue-800">{buyer.paymentCount}</Badge>
                      )}
                    </Button>
                    {buyer.phone && (
                      <a href={`https://wa.me/55${buyer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-green-700">
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>

                  {/* Payment history (expanded) */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Histórico de Pagamentos</h4>
                      {!paymentsData || paymentsData.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum pagamento registrado.</p>
                      ) : (
                        <div className="space-y-2">
                          {paymentsData.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                              <div>
                                <span className="font-semibold text-green-700">R$ {formatBR(parseFloat(String(p.amount).replace(',', '.')))}</span>
                                <span className="text-muted-foreground ml-2">{p.paymentDate}</span>
                                {p.paymentMethod && <span className="text-muted-foreground ml-2">· {p.paymentMethod}</span>}
                                {p.invoiceNumber && <span className="text-muted-foreground ml-2">· {p.invoiceNumber}</span>}
                                {p.notes && <div className="text-muted-foreground mt-0.5 italic">{p.notes}</div>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${p.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {p.status === 'pago' ? 'Pago' : p.status}
                                </Badge>
                                <button
                                  onClick={() => {
                                    if (confirm('Remover este pagamento?')) {
                                      deletePaymentMut.mutate({ id: p.id });
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Registration Modal */}
      {showPaymentModal !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-700" />
                <h3 className="font-semibold text-lg">Registrar Pagamento</h3>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            {(() => {
              const buyer = buyers.find((b: any) => b.id === showPaymentModal);
              return buyer ? (
                <div className="text-sm text-muted-foreground mb-4">
                  Comprador: <strong className="text-green-800">{buyer.name}</strong>
                  {buyer.balance > 0 && (
                    <div className="mt-1">Saldo pendente: <strong className="text-amber-700">R$ {formatBR(buyer.balance)}</strong></div>
                  )}
                </div>
              ) : null;
            })()}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Valor Recebido (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data do Pagamento *</label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Método de Pagamento</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="boleto">Boleto</option>
                  <option value="cheque">Cheque</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nº da Nota Fiscal / Referência</label>
                <Input
                  placeholder="Ex: NF-001234"
                  value={paymentForm.invoiceNumber}
                  onChange={e => setPaymentForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Observações</label>
                <Input
                  placeholder="Observações sobre o pagamento..."
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                onClick={handleRegisterPayment}
                disabled={addPaymentMut.isPending}
              >
                {addPaymentMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {addPaymentMut.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, FileText, Globe, Truck, Upload } from "lucide-react";

const COMPANY = {
  name: 'BTREE Ambiental',
  site: 'btreeambiental.com',
  logoUrl: '/icon-btree-512.png',
};

export default function PublicCargoNFUpload() {
  const { token } = useParams<{ token: string }>();

  const { data: cargo, isLoading, error, refetch } = trpc.cargoLoads.getByNfUploadToken.useQuery(
    { token: token || '' },
    { enabled: !!token, retry: false }
  );

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [noteQuantity, setNoteQuantity] = useState('');
  const [noteUnit, setNoteUnit] = useState<'' | 'm3' | 'ton'>('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const uploadMutation = trpc.cargoLoads.uploadNfByToken.useMutation({
    onSuccess: (result) => {
      if (result?.autoExtracted?.invoiceNumber || result?.autoExtracted?.noteQuantity) {
        toast.info("Número da NF e/ou quantidade preenchidos automaticamente a partir do arquivo enviado.");
      }
      setSubmitted(true);
      refetch();
    },
    onError: (err) => toast.error("Erro ao enviar: " + err.message),
  });

  async function handleSubmit() {
    let invoiceFileBase64: string | undefined;
    let invoiceFileName: string | undefined;
    let invoiceFileMimeType: string | undefined;
    if (invoiceFile) {
      try {
        invoiceFileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(invoiceFile);
        });
        invoiceFileName = invoiceFile.name;
        invoiceFileMimeType = invoiceFile.type || 'application/pdf';
      } catch {
        toast.error('Erro ao processar arquivo da NF');
        return;
      }
    }
    uploadMutation.mutate({
      token: token || '',
      invoiceNumber: invoiceNumber || undefined,
      noteQuantity: noteQuantity || undefined,
      noteUnit: noteUnit || undefined,
      invoiceFileBase64,
      invoiceFileName,
      invoiceFileMimeType,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Carregando carga...</p>
        </div>
      </div>
    );
  }

  if (error || !cargo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-gray-500 mb-6">Este link não existe, já foi usado ou expirou.</p>
          <a href="https://btreeambiental.com" className="inline-flex items-center gap-2 text-green-600 hover:underline font-medium">
            <Globe className="w-4 h-4" /> Conheça a BTREE Ambiental
          </a>
        </div>
      </div>
    );
  }

  const pesoOuVolume = (cargo as any).pesoOuVolume || `${cargo.volumeM3 || '0'} m³`;

  if (submitted || cargo.invoiceUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src={COMPANY.logoUrl} alt="BTREE Ambiental" className="h-14 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-green-800">{COMPANY.name}</h1>
          </div>
          <Card className="text-center">
            <CardContent className="p-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Nota Fiscal Recebida!</h2>
              <p className="text-gray-500 mb-2">Carga #{cargo.id} — {cargo.vehiclePlate}</p>
              {cargo.invoiceUrl && (
                <a href={cargo.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                  Ver nota anexada
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(135deg, #0d4f2e 0%, #1a6b3c 60%, #1a8a4a 100%)' }} className="text-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 shadow-md">
              <img src={COMPANY.logoUrl} alt="BTREE Ambiental" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{COMPANY.name}</h1>
              <p className="text-green-200 text-xs mt-0.5">Emissão de Nota Fiscal — Controle de Cargas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Carga #{cargo.id}</p>
                <p className="text-sm text-green-900"><strong>Placa:</strong> {cargo.vehiclePlate || 'N/I'}</p>
                <p className="text-sm text-green-900"><strong>Peso/Volume:</strong> {pesoOuVolume}</p>
                <p className="text-sm text-green-900"><strong>Destino:</strong> {cargo.destination || 'N/I'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              Dados da Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <Label>Número da NF (opcional)</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="ex: 402" />
            </div>
            <div>
              <Label>Quantidade da Nota (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={noteQuantity}
                  onChange={e => setNoteQuantity(e.target.value)}
                  placeholder="ex: 35"
                  className="flex-1"
                />
                <select
                  value={noteUnit}
                  onChange={e => setNoteUnit(e.target.value as "" | "m3" | "ton")}
                  className="w-24 h-10 px-2 rounded-md border border-input bg-background text-sm"
                  title="Unidade da nota"
                >
                  <option value="">Auto</option>
                  <option value="m3">m³</option>
                  <option value="ton">ton</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Upload da NF (XML, PDF ou imagem, opcional)</Label>
              <div
                className="mt-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById('invoice-file-input')?.click()}
              >
                {invoiceFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {invoiceFile.name}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Clique para selecionar o arquivo da nota
                  </div>
                )}
              </div>
              <input
                id="invoice-file-input"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xml"
                onChange={e => setInvoiceFile(e.target.files?.[0] || null)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Número, quantidade e unidade são preenchidos automaticamente a partir do XML ou do PDF da NFe (quando tiver texto selecionável).</p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={uploadMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold"
        >
          {uploadMutation.isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Enviar Nota Fiscal
            </span>
          )}
        </Button>

        <div className="text-center text-xs text-gray-400 pb-4">
          <p>Este link é exclusivo para esta carga e não deve ser compartilhado.</p>
        </div>
      </div>
    </div>
  );
}

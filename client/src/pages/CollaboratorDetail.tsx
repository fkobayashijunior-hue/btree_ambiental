import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Upload, Trash2, Eye, Download,
  User, Phone, MapPin, Calendar, Briefcase, Award,
  Car, Shield, Plus, Loader2, FileImage, FileBadge, Camera, CheckCircle, RefreshCw, Fingerprint
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const DOC_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cnh: { label: "CNH", icon: <Car className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  certificado: { label: "Certificado", icon: <Award className="h-4 w-4" />, color: "bg-emerald-100 text-emerald-800" },
  aso: { label: "ASO", icon: <Shield className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  contrato: { label: "Contrato", icon: <FileText className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
  rg: { label: "RG", icon: <User className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" },
  cpf: { label: "CPF", icon: <User className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" },
  outros: { label: "Outros", icon: <FileImage className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
};

const DOC_TYPES = ["cnh", "certificado", "aso", "contrato", "rg", "cpf", "outros"] as const;

type Tab = "dados" | "documentos" | "biometria";

// Carrega o face-api.js de forma segura
let faceApiLoadPromise: Promise<void> | null = null;
function loadFaceApiScript(): Promise<void> {
  if (faceApiLoadPromise) return faceApiLoadPromise;
  faceApiLoadPromise = new Promise((resolve, reject) => {
    if ((window as any).faceapi) { resolve(); return; }
    const existing = document.querySelector('script[data-faceapi]');
    if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', reject); return; }
    const script = document.createElement("script");
    script.setAttribute('data-faceapi', 'true');
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return faceApiLoadPromise;
}

export default function CollaboratorDetail() {
  const params = useParams<{ id: string }>();
  const collaboratorId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("dados");

  // --- Documentos ---
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]>("cnh");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<string | null>(null);
  const [docFileType, setDocFileType] = useState<string>("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; type: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Biometria ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bioStream, setBioStream] = useState<MediaStream | null>(null);
  const [bioCameraActive, setBioCameraActive] = useState(false);
  const [bioCapturing, setBioCapturing] = useState(false);
  const [bioFaceApiLoaded, setBioFaceApiLoaded] = useState(false);
  const [bioLoadingModels, setBioLoadingModels] = useState(false);
  const [bioCaptured, setBioCaptured] = useState<{ photo: string; descriptor: string } | null>(null);

  // Buscar dados do colaborador
  const { data: collabData, isLoading: loadingCollab, refetch: refetchCollab } = trpc.collaborators.getById.useQuery(
    { id: collaboratorId },
    { enabled: collaboratorId > 0 }
  );

  // Buscar documentos
  const { data: documents = [], refetch: refetchDocs } = trpc.collaboratorDocuments.list.useQuery(
    { collaboratorId },
    { enabled: collaboratorId > 0 }
  );

  const addDocMutation = trpc.collaboratorDocuments.add.useMutation({
    onSuccess: () => {
      toast.success("Documento adicionado com sucesso!");
      refetchDocs();
      setShowAddDoc(false);
      resetDocForm();
    },
    onError: (e) => toast.error(e.message || "Erro ao adicionar documento"),
  });

  const removeDocMutation = trpc.collaboratorDocuments.remove.useMutation({
    onSuccess: () => { toast.success("Documento removido"); refetchDocs(); },
    onError: (e) => toast.error(e.message || "Erro ao remover documento"),
  });

  const saveFaceDescriptorMutation = trpc.collaborators.saveFaceDescriptor.useMutation({
    onSuccess: () => {
      toast.success("Biometria facial cadastrada com sucesso!");
      refetchCollab();
      setBioCaptured(null);
      stopBioCamera();
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar biometria"),
  });

  const resetDocForm = () => {
    setDocType("cnh"); setDocTitle(""); setDocFile(null);
    setDocFileType(""); setDocIssueDate(""); setDocExpiryDate(""); setDocNotes("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 10MB."); return; }
    setDocFileType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => setDocFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddDoc = () => {
    if (!docTitle.trim()) { toast.error("Informe o título do documento"); return; }
    if (!docFile) { toast.error("Selecione um arquivo"); return; }
    addDocMutation.mutate({
      collaboratorId, type: docType, title: docTitle,
      fileBase64: docFile, fileType: docFileType,
      issueDate: docIssueDate || undefined,
      expiryDate: docExpiryDate || undefined,
      notes: docNotes || undefined,
    });
  };

  // --- Biometria: carregar face-api ---
  useEffect(() => {
    if (activeTab !== "biometria") return;
    if (bioFaceApiLoaded) return;
    setBioLoadingModels(true);
    loadFaceApiScript().then(async () => {
      const faceapi = (window as any).faceapi;
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setBioFaceApiLoaded(true);
    }).catch(() => {
      toast.error("Erro ao carregar IA de reconhecimento");
    }).finally(() => setBioLoadingModels(false));
  }, [activeTab]);

  const startBioCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setBioStream(mediaStream);
      setBioCameraActive(true);
    } catch {
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const stopBioCamera = () => {
    bioStream?.getTracks().forEach(t => t.stop());
    setBioStream(null);
    setBioCameraActive(false);
  };

  const captureBiometric = async () => {
    if (!videoRef.current || !canvasRef.current || !bioFaceApiLoaded) return;
    const faceapi = (window as any).faceapi;
    setBioCapturing(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warning("Nenhum rosto detectado. Posicione o rosto na frente da câmera.");
        setBioCapturing(false);
        return;
      }

      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const photo = canvas.toDataURL("image/jpeg", 0.8);
      const descriptor = JSON.stringify(Array.from(detection.descriptor));

      setBioCaptured({ photo, descriptor });
      toast.success("Rosto capturado! Confirme para salvar.");
    } catch (e) {
      toast.error("Erro ao capturar rosto");
    }
    setBioCapturing(false);
  };

  const saveBiometric = () => {
    if (!bioCaptured) return;
    saveFaceDescriptorMutation.mutate({
      id: collaboratorId,
      faceDescriptor: bioCaptured.descriptor,
      photoBase64: bioCaptured.photo,
    });
  };

  // Gerar PDF
  const handleGeneratePdf = () => {
    const collab = collabData;
    if (!collab) return;
    const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
    const docList = documents.map(d => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${DOC_TYPE_LABELS[d.type]?.label || d.type}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${d.title}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${d.issueDate ? new Date(d.issueDate).toLocaleDateString("pt-BR") : "-"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${d.expiryDate ? new Date(d.expiryDate).toLocaleDateString("pt-BR") : "-"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha — ${collab.name}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:0}.header{background:linear-gradient(135deg,#0d4f2e,#1a7a4a);color:white;padding:20px 30px;display:flex;align-items:center;gap:20px}.header img{height:60px;filter:brightness(0) invert(1)}.header-text h1{margin:0;font-size:20px}.header-text p{margin:4px 0 0;opacity:.8;font-size:12px}.content{padding:24px 30px}.section{margin-bottom:24px}.section-title{font-size:14px;font-weight:bold;color:#0d4f2e;border-bottom:2px solid #0d4f2e;padding-bottom:4px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{margin-bottom:8px}.field label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:2px}.photo{width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #0d4f2e;float:right;margin-left:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f3f4f6;padding:8px;text-align:left;font-size:11px;color:#374151;text-transform:uppercase}.footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:12px 30px;text-align:center;font-size:11px;color:#9ca3af}.footer strong{color:#0d4f2e}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head>
<body><div class="header"><img src="${logoUrl}" alt="BTREE"/><div class="header-text"><h1>Ficha do Colaborador</h1><p>BTREE Empreendimentos LTDA · btreeambiental.com</p></div></div>
<div class="content">${collab.photoUrl ? `<img src="${collab.photoUrl}" class="photo" alt="Foto"/>` : ""}
<div class="section"><div class="section-title">Dados Pessoais</div><div class="grid">
<div class="field"><label>Nome</label>${collab.name}</div>
<div class="field"><label>CPF</label>${collab.cpf || "-"}</div>
<div class="field"><label>Telefone</label>${collab.phone || "-"}</div>
<div class="field"><label>E-mail</label>${collab.email || "-"}</div>
</div></div>
<div class="section"><div class="section-title">Dados Profissionais</div><div class="grid">
<div class="field"><label>Cargo</label>${collab.role || "-"}</div>
<div class="field"><label>Tipo</label>${collab.employmentType || "-"}</div>
<div class="field"><label>Diária</label>${collab.dailyRate ? `R$ ${collab.dailyRate}` : "-"}</div>
<div class="field"><label>PIX</label>${collab.pixKey || "-"}</div>
</div></div>
<div class="section"><div class="section-title">Documentos</div>
${documents.length > 0 ? `<table><thead><tr><th>Tipo</th><th>Título</th><th>Emissão</th><th>Validade</th></tr></thead><tbody>${docList}</tbody></table>` : "<p style='color:#9ca3af;font-size:12px;'>Nenhum documento cadastrado.</p>"}
</div></div>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} · <strong>BTREE Empreendimentos LTDA</strong></div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Permita pop-ups para gerar o PDF"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  if (loadingCollab) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!collabData) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">
          Colaborador não encontrado.
          <Button variant="link" onClick={() => setLocation("/colaboradores")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const collab = collabData;
  const hasBiometric = !!(collab as any).faceDescriptor;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/colaboradores")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{collab.name}</h1>
              <p className="text-sm text-muted-foreground">{collab.role || "Colaborador"}</p>
            </div>
          </div>
          <Button onClick={handleGeneratePdf} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Download className="h-4 w-4" /> Gerar PDF
          </Button>
        </div>

        {/* Foto e status */}
        <div className="flex items-center gap-4 p-4 bg-card border rounded-xl">
          {collab.photoUrl ? (
            <img src={collab.photoUrl} alt={collab.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-primary">
              <User className="h-10 w-10 text-emerald-600" />
            </div>
          )}
          <div>
            <p className="font-semibold text-lg">{collab.name}</p>
            <p className="text-muted-foreground text-sm">{collab.role || "—"}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge className={collab.active === 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}>
                {collab.active === 1 ? "Ativo" : "Inativo"}
              </Badge>
              {hasBiometric && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Fingerprint className="h-3 w-3 mr-1" /> Biometria ✓
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {(["dados", "documentos", "biometria"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "dados" ? "Dados Pessoais" : tab === "documentos" ? `Documentos (${documents.length})` : "Biometria Facial"}
            </button>
          ))}
        </div>

        {/* Tab: Dados */}
        {activeTab === "dados" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "CPF", value: collab.cpf, icon: <User className="h-4 w-4" /> },
                  { label: "RG", value: collab.rg, icon: <User className="h-4 w-4" /> },
                  { label: "CEP", value: collab.zipCode, icon: <MapPin className="h-4 w-4" /> },
                  { label: "Telefone", value: collab.phone, icon: <Phone className="h-4 w-4" /> },
                  { label: "E-mail", value: collab.email, icon: <FileText className="h-4 w-4" /> },
                  { label: "Endereço", value: [collab.address, collab.city, collab.state].filter(Boolean).join(", "), icon: <MapPin className="h-4 w-4" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value || "—"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Cargo / Função", value: collab.role, icon: <Briefcase className="h-4 w-4" /> },
                  { label: "Cadastrado em", value: collab.createdAt ? new Date(collab.createdAt).toLocaleDateString("pt-BR") : null, icon: <Calendar className="h-4 w-4" /> },
                  { label: "Diária", value: collab.dailyRate ? `R$ ${collab.dailyRate}` : null, icon: <FileText className="h-4 w-4" /> },
                  { label: "Tipo de Emprego", value: collab.employmentType, icon: <FileText className="h-4 w-4" /> },
                  { label: "Chave PIX", value: collab.pixKey, icon: <FileText className="h-4 w-4" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value || "—"}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Documentos */}
        {activeTab === "documentos" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{documents.length} documento(s) cadastrado(s)</p>
              <Button onClick={() => setShowAddDoc(true)} className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white">
                <Plus className="h-4 w-4" /> Adicionar Documento
              </Button>
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
                <FileBadge className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum documento cadastrado</p>
                <p className="text-sm mt-1">Adicione CNH, certificados, ASO e outros documentos</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {documents.map(doc => {
                  const info = DOC_TYPE_LABELS[doc.type] || DOC_TYPE_LABELS.outros;
                  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                  const expiresSoon = doc.expiryDate && !isExpired &&
                    new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={doc.id} className="border rounded-xl p-4 flex items-start gap-3 bg-card hover:shadow-sm transition-shadow">
                      <div className={`p-2 rounded-lg ${info.color} flex-shrink-0`}>{info.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{info.label}</p>
                        {doc.issueDate && <p className="text-xs text-muted-foreground mt-1">Emissão: {new Date(doc.issueDate).toLocaleDateString("pt-BR")}</p>}
                        {doc.expiryDate && (
                          <p className={`text-xs mt-0.5 font-medium ${isExpired ? "text-red-600" : expiresSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                            Validade: {new Date(doc.expiryDate).toLocaleDateString("pt-BR")}
                            {isExpired && " ⚠ Vencido"}{expiresSoon && " ⚠ Vence em breve"}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewDoc({ url: doc.fileUrl, type: doc.fileType || "", title: doc.title })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover este documento?")) removeDocMutation.mutate({ id: doc.id }); }} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Biometria */}
        {activeTab === "biometria" && (
          <div className="space-y-4">
            <Card className="border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" /> Biometria Facial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status atual */}
                <div className={`flex items-center gap-3 p-3 rounded-lg ${hasBiometric ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
                  {hasBiometric ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-emerald-800 text-sm">Biometria cadastrada</p>
                        <p className="text-xs text-emerald-600">Este colaborador pode usar o reconhecimento facial para registro de presença.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800 text-sm">Biometria não cadastrada</p>
                        <p className="text-xs text-amber-600">Capture o rosto do colaborador para habilitar o reconhecimento facial.</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Instruções */}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Como cadastrar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Clique em "Ativar Câmera"</li>
                    <li>Posicione o rosto do colaborador centralizado na câmera</li>
                    <li>Clique em "Capturar Rosto"</li>
                    <li>Confirme se o rosto foi capturado corretamente</li>
                    <li>Clique em "Salvar Biometria"</li>
                  </ol>
                </div>

                {/* Câmera */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${bioCameraActive ? "block" : "hidden"}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!bioCameraActive && (
                    <div className="text-center text-gray-400 p-4">
                      {bioLoadingModels ? (
                        <>
                          <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-40 animate-spin" />
                          <p className="text-sm">Carregando IA...</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-16 w-16 mx-auto mb-3 opacity-40" />
                          <p className="text-sm">Câmera desativada</p>
                        </>
                      )}
                    </div>
                  )}

                  {bioCaptured && (
                    <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center">
                      <div className="text-center text-white p-4">
                        <CheckCircle className="h-16 w-16 mx-auto mb-3 text-emerald-300" />
                        <p className="font-bold">Rosto capturado!</p>
                        <p className="text-sm text-emerald-300">Clique em "Salvar" para confirmar</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles */}
                <div className="flex gap-2 flex-wrap">
                  {!bioCameraActive ? (
                    <Button
                      onClick={startBioCamera}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={bioLoadingModels}
                    >
                      {bioLoadingModels ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Carregando IA...</>
                      ) : (
                        <><Camera className="h-4 w-4 mr-2" /> Ativar Câmera</>
                      )}
                    </Button>
                  ) : (
                    <>
                      {!bioCaptured ? (
                        <Button
                          onClick={captureBiometric}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={bioCapturing || !bioFaceApiLoaded}
                        >
                          {bioCapturing ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Detectando...</>
                          ) : (
                            <><Camera className="h-4 w-4 mr-2" /> Capturar Rosto</>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={saveBiometric}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={saveFaceDescriptorMutation.isPending}
                          >
                            {saveFaceDescriptorMutation.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                            ) : (
                              <><CheckCircle className="h-4 w-4 mr-2" /> Salvar Biometria</>
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => setBioCaptured(null)} className="flex-1">
                            Recapturar
                          </Button>
                        </>
                      )}
                      <Button variant="outline" onClick={stopBioCamera} className="px-3">
                        Parar
                      </Button>
                    </>
                  )}
                </div>

                {hasBiometric && (
                  <p className="text-xs text-muted-foreground text-center">
                    Para atualizar a biometria, capture um novo rosto e salve novamente.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog: Adicionar Documento */}
      <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de Documento</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value as typeof DOC_TYPES[number])}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]?.label || t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Título / Descrição *</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Ex: CNH Categoria B, Certificado NR10..."
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Data de Emissão</label>
                <input type="date" value={docIssueDate} onChange={e => setDocIssueDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Validade</label>
                <input type="date" value={docExpiryDate} onChange={e => setDocExpiryDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Arquivo (imagem ou PDF) *</label>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${docFile ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400"}`}
              >
                {docFile ? (
                  <><FileText className="h-6 w-6 text-emerald-600" /><span className="text-xs text-emerald-700 font-medium">Arquivo selecionado</span></>
                ) : (
                  <><Upload className="h-6 w-6 text-gray-400" /><span className="text-xs text-gray-500">Toque para selecionar imagem ou PDF</span></>
                )}
              </button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Observações</label>
              <textarea value={docNotes} onChange={e => setDocNotes(e.target.value)} rows={2} placeholder="Observações opcionais..." className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDoc(false)}>Cancelar</Button>
            <Button onClick={handleAddDoc} disabled={addDocMutation.isPending || !docTitle || !docFile} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              {addDocMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Preview Documento */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {previewDoc.title}
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                  <Download className="h-4 w-4" /> Abrir original
                </a>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
              {previewDoc.type.includes("pdf") ? (
                <iframe src={previewDoc.url} className="w-full h-96 rounded" title={previewDoc.title} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full max-h-[65vh] object-contain rounded" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

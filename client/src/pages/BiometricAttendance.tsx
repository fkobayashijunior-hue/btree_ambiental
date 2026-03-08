import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, CheckCircle, XCircle, MapPin, Clock, Users, AlertTriangle, RefreshCw, UserPlus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

const ROLE_LABELS: Record<string, string> = {
  administrativo: "Administrativo", encarregado: "Encarregado",
  mecanico: "Mecânico", motosserrista: "Motosserrista",
  carregador: "Carregador", operador: "Operador",
  motorista: "Motorista", terceirizado: "Terceirizado",
};

// Carrega o face-api.js de forma segura (sem appendChild em React)
let faceApiLoadPromise: Promise<void> | null = null;

function loadFaceApiScript(): Promise<void> {
  if (faceApiLoadPromise) return faceApiLoadPromise;
  
  faceApiLoadPromise = new Promise((resolve, reject) => {
    // Se já está carregado
    if ((window as any).faceapi) {
      resolve();
      return;
    }
    
    // Verificar se o script já existe no DOM
    const existingScript = document.querySelector('script[data-faceapi]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }
    
    const script = document.createElement("script");
    script.setAttribute('data-faceapi', 'true');
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script); // usar body em vez de head
  });
  
  return faceApiLoadPromise;
}

export default function BiometricAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<any | null>(null);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: faceDescriptors = [] } = trpc.collaborators.getFaceDescriptors.useQuery();
  const { data: todayAttendance = [] } = trpc.collaborators.listAttendance.useQuery();

  const registerMutation = trpc.collaborators.registerAttendance.useMutation({
    onSuccess: () => {
      toast.success(`Presença de ${recognized?.name} registrada!`);
      utils.collaborators.listAttendance.invalidate();
      setRecognized(null);
      setRecognizing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Carregar face-api.js de forma segura
  useEffect(() => {
    const init = async () => {
      setLoadingModels(true);
      setLoadError(null);
      try {
        await loadFaceApiScript();
        const faceapi = (window as any).faceapi;
        if (!faceapi) throw new Error("face-api.js não carregou");
        
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setFaceApiLoaded(true);
      } catch (e) {
        console.error("Erro ao carregar modelos:", e);
        setLoadError("Erro ao carregar IA de reconhecimento. Verifique a conexão.");
      } finally {
        setLoadingModels(false);
      }
    };
    init();
  }, []);

  // Obter GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }),
        () => {}
      );
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch (e) {
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraActive(false);
    setRecognized(null);
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded) return;
    const faceapi = (window as any).faceapi;
    setRecognizing(true);
    setRecognized(null);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warning("Nenhum rosto detectado. Posicione o rosto na frente da câmera.");
        setRecognizing(false);
        return;
      }

      // Capturar foto
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const photoBase64 = canvas.toDataURL("image/jpeg", 0.8);

      // Verificar se há descritores cadastrados
      const validDescriptors = faceDescriptors.filter(c => c.faceDescriptor);
      if (validDescriptors.length === 0) {
        toast.info("Nenhum colaborador com biometria cadastrada. Cadastre a biometria primeiro na ficha do colaborador.");
        setRecognizing(false);
        return;
      }

      // Comparar com descritores cadastrados
      const labeledDescriptors = validDescriptors.map(c => {
        const descriptorArray = JSON.parse(c.faceDescriptor!);
        return new faceapi.LabeledFaceDescriptors(
          String(c.id),
          [new Float32Array(descriptorArray)]
        );
      });

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
      const match = matcher.findBestMatch(detection.descriptor);

      if (match.label === "unknown") {
        toast.error("Colaborador não reconhecido. Verifique se a biometria foi cadastrada.");
        setRecognizing(false);
        return;
      }

      const collaborator = faceDescriptors.find(c => String(c.id) === match.label);
      const confidence = ((1 - match.distance) * 100).toFixed(1);

      setRecognized({ ...collaborator, confidence, photoBase64 });

    } catch (e) {
      console.error(e);
      toast.error("Erro no reconhecimento facial");
    }
    setRecognizing(false);
  };

  const confirmAttendance = () => {
    if (!recognized) return;
    registerMutation.mutate({
      collaboratorId: recognized.id,
      location: locationText || undefined,
      latitude: gpsCoords?.lat,
      longitude: gpsCoords?.lng,
      photoBase64: recognized.photoBase64,
      confidence: recognized.confidence,
    });
  };

  // Filtrar presenças de hoje
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const todayRecords = todayAttendance.filter(r => {
    const d = new Date(r.checkInTime);
    return format(d, "yyyy-MM-dd") === todayStr;
  });

  const hasBiometricCollaborators = faceDescriptors.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
          <Camera className="h-7 w-7" /> Registro de Presença
        </h1>
        <p className="text-gray-500 text-sm mt-1">Reconhecimento facial para registro de ponto</p>
      </div>

      {/* Aviso: sem biometria cadastrada */}
      {!hasBiometricCollaborators && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 text-sm">Nenhuma biometria cadastrada</p>
            <p className="text-xs text-amber-700 mt-1">
              Para usar o reconhecimento facial, acesse a ficha de cada colaborador e cadastre a biometria facial na aba "Biometria".
            </p>
            <Button
              size="sm"
              className="mt-2 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              onClick={() => setLocation("/colaboradores")}
            >
              <UserPlus className="h-3 w-3 mr-1" /> Ir para Colaboradores
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Erro de carregamento */}
      {loadError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800 text-sm">{loadError}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-xs h-8"
              onClick={() => { faceApiLoadPromise = null; window.location.reload(); }}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Câmera */}
        <Card className="border-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-800">Câmera de Reconhecimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Local */}
            <div>
              <Label className="text-sm">Local de trabalho</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Ex: Fazenda São João - Talhão 3"
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                />
                {gpsCoords && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-nowrap text-xs flex items-center gap-1 flex-shrink-0">
                    <MapPin className="h-3 w-3" /> GPS ✓
                  </Badge>
                )}
              </div>
            </div>

            {/* Vídeo */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="text-center text-gray-400 p-4">
                  {loadingModels ? (
                    <>
                      <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-40 animate-spin" />
                      <p className="text-sm">Carregando IA de reconhecimento...</p>
                      <p className="text-xs mt-1 opacity-60">Pode levar alguns segundos</p>
                    </>
                  ) : (
                    <>
                      <Camera className="h-16 w-16 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Câmera desativada</p>
                    </>
                  )}
                </div>
              )}

              {/* Overlay de reconhecimento */}
              {recognized && (
                <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <CheckCircle className="h-16 w-16 mx-auto mb-3 text-emerald-300" />
                    <p className="text-xl font-bold">{recognized.name}</p>
                    <p className="text-emerald-300">{ROLE_LABELS[recognized.role] || recognized.role}</p>
                    <p className="text-sm text-emerald-400 mt-1">Confiança: {recognized.confidence}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="flex gap-2">
              {!cameraActive ? (
                <Button
                  onClick={startCamera}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loadingModels || !!loadError}
                >
                  {loadingModels ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Carregando IA...</>
                  ) : (
                    <><Camera className="h-4 w-4 mr-2" /> Ativar Câmera</>
                  )}
                </Button>
              ) : (
                <>
                  {!recognized ? (
                    <Button
                      onClick={captureAndRecognize}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={recognizing || !faceApiLoaded}
                    >
                      {recognizing ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Reconhecendo...</>
                      ) : (
                        <><Camera className="h-4 w-4 mr-2" /> Registrar Presença</>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={confirmAttendance}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={registerMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {registerMutation.isPending ? "Salvando..." : "Confirmar"}
                      </Button>
                      <Button
                        onClick={() => setRecognized(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Cancelar
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={stopCamera} className="px-3">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Presenças de hoje */}
        <Card className="border-emerald-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Presentes Hoje
              </CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {todayRecords.length} pessoa{todayRecords.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardHeader>
          <CardContent>
            {todayRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma presença registrada hoje</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {todayRecords.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                      {r.collaboratorPhoto ? (
                        <img src={r.collaboratorPhoto} alt={r.collaboratorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-emerald-600 font-bold text-sm">
                          {r.collaboratorName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{r.collaboratorName}</p>
                      <p className="text-xs text-gray-500">{ROLE_LABELS[r.collaboratorRole] || r.collaboratorRole}</p>
                      {r.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {r.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-emerald-700">
                        {format(new Date(r.checkInTime), "HH:mm")}
                      </p>
                      {r.confidence && (
                        <p className="text-xs text-gray-400">{r.confidence}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

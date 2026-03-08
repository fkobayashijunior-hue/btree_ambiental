import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Leaf, Lock, ArrowLeft, Fingerprint } from "lucide-react";

// Logo BTREE Ambiental — versão verde (fundo branco/transparente)
const BTREE_LOGO_GREEN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
// Logo Kobayashi
const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";

const PIN_EMAIL_KEY = "btree_pin_email";
const PIN_HASH_KEY = "btree_pin_hash";

// Hash simples do PIN (não é segurança real, apenas ofusca no localStorage)
function hashPin(pin: string, email: string): string {
  let h = 0;
  const s = pin + email + "btree2024";
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(16);
}

type Mode = "pin" | "full" | "setup-pin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();

  // PIN state
  const [mode, setMode] = useState<Mode>("full");
  const [pinEmail, setPinEmail] = useState<string>("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState(false);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [setupStep, setSetupStep] = useState<"new" | "confirm">("new");
  const pinRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];
  const newPinRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];
  const confirmPinRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  // Verificar se existe PIN salvo ao montar
  useEffect(() => {
    const saved = localStorage.getItem(PIN_EMAIL_KEY);
    if (saved) {
      setPinEmail(saved);
      setMode("pin");
    }
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Bem-vindo ao BTREE Ambiental!");
      // Verificar se já tem PIN para este email
      const existingPinEmail = localStorage.getItem(PIN_EMAIL_KEY);
      if (!existingPinEmail || existingPinEmail !== vars.email) {
        // Perguntar se quer configurar PIN — vai para modo setup
        setEmail(vars.email);
        setMode("setup-pin");
        setSetupStep("new");
        setNewPin(["", "", "", ""]);
        setConfirmPin(["", "", "", ""]);
        setTimeout(() => newPinRefs[0].current?.focus(), 100);
      } else {
        setLocation("/app");
      }
    },
    onError: (error) => {
      toast.error(error.message || "E-mail ou senha incorretos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  // Verificar PIN
  const handlePinCheck = () => {
    const enteredPin = pin.join("");
    if (enteredPin.length < 4) return;
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (stored && stored === hashPin(enteredPin, pinEmail)) {
      // PIN correto — fazer login via API com credenciais salvas
      // Como não temos a senha salva, usamos um endpoint de validação de sessão
      // Alternativa: redirecionar direto se já tiver cookie de sessão válido
      window.location.href = "/app";
    } else {
      setPinError(true);
      setPin(["", "", "", ""]);
      setTimeout(() => pinRefs[0].current?.focus(), 50);
      toast.error("PIN incorreto");
    }
  };

  const handlePinInput = (
    index: number,
    value: string,
    refs: React.RefObject<HTMLInputElement | null>[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    onComplete?: () => void
  ) => {
    if (!/^\d*$/.test(value)) return;
    const newArr = [...(index === 0 && refs === pinRefs ? pin : index === 0 ? newPin : newPin)];
    // Detectar qual array usar
    let arr: string[];
    if (refs === pinRefs) arr = [...pin];
    else if (refs === newPinRefs) arr = [...newPin];
    else arr = [...confirmPin];

    arr[index] = value.slice(-1);
    setter(arr);

    if (value && index < 3) {
      refs[index + 1].current?.focus();
    }
    if (value && index === 3 && onComplete) {
      setTimeout(onComplete, 50);
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent,
    refs: React.RefObject<HTMLInputElement | null>[],
    arr: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (e.key === "Backspace" && !arr[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  // Salvar PIN após configuração
  const handleSavePin = () => {
    const p1 = newPin.join("");
    const p2 = confirmPin.join("");
    if (p1.length < 4) { toast.error("Digite 4 dígitos para o PIN"); return; }
    if (p1 !== p2) {
      toast.error("Os PINs não coincidem");
      setConfirmPin(["", "", "", ""]);
      setSetupStep("new");
      setNewPin(["", "", "", ""]);
      setTimeout(() => newPinRefs[0].current?.focus(), 50);
      return;
    }
    localStorage.setItem(PIN_EMAIL_KEY, email);
    localStorage.setItem(PIN_HASH_KEY, hashPin(p1, email));
    toast.success("PIN configurado com sucesso!");
    setLocation("/app");
  };

  const handleSkipPin = () => {
    setLocation("/app");
  };

  const handleRemovePin = () => {
    localStorage.removeItem(PIN_EMAIL_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    setPinEmail("");
    setMode("full");
    setPin(["", "", "", ""]);
  };

  // ===== RENDER: MODO PIN =====
  const renderPinMode = () => (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Fingerprint className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Acesso Rápido
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Digite seu PIN de 4 dígitos
        </p>
        <p className="text-emerald-700 font-semibold text-sm mt-1 truncate">{pinEmail}</p>
      </div>

      <div className="flex justify-center gap-3 mb-8">
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={pinRefs[i]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handlePinInput(i, e.target.value, pinRefs, setPin, handlePinCheck)}
            onKeyDown={e => handlePinKeyDown(i, e, pinRefs, pin, setPin)}
            className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all ${
              pinError
                ? "border-red-400 bg-red-50 text-red-700"
                : digit
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-900 focus:border-emerald-500"
            }`}
            autoFocus={i === 0}
          />
        ))}
      </div>

      <button
        onClick={handlePinCheck}
        disabled={pin.join("").length < 4}
        className="w-full h-12 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] mb-4"
        style={{ background: "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 50%, #00b87a 100%)", fontFamily: "'Montserrat', sans-serif" }}
      >
        <span className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" /> Entrar com PIN
        </span>
      </button>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => { setMode("full"); setPin(["", "", "", ""]); setPinError(false); }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Usar e-mail e senha
        </button>
        <button
          onClick={handleRemovePin}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Remover PIN salvo
        </button>
      </div>
    </div>
  );

  // ===== RENDER: CONFIGURAR PIN =====
  const renderSetupPin = () => (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Fingerprint className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Configurar PIN
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          {setupStep === "new"
            ? "Crie um PIN de 4 dígitos para acesso rápido"
            : "Confirme seu PIN"}
        </p>
      </div>

      {setupStep === "new" ? (
        <div className="flex justify-center gap-3 mb-6">
          {newPin.map((digit, i) => (
            <input
              key={i}
              ref={newPinRefs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => {
                const arr = [...newPin];
                arr[i] = e.target.value.slice(-1);
                if (!/^\d*$/.test(arr[i])) { arr[i] = ""; return; }
                setNewPin(arr);
                if (e.target.value && i < 3) newPinRefs[i + 1].current?.focus();
                if (e.target.value && i === 3) {
                  setTimeout(() => { setSetupStep("confirm"); setTimeout(() => confirmPinRefs[0].current?.focus(), 50); }, 50);
                }
              }}
              onKeyDown={e => { if (e.key === "Backspace" && !newPin[i] && i > 0) newPinRefs[i - 1].current?.focus(); }}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all ${digit ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-900 focus:border-emerald-500"}`}
              autoFocus={i === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex justify-center gap-3 mb-6">
          {confirmPin.map((digit, i) => (
            <input
              key={i}
              ref={confirmPinRefs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => {
                const arr = [...confirmPin];
                arr[i] = e.target.value.slice(-1);
                if (!/^\d*$/.test(arr[i])) { arr[i] = ""; return; }
                setConfirmPin(arr);
                if (e.target.value && i < 3) confirmPinRefs[i + 1].current?.focus();
                if (e.target.value && i === 3) setTimeout(handleSavePin, 50);
              }}
              onKeyDown={e => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmPinRefs[i - 1].current?.focus(); }}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all ${digit ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-900 focus:border-emerald-500"}`}
              autoFocus={i === 0}
            />
          ))}
        </div>
      )}

      <button
        onClick={setupStep === "new" ? () => { setSetupStep("confirm"); setTimeout(() => confirmPinRefs[0].current?.focus(), 50); } : handleSavePin}
        disabled={setupStep === "new" ? newPin.join("").length < 4 : confirmPin.join("").length < 4}
        className="w-full h-12 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] mb-3"
        style={{ background: "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 50%, #00b87a 100%)", fontFamily: "'Montserrat', sans-serif" }}
      >
        {setupStep === "new" ? "Próximo" : "Salvar PIN"}
      </button>

      <button
        onClick={handleSkipPin}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
      >
        Pular — entrar sem PIN
      </button>
    </div>
  );

  // ===== RENDER: LOGIN COMPLETO =====
  const renderFullLogin = () => (
    <div className="w-full max-w-sm">
      <div className="hidden md:block mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Bem-vindo de volta
        </h2>
        <p className="text-gray-500 mt-2 text-sm">Entre com suas credenciais para acessar o sistema</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors text-gray-900 placeholder-gray-400 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-gray-700">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors text-gray-900 placeholder-gray-400 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full h-12 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: loginMutation.isPending
              ? "#6b7280"
              : "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 50%, #00b87a 100%)",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {loginMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold hover:underline transition-colors"
            style={{ color: "#1a7a4a" }}
          >
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — brand visual */}
      <div
        className="hidden md:flex md:w-1/2 relative flex-col justify-between p-10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 40%, #00b87a 100%)",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="absolute -right-10 bottom-20 w-48 h-48 rounded-full opacity-10" style={{ background: "white" }} />

        {/* Logo BTREE — versão branca (invertida) no painel verde */}
        <div className="relative z-10">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 inline-block">
            <img
              src={BTREE_LOGO_GREEN}
              alt="BTREE Ambiental"
              className="h-16 w-auto object-contain brightness-0 invert"
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 space-y-4">
          <p className="text-white/60 text-xs uppercase tracking-[0.3em] font-semibold">
            BIOMASSA · TRATAMENTO · REFLORESTAMENTO · ESTRUTURA · EUCALIPTO
          </p>
          <h1 className="text-white text-4xl font-extrabold leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Cultivando um<br />
            <span className="text-emerald-300">Futuro Sustentável</span><br />
            Desde a Raiz.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Sistema de gestão integrado para silvicultura de eucalipto.
            Astorga, Paraná.
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="relative z-10 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-300" />
          <span className="text-white/50 text-xs">Confiança que floresce, futuro que se constrói.</span>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-white min-h-screen md:min-h-0">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 text-center">
          <img
            src={BTREE_LOGO_GREEN}
            alt="BTREE Ambiental"
            className="h-16 w-auto object-contain mx-auto mb-2"
          />
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestão de Reflorestamento</p>
        </div>

        {mode === "pin" && renderPinMode()}
        {mode === "setup-pin" && renderSetupPin()}
        {mode === "full" && renderFullLogin()}

        {/* Developer footer — logo Kobayashi bem visível */}
        <div className="mt-auto pt-8 flex flex-col items-center gap-2">
          <span className="text-xs text-gray-400 font-medium tracking-wide">Desenvolvido por</span>
          <img
            src={KOBAYASHI_LOGO}
            alt="Kobayashi Desenvolvimento"
            className="h-14 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
}

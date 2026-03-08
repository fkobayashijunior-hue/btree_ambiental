import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Leaf, Lock, ArrowRight, User, KeyRound } from "lucide-react";

// Logo BTREE Ambiental — versão verde (fundo branco/transparente)
const BTREE_LOGO_GREEN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png";
// Logo Kobayashi
const KOBAYASHI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png";

const SAVED_EMAIL_KEY = "btree_saved_email";
const SAVED_PASSWORD_KEY = "btree_saved_password";
const REMEMBER_KEY = "btree_remember_me";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [, setLocation] = useLocation();

  // Carregar credenciais salvas ao montar
  useEffect(() => {
    const remember = localStorage.getItem(REMEMBER_KEY) === "true";
    if (remember) {
      const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY) || "";
      const savedPassword = localStorage.getItem(SAVED_PASSWORD_KEY) || "";
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo ao BTREE Ambiental!");
      // Salvar ou limpar credenciais conforme a preferência
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, "true");
        localStorage.setItem(SAVED_EMAIL_KEY, email);
        localStorage.setItem(SAVED_PASSWORD_KEY, password);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
        localStorage.removeItem(SAVED_EMAIL_KEY);
        localStorage.removeItem(SAVED_PASSWORD_KEY);
      }
      setLocation("/app");
    },
    onError: (error) => {
      toast.error(error.message || "E-mail ou senha incorretos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0d4f2e] via-[#1a7a4a] to-[#00b87a] p-4">
      {/* Card principal */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header verde */}
        <div className="bg-gradient-to-br from-[#0d4f2e] to-[#1a7a4a] px-8 py-8 flex flex-col items-center">
          <img
            src={BTREE_LOGO_GREEN}
            alt="BTREE Ambiental"
            className="h-14 object-contain brightness-0 invert mb-3"
          />
          <p className="text-emerald-200 text-sm font-medium">Sistema de Gestão</p>
        </div>

        {/* Formulário */}
        <div className="px-8 py-8">
          <h2
            className="text-xl font-extrabold text-gray-900 mb-6 text-center"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Área do Colaborador
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Lembrar acesso */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer select-none">
                Lembrar meu acesso neste dispositivo
              </label>
            </div>

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2"
              style={{
                background: "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 50%, #00b87a 100%)",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" /> Entrar
                </span>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link href="/forgot-password" className="text-sm text-emerald-700 hover:text-emerald-900 transition-colors">
              Esqueceu a senha?
            </Link>
            <Link href="/client-portal" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Acesso do Cliente →
            </Link>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href="/" className="text-emerald-200 hover:text-white text-sm transition-colors flex items-center gap-1">
          <Leaf className="h-3 w-3" /> Voltar ao site
        </Link>
        <img
          src={KOBAYASHI_LOGO}
          alt="Desenvolvido por Kobayashi"
          className="h-5 object-contain opacity-40 hover:opacity-70 transition-opacity brightness-0 invert mt-2"
        />
      </div>
    </div>
  );
}

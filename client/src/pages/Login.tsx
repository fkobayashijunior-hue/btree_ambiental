import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, Leaf } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo ao BTREE Ambiental!");
      setLocation("/app");
    },
    onError: (error) => {
      toast.error(error.message || "E-mail ou senha incorretos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — brand visual */}
      <div
        className="hidden md:flex md:w-1/2 relative flex-col justify-between p-10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d4f2e 0%, #1a7a4a 40%, #00b87a 100%)",
        }}
      >
        {/* Eucalyptus forest texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative circle */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "white" }}
        />
        <div
          className="absolute -right-10 bottom-20 w-48 h-48 rounded-full opacity-10"
          style={{ background: "white" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png"
            alt="BTREE Ambiental"
            className="h-14 w-auto object-contain brightness-0 invert"
          />
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
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #0d4f2e, #00b87a)" }}
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png"
              alt="BTREE"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            BTREE Ambiental
          </h2>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestão de Reflorestamento</p>
        </div>

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

        {/* Developer footer */}
        <div className="mt-auto pt-8 flex items-center gap-2 text-xs text-gray-400">
          <span>Desenvolvido por</span>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png"
            alt="Kobayashi"
            className="h-8 w-auto opacity-50 hover:opacity-80 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
}

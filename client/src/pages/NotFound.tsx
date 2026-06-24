import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Home, Loader2 } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Redireciona automaticamente para a home após 3 segundos
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLocation("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setLocation]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center px-6">
        {/* Logo / ícone */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-700 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">B</span>
          </div>
        </div>

        <h1 className="text-6xl font-bold text-green-800 mb-2">404</h1>
        <p className="text-lg text-green-700 font-medium mb-1">Página não encontrada</p>
        <p className="text-sm text-green-600 mb-8">
          Esta página não existe ou foi movida.
        </p>

        {/* Contador regressivo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-green-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Redirecionando para a home em <strong>{countdown}s</strong>...</span>
          </div>

          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            Ir para a Home agora
          </button>
        </div>
      </div>
    </div>
  );
}

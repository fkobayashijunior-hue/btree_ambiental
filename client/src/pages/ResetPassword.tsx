import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  // Pegar o token da URL
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao redefinir senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!token) {
      toast.error("Token de recuperação inválido. Solicite um novo link.");
      return;
    }

    resetMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-emerald-100 text-center p-8">
          <p className="text-red-600 font-medium">Link de recuperação inválido.</p>
          <Link href="/forgot-password" className="text-emerald-600 hover:underline mt-4 block">
            Solicitar novo link
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree-final_5d1c1c12.png"
              alt="BTREE Ambiental"
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-emerald-800">
            Nova Senha
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            {done ? "Senha redefinida com sucesso!" : "Crie uma nova senha para sua conta"}
          </CardDescription>
        </CardHeader>

        {done ? (
          <CardContent className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-emerald-500" />
            </div>
            <p className="text-gray-700 font-medium">Senha alterada com sucesso!</p>
            <p className="text-sm text-gray-500">
              Você será redirecionado para o login em instantes...
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg shadow-lg"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Salvando..." : "Salvar Nova Senha"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <span>Desenvolvido por</span>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png"
            alt="Kobayashi"
            className="h-10 w-auto"
          />
        </div>
      </footer>
    </div>
  );
}

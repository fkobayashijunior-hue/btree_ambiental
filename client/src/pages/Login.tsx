import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado! Bem-vindo ao BTREE Ambiental");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-emerald-100">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-btree_2d00f2da.png" 
              alt="BTREE Ambiental" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-emerald-800">
            BTREE Ambiental
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Sistema de Gestão de Reflorestamento
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg shadow-lg"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                Registre-se
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <span>Desenvolvido por</span>
          <img 
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162723291/MXrNdjKBoryW8SZbHmjeHH/logo-kobayashi_82aef6a5.png" 
            alt="Kobayashi" 
            className="h-6 w-auto"
          />
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate({
      email,
      origin: window.location.origin,
    });
  };

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
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            {sent
              ? "Verifique seu email para continuar"
              : "Informe seu email para receber o link de recuperação"}
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-emerald-500" />
            </div>
            <p className="text-gray-700 font-medium">Email enviado com sucesso!</p>
            <p className="text-sm text-gray-500">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.
            </p>
            <p className="text-xs text-gray-400 mt-2">O link expira em 1 hora.</p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email cadastrado
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg shadow-lg"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
            </CardFooter>
          </form>
        )}

        <div className="pb-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
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

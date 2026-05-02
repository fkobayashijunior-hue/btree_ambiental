import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook para verificar permissões de acesso do usuário atual.
 * - Admins têm acesso total (modules = null)
 * - Outros usuários só acessam os módulos listados em `modules`
 */
export function usePermissions() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.permissions.myPermissions.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000, // cache por 1 minuto
  });

  const isAdmin = user?.role === "admin";

  /**
   * Verifica se o usuário tem acesso a um módulo específico.
   * @param slug - slug do módulo (ex: "equipamentos", "cargas")
   */
  const hasAccess = (slug: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (!data) return false;
    if (data.modules === null) return true; // acesso total
    return (data.modules as string[]).includes(slug);
  };

  /**
   * Retorna true se o usuário tem acesso a PELO MENOS UM dos slugs informados.
   */
  const hasAnyAccess = (...slugs: string[]): boolean => {
    return slugs.some(s => hasAccess(s));
  };

  return {
    isLoading,
    isAdmin,
    modules: isAdmin ? null : (data?.modules as string[] | null | undefined),
    hasAccess,
    hasAnyAccess,
    profile: data?.profile || "custom",
    allowedClientIds: data?.allowedClientIds as number[] | null | undefined,
    allowedWorkLocationIds: data?.allowedWorkLocationIds as number[] | null | undefined,
  };
}

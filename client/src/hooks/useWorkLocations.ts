// @ts-nocheck
import { trpc } from "@/lib/trpc";

/**
 * Hook reutilizável para buscar locais de trabalho (GPS Locations)
 * Filtra automaticamente com base nas permissões do usuário logado.
 * Se allowedWorkLocationIds for null (admin), retorna todos os locais.
 * Se for um array, retorna apenas os locais permitidos.
 */
export function useWorkLocations() {
  const { data: locations = [], isLoading: locLoading } = trpc.gpsLocations.listActive.useQuery();
  const { data: perms, isLoading: permsLoading } = trpc.permissions.myPermissions.useQuery();

  const filteredLocations = perms?.allowedWorkLocationIds
    ? locations.filter((l) => (perms.allowedWorkLocationIds as number[]).includes(l.id))
    : locations;

  return {
    locations: filteredLocations as Array<{ id: number; name: string; latitude: string; longitude: string; radiusMeters: number; isActive: number }>,
    isLoading: locLoading || permsLoading,
    isRestricted: !!(perms?.allowedWorkLocationIds && (perms.allowedWorkLocationIds as number[]).length > 0),
  };
}

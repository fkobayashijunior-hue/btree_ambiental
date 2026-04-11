import { trpc } from "@/lib/trpc";

/**
 * Hook reutilizável para buscar locais de trabalho (GPS Locations)
 * Usado nos formulários de consumo, presenças e cargas
 */
export function useWorkLocations() {
  const { data: locations = [], isLoading } = trpc.gpsLocations.listActive.useQuery();
  return {
    locations: locations as Array<{ id: number; name: string; latitude: string; longitude: string; radiusMeters: number; isActive: number }>,
    isLoading,
  };
}

import { useWorkLocations } from "@/hooks/useWorkLocations";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

interface WorkLocationSelectProps {
  value: string; // workLocationId como string (ou "")
  onChange: (locationId: string, locationName: string) => void;
  className?: string;
  label?: string;
  showLabel?: boolean;
}

/**
 * Componente reutilizável de seletor de local de trabalho.
 * Busca os locais cadastrados no GPS Locations e exibe como dropdown.
 * Auto-seleciona o único local se houver apenas um disponível (usuário com permissão restrita).
 * Quando há apenas 1 local, exibe o nome como texto fixo (sem dropdown) para evitar alteração.
 */
export default function WorkLocationSelect({
  value,
  onChange,
  className = "",
  label = "Local de Trabalho",
  showLabel = true,
}: WorkLocationSelectProps) {
  const { locations, isLoading, isRestricted } = useWorkLocations();

  // Auto-selecionar se há apenas um local disponível e nenhum selecionado
  useEffect(() => {
    if (!isLoading && locations.length === 1 && !value) {
      onChange(String(locations[0].id), locations[0].name);
    }
  }, [isLoading, locations, value, onChange]);

  // Se há apenas 1 local (usuário restrito), exibir como texto fixo sem dropdown
  const isSingleRestricted = !isLoading && isRestricted && locations.length === 1;

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm font-medium flex items-center gap-1 mb-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </label>
      )}
      {isSingleRestricted ? (
        <div className="w-full h-10 px-3 rounded-md border border-input bg-muted text-sm flex items-center text-muted-foreground cursor-not-allowed">
          {locations[0].name}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            const id = e.target.value;
            const loc = locations.find((l) => String(l.id) === id);
            onChange(id, loc?.name || "");
          }}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading}
        >
          <option value="">— Sem local definido —</option>
          {locations.map((loc) => (
            <option key={loc.id} value={String(loc.id)}>
              {loc.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

import { useWorkLocations } from "@/hooks/useWorkLocations";
import { MapPin } from "lucide-react";

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
 */
export default function WorkLocationSelect({
  value,
  onChange,
  className = "",
  label = "Local de Trabalho",
  showLabel = true,
}: WorkLocationSelectProps) {
  const { locations, isLoading } = useWorkLocations();

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm font-medium flex items-center gap-1 mb-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </label>
      )}
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
    </div>
  );
}

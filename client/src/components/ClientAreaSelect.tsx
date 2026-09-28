// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { AlertCircle, MapPin } from "lucide-react";

export type ClientAreaOption = {
  id: number;
  clientId: number;
  name: string;
  fieldName?: string | null;
  workLocationId?: number | null;
  agreementStatus?: "pending" | "confirmed" | string | null;
  unit?: "ton" | "m3" | string | null;
  unitPrice?: string | null;
  paymentMethod?: string | null;
  paymentTermDays?: number | null;
  billingCycle?: string | null;
  notes?: string | null;
  workLocationName?: string | null;
  isActive?: number | boolean | null;
};

type ClientAreaSelectProps = {
  clientId?: number | null;
  value?: number | null;
  onChange: (areaId: number | null, area?: ClientAreaOption | null) => void;
  label?: string;
  showLabel?: boolean;
  includeLegacy?: boolean;
  requireExplicit?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onAreasLoaded?: (areas: ClientAreaOption[]) => void;
};

export function areaDisplayName(area?: Partial<ClientAreaOption> | null) {
  if (!area) return "Área atual";
  const prefix = area.fieldName ? `${area.fieldName} — ` : "";
  return `${prefix}${area.name || `Área #${area.id}`}`;
}

export function areaStatusLabel(area?: Partial<ClientAreaOption> | null) {
  return area?.agreementStatus === "pending" ? "Acordo pendente" : "Acordo confirmado";
}

export default function ClientAreaSelect({
  clientId,
  value = null,
  onChange,
  label = "Área / talhão",
  showLabel = true,
  includeLegacy = true,
  requireExplicit = false,
  disabled = false,
  required = false,
  className = "",
}: ClientAreaSelectProps) {
  const enabled = Number(clientId || 0) > 0;
  const { data: areas = [], isLoading, isError } = trpc.clientAreas.list.useQuery(
    { clientId: Number(clientId || 0) },
    { enabled, retry: false },
  );
  const activeAreas = (areas as ClientAreaOption[]).filter((area) => area.isActive !== 0 && area.isActive !== false);
  const selectedValue = value == null ? (requireExplicit ? "" : "legacy") : String(value);
  const selectedArea = activeAreas.find((area) => area.id === value);

  return (
    <div className={className}>
      {showLabel && <Label className="flex items-center gap-1 mb-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-600" />{label}</Label>}
      <select
        value={enabled ? selectedValue : ""}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "legacy" || raw === "") {
            onChange(null, null);
            return;
          }
          const area = activeAreas.find((item) => String(item.id) === raw) || null;
          onChange(area ? area.id : null, area);
        }}
        disabled={disabled || !enabled || isLoading}
        required={required && enabled}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        aria-label={label}
      >
        {!enabled && <option value="">Selecione um cliente primeiro</option>}
        {enabled && requireExplicit && <option value="">Selecione a área da carga...</option>}
        {enabled && includeLegacy && <option value="legacy">Área atual (Área 1)</option>}
        {enabled && activeAreas.map((area) => (
          <option key={area.id} value={String(area.id)}>
            {areaDisplayName(area)}{area.agreementStatus === "pending" ? " — pendente" : ""}
          </option>
        ))}
      </select>
      {enabled && isError && <p className="text-[11px] text-red-600 mt-1">Não foi possível carregar as áreas. Tente novamente antes de salvar.</p>}
      {enabled && selectedArea?.agreementStatus === "pending" && (
        <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{areaStatusLabel(selectedArea)}: ações financeiras ficam bloqueadas.</p>
      )}
    </div>
  );
}

export { ClientAreaSelect };

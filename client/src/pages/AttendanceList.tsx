import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Download, Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  administrativo: "Administrativo", encarregado: "Encarregado",
  mecanico: "Mecânico", motosserrista: "Motosserrista",
  carregador: "Carregador", operador: "Operador",
  motorista: "Motorista", terceirizado: "Terceirizado",
};

export default function AttendanceList() {
  const [searchDate, setSearchDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: allAttendance = [], isLoading } = trpc.collaborators.listAttendance.useQuery();

  // Filtrar por data selecionada
  const filtered = allAttendance.filter(r => {
    const d = new Date(r.checkInTime);
    return format(d, "yyyy-MM-dd") === searchDate;
  });

  // Agrupar por local
  const byLocation = filtered.reduce((acc, r) => {
    const loc = r.location || "Sem local definido";
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(r);
    return acc;
  }, {} as Record<string, typeof filtered>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            <Users className="h-7 w-7" /> Relatório de Presenças
          </h1>
          <p className="text-gray-500 text-sm mt-1">Visualize quem compareceu e onde</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-base px-4 py-2">
          {filtered.length} presente{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filtro de data */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-sm text-gray-500">
          {format(new Date(searchDate + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhuma presença registrada nesta data</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byLocation).map(([loc, records]) => (
            <Card key={loc} className="border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {loc}
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    {records.length} pessoa{records.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                        {r.collaboratorPhoto ? (
                          <img src={r.collaboratorPhoto} alt={r.collaboratorName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-600 font-bold text-sm">
                            {r.collaboratorName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{r.collaboratorName}</p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[r.collaboratorRole] || r.collaboratorRole}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {format(new Date(r.checkInTime), "HH:mm")}
                        </p>
                        {r.confidence && (
                          <p className="text-xs text-gray-400">{r.confidence}% conf.</p>
                        )}
                        {r.latitude && (
                          <a
                            href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 justify-end"
                          >
                            <MapPin className="h-3 w-3" /> GPS
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

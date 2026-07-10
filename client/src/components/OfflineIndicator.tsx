import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Wifi, WifiOff, RefreshCw, CloudOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * OfflineIndicator — Barra que aparece quando o usuário está offline
 * ou quando há itens pendentes de sincronização.
 * Mostra também uma confirmação verde por 3s após sincronizar com sucesso.
 */
export function OfflineIndicator() {
  const { isOnline, queueLength, isSyncing, processQueue } = useOfflineQueue();
  const [justSynced, setJustSynced] = useState(false);
  const [prevQueueLength, setPrevQueueLength] = useState(queueLength);

  // Detectar quando a fila foi zerada (sincronização concluída)
  useEffect(() => {
    if (prevQueueLength > 0 && queueLength === 0 && isOnline && !isSyncing) {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 3000);
      return () => clearTimeout(t);
    }
    setPrevQueueLength(queueLength);
  }, [queueLength, isOnline, isSyncing]);

  // Não mostrar nada quando online, sem fila e sem confirmação
  if (isOnline && queueLength === 0 && !justSynced) return null;

  const LABEL_MAP: Record<string, string> = {
    "cargo.create": "carga",
    "attendance.create": "presença",
    "machineHours.createHours": "horas",
    "machineHours.createMaintenance": "manutenção",
    "machineHours.createFuel": "abastecimento",
    "machineHours.createOil": "óleo",
    "machineHours.createOilWithStock": "óleo",
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl text-sm font-medium transition-all duration-300 ${
        justSynced
          ? "bg-green-600 text-white"
          : !isOnline
          ? "bg-red-600 text-white"
          : queueLength > 0
          ? "bg-amber-500 text-white"
          : "bg-green-600 text-white"
      }`}
    >
      {justSynced ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>Dados sincronizados com sucesso!</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Sem internet
            {queueLength > 0
              ? ` — ${queueLength} lançamento${queueLength > 1 ? "s" : ""} salvo${queueLength > 1 ? "s" : ""} localmente`
              : " — modo offline ativo"}
          </span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          <span>
            Enviando {queueLength} lançamento{queueLength > 1 ? "s" : ""} para o servidor...
          </span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            {queueLength} lançamento{queueLength > 1 ? "s" : ""} pendente{queueLength > 1 ? "s" : ""} de envio
          </span>
          <button
            onClick={processQueue}
            className="ml-1 underline hover:no-underline text-white/90 hover:text-white whitespace-nowrap"
          >
            Enviar agora
          </button>
        </>
      )}
    </div>
  );
}

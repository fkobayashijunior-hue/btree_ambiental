import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";

/**
 * OfflineIndicator — Barra discreta que aparece quando o usuário está offline
 * ou quando há itens pendentes de sincronização.
 */
export function OfflineIndicator() {
  const { isOnline, queueLength, isSyncing, processQueue } = useOfflineQueue();

  // Não mostrar nada quando online e sem fila
  if (isOnline && queueLength === 0) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium transition-all ${
        !isOnline
          ? "bg-red-600 text-white"
          : queueLength > 0
          ? "bg-amber-500 text-white"
          : "bg-green-600 text-white"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Sem internet — {queueLength > 0 ? `${queueLength} item${queueLength > 1 ? "s" : ""} pendente${queueLength > 1 ? "s" : ""}` : "modo offline"}</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Sincronizando {queueLength} item{queueLength > 1 ? "s" : ""}...</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>{queueLength} item{queueLength > 1 ? "s" : ""} para sincronizar</span>
          <button
            onClick={processQueue}
            className="ml-1 underline hover:no-underline text-white/90 hover:text-white"
          >
            Sincronizar agora
          </button>
        </>
      )}
    </div>
  );
}

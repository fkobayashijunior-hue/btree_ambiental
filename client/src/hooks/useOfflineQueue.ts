/**
 * useOfflineQueue — Fila de operações offline com sincronização automática
 *
 * Quando o usuário está sem internet, as mutações são enfileiradas no
 * localStorage. Quando a conexão volta, a fila é processada automaticamente.
 *
 * Uso:
 *   const { isOnline, queueLength, addToQueue } = useOfflineQueue();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export type QueuedOperation = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  retries: number;
};

const QUEUE_KEY = "btree_offline_queue";
const MAX_RETRIES = 3;

function loadQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage cheio — ignorar
  }
}

type SyncHandler = (op: QueuedOperation) => Promise<void>;

const syncHandlers: Map<string, SyncHandler> = new Map();

export function registerOfflineSyncHandler(type: string, handler: SyncHandler) {
  syncHandlers.set(type, handler);
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedOperation[]>(loadQueue);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRef = useRef(false);

  // Atualizar estado de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restaurada! Sincronizando dados...", { duration: 3000 });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sem conexão. Os cadastros serão salvos localmente.", { duration: 4000 });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sincronizar quando voltar online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncRef.current) {
      processQueue();
    }
  }, [isOnline]);

  const processQueue = useCallback(async () => {
    if (syncRef.current) return;
    syncRef.current = true;
    setIsSyncing(true);

    const currentQueue = loadQueue();
    if (currentQueue.length === 0) {
      syncRef.current = false;
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const remaining: QueuedOperation[] = [];

    for (const op of currentQueue) {
      const handler = syncHandlers.get(op.type);
      if (!handler) {
        // Sem handler registrado — manter na fila
        remaining.push(op);
        continue;
      }
      try {
        await handler(op);
        successCount++;
      } catch (err) {
        if (op.retries < MAX_RETRIES) {
          remaining.push({ ...op, retries: op.retries + 1 });
        } else {
          failCount++;
          console.error(`[OfflineQueue] Operação ${op.type} falhou após ${MAX_RETRIES} tentativas:`, err);
        }
      }
    }

    saveQueue(remaining);
    setQueue(remaining);
    syncRef.current = false;
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} registro${successCount > 1 ? "s" : ""} sincronizado${successCount > 1 ? "s" : ""} com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} registro${failCount > 1 ? "s" : ""} não puderam ser sincronizados.`);
    }
  }, []);

  const addToQueue = useCallback((type: string, payload: unknown) => {
    const op: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      createdAt: Date.now(),
      retries: 0,
    };
    const newQueue = [...loadQueue(), op];
    saveQueue(newQueue);
    setQueue(newQueue);
    toast.info("Sem conexão — registro salvo localmente e será enviado quando a internet voltar.", { duration: 5000 });
    return op.id;
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setQueue([]);
  }, []);

  return {
    isOnline,
    queue,
    queueLength: queue.length,
    isSyncing,
    addToQueue,
    processQueue,
    clearQueue,
  };
}

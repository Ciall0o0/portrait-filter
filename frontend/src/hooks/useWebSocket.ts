import { useEffect, useRef, useCallback } from "react";
import type { BatchStatus } from "../types";

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;

export function useWebSocket(
  batchId: string | null,
  onMessage: (status: BatchStatus) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelled = useRef(false);

  const connect = useCallback(() => {
    if (!batchId || cancelled.current) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/batch/${batchId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const status: BatchStatus = JSON.parse(event.data);
      onMessage(status);
      if (status.status === "completed" || status.status === "error") {
        ws.close();
      }
    };

    ws.onopen = () => {
      retryCount.current = 0;
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    ws.onerror = () => {
      if (cancelled.current) return;
      if (retryCount.current >= MAX_RETRIES) return;
      const delay = BASE_DELAY * Math.pow(2, retryCount.current);
      retryCount.current += 1;
      reconnectTimer.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [batchId, onMessage]);

  useEffect(() => {
    cancelled.current = false;
    retryCount.current = 0;
    connect();
    return () => {
      cancelled.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    cancel: () => {
      cancelled.current = true;
      wsRef.current?.close();
    },
  };
}

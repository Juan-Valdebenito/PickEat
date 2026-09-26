"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveEvent } from "./events";

type Options = {
  // Si se indica, solo llegan eventos de esa mesa.
  table?: number;
  onEvent?: (event: LiveEvent) => void;
};

// Carga `url`, se suscribe a /api/eventos y vuelve a cargar cada vez que llega un cambio.
// Si la conexión en vivo se cae, un sondeo cada 20 s mantiene la pantalla al día.
export function useLiveData<T>(url: string, { table, onEvent }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo cargar");
      setData(body as T);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    }
  }, [url]);

  useEffect(() => {
    refresh();
    const source = new EventSource(table ? `/api/eventos?mesa=${table}` : "/api/eventos");
    source.onopen = () => {
      setConnected(true);
      refresh(); // al reconectar puede haber cambios que no escuchamos
    };
    source.onerror = () => setConnected(false);
    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as LiveEvent;
      onEventRef.current?.(event);
      refresh();
    };
    const poll = setInterval(refresh, 20_000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [refresh, table]);

  return { data, error, connected, refresh };
}

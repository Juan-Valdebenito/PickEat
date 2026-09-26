"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 3_000;

type Options<T> = {
  // Se llama con los datos anteriores y los nuevos cada vez que llega una respuesta.
  // `prev` es null en la primera carga. Útil para detectar novedades (y sonar).
  onChange?: (prev: T | null, next: T) => void;
};

// Carga `url` y la vuelve a consultar cada 3 s mientras la pestaña está visible.
// Se usa sondeo en vez de WebSockets/SSE porque en Vercel las funciones son
// efímeras y no comparten memoria entre instancias.
export function useLiveData<T>(url: string, { onChange }: Options<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const dataRef = useRef<T | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo cargar");
      onChangeRef.current?.(dataRef.current, body as T);
      dataRef.current = body as T;
      setData(body as T);
      setError(null);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    }
  }, [url]);

  useEffect(() => {
    dataRef.current = null;
    refresh();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { data, error, connected, refresh };
}

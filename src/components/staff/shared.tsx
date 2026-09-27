"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConvexConnectionState } from "convex/react";
import { unlockAudio } from "@/lib/sound";

// Llama a `onChange(prev, next)` cada vez que `value` cambia (no en la primera carga).
// Sirve para detectar novedades, por ejemplo un pedido nuevo, y hacer sonar un aviso.
export function useOnChange<T>(value: T | undefined, onChange: (prev: T, next: T) => void) {
  const prev = useRef<T | undefined>(undefined);
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    if (value === undefined) return;
    if (prev.current !== undefined && prev.current !== value) callback.current(prev.current, value);
    prev.current = value;
  }, [value]);
}

export function StaffHeader({
  title,
  soundOn,
  onSoundOn,
  dark = false,
  children,
}: {
  title: string;
  soundOn: boolean;
  onSoundOn: () => void;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  const connected = useConvexConnectionState().isWebSocketConnected;
  return (
    <header
      className={`sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-4 py-3 ${
        dark ? "border-stone-800 bg-stone-950" : "border-stone-200 bg-white"
      }`}
    >
      <Link href="/" className={`text-sm ${dark ? "text-stone-400" : "text-stone-500"}`}>
        ←
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
      <span
        className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-emerald-500" : "text-red-500"}`}
      >
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
        {connected ? "En vivo" : "Sin conexión"}
      </span>
      <div className="ml-auto flex items-center gap-3">
        {children}
        {!soundOn && (
          <button
            onClick={onSoundOn}
            className="animate-pulse-ring rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            🔔 Activar sonido
          </button>
        )}
      </div>
    </header>
  );
}

export function useSound() {
  const [soundOn, setSoundOn] = useState(false);
  return {
    soundOn,
    enableSound: () => setSoundOn(unlockAudio()),
  };
}

// Re-render periódico para que "hace X min" se mantenga al día.
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function minutesSince(timestamp: number, now: number) {
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}

export function elapsedLabel(timestamp: number, now: number) {
  const m = minutesSince(timestamp, now);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h ${m % 60} min`;
}

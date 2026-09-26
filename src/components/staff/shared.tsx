"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { unlockAudio } from "@/lib/sound";

export async function sendJSON(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "La operación falló");
  return data;
}

export function StaffHeader({
  title,
  connected,
  soundOn,
  onSoundOn,
  dark = false,
  children,
}: {
  title: string;
  connected: boolean;
  soundOn: boolean;
  onSoundOn: () => void;
  dark?: boolean;
  children?: React.ReactNode;
}) {
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
        {connected ? "En vivo" : "Reconectando…"}
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

export function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

export function elapsedLabel(iso: string, now: number) {
  const m = minutesSince(iso, now);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h ${m % 60} min`;
}

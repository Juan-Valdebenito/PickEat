"use client";

import { useEffect } from "react";

// Panel que sube desde abajo, pensado para usarse con una mano en el celular.
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white"
      >
        {children}
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const btn = "flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold disabled:opacity-30";
  return (
    <div className="flex items-center gap-2 rounded-full bg-stone-100 p-1">
      <button className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Quitar uno">
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Agregar uno">
        +
      </button>
    </div>
  );
}

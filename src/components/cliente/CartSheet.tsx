"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/constants";
import type { NewOrderItem } from "@/lib/types";
import type { useCart } from "./cart";
import { QuantityStepper, Sheet } from "@/components/Sheet";

type Props = {
  table: number;
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  onSent: () => void;
};

export function CartSheet({ table, cart, onClose, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const items: NewOrderItem[] = cart.lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        selectedOptions: l.selectedOptions,
        notes: l.notes,
      }));
      const res = await fetch(`/api/mesas/${table}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `No se pudo enviar el pedido (error ${res.status})`);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pedido");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="text-lg font-bold">Tu pedido · Mesa {table}</h2>
        <button onClick={onClose} className="text-sm font-medium text-stone-500">
          Seguir mirando
        </button>
      </div>

      <ul className="divide-y divide-stone-100 overflow-y-auto px-5">
        {cart.lines.map((line) => (
          <li key={line.key} className="flex items-start gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{line.product.name}</div>
              {Object.entries(line.selectedOptions).map(([k, v]) => (
                <div key={k} className="text-sm text-stone-500">
                  {k}: {v}
                </div>
              ))}
              {line.notes && <div className="text-sm italic text-brand-700">“{line.notes}”</div>}
              <div className="mt-1 text-sm font-medium">{formatCLP(line.product.price * line.quantity)}</div>
            </div>
            <QuantityStepper value={line.quantity} min={0} onChange={(q) => cart.setQuantity(line.key, q)} />
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-stone-200 p-4">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCLP(cart.total)}</span>
        </div>
        <button
          onClick={send}
          disabled={sending || cart.count === 0}
          className="w-full rounded-2xl bg-brand-500 py-4 font-semibold text-white disabled:bg-stone-300"
        >
          {sending ? "Enviando…" : "Confirmar y enviar a cocina"}
        </button>
      </div>
    </Sheet>
  );
}

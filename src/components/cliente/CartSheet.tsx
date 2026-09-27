"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/errors";
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
  const createOrder = useMutation(api.orders.create);
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
      await createOrder({ tableNumber: table, items });
      onSent();
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar el pedido"));
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

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { formatCLP, shortId, ORDER_STATUSES, STATUS_LABEL, type CallType } from "@/lib/constants";
import type { OrderDTO, TableStateDTO } from "@/lib/types";

type Props = {
  table: number;
  state: TableStateDTO | undefined;
  onToast: (message: string) => void;
};

export function AccountView({ table, state, onToast }: Props) {
  const callWaiter = useMutation(api.tables.callWaiter);
  const [busy, setBusy] = useState<CallType | null>(null);

  async function call(type: CallType) {
    setBusy(type);
    try {
      await callWaiter({ tableNumber: table, type });
      onToast(type === "BILL" ? "Le avisamos al mesero que quieres la cuenta" : "El mesero viene en camino");
    } catch (err) {
      onToast(errorMessage(err, "No se pudo avisar al mesero"));
    } finally {
      setBusy(null);
    }
  }

  if (!state) {
    return <p className="p-8 text-center text-stone-500">Cargando…</p>;
  }

  const waiterPending = state.pendingCalls.includes("WAITER");
  const billPending = state.pendingCalls.includes("BILL") || state.billRequested;

  return (
    <main className="space-y-4 px-4 pt-6">
      <div className="grid grid-cols-2 gap-3">
        <CallButton pending={waiterPending} busy={busy === "WAITER"} onClick={() => call("WAITER")}>
          {waiterPending ? "Mesero avisado" : "Llamar al mesero"}
        </CallButton>
        <CallButton
          pending={billPending}
          busy={busy === "BILL"}
          disabled={state.orders.length === 0}
          onClick={() => call("BILL")}
        >
          {billPending ? "Cuenta pedida" : "Pedir la cuenta"}
        </CallButton>
      </div>

      {state.orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-stone-500 ring-1 ring-stone-200">
          Aún no has hecho pedidos. Ve a la carta para elegir.
        </div>
      ) : (
        <>
          {state.orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          <div className="flex justify-between rounded-2xl bg-stone-900 p-5 text-lg font-bold text-white">
            <span>Total de la mesa</span>
            <span>{formatCLP(state.total)}</span>
          </div>
        </>
      )}
    </main>
  );
}

function CallButton({
  pending,
  busy,
  disabled,
  onClick,
  children,
}: {
  pending: boolean;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || pending || disabled}
      className={`rounded-2xl px-4 py-4 text-sm font-semibold transition ${
        pending
          ? "bg-brand-50 text-brand-700 ring-1 ring-brand-500"
          : "bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 disabled:opacity-50"
      }`}
    >
      {busy ? "Avisando…" : children}
    </button>
  );
}

function OrderCard({ order }: { order: OrderDTO }) {
  const step = ORDER_STATUSES.indexOf(order.status);
  const time = new Date(order.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const total = order.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-stone-500">
          Pedido #{shortId(order.id)} · {time}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            order.status === "READY"
              ? "bg-emerald-100 text-emerald-800"
              : order.status === "DELIVERED"
                ? "bg-stone-100 text-stone-600"
                : "bg-brand-100 text-brand-700"
          }`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <ol className="mt-3 flex gap-1" aria-label="Progreso del pedido">
        {ORDER_STATUSES.map((s, i) => (
          <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-500" : "bg-stone-200"}`} />
        ))}
      </ol>

      <ul className="mt-3 space-y-1.5 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              <b>{item.quantity}×</b> {item.name}
              {Object.values(item.selectedOptions).length > 0 && (
                <span className="text-stone-500"> ({Object.values(item.selectedOptions).join(", ")})</span>
              )}
              {item.notes && <span className="block text-xs italic text-stone-500">“{item.notes}”</span>}
            </span>
            <span className="shrink-0 tabular-nums">{formatCLP(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-stone-100 pt-2 text-right text-sm font-semibold">{formatCLP(total)}</div>
    </article>
  );
}

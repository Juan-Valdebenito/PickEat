"use client";

import { useState } from "react";
import { NEXT_STATUS, STATUS_LABEL, type OrderStatus } from "@/lib/constants";
import { beep } from "@/lib/sound";
import type { BoardDTO, OrderDTO } from "@/lib/types";
import { useLiveData } from "@/lib/use-live";
import { elapsedLabel, minutesSince, sendJSON, StaffHeader, useNow, useSound } from "./shared";

const COLUMNS: { status: OrderStatus; accent: string }[] = [
  { status: "RECEIVED", accent: "border-sky-500" },
  { status: "PREPARING", accent: "border-amber-500" },
  { status: "READY", accent: "border-emerald-500" },
];

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  RECEIVED: "Empezar a preparar",
  PREPARING: "Marcar listo",
};

const PREVIOUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PREPARING: "RECEIVED",
  READY: "PREPARING",
};

export function KitchenBoard() {
  const { soundOn, enableSound } = useSound();
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const live = useLiveData<BoardDTO>("/api/tablero", {
    onEvent: (e) => {
      if (e.type === "order.created") beep([660, 880, 1320]);
    },
  });

  async function move(order: OrderDTO, status: OrderStatus) {
    setError(null);
    try {
      await sendJSON(`/api/pedidos/${order.id}`, "PATCH", { status });
      live.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      live.refresh();
    }
  }

  const orders = live.data?.orders ?? [];

  return (
    <div className="min-h-dvh bg-stone-900 text-stone-100">
      <StaffHeader title="Cocina" connected={live.connected} soundOn={soundOn} onSoundOn={enableSound} dark>
        <span className="text-sm text-stone-400">
          {orders.filter((o) => o.status !== "READY").length} en curso
        </span>
      </StaffHeader>

      {(error || live.error) && (
        <div className="bg-red-900/60 px-4 py-2 text-sm text-red-100">{error ?? live.error}</div>
      )}

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {COLUMNS.map(({ status, accent }) => {
          const list = orders.filter((o) => o.status === status);
          return (
            <section key={status} className="min-w-0">
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-stone-400">
                {STATUS_LABEL[status]}
                <span className="rounded-full bg-stone-800 px-2 py-0.5 text-stone-300">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && (
                  <p className="rounded-xl border border-dashed border-stone-700 p-6 text-center text-sm text-stone-500">
                    Sin pedidos
                  </p>
                )}
                {list.map((order) => {
                  const late = status !== "READY" && minutesSince(order.createdAt, now) >= 20;
                  const next = NEXT_STATUS[status];
                  const prev = PREVIOUS[status];
                  return (
                    <article key={order.id} className={`rounded-xl border-l-4 bg-stone-800 p-4 ${accent}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-2xl font-bold">Mesa {order.table}</div>
                        <div className={`text-sm ${late ? "font-semibold text-red-400" : "text-stone-400"}`}>
                          #{order.id} · {elapsedLabel(order.createdAt, now)}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="text-lg leading-snug">
                            <span className="font-bold text-white">{item.quantity}×</span> {item.name}
                            {Object.entries(item.selectedOptions).map(([k, v]) => (
                              <div key={k} className="ml-7 text-sm text-stone-300">
                                {k}: <b>{v}</b>
                              </div>
                            ))}
                            {item.notes && (
                              <div className="ml-7 mt-1 inline-block rounded bg-amber-400 px-2 py-0.5 text-sm font-semibold text-stone-900">
                                ⚠ {item.notes}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex gap-2">
                        {prev && (
                          <button
                            onClick={() => move(order, prev)}
                            className="rounded-lg bg-stone-700 px-3 py-2.5 text-sm text-stone-300"
                            title={`Volver a "${STATUS_LABEL[prev]}"`}
                          >
                            ↩
                          </button>
                        )}
                        {next && ACTION_LABEL[status] ? (
                          <button
                            onClick={() => move(order, next)}
                            className="flex-1 rounded-lg bg-white py-2.5 font-semibold text-stone-900 active:bg-stone-200"
                          >
                            {ACTION_LABEL[status]}
                          </button>
                        ) : (
                          <p className="flex-1 py-2.5 text-center text-sm text-emerald-400">
                            Esperando al mesero
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

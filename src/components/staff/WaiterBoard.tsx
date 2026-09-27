"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Sheet } from "@/components/Sheet";
import { formatCLP, shortId, STATUS_LABEL } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { beep } from "@/lib/sound";
import type { BoardDTO, CallDTO, OrderDTO } from "@/lib/types";
import { elapsedLabel, minutesSince, StaffHeader, useNow, useOnChange, useSound } from "./shared";

type Task =
  | { kind: "call"; key: string; table: number; since: number; call: CallDTO }
  | { kind: "order"; key: string; table: number; since: number; order: OrderDTO };

// Acciones del mesero; cada una devuelve true si salió bien.
type Actions = {
  deliver: (orderId: Id<"orders">) => Promise<boolean>;
  resolve: (callId: Id<"calls">) => Promise<boolean>;
  closeTable: (table: number) => Promise<boolean>;
};

type TableStatus = "free" | "occupied" | "kitchen" | "ready" | "bill" | "calling";

// Del más urgente al menos urgente: define el color de cada mesa en el salón.
const TABLE_STYLE: Record<TableStatus, { label: string; tile: string; dot: string }> = {
  calling: { label: "Llamando", tile: "bg-brand-500 text-white ring-brand-500", dot: "bg-white" },
  ready: { label: "Plato listo", tile: "bg-emerald-600 text-white ring-emerald-600", dot: "bg-white" },
  bill: { label: "Pide cuenta", tile: "bg-violet-600 text-white ring-violet-600", dot: "bg-white" },
  kitchen: { label: "En cocina", tile: "bg-white text-stone-900 ring-amber-400", dot: "bg-amber-400" },
  occupied: { label: "Ocupada", tile: "bg-white text-stone-900 ring-stone-300", dot: "bg-stone-400" },
  free: { label: "Libre", tile: "bg-stone-100 text-stone-400 ring-transparent", dot: "bg-stone-300" },
};

function tableStatus(board: BoardDTO, table: number): TableStatus {
  const calls = board.calls.filter((c) => c.table === table);
  if (calls.some((c) => c.type === "WAITER")) return "calling";
  if (board.orders.some((o) => o.table === table && o.status === "READY")) return "ready";
  const open = board.tables.find((t) => t.table === table);
  if (calls.some((c) => c.type === "BILL") || open?.billRequested) return "bill";
  if (board.orders.some((o) => o.table === table)) return "kitchen";
  return open ? "occupied" : "free";
}

export function WaiterBoard() {
  const { soundOn, enableSound } = useSound();
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [openTable, setOpenTable] = useState<number | null>(null);
  const board = useQuery(api.orders.board);
  const setStatus = useMutation(api.orders.setStatus);
  const resolveCall = useMutation(api.tables.resolveCall);
  const closeTable = useMutation(api.tables.close);

  useOnChange(board, (prev, next) => {
    const seenCalls = new Set(prev.calls.map((c) => c.id));
    const seenReady = new Set(prev.orders.filter((o) => o.status === "READY").map((o) => o.id));
    if (next.calls.some((c) => !seenCalls.has(c.id))) beep([988, 784, 988]);
    else if (next.orders.some((o) => o.status === "READY" && !seenReady.has(o.id))) beep([784, 1047]);
  });

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  const actions: Actions = {
    deliver: (orderId) => run(() => setStatus({ orderId, status: "DELIVERED" })),
    resolve: (callId) => run(() => resolveCall({ callId })),
    closeTable: (table) => run(() => closeTable({ tableNumber: table })),
  };

  const tasks: Task[] = board
    ? [
        ...board.calls.map((call): Task => ({
          kind: "call",
          key: `c${call.id}`,
          table: call.table,
          since: call.createdAt,
          call,
        })),
        ...board.orders
          .filter((o) => o.status === "READY")
          .map((order): Task => ({
            kind: "order",
            key: `o${order.id}`,
            table: order.table,
            since: order.updatedAt,
            order,
          })),
      ].sort((a, b) => a.since - b.since)
    : [];

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-stone-50 pb-10">
      <StaffHeader title="Mesero" soundOn={soundOn} onSoundOn={enableSound} />

      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <section className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          Por hacer
          {tasks.length > 0 && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">{tasks.length}</span>
          )}
        </h2>

        {board && tasks.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
            <div className="text-3xl">✓</div>
            <div className="mt-1 font-semibold">Todo al día</div>
            <div className="text-sm text-stone-500">Aquí aparecerán los platos listos y las mesas que llamen.</div>
          </div>
        )}

        <ul className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.key} task={task} now={now} actions={actions} onOpenTable={setOpenTable} />
          ))}
        </ul>
      </section>

      {board && (
        <section className="px-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Salón</h2>
            <span className="text-sm text-stone-500">
              {board.tables.length} de {board.tableNumbers.length} ocupadas
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {board.tableNumbers.map((n) => {
              const status = tableStatus(board, n);
              const style = TABLE_STYLE[status];
              const open = board.tables.find((t) => t.table === n);
              return (
                <button
                  key={n}
                  onClick={() => setOpenTable(n)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl ring-2 transition active:scale-95 ${style.tile} ${
                    status === "calling" ? "animate-pulse-ring" : ""
                  }`}
                >
                  <span className="text-3xl font-bold leading-none">{n}</span>
                  <span className="mt-1.5 flex items-center gap-1 text-xs font-medium opacity-90">
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                  {open && open.total > 0 && (
                    <span className="mt-0.5 text-xs tabular-nums opacity-75">{formatCLP(open.total)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {openTable !== null && board && (
        <TableDetail
          table={openTable}
          board={board}
          now={now}
          error={error}
          onClose={() => setOpenTable(null)}
          actions={actions}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  now,
  actions,
  onOpenTable,
}: {
  task: Task;
  now: number;
  actions: Actions;
  onOpenTable: (table: number) => void;
}) {
  const waiting = minutesSince(task.since, now);
  const color =
    task.kind === "order" ? "bg-emerald-600" : task.call.type === "BILL" ? "bg-violet-600" : "bg-brand-500";

  const title =
    task.kind === "order" ? "Llevar pedido" : task.call.type === "BILL" ? "Pide la cuenta" : "Llama al mesero";

  return (
    <li className="flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      <button
        onClick={() => onOpenTable(task.table)}
        className={`flex w-20 shrink-0 flex-col items-center justify-center text-white ${color}`}
        aria-label={`Ver mesa ${task.table}`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Mesa</span>
        <span className="text-3xl font-bold leading-none">{task.table}</span>
      </button>
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{title}</span>
          <span className={`shrink-0 text-xs ${waiting >= 5 ? "font-semibold text-red-600" : "text-stone-500"}`}>
            {elapsedLabel(task.since, now)}
          </span>
        </div>
        {task.kind === "order" && (
          <ul className="mt-1 text-sm text-stone-600">
            {task.order.items.map((item) => (
              <li key={item.id} className="truncate">
                <b>{item.quantity}×</b> {item.name}
                {Object.values(item.selectedOptions).length > 0 && (
                  <span className="text-stone-400"> · {Object.values(item.selectedOptions).join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() =>
            task.kind === "order"
              ? actions.deliver(task.order.id)
              : actions.resolve(task.call.id)
          }
          className="mt-2 w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white active:bg-stone-700"
        >
          {task.kind === "order" ? "Entregado" : "Atendido"}
        </button>
      </div>
    </li>
  );
}

function TableDetail({
  table,
  board,
  now,
  error,
  onClose,
  actions,
}: {
  table: number;
  board: BoardDTO;
  now: number;
  error: string | null;
  onClose: () => void;
  actions: Actions;
}) {
  const state = useQuery(api.tables.state, { tableNumber: table });
  const calls = board.calls.filter((c) => c.table === table);
  const undelivered = state?.orders.filter((o) => o.status !== "DELIVERED").length ?? 0;

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold">Mesa {table}</h2>
          <p className="text-sm text-stone-500">
            {TABLE_STYLE[tableStatus(board, table)].label}
            {state?.sessionOpen && state.orders.length > 0 && ` · ${state.orders.length} pedido(s)`}
          </p>
        </div>
        <button onClick={onClose} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium">
          Cerrar
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto p-5">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {calls.map((call) => (
          <div key={call.id} className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-500">
            <span className="flex-1 text-sm font-medium">
              {call.type === "BILL" ? "Pide la cuenta" : "Llama al mesero"} · {elapsedLabel(call.createdAt, now)}
            </span>
            <button
              onClick={() => actions.resolve(call.id)}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Atendido
            </button>
          </div>
        ))}

        {!state && <p className="py-6 text-center text-stone-500">Cargando…</p>}
        {state && !state.sessionOpen && (
          <p className="py-6 text-center text-stone-500">Mesa libre, sin cuenta abierta.</p>
        )}

        {state?.orders.map((order) => (
          <div key={order.id} className="rounded-xl p-3 ring-1 ring-stone-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">
                #{shortId(order.id)} · {elapsedLabel(order.createdAt, now)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  order.status === "READY"
                    ? "bg-emerald-100 text-emerald-800"
                    : order.status === "DELIVERED"
                      ? "bg-stone-100 text-stone-500"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>
                    <b>{item.quantity}×</b> {item.name}
                  </span>
                  <span className="tabular-nums text-stone-500">{formatCLP(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            {order.status === "READY" && (
              <button
                onClick={() => actions.deliver(order.id)}
                className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white"
              >
                Entregado
              </button>
            )}
          </div>
        ))}
      </div>

      {state?.sessionOpen && (
        <div className="space-y-2 border-t border-stone-200 p-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCLP(state.total)}</span>
          </div>
          <button
            disabled={undelivered > 0}
            onClick={async () => {
              if (!confirm(`¿Cobrar ${formatCLP(state.total)} y liberar la mesa ${table}?`)) return;
              if (await actions.closeTable(table)) onClose();
            }}
            className="w-full rounded-2xl bg-stone-900 py-3.5 font-semibold text-white disabled:bg-stone-300"
          >
            {undelivered > 0 ? `Faltan ${undelivered} pedido(s) por entregar` : "Cobrar y liberar mesa"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

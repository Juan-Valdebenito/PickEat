import { EventEmitter } from "node:events";

// Bus de eventos en memoria. Suficiente para un único proceso Node;
// con varias instancias habría que reemplazarlo por Redis pub/sub o similar.
export type LiveEvent =
  | { type: "order.created"; table: number; orderId: number }
  | { type: "order.updated"; table: number; orderId: number; status: string }
  | { type: "call.created"; table: number; callType: string }
  | { type: "call.resolved"; table: number }
  | { type: "session.closed"; table: number };

const globalForBus = globalThis as unknown as { liveBus?: EventEmitter };

export const liveBus = globalForBus.liveBus ?? new EventEmitter();
liveBus.setMaxListeners(0);
globalForBus.liveBus = liveBus;

export function publish(event: LiveEvent) {
  liveBus.emit("event", event);
}

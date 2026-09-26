export const ORDER_STATUSES = ["RECEIVED", "PREPARING", "READY", "DELIVERED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "Recibido",
  PREPARING: "En preparación",
  READY: "Listo",
  DELIVERED: "Entregado",
};

// Transiciones permitidas: cocina avanza RECEIVED → PREPARING → READY,
// el mesero marca READY → DELIVERED. Se permite retroceder un paso por errores.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
  DELIVERED: null,
};

export function isValidTransition(from: OrderStatus, to: OrderStatus) {
  const i = ORDER_STATUSES.indexOf(from);
  const j = ORDER_STATUSES.indexOf(to);
  return Math.abs(i - j) === 1;
}

export const CALL_TYPES = ["WAITER", "BILL"] as const;
export type CallType = (typeof CALL_TYPES)[number];

export const CALL_LABEL: Record<CallType, string> = {
  WAITER: "Llama al mesero",
  BILL: "Pide la cuenta",
};

export function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);
}

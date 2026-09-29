import "server-only";
import { prisma } from "./db";
import {
  closeTable,
  createCall,
  createOrder,
  getBoard,
  getMenu,
  resolveCall,
  updateOrderStatus,
} from "./service";
import type { NewOrderItem } from "./types";

// Simulador de servicio para demos.
//
// En Vercel no hay procesos en segundo plano, así que la simulación avanza "a pedido":
// cada vez que una pantalla del personal consulta el servidor (cocina, mesero o panel,
// cada 3 s), se llama a `demoTick()`, que como máximo ejecuta un paso cada TICK_MS.
// Un update condicional en la base funciona como candado para que dos pantallas
// abiertas no simulen el mismo paso dos veces.

const TICK_MS = 8_000;
const DEFAULT_MINUTES = 15;
const MAX_OPEN_TABLES = 7;
// Con tantos pedidos en curso los clientes dejan de pedir, para que la cocina no se sature.
const MAX_ACTIVE_ORDERS = 8;
// Cuántas cosas puede avanzar el "personal simulado" en cada paso.
const STAFF_STEPS_PER_TICK = 2;

// Cuánto espera cada etapa antes de que el simulador la avance sola.
// Son tiempos largos a propósito: dejan margen para mostrar los botones a mano.
const AUTO_ADVANCE_MS = {
  RECEIVED: 45_000,
  PREPARING: 60_000,
  READY: 40_000,
  CALL: 35_000,
  CLOSE: 40_000,
};

const NOTES = ["sin cebolla", "salsa aparte", "sin sal", "bien caliente", "para compartir", "sin hielo"];

export type DemoStatus = { active: boolean; activeUntil: string | null };

export async function getDemoStatus(): Promise<DemoStatus> {
  const state = await prisma.demoState.findUnique({ where: { id: 1 } });
  const active = !!state?.activeUntil && state.activeUntil > new Date();
  return { active, activeUntil: active ? state!.activeUntil!.toISOString() : null };
}

export async function startDemo(minutes = DEFAULT_MINUTES) {
  const activeUntil = new Date(Date.now() + minutes * 60_000);
  await prisma.demoState.upsert({
    where: { id: 1 },
    create: { id: 1, activeUntil, lastTickAt: null },
    update: { activeUntil, lastTickAt: null },
  });
  // El primer paso se da de inmediato para que se note que arrancó.
  await demoTick();
}

export async function stopDemo() {
  await prisma.demoState.upsert({
    where: { id: 1 },
    create: { id: 1, activeUntil: null },
    update: { activeUntil: null },
  });
}

// Ejecuta un paso de simulación si está activa y ya pasó TICK_MS desde el anterior.
// Nunca lanza errores: la simulación no debe romper las pantallas que la disparan.
export async function demoTick() {
  try {
    const now = new Date();
    const { count } = await prisma.demoState.updateMany({
      where: {
        id: 1,
        activeUntil: { gt: now },
        OR: [{ lastTickAt: null }, { lastTickAt: { lt: new Date(now.getTime() - TICK_MS) } }],
      },
      data: { lastTickAt: now },
    });
    if (count === 0) return;

    for (let i = 0; i < STAFF_STEPS_PER_TICK; i++) await advanceOneStep(now.getTime());
    await customersAct();
  } catch (err) {
    console.warn("[demo] paso de simulación omitido:", err instanceof Error ? err.message : err);
  }
}

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const chance = (p: number) => Math.random() < p;
const age = (iso: string, now: number) => now - new Date(iso).getTime();

// El "personal simulado": avanza como máximo una cosa por paso, empezando por lo más antiguo.
async function advanceOneStep(now: number) {
  const board = await getBoard();

  const call = board.calls.find((c) => c.type === "WAITER" && age(c.createdAt, now) > AUTO_ADVANCE_MS.CALL);
  if (call) return resolveCall(call.id);

  for (const status of ["READY", "PREPARING", "RECEIVED"] as const) {
    const order = board.orders.find((o) => o.status === status && age(o.updatedAt, now) > AUTO_ADVANCE_MS[status]);
    if (order) {
      const next = status === "RECEIVED" ? "PREPARING" : status === "PREPARING" ? "READY" : "DELIVERED";
      return updateOrderStatus(order.id, next);
    }
  }

  // Mesas que pidieron la cuenta y ya recibieron todo: se cobran y se liberan cuando el
  // llamado lleva rato esperando o cuando el mesero ya lo marcó como atendido.
  const table = board.tables.find((t) => {
    if (!t.billRequested || t.undelivered > 0) return false;
    const billCall = board.calls.find((c) => c.table === t.table && c.type === "BILL");
    return !billCall || age(billCall.createdAt, now) > AUTO_ADVANCE_MS.CLOSE;
  });
  if (table) return closeTable(table.table);
}

// Los "clientes simulados": a lo más una acción por paso.
async function customersAct() {
  const [board, menu] = await Promise.all([getBoard(), getMenu()]);
  const open = board.tables;
  const free = board.tableNumbers.filter((n) => !open.some((t) => t.table === n));
  const categories = menu.map((c) => ({ ...c, products: c.products.filter((p) => p.available) }));
  const kitchenFull = board.orders.length >= MAX_ACTIVE_ORDERS;
  const roll = Math.random();

  // Llega una mesa nueva y pide.
  if (roll < 0.35) {
    if (!kitchenFull && free.length > 0 && open.length < MAX_OPEN_TABLES) {
      return createOrder(pick(free), randomOrder(categories, "first"));
    }
    return;
  }

  const candidates = open.filter((t) => !t.billRequested);
  if (candidates.length === 0) return;
  const table = pick(candidates);

  // Otra ronda: bebidas o postres.
  if (roll < 0.5) {
    if (!kitchenFull) return createOrder(table.table, randomOrder(categories, "more"));
    return;
  }

  // Alguien llama al mesero.
  if (roll < 0.62) return createCall(table.table, "WAITER");

  // Pide la cuenta una mesa que ya recibió todo.
  const served = candidates.filter((t) => t.undelivered === 0 && t.total > 0);
  if (roll < 0.8 && served.length > 0) return createCall(pick(served).table, "BILL");
}

type Categories = Awaited<ReturnType<typeof getMenu>>;

function randomOrder(categories: Categories, round: "first" | "more"): NewOrderItem[] {
  const byName = (name: string) => categories.find((c) => c.name === name)?.products ?? [];
  const pools =
    round === "first"
      ? [byName("Fondos"), byName("Bebidas"), chance(0.5) ? byName("Entradas") : []]
      : [chance(0.5) ? byName("Postres") : byName("Bebidas")];

  const items: NewOrderItem[] = [];
  for (const pool of pools) {
    if (pool.length === 0) continue;
    const product = pick(pool);
    if (items.some((i) => i.productId === product.id)) continue;
    items.push({
      productId: product.id,
      quantity: chance(0.3) ? 2 : 1,
      selectedOptions: Object.fromEntries(product.options.map((o) => [o.name, pick(o.choices)])),
      notes: chance(0.25) ? pick(NOTES) : "",
    });
  }
  // Por si la carta tiene todo agotado en esas categorías, se pide cualquier cosa disponible.
  if (items.length === 0) {
    const any = categories.flatMap((c) => c.products);
    if (any.length === 0) return [];
    const product = pick(any);
    items.push({
      productId: product.id,
      quantity: 1,
      selectedOptions: Object.fromEntries(product.options.map((o) => [o.name, pick(o.choices)])),
      notes: "",
    });
  }
  return items;
}

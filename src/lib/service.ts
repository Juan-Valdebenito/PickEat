import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import {
  CALL_TYPES,
  ORDER_STATUSES,
  isValidTransition,
  type CallType,
  type OrderStatus,
} from "./constants";
import type {
  BoardDTO,
  MenuCategory,
  NewOrderItem,
  OrderDTO,
  ProductOption,
  TableStateDTO,
} from "./types";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const orderInclude = {
  items: true,
  session: { select: { table: { select: { number: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toOrderDTO(order: OrderWithRelations): OrderDTO {
  return {
    id: order.id,
    table: order.session.table.number,
    status: order.status as OrderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedOptions: parseJSON(item.selectedOptions, {}),
      notes: item.notes,
    })),
  };
}

function orderTotal(order: { items: { unitPrice: number; quantity: number }[] }) {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

async function getTableOrThrow(number: number) {
  const table = await prisma.table.findUnique({ where: { number } });
  if (!table) throw new ServiceError(`La mesa ${number} no existe`, 404);
  return table;
}

function findOpenSession(tableId: number) {
  return prisma.tableSession.findFirst({
    where: { tableId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

async function getOrOpenSession(tableId: number) {
  return (await findOpenSession(tableId)) ?? prisma.tableSession.create({ data: { tableId } });
}

// ---------- Carta ----------

export async function getMenu(): Promise<MenuCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { position: "asc" },
    include: { products: { orderBy: { id: "asc" } } },
  });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
      available: p.available,
      options: parseJSON<ProductOption[]>(p.options, []),
    })),
  }));
}

export async function tableExists(number: number) {
  return (await prisma.table.count({ where: { number } })) > 0;
}

// ---------- Cliente ----------

export async function getTableState(number: number): Promise<TableStateDTO> {
  const table = await getTableOrThrow(number);
  const session = await findOpenSession(table.id);
  if (!session) {
    return { table: number, sessionOpen: false, billRequested: false, orders: [], total: 0, pendingCalls: [] };
  }
  const [orders, calls] = await Promise.all([
    prisma.order.findMany({
      where: { sessionId: session.id },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.waiterCall.findMany({ where: { sessionId: session.id, resolvedAt: null } }),
  ]);
  return {
    table: number,
    sessionOpen: true,
    billRequested: session.billRequested,
    orders: orders.map(toOrderDTO),
    total: orders.reduce((sum, o) => sum + orderTotal(o), 0),
    pendingCalls: [...new Set(calls.map((c) => c.type as CallType))],
  };
}

export async function createOrder(tableNumber: number, items: NewOrderItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ServiceError("El pedido está vacío");
  }
  if (items.length > 50) throw new ServiceError("Demasiados productos en un solo pedido");

  const table = await getTableOrThrow(tableNumber);
  const productIds = [...new Set(items.map((i) => Number(i.productId)))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Se valida todo contra la base: precio y nombre salen del servidor, nunca del cliente.
  const rows = items.map((item) => {
    const product = byId.get(Number(item.productId));
    if (!product) throw new ServiceError("Uno de los productos ya no existe");
    if (!product.available) throw new ServiceError(`"${product.name}" está agotado`);

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new ServiceError(`Cantidad inválida para "${product.name}"`);
    }

    const options = parseJSON<ProductOption[]>(product.options, []);
    const selected: Record<string, string> = {};
    for (const option of options) {
      const choice = item.selectedOptions?.[option.name];
      if (!choice || !option.choices.includes(choice)) {
        throw new ServiceError(`Elige "${option.name}" para "${product.name}"`);
      }
      selected[option.name] = choice;
    }

    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      selectedOptions: JSON.stringify(selected),
      notes: String(item.notes ?? "").trim().slice(0, 200),
    };
  });

  const session = await getOrOpenSession(table.id);
  const order = await prisma.order.create({
    data: { sessionId: session.id, items: { create: rows } },
    include: orderInclude,
  });

  return toOrderDTO(order);
}

export async function createCall(tableNumber: number, type: string) {
  if (!CALL_TYPES.includes(type as CallType)) throw new ServiceError("Tipo de llamado inválido");
  const table = await getTableOrThrow(tableNumber);
  const session = await getOrOpenSession(table.id);

  if (type === "BILL") {
    await prisma.tableSession.update({ where: { id: session.id }, data: { billRequested: true } });
  }

  // Evita llamados duplicados si el cliente presiona el botón varias veces.
  const existing = await prisma.waiterCall.findFirst({
    where: { sessionId: session.id, type, resolvedAt: null },
  });
  if (!existing) {
    await prisma.waiterCall.create({ data: { sessionId: session.id, type } });
  }
}

// ---------- Cocina y mesero ----------

export async function getBoard(): Promise<BoardDTO> {
  const [orders, calls, sessions, allTables] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "DELIVERED" } },
      include: orderInclude,
      orderBy: { createdAt: "asc" },
    }),
    prisma.waiterCall.findMany({
      where: { resolvedAt: null },
      include: { session: { select: { table: { select: { number: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tableSession.findMany({
      where: { closedAt: null },
      include: {
        table: { select: { number: true } },
        orders: { select: { status: true, items: { select: { unitPrice: true, quantity: true } } } },
      },
      orderBy: { table: { number: "asc" } },
    }),
    prisma.table.findMany({ select: { number: true }, orderBy: { number: "asc" } }),
  ]);

  return {
    orders: orders.map(toOrderDTO),
    calls: calls.map((c) => ({
      id: c.id,
      table: c.session.table.number,
      type: c.type as CallType,
      createdAt: c.createdAt.toISOString(),
    })),
    tables: sessions.map((s) => ({
      table: s.table.number,
      openedAt: s.openedAt.toISOString(),
      billRequested: s.billRequested,
      total: s.orders.reduce((sum, o) => sum + orderTotal(o), 0),
      undelivered: s.orders.filter((o) => o.status !== "DELIVERED").length,
    })),
    tableNumbers: allTables.map((t) => t.number),
  };
}

export async function updateOrderStatus(orderId: number, status: string) {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) throw new ServiceError("Estado inválido");
  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (!current) throw new ServiceError("El pedido no existe", 404);
  if (!isValidTransition(current.status as OrderStatus, status as OrderStatus)) {
    throw new ServiceError("Cambio de estado no permitido", 409);
  }

  // updateMany con el estado previo en el filtro evita que dos pantallas
  // pisen el cambio de la otra al mismo tiempo.
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: current.status },
    data: { status },
  });
  if (count === 0) throw new ServiceError("El pedido cambió mientras tanto, recarga", 409);

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  return toOrderDTO(order);
}

export async function resolveCall(callId: number) {
  const call = await prisma.waiterCall.findUnique({
    where: { id: callId },
    include: { session: { select: { table: { select: { number: true } } } } },
  });
  if (!call) throw new ServiceError("El llamado no existe", 404);
  if (!call.resolvedAt) {
    await prisma.waiterCall.update({ where: { id: callId }, data: { resolvedAt: new Date() } });
  }
}

export async function closeTable(tableNumber: number) {
  const table = await getTableOrThrow(tableNumber);
  const session = await findOpenSession(table.id);
  if (!session) throw new ServiceError("La mesa no tiene una cuenta abierta", 409);

  const pending = await prisma.order.count({
    where: { sessionId: session.id, status: { not: "DELIVERED" } },
  });
  if (pending > 0) {
    throw new ServiceError(`Quedan ${pending} pedido(s) sin entregar en la mesa ${tableNumber}`, 409);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.waiterCall.updateMany({
      where: { sessionId: session.id, resolvedAt: null },
      data: { resolvedAt: now },
    }),
    prisma.tableSession.update({ where: { id: session.id }, data: { closedAt: now } }),
  ]);
}

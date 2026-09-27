import { v } from "convex/values";
import { isValidTransition } from "../src/lib/constants";
import { mutation, query } from "./_generated/server";
import { assertTableExists, fail, getOrOpenSession, orderTotal, toOrderDTO } from "./model";
import { orderStatus } from "./schema";

export const create = mutation({
  args: {
    tableNumber: v.number(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        selectedOptions: v.record(v.string(), v.string()),
        notes: v.string(),
      }),
    ),
  },
  handler: async (ctx, { tableNumber, items }) => {
    if (items.length === 0) fail("El pedido está vacío");
    if (items.length > 50) fail("Demasiados productos en un solo pedido");
    await assertTableExists(ctx, tableNumber);

    // Se valida todo contra la base: precio y nombre salen del servidor, nunca del cliente.
    const rows = [];
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product) fail("Uno de los productos ya no existe");
      if (!product.available) fail(`"${product.name}" está agotado`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        fail(`Cantidad inválida para "${product.name}"`);
      }

      const selected: Record<string, string> = {};
      for (const option of product.options) {
        const choice = item.selectedOptions[option.name];
        if (!choice || !option.choices.includes(choice)) {
          fail(`Elige "${option.name}" para "${product.name}"`);
        }
        selected[option.name] = choice;
      }

      rows.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        selectedOptions: selected,
        notes: item.notes.trim().slice(0, 200),
      });
    }

    const session = await getOrOpenSession(ctx, tableNumber);
    const id = await ctx.db.insert("orders", {
      sessionId: session._id,
      tableNumber,
      status: "RECEIVED",
      updatedAt: Date.now(),
      items: rows,
    });
    return id;
  },
});

// Cocina avanza RECEIVED → PREPARING → READY; el mesero marca DELIVERED.
// Las mutaciones de Convex son transaccionales, así que dos pantallas no pueden pisarse.
export const setStatus = mutation({
  args: { orderId: v.id("orders"), status: orderStatus },
  handler: async (ctx, { orderId, status }) => {
    const order = await ctx.db.get(orderId);
    if (!order) fail("El pedido no existe");
    if (!isValidTransition(order.status, status)) fail("Cambio de estado no permitido");
    await ctx.db.patch(orderId, { status, updatedAt: Date.now() });
  },
});

// Tablero de cocina y mesero: pedidos activos, llamados pendientes y mesas abiertas.
export const board = query({
  args: {},
  handler: async (ctx) => {
    const [received, preparing, ready, calls, sessions, tables] = await Promise.all([
      ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "RECEIVED")).collect(),
      ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "PREPARING")).collect(),
      ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", "READY")).collect(),
      ctx.db.query("calls").withIndex("by_open", (q) => q.eq("resolvedAt", undefined)).collect(),
      ctx.db.query("sessions").withIndex("by_open", (q) => q.eq("closedAt", undefined)).collect(),
      ctx.db.query("tables").withIndex("by_number").collect(),
    ]);

    const active = [...received, ...preparing, ...ready].sort((a, b) => a._creationTime - b._creationTime);

    const openTables = await Promise.all(
      sessions.map(async (s) => {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        return {
          table: s.tableNumber,
          openedAt: s._creationTime,
          billRequested: s.billRequested,
          total: orders.reduce((sum, o) => sum + orderTotal(o), 0),
          undelivered: orders.filter((o) => o.status !== "DELIVERED").length,
        };
      }),
    );

    return {
      orders: active.map(toOrderDTO),
      calls: calls
        .sort((a, b) => a._creationTime - b._creationTime)
        .map((c) => ({ id: c._id, table: c.tableNumber, type: c.type, createdAt: c._creationTime })),
      tables: openTables.sort((a, b) => a.table - b.table),
      tableNumbers: tables.map((t) => t.number),
    };
  },
});

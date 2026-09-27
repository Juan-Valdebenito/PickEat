import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertTableExists, fail, findOpenSession, getOrOpenSession, orderTotal, toOrderDTO } from "./model";
import { callType } from "./schema";

// Estado de la cuenta de una mesa (vista del cliente y detalle del mesero).
export const state = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, { tableNumber }) => {
    await assertTableExists(ctx, tableNumber);
    const session = await findOpenSession(ctx, tableNumber);
    if (!session) {
      return {
        table: tableNumber,
        sessionOpen: false,
        billRequested: false,
        orders: [],
        total: 0,
        pendingCalls: [] as ("WAITER" | "BILL")[],
      };
    }
    const [orders, calls] = await Promise.all([
      ctx.db
        .query("orders")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("calls")
        .withIndex("by_session_open", (q) => q.eq("sessionId", session._id).eq("resolvedAt", undefined))
        .collect(),
    ]);
    return {
      table: tableNumber,
      sessionOpen: true,
      billRequested: session.billRequested,
      orders: orders.map(toOrderDTO),
      total: orders.reduce((sum, o) => sum + orderTotal(o), 0),
      pendingCalls: [...new Set(calls.map((c) => c.type))],
    };
  },
});

export const callWaiter = mutation({
  args: { tableNumber: v.number(), type: callType },
  handler: async (ctx, { tableNumber, type }) => {
    await assertTableExists(ctx, tableNumber);
    const session = await getOrOpenSession(ctx, tableNumber);
    if (type === "BILL") await ctx.db.patch(session._id, { billRequested: true });

    // Evita llamados duplicados si el cliente presiona el botón varias veces.
    const pending = await ctx.db
      .query("calls")
      .withIndex("by_session_open", (q) => q.eq("sessionId", session._id).eq("resolvedAt", undefined))
      .collect();
    if (!pending.some((c) => c.type === type)) {
      await ctx.db.insert("calls", { sessionId: session._id, tableNumber, type });
    }
  },
});

export const resolveCall = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, { callId }) => {
    const call = await ctx.db.get(callId);
    if (!call) fail("El llamado no existe");
    if (call.resolvedAt === undefined) await ctx.db.patch(callId, { resolvedAt: Date.now() });
  },
});

export const close = mutation({
  args: { tableNumber: v.number() },
  handler: async (ctx, { tableNumber }) => {
    const session = await findOpenSession(ctx, tableNumber);
    if (!session) fail("La mesa no tiene una cuenta abierta");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    const pending = orders.filter((o) => o.status !== "DELIVERED").length;
    if (pending > 0) fail(`Quedan ${pending} pedido(s) sin entregar en la mesa ${tableNumber}`);

    const now = Date.now();
    const calls = await ctx.db
      .query("calls")
      .withIndex("by_session_open", (q) => q.eq("sessionId", session._id).eq("resolvedAt", undefined))
      .collect();
    await Promise.all(calls.map((c) => ctx.db.patch(c._id, { resolvedAt: now })));
    await ctx.db.patch(session._id, { closedAt: now });
  },
});

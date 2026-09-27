import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Errores de negocio: llegan al cliente con su mensaje en `error.data`.
export function fail(message: string): never {
  throw new ConvexError(message);
}

export async function assertTableExists(ctx: QueryCtx, tableNumber: number) {
  const table = await ctx.db
    .query("tables")
    .withIndex("by_number", (q) => q.eq("number", tableNumber))
    .unique();
  if (!table) fail(`La mesa ${tableNumber} no existe`);
  return table;
}

export function findOpenSession(ctx: QueryCtx, tableNumber: number) {
  return ctx.db
    .query("sessions")
    .withIndex("by_table_open", (q) => q.eq("tableNumber", tableNumber).eq("closedAt", undefined))
    .first();
}

export async function getOrOpenSession(ctx: MutationCtx, tableNumber: number) {
  const open = await findOpenSession(ctx, tableNumber);
  if (open) return open;
  const id = await ctx.db.insert("sessions", { tableNumber, billRequested: false });
  return (await ctx.db.get(id))!;
}

export function orderTotal(order: Pick<Doc<"orders">, "items">) {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function toOrderDTO(order: Doc<"orders">) {
  return {
    id: order._id,
    table: order.tableNumber,
    status: order.status,
    createdAt: order._creationTime,
    updatedAt: order.updatedAt,
    items: order.items.map((item, i) => ({
      id: `${order._id}-${i}`,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedOptions: item.selectedOptions,
      notes: item.notes,
    })),
  };
}

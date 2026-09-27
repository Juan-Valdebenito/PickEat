import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orderStatus = v.union(
  v.literal("RECEIVED"),
  v.literal("PREPARING"),
  v.literal("READY"),
  v.literal("DELIVERED"),
);

export const callType = v.union(v.literal("WAITER"), v.literal("BILL"));

const productOption = v.object({ name: v.string(), choices: v.array(v.string()) });

export default defineSchema({
  tables: defineTable({
    number: v.number(),
  }).index("by_number", ["number"]),

  categories: defineTable({
    name: v.string(),
    position: v.number(),
  }).index("by_position", ["position"]),

  products: defineTable({
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    price: v.number(), // CLP, sin decimales
    imageUrl: v.optional(v.string()),
    available: v.boolean(),
    options: v.array(productOption),
  }).index("by_category", ["categoryId"]),

  // La "cuenta" de una mesa: se abre con el primer pedido o llamado
  // y se cierra cuando el mesero libera la mesa.
  sessions: defineTable({
    tableNumber: v.number(),
    closedAt: v.optional(v.number()),
    billRequested: v.boolean(),
  })
    .index("by_table_open", ["tableNumber", "closedAt"])
    .index("by_open", ["closedAt"]),

  orders: defineTable({
    sessionId: v.id("sessions"),
    tableNumber: v.number(),
    status: orderStatus,
    updatedAt: v.number(),
    // Copia de nombre y precio al momento del pedido
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        unitPrice: v.number(),
        quantity: v.number(),
        selectedOptions: v.record(v.string(), v.string()),
        notes: v.string(),
      }),
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  calls: defineTable({
    sessionId: v.id("sessions"),
    tableNumber: v.number(),
    type: callType,
    resolvedAt: v.optional(v.number()),
  })
    .index("by_session_open", ["sessionId", "resolvedAt"])
    .index("by_open", ["resolvedAt"]),
});

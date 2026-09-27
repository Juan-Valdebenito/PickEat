import { v } from "convex/values";
import { query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").withIndex("by_position").collect();
    return Promise.all(
      categories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", category._id))
          .collect();
        return {
          id: category._id,
          name: category.name,
          products: products.map((p) => ({
            id: p._id,
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.imageUrl ?? null,
            available: p.available,
            options: p.options,
          })),
        };
      }),
    );
  },
});

export const tableNumbers = query({
  args: {},
  handler: async (ctx) => {
    const tables = await ctx.db.query("tables").withIndex("by_number").collect();
    return tables.map((t) => t.number);
  },
});

export const tableExists = query({
  args: { tableNumber: v.number() },
  handler: async (ctx, { tableNumber }) => {
    const table = await ctx.db
      .query("tables")
      .withIndex("by_number", (q) => q.eq("number", tableNumber))
      .unique();
    return table !== null;
  },
});

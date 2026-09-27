import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { MENU, TABLE_COUNT } from "./data";

const ALL_TABLES = ["calls", "orders", "sessions", "products", "categories", "tables"] as const;

// Carga las mesas y la carta de `data.ts`.
// Sin `reset` solo carga si la base está vacía; con `reset: true` borra todo antes.
// Uso: `pnpm seed` o `pnpm seed:reset`.
export const run = internalMutation({
  args: { reset: v.optional(v.boolean()) },
  handler: async (ctx, { reset }) => {
    const hasData = (await ctx.db.query("tables").first()) !== null;
    if (hasData && !reset) {
      return "La base ya tiene datos, no se cargó el seed (usa pnpm seed:reset para recargar).";
    }

    for (const table of ALL_TABLES) {
      for (const doc of await ctx.db.query(table).collect()) await ctx.db.delete(doc._id);
    }

    for (let number = 1; number <= TABLE_COUNT; number++) {
      await ctx.db.insert("tables", { number });
    }

    let productCount = 0;
    for (const [position, category] of MENU.entries()) {
      const categoryId = await ctx.db.insert("categories", { name: category.name, position });
      for (const p of category.products) {
        await ctx.db.insert("products", {
          categoryId,
          name: p.name,
          description: p.description,
          price: p.price,
          available: p.available ?? true,
          options: p.options ?? [],
        });
        productCount++;
      }
    }

    return `Seed listo: ${TABLE_COUNT} mesas y ${productCount} productos.`;
  },
});

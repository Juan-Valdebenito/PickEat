import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// Los tipos salen directamente de lo que devuelven las funciones de Convex.
export type MenuCategory = FunctionReturnType<typeof api.menu.get>[number];
export type MenuProduct = MenuCategory["products"][number];
export type ProductOption = MenuProduct["options"][number];

export type TableStateDTO = FunctionReturnType<typeof api.tables.state>;
export type BoardDTO = FunctionReturnType<typeof api.orders.board>;
export type OrderDTO = BoardDTO["orders"][number];
export type CallDTO = BoardDTO["calls"][number];

// Payload que envía el cliente al confirmar el carrito
export type NewOrderItem = {
  productId: Id<"products">;
  quantity: number;
  selectedOptions: Record<string, string>;
  notes: string;
};

import type { CallType, OrderStatus } from "./constants";

export type ProductOption = { name: string; choices: string[] };

export type MenuProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  available: boolean;
  options: ProductOption[];
};

export type MenuCategory = { id: number; name: string; products: MenuProduct[] };

export type OrderItemDTO = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: Record<string, string>;
  notes: string;
};

export type OrderDTO = {
  id: number;
  table: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDTO[];
};

export type CallDTO = { id: number; table: number; type: CallType; createdAt: string };

export type TableStateDTO = {
  table: number;
  sessionOpen: boolean;
  billRequested: boolean;
  orders: OrderDTO[];
  total: number;
  pendingCalls: CallType[];
};

export type OpenTableDTO = {
  table: number;
  openedAt: string;
  billRequested: boolean;
  total: number;
  undelivered: number;
};

export type BoardDTO = {
  orders: OrderDTO[];
  calls: CallDTO[];
  tables: OpenTableDTO[];
  // Todas las mesas del local, para dibujar el salón completo
  tableNumbers: number[];
};

// Payload que envía el cliente al confirmar el carrito
export type NewOrderItem = {
  productId: number;
  quantity: number;
  selectedOptions: Record<string, string>;
  notes: string;
};

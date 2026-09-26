"use client";

import { useEffect, useState } from "react";
import type { MenuProduct } from "@/lib/types";

export type CartLine = {
  key: string;
  product: MenuProduct;
  quantity: number;
  selectedOptions: Record<string, string>;
  notes: string;
};

// Dos líneas con el mismo producto, opciones y comentario se fusionan.
export function lineKey(productId: number, options: Record<string, string>, notes: string) {
  return JSON.stringify([productId, Object.entries(options).sort(), notes.trim()]);
}

// Carrito por mesa, guardado en el navegador para no perderlo si se recarga la página.
export function useCart(table: number, products: MenuProduct[]) {
  const storageKey = `cart:mesa:${table}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const byId = new Map(products.map((p) => [p.id, p]));
        const saved = JSON.parse(raw) as (Omit<CartLine, "product"> & { productId: number })[];
        // Se rehidrata con los datos actuales de la carta (precio, disponibilidad).
        setLines(
          saved.flatMap(({ productId, ...rest }) => {
            const product = byId.get(productId);
            return product && product.available ? [{ ...rest, product }] : [];
          }),
        );
      }
    } catch {}
    setLoaded(true);
  }, [storageKey, products]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(lines.map(({ product, ...rest }) => ({ ...rest, productId: product.id }))),
      );
    } catch {}
  }, [lines, loaded, storageKey]);

  function add(line: Omit<CartLine, "key">) {
    const key = lineKey(line.product.id, line.selectedOptions, line.notes);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l));
      }
      return [...prev, { ...line, notes: line.notes.trim(), key }];
    });
  }

  function setQuantity(key: string, quantity: number) {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );
  }

  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.quantity * l.product.price, 0);

  return { lines, add, setQuantity, clear: () => setLines([]), count, total };
}

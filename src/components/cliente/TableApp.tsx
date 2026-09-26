"use client";

import { useMemo, useState } from "react";
import { formatCLP } from "@/lib/constants";
import type { MenuCategory, MenuProduct, TableStateDTO } from "@/lib/types";
import { useLiveData } from "@/lib/use-live";
import { AccountView } from "./AccountView";
import { useCart } from "./cart";
import { CartSheet } from "./CartSheet";
import { ProductImage } from "./ProductImage";
import { ProductSheet } from "./ProductSheet";

type Props = { table: number; menu: MenuCategory[] };

export function TableApp({ table, menu }: Props) {
  const products = useMemo(() => menu.flatMap((c) => c.products), [menu]);
  const cart = useCart(table, products);
  const live = useLiveData<TableStateDTO>(`/api/mesas/${table}`);

  const [view, setView] = useState<"carta" | "cuenta">("carta");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  const activeOrders = live.data?.orders.filter((o) => o.status !== "DELIVERED").length ?? 0;

  return (
    <div className="mx-auto min-h-dvh max-w-xl bg-stone-50 pb-32">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-600">Restaurante</div>
            <h1 className="text-lg font-bold">Mesa {table}</h1>
          </div>
          <div className="flex rounded-full bg-stone-100 p-1 text-sm font-medium">
            <TabButton active={view === "carta"} onClick={() => setView("carta")}>
              Carta
            </TabButton>
            <TabButton active={view === "cuenta"} onClick={() => setView("cuenta")}>
              Mi cuenta
              {activeOrders > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs text-white">
                  {activeOrders}
                </span>
              )}
            </TabButton>
          </div>
        </div>
        {view === "carta" && (
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
            {menu.map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700"
              >
                {c.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      {view === "carta" ? (
        <main className="px-4">
          {menu.map((category) => (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32 pt-6">
              <h2 className="mb-3 text-xl font-bold">{category.name}</h2>
              <div className="space-y-3">
                {category.products.map((product) => (
                  <button
                    key={product.id}
                    disabled={!product.available}
                    onClick={() => setSelected(product)}
                    className="flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{product.name}</div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{product.description}</p>
                      <div className="mt-2 font-semibold text-brand-700">
                        {product.available ? formatCLP(product.price) : "Agotado"}
                      </div>
                    </div>
                    <ProductImage product={product} className="h-24 w-24 shrink-0 rounded-xl" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </main>
      ) : (
        <AccountView table={table} state={live.data} error={live.error} onToast={showToast} />
      )}

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-brand-500 px-5 py-4 font-semibold text-white shadow-lg active:bg-brand-600"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-sm">
                {cart.count}
              </span>
              Ver mi pedido
            </span>
            <span>{formatCLP(cart.total)}</span>
          </button>
        </div>
      )}

      {selected && (
        <ProductSheet
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={(line) => {
            cart.add(line);
            setSelected(null);
            showToast(`${line.quantity} × ${line.product.name} agregado`);
          }}
        />
      )}

      {cartOpen && (
        <CartSheet
          table={table}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onSent={() => {
            cart.clear();
            setCartOpen(false);
            setView("cuenta");
            live.refresh();
            showToast("¡Pedido enviado a cocina!");
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center rounded-full px-3 py-1.5 transition ${
        active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
      }`}
    >
      {children}
    </button>
  );
}

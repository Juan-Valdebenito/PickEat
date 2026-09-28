"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCLP } from "@/lib/constants";
import type { AdminDTO, MenuProduct, SalesSummaryDTO } from "@/lib/types";
import { useLiveData } from "@/lib/use-live";
import { sendJSON } from "@/components/staff/shared";

export function AdminPanel() {
  const live = useLiveData<AdminDTO>("/api/admin");
  const [tab, setTab] = useState<"ventas" | "carta">("ventas");
  const summary = live.data?.summary;

  return (
    <div className="mx-auto min-h-dvh max-w-4xl bg-stone-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-stone-500">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold">Panel del dueño</h1>
            {summary && <p className="text-xs text-stone-500">{formatDate(summary.date)}</p>}
          </div>
          <div className="ml-auto flex rounded-full bg-stone-100 p-1 text-sm font-medium">
            {(["ventas", "carta"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 transition ${
                  tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
                }`}
              >
                {t === "ventas" ? "Ventas de hoy" : "Carta"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {live.error && <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{live.error}</div>}
      {!live.data && !live.error && <p className="p-8 text-center text-stone-500">Cargando…</p>}

      {live.data &&
        (tab === "ventas" ? (
          <SalesView summary={live.data.summary} />
        ) : (
          <MenuEditor menu={live.data.menu} onSaved={live.refresh} />
        ))}
    </div>
  );
}

function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

// ---------- Ventas ----------

function SalesView({ summary }: { summary: SalesSummaryDTO }) {
  if (summary.orders === 0) {
    return (
      <div className="m-4 rounded-2xl bg-white p-10 text-center ring-1 ring-stone-200">
        <div className="text-lg font-semibold">Aún no hay ventas hoy</div>
        <p className="mt-1 text-sm text-stone-500">
          Apenas entre el primer pedido, aquí verás el total del día, los platos más vendidos y las horas punta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 rounded-2xl bg-stone-900 p-5 text-white md:col-span-1">
          <div className="text-sm text-stone-300">Ventas de hoy</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{formatCLP(summary.revenue)}</div>
        </div>
        <Stat label="Pedidos" value={String(summary.orders)} />
        <Stat label="Mesas atendidas" value={String(summary.tablesServed)} />
        <Stat label="Ticket promedio por mesa" value={formatCLP(summary.averageTicket)} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <TopProducts rows={summary.topProducts} />
        <HourlySales rows={summary.byHour} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function TopProducts({ rows }: { rows: SalesSummaryDTO["topProducts"] }) {
  const max = Math.max(...rows.map((r) => r.quantity), 1);
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="font-semibold">Más vendidos hoy</h2>
      <p className="text-xs text-stone-500">Unidades vendidas</p>
      <ol className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li key={row.name}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">
                <span className="mr-1.5 text-stone-400 tabular-nums">{i + 1}.</span>
                {row.name}
              </span>
              <span className="shrink-0 tabular-nums text-stone-600">
                <b className="text-stone-900">{row.quantity}</b> · {formatCLP(row.revenue)}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-stone-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(row.quantity / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HourlySales({ rows }: { rows: SalesSummaryDTO["byHour"] }) {
  // Se muestran todas las horas entre la primera y la última venta, incluidas las sin ventas.
  const first = rows[0].hour;
  const last = rows[rows.length - 1].hour;
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => byHour.get(first + i) ?? { hour: first + i, revenue: 0, orders: 0 });
  const max = Math.max(...hours.map((h) => h.revenue), 1);
  const peak = hours.reduce((a, b) => (b.revenue > a.revenue ? b : a));

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="font-semibold">Ventas por hora</h2>
      <p className="text-xs text-stone-500">
        Hora punta: <b className="text-stone-700">{peak.hour}:00</b> con {formatCLP(peak.revenue)}
      </p>
      <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label="Ventas por hora del día">
        {hours.map((h) => (
          <div key={h.hour} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="rounded-t bg-brand-500 transition group-hover:bg-brand-700"
              style={{ height: `${Math.max((h.revenue / max) * 100, h.revenue ? 3 : 0)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-xs text-white group-hover:block">
              {h.hour}:00 · {formatCLP(h.revenue)} · {h.orders} pedido(s)
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 border-t border-stone-200 pt-1 text-[10px] text-stone-500">
        {hours.map((h) => (
          <span key={h.hour} className="flex-1 text-center tabular-nums">
            {h.hour}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Ventas por hora</caption>
        <tbody>
          {hours.map((h) => (
            <tr key={h.hour}>
              <th>{h.hour}:00</th>
              <td>{formatCLP(h.revenue)}</td>
              <td>{h.orders} pedidos</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- Carta ----------

function MenuEditor({ menu, onSaved }: { menu: AdminDTO["menu"]; onSaved: () => void }) {
  const soldOut = menu.flatMap((c) => c.products).filter((p) => !p.available).length;
  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-stone-600">
        Los cambios se ven al instante en la carta de los clientes.
        {soldOut > 0 && <b className="text-red-700"> {soldOut} plato(s) agotado(s).</b>}
      </p>
      {menu.map((category) => (
        <section key={category.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
          <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">{category.name}</h2>
          <ul className="divide-y divide-stone-100">
            {category.products.map((product) => (
              <ProductRow key={product.id} product={product} onSaved={onSaved} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ProductRow({ product, onSaved }: { product: MenuProduct; onSaved: () => void }) {
  const [price, setPrice] = useState(String(product.price));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Si otro dispositivo cambia el precio, se refleja aquí.
  useEffect(() => setPrice(String(product.price)), [product.price]);

  async function save(changes: { price?: number; available?: boolean }) {
    setStatus("saving");
    setError(null);
    try {
      await sendJSON(`/api/admin/productos/${product.id}`, "PATCH", changes);
      setStatus("saved");
      onSaved();
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      setPrice(String(product.price));
    }
  }

  function commitPrice() {
    const value = Number(price.replace(/\D/g, ""));
    if (price.trim() === "" || value === product.price) {
      setPrice(String(product.price));
      return;
    }
    save({ price: value });
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 px-4 py-3 ${product.available ? "" : "bg-red-50/60"}`}>
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${product.available ? "" : "text-stone-500 line-through"}`}>{product.name}</div>
        {error && <div className="text-xs text-red-700">{error}</div>}
        {status === "saved" && <div className="text-xs text-emerald-700">Guardado ✓</div>}
      </div>

      <label className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 focus-within:border-brand-500">
        <span className="text-sm text-stone-500">$</span>
        <input
          inputMode="numeric"
          aria-label={`Precio de ${product.name}`}
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
          onBlur={commitPrice}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-20 text-right tabular-nums outline-none"
        />
      </label>

      <button
        role="switch"
        aria-checked={product.available}
        disabled={status === "saving"}
        onClick={() => save({ available: !product.available })}
        className={`w-28 rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
          product.available ? "bg-emerald-100 text-emerald-800" : "bg-red-600 text-white"
        }`}
      >
        {product.available ? "Disponible" : "Agotado"}
      </button>
    </li>
  );
}

import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export const dynamic = "force-dynamic";

// Página de demo: accesos a cocina y mesero, y el QR que iría pegado en cada mesa.
export default async function Home() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const tableNumbers = await fetchQuery(api.menu.tableNumbers);

  const qrs = await Promise.all(
    tableNumbers.map(async (number) => {
      const url = `${proto}://${host}/mesa/${number}`;
      return { number, url, svg: await QRCode.toString(url, { type: "svg", margin: 1 }) };
    }),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Restaurante</h1>
      <p className="mt-2 text-stone-600">
        Pedidos desde la mesa. Escanea el QR de una mesa con tu celular o abre su enlace.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/cocina"
          className="rounded-2xl bg-stone-900 p-6 text-white shadow-sm transition hover:bg-stone-800"
        >
          <div className="text-xl font-semibold">Pantalla de cocina →</div>
          <p className="mt-1 text-sm text-stone-300">Pedidos en tiempo real, con aviso sonoro.</p>
        </Link>
        <Link
          href="/mesero"
          className="rounded-2xl bg-brand-500 p-6 text-white shadow-sm transition hover:bg-brand-600"
        >
          <div className="text-xl font-semibold">Vista del mesero →</div>
          <p className="mt-1 text-sm text-brand-100">Pedidos listos, llamados y cuentas abiertas.</p>
        </Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Códigos QR de las mesas</h2>
      {host.startsWith("localhost") && (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Estás usando <b>localhost</b>: el QR no funcionará desde otro dispositivo. Abre esta página
          con la IP de tu computador en la red (por ejemplo <code>http://192.168.1.10:3000</code>)
          para que el celular pueda conectarse.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {qrs.map((qr) => (
          <Link
            key={qr.number}
            href={`/mesa/${qr.number}`}
            className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm transition hover:border-brand-500"
          >
            <div className="mx-auto w-full max-w-40" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            <div className="mt-2 font-semibold">Mesa {qr.number}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

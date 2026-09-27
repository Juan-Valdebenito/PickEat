import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { TableApp } from "@/components/cliente/TableApp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/mesa/[numero]">) {
  const { numero } = await params;
  return { title: `Mesa ${numero} · Restaurante` };
}

export default async function MesaPage({ params }: PageProps<"/mesa/[numero]">) {
  const table = Number((await params).numero);
  if (!Number.isInteger(table) || !(await fetchQuery(api.menu.tableExists, { tableNumber: table }))) {
    notFound();
  }

  const menu = await fetchQuery(api.menu.get);
  return <TableApp table={table} menu={menu} />;
}

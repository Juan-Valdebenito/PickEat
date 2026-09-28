import { notFound } from "next/navigation";
import { TableApp } from "@/components/cliente/TableApp";
import { getMenu, tableExists } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/mesa/[numero]">) {
  const { numero } = await params;
  return { title: `Mesa ${numero} · Restaurante` };
}

export default async function MesaPage({ params }: PageProps<"/mesa/[numero]">) {
  const table = Number((await params).numero);
  if (!Number.isInteger(table) || !(await tableExists(table))) notFound();

  const menu = await getMenu();
  return <TableApp table={table} menu={menu} />;
}

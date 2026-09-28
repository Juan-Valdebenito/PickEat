import { handle, parseId, readJSON } from "@/lib/http";
import { createOrder } from "@/lib/service";
import type { NewOrderItem } from "@/lib/types";

export async function POST(req: Request, ctx: RouteContext<"/api/mesas/[numero]/pedidos">) {
  return handle(async () => {
    const table = parseId((await ctx.params).numero);
    const body = await readJSON<{ items: NewOrderItem[] }>(req);
    return createOrder(table, body.items);
  });
}

import { handle, parseId, readJSON } from "@/lib/http";
import { updateOrderStatus } from "@/lib/service";

export async function PATCH(req: Request, ctx: RouteContext<"/api/pedidos/[id]">) {
  return handle(async () => {
    const id = parseId((await ctx.params).id);
    const body = await readJSON<{ status: string }>(req);
    return updateOrderStatus(id, body.status);
  });
}

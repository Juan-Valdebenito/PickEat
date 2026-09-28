import { handle, parseId, readJSON } from "@/lib/http";
import { updateProduct } from "@/lib/service";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/productos/[id]">) {
  return handle(async () => {
    const id = parseId((await ctx.params).id);
    const body = await readJSON<{ price?: unknown; available?: unknown }>(req);
    await updateProduct(id, body);
  });
}

import { handle, parseId } from "@/lib/http";
import { resolveCall } from "@/lib/service";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/llamados/[id]">) {
  return handle(async () => resolveCall(parseId((await ctx.params).id)));
}

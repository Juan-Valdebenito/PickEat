import { handle, parseId } from "@/lib/http";
import { closeTable } from "@/lib/service";

export async function POST(_req: Request, ctx: RouteContext<"/api/mesas/[numero]/cerrar">) {
  return handle(async () => closeTable(parseId((await ctx.params).numero)));
}

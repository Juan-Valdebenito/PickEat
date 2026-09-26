import { handle, parseId } from "@/lib/http";
import { getTableState } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/mesas/[numero]">) {
  return handle(async () => getTableState(parseId((await ctx.params).numero)));
}

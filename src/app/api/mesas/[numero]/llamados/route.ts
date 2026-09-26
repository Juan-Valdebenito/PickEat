import { handle, parseId, readJSON } from "@/lib/http";
import { createCall } from "@/lib/service";

export async function POST(req: Request, ctx: RouteContext<"/api/mesas/[numero]/llamados">) {
  return handle(async () => {
    const table = parseId((await ctx.params).numero);
    const body = await readJSON<{ type: string }>(req);
    await createCall(table, body.type);
  });
}

import { demoTick, getDemoStatus } from "@/lib/demo";
import { handle } from "@/lib/http";
import { getMenu, getSalesSummary } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await demoTick(); // no hace nada si la simulación está apagada
    const [summary, menu, demo] = await Promise.all([getSalesSummary(), getMenu(), getDemoStatus()]);
    return { summary, menu, demo };
  });
}

import { handle } from "@/lib/http";
import { getMenu, getSalesSummary } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const [summary, menu] = await Promise.all([getSalesSummary(), getMenu()]);
    return { summary, menu };
  });
}

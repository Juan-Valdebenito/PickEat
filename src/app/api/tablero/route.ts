import { demoTick } from "@/lib/demo";
import { handle } from "@/lib/http";
import { getBoard } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await demoTick(); // no hace nada si la simulación está apagada
    return getBoard();
  });
}

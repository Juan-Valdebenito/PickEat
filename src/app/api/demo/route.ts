import { getDemoStatus, startDemo, stopDemo } from "@/lib/demo";
import { handle, readJSON } from "@/lib/http";
import { ServiceError } from "@/lib/service";

// POST { action: "start" | "stop" }: enciende o apaga el simulador de servicio.
export async function POST(req: Request) {
  return handle(async () => {
    const { action } = await readJSON<{ action?: string }>(req);
    if (action === "start") await startDemo();
    else if (action === "stop") await stopDemo();
    else throw new ServiceError("Acción inválida");
    return getDemoStatus();
  });
}

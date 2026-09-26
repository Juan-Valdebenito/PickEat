import { liveBus, type LiveEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// Server-Sent Events: cada pantalla abre una conexión y recibe los cambios.
// Opcionalmente ?mesa=5 filtra los eventos de una sola mesa (vista del cliente).
export async function GET(req: Request) {
  const tableParam = new URL(req.url).searchParams.get("mesa");
  const tableFilter = tableParam ? Number(tableParam) : null;
  const encoder = new TextEncoder();

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const onEvent = (event: LiveEvent) => {
        if (tableFilter !== null && event.table !== tableFilter) return;
        send(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Comentario periódico para que proxies y navegadores no corten la conexión.
      const heartbeat = setInterval(() => send(": ping\n\n"), 25_000);

      cleanup = () => {
        clearInterval(heartbeat);
        liveBus.off("event", onEvent);
      };

      liveBus.on("event", onEvent);
      send("retry: 3000\n\n");
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

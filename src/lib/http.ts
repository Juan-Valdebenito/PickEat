import { NextResponse } from "next/server";
import { ServiceError } from "./service";

export function parseId(raw: string) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new ServiceError("Identificador inválido", 400);
  return n;
}

export async function readJSON<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ServiceError("Cuerpo JSON inválido", 400);
  }
}

export async function handle(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof ServiceError) {
      console.warn(`[api] ${err.status}: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

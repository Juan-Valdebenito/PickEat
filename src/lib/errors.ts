import { ConvexError } from "convex/values";

// Los errores de negocio de Convex traen el mensaje en `data`; el resto es un fallo inesperado.
export function errorMessage(err: unknown, fallback = "Algo salió mal, intenta de nuevo") {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return fallback;
}

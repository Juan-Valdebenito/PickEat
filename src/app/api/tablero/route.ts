import { handle } from "@/lib/http";
import { getBoard } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(getBoard);
}

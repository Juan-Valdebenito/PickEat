import { handle } from "@/lib/http";
import { getMenu } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(getMenu);
}

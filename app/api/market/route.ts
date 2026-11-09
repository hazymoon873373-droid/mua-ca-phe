import { marketData } from "../../../lib/coffee/market";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await marketData(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST() {
  return Response.json(await marketData(), {
    headers: { "Cache-Control": "no-store" },
  });
}

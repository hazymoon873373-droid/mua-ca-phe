import { marketData } from "../../../lib/coffee/market";
import { priceCorsHeaders } from "../../../lib/coffee/client-paths.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return Response.json(await marketData(), {
    headers: {
      "Cache-Control": "no-store",
      ...priceCorsHeaders(request.headers.get("Origin")),
    },
  });
}
export async function POST(request: Request) {
  return Response.json(await marketData(), {
    headers: {
      "Cache-Control": "no-store",
      ...priceCorsHeaders(request.headers.get("Origin")),
    },
  });
}
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: priceCorsHeaders(request.headers.get("Origin")),
  });
}

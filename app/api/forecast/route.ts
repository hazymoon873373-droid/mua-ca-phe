import artifact from "../../../public/data/forecast.json";
import { validateForecastArtifact } from "../../../lib/coffee/forecast.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!validateForecastArtifact(artifact))
    return Response.json({ error: "forecast_unavailable" }, { status: 503 });
  return Response.json(
    {
      ...artifact,
      asOfDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

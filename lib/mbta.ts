// MBTA v3 API — free. A key (MBTA_API_KEY) is optional but raises the rate limit.
const BASE = "https://api-v3.mbta.com";

async function mbta(path: string) {
  const headers: Record<string, string> = { accept: "application/vnd.api+json" };
  if (process.env.MBTA_API_KEY) headers["x-api-key"] = process.env.MBTA_API_KEY;
  const res = await fetch(`${BASE}${path}`, { headers, next: { revalidate: 20 } });
  if (!res.ok) throw new Error(`MBTA ${res.status}`);
  return res.json();
}

export type Arrival = { route: string; minutes: number; headsign?: string };

/** Next departures from a station (parent stop id like "place-kencl"). */
export async function nextTrains(stationId: string, routes?: string[]): Promise<Arrival[]> {
  try {
    const routeFilter = routes?.length ? `&filter[route]=${routes.join(",")}` : "";
    const data = await mbta(
      `/predictions?filter[stop]=${stationId}${routeFilter}&sort=departure_time&include=trip&page[limit]=6`
    );
    const trips = new Map<string, string>(
      (data.included ?? []).map((t: any) => [t.id, t.attributes?.headsign])
    );
    const now = Date.now();
    return (data.data ?? [])
      .map((p: any) => {
        const t = p.attributes.departure_time ?? p.attributes.arrival_time;
        if (!t) return null;
        return {
          route: p.relationships.route.data.id,
          minutes: Math.max(0, Math.round((new Date(t).getTime() - now) / 60000)),
          headsign: trips.get(p.relationships.trip?.data?.id),
        };
      })
      .filter(Boolean)
      .slice(0, 3) as Arrival[];
  } catch {
    return [];
  }
}

/** Last scheduled departure tonight from a station on given routes. Returns "h:mm AM/PM" or null. */
export async function lastTrain(stationId: string, routes: string[]): Promise<string | null> {
  try {
    const data = await mbta(
      `/schedules?filter[stop]=${stationId}&filter[route]=${routes.join(",")}&sort=-departure_time&page[limit]=1`
    );
    const t = data.data?.[0]?.attributes?.departure_time;
    if (!t) return null;
    return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  } catch {
    return null;
  }
}

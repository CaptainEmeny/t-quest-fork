import { Pool } from "pg";
import seed from "@/data/places.json";

export type Place = {
  id: string;
  name: string;
  category: "food" | "cafe" | "activity" | "nightlife";
  tags: string[];
  price: number; // approx $ per person
  vibes: string[];
  open: number; // 24h, decimal (11.5 = 11:30am)
  close: number; // can exceed 24 (26 = 2am)
  age21: boolean;
  groupMax: number;
  station: string; // MBTA parent station id
  walk: number; // minutes from station
  trending: boolean;
  blurb: string;
};

export type PlaceFilter = {
  maxPrice?: number;
  vibe?: string;
  category?: string;
  craving?: string;
  groupSize?: number;
  over21?: boolean;
  openAtHour?: number; // 0-24, current local hour
  limit?: number;
};

// Tiger Data (managed Postgres). If DATABASE_URL isn't set, we fall back to the JSON file
// so the demo never breaks.
let pool: Pool | null = null;
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
}

function isOpen(p: Place, hour: number) {
  // treat hours after midnight as 24+
  const h = hour < 6 ? hour + 24 : hour;
  return (p.open <= h && h < p.close) || (p.open <= hour && hour < p.close);
}

function filterLocal(places: Place[], f: PlaceFilter) {
  const craving = f.craving?.toLowerCase().trim();
  let out = places.filter((p) => {
    if (f.maxPrice !== undefined && p.price > f.maxPrice) return false;
    if (f.vibe && !p.vibes.includes(f.vibe)) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.groupSize && p.groupMax < f.groupSize) return false;
    if (!f.over21 && p.age21) return false;
    if (f.openAtHour !== undefined && !isOpen(p, f.openAtHour)) return false;
    return true;
  });
  if (craving) {
    // craving boosts rather than filters, so a niche craving never returns nothing
    const score = (p: Place) =>
      [p.name, p.blurb, ...p.tags].join(" ").toLowerCase().includes(craving) ? 1 : 0;
    out = out.sort((a, b) => score(b) - score(a));
  }
  out = out.sort((a, b) => Number(b.trending) - Number(a.trending));
  return out.slice(0, f.limit ?? 12);
}

export async function searchPlaces(f: PlaceFilter): Promise<Place[]> {
  const db = getPool();
  if (!db) return filterLocal(seed as Place[], f);
  try {
    const conds: string[] = [];
    const args: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      args.push(v);
      conds.push(sql.replace("?", `$${args.length}`));
    };
    if (f.maxPrice !== undefined) add("price <= ?", f.maxPrice);
    if (f.vibe) add("? = ANY(vibes)", f.vibe);
    if (f.category) add("category = ?", f.category);
    if (f.groupSize) add("group_max >= ?", f.groupSize);
    if (!f.over21) conds.push("age21 = false");
    const { rows } = await db.query(
      `SELECT id, name, category, tags, price::float, vibes, open::float, close::float, age21,
              group_max AS "groupMax", station, walk, trending, blurb
       FROM places ${conds.length ? "WHERE " + conds.join(" AND ") : ""}`,
      args
    );
    // hours + craving ranking done in JS so the logic matches the fallback exactly
    return filterLocal(rows as Place[], { ...f, maxPrice: undefined, vibe: undefined, category: undefined, groupSize: undefined, over21: true });
  } catch (e) {
    console.error("Tiger Data query failed, using local data:", e);
    return filterLocal(seed as Place[], f);
  }
}

export async function getPlace(id: string): Promise<Place | undefined> {
  const all = await searchPlaces({ over21: true, limit: 999 });
  return all.find((p) => p.id === id);
}

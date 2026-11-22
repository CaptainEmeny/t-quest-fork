import { z } from "zod";
import { getPlace, searchPlaces, type Place } from "./places";
import { lastTrain, nextTrains, type Arrival } from "./mbta";
import { stationById, lineColor, type Station } from "./stations";

export const QuestInput = z.object({
  budget: z.number().min(0).max(500), // $ per person
  groupSize: z.number().int().min(1).max(20),
  hours: z.number().min(0.5).max(12),
  startStation: z.string(),
  vibe: z.enum(["chill", "big-night", "explore", "study", "late-night"]),
  craving: z.string().max(60).optional(),
  over21: z.boolean(),
});
export type QuestInput = z.infer<typeof QuestInput>;

/** What the AI agent decides: which places, in what order, and the story. */
export const QuestPlan = z.object({
  title: z.string().describe("Fun quest name, max 6 words"),
  tagline: z.string().describe("One playful sentence describing the night"),
  stops: z
    .array(
      z.object({
        placeId: z.string().describe("id from searchPlaces results ONLY"),
        why: z.string().describe("One short sentence: why this stop / what to order or do"),
        minutes: z.number().describe("Minutes to spend here"),
      })
    )
    .min(1)
    .max(3),
});
export type QuestPlan = z.infer<typeof QuestPlan>;

export type RideStep = {
  kind: "ride";
  from: string;
  to: string;
  line: string;
  color: string;
  transferAt?: string;
  nextTrains: Arrival[];
};
export type StopStep = { kind: "stop"; place: Place; station: string; why: string; minutes: number };
export type Quest = {
  title: string;
  tagline: string;
  generatedBy: "gemini" | "fallback";
  steps: (RideStep | StopStep)[];
  perPerson: number;
  groupTotal: number;
  totalMinutes: number;
  lastTrain: { station: string; time: string } | null;
  warnings: string[];
};

const SavedPlace = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  category: z.enum(["food", "cafe", "activity", "nightlife"]),
  tags: z.array(z.string().max(80)).max(30),
  price: z.number().nonnegative(),
  vibes: z.array(z.string().max(40)).max(20),
  open: z.number(),
  close: z.number(),
  age21: z.boolean(),
  groupMax: z.number().int().positive(),
  station: z.string().max(100),
  walk: z.number().int().nonnegative(),
  trending: z.boolean(),
  blurb: z.string().max(1000),
});

export const QuestSchema = z.object({
  title: z.string().min(1).max(120),
  tagline: z.string().max(500),
  generatedBy: z.enum(["gemini", "fallback"]),
  steps: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("ride"),
        from: z.string().max(100),
        to: z.string().max(100),
        line: z.string().max(100),
        color: z.string().max(40),
        transferAt: z.string().max(100).optional(),
        nextTrains: z.array(
          z.object({
            route: z.string().max(100),
            minutes: z.number().nonnegative(),
            headsign: z.string().max(200).optional(),
          })
        ).max(6),
      }),
      z.object({
        kind: z.literal("stop"),
        place: SavedPlace,
        station: z.string().max(100),
        why: z.string().max(500),
        minutes: z.number().nonnegative(),
      }),
    ])
  ).max(6),
  perPerson: z.number().nonnegative(),
  groupTotal: z.number().nonnegative(),
  totalMinutes: z.number().nonnegative(),
  lastTrain: z.object({ station: z.string().max(100), time: z.string().max(100) }).nullable(),
  warnings: z.array(z.string().max(500)).max(10),
});

// --- routing between stations (simple, line-based) ---
const lineOf = (l: string) => l.split(" ")[0]; // "Green B" -> "Green"
const TRANSFERS: { id: string; lines: string[] }[] = [
  { id: "place-pktrm", lines: ["Green", "Red"] },
  { id: "place-dwnxg", lines: ["Red", "Orange"] },
  { id: "place-gover", lines: ["Green", "Blue"] },
  { id: "place-haecl", lines: ["Green", "Orange"] },
  { id: "place-state", lines: ["Orange", "Blue"] },
];

function routeBetween(a: Station, b: Station): { line: string; transferAt?: string } {
  const aLines = a.lines.map(lineOf);
  const bLines = b.lines.map(lineOf);
  const shared = aLines.find((l) => bLines.includes(l));
  if (shared) return { line: b.lines.find((l) => lineOf(l) === shared) ?? shared };
  const t = TRANSFERS.find((t) => t.lines.some((l) => aLines.includes(l)) && t.lines.some((l) => bLines.includes(l)));
  const names: Record<string, string> = { "place-state": "State" };
  return {
    line: `${aLines[0]} → ${bLines[0]}`,
    transferAt: t ? stationById(t.id)?.name ?? names[t.id] : "Park Street",
  };
}

/** Turn the agent's plan into a full quest with live train data. */
export async function buildQuest(input: QuestInput, plan: QuestPlan, generatedBy: Quest["generatedBy"]): Promise<Quest> {
  const warnings: string[] = [];
  const steps: Quest["steps"] = [];
  let cur = stationById(input.startStation);
  let perPerson = 0;
  let totalMinutes = 0;
  let lastStation: Station | undefined = cur;

  for (const s of plan.stops) {
    const place = await getPlace(s.placeId);
    if (!place) continue; // agent hallucinated an id — skip it
    const dest = stationById(place.station);
    if (cur && dest && cur.id !== dest.id) {
      const r = routeBetween(cur, dest);
      steps.push({
        kind: "ride",
        from: cur.name,
        to: dest.name,
        line: r.line,
        color: lineColor(r.line),
        transferAt: r.transferAt,
        nextTrains: await nextTrains(cur.id, cur.routes),
      });
      totalMinutes += 20;
    }
    steps.push({ kind: "stop", place, station: dest?.name ?? "", why: s.why, minutes: s.minutes });
    perPerson += place.price;
    totalMinutes += s.minutes + place.walk * 2;
    cur = dest ?? cur;
    lastStation = dest ?? lastStation;
  }

  // ride home + last-train check
  let lt: Quest["lastTrain"] = null;
  if (lastStation) {
    const time = await lastTrain(lastStation.id, lastStation.routes);
    if (time) lt = { station: lastStation.name, time };
  }
  if (perPerson > input.budget) warnings.push(`This runs about $${perPerson - input.budget} over your budget per person.`);
  if (totalMinutes > input.hours * 60) warnings.push(`This quest is ~${Math.round(totalMinutes / 60 * 10) / 10} hrs — a bit longer than you have.`);
  const hour = new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" });
  if (input.vibe === "late-night" || input.vibe === "big-night" || Number(hour) >= 21)
    warnings.push(lt ? `Last train from ${lt.station} is around ${lt.time}. Miss it and you're paying for an Uber.` : "The T stops running around 12:30–1am. Plan your ride home.");

  return {
    title: plan.title,
    tagline: plan.tagline,
    generatedBy,
    steps,
    perPerson,
    groupTotal: perPerson * input.groupSize,
    totalMinutes,
    lastTrain: lt,
    warnings,
  };
}

/** No-AI fallback so the demo works even with no API key / no wifi. */
export async function fallbackPlan(input: QuestInput): Promise<QuestPlan> {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  const nStops = input.hours < 2 ? 1 : input.hours < 4 ? 2 : 3;
  const base = { groupSize: input.groupSize, over21: input.over21, craving: input.craving, openAtHour: hour };
  let pool = await searchPlaces({ ...base, vibe: input.vibe, maxPrice: input.budget, limit: 20 });
  if (pool.length < nStops) pool = await searchPlaces({ ...base, maxPrice: input.budget, limit: 20 });
  // prefer food first, then something else
  const food = pool.filter((p) => p.category === "food" || p.category === "cafe");
  const other = pool.filter((p) => !food.includes(p));
  const picks: Place[] = [];
  let spent = 0;
  for (const p of [...food.slice(0, 1), ...other, ...food.slice(1)]) {
    if (picks.length >= nStops) break;
    if (spent + p.price > input.budget && picks.length > 0) continue;
    picks.push(p);
    spent += p.price;
  }
  const titles: Record<string, string> = {
    chill: "The Low-Key Loop",
    "big-night": "The Main Character Night",
    explore: "The Side Quest",
    study: "The Productive Pilgrimage",
    "late-night": "The After-Hours Run",
  };
  return {
    title: titles[input.vibe],
    tagline: "Hand-picked stops along the T, matched to your budget and crew.",
    stops: picks.map((p) => ({ placeId: p.id, why: p.blurb, minutes: p.category === "nightlife" ? 90 : 60 })),
  };
}

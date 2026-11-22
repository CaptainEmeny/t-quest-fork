import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchPlaces } from "@/lib/places";
import { lastTrain } from "@/lib/mbta";
import { STATIONS, stationById } from "@/lib/stations";

// Tool 1: query the places database (Tiger Data Postgres, JSON fallback)
const searchPlacesTool = createTool({
  id: "searchPlaces",
  description:
    "Search Boston spots near T stations. Returns real places with price per person, hours, vibes, nearest station and walk time. ONLY recommend places returned by this tool.",
  inputSchema: z.object({
    maxPrice: z.number().optional().describe("max $ per person for this single stop"),
    vibe: z.enum(["chill", "big-night", "explore", "study", "late-night"]).optional(),
    category: z.enum(["food", "cafe", "activity", "nightlife"]).optional(),
    craving: z.string().optional().describe("food or activity keyword, e.g. tacos, ramen, jazz"),
    groupSize: z.number().optional(),
    over21: z.boolean().describe("true only if the whole group is 21+"),
    openAtHour: z.number().optional().describe("hour 0-23 the group will arrive"),
  }),
  execute: async (input) => {
    const places = await searchPlaces({ ...input, limit: 10 });
    return {
      places: places.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        tags: p.tags,
        hours: `${p.open}-${p.close} (24h, >24 = after midnight)`,
        station: stationById(p.station)?.name,
        walkMin: p.walk,
        trending: p.trending,
        blurb: p.blurb,
      })),
    };
  },
});

// Tool 2: check the last train so late-night quests don't strand people
const lastTrainTool = createTool({
  id: "getLastTrain",
  description: "Get tonight's last scheduled MBTA departure from a station, by station name.",
  inputSchema: z.object({ stationName: z.string() }),
  execute: async ({ stationName }) => {
    const s = STATIONS.find((x) => x.name.toLowerCase() === stationName.toLowerCase());
    if (!s) return { lastTrain: null, note: "unknown station" };
    return { lastTrain: await lastTrain(s.id, s.routes) };
  },
});

export const questAgent = new Agent({
  id: "quest-agent",
  name: "Quest Agent",
  instructions: `You plan "quests": short nights out in Boston for college students who get around on the MBTA (the T).
Given the group's budget per person, group size, time available, starting station, vibe and craving:
1. Call searchPlaces (more than once if useful: e.g. food first, then an activity or nightlife).
2. Pick 1 stop if they have under 2 hours, 2 stops for 2-4 hours, up to 3 for longer.
3. The SUM of stop prices must stay within the per-person budget.
4. Prefer stops on the same line or close together to minimize transit; order stops so the route makes sense.
5. Never include 21+ places unless over21 is true. Only use placeIds returned by searchPlaces.
6. For late nights, call getLastTrain on the final stop's station and make sure the plan wraps up before it.
Write a fun, short quest title and a one-line tagline. Keep "why" lines specific (what to order or do).`,
  model: process.env.GEMINI_MODEL ?? "google/gemini-3.8-flash",
  tools: { searchPlacesTool, lastTrainTool },
});

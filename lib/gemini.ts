import { z } from "zod";
import { searchPlaces } from "./places";
import { QuestPlan, type QuestInput as QuestInputType, type QuestPlan as QuestPlanType } from "./quest";
import { stationById } from "./stations";

const geminiResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({ text: z.string().optional() }).passthrough()).optional(),
    }).passthrough().optional(),
    finishReason: z.string().optional(),
    finishMessage: z.string().optional(),
  }).passthrough()).optional(),
  promptFeedback: z.object({
    blockReason: z.string().optional(),
    blockReasonMessage: z.string().optional(),
  }).optional(),
}).passthrough();

const questResponseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Fun quest name, at most six words." },
    tagline: { type: "STRING", description: "One playful sentence describing the night." },
    stops: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          placeId: { type: "STRING", description: "An ID from the provided place search results." },
          why: { type: "STRING", description: "One short sentence on why to visit or what to do." },
          minutes: { type: "NUMBER", description: "Minutes to spend at this stop." },
        },
        required: ["placeId", "why", "minutes"],
      },
    },
  },
  required: ["title", "tagline", "stops"],
};

function getApiKey() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key?.trim()) throw new Error("Set GOOGLE_GENERATIVE_AI_API_KEY to use Gemini.");
  return key.trim();
}

function getModelId() {
  const configured = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const model = configured.startsWith("google/") ? configured.slice("google/".length) : configured;
  if (!/^[A-Za-z0-9._-]+$/.test(model)) {
    throw new Error("GEMINI_MODEL must be a Gemini model ID, optionally prefixed with google/.");
  }
  return model;
}

function currentBostonHour() {
  return Number(new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/New_York",
  }));
}

export async function generateGeminiQuestPlan(
  input: QuestInputType,
  signal: AbortSignal
): Promise<QuestPlanType> {
  const hour = currentBostonHour();
  const searchFilters = {
    maxPrice: input.budget,
    groupSize: input.groupSize,
    over21: input.over21,
    craving: input.craving,
    openAtHour: hour,
    limit: 20,
  };
  const expectedStops = input.hours < 2 ? 1 : input.hours < 4 ? 2 : 3;
  let places = await searchPlaces({ ...searchFilters, vibe: input.vibe });
  if (places.length < expectedStops) places = await searchPlaces(searchFilters);
  if (places.length === 0) throw new Error("No suitable places were found for this quest.");

  const placeResults = places.map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    price: place.price,
    tags: place.tags,
    hours: `${place.open}-${place.close} (24h, >24 = after midnight)`,
    station: stationById(place.station)?.name,
    walkMin: place.walk,
    trending: place.trending,
    blurb: place.blurb,
  }));
  const systemInstruction = `Plan a short night out in Boston for a group using the MBTA.
Choose only place IDs in the provided search results. Choose 1 stop for under 2 hours, 2 stops for 2-4 hours, and up to 3 stops for longer plans.
Keep the sum of stop prices within the per-person budget. Respect the group's age restriction, requested vibe, craving, and time.
Prefer stops on the same line or close together. Give a fun title, a playful one-line tagline, and specific reasons to visit each stop.`;
  const prompt = `Plan a quest.
Now: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", hour: "numeric", minute: "2-digit" })} (Boston)
Starting station: ${stationById(input.startStation)?.name ?? input.startStation}
Budget: $${input.budget} per person
Group size: ${input.groupSize}
Time available: ${input.hours} hours
Vibe: ${input.vibe}
Craving: ${input.craving || "none"}
Whole group 21+: ${input.over21 ? "yes" : "no"}

Available places from the server-side searchPlaces tool:
${JSON.stringify(placeResults)}

Return a plan using only the listed place IDs.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getModelId())}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": getApiKey(),
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: questResponseSchema,
        },
      }),
      signal,
    }
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload !== null && "error" in payload &&
      typeof payload.error === "object" && payload.error !== null &&
      "message" in payload.error && typeof payload.error.message === "string"
        ? payload.error.message
        : response.statusText;
    throw new Error(`Gemini API returned ${response.status}: ${errorMessage}`);
  }

  const parsedResponse = geminiResponseSchema.safeParse(payload);
  if (!parsedResponse.success) throw new Error("Gemini API returned an invalid response.");
  const text = parsedResponse.data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    const candidate = parsedResponse.data.candidates?.[0];
    const reason = candidate?.finishMessage ?? candidate?.finishReason ??
      parsedResponse.data.promptFeedback?.blockReasonMessage ??
      parsedResponse.data.promptFeedback?.blockReason;
    throw new Error(reason ? `Gemini returned no quest plan: ${reason}` : "Gemini returned no quest plan.");
  }

  let plan: unknown;
  try {
    plan = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON for the quest plan.");
  }
  return QuestPlan.parse(plan);
}

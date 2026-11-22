import { NextRequest, NextResponse } from "next/server";
import { questAgent } from "@/mastra/agent";
import { QuestInput, QuestPlan, buildQuest, fallbackPlan } from "@/lib/quest";
import { stationById } from "@/lib/stations";
import { verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
  if (!verifyAuthToken(req.cookies.get("tq-token")?.value)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = QuestInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const input = parsed.data;

  const hasKey = !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY);
  if (hasKey) {
    try {
      const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", hour: "numeric", minute: "2-digit" });
      const prompt = `Plan a quest.
Now: ${now} (Boston)
Starting station: ${stationById(input.startStation)?.name ?? input.startStation}
Budget: $${input.budget} per person
Group size: ${input.groupSize}
Time available: ${input.hours} hours
Vibe: ${input.vibe}
Craving: ${input.craving || "none"}
Whole group 21+: ${input.over21 ? "yes" : "no"}`;
      const abort = new AbortController();
      console.info("Calling Gemini API for quest generation.");
      const generate = questAgent.generate(prompt, {
        structuredOutput: { schema: QuestPlan },
        abortSignal: abort.signal,
      });
      // Whichever promise loses the race can still reject later.
      generate.catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abort.abort();
          reject(new Error("Gemini timed out after 25s"));
        }, 25_000);
      });
      timeout.catch(() => {});
      let res: Awaited<typeof generate>;
      try {
        // If Gemini keeps retrying a slow or overloaded call, fall through to fallbackPlan.
        res = await Promise.race([generate, timeout]);
      } finally {
        clearTimeout(timer);
      }
      const plan = QuestPlan.parse(res.object);
      const quest = await buildQuest(input, plan, "gemini");
      if (quest.steps.some((s) => s.kind === "stop")) return NextResponse.json(quest);
    } catch (e) {
      console.error("Agent failed, using fallback:", e);
    }
  } else {
    console.info("Skipping Gemini API call: no Google API key is configured.");
  }
  const quest = await buildQuest(input, await fallbackPlan(input), "fallback");
  return NextResponse.json(quest);
}

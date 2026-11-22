import { NextRequest, NextResponse } from "next/server";
import { generateGeminiQuestPlan } from "@/lib/gemini";
import { QuestInput, buildQuest, fallbackPlan } from "@/lib/quest";
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
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 45_000);
    try {
      console.info("Calling Gemini API for quest generation.");
      const plan = await generateGeminiQuestPlan(input, abort.signal);
      const quest = await buildQuest(input, plan, "gemini");
      if (quest.steps.some((s) => s.kind === "stop")) return NextResponse.json(quest);
    } catch (e) {
      console.error("Gemini failed, using fallback:", e);
    } finally {
      clearTimeout(timer);
    }
  } else {
    console.info("Skipping Gemini API call: no Google API key is configured.");
  }
  const quest = await buildQuest(input, await fallbackPlan(input), "fallback");
  return NextResponse.json(quest);
}

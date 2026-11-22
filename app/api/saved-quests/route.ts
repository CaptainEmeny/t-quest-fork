import { NextRequest, NextResponse } from "next/server";
import { getAuthPool, verifyAuthToken } from "@/lib/auth";
import { QuestSchema } from "@/lib/quest";

export const runtime = "nodejs";

function sessionUserId(req: NextRequest) {
  return verifyAuthToken(req.cookies.get("tq-token")?.value)?.userId;
}

export async function GET(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
  const userId = sessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const pool = getAuthPool();
  if (!pool) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  try {
    const result = await pool.query(
      `SELECT id, title, created_at AS "createdAt"
       FROM saved_quests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Could not load saved quests:", error);
    return NextResponse.json({ error: "Could not load saved quests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
  const userId = sessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = QuestSchema.safeParse(body?.quest);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quest" }, { status: 400 });
  }

  const pool = getAuthPool();
  if (!pool) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  try {
    const result = await pool.query(
      `INSERT INTO saved_quests (user_id, title, quest)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, title, created_at AS "createdAt"`,
      [userId, parsed.data.title, JSON.stringify(parsed.data)]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Could not save quest:", error);
    return NextResponse.json({ error: "Could not save quest" }, { status: 500 });
  }
}

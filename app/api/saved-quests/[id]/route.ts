import { NextRequest, NextResponse } from "next/server";
import { getAuthPool, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
  const userId = verifyAuthToken(req.cookies.get("tq-token")?.value)?.userId;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Saved quest not found" }, { status: 404 });

  const pool = getAuthPool();
  if (!pool) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  try {
    const result = await pool.query(
      `SELECT id, title, quest, created_at AS "createdAt"
       FROM saved_quests
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: "Saved quest not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Could not load saved quest:", error);
    return NextResponse.json({ error: "Could not load saved quest" }, { status: 500 });
  }
}

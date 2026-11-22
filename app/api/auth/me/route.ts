import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("tq-token")?.value;
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 });
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }

  const user = verifyAuthToken(token);
  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  return NextResponse.json(user);
}

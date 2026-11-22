import { Pool } from "pg";
import jwt from "jsonwebtoken";

const globalForAuth = globalThis as typeof globalThis & {
  tqAuthPool?: Pool;
};

export function getAuthPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForAuth.tqAuthPool) {
    globalForAuth.tqAuthPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForAuth.tqAuthPool;
}

export function verifyAuthToken(token: string | undefined) {
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (
      typeof payload === "string" ||
      (typeof payload.userId !== "number" && typeof payload.userId !== "string")
    ) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

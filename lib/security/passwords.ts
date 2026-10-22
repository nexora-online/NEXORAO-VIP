import "server-only";
import bcrypt from "bcryptjs";

const parsedCost = Number.parseInt(process.env.BCRYPT_COST || "12", 10);
const COST = Number.isInteger(parsedCost) && parsedCost >= 12 && parsedCost <= 15 ? parsedCost : 12;

/** Use only from server routes/actions. Never log plaintext passwords or hashes. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) throw new Error("Password must be 12–128 characters.");
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || password.length > 128 || !hash) return false;
  try { return await bcrypt.compare(password, hash); } catch { return false; }
}

/** Cookie policy for an opaque, random session ID; rotate after login and privilege changes. */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
  // Host-only cookie: intentionally omit Domain.
};

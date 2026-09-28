import { getDatabase } from "@netlify/database";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";

type Db = ReturnType<typeof getDatabase>;
let dbInstance: Db | null = null;

export function db(): Db {
  if (!dbInstance) dbInstance = getDatabase();
  return dbInstance;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

/* ---------- validation helpers ---------- */
export function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
export function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;
export function normUsername(v: unknown): string {
  return str(v, 40).toLowerCase();
}
export function checkPassword(pw: unknown): string {
  if (typeof pw !== "string" || pw.length < 6) throw new HttpError(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  if (pw.length > 128) throw new HttpError(400, "รหัสผ่านยาวเกินไป");
  return pw;
}
export function normPhone(v: unknown): string {
  return str(v, 20).replace(/[^0-9]/g, "");
}

/* ---------- time ---------- */
const BKK_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
export function bkkDate(d: Date = new Date()): string {
  return BKK_DATE.format(d); // YYYY-MM-DD
}

/* ---------- passwords & sessions ---------- */
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scryptKey(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pw, salt, 64, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptKey(pw, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const key = await scryptKey(pw, Buffer.from(salt, "base64"));
  const expected = Buffer.from(hash, "base64");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db().sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${sha256(token)}, ${userId}, NOW() + INTERVAL '30 days')`;
  // opportunistic cleanup of expired sessions
  if (Math.random() < 0.05) await db().sql`DELETE FROM sessions WHERE expires_at < NOW()`;
  return token;
}

function bearer(req: Request): string | null {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function destroySession(req: Request) {
  const t = bearer(req);
  if (t) await db().sql`DELETE FROM sessions WHERE token_hash = ${sha256(t)}`;
}

export type User = {
  id: number;
  username: string;
  role: "customer" | "staff" | "admin";
  display_name: string;
  phone: string;
  active: boolean;
  password_hash: string;
  created_at: Date;
};

export async function currentUser(req: Request): Promise<User | null> {
  const t = bearer(req);
  if (!t) return null;
  const rows = await db().sql`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(t)} AND s.expires_at > NOW() AND u.active`;
  return (rows[0] as User) || null;
}

export async function requireUser(req: Request, roles?: User["role"][]): Promise<User> {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, "กรุณาเข้าสู่ระบบ");
  if (roles && !roles.includes(u.role)) throw new HttpError(403, "ไม่มีสิทธิ์เข้าถึง");
  return u;
}

export function publicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.display_name,
    phone: u.phone,
    active: u.active,
    createdAt: u.created_at,
  };
}

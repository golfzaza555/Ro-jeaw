import type { Config, Context } from "@netlify/functions";
import {
  db, HttpError, json, readBody, str, int, USERNAME_RE, normUsername, checkPassword, normPhone,
  bkkDate, hashPassword, verifyPassword, createSession, destroySession, currentUser, requireUser,
  publicUser, type User,
} from "./core.mts";
import {
  DEFAULT_MENU, DEFAULT_STORE, getMenu, getStore, updateSetting, sanitizeMenu, sanitizeStorePatch,
  priceItems,
} from "./store.mts";

type Params = Record<string, string>;
type Handler = (req: Request, p: Params, url: URL) => Promise<Response>;

const ACTIVE = ["pending", "cooking", "ready"];
const TRANSITIONS: Record<string, string[]> = {
  pending: ["cooking", "cancelled"],
  cooking: ["pending", "ready", "cancelled"],
  ready: ["cooking", "completed", "cancelled"],
  completed: ["ready"],
  cancelled: [],
};

function toOrder(r: any) {
  return {
    id: r.id,
    no: r.daily_no,
    code: `#${String(r.daily_no).padStart(3, "0")}`,
    businessDate: r.business_date,
    userId: r.user_id,
    name: r.customer_name,
    phone: r.phone,
    items: r.items,
    note: r.note,
    total: r.total,
    paymentMethod: r.payment_method,
    paid: r.paid,
    status: r.status,
    cancelReason: r.cancel_reason,
    pickupAt: r.pickup_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cookingAt: r.cooking_at,
    readyAt: r.ready_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    rating: r.rating,
    review: r.review,
  };
}

async function activeCount(): Promise<number> {
  const [r] = await db().sql`SELECT COUNT(*)::int AS n FROM orders WHERE status IN ('pending', 'cooking')`;
  return r.n;
}

/* ============================== AUTH ============================== */
async function login(req: Request) {
  const b = await readBody(req);
  const username = normUsername(b.username);
  const password = typeof b.password === "string" ? b.password : "";
  const portal = b.portal === "kitchen" ? "kitchen" : "customer";
  const rows = await db().sql`SELECT * FROM users WHERE username = ${username}`;
  const u = rows[0] as (User & { failed_logins: number; locked_until: Date | null }) | undefined;

  if (u?.locked_until && new Date(u.locked_until) > new Date()) {
    throw new HttpError(429, "ใส่รหัสผิดหลายครั้ง กรุณารอ 5 นาทีแล้วลองใหม่");
  }
  const ok = u ? await verifyPassword(password, u.password_hash) : await verifyPassword(password, "scrypt$AAAA$AAAA");
  if (!u || !ok) {
    if (u) {
      await db().sql`
        UPDATE users SET failed_logins = failed_logins + 1,
          locked_until = CASE WHEN failed_logins + 1 >= 5 THEN NOW() + INTERVAL '5 minutes' ELSE NULL END
        WHERE id = ${u.id}`;
    }
    throw new HttpError(400, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  if (!u.active) throw new HttpError(403, "บัญชีนี้ถูกระงับ กรุณาติดต่อร้าน");
  if (portal === "kitchen" && u.role === "customer") throw new HttpError(403, "บัญชีลูกค้าไม่สามารถเข้าหน้าครัวได้");
  if (portal === "customer" && u.role !== "customer") throw new HttpError(403, "บัญชีพนักงานใช้ได้เฉพาะหน้าครัว");
  await db().sql`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ${u.id}`;
  return json({ token: await createSession(u.id), user: publicUser(u) });
}

async function register(req: Request) {
  const b = await readBody(req);
  const username = normUsername(b.username);
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3-24 ตัว");
  const password = checkPassword(b.password);
  const displayName = str(b.displayName, 40);
  const phone = normPhone(b.phone);
  if (displayName.length < 1) throw new HttpError(400, "กรุณากรอกชื่อที่ใช้เรียก");
  if (phone.length < 9 || phone.length > 10) throw new HttpError(400, "เบอร์โทรศัพท์ไม่ถูกต้อง");
  const hash = await hashPassword(password);
  const rows = await db().sql`
    INSERT INTO users (username, password_hash, role, display_name, phone)
    VALUES (${username}, ${hash}, 'customer', ${displayName}, ${phone})
    ON CONFLICT (username) DO NOTHING RETURNING *`;
  if (!rows[0]) throw new HttpError(409, "ชื่อผู้ใช้นี้ถูกใช้แล้ว");
  return json({ token: await createSession(rows[0].id), user: publicUser(rows[0] as User) }, 201);
}

async function setupStatus() {
  const [r] = await db().sql`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`;
  return json({ needsSetup: r.n === 0 });
}

async function setup(req: Request) {
  const b = await readBody(req);
  const username = normUsername(b.username);
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3-24 ตัว");
  const password = checkPassword(b.password);
  if (password.length < 8) throw new HttpError(400, "รหัสผ่านผู้ดูแลต้องมีอย่างน้อย 8 ตัวอักษร");
  const displayName = str(b.displayName, 40) || "ผู้ดูแลร้าน";
  const hash = await hashPassword(password);
  const rows = await db().sql`
    INSERT INTO users (username, password_hash, role, display_name)
    SELECT ${username}, ${hash}, 'admin', ${displayName}
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
    ON CONFLICT (username) DO NOTHING RETURNING *`;
  if (!rows[0]) throw new HttpError(409, "ตั้งค่าผู้ดูแลไปแล้ว หรือชื่อผู้ใช้ซ้ำ");
  return json({ token: await createSession(rows[0].id), user: publicUser(rows[0] as User) }, 201);
}

/* ============================== ROUTES ============================== */
const routes: [string, RegExp, Handler][] = [
  ["POST", /^\/auth\/login$/, login],
  ["POST", /^\/auth\/register$/, register],
  ["POST", /^\/auth\/logout$/, async (req) => { await destroySession(req); return json({ ok: true }); }],
  ["GET", /^\/auth\/me$/, async (req) => json({ user: publicUser(await requireUser(req)) })],
  ["GET", /^\/setup$/, setupStatus],
  ["POST", /^\/setup$/, setup],

  /* ---------- profile ---------- */
  ["PATCH", /^\/me$/, async (req) => {
    const u = await requireUser(req);
    const b = await readBody(req);
    const displayName = "displayName" in b ? str(b.displayName, 40) : u.display_name;
    const phone = "phone" in b ? normPhone(b.phone) : u.phone;
    if (!displayName) throw new HttpError(400, "กรุณากรอกชื่อ");
    if (u.role === "customer" && (phone.length < 9 || phone.length > 10)) throw new HttpError(400, "เบอร์โทรศัพท์ไม่ถูกต้อง");
    const [row] = await db().sql`
      UPDATE users SET display_name = ${displayName}, phone = ${phone} WHERE id = ${u.id} RETURNING *`;
    return json({ user: publicUser(row as User) });
  }],
  ["POST", /^\/me\/password$/, async (req) => {
    const u = await requireUser(req);
    const b = await readBody(req);
    if (!(await verifyPassword(String(b.currentPassword || ""), u.password_hash))) throw new HttpError(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
    const hash = await hashPassword(checkPassword(b.newPassword));
    await db().sql`UPDATE users SET password_hash = ${hash} WHERE id = ${u.id}`;
    await db().sql`DELETE FROM sessions WHERE user_id = ${u.id}`;
    return json({ token: await createSession(u.id) });
  }],

  /* ---------- public store info ---------- */
  ["GET", /^\/store$/, async () => {
    const [store, menu, active] = await Promise.all([getStore(), getMenu(), activeCount()]);
    const full = store.maxActive > 0 && active >= store.maxActive;
    return json({
      store: {
        open: store.open,
        acceptingOrders: store.open && !full,
        queueFull: full,
        announcement: store.announcement,
        promptpayEnabled: !!store.promptpay,
        promptpay: store.promptpay,
        promptpayName: store.promptpayName,
        minutesPerOrder: store.minutesPerOrder,
      },
      menu,
      queue: { active, waitMinutes: Math.max(5, (active + 1) * store.minutesPerOrder) },
    });
  }],

  /* ---------- customer orders ---------- */
  ["POST", /^\/orders$/, async (req) => {
    const u = await requireUser(req, ["customer"]);
    const b = await readBody(req);
    const [store, menu, active] = await Promise.all([getStore(), getMenu(), activeCount()]);
    if (!store.open) throw new HttpError(409, "ขณะนี้ร้านปิดรับออเดอร์");
    if (store.maxActive > 0 && active >= store.maxActive) throw new HttpError(409, "คิวเต็มชั่วคราว กรุณาลองใหม่อีกสักครู่");
    const [mine] = await db().sql`
      SELECT COUNT(*)::int AS n FROM orders WHERE user_id = ${u.id} AND status IN ('pending', 'cooking', 'ready')`;
    if (mine.n >= 3) throw new HttpError(429, "คุณมีออเดอร์ที่ยังไม่ได้รับ 3 รายการแล้ว กรุณารับอาหารก่อนสั่งเพิ่ม");

    const items = priceItems(menu, b.items);
    const total = items.reduce((s, it) => s + it.lineTotal, 0);
    const name = str(b.name, 40) || u.display_name;
    const phone = normPhone(b.phone) || u.phone;
    if (!name) throw new HttpError(400, "กรุณากรอกชื่อผู้รับ");
    if (phone.length < 9 || phone.length > 10) throw new HttpError(400, "เบอร์โทรศัพท์ไม่ถูกต้อง");
    const payment = b.paymentMethod === "promptpay" && store.promptpay ? "promptpay" : "cash";
    const pickup = new Date(Number(b.pickupAt));
    const now = Date.now();
    if (!Number.isFinite(pickup.getTime()) || pickup.getTime() < now - 2 * 60000 || pickup.getTime() > now + 12 * 3600000) {
      throw new HttpError(400, "เวลารับอาหารไม่ถูกต้อง");
    }
    const note = str(b.note, 200);
    const bd = bkkDate();
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const [row] = await db().sql`
          INSERT INTO orders (business_date, daily_no, user_id, customer_name, phone, items, note, total, payment_method, pickup_at)
          VALUES (
            ${bd},
            (SELECT COALESCE(MAX(daily_no), 0) + 1 FROM orders WHERE business_date = ${bd}),
            ${u.id}, ${name}, ${phone}, ${JSON.stringify(items)}::jsonb, ${note}, ${total}, ${payment}, ${pickup.toISOString()}
          ) RETURNING *`;
        return json({ order: toOrder(row) }, 201);
      } catch (e: any) {
        if (e?.code !== "23505") throw e; // unique violation on daily_no -> retry
      }
    }
    throw new HttpError(503, "ระบบไม่ว่าง กรุณาลองใหม่");
  }],
  ["GET", /^\/orders\/mine$/, async (req) => {
    const u = await requireUser(req, ["customer"]);
    const rows = await db().sql`
      SELECT o.*, (
        SELECT COUNT(*)::int FROM orders a
        WHERE a.status IN ('pending', 'cooking') AND a.created_at < o.created_at
      ) AS ahead
      FROM orders o WHERE o.user_id = ${u.id}
      ORDER BY o.created_at DESC LIMIT 40`;
    const store = await getStore();
    return json({
      orders: rows.map((r: any) => ({ ...toOrder(r), ahead: ACTIVE.includes(r.status) ? r.ahead : 0 })),
      minutesPerOrder: store.minutesPerOrder,
    });
  }],
  ["POST", /^\/orders\/(?<id>\d+)\/cancel$/, async (req, p) => {
    const u = await requireUser(req, ["customer"]);
    const rows = await db().sql`
      UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW(), cancel_reason = 'ลูกค้ายกเลิกเอง'
      WHERE id = ${Number(p.id)} AND user_id = ${u.id} AND status = 'pending' RETURNING *`;
    if (!rows[0]) throw new HttpError(409, "ยกเลิกไม่ได้ ครัวเริ่มทำออเดอร์นี้แล้ว");
    return json({ order: toOrder(rows[0]) });
  }],
  ["POST", /^\/orders\/(?<id>\d+)\/rate$/, async (req, p) => {
    const u = await requireUser(req, ["customer"]);
    const b = await readBody(req);
    const rating = int(b.rating, 1, 5, 5);
    const review = str(b.review, 300);
    const rows = await db().sql`
      UPDATE orders SET rating = ${rating}, review = ${review}, updated_at = NOW()
      WHERE id = ${Number(p.id)} AND user_id = ${u.id} AND status = 'completed' RETURNING *`;
    if (!rows[0]) throw new HttpError(409, "ให้คะแนนได้เฉพาะออเดอร์ที่รับแล้ว");
    return json({ order: toOrder(rows[0]) });
  }],

  /* ---------- kitchen ---------- */
  ["GET", /^\/kitchen\/orders$/, async (req) => {
    await requireUser(req, ["staff", "admin"]);
    const today = bkkDate();
    const rows = await db().sql`
      SELECT * FROM orders
      WHERE business_date = ${today} OR status IN ('pending', 'cooking', 'ready')
      ORDER BY created_at ASC`;
    return json({ orders: rows.map(toOrder), serverTime: Date.now() });
  }],
  ["POST", /^\/kitchen\/orders\/(?<id>\d+)\/status$/, async (req, p) => {
    await requireUser(req, ["staff", "admin"]);
    const b = await readBody(req);
    const to = str(b.status, 20);
    const from = str(b.from, 20);
    if (!TRANSITIONS[from]?.includes(to)) throw new HttpError(400, "เปลี่ยนสถานะไม่ได้");
    const reason = to === "cancelled" ? str(b.reason, 120) || "ร้านยกเลิก" : null;
    const rows = await db().sql`
      UPDATE orders SET
        status = ${to}::text,
        updated_at = NOW(),
        cooking_at = CASE WHEN ${to}::text = 'cooking' THEN COALESCE(cooking_at, NOW())
                          WHEN ${to}::text = 'pending' THEN NULL ELSE cooking_at END,
        ready_at = CASE WHEN ${to}::text = 'ready' THEN NOW()
                        WHEN ${to}::text IN ('pending', 'cooking') THEN NULL ELSE ready_at END,
        completed_at = CASE WHEN ${to}::text = 'completed' THEN NOW() ELSE NULL END,
        cancelled_at = CASE WHEN ${to}::text = 'cancelled' THEN NOW() ELSE NULL END,
        cancel_reason = ${reason}::text
      WHERE id = ${Number(p.id)} AND status = ${from}::text RETURNING *`;
    if (!rows[0]) throw new HttpError(409, "ออเดอร์นี้ถูกอัปเดตไปแล้ว กำลังรีเฟรช");
    return json({ order: toOrder(rows[0]) });
  }],
  ["POST", /^\/kitchen\/orders\/(?<id>\d+)\/paid$/, async (req, p) => {
    await requireUser(req, ["staff", "admin"]);
    const b = await readBody(req);
    const rows = await db().sql`
      UPDATE orders SET paid = ${!!b.paid}, updated_at = NOW() WHERE id = ${Number(p.id)} RETURNING *`;
    if (!rows[0]) throw new HttpError(404, "ไม่พบออเดอร์");
    return json({ order: toOrder(rows[0]) });
  }],
  ["PATCH", /^\/kitchen\/store$/, async (req) => {
    const u = await requireUser(req, ["staff", "admin"]);
    const patch = sanitizeStorePatch(await readBody(req), u.role === "admin");
    const store = await updateSetting("store", DEFAULT_STORE, (cur) => ({ ...cur, ...patch }));
    return json({ store });
  }],
  ["GET", /^\/kitchen\/store$/, async (req) => {
    await requireUser(req, ["staff", "admin"]);
    return json({ store: await getStore() });
  }],
  ["PATCH", /^\/kitchen\/stock$/, async (req) => {
    await requireUser(req, ["staff", "admin"]);
    const b = await readBody(req);
    const id = str(b.id, 32);
    let found = false;
    const menu = await updateSetting("menu", DEFAULT_MENU, (cur) => ({
      ...cur,
      toppingCategories: cur.toppingCategories.map((c) => ({
        ...c,
        items: c.items.map((t) => {
          if (t.id !== id) return t;
          found = true;
          return { ...t, available: !!b.available };
        }),
      })),
    }));
    if (!found) throw new HttpError(404, "ไม่พบท็อปปิ้ง");
    return json({ menu });
  }],
  ["GET", /^\/kitchen\/report$/, async (req, _p, url) => {
    await requireUser(req, ["staff", "admin"]);
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const from = url.searchParams.get("from") || bkkDate();
    const to = url.searchParams.get("to") || from;
    if (!re.test(from) || !re.test(to) || from > to) throw new HttpError(400, "ช่วงวันที่ไม่ถูกต้อง");
    const span = (Date.parse(to) - Date.parse(from)) / 86400000;
    if (span > 92) throw new HttpError(400, "เลือกช่วงได้ไม่เกิน 92 วัน");
    const rows = await db().sql`
      SELECT * FROM orders WHERE business_date BETWEEN ${from} AND ${to} ORDER BY created_at ASC LIMIT 20000`;
    return json({ from, to, orders: rows.map(toOrder) });
  }],

  /* ---------- admin ---------- */
  ["PUT", /^\/admin\/menu$/, async (req) => {
    await requireUser(req, ["admin"]);
    const next = sanitizeMenu(await readBody(req));
    const menu = await updateSetting("menu", DEFAULT_MENU, () => next);
    return json({ menu });
  }],
  ["GET", /^\/admin\/users$/, async (req) => {
    await requireUser(req, ["admin"]);
    const staff = await db().sql`SELECT * FROM users WHERE role IN ('staff', 'admin') ORDER BY role, created_at`;
    const [c] = await db().sql`SELECT COUNT(*)::int AS n FROM users WHERE role = 'customer'`;
    return json({ users: staff.map((u: any) => publicUser(u)), customerCount: c.n });
  }],
  ["POST", /^\/admin\/users$/, async (req) => {
    await requireUser(req, ["admin"]);
    const b = await readBody(req);
    const username = normUsername(b.username);
    if (!USERNAME_RE.test(username)) throw new HttpError(400, "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ หรือ . ยาว 3-24 ตัว");
    const role = b.role === "admin" ? "admin" : "staff";
    const hash = await hashPassword(checkPassword(b.password));
    const rows = await db().sql`
      INSERT INTO users (username, password_hash, role, display_name, phone)
      VALUES (${username}, ${hash}, ${role}, ${str(b.displayName, 40) || username}, ${normPhone(b.phone)})
      ON CONFLICT (username) DO NOTHING RETURNING *`;
    if (!rows[0]) throw new HttpError(409, "ชื่อผู้ใช้นี้ถูกใช้แล้ว");
    return json({ user: publicUser(rows[0] as User) }, 201);
  }],
  ["PATCH", /^\/admin\/users\/(?<id>\d+)$/, async (req, p) => {
    const me = await requireUser(req, ["admin"]);
    const id = Number(p.id);
    const b = await readBody(req);
    const [target] = await db().sql`SELECT * FROM users WHERE id = ${id} AND role IN ('staff', 'admin')`;
    if (!target) throw new HttpError(404, "ไม่พบผู้ใช้");
    if (id === me.id && (b.active === false || (b.role && b.role !== "admin"))) {
      throw new HttpError(400, "ไม่สามารถระงับหรือลดสิทธิ์บัญชีของตัวเองได้");
    }
    const active = "active" in b ? !!b.active : target.active;
    const role = b.role === "admin" || b.role === "staff" ? b.role : target.role;
    const displayName = "displayName" in b ? str(b.displayName, 40) || target.display_name : target.display_name;
    const hash = b.password ? await hashPassword(checkPassword(b.password)) : target.password_hash;
    const [row] = await db().sql`
      UPDATE users SET active = ${active}, role = ${role}, display_name = ${displayName}, password_hash = ${hash},
        failed_logins = 0, locked_until = NULL
      WHERE id = ${id} RETURNING *`;
    if (!active || b.password) await db().sql`DELETE FROM sessions WHERE user_id = ${id}`;
    return json({ user: publicUser(row as User) });
  }],
];

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  try {
    for (const [method, re, handler] of routes) {
      const m = path.match(re);
      if (m && method === req.method) return await handler(req, (m.groups || {}) as Params, url);
    }
    return json({ error: "ไม่พบเส้นทาง API" }, 404);
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่" }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};

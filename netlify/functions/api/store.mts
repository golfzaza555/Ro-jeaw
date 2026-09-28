import { db, HttpError, str, int } from "./core.mts";

/* ---------- defaults (seeded from the original shop menu) ---------- */
export const DEFAULT_MENU = {
  eggs: [
    { id: "e1", count: 1, label: "1 ฟอง", sub: "1 Egg", price: 35 },
    { id: "e2", count: 2, label: "2 ฟอง", sub: "2 Eggs", price: 45, popular: true },
    { id: "e3", count: 3, label: "3 ฟอง", sub: "3 Eggs", price: 55 },
  ],
  bases: [
    { id: "rice", label: "พร้อมข้าวสวย", sub: "With Jasmine Rice", delta: 0 },
    { id: "noRice", label: "ไข่เจียวอย่างเดียว", sub: "Omelette Only", delta: -5 },
  ],
  styles: [
    { id: "soft", label: "นุ่มฟู", sub: "Soft & Fluffy" },
    { id: "standard", label: "กำลังดี", sub: "Standard" },
    { id: "crispy", label: "กรอบฟู", sub: "Super Crispy" },
  ],
  toppingCategories: [
    {
      key: "meat", label: "เนื้อสัตว์ / โปรตีน", sub: "Meats & Proteins", emoji: "🍖",
      items: [
        { id: "pork", name: "หมูสับ", nameEn: "Minced Pork", emoji: "🥩", price: 0, available: true },
        { id: "sausage", name: "ไส้กรอก", nameEn: "Sausage", emoji: "🌭", price: 0, available: true },
        { id: "crab", name: "ปูอัด", nameEn: "Crab Stick", emoji: "🦀", price: 0, available: true },
        { id: "shrimp", name: "กุ้งสับ", nameEn: "Minced Shrimp", emoji: "🍤", price: 10, available: true },
        { id: "ham", name: "แฮม", nameEn: "Ham", emoji: "🍖", price: 0, available: true },
      ],
    },
    {
      key: "veggie", label: "ผัก", sub: "Veggies", emoji: "🌿",
      items: [
        { id: "scallion", name: "ต้นหอม", nameEn: "Spring Onion", emoji: "🌱", price: 0, available: true },
        { id: "onion", name: "หอมใหญ่", nameEn: "Onion", emoji: "🧅", price: 0, available: true },
        { id: "tomato", name: "มะเขือเทศ", nameEn: "Tomato", emoji: "🍅", price: 0, available: true },
        { id: "chili", name: "พริกขี้หนู", nameEn: "Chili", emoji: "🌶️", price: 0, available: true },
        { id: "corn", name: "ข้าวโพดหวาน", nameEn: "Sweet Corn", emoji: "🌽", price: 0, available: true },
        { id: "enoki", name: "เห็ดเข็มทอง", nameEn: "Enoki Mushroom", emoji: "🍄", price: 0, available: true },
        { id: "basil", name: "ใบโหระพา", nameEn: "Basil", emoji: "🍃", price: 0, available: true },
      ],
    },
    {
      key: "special", label: "ท็อปปิ้งพิเศษ", sub: "Special Toppings", emoji: "✨",
      items: [
        { id: "cheese", name: "ชีสยืด", nameEn: "Mozzarella Cheese", emoji: "🧀", price: 10, available: true },
        { id: "chilipaste", name: "พริกเผา", nameEn: "Chili Paste", emoji: "🔥", price: 0, available: true },
      ],
    },
  ],
  favorites: ["pork", "scallion", "cheese"],
  quickNotes: ["ขอพริกน้ำปลาเยอะๆ", "ไม่ใส่น้ำมันเยอะ", "ขอสุกเป็นพิเศษ", "แยกใส่กล่อง"],
};

export const DEFAULT_STORE = {
  open: true,
  announcement: "",
  promptpay: "",
  promptpayName: "",
  minutesPerOrder: 4,
  maxActive: 0, // 0 = unlimited
};

export type Menu = typeof DEFAULT_MENU;
export type StoreSettings = typeof DEFAULT_STORE;

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db().sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows[0] ? ({ ...fallback, ...(rows[0].value as object) } as T) : fallback;
}

export const getMenu = () => readSetting<Menu>("menu", DEFAULT_MENU);
export const getStore = () => readSetting<StoreSettings>("store", DEFAULT_STORE);

/** Read-modify-write a settings row inside a transaction so concurrent edits don't clobber each other. */
export async function updateSetting<T>(key: string, fallback: T, fn: (current: T) => T): Promise<T> {
  const client = await db().pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING",
      [key, JSON.stringify(fallback)],
    );
    const { rows } = await client.query("SELECT value FROM settings WHERE key = $1 FOR UPDATE", [key]);
    const next = fn({ ...fallback, ...rows[0].value });
    await client.query("UPDATE settings SET value = $2::jsonb, updated_at = NOW() WHERE key = $1", [
      key,
      JSON.stringify(next),
    ]);
    await client.query("COMMIT");
    return next;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/* ---------- sanitizers for admin edits ---------- */
const ID_RE = /^[a-zA-Z0-9_-]{1,32}$/;
const price = (v: unknown) => int(v, -1000, 10000, 0);

function cleanId(v: unknown, what: string): string {
  const id = str(v, 32);
  if (!ID_RE.test(id)) throw new HttpError(400, `รหัส${what}ไม่ถูกต้อง`);
  return id;
}

function uniqueIds(list: { id: string }[], what: string) {
  const seen = new Set<string>();
  for (const x of list) {
    if (seen.has(x.id)) throw new HttpError(400, `รหัส${what}ซ้ำ: ${x.id}`);
    seen.add(x.id);
  }
}

export function sanitizeMenu(input: any): Menu {
  if (!input || typeof input !== "object") throw new HttpError(400, "ข้อมูลเมนูไม่ถูกต้อง");
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const eggs = arr(input.eggs).slice(0, 10).map((e: any) => ({
    id: cleanId(e.id, "ไข่"),
    count: int(e.count, 1, 10, 1),
    label: str(e.label, 40) || "ไข่",
    sub: str(e.sub, 40),
    price: int(e.price, 0, 10000, 0),
    popular: !!e.popular,
  }));
  const bases = arr(input.bases).slice(0, 10).map((b: any) => ({
    id: cleanId(b.id, "ฐาน"),
    label: str(b.label, 40) || "ฐาน",
    sub: str(b.sub, 40),
    delta: price(b.delta),
  }));
  const styles = arr(input.styles).slice(0, 10).map((s: any) => ({
    id: cleanId(s.id, "สไตล์"),
    label: str(s.label, 40) || "สไตล์",
    sub: str(s.sub, 40),
  }));
  const toppingCategories = arr(input.toppingCategories).slice(0, 12).map((c: any) => ({
    key: cleanId(c.key, "หมวด"),
    label: str(c.label, 40) || "หมวด",
    sub: str(c.sub, 40),
    emoji: str(c.emoji, 8),
    items: arr(c.items).slice(0, 60).map((t: any) => ({
      id: cleanId(t.id, "ท็อปปิ้ง"),
      name: str(t.name, 40) || "ท็อปปิ้ง",
      nameEn: str(t.nameEn, 40),
      emoji: str(t.emoji, 8),
      price: int(t.price, 0, 10000, 0),
      available: t.available !== false,
    })),
  }));
  if (!eggs.length || !bases.length || !styles.length) throw new HttpError(400, "ต้องมีตัวเลือกไข่ ฐาน และสไตล์อย่างน้อยอย่างละ 1");
  uniqueIds(eggs, "ไข่");
  uniqueIds(bases, "ฐาน");
  uniqueIds(styles, "สไตล์");
  uniqueIds(toppingCategories.flatMap((c: any) => c.items), "ท็อปปิ้ง");
  const allIds = new Set(toppingCategories.flatMap((c: any) => c.items.map((t: any) => t.id)));
  return {
    eggs,
    bases,
    styles,
    toppingCategories,
    favorites: arr(input.favorites).map((x: unknown) => str(x, 32)).filter((id: string) => allIds.has(id)).slice(0, 10),
    quickNotes: arr(input.quickNotes).map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 12),
  } as Menu;
}

export function sanitizeStorePatch(input: any, isAdmin: boolean): Partial<StoreSettings> {
  const out: Partial<StoreSettings> = {};
  if ("open" in input) out.open = !!input.open;
  if ("announcement" in input) out.announcement = str(input.announcement, 280);
  if (isAdmin) {
    if ("promptpay" in input) {
      const pp = str(input.promptpay, 20).replace(/[^0-9]/g, "");
      if (pp && ![10, 13, 15].includes(pp.length)) throw new HttpError(400, "พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตร/นิติบุคคล 13 หลัก");
      out.promptpay = pp;
    }
    if ("promptpayName" in input) out.promptpayName = str(input.promptpayName, 60);
    if ("minutesPerOrder" in input) out.minutesPerOrder = int(input.minutesPerOrder, 1, 60, 4);
    if ("maxActive" in input) out.maxActive = int(input.maxActive, 0, 500, 0);
  }
  return out;
}

/* ---------- pricing (server is the source of truth) ---------- */
export function priceItems(menu: Menu, raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "ตะกร้าว่างเปล่า");
  if (raw.length > 20) throw new HttpError(400, "สั่งได้สูงสุด 20 รายการต่อออเดอร์");
  const toppings = new Map(menu.toppingCategories.flatMap((c) => c.items).map((t) => [t.id, t]));
  return raw.map((it: any) => {
    const egg = menu.eggs.find((e) => e.id === it?.eggId);
    const base = menu.bases.find((b) => b.id === it?.baseId);
    const style = menu.styles.find((s) => s.id === it?.styleId);
    if (!egg || !base || !style) throw new HttpError(409, "เมนูมีการเปลี่ยนแปลง กรุณาเลือกใหม่อีกครั้ง");
    const ids: string[] = Array.from(new Set(Array.isArray(it.toppings) ? it.toppings.map(String) : []));
    const tops = ids.map((id) => {
      const t = toppings.get(id);
      if (!t) throw new HttpError(409, "มีท็อปปิ้งที่ไม่มีในเมนูแล้ว กรุณาเลือกใหม่");
      if (!t.available) throw new HttpError(409, `ขออภัย "${t.name}" หมดแล้ว`);
      return { id: t.id, name: t.name, emoji: t.emoji, price: t.price };
    });
    const qty = int(it.qty, 1, 20, 1);
    const unitPrice = Math.max(0, egg.price + base.delta + tops.reduce((s, t) => s + t.price, 0));
    return {
      eggId: egg.id, baseId: base.id, styleId: style.id,
      egg: { label: egg.label, count: egg.count, price: egg.price },
      base: { label: base.label, delta: base.delta },
      style: { label: style.label },
      toppings: tops,
      qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    };
  });
}

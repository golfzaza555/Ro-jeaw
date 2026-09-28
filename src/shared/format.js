export const money = (n) => `฿${Number(n || 0).toLocaleString('th-TH')}`;

export const clock = (t) =>
  t ? new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) : '-';

export const dateTh = (t) =>
  new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' });

export function bkkDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

export function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return bkkDate(d);
}

export function countdown(ms) {
  const overdue = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(s / 60);
  return { overdue, text: `${overdue ? '-' : ''}${m}:${String(s % 60).padStart(2, '0')}` };
}

export const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

export const STATUS = {
  pending: { label: 'รอคิว', short: 'ใหม่', tone: 'yolk', emoji: '🧾' },
  cooking: { label: 'กำลังทอด', short: 'ทอด', tone: 'chili', emoji: '🍳' },
  ready: { label: 'พร้อมรับ', short: 'พร้อม', tone: 'basil', emoji: '🛍️' },
  completed: { label: 'รับแล้ว', short: 'เสร็จ', tone: 'ink', emoji: '✅' },
  cancelled: { label: 'ยกเลิก', short: 'ยกเลิก', tone: 'mute', emoji: '✖️' },
};

export const itemTitle = (it) => `ไข่เจียว ${it.egg.label} · ${it.base.label}`;
export const itemToppings = (it) => (it.toppings.length ? it.toppings.map((t) => t.name).join(', ') : 'ไม่ใส่ท็อปปิ้ง');

/* ---------- PromptPay (EMVCo merchant-presented QR) ---------- */
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;

function crc16(s) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function promptPayPayload(target, amount) {
  const t = String(target || '').replace(/[^0-9]/g, '');
  let account;
  if (t.length === 10 && t.startsWith('0')) account = tlv('01', `0066${t.slice(1)}`);
  else if (t.length === 13) account = tlv('02', t);
  else if (t.length === 15) account = tlv('03', t);
  else return null;
  let p = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('29', tlv('00', 'A000000677010111') + account) + tlv('58', 'TH') + tlv('53', '764');
  if (amount) p += tlv('54', Number(amount).toFixed(2));
  p += '6304';
  return p + crc16(p);
}

/* ---------- a short chime built with WebAudio (no audio files needed) ---------- */
let audioCtx = null;
export function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio */ }
}
export function chime(notes = [880, 1175]) {
  try {
    unlockAudio();
    const ctx = audioCtx;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t);
      o.stop(t + 0.36);
    });
  } catch { /* no audio */ }
}

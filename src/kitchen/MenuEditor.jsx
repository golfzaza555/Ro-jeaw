import { useState } from 'react';
import { Button, Switch, cx, useToast } from '../shared/ui.jsx';
import { IconPlus, IconTrash } from '../shared/icons.jsx';
import { api } from './api.js';

const cell = 'h-10 rounded-lg bg-night-900 border border-night-600 px-2.5 text-sm outline-none focus:border-yolk-400 min-w-0';

function Card({ title, sub, children, action }) {
  return (
    <section className="rounded-2xl bg-night-800 border border-night-700 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {sub && <p className="text-xs text-night-300">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);

export default function MenuEditor({ menu, onSaved }) {
  const toast = useToast();
  const [m, setM] = useState(() => structuredClone(menu));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(m) !== JSON.stringify(menu);

  const upd = (key, i, patch) => setM((s) => ({ ...s, [key]: s[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const updTop = (ci, ti, patch) => setM((s) => ({
    ...s,
    toppingCategories: s.toppingCategories.map((c, j) => (j !== ci ? c : { ...c, items: c.items.map((t, k) => (k === ti ? { ...t, ...patch } : t)) })),
  }));
  const addTop = (ci) => setM((s) => {
    const used = new Set(s.toppingCategories.flatMap((c) => c.items.map((t) => t.id)));
    let id = `t${used.size + 1}`;
    for (let n = used.size + 1; used.has(id); n++) id = `t${n}`;
    return { ...s, toppingCategories: s.toppingCategories.map((c, j) => (j !== ci ? c : { ...c, items: [...c.items, { id, name: '', nameEn: '', emoji: '🥄', price: 0, available: true }] })) };
  });
  const delTop = (ci, ti) => setM((s) => ({
    ...s,
    toppingCategories: s.toppingCategories.map((c, j) => (j !== ci ? c : { ...c, items: c.items.filter((_, k) => k !== ti) })),
  }));

  const save = async () => {
    // give new toppings a readable id derived from their English name
    const used = new Set(m.toppingCategories.flatMap((c) => c.items.filter((t) => !/^t\d+$/.test(t.id)).map((t) => t.id)));
    const renamed = {};
    const next = {
      ...m,
      toppingCategories: m.toppingCategories.map((c) => ({
        ...c,
        items: c.items.filter((t) => t.name.trim()).map((t) => {
          if (!/^t\d+$/.test(t.id)) return t;
          let id = slug(t.nameEn) || t.id;
          while (used.has(id)) id = `${id}x`;
          used.add(id);
          renamed[t.id] = id;
          return { ...t, id };
        }),
      })),
    };
    next.favorites = (m.favorites || []).map((id) => renamed[id] || id);
    setBusy(true);
    try {
      const r = await api.put('/admin/menu', next);
      onSaved(r.menu);
      setM(structuredClone(r.menu));
      toast('บันทึกเมนูแล้ว ลูกค้าเห็นราคาใหม่ทันที', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-4 pb-24">
      <div>
        <h2 className="font-display font-semibold text-2xl">เมนูและราคา</h2>
        <p className="text-sm text-night-300">แก้ไขชื่อ ราคา และท็อปปิ้ง · ออเดอร์เก่าจะเก็บราคาตอนที่สั่งไว้</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="🥚 จำนวนไข่ (ราคาหลัก)">
          <div className="space-y-2">
            {m.eggs.map((e, i) => (
              <div key={e.id} className="grid grid-cols-[1fr_84px_auto] gap-2 items-center">
                <input className={cell} value={e.label} onChange={(ev) => upd('eggs', i, { label: ev.target.value })} aria-label="ชื่อ" />
                <input className={cx(cell, 'tabular')} type="number" min={0} value={e.price} onChange={(ev) => upd('eggs', i, { price: Number(ev.target.value) })} aria-label="ราคา" />
                <button onClick={() => setM((s) => ({ ...s, eggs: s.eggs.map((x, j) => ({ ...x, popular: j === i ? !x.popular : x.popular })) }))}
                  className={cx('press h-10 px-2 rounded-lg text-xs font-bold', e.popular ? 'bg-chili-500 text-white' : 'bg-night-700 text-night-300')}>ขายดี</button>
              </div>
            ))}
          </div>
        </Card>
        <Card title="🍚 ฐานเสิร์ฟ" sub="ส่วนต่างราคา (ติดลบ = ลดราคา)">
          <div className="space-y-2">
            {m.bases.map((b, i) => (
              <div key={b.id} className="grid grid-cols-[1fr_84px] gap-2">
                <input className={cell} value={b.label} onChange={(ev) => upd('bases', i, { label: ev.target.value })} aria-label="ชื่อ" />
                <input className={cx(cell, 'tabular')} type="number" value={b.delta} onChange={(ev) => upd('bases', i, { delta: Number(ev.target.value) })} aria-label="ส่วนต่างราคา" />
              </div>
            ))}
          </div>
        </Card>
        <Card title="🔥 ความกรอบ">
          <div className="space-y-2">
            {m.styles.map((s, i) => (
              <div key={s.id} className="grid grid-cols-2 gap-2">
                <input className={cell} value={s.label} onChange={(ev) => upd('styles', i, { label: ev.target.value })} aria-label="ชื่อ" />
                <input className={cell} value={s.sub} onChange={(ev) => upd('styles', i, { sub: ev.target.value })} aria-label="คำอธิบาย" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {m.toppingCategories.map((c, ci) => (
        <Card key={c.key} title={`${c.emoji} ${c.label}`} sub="อีโมจิ · ชื่อไทย · ชื่ออังกฤษ · ราคาเพิ่ม · มีของ · ⭐ = อยู่ในชุดยอดนิยม"
          action={<Button size="sm" variant="nightOutline" onClick={() => addTop(ci)}><IconPlus size={15} /> เพิ่ม</Button>}>
          <div className="space-y-2 overflow-x-auto no-scrollbar [&>div]:min-w-[600px]">
            {c.items.map((t, ti) => {
              const fav = (m.favorites || []).includes(t.id);
              return (
                <div key={t.id} className="grid grid-cols-[52px_1fr_1fr_72px_auto_auto_auto] gap-2 items-center">
                  <input className={cx(cell, 'text-center text-lg px-1')} value={t.emoji} onChange={(ev) => updTop(ci, ti, { emoji: ev.target.value })} aria-label="อีโมจิ" />
                  <input className={cell} value={t.name} placeholder="ชื่อไทย" onChange={(ev) => updTop(ci, ti, { name: ev.target.value })} aria-label="ชื่อไทย" />
                  <input className={cell} value={t.nameEn} placeholder="English" onChange={(ev) => updTop(ci, ti, { nameEn: ev.target.value })} aria-label="ชื่ออังกฤษ" />
                  <input className={cx(cell, 'tabular')} type="number" min={0} value={t.price} onChange={(ev) => updTop(ci, ti, { price: Number(ev.target.value) })} aria-label="ราคาเพิ่ม" />
                  <Switch checked={t.available} onChange={(v) => updTop(ci, ti, { available: v })} label="มีของ" />
                  <button onClick={() => setM((s) => ({ ...s, favorites: fav ? s.favorites.filter((x) => x !== t.id) : [...(s.favorites || []), t.id] }))}
                    className={cx('press w-9 h-9 rounded-lg', fav ? 'text-yolk-300' : 'text-night-500 hover:text-night-300')} aria-label="ชุดยอดนิยม">★</button>
                  <button onClick={() => delTop(ci, ti)} className="press w-9 h-9 rounded-lg text-night-300 hover:text-chili-100 hover:bg-chili-500/20 flex items-center justify-center" aria-label="ลบ"><IconTrash size={16} /></button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card title="💬 ข้อความด่วนสำหรับหมายเหตุ" sub="คั่นด้วยบรรทัดใหม่">
        <textarea rows={4} value={(m.quickNotes || []).join('\n')} onChange={(e) => setM((s) => ({ ...s, quickNotes: e.target.value.split('\n') }))}
          className="w-full rounded-lg bg-night-900 border border-night-600 px-3 py-2 text-sm outline-none focus:border-yolk-400" />
      </Card>

      <div className={cx('fixed bottom-4 right-4 left-4 sm:left-auto z-20 transition-all', dirty ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none')}>
        <div className="rounded-2xl bg-night-700 border border-night-500 shadow-soft p-2.5 flex items-center gap-2">
          <span className="text-sm px-2">มีการแก้ไขที่ยังไม่บันทึก</span>
          <Button variant="nightOutline" size="sm" onClick={() => setM(structuredClone(menu))}>ยกเลิก</Button>
          <Button size="sm" loading={busy} onClick={() => save()}>บันทึกเมนู</Button>
        </div>
      </div>
    </div>
  );
}

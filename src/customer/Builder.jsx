import { useMemo, useState } from 'react';
import { cx } from '../shared/ui.jsx';
import { IconCheck, IconMinus, IconPlus, IconSearch, IconX, IconBag } from '../shared/icons.jsx';
import { money } from '../shared/format.js';
import { defaultDraft, priceLine, toppingMap } from './menu.js';

const STYLE_SWATCH = ['from-yolk-100 to-yolk-200', 'from-yolk-200 to-yolk-400', 'from-yolk-400 to-yolk-600'];

function Section({ n, title, sub, children, right }) {
  return (
    <section className="rounded-3xl bg-paper shadow-soft p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3 mb-3.5">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-yolk-600 uppercase">ขั้นที่ {n}</p>
          <h2 className="font-display font-semibold text-lg leading-tight">{title}</h2>
          {sub && <p className="text-xs text-ink-soft">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 20, small }) {
  const b = cx('press flex items-center justify-center rounded-xl bg-ink/5 hover:bg-ink/10 disabled:opacity-30', small ? 'w-8 h-8' : 'w-10 h-10');
  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" className={b} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="ลดจำนวน"><IconMinus size={16} /></button>
      <span className={cx('tabular font-semibold text-center', small ? 'w-5' : 'w-7 text-lg')}>{value}</span>
      <button type="button" className={b} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="เพิ่มจำนวน"><IconPlus size={16} /></button>
    </div>
  );
}

export default function Builder({ menu, onAdd, cartCount, cartTotal, onOpenCart, disabled }) {
  const [draft, setDraft] = useState(() => defaultDraft(menu));
  const [search, setSearch] = useState('');
  const tmap = useMemo(() => toppingMap(menu), [menu]);
  const priced = priceLine(menu, draft, tmap);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const toggle = (id) => set({ toppings: draft.toppings.includes(id) ? draft.toppings.filter((x) => x !== id) : [...draft.toppings, id] });
  const favorites = (menu.favorites || []).filter((id) => tmap.get(id)?.available);

  const q = search.trim().toLowerCase();
  const cats = menu.toppingCategories
    .map((c) => ({ ...c, items: c.items.filter((t) => !q || t.name.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length);

  const add = () => {
    onAdd(draft);
    setDraft((d) => ({ ...defaultDraft(menu), eggId: d.eggId, baseId: d.baseId, styleId: d.styleId }));
  };

  return (
    <div className="space-y-4 pb-40 lg:pb-4">
      <Section n={1} title="เลือกจำนวนไข่" sub="ทุกจานทอดสดใหม่ต่อออเดอร์">
        <div className="grid grid-cols-3 gap-2.5">
          {menu.eggs.map((e) => {
            const active = draft.eggId === e.id;
            return (
              <button key={e.id} type="button" onClick={() => set({ eggId: e.id })}
                className={cx('press relative rounded-2xl border-2 px-2 pt-4 pb-3 text-center',
                  active ? 'border-yolk-400 bg-yolk-50 shadow-yolk' : 'border-line hover:border-yolk-300')}>
                {e.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-chili-500 text-white text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">ขายดี</span>}
                <p className="text-xl leading-none tracking-tighter">{'🥚'.repeat(e.count)}</p>
                <p className="font-semibold mt-2">{e.label}</p>
                <p className="font-display font-semibold text-yolk-600">{money(e.price)}</p>
                {active && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yolk-400 flex items-center justify-center"><IconCheck size={13} strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} title="เสิร์ฟแบบไหน">
        <div className="grid grid-cols-2 gap-2.5">
          {menu.bases.map((b) => {
            const active = draft.baseId === b.id;
            return (
              <button key={b.id} type="button" onClick={() => set({ baseId: b.id })}
                className={cx('press rounded-2xl border-2 p-3.5 text-left', active ? 'border-yolk-400 bg-yolk-50' : 'border-line hover:border-yolk-300')}>
                <p className="font-semibold leading-snug">{b.label}</p>
                <p className="text-xs text-ink-soft">{b.sub}</p>
                <p className={cx('text-sm font-semibold mt-1', b.delta < 0 ? 'text-basil-600' : b.delta > 0 ? 'text-yolk-600' : 'text-ink-mute')}>
                  {b.delta === 0 ? 'ราคาปกติ' : `${b.delta > 0 ? '+' : ''}${b.delta} บาท`}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={3} title="ความกรอบ">
        <div className="grid grid-cols-3 gap-2.5">
          {menu.styles.map((s, i) => {
            const active = draft.styleId === s.id;
            return (
              <button key={s.id} type="button" onClick={() => set({ styleId: s.id })}
                className={cx('press rounded-2xl border-2 p-2 text-center', active ? 'border-ink' : 'border-line hover:border-yolk-300')}>
                <div className={cx('h-10 rounded-xl bg-gradient-to-br', STYLE_SWATCH[Math.min(i, 2)])} />
                <p className="font-semibold text-sm mt-2">{s.label}</p>
                <p className="text-[11px] text-ink-soft">{s.sub}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        n={4}
        title="ท็อปปิ้งบุฟเฟต์"
        sub={`ใส่ได้ไม่อั้น · เลือกแล้ว ${draft.toppings.length} อย่าง`}
        right={
          <div className="flex gap-1.5 shrink-0">
            {favorites.length > 0 && (
              <button type="button" onClick={() => set({ toppings: Array.from(new Set([...draft.toppings, ...favorites])) })}
                className="press text-xs font-semibold h-8 px-2.5 rounded-lg bg-yolk-100 text-yolk-700 hover:bg-yolk-200">⭐ ชุดยอดนิยม</button>
            )}
            {draft.toppings.length > 0 && (
              <button type="button" onClick={() => set({ toppings: [] })} className="press text-xs font-semibold h-8 px-2.5 rounded-lg bg-ink/5 hover:bg-ink/10">ล้าง</button>
            )}
          </div>
        }
      >
        <div className="relative mb-4">
          <IconSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาท็อปปิ้ง เช่น ชีส, กุ้ง"
            className="w-full h-11 rounded-xl border-2 border-line bg-cream/60 pl-10 pr-10 text-[15px] outline-none focus:border-yolk-400" />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-ink-mute" aria-label="ล้างคำค้นหา">
              <IconX size={16} />
            </button>
          )}
        </div>
        {cats.length === 0 && <p className="text-center text-sm text-ink-soft py-6">ไม่พบท็อปปิ้งที่ค้นหา</p>}
        <div className="space-y-4">
          {cats.map((c) => (
            <div key={c.key}>
              <p className="text-xs font-semibold text-ink-soft mb-2">{c.emoji} {c.label} <span className="font-normal text-ink-mute">· {c.sub}</span></p>
              <div className="flex flex-wrap gap-2">
                {c.items.map((t) => {
                  const active = draft.toppings.includes(t.id);
                  const out = !t.available;
                  return (
                    <button key={t.id} type="button" disabled={out} onClick={() => toggle(t.id)}
                      className={cx('press inline-flex items-center gap-1.5 h-10 pl-2.5 pr-3 rounded-full border-2 text-sm font-medium',
                        out ? 'border-line/60 bg-cream text-ink-mute line-through cursor-not-allowed'
                          : active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-yolk-300')}>
                      <span>{t.emoji}</span>
                      <span>{t.name}</span>
                      {t.price > 0 && !out && <span className={cx('text-xs font-semibold', active ? 'text-yolk-300' : 'text-yolk-600')}>+{t.price}</span>}
                      {out && <span className="text-[10px] no-underline">หมด</span>}
                      {active && <IconCheck size={14} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* add-to-cart bar: fixed above bottom nav on mobile, sticky in column on desktop */}
      <div className="fixed lg:sticky inset-x-0 bottom-[68px] lg:bottom-4 z-20 px-3 lg:px-0">
        {cartCount > 0 && (
          <button type="button" onClick={onOpenCart} className="lg:hidden block mx-auto mb-1.5 text-xs font-semibold text-ink bg-yolk-200 rounded-full px-3 py-1 shadow-soft">
            ในตะกร้า {cartCount} จาน · {money(cartTotal)} — ไปชำระเงิน →
          </button>
        )}
        <div className="max-w-2xl mx-auto rounded-3xl bg-ink text-paper shadow-soft p-2.5 flex items-center gap-2">
          <button type="button" onClick={onOpenCart} className="lg:hidden press relative w-12 h-12 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center" aria-label="เปิดตะกร้า">
            <IconBag size={22} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-chili-500 text-[11px] font-bold flex items-center justify-center">{cartCount}</span>}
          </button>
          <div className="bg-white/10 rounded-2xl px-1.5 py-1 text-paper [&_button]:bg-white/10 [&_button:hover]:bg-white/20">
            <QtyStepper value={draft.qty} onChange={(qty) => set({ qty })} small />
          </div>
          <button type="button" onClick={add} disabled={disabled || !priced.valid}
            className="press flex-1 h-12 rounded-2xl bg-yolk-400 hover:bg-yolk-300 text-ink font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
            ใส่ตะกร้า <span className="font-display">{money(priced.total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Switch, cx, useToast } from '../shared/ui.jsx';
import { api } from './api.js';

export default function Stock({ menu, onMenu }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const all = menu.toppingCategories.flatMap((c) => c.items);
  const outCount = all.filter((t) => !t.available).length;

  const toggle = async (t, available) => {
    setBusy(t.id);
    try {
      const r = await api.patch('/kitchen/stock', { id: t.id, available });
      onMenu(r.menu);
      toast(`${t.name}: ${available ? 'มีของ' : 'หมดแล้ว'}`, available ? 'success' : 'info');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-2xl">สต๊อกท็อปปิ้ง</h2>
          <p className="text-sm text-night-300">ปิดรายการที่หมด ลูกค้าจะเลือกไม่ได้ทันที</p>
        </div>
        <span className={cx('rounded-full px-3 py-1.5 text-sm font-semibold', outCount ? 'bg-chili-500/20 text-chili-100' : 'bg-basil-500/20 text-basil-100')}>
          {outCount ? `หมด ${outCount} รายการ` : 'ของครบทุกอย่าง'}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {menu.toppingCategories.map((c) => (
          <section key={c.key} className="rounded-2xl bg-night-800 border border-night-700 p-4">
            <h3 className="font-semibold mb-3">{c.emoji} {c.label}</h3>
            <ul className="space-y-1.5">
              {c.items.map((t) => (
                <li key={t.id} className={cx('flex items-center justify-between rounded-xl px-3 py-2.5', t.available ? 'bg-night-900' : 'bg-chili-500/10')}>
                  <span className={cx('flex items-center gap-2', !t.available && 'text-night-300 line-through')}>
                    <span className="text-lg">{t.emoji}</span> {t.name}
                    {t.price > 0 && <span className="text-xs text-yolk-300 no-underline">+{t.price}฿</span>}
                  </span>
                  <Switch checked={t.available} disabled={busy === t.id} onChange={(v) => toggle(t, v)} label={`สต๊อก ${t.name}`} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

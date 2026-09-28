import { useMemo, useState } from 'react';
import { Button, cx, inputCls, useToast } from '../shared/ui.jsx';
import { IconAlert, IconBag, IconCash, IconQr, IconTrash } from '../shared/icons.jsx';
import { clock, money } from '../shared/format.js';
import { priceLine, toppingMap } from './menu.js';
import { QtyStepper } from './Builder.jsx';
import { api } from './api.js';

const PICKUP_OPTIONS = [15, 30, 45];

function pickupTime(choice, custom, waitMinutes) {
  if (choice === 'asap') return Date.now() + waitMinutes * 60000;
  if (choice === 'custom') {
    if (!custom) return null;
    const [h, m] = custom.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return Date.now() + Math.max(choice, waitMinutes) * 60000;
}

export default function Cart({ info, cart, setCart, contact, setContact, onPlaced }) {
  const toast = useToast();
  const { menu, store, queue } = info;
  const tmap = useMemo(() => toppingMap(menu), [menu]);
  const lines = cart.map((l) => ({ line: l, p: priceLine(menu, l, tmap) }));
  const total = lines.reduce((s, x) => s + x.p.total, 0);
  const hasInvalid = lines.some((x) => !x.p.valid);

  const [choice, setChoice] = useState('asap');
  const [custom, setCustom] = useState('');
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('cash');
  const [busy, setBusy] = useState(false);

  const eta = pickupTime(choice, custom, queue.waitMinutes);
  const update = (key, patch) => setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key) => setCart((c) => c.filter((l) => l.key !== key));

  const submit = async () => {
    const pickupAt = pickupTime(choice, custom, queue.waitMinutes);
    if (!pickupAt) return toast('กรุณาเลือกเวลารับอาหาร', 'error');
    setBusy(true);
    try {
      const { order, token } = await api.post('/orders', {
        items: cart.map(({ eggId, baseId, styleId, toppings, qty }) => ({ eggId, baseId, styleId, toppings, qty })),
        pickupAt, name, phone, note, paymentMethod: payment,
      });
      setContact({ name: name.trim(), phone });
      setCart([]);
      setNote('');
      onPlaced(order, token);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="text-center py-10 px-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-yolk-100 flex items-center justify-center text-yolk-600"><IconBag size={28} /></div>
        <p className="font-semibold mt-3">ตะกร้ายังว่าง</p>
        <p className="text-sm text-ink-soft">เลือกไข่และท็อปปิ้ง แล้วกด “ใส่ตะกร้า”</p>
      </div>
    );
  }

  const chip = (active) => cx('press h-10 px-3.5 rounded-xl border-2 text-sm font-semibold', active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-yolk-300');

  return (
    <div className="space-y-5">
      <ul className="space-y-2.5">
        {lines.map(({ line, p }) => (
          <li key={line.key} className={cx('rounded-2xl border-2 p-3', p.valid ? 'border-line bg-cream/50' : 'border-chili-100 bg-chili-50')}>
            <div className="flex gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-yolk-100 flex items-center justify-center text-sm tracking-tighter">{'🥚'.repeat(p.eggCount)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-snug">{p.title}</p>
                <p className="text-xs text-ink-soft">ความกรอบ: {p.style}</p>
                <p className="text-xs text-ink-soft mt-0.5 line-clamp-2">{p.toppingNames.length ? p.toppingNames.join(' · ') : 'ไม่ใส่ท็อปปิ้ง'}</p>
                {!p.valid && (
                  <p className="text-xs text-chili-600 font-semibold mt-1 flex items-center gap-1">
                    <IconAlert size={13} /> {p.soldOut.length ? `${p.soldOut.join(', ')} หมดแล้ว` : 'เมนูมีการเปลี่ยนแปลง'} — กรุณาลบรายการนี้
                  </p>
                )}
              </div>
              <button type="button" onClick={() => remove(line.key)} className="press w-8 h-8 -mr-1 rounded-lg text-ink-mute hover:text-chili-500 flex items-center justify-center" aria-label="ลบรายการ">
                <IconTrash size={17} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 pl-14">
              <QtyStepper small value={line.qty} onChange={(qty) => update(line.key, { qty })} />
              <span className="font-display font-semibold tabular">{money(p.total)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <p className="font-semibold mb-2">เวลารับอาหาร</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(choice === 'asap')} onClick={() => setChoice('asap')}>เร็วที่สุด (~{queue.waitMinutes} นาที)</button>
          {PICKUP_OPTIONS.filter((m) => m > queue.waitMinutes).map((m) => (
            <button key={m} type="button" className={chip(choice === m)} onClick={() => setChoice(m)}>อีก {m} นาที</button>
          ))}
          <label className={cx(chip(choice === 'custom'), 'inline-flex items-center gap-2 cursor-pointer')}>
            ระบุเวลา
            <input type="time" value={custom} onChange={(e) => { setCustom(e.target.value); setChoice('custom'); }}
              className="bg-transparent outline-none w-[88px]" />
          </label>
        </div>
        {eta && <p className="text-sm text-basil-600 font-semibold mt-2">รับได้ประมาณ {clock(eta)} น. · คิวตอนนี้ {queue.active} ออเดอร์</p>}
      </div>

      <div>
        <p className="font-semibold mb-2">ข้อมูลผู้สั่ง</p>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block"><span className="text-sm font-medium">ชื่อ</span>
            <input className={cx(inputCls(), 'mt-1')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
              placeholder="เช่น ต้น" autoComplete="given-name" />
          </label>
          <label className="block"><span className="text-sm font-medium">เบอร์โทร</span>
            <input className={cx(inputCls(), 'mt-1')} value={phone} inputMode="tel" maxLength={10} placeholder="08xxxxxxxx" autoComplete="tel"
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
        </div>
        <p className="text-xs text-ink-soft mt-1.5">ไม่ต้องสมัครสมาชิก · ร้านจะเรียกคิวตามหมายเลขที่ได้รับ</p>
      </div>

      <div>
        <label className="block"><span className="text-sm font-medium">หมายเหตุถึงครัว</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={200} placeholder="เช่น ไม่ใส่ผงชูรส"
            className="mt-1 w-full rounded-xl border-2 border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-yolk-400 resize-none" />
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {(menu.quickNotes || []).map((t) => (
            <button key={t} type="button" onClick={() => setNote((n) => (n ? `${n}, ${t}` : t).slice(0, 200))}
              className="press text-xs h-8 px-2.5 rounded-full bg-ink/5 hover:bg-yolk-100">+ {t}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2">ชำระเงิน</p>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setPayment('cash')}
            className={cx('press rounded-2xl border-2 p-3 text-left flex items-center gap-2.5', payment === 'cash' ? 'border-ink bg-yolk-50' : 'border-line')}>
            <IconCash size={22} className="text-basil-600" />
            <span><span className="block font-semibold text-sm">เงินสด</span><span className="block text-xs text-ink-soft">จ่ายตอนรับ</span></span>
          </button>
          <button type="button" disabled={!store.promptpayEnabled} onClick={() => setPayment('promptpay')}
            className={cx('press rounded-2xl border-2 p-3 text-left flex items-center gap-2.5 disabled:opacity-40', payment === 'promptpay' ? 'border-ink bg-yolk-50' : 'border-line')}>
            <IconQr size={22} className="text-sky-500" />
            <span><span className="block font-semibold text-sm">พร้อมเพย์</span><span className="block text-xs text-ink-soft">{store.promptpayEnabled ? 'สแกน QR หลังสั่ง' : 'ยังไม่เปิดใช้'}</span></span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-ink text-paper p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-paper/70">รวม {cart.reduce((s, l) => s + l.qty, 0)} จาน</span>
          <span className="font-display font-bold text-2xl text-yolk-300 tabular">{money(total)}</span>
        </div>
        {!store.acceptingOrders && (
          <p className="text-sm text-chili-100 mt-2">{store.queueFull ? 'คิวเต็มชั่วคราว กรุณารอสักครู่' : 'ร้านปิดรับออเดอร์ในขณะนี้'}</p>
        )}
        <Button className="w-full mt-3" size="lg" loading={busy} disabled={!store.acceptingOrders || hasInvalid || !name || phone.length < 9} onClick={submit}>
          ยืนยันสั่งซื้อ
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Modal, StarRow, cx, useToast } from '../shared/ui.jsx';
import { IconBell, IconCheck, IconClock, IconQr, IconRepeat } from '../shared/icons.jsx';
import { STATUS, clock, dateTh, itemTitle, money, promptPayPayload } from '../shared/format.js';
import { api } from './api.js';

const STEPS = ['pending', 'cooking', 'ready', 'completed'];

function PromptPayQr({ target, name, amount }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const payload = promptPayPayload(target, amount);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 260, color: { dark: '#0b2a4a' } }).then(setSrc).catch(() => {});
  }, [target, amount]);
  return (
    <div className="rounded-2xl bg-white border-2 border-sky-50 p-4 text-center">
      <p className="text-xs font-semibold tracking-wider text-sky-500">PROMPTPAY</p>
      {src ? <img src={src} alt="QR พร้อมเพย์" className="w-52 h-52 mx-auto my-2" /> : <div className="w-52 h-52 mx-auto my-2 rounded-xl bg-sky-50" />}
      <p className="font-display font-bold text-2xl tabular">{money(amount)}</p>
      {name && <p className="text-sm text-ink-soft">ชื่อบัญชี: {name}</p>}
      <p className="text-xs text-ink-mute mt-1">สแกนด้วยแอปธนาคาร แล้วแสดงสลิปที่หน้าร้าน</p>
    </div>
  );
}

function ItemList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="font-semibold tabular w-6 shrink-0">{it.qty}×</span>
          <span className="flex-1 min-w-0">
            <span className="font-medium">{itemTitle(it)}</span>
            <span className="text-ink-soft"> · {it.style.label}</span>
            {it.toppings.length > 0 && <span className="block text-xs text-ink-soft">{it.toppings.map((t) => `${t.emoji} ${t.name}`).join('  ')}</span>}
          </span>
          <span className="tabular text-ink-soft">{money(it.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

function Tracker({ order, store, minutesPerOrder, onChanged }) {
  const toast = useToast();
  const [showQr, setShowQr] = useState(order.paymentMethod === 'promptpay' && !order.paid);
  const [busy, setBusy] = useState(false);
  const idx = STEPS.indexOf(order.status);
  const ready = order.status === 'ready';

  const cancel = async () => {
    if (!window.confirm(`ยกเลิกคิว ${order.code}?`)) return;
    setBusy(true);
    try {
      await api.post(`/orders/${order.id}/cancel`, { token: order.token });
      toast('ยกเลิกออเดอร์แล้ว', 'info');
      onChanged();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={cx('rounded-3xl shadow-soft overflow-hidden animate-rise', ready ? 'bg-basil-500 text-white' : 'bg-paper')}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={cx('text-xs font-semibold', ready ? 'text-white/80' : 'text-ink-soft')}>หมายเลขคิว</p>
            <p className="font-display font-bold text-6xl leading-none mt-1 tabular">{order.code}</p>
            <p className={cx('text-sm mt-1', ready ? 'text-white/80' : 'text-ink-soft')}>{order.name}</p>
          </div>
          <div className="text-right">
            <p className={cx('text-xs', ready ? 'text-white/80' : 'text-ink-soft')}>นัดรับ</p>
            <p className="font-display font-semibold text-2xl tabular">{clock(order.pickupAt)}</p>
          </div>
        </div>

        {ready ? (
          <p className="mt-4 text-lg font-semibold">อาหารพร้อมแล้ว! มารับที่ร้านได้เลย 🛍️</p>
        ) : (
          <p className="mt-4 text-sm text-ink-soft flex items-center gap-1.5">
            <IconClock size={16} />
            {order.status === 'pending'
              ? order.ahead > 0 ? `มี ${order.ahead} ออเดอร์ก่อนหน้าคุณ · รอประมาณ ${Math.max(3, (order.ahead + 1) * minutesPerOrder)} นาที` : 'คุณเป็นคิวถัดไป!'
              : 'ครัวกำลังทอดไข่ของคุณอยู่'}
          </p>
        )}

        <ol className="grid grid-cols-4 gap-1.5 mt-4">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={cx('h-1.5 rounded-full', i <= idx ? (ready ? 'bg-white' : 'bg-yolk-400') : ready ? 'bg-white/30' : 'bg-line')} />
              <p className={cx('text-[11px] mt-1.5 font-medium', i === idx ? '' : ready ? 'text-white/70' : 'text-ink-mute')}>{STATUS[s].label}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className={cx('px-5 py-4 space-y-4', ready ? 'bg-basil-600/40' : 'bg-cream/70 border-t border-line')}>
        <div className={ready ? '[&_*]:!text-white' : ''}><ItemList items={order.items} /></div>
        {order.note && <p className="text-sm">📝 {order.note}</p>}
        <div className="flex items-center justify-between">
          <span className={cx('text-sm font-semibold px-2.5 py-1 rounded-full',
            order.paid ? 'bg-basil-50 text-basil-600' : ready ? 'bg-white/20' : 'bg-yolk-100 text-yolk-700')}>
            {order.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด'} · {order.paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
          </span>
          <span className="font-display font-bold text-xl tabular">{money(order.total)}</span>
        </div>
        {order.paymentMethod === 'promptpay' && !order.paid && store.promptpay && (
          showQr
            ? <PromptPayQr target={store.promptpay} name={store.promptpayName} amount={order.total} />
            : <Button variant="outline" size="sm" onClick={() => setShowQr(true)}><IconQr size={16} /> แสดง QR ชำระเงิน</Button>
        )}
        {order.status === 'pending' && (
          <button type="button" onClick={cancel} disabled={busy} className="text-sm font-semibold text-chili-600 underline disabled:opacity-40">ยกเลิกออเดอร์</button>
        )}
      </div>
    </article>
  );
}

function RateModal({ order, onClose, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/${order.id}/rate`, { token: order.token, rating, review });
      toast('ขอบคุณสำหรับรีวิว!', 'success');
      onDone();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!order} onClose={onClose} title={`ให้คะแนนคิว ${order?.code || ''}`}>
      <div className="flex justify-center"><StarRow value={rating} onChange={setRating} size={36} /></div>
      <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} maxLength={300} placeholder="บอกเราหน่อย อร่อยไหม? (ไม่บังคับ)"
        className="mt-4 w-full rounded-xl border-2 border-line bg-paper px-3.5 py-2.5 outline-none focus:border-yolk-400 resize-none" />
      <Button className="w-full mt-3" loading={busy} onClick={submit}>ส่งรีวิว</Button>
    </Modal>
  );
}

export default function Orders({ orders, minutesPerOrder, store, onRefresh, onReorder, goOrder }) {
  const [rating, setRating] = useState(null);
  const [notifState, setNotifState] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const active = orders.filter((o) => ['pending', 'cooking', 'ready'].includes(o.status));
  const past = orders.filter((o) => !['pending', 'cooking', 'ready'].includes(o.status));

  const askNotif = async () => {
    try { setNotifState(await Notification.requestPermission()); } catch { /* unsupported */ }
  };

  return (
    <div className="space-y-6 pb-28">
      {active.length > 0 && notifState === 'default' && (
        <button type="button" onClick={askNotif} className="press w-full rounded-2xl bg-yolk-100 text-yolk-700 p-3.5 flex items-center gap-3 text-left">
          <IconBell size={22} />
          <span className="text-sm"><b>เปิดการแจ้งเตือน</b> เพื่อรู้ทันทีเมื่ออาหารพร้อม แม้ไม่ได้เปิดหน้านี้ค้างไว้</span>
        </button>
      )}

      {active.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-xl">กำลังดำเนินการ</h2>
          {active.map((o) => <Tracker key={o.id} order={o} store={store} minutesPerOrder={minutesPerOrder} onChanged={onRefresh} />)}
        </section>
      ) : (
        <div className="rounded-3xl bg-paper shadow-soft p-6 text-center">
          <p className="font-semibold">ยังไม่มีออเดอร์ที่กำลังทำ</p>
          <p className="text-sm text-ink-soft mt-1">หิวแล้วใช่ไหม? สั่งไข่เจียวจานโปรดได้เลย</p>
          <Button className="mt-4" onClick={goOrder}>สั่งอาหาร</Button>
        </div>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-3">ประวัติการสั่ง</h2>
          <ul className="space-y-2.5">
            {past.map((o) => (
              <li key={o.id} className="rounded-2xl bg-paper shadow-soft p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">คิว {o.code} <span className="text-ink-soft font-normal text-sm">· {dateTh(o.createdAt)} {clock(o.createdAt)}</span></p>
                    <p className={cx('text-xs font-semibold', o.status === 'cancelled' ? 'text-chili-600' : 'text-basil-600')}>
                      {o.status === 'cancelled' ? `ยกเลิก${o.cancelReason ? ` · ${o.cancelReason}` : ''}` : <span className="inline-flex items-center gap-1"><IconCheck size={13} strokeWidth={3} /> รับแล้ว</span>}
                    </p>
                  </div>
                  <span className="font-display font-semibold tabular">{money(o.total)}</span>
                </div>
                <p className="text-sm text-ink-soft mt-1.5 line-clamp-2">{o.items.map((it) => `${it.qty}× ${it.egg.label} (${it.toppings.map((t) => t.name).join(', ') || 'ไม่ใส่ท็อปปิ้ง'})`).join(' · ')}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => onReorder(o)}><IconRepeat size={15} /> สั่งอีกครั้ง</Button>
                  {o.status === 'completed' && (o.rating
                    ? <StarRow value={o.rating} size={16} />
                    : <Button size="sm" variant="ghost" onClick={() => setRating(o)}>⭐ ให้คะแนน</Button>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <RateModal order={rating} onClose={() => setRating(null)} onDone={() => { setRating(null); onRefresh(); }} />
    </div>
  );
}

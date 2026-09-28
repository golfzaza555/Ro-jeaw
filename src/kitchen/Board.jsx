import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, cx, useToast } from '../shared/ui.jsx';
import { IconClock, IconPhone, IconPrinter, IconSearch, IconUndo, IconX, IconChevronDown } from '../shared/icons.jsx';
import { STATUS, clock, countdown, money } from '../shared/format.js';
import { api } from './api.js';

const COLS = [
  { key: 'pending', title: 'ออเดอร์ใหม่', accent: 'bg-yolk-400', ring: 'border-yolk-400/40' },
  { key: 'cooking', title: 'กำลังทอด', accent: 'bg-chili-500', ring: 'border-chili-500/40' },
  { key: 'ready', title: 'รอลูกค้ารับ', accent: 'bg-basil-500', ring: 'border-basil-500/40' },
];
const NEXT = { pending: ['cooking', 'เริ่มทอด'], cooking: ['ready', 'ทอดเสร็จ · พร้อมรับ'], ready: ['completed', 'ลูกค้ารับแล้ว'] };
const PREV = { cooking: 'pending', ready: 'cooking', completed: 'ready' };
const NEXT_BTN = { pending: 'bg-yolk-400 hover:bg-yolk-300 text-ink', cooking: 'bg-basil-500 hover:bg-basil-600 text-white', ready: 'bg-night-100 hover:bg-white text-ink' };
const CANCEL_REASONS = ['วัตถุดิบหมด', 'ลูกค้าไม่มารับ', 'ลูกค้าขอยกเลิก', 'ร้านปิดก่อนเวลา'];

function PrintTicket({ order }) {
  if (!order) return null;
  return (
    <div id="print-area">
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>ไข่เจียว TonyStark 001</div>
      <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, margin: '4px 0' }}>{order.code}</div>
      <div>ลูกค้า: {order.name} ({order.phone})</div>
      <div>นัดรับ: {clock(order.pickupAt)} น. · สั่ง {clock(order.createdAt)}</div>
      <hr />
      {order.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <b>{it.qty}× ไข่ {it.egg.label} · {it.base.label} · {it.style.label}</b>
          <div>{it.toppings.map((t) => t.name).join(', ') || '(ไม่ใส่ท็อปปิ้ง)'}</div>
        </div>
      ))}
      {order.note && <div><b>หมายเหตุ:</b> {order.note}</div>}
      <hr />
      <div>รวม {money(order.total)} · {order.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด'} · {order.paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</div>
    </div>
  );
}

function OrderCard({ order, now, fresh, onAction, onCancel, onPrint, busy }) {
  const active = order.status === 'pending' || order.status === 'cooking';
  const { overdue, text } = countdown(new Date(order.pickupAt).getTime() - now);
  const late = active && overdue;
  const waited = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
  const next = NEXT[order.status];
  const qty = order.items.reduce((s, it) => s + it.qty, 0);

  return (
    <article className={cx('rounded-2xl bg-night-800 border-2 p-3.5 transition-colors',
      late ? 'border-chili-500 animate-alert' : fresh ? 'border-yolk-400 animate-pop' : 'border-night-700')}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-3xl leading-none tabular">{order.code}</p>
            {fresh && <span className="rounded-full bg-yolk-400 text-ink text-[10px] font-bold px-2 py-0.5">ใหม่</span>}
          </div>
          <p className="text-sm text-night-300 mt-1 truncate">{order.name} · {qty} จาน</p>
          <a href={`tel:${order.phone}`} className="text-xs text-night-300 hover:text-yolk-300 inline-flex items-center gap-1"><IconPhone size={12} />{order.phone}</a>
        </div>
        <div className={cx('shrink-0 text-right rounded-xl px-2.5 py-1.5', late ? 'bg-chili-500 text-white' : 'bg-night-700')}>
          <p className="font-display font-semibold text-lg leading-none tabular flex items-center gap-1 justify-end"><IconClock size={14} />{clock(order.pickupAt)}</p>
          <p className="text-[10px] mt-1 opacity-80 tabular">{active ? (overdue ? `เลยเวลา ${text.slice(1)}` : `อีก ${text}`) : `สั่ง ${waited} นาทีก่อน`}</p>
        </div>
      </header>

      <ul className="mt-3 space-y-2.5">
        {order.items.map((it, i) => (
          <li key={i} className="rounded-xl bg-night-900/70 p-2.5">
            <p className="font-semibold text-[15px]">
              <span className="text-yolk-300 tabular">{it.qty}×</span> ไข่ {it.egg.label} · {it.base.label}
              <span className="ml-1.5 rounded-md bg-yolk-400/15 text-yolk-200 px-1.5 py-0.5 text-xs font-bold">{it.style.label}</span>
            </p>
            {it.toppings.length > 0 ? (
              <p className="text-[15px] text-night-100 mt-1 leading-relaxed">{it.toppings.map((t) => `${t.emoji} ${t.name}`).join('   ')}</p>
            ) : (
              <p className="text-sm text-night-300 mt-1">ไม่ใส่ท็อปปิ้ง</p>
            )}
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2.5 rounded-xl bg-chili-500/15 text-chili-100 px-3 py-2 text-sm font-medium">📝 {order.note}</p>}

      <div className="flex items-center justify-between mt-3 gap-2">
        <button onClick={() => onAction(order, 'paid')} disabled={busy}
          className={cx('press h-8 px-2.5 rounded-lg text-xs font-bold',
            order.paid ? 'bg-basil-500/20 text-basil-100' : 'bg-night-700 text-night-300 hover:text-night-100')}>
          {order.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'เงินสด'} {money(order.total)} · {order.paid ? '✓ ชำระแล้ว' : 'แตะเมื่อได้รับเงิน'}
        </button>
        <div className="flex gap-1">
          {PREV[order.status] && (
            <button onClick={() => onAction(order, PREV[order.status])} disabled={busy} title="ย้อนสถานะ" aria-label="ย้อนสถานะ"
              className="press w-8 h-8 rounded-lg bg-night-700 text-night-300 hover:text-night-100 flex items-center justify-center"><IconUndo size={15} /></button>
          )}
          <button onClick={() => onPrint(order)} title="พิมพ์ใบออเดอร์" aria-label="พิมพ์ใบออเดอร์"
            className="press w-8 h-8 rounded-lg bg-night-700 text-night-300 hover:text-night-100 flex items-center justify-center"><IconPrinter size={15} /></button>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button onClick={() => onCancel(order)} disabled={busy} title="ยกเลิกออเดอร์" aria-label="ยกเลิกออเดอร์"
              className="press w-8 h-8 rounded-lg bg-night-700 text-night-300 hover:text-chili-100 hover:bg-chili-500/30 flex items-center justify-center"><IconX size={15} /></button>
          )}
        </div>
      </div>

      {next && (
        <button onClick={() => onAction(order, next[0])} disabled={busy}
          className={cx('press w-full h-12 mt-3 rounded-xl font-display font-semibold text-base disabled:opacity-50', NEXT_BTN[order.status])}>
          {next[1]} →
        </button>
      )}
    </article>
  );
}

function PrepSummary({ orders }) {
  const rows = useMemo(() => {
    const eggs = {};
    const tops = {};
    let plates = 0;
    orders.filter((o) => o.status === 'pending' || o.status === 'cooking').forEach((o) => o.items.forEach((it) => {
      plates += it.qty;
      eggs[it.style.label] = (eggs[it.style.label] || 0) + it.qty * (it.egg.count || 1);
      it.toppings.forEach((t) => { tops[`${t.emoji} ${t.name}`] = (tops[`${t.emoji} ${t.name}`] || 0) + it.qty; });
    }));
    return { plates, eggs: Object.entries(eggs), tops: Object.entries(tops).sort((a, b) => b[1] - a[1]) };
  }, [orders]);

  return (
    <aside className="rounded-2xl bg-night-800 border border-night-700 p-4 xl:sticky xl:top-36">
      <h3 className="font-display font-semibold text-lg">เตรียมวัตถุดิบ</h3>
      <p className="text-xs text-night-300">รวมจากออเดอร์ใหม่ + กำลังทอด</p>
      {rows.plates === 0 ? (
        <p className="text-sm text-night-300 mt-4">ยังไม่มีงานค้าง ☕</p>
      ) : (
        <>
          <p className="mt-3 font-display text-3xl font-bold text-yolk-300 tabular">{rows.plates} <span className="text-base text-night-300 font-normal">จาน</span></p>
          <div className="mt-2 space-y-1">
            {rows.eggs.map(([k, v]) => (
              <p key={k} className="flex justify-between text-sm"><span>🥚 ไข่ ({k})</span><span className="font-semibold tabular">{v} ฟอง</span></p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-night-700 space-y-1">
            {rows.tops.map(([k, v]) => (
              <p key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-semibold tabular">×{v}</span></p>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

export default function Board({ orders, now, freshIds, onPatched, reload }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');
  const [printing, setPrinting] = useState(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!printing) return undefined;
    const t = setTimeout(() => { window.print(); setPrinting(null); }, 50);
    return () => clearTimeout(t);
  }, [printing]);

  const query = q.trim().toLowerCase();
  const match = (o) => !query || o.code.includes(query) || String(o.no) === query || o.name.toLowerCase().includes(query) || o.phone.includes(query);
  const byPickup = (a, b) => new Date(a.pickupAt) - new Date(b.pickupAt);
  const visible = orders.filter(match);
  const done = visible.filter((o) => o.status === 'completed' || o.status === 'cancelled').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const act = async (order, to, why) => {
    setBusyId(order.id);
    try {
      const r = to === 'paid'
        ? await api.post(`/kitchen/orders/${order.id}/paid`, { paid: !order.paid })
        : await api.post(`/kitchen/orders/${order.id}/status`, { from: order.status, status: to, reason: why });
      onPatched(r.order);
      if (to === 'ready') toast(`${order.code} พร้อมรับ — แจ้งลูกค้าแล้ว`, 'success');
    } catch (e) {
      toast(e.message, 'error');
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    const o = cancelling;
    setCancelling(null);
    await act(o, 'cancelled', reason || 'ร้านยกเลิก');
    setReason('');
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-night-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเลขออเดอร์ ชื่อ หรือเบอร์โทร"
            className="w-full h-10 rounded-xl bg-night-800 border border-night-600 pl-9 pr-3 text-sm outline-none focus:border-yolk-400 placeholder:text-night-500" />
        </div>
        <p className="text-xs text-night-300">อัปเดตอัตโนมัติทุก 7 วินาที</p>
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_1fr_260px] gap-4 items-start">
        <div className="xl:contents flex gap-4 overflow-x-auto no-scrollbar snap-x pb-2">
          {COLS.map((col) => {
            const list = visible.filter((o) => o.status === col.key).sort(byPickup);
            return (
              <section key={col.key} className="snap-start shrink-0 w-[86vw] sm:w-[360px] xl:w-auto">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span className={cx('w-2.5 h-2.5 rounded-full', col.accent)} />
                  <h2 className="font-display font-semibold text-lg">{col.title}</h2>
                  <span className="ml-auto min-w-7 h-7 px-2 rounded-full bg-night-800 border border-night-600 text-sm font-bold flex items-center justify-center tabular">{list.length}</span>
                </div>
                <div className={cx('rounded-2xl border border-dashed p-2 space-y-2.5 min-h-[180px]', col.ring)}>
                  {list.length === 0 && <p className="text-center text-sm text-night-500 py-12">ว่าง</p>}
                  {list.map((o) => (
                    <OrderCard key={o.id} order={o} now={now} fresh={freshIds.has(o.id)} busy={busyId === o.id}
                      onAction={act} onCancel={setCancelling} onPrint={setPrinting} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <PrepSummary orders={orders} />
      </div>

      <section className="mt-6">
        <button onClick={() => setShowDone((s) => !s)} className="press flex items-center gap-2 font-display font-semibold text-lg">
          เสร็จ/ยกเลิกวันนี้ <span className="text-night-300 text-base">({done.length})</span>
          <IconChevronDown size={18} className={cx('transition-transform', showDone && 'rotate-180')} />
        </button>
        {showDone && (
          <div className="mt-3 rounded-2xl bg-night-800 border border-night-700 divide-y divide-night-700">
            {done.length === 0 && <p className="p-4 text-sm text-night-300">ยังไม่มี</p>}
            {done.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-display font-bold text-lg w-16 tabular">{o.code}</span>
                <span className="flex-1 min-w-[140px]">{o.name} · {o.items.reduce((s, it) => s + it.qty, 0)} จาน</span>
                <span className={cx('font-semibold', o.status === 'cancelled' ? 'text-chili-100' : 'text-basil-100')}>
                  {STATUS[o.status].label}{o.cancelReason ? ` · ${o.cancelReason}` : ''}
                </span>
                <span className="tabular w-16 text-right">{money(o.total)}</span>
                <span className="text-night-300 tabular">{clock(o.completedAt || o.cancelledAt)}</span>
                {o.rating && <span className="text-yolk-300">{'★'.repeat(o.rating)}</span>}
                {o.status === 'completed' && (
                  <button onClick={() => act(o, 'ready')} className="press text-xs text-night-300 hover:text-night-100 inline-flex items-center gap-1"><IconUndo size={13} /> ย้อนกลับ</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal dark open={!!cancelling} onClose={() => setCancelling(null)} title={`ยกเลิกออเดอร์ ${cancelling?.code || ''}`}>
        <p className="text-sm text-night-300 mb-3">ลูกค้าจะเห็นเหตุผลนี้ในหน้าติดตามออเดอร์</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CANCEL_REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)}
              className={cx('press h-9 px-3 rounded-xl text-sm font-semibold border', reason === r ? 'bg-yolk-400 text-ink border-yolk-400' : 'border-night-600 bg-night-900')}>{r}</button>
          ))}
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="หรือพิมพ์เหตุผลเอง"
          className="w-full h-11 rounded-xl bg-night-900 border border-night-600 px-3.5 outline-none focus:border-yolk-400" />
        <div className="flex gap-2 mt-4">
          <Button variant="nightOutline" className="flex-1" onClick={() => setCancelling(null)}>ไม่ยกเลิก</Button>
          <Button variant="danger" className="flex-1" onClick={confirmCancel}>ยืนยันยกเลิก</Button>
        </div>
      </Modal>

      <PrintTicket order={printing} />
    </>
  );
}

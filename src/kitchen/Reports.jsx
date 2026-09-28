import { useEffect, useMemo, useState } from 'react';
import { Button, Segmented, Spinner, cx, useToast } from '../shared/ui.jsx';
import { IconDownload } from '../shared/icons.jsx';
import { addDays, bkkDate, clock, dateTh, minutesBetween, money } from '../shared/format.js';
import { api } from './api.js';

const RANGES = [
  { value: 'today', label: 'วันนี้' },
  { value: 'yesterday', label: 'เมื่อวาน' },
  { value: '7', label: '7 วัน' },
  { value: '30', label: '30 วัน' },
];

function rangeFor(v) {
  const today = bkkDate();
  if (v === 'today') return [today, today];
  if (v === 'yesterday') { const y = addDays(today, -1); return [y, y]; }
  return [addDays(today, -(Number(v) - 1)), today];
}

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-night-800 border border-night-700 p-4">
      <p className="text-xs text-night-300">{label}</p>
      <p className="font-display font-bold text-2xl sm:text-3xl mt-1 tabular">{value}</p>
      {sub && <p className="text-xs text-night-300 mt-0.5">{sub}</p>}
    </div>
  );
}

function Bars({ data, format = (v) => v, height = 140 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 overflow-x-auto no-scrollbar" style={{ height: height + 34 }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 min-w-[22px] flex flex-col items-center justify-end h-full group">
          <span className="text-[10px] text-night-300 mb-1 tabular opacity-0 group-hover:opacity-100">{d.value ? format(d.value) : ''}</span>
          <div className={cx('w-full rounded-t-md', d.value ? 'bg-yolk-400' : 'bg-night-700')} style={{ height: Math.max(3, (d.value / max) * height) }} title={`${d.label}: ${format(d.value)}`} />
          <span className="text-[10px] text-night-300 mt-1.5 tabular whitespace-nowrap">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function toCsv(orders) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['วันที่', 'เลขออเดอร์', 'สถานะ', 'ชื่อ', 'เบอร์', 'รายการ', 'หมายเหตุ', 'ยอดรวม', 'ชำระเงิน', 'ชำระแล้ว', 'เวลาสั่ง', 'นัดรับ', 'คะแนน', 'รีวิว'];
  const rows = orders.map((o) => [
    o.businessDate, o.code, o.status, o.name, o.phone,
    o.items.map((it) => `${it.qty}x ${it.egg.label} ${it.base.label} ${it.style.label} [${it.toppings.map((t) => t.name).join('/')}]`).join(' | '),
    o.note, o.total, o.paymentMethod, o.paid ? 'Y' : 'N', clock(o.createdAt), clock(o.pickupAt), o.rating || '', o.review || '',
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export default function Reports() {
  const toast = useToast();
  const [range, setRange] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const [from, to] = rangeFor(range);
    setLoading(true);
    api.get(`/kitchen/report?from=${from}&to=${to}`)
      .then(setData)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [range, toast]);

  const s = useMemo(() => {
    if (!data) return null;
    const valid = data.orders.filter((o) => o.status !== 'cancelled');
    const done = data.orders.filter((o) => o.status === 'completed');
    const revenue = valid.reduce((a, o) => a + o.total, 0);
    const plates = valid.reduce((a, o) => a + o.items.reduce((b, it) => b + it.qty, 0), 0);
    const prep = data.orders.filter((o) => o.readyAt).map((o) => minutesBetween(o.createdAt, o.readyAt));
    const rated = data.orders.filter((o) => o.rating);
    const tops = {};
    const styles = {};
    valid.forEach((o) => o.items.forEach((it) => {
      styles[it.style.label] = (styles[it.style.label] || 0) + it.qty;
      it.toppings.forEach((t) => { const k = `${t.emoji} ${t.name}`; tops[k] = (tops[k] || 0) + it.qty; });
    }));
    const multiDay = data.from !== data.to;
    let series;
    if (multiDay) {
      series = [];
      for (let d = data.from; d <= data.to; d = addDays(d, 1)) {
        series.push({ label: d.slice(8) + '/' + d.slice(5, 7), value: valid.filter((o) => o.businessDate === d).reduce((a, o) => a + o.total, 0) });
      }
    } else {
      const hours = {};
      valid.forEach((o) => {
        const h = Number(new Date(o.createdAt).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }));
        hours[h] = (hours[h] || 0) + 1;
      });
      const hs = Object.keys(hours).map(Number);
      const lo = hs.length ? Math.min(...hs, 7) : 7;
      const hi = hs.length ? Math.max(...hs, 20) : 20;
      series = [];
      for (let h = lo; h <= hi; h++) series.push({ label: `${String(h).padStart(2, '0')}`, value: hours[h] || 0 });
    }
    return {
      revenue, plates, count: valid.length, cancelled: data.orders.length - valid.length,
      unpaid: valid.filter((o) => !o.paid && o.status === 'completed').reduce((a, o) => a + o.total, 0),
      avgTicket: valid.length ? Math.round(revenue / valid.length) : 0,
      avgPrep: prep.length ? Math.round(prep.reduce((a, b) => a + b, 0) / prep.length) : null,
      rating: rated.length ? (rated.reduce((a, o) => a + o.rating, 0) / rated.length).toFixed(1) : null,
      ratedCount: rated.length,
      reviews: rated.filter((o) => o.review).slice(-6).reverse(),
      tops: Object.entries(tops).sort((a, b) => b[1] - a[1]).slice(0, 8),
      styles: Object.entries(styles),
      done: done.length,
      series, multiDay,
    };
  }, [data]);

  const download = () => {
    const blob = new Blob([toCsv(data.orders)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_${data.from}_${data.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const maxTop = s?.tops[0]?.[1] || 1;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-semibold text-2xl">สรุปยอดขาย</h2>
          {loading && <Spinner className="w-4 h-4 text-yolk-400" />}
        </div>
        <div className="flex items-center gap-2">
          <Segmented dark options={RANGES} value={range} onChange={setRange} />
          <Button variant="nightOutline" size="sm" onClick={download} disabled={!data?.orders.length}><IconDownload size={16} /> CSV</Button>
        </div>
      </div>

      {!s ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="ยอดขาย" value={money(s.revenue)} sub={s.unpaid ? `ยังไม่บันทึกรับเงิน ${money(s.unpaid)}` : 'ไม่รวมออเดอร์ที่ยกเลิก'} />
            <Kpi label="ออเดอร์" value={s.count} sub={`${s.plates} จาน · ยกเลิก ${s.cancelled}`} />
            <Kpi label="เฉลี่ยต่อออเดอร์" value={money(s.avgTicket)} sub={s.avgPrep != null ? `เวลาทำเฉลี่ย ${s.avgPrep} นาที` : 'ยังไม่มีข้อมูลเวลา'} />
            <Kpi label="คะแนนรีวิว" value={s.rating ? `★ ${s.rating}` : '-'} sub={`${s.ratedCount} รีวิว`} />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <section className="rounded-2xl bg-night-800 border border-night-700 p-4">
              <h3 className="font-semibold mb-3">{s.multiDay ? 'ยอดขายรายวัน (บาท)' : 'จำนวนออเดอร์รายชั่วโมง'}</h3>
              <Bars data={s.series} format={s.multiDay ? money : (v) => `${v} ออเดอร์`} />
            </section>
            <section className="rounded-2xl bg-night-800 border border-night-700 p-4">
              <h3 className="font-semibold mb-3">ท็อปปิ้งขายดี</h3>
              {s.tops.length === 0 ? <p className="text-sm text-night-300">ยังไม่มีข้อมูล</p> : (
                <ul className="space-y-2">
                  {s.tops.map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 text-sm">
                      <span className="w-28 truncate">{k}</span>
                      <span className="flex-1 h-2.5 rounded-full bg-night-700 overflow-hidden"><span className="block h-full bg-yolk-400 rounded-full" style={{ width: `${(v / maxTop) * 100}%` }} /></span>
                      <span className="w-8 text-right tabular font-semibold">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.styles.length > 0 && (
                <p className="text-xs text-night-300 mt-4">ความกรอบ: {s.styles.map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
              )}
            </section>
          </div>

          <section className="rounded-2xl bg-night-800 border border-night-700 p-4">
            <h3 className="font-semibold mb-3">รีวิวล่าสุด</h3>
            {s.reviews.length === 0 ? <p className="text-sm text-night-300">ยังไม่มีรีวิวที่เขียนข้อความ</p> : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {s.reviews.map((o) => (
                  <li key={o.id} className="rounded-xl bg-night-900 p-3">
                    <p className="text-yolk-300 text-sm">{'★'.repeat(o.rating)}<span className="text-night-500">{'★'.repeat(5 - o.rating)}</span></p>
                    <p className="text-sm mt-1">“{o.review}”</p>
                    <p className="text-xs text-night-300 mt-1">{o.name} · {o.code} · {dateTh(o.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

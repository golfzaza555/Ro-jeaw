import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Brand, OmeletteMark, cx } from '../shared/ui.jsx';
import { IconChef, IconChevronRight, IconClock, IconMegaphone, IconBag } from '../shared/icons.jsx';
import { money } from '../shared/format.js';

function Landing() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch('/api/store').then((r) => (r.ok ? r.json() : null)).then(setInfo).catch(() => {});
  }, []);
  const store = info?.store;
  const menu = info?.menu;
  const open = store?.acceptingOrders;

  return (
    <div className="min-h-dvh bg-speckle">
      <header className="max-w-5xl mx-auto px-4 pt-5 flex items-center justify-between gap-3">
        <Brand sub="Omelette Buffet Pre-order" />
        <a href="/kitchen/" className="press inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink px-3 h-9 rounded-xl hover:bg-ink/5">
          <IconChef size={17} /> สำหรับพนักงาน
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <section className="grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-center pt-10 md:pt-16">
          <div className="animate-rise">
            {store && (
              <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold',
                open ? 'bg-basil-50 text-basil-600' : 'bg-chili-50 text-chili-600')}>
                <span className={cx('w-2 h-2 rounded-full', open ? 'bg-basil-500' : 'bg-chili-500')} />
                {open ? `เปิดรับออเดอร์ · รอประมาณ ${info.queue.waitMinutes} นาที` : store.queueFull ? 'คิวเต็มชั่วคราว' : 'ร้านปิดอยู่ตอนนี้'}
              </span>
            )}
            <h1 className="font-display font-bold text-[40px] leading-[1.15] sm:text-6xl mt-4 text-ink">
              ไข่เจียวฟูกรอบ<br />
              <span className="relative inline-block">
                <span className="relative z-10">ท็อปปิ้งไม่อั้น</span>
                <span className="absolute left-0 right-0 bottom-1 h-4 bg-yolk-300/70 -z-0 rounded" />
              </span>
            </h1>
            <p className="text-ink-soft text-lg mt-4 max-w-md">
              เลือกไข่ เลือกความกรอบ ใส่ท็อปปิ้งได้ตามใจ สั่งล่วงหน้าแล้วมารับตามเวลา ไม่ต้องยืนรอหน้าร้าน
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="/customer/" className="press inline-flex items-center gap-2 h-13 px-6 rounded-2xl bg-yolk-400 hover:bg-yolk-300 font-semibold text-ink shadow-yolk">
                <IconBag size={20} /> สั่งเลย <IconChevronRight size={18} />
              </a>
              <a href="#menu" className="press inline-flex items-center h-13 px-5 rounded-2xl border-2 border-line bg-paper font-semibold hover:border-yolk-400">
                ดูเมนูและราคา
              </a>
            </div>
            {store?.announcement && (
              <div className="mt-6 flex gap-2.5 items-start rounded-2xl bg-paper border-2 border-yolk-200 p-3.5 max-w-md">
                <IconMegaphone size={20} className="text-yolk-600 shrink-0 mt-0.5" />
                <p className="text-sm">{store.announcement}</p>
              </div>
            )}
          </div>

          <div className="relative flex justify-center animate-pop">
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-yolk-200/70 blur-2xl" />
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-paper border-[10px] border-white shadow-soft flex items-center justify-center">
              <OmeletteMark size={200} className="animate-wobble" />
            </div>
            <div className="absolute -bottom-2 left-4 sm:left-10 bg-paper rounded-2xl shadow-soft px-4 py-3 rotate-[-4deg]">
              <p className="text-xs text-ink-soft">เริ่มต้น</p>
              <p className="font-display font-bold text-2xl text-yolk-600">{menu ? money(Math.min(...menu.eggs.map((e) => e.price))) : '฿35'}</p>
            </div>
          </div>
        </section>

        <section className="mt-20 grid sm:grid-cols-3 gap-4">
          {[
            ['1', 'เลือกไข่ & ท็อปปิ้ง', 'จำนวนไข่ ความกรอบ และท็อปปิ้งกว่า 14 อย่าง'],
            ['2', 'เลือกเวลารับ', 'ระบบบอกคิวและเวลารอโดยประมาณให้ทันที'],
            ['3', 'มารับได้เลย', 'ติดตามสถานะสด แจ้งเตือนเมื่ออาหารพร้อม'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-3xl bg-paper p-5 shadow-soft">
              <span className="font-display font-bold text-yolk-500 text-3xl">{n}</span>
              <p className="font-semibold text-lg mt-1">{t}</p>
              <p className="text-sm text-ink-soft mt-1">{d}</p>
            </div>
          ))}
        </section>

        <section id="menu" className="mt-20 scroll-mt-6">
          <h2 className="font-display font-bold text-3xl">เมนูและราคา</h2>
          {!menu ? (
            <p className="text-ink-soft mt-3">กำลังโหลดเมนู...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div className="rounded-3xl bg-paper p-5 shadow-soft">
                <p className="font-semibold mb-3 flex items-center gap-2"><IconClock size={18} className="text-yolk-600" /> ไข่เจียว (พร้อมข้าว)</p>
                <ul className="divide-y divide-line">
                  {menu.eggs.map((e) => (
                    <li key={e.id} className="flex justify-between py-2.5">
                      <span>{'🥚'.repeat(e.count)} {e.label}</span>
                      <span className="font-semibold tabular">{money(e.price)}</span>
                    </li>
                  ))}
                  {menu.bases.filter((b) => b.delta).map((b) => (
                    <li key={b.id} className="flex justify-between py-2.5 text-ink-soft text-sm">
                      <span>{b.label}</span>
                      <span className="tabular">{b.delta > 0 ? '+' : ''}{b.delta} บาท</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl bg-paper p-5 shadow-soft">
                <p className="font-semibold mb-3">ท็อปปิ้งบุฟเฟต์</p>
                <div className="flex flex-wrap gap-2">
                  {menu.toppingCategories.flatMap((c) => c.items).map((t) => (
                    <span key={t.id} className={cx('rounded-full px-3 py-1.5 text-sm border-2',
                      t.available ? 'border-line bg-cream' : 'border-line/60 text-ink-mute line-through')}>
                      {t.emoji} {t.name}{t.price > 0 ? ` +${t.price}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-ink-soft">
        ไข่เจียว TonyStark 001 · <a href="/customer/" className="underline">สั่งอาหาร</a> · <a href="/kitchen/" className="underline">ครัว</a>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><Landing /></StrictMode>);

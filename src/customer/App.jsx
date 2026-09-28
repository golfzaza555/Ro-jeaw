import { useCallback, useEffect, useRef, useState } from 'react';
import { Brand, FullPageSpinner, Modal, cx, useToast } from '../shared/ui.jsx';
import { IconHome, IconMegaphone, IconReceipt, IconUser, IconChevronRight } from '../shared/icons.jsx';
import { chime, money, unlockAudio } from '../shared/format.js';
import { usePolling, useStoredState } from '../shared/hooks.js';
import { api } from './api.js';
import { newKey, priceLine, toppingMap } from './menu.js';
import Builder from './Builder.jsx';
import Cart from './Cart.jsx';
import Orders from './Orders.jsx';
import Profile from './Profile.jsx';

const TABS = [
  { id: 'order', label: 'สั่งอาหาร', Icon: IconHome },
  { id: 'orders', label: 'ออเดอร์ของฉัน', Icon: IconReceipt },
  { id: 'profile', label: 'บัญชี', Icon: IconUser },
];

function notify(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  } catch { /* some mobile browsers only allow SW notifications */ }
}

export default function App({ user, setUser, onLogout }) {
  const toast = useToast();
  const [tab, setTab] = useState('order');
  const [info, setInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [minutesPerOrder, setMinutesPerOrder] = useState(4);
  const [cart, setCart] = useStoredState(`rj_cart_${user.id}`, []);
  const [cartOpen, setCartOpen] = useState(false);
  const prevStatus = useRef(null);

  const loadInfo = useCallback(() => api.get('/store').then(setInfo).catch(() => {}), []);
  const loadOrders = useCallback(() => api.get('/orders/mine').then((r) => {
    setOrders(r.orders);
    setMinutesPerOrder(r.minutesPerOrder);
  }).catch(() => {}), []);

  const hasActive = orders.some((o) => ['pending', 'cooking', 'ready'].includes(o.status));
  usePolling(loadInfo, 30000);
  usePolling(loadOrders, hasActive ? 8000 : 60000);

  // Status-change alerts (ready / cancelled by shop)
  useEffect(() => {
    const map = Object.fromEntries(orders.map((o) => [o.id, o.status]));
    const prev = prevStatus.current;
    if (prev) {
      orders.forEach((o) => {
        if (prev[o.id] && prev[o.id] !== o.status) {
          if (o.status === 'ready') {
            chime([784, 988, 1319]);
            navigator.vibrate?.([200, 100, 200]);
            toast(`ออเดอร์ ${o.code} พร้อมรับแล้ว!`, 'success');
            notify('อาหารพร้อมแล้ว 🍳', `ออเดอร์ ${o.code} มารับที่ร้านได้เลย`);
          } else if (o.status === 'cooking') {
            toast(`ครัวเริ่มทอดออเดอร์ ${o.code} แล้ว`, 'info');
          } else if (o.status === 'cancelled' && o.cancelReason !== 'ลูกค้ายกเลิกเอง') {
            toast(`ออเดอร์ ${o.code} ถูกยกเลิก: ${o.cancelReason || ''}`, 'error');
            notify('ออเดอร์ถูกยกเลิก', `${o.code} ${o.cancelReason || ''}`);
          }
        }
      });
    }
    prevStatus.current = map;
  }, [orders, toast]);

  if (!info) return <FullPageSpinner />;
  const { store, menu, queue } = info;
  const tmap = toppingMap(menu);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + priceLine(menu, l, tmap).total, 0);

  const addToCart = (draft) => {
    unlockAudio();
    setCart((c) => [...c, { ...draft, key: newKey() }]);
    toast(`เพิ่มลงตะกร้าแล้ว (${draft.qty} จาน)`, 'success');
  };

  const reorder = (order) => {
    const lines = order.items.map((it) => ({
      key: newKey(), eggId: it.eggId, baseId: it.baseId, styleId: it.styleId, qty: it.qty,
      toppings: it.toppings.map((t) => t.id).filter((id) => tmap.get(id)?.available),
    }));
    const dropped = order.items.some((it) => it.toppings.some((t) => !tmap.get(t.id)?.available));
    setCart((c) => [...c, ...lines]);
    setTab('order');
    setCartOpen(true);
    toast(dropped ? 'เพิ่มลงตะกร้าแล้ว (ท็อปปิ้งที่หมดถูกตัดออก)' : 'เพิ่มรายการเดิมลงตะกร้าแล้ว', dropped ? 'info' : 'success');
  };

  const placed = (order) => {
    setCartOpen(false);
    setTab('orders');
    toast(`สั่งสำเร็จ! หมายเลขออเดอร์ ${order.code}`, 'success');
    loadOrders();
    loadInfo();
    window.scrollTo({ top: 0 });
  };

  const activeOrder = orders.find((o) => ['pending', 'cooking', 'ready'].includes(o.status));
  const cartProps = { info, cart, setCart, user, onPlaced: placed };

  return (
    <div className="min-h-dvh bg-speckle">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="/"><Brand sub={`สวัสดี ${user.displayName}`} /></a>
          <div className="flex items-center gap-2">
            <span className={cx('hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              store.acceptingOrders ? 'bg-basil-50 text-basil-600' : 'bg-chili-50 text-chili-600')}>
              <span className={cx('w-1.5 h-1.5 rounded-full', store.acceptingOrders ? 'bg-basil-500' : 'bg-chili-500')} />
              {store.acceptingOrders ? `คิว ${queue.active} · ~${queue.waitMinutes} นาที` : store.queueFull ? 'คิวเต็ม' : 'ร้านปิด'}
            </span>
            <nav className="hidden lg:flex gap-1">
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={cx('press h-9 px-3.5 rounded-xl text-sm font-semibold', tab === id ? 'bg-ink text-paper' : 'hover:bg-ink/5')}>{label}</button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-4">
        {store.announcement && (
          <div className="mb-4 flex gap-2.5 items-start rounded-2xl bg-yolk-100 text-ink p-3.5">
            <IconMegaphone size={19} className="text-yolk-700 shrink-0 mt-0.5" />
            <p className="text-sm">{store.announcement}</p>
          </div>
        )}
        {tab === 'order' && activeOrder && (
          <button onClick={() => setTab('orders')} className={cx('press w-full mb-4 rounded-2xl p-3.5 flex items-center gap-3 text-left',
            activeOrder.status === 'ready' ? 'bg-basil-500 text-white' : 'bg-ink text-paper')}>
            <span className="font-display font-bold text-2xl tabular">{activeOrder.code}</span>
            <span className="flex-1 text-sm">{activeOrder.status === 'ready' ? 'พร้อมรับแล้ว! มารับได้เลย' : activeOrder.status === 'cooking' ? 'กำลังทอดอยู่...' : `รอคิว · ก่อนหน้า ${activeOrder.ahead} ออเดอร์`}</span>
            <IconChevronRight size={20} />
          </button>
        )}

        {tab === 'order' && (
          !store.open ? (
            <div className="rounded-3xl bg-paper shadow-soft p-8 text-center max-w-lg mx-auto mt-6">
              <p className="text-5xl">🌙</p>
              <h2 className="font-display font-semibold text-2xl mt-3">ร้านปิดอยู่ตอนนี้</h2>
              <p className="text-ink-soft mt-1">ยังไม่เปิดรับพรีออเดอร์ แวะมาใหม่นะ</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
              <Builder menu={menu} onAdd={addToCart} cartCount={cartCount} cartTotal={cartTotal} onOpenCart={() => setCartOpen(true)} disabled={!store.open} />
              <aside className="hidden lg:block sticky top-20 rounded-3xl bg-paper shadow-soft p-5 max-h-[calc(100dvh-6rem)] overflow-y-auto">
                <h2 className="font-display font-semibold text-xl mb-4">ตะกร้าของฉัน {cartCount > 0 && <span className="text-ink-soft text-base">({cartCount} จาน · {money(cartTotal)})</span>}</h2>
                <Cart {...cartProps} />
              </aside>
            </div>
          )
        )}
        {tab === 'orders' && (
          <div className="max-w-2xl mx-auto">
            <Orders orders={orders} minutesPerOrder={minutesPerOrder} store={store} onRefresh={loadOrders} onReorder={reorder} goOrder={() => setTab('order')} />
          </div>
        )}
        {tab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <Profile user={user} setUser={setUser} orders={orders} onLogout={onLogout} />
          </div>
        )}
      </main>

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`ตะกร้าของฉัน${cartCount ? ` (${cartCount} จาน)` : ''}`}>
        <Cart {...cartProps} />
      </Modal>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-line safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-3 pt-1.5">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={cx('press relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold', tab === id ? 'text-ink' : 'text-ink-mute')}>
              <span className={cx('w-12 h-7 rounded-full flex items-center justify-center', tab === id && 'bg-yolk-200')}><Icon size={20} /></span>
              {label}
              {id === 'orders' && activeOrder && <span className="absolute top-1 right-[calc(50%-22px)] w-2.5 h-2.5 rounded-full bg-chili-500 border-2 border-paper" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

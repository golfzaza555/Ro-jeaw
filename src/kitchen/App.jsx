import { useCallback, useEffect, useRef, useState } from 'react';
import { Brand, FullPageSpinner, Switch, cx, useToast } from '../shared/ui.jsx';
import {
  IconBox, IconChart, IconChef, IconLogout, IconMenu, IconSettings, IconUsers, IconVolume, IconVolumeOff,
} from '../shared/icons.jsx';
import { chime, unlockAudio } from '../shared/format.js';
import { useNow, usePolling, useStoredState } from '../shared/hooks.js';
import { api } from './api.js';
import Board from './Board.jsx';
import Stock from './Stock.jsx';
import Reports from './Reports.jsx';
import MenuEditor from './MenuEditor.jsx';
import Staff from './Staff.jsx';
import Settings from './Settings.jsx';

export default function App({ user, onLogout }) {
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState('board');
  const [orders, setOrders] = useState(null);
  const [info, setInfo] = useState(null);
  const [sound, setSound] = useStoredState('rj_kitchen_sound', true);
  const [freshIds, setFreshIds] = useState(new Set());
  const seen = useRef(null);
  const now = useNow(1000);

  const loadOrders = useCallback(async () => {
    try {
      const r = await api.get('/kitchen/orders');
      setOrders(r.orders);
    } catch { /* keep last good data; next poll retries */ }
  }, []);
  const loadInfo = useCallback(() => api.get('/store').then(setInfo).catch(() => {}), []);

  usePolling(loadOrders, 7000);
  usePolling(loadInfo, 45000);

  // new-order detection -> chime + highlight + title badge
  useEffect(() => {
    if (!orders) return;
    const ids = new Set(orders.map((o) => o.id));
    if (seen.current) {
      const fresh = orders.filter((o) => o.status === 'pending' && !seen.current.has(o.id));
      if (fresh.length) {
        if (sound) chime([988, 1319, 988]);
        toast(`ออเดอร์ใหม่ ${fresh.map((o) => o.code).join(', ')}`, 'success');
        setFreshIds((s) => new Set([...s, ...fresh.map((o) => o.id)]));
        setTimeout(() => setFreshIds((s) => { const n = new Set(s); fresh.forEach((o) => n.delete(o.id)); return n; }), 12000);
      }
    }
    seen.current = ids;
  }, [orders, sound, toast]);

  const pendingCount = orders ? orders.filter((o) => o.status === 'pending').length : 0;
  useEffect(() => {
    document.title = pendingCount ? `(${pendingCount}) ครัว | TonyStark 001` : 'ครัว | TonyStark 001';
  }, [pendingCount]);

  const patchOrder = (order) => setOrders((list) => list.map((o) => (o.id === order.id ? order : o)));

  const setStoreOpen = async (open) => {
    try {
      await api.patch('/kitchen/store', { open });
      toast(open ? 'เปิดรับออเดอร์แล้ว' : 'ปิดรับออเดอร์แล้ว', open ? 'success' : 'info');
      loadInfo();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (!orders || !info) return <FullPageSpinner dark />;

  const tabs = [
    { id: 'board', label: 'ออเดอร์', Icon: IconChef, badge: pendingCount },
    { id: 'stock', label: 'สต๊อก', Icon: IconBox },
    { id: 'reports', label: 'สรุปยอด', Icon: IconChart },
    ...(isAdmin ? [{ id: 'menu', label: 'เมนู & ราคา', Icon: IconMenu }, { id: 'staff', label: 'พนักงาน', Icon: IconUsers }] : []),
    { id: 'settings', label: 'ตั้งค่า', Icon: IconSettings },
  ];

  return (
    <div className="min-h-dvh bg-night-900 text-night-100">
      <header className="sticky top-0 z-30 bg-night-950/95 backdrop-blur border-b border-night-700">
        <div className="px-3 sm:px-5 h-16 flex items-center gap-3">
          <Brand dark sub={`${user.displayName} · ${isAdmin ? 'ผู้ดูแล' : 'พนักงาน'}`} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <p className="hidden md:block font-display font-semibold text-xl tabular text-night-100">
              {new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Bangkok' })}
            </p>
            <label className="flex items-center gap-2 rounded-xl bg-night-800 border border-night-600 pl-3 pr-1.5 h-10">
              <span className={cx('text-sm font-semibold hidden sm:inline', info.store.open ? 'text-basil-100' : 'text-chili-100')}>
                {info.store.open ? 'เปิดรับออเดอร์' : 'ปิดรับออเดอร์'}
              </span>
              <Switch checked={info.store.open} onChange={setStoreOpen} label="เปิด/ปิดรับออเดอร์" />
            </label>
            <button onClick={() => { unlockAudio(); setSound(!sound); if (!sound) chime(); }}
              className={cx('press w-10 h-10 rounded-xl border flex items-center justify-center',
                sound ? 'bg-yolk-400 text-ink border-yolk-400' : 'bg-night-800 border-night-600 text-night-300')}
              aria-label={sound ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'} title={sound ? 'เสียงแจ้งเตือน: เปิด' : 'เสียงแจ้งเตือน: ปิด'}>
              {sound ? <IconVolume size={19} /> : <IconVolumeOff size={19} />}
            </button>
            <button onClick={onLogout} className="press w-10 h-10 rounded-xl bg-night-800 border border-night-600 text-night-300 hover:text-night-100 flex items-center justify-center" aria-label="ออกจากระบบ" title="ออกจากระบบ">
              <IconLogout size={19} />
            </button>
          </div>
        </div>
        <nav className="px-3 sm:px-5 flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cx('press relative shrink-0 h-11 px-3.5 flex items-center gap-2 text-sm font-semibold border-b-2',
                tab === id ? 'border-yolk-400 text-yolk-300' : 'border-transparent text-night-300 hover:text-night-100')}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-chili-500 text-white text-[11px] font-bold flex items-center justify-center">{badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-3 sm:px-5 py-4">
        {tab === 'board' && <Board orders={orders} now={now} freshIds={freshIds} onPatched={patchOrder} reload={loadOrders} />}
        {tab === 'stock' && <Stock menu={info.menu} onMenu={(menu) => setInfo((i) => ({ ...i, menu }))} />}
        {tab === 'reports' && <Reports />}
        {tab === 'menu' && isAdmin && <MenuEditor menu={info.menu} onSaved={(menu) => setInfo((i) => ({ ...i, menu }))} />}
        {tab === 'staff' && isAdmin && <Staff me={user} />}
        {tab === 'settings' && <Settings isAdmin={isAdmin} onSaved={loadInfo} />}
      </main>
    </div>
  );
}

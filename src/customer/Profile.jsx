import { useMemo, useState } from 'react';
import { Button, Field, Input, PasswordInput, useToast } from '../shared/ui.jsx';
import { IconLogout } from '../shared/icons.jsx';
import { money } from '../shared/format.js';
import { api } from './api.js';

export default function Profile({ user, setUser, orders, onLogout }) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState('');

  const stats = useMemo(() => {
    const done = orders.filter((o) => o.status === 'completed');
    const counts = {};
    done.forEach((o) => o.items.forEach((it) => it.toppings.forEach((t) => { counts[t.name] = (counts[t.name] || 0) + it.qty; })));
    const fav = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { count: done.length, spent: done.reduce((s, o) => s + o.total, 0), fav: fav ? fav[0] : '-' };
  }, [orders]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try {
      const r = await api.patch('/me', { displayName, phone });
      setUser(r.user);
      toast('บันทึกข้อมูลแล้ว', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'error');
    setBusy('pw');
    try {
      const r = await api.post('/me/password', pw);
      api.setToken(r.token);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast('เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นจะถูกออกจากระบบ', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4 pb-28">
      <section className="rounded-3xl bg-ink text-paper p-5">
        <p className="text-sm text-paper/60">@{user.username}</p>
        <p className="font-display font-semibold text-2xl">{user.displayName}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[['ออเดอร์', stats.count], ['ยอดสั่งรวม', money(stats.spent)], ['ท็อปปิ้งโปรด', stats.fav]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] text-paper/60">{k}</p>
              <p className="font-semibold truncate">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={saveProfile} className="rounded-3xl bg-paper shadow-soft p-5 space-y-3">
        <h2 className="font-display font-semibold text-lg">ข้อมูลของฉัน</h2>
        <Field label="ชื่อที่ให้เรียก"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required /></Field>
        <Field label="เบอร์โทร"><Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} inputMode="tel" maxLength={10} required /></Field>
        <Button type="submit" loading={busy === 'profile'}>บันทึก</Button>
      </form>

      <form onSubmit={changePw} className="rounded-3xl bg-paper shadow-soft p-5 space-y-3">
        <h2 className="font-display font-semibold text-lg">เปลี่ยนรหัสผ่าน</h2>
        <Field label="รหัสผ่านปัจจุบัน"><PasswordInput value={pw.currentPassword} onChange={(e) => setPw((s) => ({ ...s, currentPassword: e.target.value }))} autoComplete="current-password" required /></Field>
        <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัวอักษร"><PasswordInput value={pw.newPassword} onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))} autoComplete="new-password" required /></Field>
        <Field label="ยืนยันรหัสผ่านใหม่"><PasswordInput value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} autoComplete="new-password" required /></Field>
        <Button type="submit" variant="dark" loading={busy === 'pw'}>เปลี่ยนรหัสผ่าน</Button>
      </form>

      <Button variant="outline" className="w-full" onClick={onLogout}><IconLogout size={18} /> ออกจากระบบ</Button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Button, Field, Input, PasswordInput, useToast } from '../shared/ui.jsx';
import { api } from './api.js';

function Panel({ title, sub, children }) {
  return (
    <section className="rounded-2xl bg-night-800 border border-night-700 p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {sub && <p className="text-xs text-night-300">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ isAdmin, onSaved }) {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    api.get('/kitchen/store').then((r) => setS(r.store)).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const save = async (e) => {
    e.preventDefault();
    setBusy('store');
    try {
      const body = isAdmin
        ? { announcement: s.announcement, promptpay: s.promptpay, promptpayName: s.promptpayName, minutesPerOrder: s.minutesPerOrder, maxActive: s.maxActive }
        : { announcement: s.announcement };
      const r = await api.patch('/kitchen/store', body);
      setS(r.store);
      onSaved();
      toast('บันทึกการตั้งค่าแล้ว', 'success');
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
      toast('เปลี่ยนรหัสผ่านแล้ว', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  if (!s) return <p className="text-night-300">กำลังโหลด...</p>;
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="max-w-3xl grid gap-4">
      <form onSubmit={save} className="grid gap-4">
        <Panel title="ประกาศถึงลูกค้า" sub="แสดงเป็นแถบด้านบนหน้าสั่งอาหาร เว้นว่างเพื่อซ่อน">
          <textarea value={s.announcement} onChange={set('announcement')} rows={2} maxLength={280} placeholder="เช่น วันนี้ชีสหมดเร็ว / หยุดวันจันทร์"
            className="w-full rounded-xl bg-night-900 border border-night-600 px-3.5 py-2.5 outline-none focus:border-yolk-400" />
        </Panel>

        {isAdmin && (
          <>
            <Panel title="รับชำระผ่านพร้อมเพย์" sub="ลูกค้าจะเห็น QR พร้อมยอดเงินหลังสั่ง · เว้นว่างเพื่อรับเฉพาะเงินสด">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="เบอร์มือถือหรือเลขบัตรประชาชนพร้อมเพย์">
                  <Input dark value={s.promptpay} onChange={(e) => setS((x) => ({ ...x, promptpay: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" maxLength={15} placeholder="08xxxxxxxx" />
                </Field>
                <Field label="ชื่อบัญชี (ให้ลูกค้าตรวจสอบ)">
                  <Input dark value={s.promptpayName} onChange={set('promptpayName')} maxLength={60} />
                </Field>
              </div>
            </Panel>
            <Panel title="การจัดคิว" sub="ใช้คำนวณเวลารอที่แสดงให้ลูกค้า และจำกัดคิวช่วงยุ่ง">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="เวลาทำเฉลี่ยต่อออเดอร์ (นาที)">
                  <Input dark type="number" min={1} max={60} value={s.minutesPerOrder} onChange={(e) => setS((x) => ({ ...x, minutesPerOrder: Number(e.target.value) }))} />
                </Field>
                <Field label="รับออเดอร์ค้างได้สูงสุด" hint="0 = ไม่จำกัด · ถ้าเต็ม ลูกค้าจะสั่งไม่ได้ชั่วคราว">
                  <Input dark type="number" min={0} max={500} value={s.maxActive} onChange={(e) => setS((x) => ({ ...x, maxActive: Number(e.target.value) }))} />
                </Field>
              </div>
            </Panel>
          </>
        )}
        <div><Button type="submit" loading={busy === 'store'}>บันทึกการตั้งค่าร้าน</Button></div>
      </form>

      <form onSubmit={changePw}>
        <Panel title="เปลี่ยนรหัสผ่านของฉัน">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="รหัสผ่านปัจจุบัน"><PasswordInput dark value={pw.currentPassword} onChange={(e) => setPw((x) => ({ ...x, currentPassword: e.target.value }))} autoComplete="current-password" required /></Field>
            <Field label="รหัสผ่านใหม่"><PasswordInput dark value={pw.newPassword} onChange={(e) => setPw((x) => ({ ...x, newPassword: e.target.value }))} autoComplete="new-password" required /></Field>
            <Field label="ยืนยันรหัสผ่านใหม่"><PasswordInput dark value={pw.confirm} onChange={(e) => setPw((x) => ({ ...x, confirm: e.target.value }))} autoComplete="new-password" required /></Field>
          </div>
          <Button type="submit" variant="nightOutline" loading={busy === 'pw'}>เปลี่ยนรหัสผ่าน</Button>
        </Panel>
      </form>
    </div>
  );
}

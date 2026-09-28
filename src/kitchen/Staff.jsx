import { useEffect, useState } from 'react';
import { Button, Field, Input, Modal, PasswordInput, Segmented, Switch, cx, useToast } from '../shared/ui.jsx';
import { IconPlus } from '../shared/icons.jsx';
import { dateTh } from '../shared/format.js';
import { api } from './api.js';

export default function Staff({ me }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [f, setF] = useState({ username: '', displayName: '', password: '', role: 'staff' });
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/users').then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (u, body, msg) => {
    try {
      await api.patch(`/admin/users/${u.id}`, body);
      toast(msg, 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/users', f);
      toast(`เพิ่มบัญชี ${f.username} แล้ว`, 'success');
      setAdding(false);
      setF({ username: '', displayName: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setBusy(true);
    await patch(resetFor, { password: newPw }, `ตั้งรหัสผ่านใหม่ให้ ${resetFor.username} แล้ว`);
    setBusy(false);
    setResetFor(null);
    setNewPw('');
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-2xl">พนักงาน</h2>
          <p className="text-sm text-night-300">บัญชีที่เข้าหน้าครัวได้{data ? ` · ลูกค้าทั้งหมด ${data.customerCount} คน (นับจากเบอร์โทร)` : ''}</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><IconPlus size={16} /> เพิ่มพนักงาน</Button>
      </div>

      <div className="rounded-2xl bg-night-800 border border-night-700 divide-y divide-night-700">
        {!data && <p className="p-4 text-sm text-night-300">กำลังโหลด...</p>}
        {data?.users.map((u) => (
          <div key={u.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', !u.active && 'opacity-60')}>
            <div className="w-10 h-10 rounded-full bg-night-700 flex items-center justify-center font-semibold">{u.displayName.slice(0, 1)}</div>
            <div className="flex-1 min-w-[160px]">
              <p className="font-semibold">{u.displayName} {u.id === me.id && <span className="text-xs text-yolk-300">(คุณ)</span>}</p>
              <p className="text-xs text-night-300">@{u.username} · เพิ่มเมื่อ {dateTh(u.createdAt)}</p>
            </div>
            <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold', u.role === 'admin' ? 'bg-yolk-400/20 text-yolk-200' : 'bg-night-700 text-night-300')}>
              {u.role === 'admin' ? 'ผู้ดูแล' : 'พนักงาน'}
            </span>
            {u.id !== me.id && (
              <>
                <Button size="sm" variant="nightOutline" onClick={() => patch(u, { role: u.role === 'admin' ? 'staff' : 'admin' }, 'เปลี่ยนสิทธิ์แล้ว')}>
                  {u.role === 'admin' ? 'ลดเป็นพนักงาน' : 'ตั้งเป็นผู้ดูแล'}
                </Button>
                <Button size="sm" variant="nightOutline" onClick={() => setResetFor(u)}>ตั้งรหัสใหม่</Button>
                <label className="flex items-center gap-2 text-xs text-night-300">
                  {u.active ? 'ใช้งาน' : 'ระงับ'}
                  <Switch checked={u.active} onChange={(v) => patch(u, { active: v }, v ? 'เปิดใช้งานบัญชีแล้ว' : 'ระงับบัญชีแล้ว')} label="สถานะบัญชี" />
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      <Modal dark open={adding} onClose={() => setAdding(false)} title="เพิ่มบัญชีพนักงาน">
        <form onSubmit={create} className="space-y-3">
          <Field label="ชื่อที่แสดง"><Input dark value={f.displayName} onChange={(e) => setF((s) => ({ ...s, displayName: e.target.value }))} required /></Field>
          <Field label="ชื่อผู้ใช้" hint="a-z, 0-9, _ หรือ . (3-24 ตัว)">
            <Input dark value={f.username} onChange={(e) => setF((s) => ({ ...s, username: e.target.value.toLowerCase() }))} autoCapitalize="none" required />
          </Field>
          <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 6 ตัวอักษร · แจ้งพนักงานให้เปลี่ยนเองภายหลัง">
            <PasswordInput dark value={f.password} onChange={(e) => setF((s) => ({ ...s, password: e.target.value }))} autoComplete="new-password" required />
          </Field>
          <Segmented dark value={f.role} onChange={(role) => setF((s) => ({ ...s, role }))}
            options={[{ value: 'staff', label: 'พนักงานครัว' }, { value: 'admin', label: 'ผู้ดูแล (จัดการทุกอย่าง)' }]} />
          <Button type="submit" className="w-full" loading={busy}>เพิ่มบัญชี</Button>
        </form>
      </Modal>

      <Modal dark open={!!resetFor} onClose={() => setResetFor(null)} title={`ตั้งรหัสผ่านใหม่ @${resetFor?.username || ''}`}>
        <form onSubmit={reset} className="space-y-3">
          <Field label="รหัสผ่านใหม่" hint="อุปกรณ์ที่ล็อกอินอยู่ของบัญชีนี้จะถูกออกจากระบบ">
            <PasswordInput dark value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>บันทึก</Button>
        </form>
      </Modal>
    </div>
  );
}

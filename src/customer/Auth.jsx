import { useState } from 'react';
import { Brand, Button, Field, Input, PasswordInput, Segmented, OmeletteMark } from '../shared/ui.jsx';
import { api } from './api.js';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', password: '', confirm: '', displayName: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && f.password !== f.confirm) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await api.post('/auth/login', { username: f.username, password: f.password, portal: 'customer' })
        : await api.post('/auth/register', { username: f.username, password: f.password, displayName: f.displayName, phone: f.phone });
      api.setToken(res.token);
      onAuthed(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-speckle flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 pt-5">
        <a href="/"><Brand sub="Omelette Buffet Pre-order" /></a>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-rise">
          <div className="flex items-center gap-3 mb-5">
            <OmeletteMark size={52} className="animate-wobble" />
            <div>
              <h1 className="font-display font-bold text-2xl">{mode === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สมัครสมาชิก'}</h1>
              <p className="text-ink-soft text-sm">{mode === 'login' ? 'เข้าสู่ระบบเพื่อสั่งไข่เจียว' : 'สมัครครั้งเดียว สั่งซ้ำได้ในคลิกเดียว'}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-paper shadow-soft p-5 sm:p-6">
            <Segmented
              value={mode}
              onChange={(m) => { setMode(m); setError(''); }}
              options={[{ value: 'login', label: 'เข้าสู่ระบบ' }, { value: 'register', label: 'สมัครสมาชิก' }]}
            />
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Field label="ชื่อผู้ใช้ (Username)" hint={mode === 'register' ? 'ภาษาอังกฤษตัวเล็ก ตัวเลข _ หรือ . (3-24 ตัว)' : null}>
                <Input value={f.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="เช่น somchai99" />
              </Field>
              <Field label="รหัสผ่าน" hint={mode === 'register' ? 'อย่างน้อย 6 ตัวอักษร' : null}>
                <PasswordInput value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
              </Field>
              {mode === 'register' && (
                <>
                  <Field label="ยืนยันรหัสผ่าน">
                    <PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" required />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ชื่อเล่น / ชื่อที่ให้เรียก">
                      <Input value={f.displayName} onChange={set('displayName')} autoComplete="nickname" required placeholder="คุณเอ" />
                    </Field>
                    <Field label="เบอร์โทร">
                      <Input value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                        inputMode="tel" autoComplete="tel" required placeholder="08xxxxxxxx" maxLength={10} />
                    </Field>
                  </div>
                </>
              )}
              {error && <p className="rounded-xl bg-chili-50 text-chili-600 text-sm px-3.5 py-2.5">{error}</p>}
              <Button type="submit" loading={busy} className="w-full" size="lg">
                {mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีและเริ่มสั่ง'}
              </Button>
            </form>
          </div>
          <p className="text-center text-sm text-ink-soft mt-5">
            เป็นพนักงานร้าน? <a href="/kitchen/" className="font-semibold text-ink underline">เข้าหน้าครัว</a>
          </p>
        </div>
      </main>
    </div>
  );
}

import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { Brand, Button, Field, FullPageSpinner, Input, PasswordInput, ToastProvider } from '../shared/ui.jsx';
import { IconChef, IconLock } from '../shared/icons.jsx';
import { api } from './api.js';
import App from './App.jsx';

function Login({ onAuthed }) {
  const [needsSetup, setNeedsSetup] = useState(null);
  const [f, setF] = useState({ username: '', password: '', confirm: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    api.get('/setup').then((r) => setNeedsSetup(r.needsSetup)).catch(() => setNeedsSetup(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsSetup && f.password !== f.confirm) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    try {
      const r = needsSetup
        ? await api.post('/setup', { username: f.username, password: f.password, displayName: f.displayName })
        : await api.post('/auth/login', { username: f.username, password: f.password, portal: 'kitchen' });
      api.setToken(r.token);
      onAuthed(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (needsSetup === null) return <FullPageSpinner dark />;

  return (
    <div className="min-h-dvh bg-night-900 flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 pt-5"><a href="/"><Brand dark sub="Kitchen Display System" /></a></header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm animate-rise">
          <div className="w-14 h-14 rounded-2xl bg-yolk-400 text-ink flex items-center justify-center mb-4">
            {needsSetup ? <IconLock size={26} /> : <IconChef size={28} />}
          </div>
          <h1 className="font-display font-semibold text-2xl">{needsSetup ? 'ตั้งค่าบัญชีผู้ดูแลร้าน' : 'เข้าสู่ระบบครัว'}</h1>
          <p className="text-night-300 text-sm mt-1">
            {needsSetup ? 'ครั้งแรกเท่านั้น: สร้างบัญชีเจ้าของร้าน (admin) เพื่อจัดการเมนู พนักงาน และตั้งค่าร้าน' : 'สำหรับพนักงานและเจ้าของร้านเท่านั้น'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl bg-night-800 border border-night-600 p-5">
            {needsSetup && (
              <Field label="ชื่อที่แสดง"><Input dark value={f.displayName} onChange={set('displayName')} placeholder="เจ้าของร้าน" /></Field>
            )}
            <Field label="ชื่อผู้ใช้" hint={needsSetup ? 'a-z, 0-9, _ หรือ . (3-24 ตัว)' : null}>
              <Input dark value={f.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </Field>
            <Field label="รหัสผ่าน" hint={needsSetup ? 'อย่างน้อย 8 ตัวอักษร' : null}>
              <PasswordInput dark value={f.password} onChange={set('password')} autoComplete={needsSetup ? 'new-password' : 'current-password'} required />
            </Field>
            {needsSetup && (
              <Field label="ยืนยันรหัสผ่าน"><PasswordInput dark value={f.confirm} onChange={set('confirm')} autoComplete="new-password" required /></Field>
            )}
            {error && <p className="rounded-xl bg-chili-500/15 text-chili-100 text-sm px-3.5 py-2.5">{error}</p>}
            <Button type="submit" loading={busy} className="w-full" size="lg">{needsSetup ? 'สร้างบัญชีผู้ดูแล' : 'เข้าสู่ระบบ'}</Button>
          </form>
          <p className="text-center text-sm text-night-300 mt-5"><a href="/customer/" className="underline">ไปหน้าสั่งอาหารของลูกค้า</a></p>
        </div>
      </main>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!api.getToken()) return setUser(null);
    api.get('/auth/me')
      .then((r) => {
        if (r.user.role === 'customer') { api.setToken(null); setUser(null); } else setUser(r.user);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const onOut = () => setUser(null);
    window.addEventListener('rj:unauthorized', onOut);
    return () => window.removeEventListener('rj:unauthorized', onOut);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* already gone */ }
    api.setToken(null);
    setUser(null);
  }, []);

  if (user === undefined) return <FullPageSpinner dark />;
  if (!user) return <Login onAuthed={setUser} />;
  return <App user={user} onLogout={logout} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </StrictMode>,
);

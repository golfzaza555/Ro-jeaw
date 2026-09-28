import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { FullPageSpinner, ToastProvider } from '../shared/ui.jsx';
import { api } from './api.js';
import Auth from './Auth.jsx';
import App from './App.jsx';

function Root() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!api.getToken()) return setUser(null);
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null));
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

  if (user === undefined) return <FullPageSpinner />;
  if (!user) return <Auth onAuthed={setUser} />;
  return <App user={user} setUser={setUser} onLogout={logout} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </StrictMode>,
);

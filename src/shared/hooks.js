import { useEffect, useRef, useState } from 'react';

/** Calls fn now and every `ms` while the tab is visible; pauses when hidden to save server calls. */
export function usePolling(fn, ms, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const tick = () => {
      if (document.visibilityState === 'visible') fnRef.current();
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(tick, ms);
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else clearInterval(timer);
    };
    tick();
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms, enabled]);
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  }, [key, value]);
  return [value, setValue];
}

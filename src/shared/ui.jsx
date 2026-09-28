import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { IconEye, IconEyeOff, IconX } from './icons.jsx';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------- brand mark: a puffy golden omelette ---------- */
export function OmeletteMark({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M8 36c-3-8 3-17 11-18 3-6 11-9 17-6 7-3 16 1 18 9 6 3 7 11 3 16-1 9-11 14-20 12-7 4-17 2-21-4-6-1-9-5-8-9Z"
        fill="#ffc233" stroke="#d68a00" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path d="M17 27c3-4 8-5 12-3M35 20c4-1 8 1 10 4" stroke="#fff3c4" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="38" r="2.4" fill="#2d9a58" />
      <circle cx="40" cy="34" r="2" fill="#df4a2b" />
      <circle cx="33" cy="43" r="1.8" fill="#2d9a58" />
      <circle cx="46" cy="41" r="1.6" fill="#a36600" />
    </svg>
  );
}

export function Brand({ dark = false, sub }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <OmeletteMark size={38} className="shrink-0" />
      <div className="leading-tight min-w-0">
        <p className={cx('font-display font-semibold text-[17px] truncate', dark ? 'text-night-100' : 'text-ink')}>
          ไข่เจียว <span className="text-yolk-500">TonyStark</span> 001
        </p>
        {sub && <p className={cx('text-[11px] truncate', dark ? 'text-night-300' : 'text-ink-soft')}>{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- buttons ---------- */
const BTN = {
  primary: 'bg-yolk-400 hover:bg-yolk-300 text-ink shadow-yolk',
  dark: 'bg-ink hover:bg-ink/90 text-paper',
  ghost: 'bg-transparent hover:bg-ink/5 text-ink',
  outline: 'border-2 border-line bg-paper hover:border-yolk-400 text-ink',
  danger: 'bg-chili-500 hover:bg-chili-600 text-white',
  success: 'bg-basil-500 hover:bg-basil-600 text-white',
  nightOutline: 'border border-night-600 bg-night-800 hover:bg-night-700 text-night-100',
};
const SIZE = { sm: 'h-9 px-3 text-sm rounded-xl', md: 'h-11 px-4 text-[15px] rounded-2xl', lg: 'h-13 px-5 text-base rounded-2xl' };

export function Button({ variant = 'primary', size = 'md', className = '', loading, children, disabled, ...rest }) {
  return (
    <button
      className={cx('press inline-flex items-center justify-center gap-2 font-semibold select-none disabled:opacity-40 disabled:pointer-events-none', BTN[variant], SIZE[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="w-4 h-4" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = 'w-5 h-5' }) {
  return <span className={cx('inline-block rounded-full border-2 border-current border-r-transparent animate-spin', className)} />;
}

/* ---------- form fields ---------- */
export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium mb-1.5">{label}</span>}
      {children}
      {error ? <span className="block text-xs text-chili-500 mt-1">{error}</span> : hint ? <span className="block text-xs opacity-60 mt-1">{hint}</span> : null}
    </label>
  );
}

export const inputCls = (dark) =>
  cx(
    'w-full h-11 rounded-xl px-3.5 text-[15px] outline-none transition-colors',
    dark
      ? 'bg-night-900 border border-night-600 text-night-100 placeholder:text-night-500 focus:border-yolk-400'
      : 'bg-paper border-2 border-line text-ink placeholder:text-ink-mute focus:border-yolk-400',
  );

export function Input({ dark, className = '', ...rest }) {
  return <input className={cx(inputCls(dark), className)} {...rest} />;
}

export function PasswordInput({ dark, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className={cx(inputCls(dark), 'pr-11')} {...rest} />
      <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-50 hover:opacity-90"
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
        {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('press relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-basil-500' : 'bg-ink-mute/60')}>
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export function Segmented({ options, value, onChange, dark }) {
  return (
    <div className={cx('inline-flex p-1 rounded-2xl gap-1', dark ? 'bg-night-800 border border-night-600' : 'bg-ink/5')}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('press h-9 px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap',
            value === o.value
              ? dark ? 'bg-yolk-400 text-ink' : 'bg-paper text-ink shadow-soft'
              : dark ? 'text-night-300 hover:text-night-100' : 'text-ink-soft hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- overlays ---------- */
export function Modal({ open, onClose, title, children, dark, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 animate-fade" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        className={cx('w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 animate-sheet sm:animate-pop safe-bottom',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
          dark ? 'bg-night-800 text-night-100 border border-night-600' : 'bg-paper text-ink')}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="press w-9 h-9 -mr-1 -mt-1 rounded-xl flex items-center justify-center opacity-60 hover:opacity-100" aria-label="ปิด">
            <IconX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
let toastSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'info') => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  const tones = { info: 'bg-ink text-paper', success: 'bg-basil-500 text-white', error: 'bg-chili-500 text-white' };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-3 inset-x-3 sm:left-auto sm:right-4 sm:w-96 z-[100] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto animate-pop rounded-2xl px-4 py-3 text-sm font-medium shadow-soft', tones[t.tone])}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function FullPageSpinner({ dark }) {
  return (
    <div className={cx('min-h-dvh flex items-center justify-center', dark ? 'bg-night-900 text-yolk-400' : 'bg-cream text-yolk-500')}>
      <OmeletteMark size={56} className="animate-wobble" />
    </div>
  );
}

export function StarRow({ value = 0, onChange, size = 22 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)}
          className={cx('press', n <= value ? 'text-yolk-500' : 'text-ink-mute/50')} aria-label={`${n} ดาว`}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/* Tiny line-icon set (lucide-style strokes), so there is no icon dependency. */
const Ic = ({ children, size = 20, className = '', strokeWidth = 2, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const IconSearch = (p) => <Ic {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ic>;
export const IconX = (p) => <Ic {...p}><path d="M18 6 6 18M6 6l12 12" /></Ic>;
export const IconPlus = (p) => <Ic {...p}><path d="M12 5v14M5 12h14" /></Ic>;
export const IconMinus = (p) => <Ic {...p}><path d="M5 12h14" /></Ic>;
export const IconCheck = (p) => <Ic {...p}><path d="M20 6 9 17l-5-5" /></Ic>;
export const IconClock = (p) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>;
export const IconChevronRight = (p) => <Ic {...p}><path d="m9 18 6-6-6-6" /></Ic>;
export const IconChevronLeft = (p) => <Ic {...p}><path d="m15 18-6-6 6-6" /></Ic>;
export const IconChevronDown = (p) => <Ic {...p}><path d="m6 9 6 6 6-6" /></Ic>;
export const IconUser = (p) => <Ic {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Ic>;
export const IconPhone = (p) => <Ic {...p}><path d="M6.5 3h3l1.5 4.5-2 1.5c1 2.5 2.5 4 5 5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2C10 20.5 3.5 14 3.5 5a2 2 0 0 1 2-2Z" /></Ic>;
export const IconBag = (p) => <Ic {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Ic>;
export const IconReceipt = (p) => <Ic {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></Ic>;
export const IconHome = (p) => <Ic {...p}><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></Ic>;
export const IconLogout = (p) => <Ic {...p}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></Ic>;
export const IconEye = (p) => <Ic {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Ic>;
export const IconEyeOff = (p) => <Ic {...p}><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Ic>;
export const IconStar = ({ filled, ...p }) => <Ic {...p} fill={filled ? 'currentColor' : 'none'}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z" /></Ic>;
export const IconRepeat = (p) => <Ic {...p}><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12" /><path d="M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></Ic>;
export const IconFlame = (p) => <Ic {...p}><path d="M12 3c1.2 3.2-2 4.5-2 7.7a2.6 2.6 0 0 0 5.2 0c0-1.4-.7-2.2-.7-3.7 1.7 1.3 3 3.6 3 6.2A5.5 5.5 0 0 1 6 13.2C6 8.7 9 6.3 12 3Z" /></Ic>;
export const IconChef = (p) => <Ic {...p}><path d="M7 14v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5" /><path d="M6 14a4 4 0 0 1-.6-7.9A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 6.6 3.1A4 4 0 0 1 18 14H6Z" /></Ic>;
export const IconBox = (p) => <Ic {...p}><path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8Z" /><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" /></Ic>;
export const IconChart = (p) => <Ic {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Ic>;
export const IconMenu = (p) => <Ic {...p}><path d="M4 6h16M4 12h16M4 18h10" /></Ic>;
export const IconUsers = (p) => <Ic {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6" /></Ic>;
export const IconSettings = (p) => <Ic {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Ic>;
export const IconVolume = (p) => <Ic {...p}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></Ic>;
export const IconVolumeOff = (p) => <Ic {...p}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 10 4 4M21 10l-4 4" /></Ic>;
export const IconPrinter = (p) => <Ic {...p}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></Ic>;
export const IconUndo = (p) => <Ic {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></Ic>;
export const IconMore = (p) => <Ic {...p}><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></Ic>;
export const IconTrash = (p) => <Ic {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Ic>;
export const IconDownload = (p) => <Ic {...p}><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></Ic>;
export const IconQr = (p) => <Ic {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v7h-4M14 18v3" /></Ic>;
export const IconCash = (p) => <Ic {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" /></Ic>;
export const IconMegaphone = (p) => <Ic {...p}><path d="M3 10v4h3l7 4V6L6 10H3Z" /><path d="M17 8.5a5 5 0 0 1 0 7" /></Ic>;
export const IconAlert = (p) => <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none" /></Ic>;
export const IconLock = (p) => <Ic {...p}><rect x="4.5" y="11" width="15" height="9.5" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></Ic>;
export const IconBell = (p) => <Ic {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Ic>;

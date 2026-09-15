        /* ============ APP SCRIPT — PART 1 of 2 (engine: utils, store, seed, auth, charts, shared components) ============ */
        'use strict';
        const CONFIG = Object.assign({ googleClientId: '', authVerifyEndpoint: '' }, window.EVENTORA_CONFIG || {});
        /* ---- Supabase (real backend, Phase 1: auth + profiles) ---- */
        const SB_URL = 'https://rbkpcfdfolwbygqrzkwi.supabase.co';
        const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJia3BjZmRmb2x3YnlncXJ6a3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjkxODksImV4cCI6MjEwNDcwNTE4OX0.Q0Pa_droGiuzY0TbkfGzTtVYvcZUddrSn91Y90TJBfg';
        const sb = window.supabase.createClient(SB_URL, SB_ANON_KEY);
        CONFIG.social = Object.assign({ facebook: '', instagram: '', linkedin: '', x: '', youtube: '' }, (window.EVENTORA_CONFIG || {}).social || {});
        CONFIG.payments = Object.assign({ gatewayName: 'SSLCommerz', createSessionUrl: '/api/sslcommerz/create-session', verifyUrl: '/api/sslcommerz/verify' }, (window.EVENTORA_CONFIG || {}).payments || {});
        const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
        const uid = p => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        /* ---- Multi-currency support ----
           Prices are stored per-event in whatever currency the organizer picks at creation
           (not auto-converted from one base currency with a hardcoded FX rate, which would go
           stale). fmtMoney/fmtT/shortMoney all take an optional currency code and fall back to
           the platform's own reporting currency (BDT) for aggregate/admin views that span many
           events and currencies at once. */
        const CURRENCIES = {
            BDT: { symbol: '\u09f3', name: 'Bangladeshi Taka', locale: 'en-BD', grouping: 'lakh' },
            USD: { symbol: '$', name: 'US Dollar', locale: 'en-US', grouping: 'std' },
            EUR: { symbol: '\u20ac', name: 'Euro', locale: 'de-DE', grouping: 'std' },
            GBP: { symbol: '\u00a3', name: 'British Pound', locale: 'en-GB', grouping: 'std' },
            INR: { symbol: '\u20b9', name: 'Indian Rupee', locale: 'en-IN', grouping: 'lakh' },
            PKR: { symbol: '\u20a8', name: 'Pakistani Rupee', locale: 'en-PK', grouping: 'lakh' },
            AED: { symbol: 'AED ', name: 'UAE Dirham', locale: 'en-AE', grouping: 'std' },
            SAR: { symbol: 'SAR ', name: 'Saudi Riyal', locale: 'en-SA', grouping: 'std' },
            CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', grouping: 'std' },
            AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', grouping: 'std' },
            SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', grouping: 'std' },
            MYR: { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'en-MY', grouping: 'std' },
        };
        const CUR_DEFAULT = 'BDT';
        const CUR = CURRENCIES[CUR_DEFAULT].symbol; /* legacy alias \u2014 still used for platform-wide/reporting figures */
        /* Best-effort default currency for a NEW event, guessed from the organizer's own
           browser locale/timezone. Always editable in the wizard \u2014 this is just a starting
           point, never a lock-in. */
        function guessCurrency() {
            try {
                const region = (new Intl.Locale(navigator.language)).maximize().region;
                const REGION_CUR = { BD: 'BDT', IN: 'INR', PK: 'PKR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', SG: 'SGD', MY: 'MYR', AE: 'AED', SA: 'SAR' };
                return REGION_CUR[region] || 'USD';
            } catch (e) { return CUR_DEFAULT }
        }
        const curSym = code => (CURRENCIES[code] || CURRENCIES[CUR_DEFAULT]).symbol;
        const fmtMoney = (n, code) => {
            const c = CURRENCIES[code] || CURRENCIES[CUR_DEFAULT];
            return c.symbol + Number(n || 0).toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        const fmtT = (n, code) => {
            const c = CURRENCIES[code] || CURRENCIES[CUR_DEFAULT];
            return c.symbol + Number(n || 0).toLocaleString(c.locale);
        };
        const shortMoney = (n, code) => {
            const c = CURRENCIES[code] || CURRENCIES[CUR_DEFAULT];
            n = Number(n || 0); const a = Math.abs(n), f = x => { let s = x.toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s };
            if (c.grouping === 'lakh') { if (a >= 1e7) return c.symbol + f(n / 1e7) + 'Cr'; if (a >= 1e5) return c.symbol + f(n / 1e5) + 'L'; if (a >= 1e3) return c.symbol + f(n / 1e3) + 'K'; return c.symbol + Math.round(n) }
            if (a >= 1e9) return c.symbol + f(n / 1e9) + 'B'; if (a >= 1e6) return c.symbol + f(n / 1e6) + 'M'; if (a >= 1e3) return c.symbol + f(n / 1e3) + 'K'; return c.symbol + Math.round(n)
        };
        const fmtN = n => Number(n || 0).toLocaleString('en-US');
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        function d(iso) { if (!iso) return null; const p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]) }
        const fmtDate = iso => { const x = d(iso); return x ? MONTHS[x.getMonth()] + ' ' + x.getDate() + ', ' + x.getFullYear() : '\u2014' };
        function fmtRange(a, b) { if (!a) return '\u2014'; const x = d(a), y = d(b); if (!y || a === b) return fmtDate(a); return MONTHS[x.getMonth()] + ' ' + x.getDate() + '\u2013' + MONTHS[y.getMonth()] + ' ' + y.getDate() + ', ' + y.getFullYear() }
        function datePill(a, b) { const x = d(a); if (!x) return ''; const y = d(b); let s = MONTHS[x.getMonth()].toUpperCase() + ' ' + x.getDate(); if (y && a !== b) s += '\u2013' + y.getDate(); s += ' \u00b7 ' + (y || x).getFullYear(); return s }
        const since = iso => { const s = (Date.now() - new Date(iso)) / 1e3; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago' };
        const initials = n => { const r = String(n || '?').split(/\s+/).map(w => w[0]).filter(c => /[a-z0-9]/i.test(c)).slice(0, 2).join('').toUpperCase(); return r || 'E' };
        const hashPw = s => { let h = 5381; for (const c of 'eventora' + s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return 'h' + h.toString(16) };
        const passHash = () => { const hx = '0123456789ABCDEF'; let s = '0x'; for (let i = 0; i < 16; i++)s += hx[Math.floor(Math.random() * 16)]; return s };
        const truncHash = h => h ? h.slice(0, 6) + '\u2026' + h.slice(-4) : '';
        const deb = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } };
        const pic = (seed, w, h) => 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h + '.jpg';
        const coverOf = ev => ev && ev.cover ? ev.cover : pic('ev' + (ev ? ev.id : 'x'), 1280, 720);
        function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296 } }
        const DAY = 864e5;
        const localISO = dt => { const x = new Date(dt.getTime() - dt.getTimezoneOffset() * 6e4); return x.toISOString().slice(0, 10) };
        const todayISO = () => localISO(new Date());
        const isoOff = off => localISO(new Date(Date.now() + off * DAY));
        const evEndDay = ev => ev.endDate || ev.startDate || '';
        const evEnded = ev => evEndDay(ev) < todayISO();
        const evLive = ev => { if (ev.status !== 'published') return false; const t = todayISO(); return (ev.startDate || '') <= t && evEndDay(ev) >= t };
        const evPurchasable = ev => ev.status === 'published' && !evEnded(ev);
        function evState(ev) { if (ev.status === 'draft') return 'draft'; if (ev.status === 'cancelled') return 'cancelled'; if (evEnded(ev)) return 'ended'; if (evLive(ev)) return 'live'; return 'upcoming' }
        function statePill(ev) {
            const s = evState(ev);
            if (s === 'draft') return '<span class="pill pill-warn">Draft</span>';
            if (s === 'cancelled') return '<span class="pill pill-red">Cancelled</span>';
            if (s === 'ended') return '<span class="pill pill-mut">Event Ended</span>';
            if (s === 'live') return '<span class="pill pill-live"><span class="dot g pulse"></span>Live Now</span>';
            return '<span class="pill pill-green">Upcoming</span>'
        }
        const ICONS = { search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>', clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', check: '<polyline points="20 6 9 17 4 12"/>', checkc: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', chevD: '<path d="m6 9 6 6 6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', arrR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16h.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>', cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>', music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>', gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>', heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>', activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>', shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>', dollar: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>', mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>', more: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>', settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>', radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>', edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>', trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', eyeoff: '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 11.5s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>', menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>', spark: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>', globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>', lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', brief: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>', cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>', star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>', ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>', bank: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>', mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>', image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>', cloud: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>', info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>', crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>', gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>', door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.562Z"/>', tv: '<rect width="20" height="15" x="2" y="3" rx="2"/><polyline points="8 21 12 17 16 21"/>', link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' };
        const ic = (n, s, st) => { s = s || 18; return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (st || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>' };
        const SOCIAL = { facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>', linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>', x: '<path fill="currentColor" stroke="none" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>', youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>' };
        const SOCIAL_META = { facebook: ['Facebook', 'SOCIAL_FACEBOOK_URL'], instagram: ['Instagram', 'SOCIAL_INSTAGRAM_URL'], linkedin: ['LinkedIn', 'SOCIAL_LINKEDIN_URL'], x: ['X (Twitter)', 'SOCIAL_X_URL'], youtube: ['YouTube', 'SOCIAL_YOUTUBE_URL'] };
        const socIcon = (k, s) => { s = s || 16; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SOCIAL[k] || '') + '</svg>' };
        function socialLinks() {
            return Object.keys(SOCIAL_META).map(k => {
                const meta = SOCIAL_META[k], url = CONFIG.social[k];
                if (url) return '<a class="soc" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Eventora on ' + meta[0] + '" title="Eventora on ' + meta[0] + '">' + socIcon(k) + '</a>';
                return '<button type="button" class="soc" data-action="soc-missing" data-k="' + k + '" aria-label="' + meta[0] + ' \u2014 link not yet configured" title="' + meta[0] + ' \u2014 set ' + meta[1] + ' in your config">' + socIcon(k) + '</button>';
            }).join('')
        }
        let LOGO_N = 0;
        const logo = s => { s = s || 34; const gid = 'lgo' + (++LOGO_N); return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#' + gid + ')"/><path d="M16 6v20M7.4 11l17.2 10M24.6 11 7.4 21" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>' };
        const brandHTML = s => '<a class="brand" href="#/">' + logo(s) + '<span>Eventora</span></a>';
        const KEY = 'eventora_db_v2';
        let db = null;
        const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch (e) { toast('Local storage is full \u2014 try a smaller cover image.', 'warn') } };
        function migrateDB() {
            if (!db || typeof db !== 'object') return false;
            ['users', 'categories', 'events', 'tickets', 'registrations', 'orders', 'favorites', 'speakers', 'schedule', 'notifications', 'messages'].forEach(k => { if (!Array.isArray(db[k])) db[k] = [] });
            if (!db.meta || typeof db.meta !== 'object') db.meta = {};
            if (typeof db.meta.fees !== 'number') db.meta.fees = 5;
            if (!Array.isArray(db.meta.interest)) db.meta.interest = [];
            if (db.meta.maintenance === undefined) db.meta.maintenance = false;
            if (db.meta.sessionUserId === undefined) db.meta.sessionUserId = null;
            db.users.forEach(u => { if (!u.notifPrefs) u.notifPrefs = { email: true, push: true, updates: true } });
            db.events.forEach(e => {
                if (!e.status) e.status = 'published';
                // Demo/seed events carry a fixed offset (days from "today") so they stay evergreen.
                // Without this, dates persisted in localStorage would freeze at the moment the
                // browser first seeded the db, and every event would eventually drift into the past
                // as real time moved on \u2014 this is what caused upcoming events to vanish from the
                // dashboard ("No summits in this hub yet") after enough days had passed.
                if (typeof e.seedOffset === 'number') {
                    e.startDate = isoOff(e.seedOffset);
                    e.endDate = isoOff(typeof e.seedOffsetEnd === 'number' ? e.seedOffsetEnd : e.seedOffset);
                }
            });
            return db.categories.length > 0;
        }
        const load = () => { try { const raw = localStorage.getItem(KEY); if (raw) { db = JSON.parse(raw); if (migrateDB()) { if (db.meta.sessionUserId && !userById(db.meta.sessionUserId)) db.meta.sessionUserId = null; return true } db = null } } catch (e) { db = null } return false };
        function freshDB() {
            db = { users: [], categories: [], events: [], tickets: [], registrations: [], orders: [], favorites: [], speakers: [], schedule: [], notifications: [], messages: [], meta: { fees: 5, maintenance: false, interest: [], sessionUserId: null } };
            const R = rng(20260319), now = Date.now();
            const U = o => { const u = Object.assign({ id: uid('u'), status: 'active', verified: true, risk: 0, avatarSeed: null, created_at: new Date(now - R() * 300 * DAY).toISOString(), notifPrefs: { email: true, push: true, updates: true } }, o); db.users.push(u); return u };
            const admin = U({ name: 'Dr. Aris Thorne', email: 'admin@eventora.io', pw: hashPw('admin123'), role: 'admin', title: 'Chief Platform Officer', avatarSeed: pic('aristhorne', 80, 80) });
            const tariq = U({ name: 'Tariq Rahman', email: 'organizer@eventora.io', pw: hashPw('org123'), role: 'organizer', title: 'Executive Producer', org: 'Eventora Labs', avatarSeed: pic('tariqrahman', 80, 80) });
            const marcus = U({ name: 'Marcus Vance', email: 'marcus@eventora.io', pw: hashPw('org123'), role: 'organizer', title: 'Managing Director', org: 'Northwind Live', avatarSeed: pic('marcusvance', 80, 80) });
            const demo = U({ name: 'Sarah Chen', email: 'user@eventora.io', pw: hashPw('user123'), role: 'attendee', title: 'Product Lead', org: 'Solara Xpanse', avatarSeed: pic('sarahchen', 80, 80) });
            [['Nexus Sound Consortium', 'nexus@partners.io', 'Lead Audio Producer', 'Nexus Sound', .02, 'KYC Tier-3 Passed', 'Lead Audio Producer', 'ID: ORG-9941 \u00b7 London Sonic Arena'], ['Veloce RapidPass Resale', 'veloce@rapidpass.io', 'Secondary Broker', 'Veloce', .89, 'Velocity: 420 req/sec', 'Secondary Broker', 'ID: SCAL-1082 \u00b7 Bulk API Key'], ['Kaito Robotics Lab', 'kaito@robotics.jp', 'Exhibition Keynote Lead', 'Kaito Robotics', 0, 'Stage 1 Pass Approved', 'Exhibition Keynote Lead', 'ID: EXP-4410 \u00b7 Tokyo AI Forum']].forEach(a => U({ name: a[0], email: a[1], pw: hashPw('org123'), role: 'organizer', status: 'pending', title: a[2], org: a[3], avatarSeed: null, risk: a[4], auditMetric: a[5], auditScope: a[6], auditNote: a[7] }));
            db.categories = [{ id: 'tech-ai', name: 'Tech & AI', icon: 'cpu', color: '#818cf8' }, { id: 'music', name: 'Music & Sonic', icon: 'music', color: '#f472b6' }, { id: 'business', name: 'Executive Conclave', icon: 'brief', color: '#38bdf8' }, { id: 'esports', name: 'Esports Arena', icon: 'gamepad', color: '#a78bfa' }, { id: 'creative', name: 'Creative Arts', icon: 'palette', color: '#fbbf24' }, { id: 'wellness', name: 'Bio & Health', icon: 'heart', color: '#34d399' }];
            const mk = o => { const e = { id: uid('ev'), organizerId: o.g === 'A' ? tariq.id : marcus.id, category: o.c, title: o.t, subtitle: o.su, description: o.de, venue: o.v, city: o.ci, hub: o.hu, startDate: isoOff(o.s1), endDate: o.s2 !== undefined ? isoOff(o.s2) : isoOff(o.s1), seedOffset: o.s1, seedOffsetEnd: (o.s2 !== undefined ? o.s2 : o.s1), capacity: o.cap, status: 'published', featured: !!o.f, theme: o.th, coverSeed: o.cs || null, doors: o.door || '09:00', timezone: o.tz || 'Asia/Dhaka', deliveryMode: 'in-person', configId: o.cfg || null, created_at: new Date(now - R() * 120 * DAY).toISOString() }; e.cover = e.coverSeed ? pic(e.coverSeed, 1280, 720) : null; db.events.push(e); return e };
            const T = (ev, a) => a.forEach(t => db.tickets.push({ id: uid('t'), eventId: ev.id, name: t[0], price: t[1], quantity: t[2], perks: t[3] || '', vip: !!t[4] }));
            const evTech = mk({ g: 'A', c: 'tech-ai', t: 'Dhaka Tech Summit 2026', su: 'The Definitive Assembly of Hardware Synthesizers, Neural Architecture Leads, and Global Policy Makers', de: 'Over two intensive days at the Global Arena, 6,000 physical delegates and over 140,000 synchronized hybrid viewers will converge for unprecedented live demonstrations of room-temperature quantum computation and next-generation sovereign AI agent swarms.\n\nKeynote addresses will broadcast across multi-tiered 4K simulcasts with sub-second translation telemetry in 112 languages.', v: 'Bangabandhu Intl Conference Centre', ci: 'Dhaka', hu: 'dhaka', s1: 0, s2: 1, cap: 12500, f: 1, th: '#6366f1', cs: 'dhakatech', cfg: 'EVNT-8902', door: '08:00' });
            T(evTech, [['VIP All-Access', 18000, 300, 'Front-row plenary \u00b7 VIP Quantum Lounge \u00b7 NFC Encircle + Arena Floor', 1], ['Standard', 6000, 4000, 'Main arena seating \u00b7 all keynotes \u00b7 exhibition floor'], ['Virtual', 2000, 8000, '4K simulcast \u00b7 multi-angle streams \u00b7 digital swag']]);
            const evMusic = mk({ g: 'A', c: 'music', t: 'Dhaka Music Festival', su: 'Three stages. Forty artists. One sonic universe under the Dhaka night sky.', de: 'A two-night sonic takeover across the Main Stage, the Glass Dome and the underground Echo Room \u2014 headlined by international electronic acts and the finest lineup South Asia has assembled.', v: 'Police Convention Hall', ci: 'Dhaka', hu: 'dhaka', s1: 34, s2: 35, cap: 8000, f: 1, th: '#ec4899', cs: 'dhamakamusic', cfg: 'EVNT-9117', door: '16:00' });
            T(evMusic, [['Golden Circle VIP', 8500, 800, 'Front-of-stage pit \u00b7 express gates \u00b7 lounge deck', 1], ['Standard', 3500, 6000, 'General admission \u00b7 all three stages'], ['Virtual', 1200, 20000, 'Live 4K stage streams + backstage cam']]);
            const evExpo = mk({ g: 'B', c: 'tech-ai', t: 'AI & Future Technology Expo', su: 'A full-spectrum showcase of intelligent machines, creative algorithms, and next-era interfaces.', de: 'Robotics arenas, autonomous systems test tracks, and 120 exhibitor booths across two halls \u2014 the largest applied-AI floor in the region.', v: 'International Convention City, Bashundhara', ci: 'Dhaka', hu: 'dhaka', s1: 48, cap: 5000, f: 1, th: '#06b6d4', cs: 'aiexpo', cfg: 'EVNT-9240' });
            T(evExpo, [['VIP Expo Pass', 5000, 400, 'Guided lab tours \u00b7 inventor meetups', 1], ['Standard', 2500, 4000, 'Full exhibition access'], ['Student', 800, 600, 'Valid student ID required']]);
            const evStart = mk({ g: 'A', c: 'business', t: 'Startup Summit 2026', su: '28 founders. 300 ventures. 400 investors. One decisive day for the next generation of startups.', de: 'A closed-door executive conclave pairing Series-A founders with sovereign funds and global angels, capped by the Startup Arena pitch block.', v: 'Radisson Blu Water Garden', ci: 'Dhaka', hu: 'dhaka', s1: 7, s2: 8, cap: 1200, f: 1, th: '#a78bfa', cs: 'startupsummit', cfg: 'EVNT-9311' });
            T(evStart, [['Founder VIP', 12000, 150, 'Pitch block slot \u00b7 investor lounge', 1], ['Attendee', 6500, 900, 'Main stage + networking'], ['Virtual', 2500, 1500, 'Live stream + pitch replays']]);
            const evDesign = mk({ g: 'A', c: 'creative', t: 'Creative Design Workshop', su: 'A hands-on studio intensive across type, motion and generative craft.', de: 'Twelve seats per bench, two mentors per room. Bring a laptop and leave with a shipped portfolio piece.', v: 'Bijoy Sarani Studio Loop', ci: 'Dhaka', hu: 'dhaka', s1: 62, cap: 180, th: '#fbbf24', cs: 'designworkshop' });
            T(evDesign, [['Studio Pass', 2500, 140, 'All workshops + material kit'], ['Mentor Pro', 5000, 40, 'Front bench + 1:1 critique', 1]]);
            const evPhoto = mk({ g: 'B', c: 'creative', t: 'Photography Exhibition: Frames of Bengal', su: 'Forty prints. One river. A decade of light.', de: 'A curated retrospective of documentary photography from the delta \u2014 with evening artist walk-throughs.', v: 'Dhanmondi Art Mile', ci: 'Dhaka', hu: 'dhaka', s1: 75, s2: 77, cap: 350, th: '#38bdf8', cs: 'photoframes' });
            T(evPhoto, [['Exhibition Entry', 500, 300, 'All days \u00b7 artist walkthroughs'], ['Collector Pass', 2000, 50, 'Print preview night', 1]]);
            const evFree = mk({ g: 'B', c: 'creative', t: 'Community Open Studios Night', su: 'Free entry \u00b7 meet the makers behind the city\u2019s independent creative studios.', de: 'An open-door evening across the courtyard studios \u2014 live print demos, a zine fair, and guided portfolio walk-throughs. RSVP is free but seats are limited.', v: 'Dhanmondi Art Mile \u2014 Courtyard', ci: 'Dhaka', hu: 'dhaka', s1: 12, door: '18:00', cap: 300, th: '#34d399', cs: 'openstudios' });
            T(evFree, [['Free RSVP', 0, 300, 'General entry \u00b7 courtyard access \u00b7 zine fair']]);
            const evNet = mk({ g: 'A', c: 'business', t: 'Business Networking Night', su: 'One roof, two hundred decision makers, zero small talk scripts.', de: 'Curated matching, hosted tables and a skyline lounge. Every attendee is pre-vetted by the curation desk.', v: 'Le M\u00e9ridien Sky Lounge', ci: 'Dhaka', hu: 'dhaka', s1: 40, door: '19:00', cap: 220, th: '#34d399', cs: 'networking' });
            T(evNet, [['Executive Table', 3000, 180, 'Hosted table + curated matches'], ['Host Committee', 6000, 40, 'Co-host listing + private room', 1]]);
            const evFest = mk({ g: 'B', c: 'tech-ai', t: 'University Tech Fest', su: 'Sixteen campuses. One arena. The region\u2019s loudest hackathon.', de: '48-hour hackathon, robotics derby and campus esports finals \u2014 open to all enrolled students.', v: 'BUET Auditorium Complex', ci: 'Dhaka', hu: 'dhaka', s1: 18, s2: 19, cap: 2500, th: '#8b5cf6', cs: 'techfest' });
            T(evFest, [['Hacker Pass', 800, 1200, 'Hackathon seat + meals'], ['Spectator', 300, 2000, 'Arena + expo access']]);
            const evTokyo = mk({ g: 'B', c: 'tech-ai', t: 'Tokyo AI Forum', su: 'Sovereign compute policy, robotics and embodied agents at planetary scale.', de: 'The flagship AI policy summit of the Asia-Pacific mesh.', v: 'Tokyo Big Sight Grand Dome', ci: 'Tokyo', hu: 'global', s1: 110, s2: 111, cap: 60000, th: '#6366f1', cs: 'tokyoai', tz: 'Asia/Tokyo' });
            T(evTokyo, [['VIP Delegate', 25000, 2000, 'Dome floor + policy dinner', 1], ['Standard', 12000, 30000, 'Full forum access']]);
            const evLondon = mk({ g: 'B', c: 'music', t: 'London Sonic Arena', su: 'A one-night spatial audio spectacle inside the Meridian dome.', de: 'Dolby Atmos rendering across the full dome. One night only.', v: 'The O2 Meridian Complex', ci: 'London', hu: 'global', s1: 95, cap: 20000, th: '#ec4899', cs: 'londonsonic', tz: 'Europe/London' });
            T(evLondon, [['VIP Pit', 15000, 1500, 'Front pit + atmos deck', 1], ['Standard', 9500, 15000, 'Dome seating'], ['Virtual', 2800, 30000, 'Spatial audio live stream']]);
            const evBerlin = mk({ g: 'B', c: 'tech-ai', t: 'Berlin Tech Conclave', su: 'Where Europe\u2019s infrastructure engineers meet the artists of code.', de: 'Two days of systems, art and relentless engineering culture inside the Kraftwerk halls.', v: 'Kraftwerk Innovation Hub', ci: 'Berlin', hu: 'global', s1: 124, s2: 125, cap: 19000, th: '#38bdf8', cs: 'berlinconclave', tz: 'Europe/Berlin' });
            T(evBerlin, [['VIP Conclave', 20000, 800, 'Front hall + speaker dinner', 1], ['Standard', 13000, 15000, 'Both days'], ['Virtual', 4500, 20000, 'All-stage streams']]);
            const evPast = mk({ g: 'A', c: 'creative', t: 'Dhaka Design Week 2025', su: 'A citywide celebration of type, craft and spatial design \u2014 now in the archive.', de: 'Five days of exhibitions, portfolio reviews and open studios across the Design Week corridor. This edition has concluded \u2014 browse the archive or catch the next edition.', v: 'Bangla Academy Complex', ci: 'Dhaka', hu: 'dhaka', s1: -60, s2: -58, cap: 900, th: '#f0abfc', cs: 'dhakadesignweek', door: '10:00' });
            T(evPast, [['General Entry', 1200, 600, 'All venues \u00b7 all days'], ['Pro Pass', 2500, 150, 'Portfolio reviews + closing gala', 1]]);
            const evDraft = mk({ g: 'A', c: 'business', t: 'Immersive Retail Summit', su: 'Draft \u2014 flagship retail experience design briefing.', de: 'Working draft for the Q3 retail experience summit. Venue under negotiation.', v: 'TBD \u2014 Gulshan Avenue', ci: 'Dhaka', hu: 'dhaka', s1: 150, cap: 600, th: '#f472b6', cs: null, cfg: 'EVNT-9502' });
            evDraft.status = 'draft';
            const SP = (ev, n, r, o) => db.speakers.push({ id: uid('sp'), eventId: ev.id, name: n, role: r, org: o, seed: pic(n.toLowerCase().replace(/[^a-z]/g, '') || 'spk', 80, 80) });
            SP(evTech, 'Dr. Selin Aksoy', 'Chief Quantum Architect', 'Aether Dynamics'); SP(evTech, 'James O\u2019Neal', 'VP Neural Systems', 'Gambit Global'); SP(evTech, 'Prof. Nusrat Chowdhury', 'AI Policy Chair', 'Dhaka University'); SP(evTech, 'Kenji Watanabe', 'Hardware Lead', 'Kaito Robotics Lab'); SP(evTech, 'Maria F. Lopez', 'Stream Ops Director', 'PULSE LIVE'); SP(evTech, 'Omar Al-Rashid', 'Security Cryptographer', 'LUXE EXP');
            SP(evMusic, 'Ayesha Rahman', 'Headline Artist', 'Independent'); SP(evMusic, 'Dhruv Kapoor', 'Music Director', 'DHAKA AUDIO'); SP(evMusic, 'Lena Vogel', 'Spatial Audio Designer', 'Sonic Works');
            SP(evExpo, 'Hiroshi Sato', 'Robotics Lead', 'Kaito Robotics Lab'); SP(evExpo, 'Priya Desai', 'Applied AI Director', 'GAMBIT GLOBAL'); SP(evExpo, 'Tomas Berg', 'Expo Curator', 'PULSE LIVE');
            SP(evStart, 'Farhana Karim', 'Managing Partner', 'Delta Ventures'); SP(evStart, 'David S. Chen', 'Founder & CEO', 'CloudScale'); SP(evStart, 'Omar Farooq', 'Angel Network Lead', 'FinPay Global');
            SP(evDesign, 'Mim Akter', 'Type Director', 'Studio Loop'); SP(evDesign, 'Ravi Shankar', 'Motion Craft Lead', 'Kinetic AI');
            SP(evFree, 'Mim Akter', 'Studio Host', 'Studio Loop'); SP(evFree, 'Ravi Shankar', 'Print Demo Lead', 'Kinetic AI');
            SP(evTokyo, 'Dr. Kenji Watanabe', 'Keynote Lead', 'Kaito Robotics Lab'); SP(evTokyo, 'Grace Mensah', 'Policy Fellow', 'Global Compute Council');
            SP(evLondon, 'Ayesha Rahman', 'Headliner', 'Independent'); SP(evLondon, 'Freya Nilsson', 'Show Director', 'LUXE EXP');
            SP(evBerlin, 'Viktor Petrov', 'Systems Chair', 'Berlin Conclave'); SP(evBerlin, 'Anika Tabassum', 'Infrastructure Lead', 'Aether Dynamics');
            const SC = (ev, dy, tm, tt, lc) => db.schedule.push({ id: uid('sc'), eventId: ev.id, day: dy, time: tm, title: tt, location: lc });
            SC(evTech, 1, '08:00', 'Registration & Quantum Badge Pickup', 'Main Foyer'); SC(evTech, 1, '09:30', 'Opening Keynote \u2014 Quantum Horizons', 'Main Plenary Hall'); SC(evTech, 1, '11:15', 'Panel \u2014 Neural Architecture at Scale', 'Hall B'); SC(evTech, 1, '13:00', 'Executive Lunch & NFC Lounge', 'VIP Quantum Lounge'); SC(evTech, 1, '14:30', 'Workshop \u2014 Room-Temperature Quantum Compute', 'Lab Deck 2'); SC(evTech, 1, '17:30', 'Dhaka Night Networking Mixer', 'Sky Terrace');
            SC(evTech, 2, '09:00', 'Keynote \u2014 Global AI Policy Signals', 'Main Plenary Hall'); SC(evTech, 2, '10:30', 'Fireside \u2014 Silicon to Sovereign Compute', 'Hall C'); SC(evTech, 2, '13:30', 'Startup Arena Pitch Block', 'Hall A'); SC(evTech, 2, '16:00', 'Closing Telemetry & Awards', 'Main Plenary Hall');
            SC(evMusic, 1, '16:00', 'Gates Open & Sonic Fair', 'Festival Grounds'); SC(evMusic, 1, '19:00', 'Main Stage \u2014 Opening Ceremony', 'Main Stage'); SC(evMusic, 1, '21:30', 'Headline Set \u2014 Night One', 'Main Stage'); SC(evMusic, 2, '17:00', 'Glass Dome Sessions', 'Glass Dome'); SC(evMusic, 2, '21:00', 'Headline Set \u2014 Night Two', 'Main Stage');
            SC(evExpo, 1, '09:00', 'Expo Floor Opens', 'Halls 1\u20132'); SC(evExpo, 1, '11:00', 'Robotics Derby', 'Arena Track'); SC(evExpo, 1, '15:00', 'Keynote \u2014 Machines that Dream', 'Center Stage');
            SC(evFree, 1, '18:00', 'Doors Open \u2014 Courtyard Fair', 'Courtyard'); SC(evFree, 1, '19:30', 'Live Print & Zine Demo', 'Print Barn');
            SC(evStart, 1, '09:00', 'Founder Check-in & Lounge', 'Executive Foyer'); SC(evStart, 1, '10:00', 'Opening: The State of the Arena', 'Grand Ballroom'); SC(evStart, 1, '14:00', 'Investor Speed Match', 'Hall A'); SC(evStart, 2, '11:00', 'Startup Arena Pitch Block', 'Grand Ballroom');
            const NAMES = 'Ananya Roy Choudhury|David S. Chen|Elena Rostova|Zubair Al-Mansoor|Kofi Boateng|Sofia Morales|Farhan Kabir|Nusrat Jahan|Tanvir Ahmed|Mehreen Sultana|Arif Hossain|Priya Sharma|James O\u2019Neal|Yuki Tanaka|Lucas Meyer|Amara Okafor|Omar Farooq|Layla Hassan|Rafael Santos|Ingrid Larsen|Chen Wei|Ayesha Siddiqua|Rahim Uddin|Maya Patel|Daniel Kim|Fatima Zahra|Viktor Petrov|Nadia Islam|Samuel Osei|Isabella Rossi|Imran Chowdhury|Tasnim Alam|Peter Novak|Grace Mensah|Hiroshi Sato|Leila Nasser|Andrei Popescu|Sadia Afrin|Michael Torres|Anika Tabassum|Kwame Boateng|Elena Petrova|Zara Sheikh|Rakesh Kumar|Hannah Kim|Mahmudul Hasan|Olivia Grant|Sajid Rahman|Camila Diaz|Bilal Ahmed|Freya Nilsson|Tobias Fischer|Aisha Bello|Nabil Hossain'.split('|');
            const DOMS = ['synthix.fund', 'cloudscale.io', 'deeplabs.org', 'finpay.global', 'voltaic.africa', 'kinetic-ai.com', 'aetherdyn.com', 'gambit.io', 'pulse.live', 'luxe.exp', 'dhaka.audio'];
            const emailOf = n => n.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@' + DOMS[Math.floor(R() * DOMS.length)];
            const GATES = ['Gate 1 Turnstile', 'Gate 2 Turnstile', 'Gate 3 Turnstile', 'VIP Fast-Track 1', 'VIP Fast-Track 2'];
            function mkReg(ev, tier, name) {
                const tiers = evTiers(ev);
                const t = tier || tiers[Math.floor(R() * tiers.length)] || { id: null, name: 'Standard', price: 1000 };
                let status = 'confirmed', ck = null, gate = null; const roll = R();
                if (t.vip && roll < .08) status = 'vip_pending';
                else if (roll < .04) status = 'refunded';
                else if (roll < .68) { status = 'checked_in'; const m = 13 + Math.floor(R() * 60); ck = '1' + Math.floor(R() * 2) + ':' + String(m % 60).padStart(2, '0'); gate = GATES[t.vip ? 3 + Math.floor(R() * 2) : Math.floor(R() * 3)] }
                if (t.name === 'Virtual' && status === 'checked_in') gate = 'Virtual Stream Node';
                const reg = { id: uid('rg'), eventId: ev.id, userId: null, attendeeName: name, attendeeEmail: emailOf(name), ticketId: t.id, tierName: t.name, status, passId: passHash(), checkInTime: ck, gate, rfid: t.name !== 'Virtual' && status !== 'refunded', created_at: new Date(now - R() * 21 * DAY).toISOString() };
                db.registrations.push(reg);
                const fee = +(t.price * .05).toFixed(2);
                db.orders.push({ id: uid('or'), eventId: ev.id, userId: null, registrationId: reg.id, unitPrice: t.price, quantity: 1, fees: fee, total: +(t.price + fee).toFixed(2), method: t.price === 0 ? 'Free' : 'bKash', status: status === 'refunded' ? 'refunded' : 'paid', created_at: reg.created_at, paidAt: reg.created_at });
            }
            const vipT = evTiers(evTech).find(t => t.vip), stdT = evTiers(evTech).find(t => t.name === 'Standard'), virT = evTiers(evTech).find(t => t.name === 'Virtual');
            [['Ananya Roy Choudhury', vipT, '0x7F4A9C21E447B821', 'checked_in', '14:02', 'Gate 3 Turnstile', 1], ['David S. Chen', stdT, '0x3D11665A0C229E04', 'checked_in', '14:15', 'Gate 1 Turnstile', 1], ['Elena Rostova', virT, '0x88BC41D0AA9E23FA', 'confirmed', null, 'Virtual Stream Node', 0], ['Zubair Al-Mansoor', vipT, '0x4E2B77C3D5F0AA91', 'checked_in', '13:48', 'VIP Fast-Track 2', 1], ['Kofi Boateng', stdT, '0x5C90B2A4F1134D12', 'confirmed', null, 'Expected Gate 1', 1], ['Sofia Morales', stdT, '0x11AB90CD43E776E3', 'checked_in', '14:09', 'Gate 2 Turnstile', 1]].forEach(f => {
                const fee = +(f[1].price * .05).toFixed(2);
                const reg = { id: uid('rg'), eventId: evTech.id, userId: null, attendeeName: f[0], attendeeEmail: emailOf(f[0]), ticketId: f[1].id, tierName: f[1].name, status: f[3], passId: f[2], checkInTime: f[4], gate: f[5], rfid: !!f[6], created_at: new Date(now - R() * 14 * DAY).toISOString() };
                db.registrations.push(reg);
                db.orders.push({ id: uid('or'), eventId: evTech.id, userId: null, registrationId: reg.id, unitPrice: f[1].price, quantity: 1, fees: fee, total: +(f[1].price + fee).toFixed(2), method: 'bKash', status: 'paid', created_at: reg.created_at, paidAt: reg.created_at });
            });
            [[evTech, 128], [evMusic, 64], [evExpo, 52], [evStart, 38], [evTokyo, 46], [evLondon, 40], [evBerlin, 30], [evDesign, 22], [evPhoto, 18], [evNet, 16], [evFest, 44], [evFree, 26], [evPast, 40]].forEach(pair => { let i = 0; while (i < pair[1]) { const base = NAMES[Math.floor(R() * NAMES.length)]; mkReg(pair[0], null, i % 2 === 0 ? base : base + ' Jr.'); i++ } });
            const buy = (u, ev, tierName) => {
                const t = evTiers(ev).find(x => x.name === tierName); const fee = +(t.price * .05).toFixed(2);
                const reg = { id: uid('rg'), eventId: ev.id, userId: u.id, attendeeName: u.name, attendeeEmail: u.email, ticketId: t.id, tierName: t.name, status: 'confirmed', passId: passHash(), checkInTime: null, gate: null, rfid: t.name !== 'Virtual', created_at: new Date(now - 3 * DAY).toISOString() };
                db.registrations.push(reg);
                db.orders.push({ id: uid('or'), eventId: ev.id, userId: u.id, registrationId: reg.id, unitPrice: t.price, quantity: 1, fees: fee, total: +(t.price + fee).toFixed(2), method: t.price === 0 ? 'Free' : 'bKash', status: 'paid', created_at: reg.created_at, paidAt: reg.created_at });
                db.notifications.push({ id: uid('nt'), userId: u.id, title: 'Pass confirmed \u2014 ' + ev.title, body: t.name + ' \u00d7 1 \u00b7 ' + (t.price === 0 ? 'Free' : fmtT(t.price + fee)) + ' \u00b7 Pass ' + truncHash(reg.passId), type: 'ticket', link: '#/success/' + reg.id, read: false, created_at: reg.created_at })
            };
            buy(demo, evMusic, 'Standard'); buy(demo, evFest, 'Spectator'); buy(demo, evFree, 'Free RSVP'); buy(demo, evPast, 'General Entry');
            db.favorites.push({ id: uid('fv'), userId: demo.id, eventId: evExpo.id, created_at: new Date().toISOString() }, { id: uid('fv'), userId: demo.id, eventId: evTech.id, created_at: new Date().toISOString() });
            db.notifications.push(
                { id: uid('nt'), userId: demo.id, title: 'University Tech Fest starts in 18 days', body: 'Your Spectator pass is synced to the gate mesh. Doors open 09:00.', type: 'alert', link: '#/attendee/tickets', read: false, created_at: new Date(now - 36e5).toISOString() },
                { id: uid('nt'), userId: tariq.id, title: 'New VIP All-Access sale \u2014 Dhaka Tech Summit 2026', body: 'Ananya Roy Choudhury \u00b7 ' + fmtT(18900), type: 'sale', link: '#/organizer/attendees', read: true, created_at: new Date(now - 72e5).toISOString() },
                { id: uid('nt'), userId: tariq.id, title: 'New Standard sale \u2014 Dhaka Music Festival', body: 'Sarah Chen \u00b7 ' + fmtT(3675), type: 'sale', link: '#/organizer/attendees', read: false, created_at: new Date(now - 18e5).toISOString() },
                { id: uid('nt'), userId: admin.id, title: 'Veloce RapidPass flagged by velocity monitor', body: '420 req/sec burst from SCAL-1082 queued for moderation.', type: 'alert', link: '#/admin', read: false, created_at: new Date(now - 54e5).toISOString() });
            db.meta.sessionUserId = null;
        }
        const userById = id => db.users.find(u => u.id === id);
        const session = () => db.meta.sessionUserId ? userById(db.meta.sessionUserId) : null;
        const catOf = id => db.categories.find(c => c.id === id) || { name: 'Experience', icon: 'spark', color: '#818cf8' };
        const evTiers = ev => ev ? db.tickets.filter(t => t.eventId === ev.id) : [];
        const tierById = id => db.tickets.find(t => t.id === id);
        const soldOf = tierId => db.registrations.filter(r => r.ticketId === tierId && !['cancelled', 'refunded'].includes(r.status)).length;
        const evRegs = evId => evId ? db.registrations.filter(r => r.eventId === evId && r.status !== 'cancelled') : [];
        const evOrders = evId => db.orders.filter(o => o.eventId === evId && o.status === 'paid');
        const evRevenue = evId => evOrders(evId).reduce((s, o) => s + o.total, 0);
        const priceFrom = ev => { const ts = evTiers(ev); return ts.length ? Math.min.apply(null, ts.map(t => t.price)) : 0 };
        const evCur = ev => (ev && ev.currency) || CUR_DEFAULT;
        const priceLabel = ev => { const p = priceFrom(ev); return p === 0 ? 'Free' : 'From ' + fmtT(p, evCur(ev)) };
        const hasVip = ev => evTiers(ev).some(t => t.vip);
        const publicEvents = () => db.events.filter(e => ['published'].includes(e.status));
        const myEvents = () => { const u = session(); return u ? db.events.filter(e => e.organizerId === u.id).sort((a, b) => ((a.status === 'draft' ? 1 : 0) - (b.status === 'draft' ? 1 : 0))) : [] };
        const evSpeakers = evId => db.speakers.filter(s => s.eventId === evId);
        const evSchedule = evId => db.schedule.filter(s => s.eventId === evId).sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time));
        const myNotifs = () => { const u = session(); return u ? db.notifications.filter(n => n.userId === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [] };
        const unreadCount = () => myNotifs().filter(n => !n.read).length;
        const isFav = evId => { const u = session(); return !!u && db.favorites.some(f => f.userId === u.id && f.eventId === evId) };
        function notify(userId, title, body, type, link) { db.notifications.push({ id: uid('nt'), userId, title, body, type: type || 'system', link: link || null, read: false, created_at: new Date().toISOString() }) }
        const METHOD_LABEL = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', card: 'Visa / Mastercard', paypal: 'PayPal', 'NFC Wallet': 'NFC Wallet', Free: 'Free' };
        const methodLabel = m => METHOD_LABEL[m] || m || '\u2014';
        /* Payment methods offered depend on the event's currency: BDT-priced events show the
           local Bangladesh mobile wallets alongside cards; every other currency shows card +
           PayPal, which work for a buyer anywhere in the world. Same single gateway integration
           (createSessionUrl/verifyUrl) \u2014 just different rails offered per currency. */
        const PAY_METHODS_BDT = [['bkash', 'bKash', '#e2136e'], ['nagad', 'Nagad', '#f6921e'], ['rocket', 'Rocket', '#8c3494'], ['card', 'Visa / Mastercard', '#38bdf8']];
        const PAY_METHODS_INTL = [['card', 'Visa / Mastercard', '#38bdf8'], ['paypal', 'PayPal', '#003087']];
        const payMethodsFor = code => code === 'BDT' ? PAY_METHODS_BDT : PAY_METHODS_INTL;
        const PAY_METHODS = PAY_METHODS_BDT; /* legacy alias for spots without currency context */
        const orderByRef = ref => db.orders.find(o => o.intent && o.intent.ref === ref);
        function payPill(s) { const m = { pending: ['pill-warn', 'Pending'], paid: ['pill-green', 'Paid'], failed: ['pill-red', 'Failed'], cancelled: ['pill-mut', 'Cancelled'], refunded: ['pill-vio', 'Refunded'] }; const x = m[s] || m.pending; return '<span class="pill ' + x[0] + '">' + x[1] + '</span>' }
        const ROLE_HOME = { attendee: '#/attendee/dashboard', organizer: '#/organizer/dashboard', admin: '#/admin' };
        const homeFor = u => !u ? '#/' : (ROLE_HOME[u.role] || '#/');
        /* Supabase's implicit OAuth flow (and password-recovery / magic-link redirects) send the
           user back with the token bundle appended raw onto the URL hash, e.g.
           "#access_token=...&refresh_token=...&type=..." \u2014 this collides with our own
           hash router (which expects "#/some/route"), so it must be recognised and kept OUT of
           resolve()/seg parsing until the SDK has consumed it and we've redirected to a clean
           "#/..." route. Without this guard the very first render() call sees this raw token
           string as an unknown route and shows the 404 page. */
        function isAuthCallbackHash(h) { return /(^|#)(access_token|refresh_token|provider_token|error_description|error)=/.test(h || '') || /type=(recovery|signup|magiclink)/.test(h || '') }
        /* Strong-password rule for registration: 8+ chars, at least one lowercase, one
           uppercase, one digit, and one symbol. Returns an error string, or '' if it passes. */
        function passwordStrengthError(pass) {
            if (!pass || pass.length < 8) return 'Password must be at least 8 characters.';
            if (!/[a-z]/.test(pass)) return 'Password must include at least one lowercase letter.';
            if (!/[A-Z]/.test(pass)) return 'Password must include at least one uppercase letter.';
            if (!/[0-9]/.test(pass)) return 'Password must include at least one number.';
            if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must include at least one symbol (e.g. ! @ # $ %).';
            return '';
        }
        /* ---- Real Supabase Auth (replaces the old localStorage password check) ---- */
        async function doLogin(email, pass) {
            AUTH_FLOW_BUSY = true;
            try {
                const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password: pass });
                if (error) return error.message || 'Invalid email or password.';
                await syncProfileIntoLocalCache(data.user.id);
                const u = userById(data.user.id);
                if (u && u.status === 'suspended') { await sb.auth.signOut(); db.meta.sessionUserId = null; persist(); return 'This account has been suspended by platform moderation.'; }
                db.meta.sessionUserId = data.user.id; persist(); return null;
            } finally { AUTH_FLOW_BUSY = false }
        }
        async function doRegister(name, email, pass, role, org) {
            AUTH_FLOW_BUSY = true;
            try {
                const { data, error } = await sb.auth.signUp({
                    email: String(email).trim(), password: pass,
                    options: { data: { name: name.trim(), role: role || 'attendee', org: org || '' } }
                });
                if (error) return error.message || 'Could not create account.';
                /* Supabase deliberately returns a "successful" signUp with no error for an
                   email that's already registered (to avoid leaking which emails exist) \u2014
                   the tell is an empty identities array on the returned user. Catch that and
                   send them to sign in instead of pretending a new account was made. */
                if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                    return 'An account with this email already exists \u2014 please sign in instead.';
                }
                if (!data.session) return 'ACCOUNT_CREATED_CONFIRM_EMAIL';
                /* Account + session were created, but we always want people to land on the
                   sign-in page and log in themselves rather than being auto-dropped into
                   the dashboard \u2014 so sign the fresh session back out here. */
                await sb.auth.signOut();
                return 'ACCOUNT_CREATED_GO_LOGIN';
            } finally { AUTH_FLOW_BUSY = false }
        }
        /* Pulls the authoritative profile row from Supabase into the local db.users cache
           so the rest of the app's synchronous render() code keeps working unchanged.
           A missing row usually means the backend's auth.users -> profiles trigger hasn't
           run yet (common right after a brand-new Google sign-in) or doesn't cover OAuth
           users at all \u2014 so this retries once before giving up. */
        async function syncProfileIntoLocalCache(userId, _retried) {
            const { data: profile, error } = await sb.from('profiles').select('*').eq('id', userId).single();
            if (error || !profile) {
                if (!_retried) { await new Promise(r => setTimeout(r, 900)); return syncProfileIntoLocalCache(userId, true) }
                return null;
            }
            let providers = ['email'];
            try { const { data: { user: authUser } } = await sb.auth.getUser(); if (authUser && authUser.app_metadata && authUser.app_metadata.providers) providers = authUser.app_metadata.providers; } catch (e) { }
            const shaped = { id: profile.id, name: profile.name, email: profile.email, role: profile.role, title: profile.title, org: profile.org, status: profile.status, verified: profile.verified, avatarSeed: profile.avatar_url, risk: 0, created_at: profile.created_at, notifPrefs: profile.notif_prefs || { email: true, push: true, updates: true }, pw: providers.includes('email'), authProvider: providers.includes('google') && !providers.includes('email') ? 'google' : 'email' };
            const i = db.users.findIndex(x => x.id === profile.id);
            if (i >= 0) db.users[i] = Object.assign({}, db.users[i], shaped); else db.users.push(shaped);
            return shaped;
        }
        function initGoogle(hostEl, roleParam, tab) {
            if (!hostEl) return;
            hostEl.innerHTML = '<button type="button" class="btn btn-g" style="width:100%;justify-content:center" data-action="google-signin" data-role="' + (roleParam || '') + '" data-tab="' + (tab || 'login') + '">'
                + '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.3 13 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.6z"/><path fill="#FBBC05" d="M10.5 19.3c-.5 1.5-.8 3.1-.8 4.7s.3 3.2.8 4.7l-7.9 6.1C1 31.5 0 27.9 0 24s1-7.5 2.6-10.8l7.9 6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.9 2.3-6.4 0-11.7-3.5-13.6-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>'
                + ' Continue with Google</button>';
        }
        /* Remembers what the person actually clicked (Register-as-X vs Sign In) across the
           full-page redirect to Google and back \u2014 sessionStorage survives that round trip,
           in-memory JS state does not. Consumed (read-once) by landAfterAuthCallback. */
        function consumeAuthIntent() {
            try { const raw = sessionStorage.getItem('ev_auth_intent'); sessionStorage.removeItem('ev_auth_intent'); return raw ? JSON.parse(raw) : null; }
            catch (e) { return null }
        }
        async function googleSignIn(tab, role) {
            try { sessionStorage.setItem('ev_auth_intent', JSON.stringify({ tab: tab || 'login', role: role || '' })); } catch (e) { }
            const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
            if (error) toast('Google sign-in failed: ' + error.message, 'err');
        }
        async function uploadAvatar(file) {
            const u = session(); if (!u) return;
            if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'warn'); return }
            if (file.size > 3 * 1024 * 1024) { toast('Image must be under 3MB.', 'warn'); return }
            const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
            const path = u.id + '/avatar.' + ext;
            toast('Uploading photo\u2026', 'info');
            const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
            if (upErr) { toast('Upload failed: ' + upErr.message, 'err'); return }
            const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
            const url = pub.publicUrl + '?t=' + Date.now();
            const { error: updErr } = await sb.from('profiles').update({ avatar_url: url }).eq('id', u.id);
            if (updErr) { toast('Could not save photo: ' + updErr.message, 'err'); return }
            u.avatarSeed = url; persist(); toast('Profile picture updated.', 'ok'); render();
        }
        async function signOut() {
            await sb.auth.signOut();
            db.meta.sessionUserId = null; persist();
            W = null; ROS_EV = null;
            location.hash = '#/';
            toast('Signed out. See you at the gate.', 'ok');
        }
        const CHART_COLORS = ['#818cf8', '#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa'];
        let CHART_N = 0;
        function niceMax(v) { if (!v || v <= 0) return 1; const ex = Math.pow(10, Math.floor(Math.log10(v))); const f = v / ex; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * ex }
        function smoothPath(pts) { if (!pts.length) return ''; if (pts.length === 1) return 'M' + pts[0][0] + ',' + pts[0][1]; let p = 'M' + pts[0][0] + ',' + pts[0][1]; for (let i = 1; i < pts.length; i++) { const x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1], cx = (x0 + x1) / 2; p += ' C' + cx.toFixed(1) + ',' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1) } return p }
        function chartCard(title, subtitle, inner, badge) { return '<div class="glass chart-card"><div class="chart-card-h"><div><h3>' + title + '</h3>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>' + (badge || '') + '</div>' + inner + '</div>' }
        function areaChart(data, opts) {
            const o = Object.assign({ height: 230, color: '#818cf8', fmt: shortMoney, tipFmt: 'money' }, opts || {});
            const W = 640, H = o.height, pl = 54, pr = 14, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb, n = data.length || 1;
            const m = niceMax(Math.max.apply(null, data.map(x => +x.value || 0).concat([0])));
            const X = i => pl + (n <= 1 ? iw / 2 : iw * i / (n - 1)), Y = v => pt + ih - (m ? v / m * ih : 0);
            const pts = data.map((x, i) => [X(i), Y(+x.value || 0)]), line = smoothPath(pts);
            const area = line + ' L' + X(n - 1).toFixed(1) + ',' + (pt + ih).toFixed(1) + ' L' + X(0).toFixed(1) + ',' + (pt + ih).toFixed(1) + ' Z';
            const grid = [0, .25, .5, .75, 1].map(f => { const gy = (pt + ih - f * ih).toFixed(1); return '<line class="grid-l" x1="' + pl + '" y1="' + gy + '" x2="' + (W - pr) + '" y2="' + gy + '"/><text class="axis-t" x="' + (pl - 8) + '" y="' + (+gy + 3.5) + '" text-anchor="end">' + o.fmt(m * f) + '</text>' }).join('');
            const step = Math.max(1, Math.ceil(n / 8));
            const xlab = data.map((x, i) => ((i % step === 0 || i === n - 1) ? '<text class="axis-t" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(x.label) + '</text>' : '')).join('');
            const gid = 'agr' + (++CHART_N);
            return '<div class="chart-box" data-kind="area" data-fmt="' + o.tipFmt + '" data-geom=\'{"l":' + pl + ',"r":' + pr + ',"t":' + pt + ',"b":' + pb + '}\' data-chart=\'' + esc(JSON.stringify(data)) + '\'>'
                + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Trend chart') + '">'
                + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + o.color + '" stop-opacity=".3"/><stop offset="1" stop-color="' + o.color + '" stop-opacity="0"/></linearGradient></defs>'
                + grid + xlab + '<path d="' + area + '" fill="url(#' + gid + ')"/>'
                + '<path class="ch-line" d="' + line + '" fill="none" stroke="' + o.color + '" stroke-width="2.4" stroke-linecap="round"/>'
                + '<line class="ch-cursor" y1="' + pt + '" y2="' + (pt + ih) + '" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 4" visibility="hidden"/>'
                + '<circle class="ch-dot" r="4.5" fill="' + o.color + '" stroke="#0b0f19" stroke-width="2" visibility="hidden"/></svg><div class="chart-tip"></div></div>';
        }
        function barChartV(data, opts) {
            const o = Object.assign({ height: 240, color: '#818cf8', fmt: fmtN, tipFmt: 'num' }, opts || {});
            const W = 640, H = o.height, pl = 50, pr = 12, pt = 14, pb = 42, iw = W - pl - pr, ih = H - pt - pb, n = data.length || 1;
            const m = niceMax(Math.max.apply(null, data.map(x => +x.value || 0).concat([0])));
            const bw = Math.min(46, Math.max(14, iw / n * .6)), Y = v => pt + ih - (m ? v / m * ih : 0);
            const grid = [0, .25, .5, .75, 1].map(f => { const gy = (pt + ih - f * ih).toFixed(1); return '<line class="grid-l" x1="' + pl + '" y1="' + gy + '" x2="' + (W - pr) + '" y2="' + gy + '"/><text class="axis-t" x="' + (pl - 8) + '" y="' + (+gy + 3.5) + '" text-anchor="end">' + shortMoney(m * f) + '</text>' }).join('');
            const bars = data.map((x, i) => {
                const cx = (pl + iw * (i + .5) / n).toFixed(1), by = Y(+x.value || 0).toFixed(1), tr = x.label.length > 13 ? x.label.slice(0, 12) + '\u2026' : x.label;
                return '<g><rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + by + '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, pt + ih - +by).toFixed(1) + '" rx="5" fill="' + o.color + '" opacity=".92"><title>' + esc(x.label) + ': ' + o.fmt(+x.value) + '</title></rect>'
                    + '<text class="axis-t" x="' + cx + '" y="' + (H - 22) + '" text-anchor="middle">' + esc(tr) + '</text>'
                    + '<text class="axis-t" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" opacity=".75">' + o.fmt(+x.value) + '</text></g>'
            }).join('');
            return '<div class="chart-box" data-kind="bar" data-fmt="' + o.tipFmt + '" data-geom=\'{"l":' + pl + ',"r":' + pr + ',"t":' + pt + ',"b":' + pb + '}\' data-chart=\'' + esc(JSON.stringify(data)) + '\'>'
                + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Comparison chart') + '">' + grid + bars
                + '<line class="ch-cursor" y1="' + pt + '" y2="' + (pt + ih) + '" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 4" visibility="hidden"/></svg><div class="chart-tip"></div></div>';
        }
        function donutChart(segs, opts) {
            const o = Object.assign({ size: 172, stroke: 20, center: '', centerLabel: '' }, opts || {});
            const total = segs.reduce((s, x) => s + x.value, 0);
            if (!total) return '<div class="mut small" style="padding:26px 0;text-align:center">No data for this period yet.</div>';
            const r = (o.size - o.stroke) / 2 - 2, C = 2 * Math.PI * r; let off = 0;
            const rings = segs.map(s => {
                const len = s.value / total * C, gap = Math.min(2, len * .06);
                const c = '<circle cx="' + (o.size / 2) + '" cy="' + (o.size / 2) + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="' + o.stroke + '" stroke-dasharray="' + Math.max(.5, len - gap).toFixed(2) + ' ' + (C - Math.max(.5, len - gap)).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + (o.size / 2) + ' ' + (o.size / 2) + ')" style="filter:drop-shadow(0 0 5px ' + s.color + '44)"><title>' + esc(s.label) + ': ' + fmtN(s.value) + ' (' + Math.round(s.value / total * 100) + '%)</title></circle>';
                off += len; return c
            }).join('');
            const leg = segs.map(s => '<div class="dl"><span class="dot" style="background:' + s.color + ';box-shadow:0 0 8px ' + s.color + '66"></span><span>' + esc(s.label) + '</span><b class="tnum">' + fmtN(s.value) + ' \u00b7 ' + Math.round(s.value / total * 100) + '%</b></div>').join('');
            return '<div class="donut-wrap"><svg viewBox="0 0 ' + o.size + ' ' + o.size + '" role="img" aria-label="Proportion chart">' + rings
                + '<circle cx="' + (o.size / 2) + '" cy="' + (o.size / 2) + '" r="' + (r - o.stroke / 2 - 4) + '" fill="rgba(7,9,14,.55)"/>'
                + '<text x="' + (o.size / 2) + '" y="' + (o.size / 2) + '" text-anchor="middle" dominant-baseline="middle" style="font:800 21px var(--fd);fill:#fff">' + esc(o.center) + '</text>'
                + (o.centerLabel ? '<text x="' + (o.size / 2) + '" y="' + (o.size / 2 + 17) + '" text-anchor="middle" class="axis-t">' + esc(o.centerLabel) + '</text>' : '') + '</svg><div class="donut-leg">' + leg + '</div></div>';
        }
        function hbarList(data, opts) {
            const o = Object.assign({ fmt: fmtMoney, freeLabel: 'Free tier' }, opts || {});
            const max = Math.max.apply(null, data.map(x => x.value).concat([1]));
            return '<div class="hbar-list">' + data.map(x => '<div class="hb"><div class="hb-t"><span>' + esc(x.label) + '</span><b class="tnum">' + (x.value === 0 ? o.freeLabel : o.fmt(x.value)) + (x.sub ? ' <span class="mut">\u00b7 ' + esc(x.sub) + '</span>' : '') + '</b></div><div class="pbar"><i style="width:' + (x.value / max * 100) + '%"></i></div></div>').join('') + '</div>';
        }
        function bindCharts() {
            $$('.chart-box').forEach(box => {
                try {
                    const svg = box.querySelector('svg'); if (!svg || svg.dataset.bound) return;
                    let data; try { data = JSON.parse(box.dataset.chart || '[]') } catch (e) { return }
                    if (!data || !data.length) return;
                    svg.dataset.bound = '1';
                    const tip = box.querySelector('.chart-tip'), cur = svg.querySelector('.ch-cursor'), dot = svg.querySelector('.ch-dot');
                    const kind = box.dataset.kind || 'area', isMoney = box.dataset.fmt === 'money', isNum = box.dataset.fmt === 'num';
                    const vb = svg.getAttribute('viewBox').split(' ').map(Number), W = vb[2], H = vb[3];
                    let geom = { l: 50, r: 14, t: 14, b: 28 };
                    try { geom = Object.assign(geom, JSON.parse(box.dataset.geom || '{}')) } catch (e) { }
                    const iw = W - geom.l - geom.r, ih = H - geom.t - geom.b, n = data.length;
                    const m = niceMax(Math.max.apply(null, data.map(x => +x.value || 0).concat([0])));
                    const px = i => kind === 'bar' ? geom.l + iw * (i + .5) / n : geom.l + (n <= 1 ? iw / 2 : iw * i / (n - 1));
                    const py = v => geom.t + ih - (m ? v / m * ih : 0);
                    svg.addEventListener('mousemove', e => {
                        const r = svg.getBoundingClientRect();
                        const fx = Math.min(.999, Math.max(0, (e.clientX - r.left) / r.width));
                        const i = Math.min(n - 1, Math.max(0, Math.round(fx * (n - 1))));
                        const dd = data[i], x = px(i);
                        if (cur) { cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.removeAttribute('visibility') }
                        if (dot) { dot.setAttribute('cx', x); dot.setAttribute('cy', py(+dd.value || 0)); dot.removeAttribute('visibility') }
                        if (tip) {
                            tip.innerHTML = '<b>' + (isMoney ? fmtMoney(+dd.value || 0) : isNum ? fmtN(+dd.value || 0) : esc(String(dd.value))) + '</b>' + esc(dd.label);
                            const pct = x / W * 100; tip.style.left = pct + '%';
                            tip.style.transform = pct < 12 ? 'translate(4px,-115%)' : (pct > 88 ? 'translate(calc(-100% - 4px),-115%)' : 'translate(-50%,-115%)');
                            tip.style.opacity = '1'
                        }
                    });
                    svg.addEventListener('mouseleave', () => { if (cur) cur.setAttribute('visibility', 'hidden'); if (dot) dot.setAttribute('visibility', 'hidden'); if (tip) tip.style.opacity = '0' });
                } catch (e) { console.error('chart bind', e) }
            });
        }
        function dailySeries(days, extract) { const out = []; for (let i = days - 1; i >= 0; i--) { const dt = new Date(Date.now() - i * DAY); out.push({ label: MONTHS[dt.getMonth()] + ' ' + dt.getDate(), value: extract(localISO(dt)) }) } return out }
        const regsPerDay = (ids, days) => dailySeries(days, k => db.registrations.filter(r => ids.indexOf(r.eventId) >= 0 && r.created_at.slice(0, 10) === k && r.status !== 'cancelled' && r.status !== 'refunded').length);
        const revPerDay = (ids, days) => dailySeries(days, k => db.orders.filter(o => ids.indexOf(o.eventId) >= 0 && o.created_at.slice(0, 10) === k && o.status === 'paid').reduce((s, o) => s + o.total, 0));
        function tierMixSegs(ids) { const m = {}; db.registrations.filter(r => ids.indexOf(r.eventId) >= 0 && !['cancelled', 'refunded'].includes(r.status)).forEach(r => { m[r.tierName] = (m[r.tierName] || 0) + 1 }); return Object.keys(m).sort((a, b) => m[b] - m[a]).map((k, i) => ({ label: k, value: m[k], color: CHART_COLORS[i % CHART_COLORS.length] })) }
        function catMixSegs(ids) { const m = {}; db.registrations.filter(r => ids.indexOf(r.eventId) >= 0 && !['cancelled', 'refunded'].includes(r.status)).forEach(r => { const ev = db.events.find(e => e.id === r.eventId); if (!ev) return; m[ev.category] = (m[ev.category] || 0) + 1 }); return Object.keys(m).sort((a, b) => m[b] - m[a]).map(k => { const c = catOf(k); return { label: c.name, value: m[k], color: c.color } }) }
        function eventPhaseMix(evs) {
            let up = 0, on = 0, dn = 0;
            evs.forEach(e => { const s = evState(e); if (s === 'upcoming') up++; else if (s === 'live') on++; else if (s === 'ended') dn++ });
            return [{ label: 'Upcoming', value: up, color: '#38bdf8' }, { label: 'Ongoing / Live', value: on, color: '#34d399' }, { label: 'Completed', value: dn, color: '#818cf8' }].filter(s => s.value > 0);
        }
        function metricTile(o) {
            return '<div class="glass mtile"><div class="mh"><span class="ml" style="color:' + o.c + '">' + esc(o.label) + '</span><span class="mi">' + ic(o.icon, 18) + '</span></div>'
                + '<div class="mv tnum">' + o.value + (o.trend ? '<span class="trend" style="color:' + (o.tc || 'var(--amber)') + '">' + o.trend + '</span>' : '') + '</div>'
                + (o.cap ? '<div class="cap">' + o.cap + '</div>' : '')
                + (o.bar != null ? '<div class="pbar ' + (o.bc || '') + '"><i style="width:' + Math.min(100, Math.max(0, o.bar)) + '%"></i></div>' : '') + '</div>';
        }
        function eventCard(ev) {
            const c = catOf(ev.category), regs = evRegs(ev.id).length, tiers = evTiers(ev);
            const soldOut = tiers.length > 0 && tiers.every(t => soldOf(t.id) >= t.quantity);
            const fill = ev.capacity ? regs / ev.capacity : 0;
            const purch = evPurchasable(ev);
            let badges = statePill(ev);
            if (purch && soldOut) badges += '<span class="pill pill-red">Sold Out</span>';
            else if (purch && fill >= .7) badges += '<span class="pill pill-warn">Selling Fast</span>';
            if (hasVip(ev) && purch) badges += '<span class="pill pill-vip">VIP Access</span>';
            const btn = purch ? (soldOut ? '<button class="btn btn-g w100 mt16" disabled>' + ic('ticket', 15) + ' Sold Out</button>' : '<button class="btn btn-g w100 mt16" data-action="checkout" data-id="' + ev.id + '">' + ic('ticket', 15) + ' ' + (priceFrom(ev) === 0 ? 'RSVP Free' : 'Get Tickets') + '</button>') : '<button class="btn btn-g w100 mt16" disabled>' + ic('ban', 15) + ' Event Ended</button>';
            return '<a class="glass ev-card" href="#/event/' + ev.id + '">'
                + '<div class="ev-media"><img src="' + coverOf(ev) + '" alt="' + esc(ev.title) + '" loading="lazy">'
                + '<div class="ev-badges">' + badges + '</div>'
                + '<div class="ev-datep">' + datePill(ev.startDate, ev.endDate) + '</div></div>'
                + '<div class="ev-body"><div class="ev-cat" style="color:' + c.color + '">' + esc(c.name) + '</div><h3>' + esc(ev.title) + '</h3>'
                + '<div class="ev-venue">' + ic('pin', 13) + ' ' + esc(ev.venue) + ' \u00b7 ' + esc(ev.city) + '</div>'
                + '<p class="ev-desc">' + esc(ev.subtitle) + '</p>'
                + '<div class="ev-meta"><div><span class="tnum">' + fmtN(ev.capacity) + '</span><label>Seats</label></div><div><span class="tnum">' + fmtN(regs) + '</span><label>Confirmed</label></div><div class="pr"><span class="tnum">' + (purch ? priceLabel(ev) : '\u2014') + '</span><label>' + (purch ? 'Starting' : 'Sales closed') + '</label></div></div>'
                + btn + '</div></a>';
        }
        function passCard(r, ev, avaSrc) {
            const st = evState(ev);
            const pill = st === 'ended' ? '<span class="pill pill-mut">Ended</span>' : st === 'live' ? '<span class="pill pill-live"><span class="dot g pulse"></span> Live Now</span>' : '<span class="pill pill-live">Upcoming</span>';
            const cancel = !evEnded(ev) ? '<button class="btn btn-danger sm" data-action="tkt-cancel" data-id="' + r.id + '" style="margin-left:auto">' + ic('x', 14) + ' Cancel</button>' : '';
            return '<div class="pass"><div class="p-cover"><img src="' + coverOf(ev) + '" alt=""><span class="pill" style="position:absolute;top:12px;right:12px;z-index:2;border:1px solid var(--line2);background:rgba(7,9,14,.72);color:#e2e8f0">' + pill + '</span></div>'
                + '<div class="p-body"><img class="p-ava" src="' + avaSrc + '" alt=""><div class="p-name">' + esc(ev.title) + '</div>'
                + '<span class="tier-b ' + (r.tierName.includes('VIP') ? 'tier-vip' : r.tierName === 'Virtual' ? 'tier-vir' : 'tier-std') + '" style="margin-top:6px">' + (r.tierName.includes('VIP') ? ic('crown', 12) : ic('ticket', 12)) + ' ' + esc(r.tierName) + '</span>'
                + '<div class="p-grid"><div><label>Date</label><b>' + fmtRange(ev.startDate, ev.endDate) + '</b></div><div><label>Venue</label><b>' + esc(ev.venue) + '</b></div><div><label>Pass ID</label><b class="mono" style="color:var(--cyan2)">' + truncHash(r.passId) + '</b></div><div><label>Status</label><b style="color:var(--green)">' + (r.status === 'confirmed' ? 'Confirmed' : 'Checked In') + '</b></div></div>'
                + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-p sm" data-action="tkt-qr" data-id="' + r.id + '">' + ic('qr', 14) + ' View Pass QR</button><button class="btn btn-g sm" data-action="tkt-ics" data-id="' + r.id + '">' + ic('cal', 14) + ' Calendar</button><button class="btn btn-g sm" data-go="#/event/' + ev.id + '">' + ic('eye', 14) + ' Event</button>' + cancel + '</div></div></div>';
        }
        /* Shared footer, but the "Attendees" and "Organizers" columns are role-aware:
           - Logged out (public pages) and admins see BOTH columns.
           - Attendee dashboard hides the "Organizers" column.
           - Organizer dashboard hides the "Attendees" column. */
        function footerHTML(role) {
            const showAttendees = role !== 'organizer';
            const showOrganizers = role !== 'attendee';
            return '<footer class="lfoot"><div class="wrap"><div class="lfoot-grid">'
                + '<div class="lfoot-brand">' + brandHTML(34) + '<p>Next-Gen Experience Infrastructure for the global events industry \u2014 from stadium festivals to executive conclaves.</p><div class="soc-row">' + socialLinks() + '</div></div>'
                + '<div><h5>Platform</h5><a href="#/">Home</a><a href="#/events">Explore Events</a><a href="#/about">About Eventora</a><a href="#/contact">Contact</a></div>'
                + (showAttendees ? '<div><h5>Attendees</h5><a href="#/attendee/browse">Browse Events</a><a href="#/attendee/tickets">My Tickets</a><a href="#/attendee/registrations">My Registrations</a><a href="#/attendee/wishlist">Wishlist</a></div>' : '')
                + (showOrganizers ? '<div><h5>Organizers</h5><a href="#/organizer/dashboard">Organizer Dashboard</a><a href="#/organizer/events/create">Create Event</a><a href="#/organizer/events">Manage Events</a><a href="#/organizer/analytics">Analytics</a></div>' : '')
                + '<div><h5>Support</h5><a href="#/faq">Help & FAQ</a><a href="#/contact">Contact</a><a href="#/privacy">Privacy Policy</a><a href="#/terms">Terms & Conditions</a></div>'
                + '</div><div class="lfoot-bot"><span>\u00a9 2026 Eventora. All rights reserved \u2014 Rowdro Mrong \u00b7 ISO 27001 Certified \u00b7 SOC 2 Type II Compliant</span><span><a href="#/login" style="color:var(--body)">Sign In</a> \u00b7 <a href="#/register" style="color:var(--body)">Register Stage</a></span></div></div></footer>';
        }
        function publicFooter() { return footerHTML(null); }
        function consoleFooter() { const u = session(); return footerHTML(u ? u.role : null); }
        let pendingConfirm = null;
        function confirmModal(o) {
            pendingConfirm = o.onOk;
            openModal('<div class="modal-h"><h3>' + o.title + '</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                + '<div class="modal-b"><p class="mut" style="margin-bottom:20px">' + o.body + '</p>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-g" data-close>Cancel</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-p') + '" data-action="confirm-yes">' + esc(o.okLabel || 'Confirm') + '</button></div></div>');
        }
        function openEndedModal() {
            openModal('<div class="modal-h"><h3>Event Ended</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                + '<div class="modal-b" style="text-align:center">'
                + '<div class="okring amb" style="width:72px;height:72px;margin:6px auto 18px">' + ic('clock', 30, 2) + '</div>'
                + '<p style="font:600 15px var(--fd);color:var(--text);margin-bottom:8px">This event has already taken place.</p>'
                + '<p class="mut" style="margin-bottom:22px">Ticket purchases are no longer available for this experience.</p>'
                + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-p" data-go="#/events">' + ic('search', 14) + ' Browse Events</button><button class="btn btn-g" data-close>Close</button></div></div>');
        }
        function toast(msg, type) {
            type = type || 'ok';
            const map = { ok: ['checkc', 'var(--green)'], info: ['info', 'var(--cyan2)'], warn: ['warn', 'var(--amber)'], err: ['x', 'var(--red)'] };
            const pair = map[type] || map.ok;
            const el = document.createElement('div'); el.className = 'toast';
            el.innerHTML = '<span style="color:' + pair[1] + ';margin-top:1px">' + ic(pair[0], 16) + '</span><span>' + msg + '</span>';
            document.getElementById('toast-root').appendChild(el);
            setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260) }, 3600);
        }
        function openModal(html, cls) { document.getElementById('modal-root').innerHTML = '<div class="modal-back"><div class="modal glass-hi ' + (cls || '') + '">' + html + '</div></div>'; document.body.classList.add('no-scroll') }
        function closeModal() { document.getElementById('modal-root').innerHTML = ''; if (!document.getElementById('pal')) document.body.classList.remove('no-scroll') }
        function closeMMenu() {
            const mm = document.getElementById('mmenu'); if (mm) mm.classList.remove('open');
            const bd = document.getElementById('mmenu-backdrop'); if (bd) bd.classList.remove('open');
            const btn = document.querySelector('.mmenu-btn'); if (btn) btn.innerHTML = ic('menu', 18);
            if (!document.getElementById('modal-root').innerHTML && !document.getElementById('pal')) document.body.classList.remove('no-scroll');
        }
        function toggleMMenu() {
            const mm = document.getElementById('mmenu'); if (!mm) return;
            if (mm.classList.contains('open')) { closeMMenu(); return }
            mm.classList.add('open');
            const bd = document.getElementById('mmenu-backdrop'); if (bd) bd.classList.add('open');
            const btn = document.querySelector('.mmenu-btn'); if (btn) btn.innerHTML = ic('x', 18);
            document.body.classList.add('no-scroll');
        }
        function qrInto(host, text) {
            host.innerHTML = '';
            try {
                const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
                const n = qr.getModuleCount(), cell = 6, quiet = 3, dim = (n + quiet * 2) * cell;
                const c = document.createElement('canvas'); c.width = c.height = dim;
                const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, dim, dim); x.fillStyle = '#0b0f19';
                for (let r = 0; r < n; r++)for (let q = 0; q < n; q++)if (qr.isDark(r, q)) x.fillRect((q + quiet) * cell, (r + quiet) * cell, cell, cell);
                c.style.cssText = 'width:196px;height:196px;border-radius:10px;display:block';
                host.appendChild(c);
            } catch (e) { host.innerHTML = '<div class="qr-fallback">QR OFFLINE<br>PASS ' + truncHash(text.slice(-20)) + '</div>' }
        }
        function downloadFile(name, content, type) {
            const b = new Blob([content], { type: type || 'text/csv' }), a = document.createElement('a');
            a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 400);
        }
        const csvEsc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
        function downloadICS(ev, reg) {
            const sd = String(ev.startDate).replace(/-/g, ''), ed = String(ev.endDate || ev.startDate).replace(/-/g, ''), doors = (ev.doors || '09:00').replace(':', '');
            const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Eventora//Glass Ticketing//EN', 'BEGIN:VEVENT', 'UID:' + reg.passId + '@eventora', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + sd + 'T' + doors + '00', 'DTEND:' + ed + 'T235900', 'SUMMARY:' + ev.title, 'LOCATION:' + ev.venue + ', ' + ev.city, 'DESCRIPTION:Eventora pass ' + reg.passId + ' \u00b7 Tier ' + reg.tierName, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
            downloadFile('eventora-' + ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics', ics, 'text/calendar');
            toast('Calendar file downloaded.', 'ok');
        }
        function clampDD(dd) {
            dd.style.left = dd.style.right = dd.style.top = dd.style.bottom = '';
            requestAnimationFrame(() => {
                const r = dd.getBoundingClientRect();
                if (r.right > innerWidth - 8 && r.width <= innerWidth - 16) { dd.style.left = 'auto'; dd.style.right = '0' }
                else if (r.left < 8) { dd.style.right = 'auto'; dd.style.left = '0' }
                if (r.bottom > innerHeight - 8) { dd.style.top = 'auto'; dd.style.bottom = 'calc(100% + 8px)' }
            });
        }
        function topNav(active) {
            const u = session(), role = u ? u.role : null;
            let links = '';
            if (!u) { links = '<a class="nav-lnk ' + (active === 'home' ? 'act' : '') + '" href="#/">Home</a><a class="nav-lnk ' + (active === 'events' ? 'act' : '') + '" href="#/events">Events</a><a class="nav-lnk ' + (active === 'about' ? 'act' : '') + '" href="#/about">About</a><a class="nav-lnk ' + (active === 'contact' ? 'act' : '') + '" href="#/contact">Contact</a>' }
            else if (role === 'attendee') { links = '<a class="nav-lnk ' + (active === 'adash' ? 'act' : '') + '" href="#/attendee/dashboard">Dashboard</a><a class="nav-lnk ' + (active === 'events' ? 'act' : '') + '" href="#/attendee/browse">Browse</a><a class="nav-lnk ' + (active === 'atickets' ? 'act' : '') + '" href="#/attendee/tickets">My Tickets</a><a class="nav-lnk ' + (active === 'awish' ? 'act' : '') + '" href="#/attendee/wishlist">Wishlist</a>' }
            else if (role === 'admin') { links = '<a class="nav-lnk ' + (active === 'admin' ? 'act' : '') + '" href="#/admin">Command Center</a><a class="nav-lnk" href="#/admin/stages">Stages</a><a class="nav-lnk" href="#/admin/telemetry">Telemetry</a><a class="nav-lnk" href="#/admin/guests">Audiences</a>' }
            else { links = '<a class="nav-lnk ' + (active === 'odash' ? 'act' : '') + '" href="#/organizer/dashboard">Dashboard</a><a class="nav-lnk ' + (active === 'oevents' ? 'act' : '') + '" href="#/organizer/events">My Events</a><a class="nav-lnk ' + (active === 'ocreate' ? 'act' : '') + '" href="#/organizer/events/create">Create</a><a class="nav-lnk ' + (active === 'oanalytics' ? 'act' : '') + '" href="#/organizer/analytics">Analytics</a>' }
            let syspill = '';
            if (role === 'admin') syspill = '<span class="syspill"><span class="dot g pulse"></span>All Systems Operational</span>';
            else if (role === 'organizer') syspill = '<span class="syspill"><span class="dot g pulse"></span>Node: Global \u00b7 Online</span>';
            const unread = unreadCount();
            let rightSide;
            if (u) {
                rightSide = '<div class="dd-wrap"><button class="icon-btn" data-dd aria-label="Notifications">' + ic('bell', 17) + (unread ? '<span class="bdg">' + unread + '</span>' : '') + '</button><div class="dd" style="width:min(320px,calc(100vw - 24px))">' + notifDD() + '</div></div>'
                    + '<div class="dd-wrap"><button class="ubeat" data-dd><span class="uinfo"><span class="nm">' + esc(u.name) + '</span><span class="rl">' + esc(u.title || u.role) + '</span></span>' + (u.avatarSeed ? '<img class="avatar" src="' + esc(u.avatarSeed) + '" alt="">' : '<span class="avatar avx">' + initials(u.name) + '</span>') + '</button>'
                    + '<div class="dd"><div class="dd-h">' + esc(u.email) + ' \u00b7 ' + u.role + '</div>'
                    + '<button class="dd-it" data-go="' + ROLE_HOME[u.role] + '">' + ic('grid', 15) + ' ' + (u.role === 'admin' ? 'Command Center' : u.role === 'organizer' ? 'Organizer Dashboard' : 'My Dashboard') + '</button>'
                    + (u.role === 'attendee' ? '<button class="dd-it" data-go="#/attendee/registrations">' + ic('cal', 15) + ' My Registrations</button><button class="dd-it" data-go="#/attendee/tickets">' + ic('ticket', 15) + ' My Tickets</button><button class="dd-it" data-go="#/attendee/wishlist">' + ic('heart', 15) + ' Wishlist</button>' : '')
                    + (u.role === 'organizer' ? '<button class="dd-it" data-go="#/organizer/events">' + ic('layers', 15) + ' My Events</button><button class="dd-it" data-go="#/organizer/analytics">' + ic('activity', 15) + ' Analytics</button><button class="dd-it" data-go="#/organizer/attendees">' + ic('users', 15) + ' Attendees</button>' : '')
                    + '<button class="dd-it" data-go="#/notifications">' + ic('bell', 15) + ' Notifications</button><button class="dd-it" data-go="#/profile">' + ic('user', 15) + ' Profile & Settings</button>'
                    + '<div class="dd-sep"></div><button class="dd-it danger" data-action="signout">' + ic('out', 15) + ' Sign Out</button></div></div>'
                    + '<button class="icon-btn mmenu-btn" data-action="mobile-nav" aria-label="Menu">' + ic('menu', 18) + '</button>';
            } else {
                rightSide = '<a class="btn btn-g sm" href="#/login">Sign In</a><a class="btn btn-p sm" href="#/register">Get Started</a><button class="icon-btn mmenu-btn" data-action="mobile-nav" aria-label="Menu">' + ic('menu', 18) + '</button>';
            }
            const mmenu = !u ? '<a href="#/">Home</a><a href="#/events">Events</a><a href="#/about">About</a><a href="#/contact">Contact</a><a href="#/faq">Help & FAQ</a><a href="#/login">Sign In</a><a href="#/register">Get Started</a>'
                : (role === 'attendee' ? '<a href="#/attendee/dashboard">Dashboard</a><a href="#/attendee/browse">Browse Events</a><a href="#/attendee/tickets">My Tickets</a><a href="#/attendee/registrations">My Registrations</a><a href="#/attendee/wishlist">Wishlist</a><a href="#/notifications">Notifications</a><a href="#/profile">Profile</a>'
                    : role === 'organizer' ? '<a href="#/organizer/dashboard">Dashboard</a><a href="#/organizer/events">My Events</a><a href="#/organizer/events/create">Create Event</a><a href="#/organizer/attendees">Attendees</a><a href="#/organizer/analytics">Analytics</a><a href="#/notifications">Notifications</a><a href="#/profile">Profile</a>'
                        : '<a href="#/admin">Command Center</a><a href="#/admin/stages">Stages</a><a href="#/admin/guests">Guest Flow</a><a href="#/admin/telemetry">Telemetry</a><a href="#/admin/settings">Settings</a>');
            return '<header class="' + (u ? 'cnav' : 'pnav') + '"><div class="nav-in">' + brandHTML(34) + (role === 'admin' ? '<span class="brand-pill">Superadmin</span>' : '')
                + '<button class="search-pill" data-action="open-palette" aria-label="Search">' + ic('search', 15) + '<span>Global telemetry search</span><kbd>\u2318K</kbd></button>'
                + '<nav class="nav-links">' + links + '</nav><div class="nav-right">' + syspill + rightSide + '</div></div>'
                + '<div class="mmenu-backdrop" id="mmenu-backdrop" data-close="mmenu"></div>'
                + '<div class="mmenu" id="mmenu"><div class="mmenu-head"><span class="mmenu-title">Menu</span><button class="icon-btn" data-close="mmenu" aria-label="Close menu">' + ic('x', 18) + '</button></div><div class="mmenu-links">' + mmenu + '</div></div></header>';
        }
        function notifDD() {
            const list = myNotifs().slice(0, 5);
            if (!list.length) return '<div class="pal-empty">No notifications yet.</div>';
            const ti = { ticket: ['ticket', 'var(--green)', 'rgba(52,211,153,.12)'], sale: ['dollar', 'var(--cyan2)', 'rgba(6,182,212,.12)'], alert: ['warn', 'var(--amber)', 'rgba(251,191,36,.1)'], system: ['info', '#a5b4fc', 'rgba(99,102,241,.12)'] };
            return '<div class="dd-h" style="display:flex;justify-content:space-between;align-items:center">Notifications<button class="dd-it" style="width:auto;padding:2px 8px;font-size:11px;color:var(--cyan2)" data-action="notif-all">Mark all read</button></div>'
                + list.map(n => {
                    const t = ti[n.type] || ti.system;
                    return '<button class="dd-it" style="align-items:flex-start" data-action="notif-open" data-id="' + n.id + '"><span class="ni" style="width:30px;height:30px;color:' + t[1] + ';background:' + t[2] + '">' + ic(t[0], 14) + '</span>'
                        + '<span style="flex:1;min-width:0"><b style="font:600 12.5px var(--fd);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(n.title) + '</b><span class="small mut" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(n.body) + '</span></span>'
                        + (!n.read ? '<span class="dot v" style="margin-top:5px"></span>' : '') + '</button>'
                }).join('')
                + '<div class="dd-sep"></div><button class="dd-it" data-go="#/notifications" style="color:var(--cyan2)">' + ic('bell', 14) + ' View all notifications</button>';
        }
        function adminSide(active) {
            const L = (k, href, icon, label) => '<a class="aside-lnk ' + (active === k ? 'act' : '') + '" href="' + href + '">' + ic(icon, 17) + '<span>' + label + '</span></a>';
            return '<aside class="admin-side"><div class="aside-brand"><span class="at">' + ic('radio', 18) + '</span><div><b>Eventora OS</b><div><span>Global Summit v4.2</span></div></div></div>'
                + '<a class="btn btn-p w100" href="#/organizer/events/create" style="margin-bottom:10px">' + ic('plus', 15) + ' New Run-of-Show</a>'
                + L('cc', '#/admin', 'grid', 'Command Center') + L('stages', '#/admin/stages', 'radio', 'Live Stages') + L('guests', '#/admin/guests', 'users', 'Guest Flow') + L('tele', '#/admin/telemetry', 'activity', 'Telemetry') + L('settings', '#/admin/settings', 'settings', 'Settings')
                + '<div class="aside-sep" style="margin-top:auto"></div>'
                + '<a class="aside-lnk" href="#/faq">' + ic('help', 17) + '<span>Support Hub</span></a>'
                + '<button class="aside-lnk" data-action="sys-status">' + ic('activity', 17) + '<span>System Status</span></button></aside>';
        }
        const afterHooks = []; const after = fn => afterHooks.push(fn);
        let timers = [], RENDER_SAME = false, lastRenderedHash = null, pendingScroll = null, AUTH_FLOW_BUSY = false, PW_RECOVERY_READY = false;
        /* True while a fresh OAuth/magic-link/recovery redirect is still being resolved.
           render() consults THIS flag, not the live URL hash \u2014 Supabase's SDK silently
           strips the token bundle out of the hash via history.replaceState once it has
           parsed it, and that does NOT fire a hashchange event, so re-testing the current
           hash at redirect time is unreliable and can leave the user stranded. */
        let AUTH_CALLBACK_PENDING = false;
        let DS = { eventId: null, q: '', tier: 'all', status: 'all', page: 1, per: 10, sel: {} };
        let EX = { q: '', cat: 'all', hub: 'all', sort: 'soon' };
        let CO = { tierId: null, qty: 1, pay: 'bkash' };
        let W = null, wizSaveAt = Date.now();
        let HOME_HUB = 'all', NF = 'all', TK_TAB = 'upcoming';
        let ROS_EV = null;
        const emptyState = (icon, t, p, href, cta) => '<div class="glass empty"><span class="ei">' + ic(icon, 22) + '</span><b>' + t + '</b><p>' + p + '</p>' + (href ? '<a class="btn btn-p" href="' + href + '">' + cta + '</a>' : '') + '</div>';
        function mqSetHTML(mq) {
            return '<div class="mq-set">' + mq.map(e => '<a class="mq-card" href="#/event/' + e.id + '"><span class="dot v"></span>' + esc(e.title) + '<span class="d">' + fmtDate(e.startDate) + '</span></a>').join('') + '<a class="mq-card" href="#/events" style="border-color:rgba(99,102,241,.5);color:#c7d2fe">Past Experiences ' + ic('arrR', 13) + '</a></div>';
        }
        function fitMarquee() {
            $$('.marq').forEach(m => {
                const tr = m.querySelector('.marq-in'); if (!tr) return;
                const set = tr.querySelector('.mq-set'); if (!set || !set.children.length) return;
                const sw = set.offsetWidth || 1;
                let need = Math.max(2, Math.ceil((m.clientWidth + sw) / sw) + 1);
                if (need % 2) need++;
                let cur = tr.querySelectorAll('.mq-set').length;
                while (cur < need) { const c = set.cloneNode(true); c.setAttribute('aria-hidden', 'true'); tr.appendChild(c); cur++ }
                tr.style.animationDuration = Math.max(24, Math.round((tr.scrollWidth / 2) / 80)) + 's';
            });
        }
        window.__evPart1 = true;

        function LandingView() {
            const u = session();
            if (u) { location.hash = homeFor(u); return '' }
            const live = db.events.filter(e => evLive(e)).length;
            const active = publicEvents().filter(e => !evEnded(e));
            const feats = active.filter(e => HOME_HUB === 'all' || e.hub === HOME_HUB).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.startDate.localeCompare(b.startDate)).slice(0, 4);
            const gmv = db.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0);
            const passVol = db.registrations.length;
            const heroEv = feats[0] || active[0] || null;
            const heroRegs = heroEv ? evRegs(heroEv.id).length : 0;
            const heroPct = heroEv && heroEv.capacity ? Math.round(heroRegs / heroEv.capacity * 100) : 0;
            const london = db.events.find(e => e.title === 'London Sonic Arena' && !evEnded(e));
            const checkedInTotal = db.registrations.filter(r => r.status === 'checked_in').length;
            const mq = active.slice(0, 8);
            const verticals = [['tech-ai', 'cpu', '#818cf8', '128 Events'], ['music', 'music', '#f472b6', '96 Events'], ['business', 'brief', '#38bdf8', '48 Events'], ['creative', 'palette', '#fbbf24', '72 Events'], ['esports', 'gamepad', '#a78bfa', '56 Events'], ['wellness', 'heart', '#34d399', '34 Events']];
            const tsts = [['Ventra transmitted our 15,000-person summit without a single queue anomaly. The NFC VIP authentication is genuinely in a class of its own.', 'Isabella Ferreira', 'Production Director, Global Tech Summit', 'isabellaf'], ['The dynamic QR pass validation cadence eliminated organized touting at our last festival. We have never felt safer running a front gate.', 'Rafael Barbosa', 'Festival Director, PULSE LIVE', 'rafaelb'], ['The zero-paradigm gate check-in gives our VIP attendees a truly seamless arrival. We are never going back to paper doorways.', 'Sarah Chen', 'Head of Experiences, Solara Xpanse', 'sarahchenthird']];
            const featCards = [['edit', 'Curate & Architect', 'Design multi-tier arenas with precise tiered seating charts, VIP gated zones, and zero-friction attendee flows that thrive under peak demand.', [['Seating Engine', 'Dynamic'], ['VIP Zones', 'Gated']]], ['qr', 'Glass Ticketing & Dynamic QR', 'Cryptographically sealed, rotating QR hashes deter bot traffic and scalping. Each pass is tied to a single attendee with instant revocation.', [['QR Rotation', '15s Cipher'], ['ECDSA', '256-bit']]], ['radio', 'Telemetry & Gate Triage', 'Process 800+ admissions per minute with zero-latency turnstiles. Route live congestion cues to staging zones for instant operational response.', [['Ingest Latency', '0.14s Avg'], ['Throughput', '800+/min']]]];
            return (db.meta.maintenance ? '<div class="banner">' + ic('warn', 13) + ' Scheduled mesh maintenance window \u2014 ticketing remains fully operational.</div>' : '')
                + topNav('home')
                + '<section class="hero-sec"><div class="wrap hero-in"><div class="hero-copy">'
                + '<h1 class="rise" style="--d:1">Orchestrate Unforgettable <span class="grad-text">Experiences</span> in Pure Glass Fidelity</h1>'
                + '<p class="sub rise" style="--d:2">Eventora gives producers of high-stakes summits, immersive music festivals and global arena broadcasts a single operating system \u2014 from the first ticket sold to the final gate telemetry.</p>'
                + '<div class="hero-cta rise" style="--d:3"><a class="btn btn-p lg" href="#/events">' + ic('search', 16) + ' Explore Events</a><a class="btn btn-g lg" href="#/register?role=organizer">' + ic('spark', 16) + ' Register as Organizer</a></div>'
                + '<div class="hero-trust rise" style="--d:4"><div><b class="tnum">500+</b><span>Events Hosted</span></div><div><b class="tnum" style="color:var(--green)">99.99%</b><span>Live Uptime</span></div><div><b>' + ic('qr', 19) + '</b><span>Dynamic QR & NFC</span></div><div><b>' + ic('shield', 19) + '</b><span>Zero-Trust Gates</span></div></div>'
                + '</div><div class="hero-stage rise" style="--d:2">'
                + (heroEv ? '<div class="glass-hi stage-main"><div class="hv-top">' + statePill(heroEv) + '<span class="pill pill-vip">VIP ' + Math.max(heroPct, 62) + '% Sold</span><span class="mono">REAL-TIME INVENTORY</span></div>'
                    + '<a class="hv-card" href="#/event/' + heroEv.id + '"><img src="' + coverOf(heroEv) + '" alt="' + esc(heroEv.title) + '"><div class="ovl"></div><div class="cnt">'
                    + '<span class="pill pill-live"><span class="dot g pulse"></span>' + (evLive(heroEv) ? 'Live Now' : 'On Sale') + ' \u00b7 ' + datePill(heroEv.startDate, heroEv.endDate) + '</span>'
                    + '<h4>' + esc(heroEv.title) + ' \u00b7 Quantum Horizons</h4><p>' + fmtN(heroRegs) + ' of ' + fmtN(heroEv.capacity) + ' physical delegates confirmed. 140,000+ synchronized hybrid viewers across 4K multicast relays.</p></div></a>'
                    + (london ? '<div class="hv-row"><span class="dot g pulse"></span><div><div class="t">LONDON SONIC ARENA</div><div class="s">The O2 Meridian Complex \u00b7 ' + fmtDate(london.startDate) + '</div></div><a class="btn btn-p" href="#/event/' + london.id + '">Claim VIP Pass</a></div>' : '') + '</div>'
                    + '<div class="glass float-card fc1"><span class="fc-ic" style="color:var(--green)">' + ic('users', 16) + '</span><div class="fc-t"><b class="tnum">' + fmtN(checkedInTotal) + '</b><span class="small mut">Checked-in across the live mesh</span></div></div>'
                    + '<div class="glass float-card fc2"><span class="fc-ic" style="color:var(--cyan2)">' + ic('ticket', 16) + '</span><div class="fc-t"><b class="tnum">' + fmtN(passVol) + '</b><span class="small mut">Passes issued on this node</span></div></div>'
                    : '<div class="glass-hi stage-main"><div class="empty"><b>No live events yet</b><p>Publish your first arena from the wizard.</p><a class="btn btn-p" href="#/register?role=organizer">Create Event</a></div></div>')
                + '</div></div>'
                + (mq.length ? '<div class="wrap"><div class="marq"><div class="marq-in">' + mqSetHTML(mq) + mqSetHTML(mq) + '</div></div></div>' : '')
                + '</section>'
                + '<section class="land-sec wrap" id="verticals"><div class="sec-h"><span class="eyebrow">' + ic('globe', 13) + ' Curated Spheres</span><h2>Explore Premium Verticals</h2><p>From main-stage stadium festivals to confidential executive conclaves, tailor your arena.</p></div>'
                + '<div class="vgrid">' + verticals.map(v => '<a class="glass vcard" href="#/events?cat=' + v[0] + '"><span class="vt" style="color:' + v[2] + ';background:' + v[2] + '14;border-color:' + v[2] + '55">' + ic(v[1], 19) + '</span><b>' + esc(catOf(v[0]).name) + '</b><span>' + v[3] + '</span></a>').join('') + '</div></section>'
                + '<section class="land-sec wrap" style="padding-top:10px"><div class="sec-h row"><div><span class="eyebrow">' + ic('cal', 13) + ' Prime Chronology</span><h2>Featured & Upcoming Summits</h2></div>'
                + '<div style="display:flex;gap:8px;flex-wrap:wrap">' + [['all', 'All Venues'], ['dhaka', 'Dhaka HQ'], ['global', 'Global Hubs']].map(h => '<button class="chip-f ' + (HOME_HUB === h[0] ? 'act' : '') + '" data-action="home-hub" data-h="' + h[0] + '">' + h[1] + '</button>').join('') + '</div></div>'
                + '<div class="ev-grid">' + feats.map(eventCard).join('') + (feats.length ? '' : '<div class="glass empty" style="grid-column:1/-1"><b>No summits in this hub yet</b><p>Switch back to All Venues.</p></div>') + '</div>'
                + '<div style="text-align:center;margin-top:26px"><a class="btn btn-g" href="#/events">View All Events ' + ic('arrR', 15) + '</a></div></section>'
                + '<section class="land-sec wrap" id="how"><div class="sec-h center" style="margin:0 auto 40px"><span class="eyebrow">' + ic('layers', 13) + ' Zero-Friction Architecture</span><h2>How Eventora Orchestrates the Arena</h2><p>Engineered for absolute operational reliability, from first ticket sale dash to post-event telemetry ingestion.</p></div>'
                + '<div class="feat3">' + featCards.map((f, x) => '<div class="glass fcard"><span class="bignum">0' + (x + 1) + '</span><span class="ft">' + ic(f[0], 20) + '</span><h3>' + f[1] + '</h3><p>' + f[2] + '</p>' + f[3].map(s => '<div class="fstat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('') + '</div>').join('') + '</div></section>'
                + '<section class="land-sec wrap" style="padding-top:0"><div class="matrix">'
                + '<div class="row-b"><div><span class="eyebrow">' + ic('activity', 13) + ' Live Orchestration Telemetry</span><h2 class="h2-matrix" style="margin-top:8px">Global Performance Matrix</h2></div><span class="pill pill-green"><span class="dot g pulse"></span>Live Network</span></div>'
                + '<div class="mx-grid">'
                + '<div><b class="tnum grad-text-c">1.4M</b><span class="lbl">Attendees Processed</span><span class="cap"><span class="up">\u25b2 112% MoM</span> \u00b7 network-wide brand figure across all arenas</span></div>'
                + '<div><b class="tnum">99.98%</b><span class="lbl">On-Site Success</span><span class="cap"><span class="up">99.99% Uptime</span> \u00b7 zero gate-failures across all stadiums</span></div>'
                + '<div><b class="tnum grad-text-c">480+</b><span class="lbl">Enterprise Partners</span><span class="cap">Stadiums to tech expos, music giants, and festival promoters</span></div>'
                + '<div><b class="tnum">' + CUR + '1,000Cr+</b><span class="lbl">Ticketing Volume</span><span class="cap">Network-wide, settled in ' + CUR + ' BDT <span class="up">\u00b7 ' + shortMoney(gmv) + ' settled on this node</span></span></div></div>'
                + '<div class="logos"><span>\u25c6 AETHER DYNAMICS</span><span>\u25c6 GAMBIT GLOBAL</span><span>\u25c6 PULSE LIVE</span><span>\u25c6 LUXE EXP</span><span>\u25c6 DHAKA AUDIO</span></div>'
                + '<p class="small mut" style="text-align:center;margin-top:8px">Local mesh snapshot: ' + fmtN(passVol) + ' passes issued \u00b7 ' + shortMoney(gmv) + ' settled</p></div></section>'
                + '<section class="land-sec wrap" id="voices" style="padding-top:20px"><div class="sec-h center" style="margin:0 auto 40px"><span class="eyebrow">' + ic('star', 13) + ' Voices from the Arena</span><h2>Producers Run on Eventora</h2></div>'
                + '<div class="tgrid">' + tsts.map(t => '<div class="glass tcard"><div class="stars">' + ic('star', 14, 1).repeat(5) + '</div><p>\u201c' + t[0] + '\u201d</p><div class="who"><img class="avatar" src="' + pic(t[3], 80, 80) + '" alt=""><div><b>' + t[1] + '</b><span>' + t[2] + '</span></div></div></div>').join('') + '</div></section>'
                + '<section class="wrap" style="padding-bottom:20px"><div class="cta-band">'
                + '<span class="eyebrow">' + ic('spark', 13) + ' Ready to Orchestrate Ambient Excellence</span>'
                + '<h2>Ready to Orchestrate at the Highest Tier of Production?</h2>'
                + '<p>Get integrated with Eventora OS in minutes. Access invitation-only gate telemetry, dynamic capacity escalation, and our curated production partner directory.</p>'
                + '<div id="cta-zone"><form data-form="request-access"><div class="cta-form"><input class="inp" id="cta-email" type="email" placeholder="Enter access email address\u2026" required><button class="btn btn-p" type="submit">Request Access</button></div></form>'
                + '<p class="small mut" style="margin-top:12px">' + ic('lock', 12) + ' No lock-in contracts \u00b7 SOC 2 Type II Compliant</p></div></div></section>'
                + publicFooter();
        }
        function ExploreView(q) {
            EX.q = q.get('q') || ''; EX.cat = q.get('cat') || 'all'; EX.hub = q.get('hub') || 'all'; EX.sort = q.get('sort') || 'soon';
            const u = session(), base = (u && u.role === 'attendee') ? '#/attendee/browse' : '#/events';
            after(() => {
                const qi = document.getElementById('ex-q'), si = document.getElementById('ex-sort');
                if (qi) qi.addEventListener('input', deb(e => { EX.q = e.target.value; exDraw() }, 150));
                if (si) si.addEventListener('change', e => { EX.sort = e.target.value; exDraw() });
            });
            return topNav('events')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('search', 13) + ' Global Discovery</span><h1>' + ((u && u.role === 'attendee') ? 'Browse Events' : 'Explore Events') + '</h1>'
                + '<p class="sub">Browse every published arena on the mesh \u2014 upcoming first, with completed events kept in the archive below.</p></div>'
                + '<div class="wrap" style="padding-top:24px;padding-bottom:60px">'
                + '<div class="glass" style="padding:16px 18px;margin-bottom:22px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">'
                + '<div style="position:relative;flex:1;min-width:220px"><span class="in-ic">' + ic('search', 15) + '</span><input class="inp has-ic" id="ex-q" placeholder="Search events, venues, cities\u2026" value="' + esc(EX.q) + '"></div>'
                + '<select class="inp" id="ex-sort" style="width:190px"><option value="soon">Upcoming First</option><option value="price-asc">Price: Low \u2192 High</option><option value="price-desc">Price: High \u2192 Low</option><option value="popular">Most Registered</option></select></div>'
                + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
                + '<button class="chip-f ' + (EX.cat === 'all' ? 'act' : '') + '" data-go="' + base + (EX.hub !== 'all' ? '?hub=' + EX.hub : '') + '">All Verticals</button>'
                + db.categories.map(c => '<button class="chip-f ' + (EX.cat === c.id ? 'act' : '') + '" data-go="' + base + '?cat=' + c.id + (EX.hub !== 'all' ? '&hub=' + EX.hub : '') + '">' + ic(c.icon, 13) + ' ' + esc(c.name) + '</button>').join('') + '</div>'
                + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'
                + [['all', 'All Venues'], ['dhaka', 'Dhaka HQ'], ['global', 'Global Hubs']].map(h => '<button class="chip-f ' + (EX.hub === h[0] ? 'act' : '') + '" data-go="' + base + '?' + (EX.cat !== 'all' ? 'cat=' + EX.cat + '&' : '') + 'hub=' + h[0] + '">' + h[1] + '</button>').join('')
                + '<span class="mut small" style="margin-left:auto;align-self:center" id="ex-count"></span></div>'
                + '<div class="ev-grid" id="ex-grid"></div></div>'
                + (u ? consoleFooter() : publicFooter());
        }
        function exDraw() {
            let list = publicEvents();
            if (EX.cat !== 'all') list = list.filter(e => e.category === EX.cat);
            if (EX.hub !== 'all') list = list.filter(e => e.hub === EX.hub);
            if (EX.q) { const q = EX.q.toLowerCase(); list = list.filter(e => (e.title + ' ' + e.venue + ' ' + e.city + ' ' + e.subtitle).toLowerCase().includes(q)) }
            if (EX.sort === 'soon') list.sort((a, b) => { const ae = evEnded(a), be = evEnded(b); if (ae !== be) return ae ? 1 : -1; return ae ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate) });
            if (EX.sort === 'price-asc') list.sort((a, b) => priceFrom(a) - priceFrom(b));
            if (EX.sort === 'price-desc') list.sort((a, b) => priceFrom(b) - priceFrom(a));
            if (EX.sort === 'popular') list.sort((a, b) => evRegs(b.id).length - evRegs(a.id).length);
            const g = document.getElementById('ex-grid'); if (!g) return;
            const cnt = document.getElementById('ex-count'); if (cnt) cnt.textContent = 'Showing ' + list.length + ' event' + (list.length !== 1 ? 's' : '');
            g.innerHTML = list.map(eventCard).join('') || '<div class="glass empty" style="grid-column:1/-1"><span class="ei">' + ic('search', 22) + '</span><b>No events match your telemetry</b><p>Try clearing the search or switching verticals.</p><button class="btn btn-g" data-go="' + ((session() && session().role === 'attendee') ? '#/attendee/browse' : '#/events') + '">Clear Filters</button></div>';
        }
        function EventDetailsView(id) {
            const ev = db.events.find(e => e.id === id), u = session();
            if (!ev) return NotFound();
            const isOwner = !!u && (u.id === ev.organizerId || u.role === 'admin');
            if ((ev.status === 'draft' && !isOwner) || (ev.status === 'cancelled' && !isOwner)) return NotFound();
            const c = catOf(ev.category), tiers = evTiers(ev), org = userById(ev.organizerId);
            const sched = evSchedule(ev.id), spk = evSpeakers(ev.id);
            const days = [...new Set(sched.map(s => s.day))].sort();
            const fav = isFav(ev.id);
            const ended = evEnded(ev);
            const related = publicEvents().filter(e => e.id !== ev.id && e.category === ev.category && !evEnded(e)).slice(0, 3);
            return topNav(u && u.role === 'attendee' ? 'events' : '')
                + '<div class="dhero"><img src="' + coverOf(ev) + '" alt=""><div class="ovl"></div>'
                + '<div class="wrap"><div class="badge-row" style="margin-bottom:6px">'
                + '<span class="pill" style="background:' + c.color + '18;border-color:' + c.color + '55;color:' + c.color + '">' + ic(c.icon, 12) + ' ' + esc(c.name) + '</span>'
                + statePill(ev)
                + (ev.deliveryMode !== 'in-person' ? '<span class="pill pill-mut">' + ic('tv', 12) + ' ' + (ev.deliveryMode === 'hybrid' ? 'Hybrid 4K Simulcast' : 'Pure Virtual') + '</span>' : '') + '</div>'
                + '<h1>' + esc(ev.title) + '</h1><p style="color:var(--body);max-width:640px">' + esc(ev.subtitle) + '</p>'
                + '<div class="meta"><span>' + ic('cal', 15) + ' ' + fmtRange(ev.startDate, ev.endDate) + '</span><span>' + ic('clock', 15) + ' Doors ' + esc(ev.doors) + ' \u00b7 ' + esc(ev.timezone) + '</span><span>' + ic('pin', 15) + ' ' + esc(ev.venue) + ', ' + esc(ev.city) + '</span><span>' + ic('users', 15) + ' ' + fmtN(ev.capacity) + ' capacity</span></div></div></div>'
                + '<div class="wrap dbody"><div>'
                + (ended ? '<div class="banner red" style="border-radius:10px;margin-bottom:20px">' + ic('clock', 13) + ' This event has already taken place. Ticket purchases are no longer available.</div>' : '')
                + '<div class="dsec"><h2>About this Experience</h2><div class="prose">' + esc(ev.description || ev.subtitle) + '</div></div>'
                + (sched.length ? '<div class="dsec"><h2>Run of Show</h2>' + days.map(day => '<div class="sched-day"><b>Day ' + day + ' \u2014 ' + fmtDate(day === 1 ? ev.startDate : ev.endDate) + '</b><div class="glass">' + sched.filter(s => s.day === day).map(s => '<div class="sitem"><span class="tm">' + esc(s.time) + '</span><div><div class="tt">' + esc(s.title) + '</div><div class="lc">' + ic('pin', 12) + ' ' + esc(s.location) + '</div></div></div>').join('') + '</div></div>').join('') + '</div>' : '')
                + (spk.length ? '<div class="dsec"><h2>Featured Voices</h2><div class="spk-grid">' + spk.map(s => '<div class="glass spk"><img class="avatar" src="' + s.seed + '" alt="" style="width:44px;height:44px;border-radius:12px"><div><b>' + esc(s.name) + '</b><span>' + esc(s.role) + ' \u00b7 ' + esc(s.org) + '</span></div></div>').join('') + '</div></div>' : '')
                + '<div class="dsec"><h2>Ticket Tiers</h2>' + (tiers.length ? '<div class="tiercards">' + tiers.map(t => {
                    const left = t.quantity - soldOf(t.id);
                    return '<div class="glass tierc ' + ((left <= 0 || ended) ? 'soldout' : '') + '"><div class="ti"><div class="tn">' + (t.vip ? ic('crown', 15) : ic('ticket', 15)) + ' ' + esc(t.name) + ' ' + (t.vip ? '<span class="pill pill-vip" style="font-size:9px;padding:3px 8px">VIP</span>' : '') + '</div><div class="tp">' + esc(t.perks || 'Standard access') + '</div>'
                        + '<div class="pbar vio mt16" style="max-width:280px"><i style="width:' + Math.min(100, Math.round(soldOf(t.id) / t.quantity * 100)) + '%"></i></div>'
                        + '<div class="small mut mt16">' + fmtN(soldOf(t.id)) + ' claimed \u00b7 ' + (ended ? 'sales closed' : left > 0 ? fmtN(left) + ' left' : 'Sold out') + '</div></div>'
                        + '<div><div class="pr tnum">' + (t.price === 0 ? 'Free' : fmtMoney(t.price, evCur(ev))) + '</div>'
                        + (ended ? '<button class="btn btn-g" style="margin-top:10px" disabled>' + ic('ban', 14) + ' Event Ended</button>'
                            : left <= 0 ? '<button class="btn btn-g" style="margin-top:10px" disabled>Sold Out</button>'
                                : '<button class="btn btn-p" style="margin-top:10px" data-action="checkout" data-id="' + ev.id + '" data-tier="' + t.id + '">' + (t.price === 0 ? 'RSVP Free' : 'Get Tickets') + '</button>') + '</div></div>'
                }).join('') + '</div>' : '<p class="mut">Tickets for this experience are being configured by the organizer.</p>') + '</div>'
                + (related.length ? '<div class="dsec"><h2>More in ' + esc(c.name) + '</h2><div class="ev-grid cols3">' + related.map(eventCard).join('') + '</div></div>' : '')
                + '</div><div><div class="glass side-card">'
                + '<div class="row-b" style="margin-bottom:6px"><span class="eyebrow">' + ic('ticket', 13) + ' Entry Pass</span>'
                + '<button class="icon-btn ' + (fav ? 'fav-on' : '') + '" style="width:34px;height:34px" data-action="fav" data-id="' + ev.id + '" aria-label="' + (fav ? 'Remove from wishlist' : 'Add to wishlist') + '">' + ic('heart', 16, fav ? 1 : 2) + '</button></div>'
                + '<div class="fr"><span>' + (ended ? 'Status' : 'Starting from') + '</span><b class="tnum" style="color:' + (ended ? 'var(--mut)' : 'var(--cyan2)') + '">' + (ended ? 'Event Ended' : priceFrom(ev) === 0 ? 'Free' : fmtT(priceFrom(ev), evCur(ev))) + '</b></div>'
                + '<div class="fr"><span>Date</span><b>' + fmtRange(ev.startDate, ev.endDate) + '</b></div>'
                + '<div class="fr"><span>Venue</span><b>' + esc(ev.city) + '</b></div>'
                + '<div class="fr" style="border:none"><span>Confirmed attendees</span><b class="tnum">' + fmtN(evRegs(ev.id).length) + '</b></div>'
                + (ended ? '<button class="btn btn-g w100 lg mt16" disabled>' + ic('ban', 16) + ' Event Ended</button>'
                    : '<button class="btn btn-p w100 lg mt16" data-action="checkout" data-id="' + ev.id + '">' + ic('zap', 16) + ' ' + (priceFrom(ev) === 0 ? 'RSVP \u2014 Free' : 'Get Tickets') + '</button>')
                + '<button class="btn btn-g w100 mt16" data-action="copy-link" data-id="' + ev.id + '">' + ic('link', 15) + ' Copy Event Link</button>'
                + '<div class="orgcard">' + (org ? (org.avatarSeed ? '<img class="avatar" src="' + esc(org.avatarSeed) + '" alt="">' : '<span class="avatar avx">' + initials(org.name) + '</span>') + '<div style="flex:1"><b style="font:600 13px var(--fd)">' + esc(org.name) + '</b><div class="small mut">' + esc(org.org || 'Eventora Organizer') + '</div></div><a class="btn btn-g sm" href="#/events">Events</a>' : '') + '</div>'
                + '<div class="small mut mt16" style="display:flex;gap:14px;flex-wrap:wrap"><span>' + ic('shield', 13) + ' 256-bit ECDSA</span><span>' + ic('refresh', 13) + ' Rotating QR</span></div>'
                + '</div></div></div>' + (u ? consoleFooter() : publicFooter());
        }
        function AboutView() {
            return topNav('about')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('globe', 13) + ' About Eventora</span><h1>One Operating System for Live Experience</h1>'
                + '<p class="sub">Eventora builds next-generation experience infrastructure for the global events industry \u2014 from stadium festivals to executive conclaves.</p></div>'
                + '<div class="wrap" style="padding-bottom:30px">'
                + '<div class="mgrid mb24">'
                + metricTile({ label: 'Founded', c: '#38bdf8', icon: 'cal', value: '2021', cap: 'Dhaka \u00b7 Tokyo \u00b7 London \u00b7 Berlin' })
                + metricTile({ label: 'Events Powered', c: '#a5b4fc', icon: 'layers', value: '500+', cap: 'Across 6 premium verticals' })
                + metricTile({ label: 'Passes Sealed', c: '#f0abfc', icon: 'qr', value: fmtN(db.registrations.length), cap: 'On this node \u2014 every one cryptographically unique' })
                + metricTile({ label: 'Uptime', c: '#38bdf8', icon: 'activity', value: '99.99%', cap: 'Rolling 12-month gate mesh SLA', bar: 99.9, bc: 'grn' })
                + '</div>'
                + '<div class="grid2 mb24"><div class="glass" style="padding:26px"><span class="eyebrow">' + ic('spark', 13) + ' Our Philosophy</span>'
                + '<h3 style="font-size:20px;margin:12px 0 10px">Hyper-Refined Glassmorphism over a Cosmic Void</h3>'
                + '<p class="mut" style="line-height:1.8">Interfaces are not flat planes; they are illuminated multi-layered optical lenses suspended over deep spatial fields. Specular light leaks, refractive edge highlights and crisp geometric legibility keep high information density effortless to scan. We believe production software should feel like the production itself.</p></div>'
                + '<div class="glass" style="padding:26px"><span class="eyebrow">' + ic('shield', 13) + ' Trust & Compliance</span>'
                + '<h3 style="font-size:20px;margin:12px 0 10px">Zero-Trust by Default</h3>'
                + '<p class="mut" style="line-height:1.8">Every pass is sealed with rotating 256-bit ECDSA ciphers. Biometric templates never leave the venue edge node. Settlement runs on transparent T+0 to T+2 windows with automated dispute buffers, settled in ' + CUR + ' BDT. ISO 27001 certified \u00b7 SOC 2 Type II compliant.</p></div></div>'
                + '<div class="glass" style="padding:26px"><span class="eyebrow">' + ic('layers', 13) + ' The Stack</span>'
                + '<div class="grid3 mt24">'
                + [['zap', 'Curation Engine', 'Multi-tier arenas, gated VIP zones and collision-free seating.'], ['qr', 'Glass Ticketing', 'Rotating QR, NFC encircle passes and instant revocation.'], ['radio', 'Gate Telemetry', '800+ admissions/min, live congestion triage, zero-latency RFID.']].map(f => '<div><span style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.35);color:#a5b4fc;margin-bottom:14px">' + ic(f[0], 20) + '</span><b style="font:700 15px var(--fd)">' + f[1] + '</b><p class="small mut mt8">' + f[2] + '</p></div>').join('')
                + '</div></div></div>' + publicFooter();
        }
        function ContactView() {
            return topNav('contact')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('mail', 13) + ' Contact</span><h1>Talk to the Mesh</h1>'
                + '<p class="sub">Sales, support, or press \u2014 every message lands in the operations queue with a median first response of 2h 40m.</p></div>'
                + '<div class="wrap grid2" style="padding-bottom:50px;align-items:start">'
                + '<div class="glass" style="padding:26px">'
                + '<form data-form="contact">'
                + '<div class="grid2"><div class="field"><label>Your Name</label><input class="inp" name="name" required placeholder="Ayaan Rahman"></div>'
                + '<div class="field"><label>Email</label><input class="inp" name="email" type="email" required placeholder="you@arena.io"></div></div>'
                + '<div class="field"><label>Subject</label><select class="inp" name="topic"><option>Enterprise sales</option><option>Organizer support</option><option>Attendee support</option><option>Press & partnerships</option></select></div>'
                + '<div class="field"><label>Message</label><textarea class="inp" name="msg" required placeholder="Tell us about your arena\u2026"></textarea></div>'
                + '<button class="btn btn-p lg" type="submit">' + ic('send', 15) + ' Send Message</button>'
                + '<p class="small mut mt16">' + ic('lock', 12) + ' Messages are stored in the operations inbox on this node.</p></form></div>'
                + '<div style="display:flex;flex-direction:column;gap:20px">'
                + '<div class="glass" style="padding:22px"><b style="font:700 15px var(--fd)">Direct channels</b>'
                + '<div class="fin-row mt16"><span>' + ic('mail', 14) + ' Sales desk</span><b style="color:var(--cyan2)">rowdroofficial@gmail.com</b></div>'
                + '<div class="fin-row"><span>' + ic('help', 14) + ' Support</span><b style="color:var(--cyan2)">rowdroofficial@gmail.com</b></div>'
                + '<div class="fin-row"><span>' + ic('globe', 14) + ' HQ</span><b>Dhaka \u00b7 Gulshan Ave</b></div></div>'
                + '<div class="glass" style="padding:22px"><b style="font:700 15px var(--fd)">Response targets</b>'
                + '<div class="fin-row mt16"><span>Enterprise inquiries</span><b style="color:var(--green)">&lt; 3h</b></div>'
                + '<div class="fin-row"><span>Organizer support</span><b style="color:var(--green)">&lt; 6h</b></div>'
                + '<div class="fin-row"><span>Attendee tickets</span><b style="color:var(--green)">&lt; 24h</b></div></div></div>'
                + '</div>' + publicFooter();
        }
        function FaqView() {
            const cats = [
                ['Getting Started', [['What is Eventora?', 'Eventora is an event-management operating system: organizers publish arenas with tiered ticketing, attendees register and receive cryptographically-sealed glass passes with rotating QR codes, and every gate scan streams into live telemetry dashboards.'], ['Do I need an account to browse events?', 'No \u2014 the public catalog at Explore Events is open to everyone. You only need an account (email or Google) to RSVP, buy tickets, wishlist events, or manage your passes.'], ['Attendee vs Organizer account?', 'Attendees browse, register and hold tickets. Organizers additionally get the console: create/edit events, run-of-show builder, attendee directory with check-in and refunds, and revenue analytics. Admins oversee the platform.']]],
                ['Tickets & RSVPs', [['How do free events work?', 'Events with a 0-priced tier are true free RSVPs: checkout skips payment entirely, no platform fee is charged, and your pass is issued instantly with the same rotating-QR security as paid tickets.'], ['When do I receive my ticket?', 'Immediately after your payment is verified (or instantly for free RSVPs). Registration creates your pass, emails a confirmation, and syncs it to My Tickets with a scannable QR \u2014 the hash rotates, so a screenshot of yesterday\u2019s QR won\u2019t scan twice.'], ['Can I cancel a registration?', 'Yes, while the event is still upcoming. Open the pass in My Tickets and press Cancel \u2014 inventory is released back to the tier and the order is settled as cancelled. Passes for completed events can no longer be cancelled.'], ['What happens if an event ends?', 'The system detects the end date automatically. The event moves to \u201cEvent Ended\u201d, all purchase buttons are disabled, checkout is closed, and any pending payment for it is cancelled and never fulfilled.']]],
                ['Payments & Currency', [['Which payment methods are supported?', 'Checkout adapts to the event\u2019s currency. Events priced in \u09f3 BDT support bKash, Nagad, Rocket and Visa/Mastercard; events priced in any other currency (USD, EUR, GBP, INR and more) support Visa/Mastercard and PayPal \u2014 so attendees anywhere in the world can buy in.'], ['Is my payment verified?', 'Yes \u2014 always server-side. After the gateway redirect, Eventora verifies the transaction with the provider before confirming your order and issuing tickets. An order stays Pending until that verification succeeds.'], ['What if payment fails or is cancelled?', 'Nothing is charged and no ticket is generated. The order is marked Failed or Cancelled in your Billing & Orders history, and you can retry from checkout while tickets remain.'], ['Why do I sometimes see \u201cgateway not connected\u201d?', 'This deployment hasn\u2019t been linked to a live payment provider yet \u2014 no fake transactions are ever simulated. Once EVENTORA_CONFIG.payments is configured with the gateway\u2019s session and verification endpoints, paid checkout goes live end-to-end.']]],
                ['For Organizers', [['How do I create an event?', 'Sign in with an Organizer account and open Create Event. The 5-step wizard covers basics, branding, dates & venue, tiered pricing in the currency you choose (including free tiers), run-of-show and speakers \u2014 then publish to the live mesh. Everything autosaves as a draft.'], ['How is revenue calculated?', 'Every paid order records unit price, quantity, platform fee and total in the event\u2019s own listed currency. Dashboard and Analytics chart settled revenue per day and per event directly from the order ledger; free RSVPs add 0 but count toward attendance.'], ['Can I manage check-ins at the gate?', 'Yes \u2014 the Attendee Directory supports live search, manual check-in with gate assignment, RFID lanyard toggles, tier reassignment, refunds and a full CSV manifest export.'], ['What analytics do I get?', 'Registrations and revenue trends over time, per-event performance, tier mix, attendee distribution across categories, portfolio phase split (upcoming / live / completed) and conversion against listed capacity.']]]
            ];
            return topNav('')
                + '<div class="wrap phead"><div class="crumb"><a href="#/">Home</a>' + ic('chevR', 12) + ' <span>Help & FAQ</span></div>'
                + '<span class="eyebrow" style="margin-top:12px">' + ic('help', 13) + ' Support Center</span><h1>Help & Frequently Asked Questions</h1>'
                + '<p class="sub">Everything about ticketing, payments and security on the Eventora mesh. Still stuck? <a href="#/contact" style="color:var(--cyan2)">Contact the team</a>.</p></div>'
                + '<div class="wrap" style="padding-bottom:50px;max-width:900px">'
                + cats.map(c => '<div class="faq-cat">' + c[0] + '</div>' + c[1].map(q => '<details class="faq-item"><summary>' + q[0] + '</summary><div class="fa">' + q[1] + '</div></details>').join('')).join('')
                + '<div class="glass mt24" style="padding:24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">'
                + '<span style="color:#a5b4fc">' + ic('mail', 22) + '</span>'
                + '<div style="flex:1;min-width:200px"><b style="font:700 15px var(--fd)">Didn\u2019t find your answer?</b><p class="small mut">The operations inbox answers most tickets within 6 hours.</p></div>'
                + '<a class="btn btn-p" href="#/contact">' + ic('send', 14) + ' Contact Support</a></div>'
                + '</div>' + publicFooter();
        }
        function PrivacyView() {
            return topNav('')
                + '<div class="wrap phead"><div class="crumb"><a href="#/">Home</a>' + ic('chevR', 12) + ' <span>Privacy Policy</span></div>'
                + '<span class="eyebrow" style="margin-top:12px">' + ic('shield', 13) + ' Legal</span><h1>Privacy Policy</h1>'
                + '<p class="sub">How Eventora collects, uses and protects information across the mesh.</p></div>'
                + '<div class="wrap policy" style="padding-bottom:50px;max-width:860px">'
                + '<h3>1 \u00b7 Information We Collect</h3>'
                + '<ul><li><b>Account data</b> \u2014 name, email address, role and (for organizers) organization.</li>'
                + '<li><b>Google account data</b> \u2014 if you use Google Sign-In: your Google name, email, profile picture and a unique Google account identifier. Your Google password is never shared with Eventora.</li>'
                + '<li><b>Transaction data</b> \u2014 event registrations, ticket tiers, order amounts in the event\u2019s listed currency, payment method and settlement status. Card and wallet credentials are handled exclusively by the payment provider \u2014 Eventora never sees or stores them.</li>'
                + '<li><b>Gate telemetry</b> \u2014 anonymized check-in times and turnstile assignments used for capacity management.</li></ul>'
                + '<h3>2 \u00b7 How We Use It</h3>'
                + '<p>Collected data is used solely to operate the platform: issuing and validating passes, processing orders, showing organizers attendance analytics for their own events, sending transactional notifications, and preventing fraud and ticket scalping. We do not sell personal data, and we do not run third-party advertising trackers.</p>'
                + '<h3>3 \u00b7 Storage & Security</h3>'
                + '<p>This deployment runs on a <b>local browser mesh</b>: your session and workspace data are stored in your browser\u2019s local storage and never leave your device. Production deployments connect the identical data layer to a managed Supabase database protected by row-level security, where passes are sealed with rotating 256-bit ECDSA ciphers and all transport is encrypted. Google ID tokens and payment transactions are verified server-side before any session or order is confirmed.</p>'
                + '<h3>4 \u00b7 Cookies & Local Storage</h3>'
                + '<p>Eventora uses browser local storage only \u2014 for your session and application data. No third-party tracking cookies are loaded. Clear everything at any time via Admin \u2192 Settings \u2192 Reset Demo Data, or by clearing site data in your browser.</p>'
                + '<h3>5 \u00b7 Your Rights</h3>'
                + '<ul><li><b>Access & export</b> \u2014 your registrations, orders and tickets are visible and exportable from your dashboard at any time.</li>'
                + '<li><b>Correction</b> \u2014 edit your name, title and organization from Profile & Settings.</li>'
                + '<li><b>Deletion</b> \u2014 contact the operations desk to erase your account and associated records.</li></ul>'
                + '<h3>6 \u00b7 Contact</h3>'
                + '<p>Questions about this policy: <a href="#/contact" style="color:var(--cyan2)">rowdroofficial@gmail.com via the contact page</a>.</p>'
                + '<p class="upd">Last updated: January 2026 \u00b7 Applies to all Eventora OS nodes.</p>'
                + '</div>' + publicFooter();
        }
        function TermsView() {
            return topNav('')
                + '<div class="wrap phead"><div class="crumb"><a href="#/">Home</a>' + ic('chevR', 12) + ' <span>Terms & Conditions</span></div>'
                + '<span class="eyebrow" style="margin-top:12px">' + ic('brief', 13) + ' Legal</span><h1>Terms & Conditions</h1>'
                + '<p class="sub">The rules of the arena \u2014 for attendees, organizers and the platform.</p></div>'
                + '<div class="wrap policy" style="padding-bottom:50px;max-width:860px">'
                + '<h3>1 \u00b7 Acceptance of Terms</h3>'
                + '<p>By creating an Eventora account or registering for any event on the mesh, you agree to these terms. If you use Eventora on behalf of an organization, you confirm you are authorized to bind that organization.</p>'
                + '<h3>2 \u00b7 Accounts & Roles</h3>'
                + '<p>Accounts are role-based: <b>Attendees</b> register for events and hold passes; <b>Organizers</b> publish and operate events; <b>Admins</b> moderate the platform. You are responsible for your account details and for keeping your credentials (or linked Google identity) secure. Duplicate or fraudulent accounts are prohibited, and organizer accounts are subject to platform verification (KYC) before publishing.</p>'
                + '<h3>3 \u00b7 Events, Ticketing & Sales Windows</h3>'
                + '<p>Organizers set all tier names, prices (in the currency they choose for that event), quantities and perks. <b>Free tiers (0)</b> settle as RSVPs with no payment and no platform fee; <b>paid tiers</b> include a platform settlement fee disclosed at checkout. Ticket sales close automatically the moment an event\u2019s final date passes \u2014 the platform determines this from the event\u2019s actual dates and blocks all further purchases, checkouts and payments. A completed registration creates a named, cryptographically-sealed pass that is non-transferable until checked in. Inventory is enforced live: passes cannot be issued beyond a tier\u2019s remaining quantity.</p>'
                + '<h3>4 \u00b7 Payments, Refunds & Settlement</h3>'
                + '<p>Payments are collected in the event\u2019s own listed currency through the platform\u2019s connected payment provider. Bangladeshi-Taka-priced events support bKash, Nagad, Rocket and Visa/Mastercard; events in other currencies support Visa/Mastercard and PayPal, so attendees anywhere in the world can complete checkout. Every transaction is verified server-side with the provider before an order is marked Paid and a ticket is issued; Failed or Cancelled transactions never generate tickets. Attendees may cancel upcoming passes while sales remain open; cancelled seats return to the tier and the order is settled as cancelled. Organizers may refund any pass from their directory, which reverses the settlement and invalidates the pass at the gate. If an event ends with a payment captured but unfulfilled, the full amount is refunded. Settlement windows are T+0 to T+2.</p>'
                + '<h3>5 \u00b7 Pass Security & Anti-Scalping</h3>'
                + '<p>Passes use rotating QR hashes and bound NFC identities. Resale, bot-driven bulk purchasing, automated inventory harvesting, or any attempt to circumvent the anti-scalp cipher is prohibited and may result in immediate pass revocation and account suspension.</p>'
                + '<h3>6 \u00b7 Organizer Obligations</h3>'
                + '<p>Organizers must deliver the event substantially as described, honor listed tier perks, keep published information accurate, and use the check-in and refund tooling in good faith. The platform may suspend, unpublish or restore any event that violates these terms.</p>'
                + '<h3>7 \u00b7 Acceptable Use</h3>'
                + '<p>No unlawful content, harassment of attendees or staff, interference with gate telemetry, abusive-rate scraping, or attempts to access other users\u2019 data. Zero-trust security monitors the mesh continuously and anomalous traffic is triaged automatically.</p>'
                + '<h3>8 \u00b7 Liability & Changes</h3>'
                + '<p>The service is provided on its published SLA (99.95% gate mesh uptime target). To the maximum extent permitted by law, Eventora\u2019s liability is limited to the platform fees on the affected orders. These terms may be updated; material changes are announced on the platform.</p>'
                + '<h3>9 \u00b7 Contact</h3>'
                + '<p>Legal questions: <a href="#/contact" style="color:var(--cyan2)">rowdroofficial@gmail.com via the contact page</a>.</p>'
                + '<p class="upd">Last updated: January 2026 \u00b7 Version 4.2</p>'
                + '</div>' + publicFooter();
        }
        function LoginView(q) { const u = session(); if (u) { location.hash = homeFor(u); return '' } return authShell('login', q.get('next') || '', '') }
        function RegisterView(q) { const u = session(); if (u) { location.hash = homeFor(u); return '' } return authShell('register', '', q.get('role') === 'organizer' ? 'organizer' : 'attendee') }
        function ForgotPasswordView() {
            const u = session(); if (u) { location.hash = homeFor(u); return '' }
            return topNav('') + '<div class="wrap" style="padding:80px 0;max-width:420px;margin:0 auto">'
                + '<div class="glass" style="padding:28px"><h2 style="margin-bottom:8px">Reset your password</h2>'
                + '<p class="mut" style="margin-bottom:18px">Enter the email on your account and we\u2019ll send you a reset link.</p>'
                + '<form data-form="forgotpw" novalidate><div class="field"><label>Email</label><input class="inp" name="email" type="email" placeholder="you@arena.io" required></div>'
                + '<div class="err-t" id="fp-err" style="margin-bottom:10px"></div>'
                + '<button class="btn btn-p w100 lg" type="submit">' + ic('mail', 15) + ' Send Reset Link</button></form>'
                + '<div style="margin-top:16px;text-align:center"><a href="#/login" class="small mut">Back to Sign In</a></div></div></div>' + publicFooter();
        }
        function ResetPasswordView() {
            if (!PW_RECOVERY_READY) {
                return topNav('') + '<div class="wrap" style="padding:100px 0;max-width:420px;margin:0 auto;text-align:center">'
                    + '<div class="glass" style="padding:32px"><h2 style="margin-bottom:10px">Verifying reset link\u2026</h2>'
                    + '<p class="mut">If this takes more than a few seconds, the link may have expired.</p>'
                    + '<button class="btn btn-g" data-go="#/forgot-password" style="margin-top:16px">Request a New Link</button></div></div>' + publicFooter();
            }
            return topNav('') + '<div class="wrap" style="padding:80px 0;max-width:420px;margin:0 auto">'
                + '<div class="glass" style="padding:28px"><h2 style="margin-bottom:18px">Set a new password</h2>'
                + '<form data-form="setnewpw" novalidate><div class="field"><label>New Password <span class="mut" style="font-weight:500">min 6 chars</span></label>'
                + '<div class="pwrap"><input class="inp" name="nw" type="password" id="rp-nw" minlength="8" required><button type="button" class="pw-eye" data-action="pw-toggle" data-target="rp-nw">' + ic('eye', 15) + '</button></div></div>'
                + '<button class="btn btn-p w100 lg" type="submit">' + ic('lock', 15) + ' Update Password</button></form></div></div>' + publicFooter();
        }
        function authShell(tab, next, preRole) {
            after(() => { initGoogle(document.getElementById('gbtn'), preRole, tab) });
            return topNav('')
                + '<div class="auth-wrap"><div class="glass-hi auth-card">'
                + '<div class="logo-big">' + logo(46) + '</div>'
                + '<h2 style="text-align:center;font-size:22px;letter-spacing:-.02em">' + (tab === 'login' ? 'Access the Arena' : 'Create Your Stage') + '</h2>'
                + '<p class="mut" style="text-align:center;margin:6px 0 22px;font-size:13px">' + (tab === 'login' ? 'Sign in to your Eventora operating system.' : 'Join as an attendee or launch your organizer workspace.') + '</p>'
                + '<div class="auth-tabs"><a class="' + (tab === 'login' ? 'act' : '') + '" href="#/login' + (next ? '?next=' + encodeURIComponent(next) : '') + '">Sign In</a><a class="' + (tab === 'register' ? 'act' : '') + '" href="#/register' + (preRole === 'organizer' ? '?role=organizer' : '') + '">Register</a></div>'
                + '<div class="gwrap" id="gbtn"></div>'
                + '<div class="or-div">or use email</div>'
                + (tab === 'login' ? '<form data-form="login" data-next="' + esc(next) + '" novalidate>'
                    + '<div class="field"><label>Email</label><input class="inp" name="email" type="email" id="li-email" placeholder="you@arena.io" required></div>'
                    + '<div class="field"><label>Password <a href="#/forgot-password" class="small" style="font-weight:600">Forgot password?</a></label><div class="pwrap"><input class="inp" name="pass" type="password" id="li-pass" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required><button type="button" class="pw-eye" data-action="pw-toggle" data-target="li-pass">' + ic('eye', 15) + '</button></div></div>'
                    + '<div class="err-t" id="auth-err" style="margin-bottom:10px"></div>'
                    + '<button class="btn btn-p w100 lg" type="submit">' + ic('zap', 15) + ' Access Console</button></form>'
                    : '<form data-form="register" novalidate>'
                    + '<div class="field"><label>Full Name</label><input class="inp" name="name" placeholder="Ayaan Rahman" required></div>'
                    + '<div class="field"><label>Email</label><input class="inp" name="email" type="email" placeholder="you@arena.io" required></div>'
                    + '<div class="field"><label>Password <span class="mut" style="font-weight:500">8+ chars, upper, lower, number & symbol</span></label><div class="pwrap"><input class="inp" name="pass" type="password" id="reg-pass" minlength="8" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required><button type="button" class="pw-eye" data-action="pw-toggle" data-target="reg-pass">' + ic('eye', 15) + '</button></div></div>'
                    + '<div class="field"><label>I am joining as</label><div class="role-seg">'
                    + '<button type="button" class="chip-f ' + (preRole === 'organizer' ? '' : 'act') + '" data-action="reg-role" data-r="attendee">' + ic('user', 13) + ' Attendee</button>'
                    + '<button type="button" class="chip-f ' + (preRole === 'organizer' ? 'act' : '') + '" data-action="reg-role" data-r="organizer">' + ic('brief', 13) + ' Organizer</button></div>'
                    + '<input type="hidden" name="role" id="reg-role" value="' + preRole + '"></div>'
                    + '<div class="field" id="org-field" style="display:' + (preRole === 'organizer' ? 'block' : 'none') + '"><label>Organization / Production House</label><input class="inp" name="org" placeholder="Nexus Live Productions"></div>'
                    + '<div class="err-t" id="auth-err" style="margin-bottom:10px"></div>'
                    + '<button class="btn btn-p w100 lg" type="submit">' + ic('spark', 15) + ' Create Account</button></form>')
                + '</div></div>';
        }
        function CheckoutView(id, q) {
            const u = session(); if (!u) return guardLogin();
            const ev = db.events.find(e => e.id === id);
            if (!ev || ev.status !== 'published') return NotFound();
            if (evEnded(ev)) { toast('This event has already taken place \u2014 ticket sales are closed.', 'warn'); location.hash = '#/event/' + id; return '' }
            if (ev.organizerId === u.id) { toast('You already run this event \u2014 manage it from your console.', 'info'); location.hash = '#/organizer/events'; return '' }
            const tiers = evTiers(ev);
            if (!tiers.length) { toast('Tickets for this event are still being configured.', 'info'); location.hash = '#/event/' + id; return '' }
            const qTier = q.get('tier');
            CO.tierId = (qTier && tiers.some(t => t.id === qTier)) ? qTier : (tiers.find(t => !t.vip) || tiers[0]).id;
            CO.qty = 1;
            CO.pay = payMethodsFor(evCur(ev))[0][0];
            const c = catOf(ev.category);
            return topNav('events')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('ticket', 13) + ' Registration \u00b7 ' + esc(c.name) + '</span><h1>' + (priceFrom(ev) === 0 ? 'RSVP \u2014 Free' : 'Claim Your Pass') + '</h1>'
                + '<p class="sub">' + esc(ev.title) + ' \u00b7 ' + fmtRange(ev.startDate, ev.endDate) + ' \u00b7 ' + esc(ev.venue) + '</p></div>'
                + '<div class="wrap co-grid"><div><div class="glass" style="padding:22px">'
                + '<h3 style="font-size:16px;margin-bottom:16px">1 \u00b7 Select Tier</h3>'
                + tiers.map(t => {
                    const left = t.quantity - soldOf(t.id); return '<div class="glass co-tier ' + (CO.tierId === t.id ? 'act' : '') + '" data-action="co-tier" data-id="' + t.id + '" style="' + (left <= 0 ? 'opacity:.5;pointer-events:none' : '') + '">'
                        + '<span class="radio"></span><div style="flex:1"><div style="font:700 15px var(--fd);display:flex;gap:8px;align-items:center">' + (t.vip ? ic('crown', 15) : ic('ticket', 15)) + ' ' + esc(t.name) + ' ' + (t.vip ? '<span class="pill pill-vip" style="font-size:9px;padding:2px 8px">VIP</span>' : '') + '</div>'
                        + '<div class="small mut">' + esc(t.perks || 'Standard access') + ' \u00b7 ' + (left > 0 ? fmtN(left) + ' available' : 'Sold out') + '</div></div>'
                        + '<b class="tnum" style="font:700 17px var(--fd)">' + (t.price === 0 ? 'Free' : fmtMoney(t.price, evCur(ev))) + '</b></div>'
                }).join('')
                + '<h3 style="font-size:16px;margin:22px 0 12px">2 \u00b7 Quantity</h3>'
                + '<div class="row-b"><div class="qty"><button type="button" data-action="co-qty" data-d="-1" aria-label="Decrease">\u2212</button><b id="co-qty">1</b><button type="button" data-action="co-qty" data-d="1" aria-label="Increase">+</button></div>'
                + '<span class="small mut">Max 10 per order \u00b7 passes are named & non-transferable until check-in</span></div>'
                + '<h3 style="font-size:16px;margin:22px 0 12px">3 \u00b7 Attendee Details</h3>'
                + '<form data-form="checkout" id="co-form"><div class="grid2">'
                + '<div class="field"><label>Full Name</label><input class="inp" name="name" value="' + esc(u.name) + '" required></div>'
                + '<div class="field"><label>Email (pass delivery)</label><input class="inp" name="email" type="email" value="' + esc(u.email) + '" required></div></div>'
                + (priceFrom(ev) > 0 ? '<label class="f-label">4 \u00b7 Payment Method (' + evCur(ev) + ')</label><div class="paysel" style="margin-bottom:14px">'
                    + payMethodsFor(evCur(ev)).map(m => '<div class="paycard ' + (CO.pay === m[0] ? 'act' : '') + '" data-action="co-pay" data-p="' + m[0] + '"><span class="pd" style="background:' + m[2] + ';box-shadow:0 0 8px ' + m[2] + '66"></span>' + m[1] + '</div>').join('')
                    + '</div>' + (!CONFIG.payments.createSessionUrl ? '<div class="gcfg" style="margin-top:6px"><b>Online payment gateway is not connected yet.</b><br>Paid checkout requires a real provider session \u2014 no simulated transactions are ever created. Configure <code>window.EVENTORA_CONFIG.payments</code> with your gateway\u2019s <code>createSessionUrl</code> and <code>verifyUrl</code>. Attendees anywhere in the world can pay by card (or PayPal); Bangladesh-priced (BDT) events also offer bKash / Nagad / Rocket. Secrets stay server-side. Free 0-amount RSVPs check out instantly without a gateway.</div>' : '') : '')
                + '<div class="err-t" id="co-err"></div></form></div></div>'
                + '<div><div class="glass side-card" style="position:static"><span class="eyebrow" style="margin-bottom:14px">' + ic('card', 13) + ' Order Summary</span>'
                + '<div id="co-summary"></div>'
                + '<button class="btn btn-p w100 lg mt24" type="submit" form="co-form" id="co-btn"></button>'
                + '<p class="small mut mt16" style="text-align:center">' + ic('shield', 12) + ' ' + (priceFrom(ev) === 0 ? 'Instant confirmation \u00b7 no payment required' : (CONFIG.payments.createSessionUrl ? 'Secured by ' + (CONFIG.payments.gatewayName || 'your payment gateway') + ' \u00b7 verified server-side \u00b7 ' + evCur(ev) : 'Pending gateway connection \u2014 see notice above')) + '</p></div></div>'
                + '</div>' + consoleFooter();
        }
        function coSummaryFor(ev) {
            const t = tierById(CO.tierId); if (!t || !ev) return;
            const free = t.price === 0;
            const code = evCur(ev);
            const sub = t.price * CO.qty, fee = free ? 0 : +(sub * db.meta.fees / 100).toFixed(2), tot = sub + fee;
            const sum = document.getElementById('co-summary'); if (!sum) return;
            sum.innerHTML = '<div class="sum-row"><span>' + esc(t.name) + ' \u00d7 ' + CO.qty + '</span><b class="tnum">' + (free ? 'Free' : fmtMoney(sub, code)) + '</b></div>'
                + '<div class="sum-row"><span>Price per ticket</span><b class="tnum">' + (free ? 'Free' : fmtMoney(t.price, code)) + '</b></div>'
                + '<div class="sum-row"><span>Platform fee (' + db.meta.fees + '%)</span><b class="tnum">' + (free ? 'Waived' : fmtMoney(fee, code)) + '</b></div>'
                + (free ? '' : '<div class="sum-row"><span>Payment method</span><b>' + methodLabel(CO.pay) + '</b></div>')
                + '<div class="sum-row"><span>Instant QR issuance</span><b style="color:var(--green)">Included</b></div>'
                + '<div class="sum-row tot"><span>Total (' + code + ')</span><span class="tnum">' + (tot === 0 ? 'Free' : fmtMoney(tot, code)) + '</span></div>';
            const btn = document.getElementById('co-btn'); if (btn) btn.innerHTML = ic('zap', 16) + ' ' + (free ? 'Confirm Registration \u2014 Free' : 'Proceed to Secure Payment \u2014 ' + fmtMoney(tot, code));
        }
        function payFailModal(title, body) {
            openModal('<div class="modal-h"><h3>' + esc(title) + '</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                + '<div class="modal-b" style="text-align:center">'
                + '<div class="okring red" style="width:72px;height:72px;margin:6px auto 18px">' + ic('x', 30, 2.2) + '</div>'
                + '<p class="mut" style="margin-bottom:22px">' + body + '</p>'
                + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-p" data-go="#/attendee/dashboard">Go to Dashboard</button><button class="btn btn-g" data-close>Close</button></div></div>');
        }
        function placeOrder(form) {
            const id = location.hash.split('?')[0].replace('#/checkout/', '');
            const ev = db.events.find(e => e.id === id), u = session(), t = tierById(CO.tierId);
            if (!ev || !t || !u) return;
            if (evEnded(ev) || ev.status !== 'published') { openEndedModal(); return }
            const name = form.name.value.trim(), email = form.email.value.trim();
            if (name.length < 2 || !/.+@.+\..+/.test(email)) { document.getElementById('co-err').textContent = 'Please provide a valid name and email.'; return }
            const left = t.quantity - soldOf(t.id);
            if (CO.qty > left) { toast('Only ' + left + ' passes left in this tier.', 'warn'); return }
            const free = t.price === 0;
            const btn = document.getElementById('co-btn'); btn.disabled = true;
            if (free) {
                btn.innerHTML = '<span class="spin"></span> Sealing pass\u2026';
                setTimeout(() => {
                    const first = { id: uid('rg'), eventId: ev.id, userId: u.id, attendeeName: name, attendeeEmail: email, ticketId: t.id, tierName: t.name, status: 'confirmed', passId: passHash(), checkInTime: null, gate: null, rfid: t.name !== 'Virtual', created_at: new Date().toISOString() };
                    for (let i = 0; i < CO.qty; i++) {
                        const reg = i === 0 ? first : Object.assign({}, first, { id: uid('rg'), passId: passHash() });
                        db.registrations.push(reg);
                        db.orders.push({ id: uid('or'), eventId: ev.id, userId: u.id, registrationId: reg.id, unitPrice: t.price, quantity: 1, fees: 0, total: 0, method: 'Free', status: 'paid', created_at: new Date().toISOString(), paidAt: new Date().toISOString() });
                    }
                    notify(u.id, 'Pass confirmed \u2014 ' + ev.title, t.name + ' \u00d7 ' + CO.qty + ' \u00b7 Free RSVP \u00b7 Pass ' + truncHash(first.passId), 'ticket', '#/success/' + first.id);
                    notify(ev.organizerId, 'New ' + t.name + ' RSVP \u2014 ' + ev.title, name + ' \u00b7 Free', 'sale', '#/organizer/attendees?event=' + ev.id);
                    persist(); location.hash = '#/success/' + first.id;
                }, 700);
                return;
            }
            if (!CONFIG.payments.createSessionUrl) {
                btn.disabled = false;
                payFailModal('Payment gateway not connected', 'Paid checkout requires a live payment provider. No transaction was started and no charge has been made. Free \u09f30 events still check out instantly \u2014 or connect the gateway via EVENTORA_CONFIG.payments.');
                return;
            }
            btn.innerHTML = '<span class="spin"></span> Opening ' + methodLabel(CO.pay) + '\u2026';
            const feeEach = +(t.price * db.meta.fees / 100).toFixed(2);
            const tot = +((t.price + feeEach) * CO.qty).toFixed(2);
            const code = evCur(ev);
            const ref = 'EVPAY-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
            const order = { id: uid('or'), eventId: ev.id, userId: u.id, tierId: t.id, registrationId: null, unitPrice: t.price, currency: code, quantity: CO.qty, fees: +(feeEach * CO.qty).toFixed(2), total: tot, method: CO.pay, status: 'pending', intent: { ref, method: CO.pay }, created_at: new Date().toISOString() };
            db.orders.push(order); persist();
            fetch(CONFIG.payments.createSessionUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ref, amount: tot, currency: code, method: CO.pay, gateway: CONFIG.payments.gatewayName || 'auto',
                    description: ev.title + ' \u2014 ' + t.name + ' \u00d7 ' + CO.qty, customer: { name, email },
                    callbackUrl: location.origin + location.pathname + '#/payment/callback'
                })
            })
                .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, status: r.status, j })))
                .then(({ ok, status, j }) => {
                    if (!ok) throw new Error(j && j.error ? j.error : ('gateway ' + status));
                    const url = j.redirectUrl || j.url || j.payment_url || (j.data && j.data.redirectUrl);
                    if (!url) throw new Error(j && j.error ? j.error : 'Gateway response did not include a redirect URL.');
                    persist(); window.location.href = url;
                })
                .catch(err => {
                    order.status = 'failed'; order.failReason = 'gateway_unavailable'; persist();
                    btn.disabled = false; coSummaryFor(ev);
                    console.error('SSLCommerz create-session failed:', err);
                    payFailModal('Payment could not be started', (err && err.message ? esc(err.message) : 'We couldn\u2019t reach the payment gateway.') + ' No charge has been made and no ticket was issued \u2014 please try again in a moment.');
                });
        }
        function finalizeOrder(order, txnId) {
            const ev = db.events.find(e => e.id === order.eventId), t = tierById(order.tierId), u = userById(order.userId);
            if (!ev || !t) { order.status = 'failed'; order.failReason = 'event_missing'; persist(); return { state: 'failed' } }
            if (evEnded(ev)) { order.status = 'refunded'; order.failReason = 'event_ended'; order.txnId = txnId || order.intent.ref; persist(); return { state: 'ended' } }
            const left = t.quantity - soldOf(t.id);
            if (order.quantity > left) { order.status = 'failed'; order.failReason = 'sold_out'; order.txnId = txnId || order.intent.ref; persist(); return { state: 'soldout' } }
            const first = { id: uid('rg'), eventId: ev.id, userId: order.userId, attendeeName: u ? u.name : 'Guest', attendeeEmail: u ? u.email : '', ticketId: t.id, tierName: t.name, status: 'confirmed', passId: passHash(), checkInTime: null, gate: null, rfid: t.name !== 'Virtual', created_at: new Date().toISOString() };
            for (let i = 0; i < order.quantity; i++) {
                const reg = i === 0 ? first : Object.assign({}, first, { id: uid('rg'), passId: passHash() });
                db.registrations.push(reg);
                if (i === 0) order.registrationId = reg.id;
            }
            order.status = 'paid'; order.txnId = txnId || order.intent.ref; order.paidAt = new Date().toISOString();
            notify(order.userId, 'Payment verified \u2014 ' + ev.title, t.name + ' \u00d7 ' + order.quantity + ' \u00b7 ' + fmtMoney(order.total) + ' \u00b7 Txn ' + order.txnId, 'ticket', '#/success/' + first.id);
            notify(ev.organizerId, 'New ' + t.name + ' sale \u2014 ' + ev.title, (u ? u.name : 'Attendee') + ' \u00b7 ' + fmtMoney(order.total), 'sale', '#/organizer/attendees?event=' + ev.id);
            persist(); return { state: 'paid', regId: first.id };
        }
        function PaymentCallbackView(q) {
            const ref = q.get('ref') || '', provStatus = (q.get('status') || '').toLowerCase(), txn = q.get('txn') || q.get('transactionId') || '';
            after(() => {
                const host = document.getElementById('payres'); if (!host) return;
                const order = orderByRef(ref);
                if (!order) { host.innerHTML = '<div class="glass err-panel" style="margin:60px auto"><h2>Unknown payment reference</h2><p class="mut">We couldn\u2019t find an order for this reference. If you were charged, contact support with the reference below.</p><p class="mono" style="color:#7dd3fc">' + esc(ref) + '</p><a class="btn btn-p mt16" href="#/attendee/dashboard">Go to Dashboard</a></div>'; return }
                if (order.status === 'paid') { location.hash = order.registrationId ? '#/success/' + order.registrationId : '#/attendee/dashboard'; return }
                if (order.status === 'refunded' || order.status === 'failed' || order.status === 'cancelled') { renderPayResult(host, order, order.status, order.registrationId); return }
                if (!CONFIG.payments.verifyUrl) {
                    host.innerHTML = '<div class="glass" style="max-width:560px;margin:60px auto;padding:30px;text-align:center">' + payPill(order.status)
                        + '<h2 style="margin:14px 0 8px">Verification endpoint not configured</h2><p class="mut">The gateway returned reference <span class="mono" style="color:#7dd3fc">' + esc(ref) + '</span>. Set <code>EVENTORA_CONFIG.payments.verifyUrl</code> so this transaction can be verified server-side before any ticket is issued. The order remains <b>Pending</b> \u2014 no ticket has been generated.</p><a class="btn btn-p mt16" href="#/profile">Open Billing & Orders</a></div>';
                    return;
                }
                host.innerHTML = '<div class="glass" style="max-width:520px;margin:70px auto;padding:40px;text-align:center"><span class="spin" style="width:26px;height:26px;border-width:3px;margin:0 auto 18px;display:block"></span><h2 style="font-size:19px">Verifying your payment\u2026</h2><p class="mut" style="margin-top:8px">Confirming the transaction with the provider before issuing your pass. Reference <span class="mono" style="color:#7dd3fc">' + esc(ref) + '</span></p></div>';
                fetch(CONFIG.payments.verifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, txn }) })
                    .then(r => { if (!r.ok) throw new Error('verify ' + r.status); return r.json() })
                    .then(j => {
                        if (j && j.verified) { const res = finalizeOrder(order, j.txnId || txn || ref); renderPayResult(host, order, res.state, res.regId) }
                        else { order.status = provStatus.indexOf('cancel') >= 0 ? 'cancelled' : 'failed'; order.failReason = 'provider_declined'; if (txn) order.txnId = txn; persist(); renderPayResult(host, order, order.status, null) }
                    })
                    .catch(() => {
                        host.innerHTML = '<div class="glass" style="max-width:560px;margin:60px auto;padding:30px;text-align:center">' + payPill(order.status)
                            + '<h2 style="margin:14px 0 8px">Verification unavailable</h2><p class="mut">We couldn\u2019t reach the verification service, so your order stays <b>Pending</b> \u2014 nothing was fulfilled and no ticket was issued. Try again from Billing & Orders in a moment.</p><a class="btn btn-p mt16" href="#/profile">Open Billing & Orders</a></div>';
                    });
            });
            return topNav('') + '<div class="wrap" style="min-height:50vh"><div id="payres"></div></div>' + (session() ? consoleFooter() : publicFooter());
        }
        function renderPayResult(host, order, state, regId) {
            const ev = db.events.find(e => e.id === order.eventId);
            const title = state === 'paid' ? 'Payment verified \u2014 you\u2019re in!' : state === 'ended' ? 'Event Ended \u2014 full refund due' : state === 'cancelled' ? 'Payment cancelled' : state === 'soldout' ? 'Tickets sold out' : 'Payment failed';
            const body = state === 'paid' ? 'Your payment of ' + fmtMoney(order.total) + ' was verified with the provider and your pass' + (order.quantity > 1 ? 'es are' : ' is') + ' ready.'
                : state === 'ended' ? 'This event finished before fulfilment. Your payment of ' + fmtMoney(order.total) + ' will be refunded in full by the merchant \u2014 no ticket was issued.'
                    : state === 'cancelled' ? 'No charge was made and no ticket was issued. You can retry any time while tickets remain.'
                        : state === 'soldout' ? 'Your payment will be refunded in full \u2014 the tier sold out before fulfilment. No ticket was issued.'
                            : 'The provider declined or could not process the transaction. No charge was completed and no ticket was issued.';
            const ring = state === 'paid' ? '' : state === 'cancelled' || state === 'ended' ? 'amb' : 'red';
            const icon = state === 'paid' ? 'check' : 'ban';
            const actions = state === 'paid' ? '<button class="btn btn-p" data-go="#/success/' + regId + '">' + ic('ticket', 14) + ' View My Pass</button><a class="btn btn-g" href="#/attendee/tickets">My Tickets</a>'
                : state === 'ended' ? '<a class="btn btn-g" href="#/events">Browse Events</a><button class="btn btn-g" data-go="#/profile">Billing & Orders</button>'
                    : '<a class="btn btn-p" href="#/checkout/' + order.eventId + '?tier=' + (order.tierId || '') + '">' + ic('refresh', 14) + ' Try Again</a><button class="btn btn-g" data-go="#/profile">Billing & Orders</button>';
            host.innerHTML = '<div class="glass" style="max-width:560px;margin:60px auto;padding:34px;text-align:center">'
                + '<div class="okring ' + ring + '">' + ic(icon, 34, 2.4) + '</div>'
                + '<h1 style="font-size:clamp(22px,4vw,28px);letter-spacing:-.02em">' + title + '</h1>'
                + '<p class="mut" style="margin:10px 0 6px">' + body + '</p>'
                + (ev ? '<p class="small mut" style="margin-bottom:6px">' + esc(ev.title) + ' \u00b7 ' + esc(order.tierName || '') + ' \u00d7 ' + order.quantity + '</p>' : '')
                + '<p class="small mut" style="margin-bottom:20px">Order ' + payPill(order.status) + (order.txnId ? ' \u00b7 Txn <span class="mono" style="color:#7dd3fc">' + esc(order.txnId) + '</span>' : '') + ' \u00b7 ' + fmtMoney(order.total) + '</p>'
                + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' + actions + '</div></div>';
            document.title = 'Payment ' + (state === 'paid' ? 'Successful' : state.charAt(0).toUpperCase() + state.slice(1)) + ' \u2014 Eventora';
        }
        function SuccessView(regId) {
            const u = session(); if (!u) return guardLogin();
            const reg = db.registrations.find(r => r.id === regId && r.userId === u.id);
            if (!reg) return NotFound();
            const ev = db.events.find(e => e.id === reg.eventId);
            const order = db.orders.find(o => o.registrationId === reg.id && o.userId === u.id);
            const paidVia = order && order.method && order.method !== 'Free';
            after(() => { const host = document.getElementById('qr-host'); if (host) qrInto(host, 'EVENTORA-PASS|' + reg.passId + '|' + reg.eventId + '|' + reg.attendeeName) });
            return topNav('adash')
                + '<div class="wrap"><div class="success-wrap">'
                + '<div class="okring">' + ic('check', 38, 2.4) + '</div>'
                + '<h1 style="font-size:clamp(24px,4vw,30px);letter-spacing:-.02em">You\u2019re on the list.</h1>'
                + '<p class="mut" style="margin:10px 0 28px">Your cryptographically-sealed pass for <b style="color:var(--text)">' + esc(ev.title) + '</b> has been issued and emailed to ' + esc(reg.attendeeEmail) + '.</p>'
                + '<div class="pass" style="text-align:left">'
                + '<div class="p-cover"><img src="' + coverOf(ev) + '" alt=""><span class="pill pill-live" style="position:absolute;top:12px;right:12px;z-index:2">' + (evLive(ev) ? '<span class="dot g pulse"></span> Live' : 'Confirmed') + '</span></div>'
                + '<div class="p-body"><img class="p-ava" src="' + (u.avatarSeed || pic(u.name.toLowerCase().replace(/[^a-z]/g, '') || 'me', 80, 80)) + '" alt="">'
                + '<div class="p-name">' + esc(u.name) + '</div>'
                + '<span class="tier-b ' + (reg.tierName.includes('VIP') ? 'tier-vip' : reg.tierName === 'Virtual' ? 'tier-vir' : 'tier-std') + '" style="margin-top:6px">' + (reg.tierName.includes('VIP') ? ic('crown', 12) : ic('ticket', 12)) + ' ' + esc(reg.tierName) + '</span>'
                + '<div class="p-grid"><div><label>Date</label><b>' + fmtRange(ev.startDate, ev.endDate) + ' \u00b7 ' + esc(ev.doors) + '</b></div><div><label>Venue</label><b>' + esc(ev.venue) + '</b></div><div><label>Pass ID</label><b class="mono" style="color:var(--cyan2)">' + truncHash(reg.passId) + '</b></div><div><label>Gate</label><b>Assigned at check-in</b></div></div>'
                + '<div class="qr-panel" id="qr-host"></div>'
                + '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><span class="pill pill-mut">' + ic('shield', 11) + ' NFC Encrypted</span><span class="pill pill-mut">ECDSA-256</span><span class="pill pill-green">' + ic('check', 11) + ' ' + (paidVia ? 'Payment Verified (' + methodLabel(order.method) + ')' : 'Free RSVP') + '</span></div>'
                + (order && order.txnId ? '<p class="small mut" style="text-align:center;margin-top:10px">Txn <span class="mono" style="color:#7dd3fc">' + esc(order.txnId) + '</span> \u00b7 ' + fmtMoney(order.total) + '</p>' : '')
                + '</div></div>'
                + '<div style="display:flex;gap:12px;justify-content:center;margin-top:26px;flex-wrap:wrap">'
                + '<button class="btn btn-p" data-go="#/attendee/tickets">' + ic('ticket', 15) + ' My Tickets</button>'
                + '<button class="btn btn-g" data-action="tkt-ics" data-id="' + reg.id + '">' + ic('cal', 15) + ' Add to Calendar</button>'
                + '<a class="btn btn-g" href="#/event/' + ev.id + '">Back to Event</a></div>'
                + '</div></div>' + consoleFooter();
        }
        function pendingBand(u) {
            const pend = db.orders.filter(o => o.userId === u.id && o.status === 'pending');
            if (!pend.length) return '';
            return '<div class="glass mb24" style="padding:14px 20px;border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.05)">'
                + '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span style="color:var(--amber)">' + ic('clock', 16) + '</span><b style="font:700 14px var(--fd)">Pending payment' + (pend.length > 1 ? 's' : '') + ' \u2014 not yet verified, no tickets issued</b></div>'
                + pend.map(o => {
                    const ev = db.events.find(e => e.id === o.eventId);
                    return '<div class="row-b" style="padding:7px 0;border-top:1px solid rgba(255,255,255,.06)"><div><b style="font:600 13px var(--fd)">' + esc(ev ? ev.title : 'Event') + '</b><div class="small mut">' + (ev && evEnded(ev) ? 'Event has ended \u2014 this payment will be fully refunded.' : esc(o.tierName || '') + ' \u00d7 ' + o.quantity + ' \u00b7 ' + fmtMoney(o.total, o.currency) + ' \u00b7 ' + methodLabel(o.method)) + '</div></div>'
                        + '<div style="display:flex;gap:8px">' + (ev && !evEnded(ev) ? '<button class="btn btn-p sm" data-action="pay-resume" data-id="' + o.id + '">Resume</button>' : '') + '<button class="btn btn-g sm" data-action="pay-cancel" data-id="' + o.id + '">Cancel</button></div></div>'
                }).join('')
                + '</div>';
        }
        function AttendeeDashboard() {
            const u = session(); if (!u) return guardLogin();
            const regs = db.registrations.filter(r => r.userId === u.id && r.status !== 'cancelled');
            const upcoming = regs.filter(r => { const ev = db.events.find(e => e.id === r.eventId); return ev && !evEnded(ev) });
            const favN = db.favorites.filter(f => f.userId === u.id).length;
            const myOrders = db.orders.filter(o => o.userId === u.id && o.status === 'paid');
            const spend = myOrders.reduce((s, o) => s + o.total, 0);
            const avaSrc = u.avatarSeed || pic(u.name.toLowerCase().replace(/[^a-z]/g, '') || 'me', 80, 80);
            const recs = publicEvents().filter(e => !evEnded(e) && !regs.some(r => r.eventId === e.id)).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 3);
            const myIds = regs.map(r => r.eventId);
            const catSegs = catMixSegs(myIds);
            const spendSeries = dailySeries(90, k => myOrders.filter(o => o.created_at.slice(0, 10) === k).reduce((s, o) => s + o.total, 0));
            const attSegs = eventPhaseMix(db.events.filter(e => myIds.indexOf(e.id) >= 0));
            return topNav('adash')
                + '<div class="wrap phead"><div class="row-b"><div><span class="eyebrow">' + ic('ticket', 13) + ' Attendee Console</span>'
                + '<h1>Welcome back, ' + esc(u.name.split(' ')[0]) + '</h1>'
                + '<p class="sub">Your sealed passes, wishlist and alerts \u2014 synced to the gate mesh in real time.</p></div>'
                + '<a class="btn btn-p" href="#/attendee/browse">' + ic('search', 15) + ' Browse Events</a></div></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + pendingBand(u)
                + '<div class="mgrid mb24">'
                + metricTile({ label: 'Upcoming Passes', c: '#38bdf8', icon: 'ticket', value: fmtN(upcoming.length), cap: 'Sealed & synced to the gate mesh', bar: Math.min(100, upcoming.length * 20) })
                + metricTile({ label: 'Total Registrations', c: '#a5b4fc', icon: 'cal', value: fmtN(regs.length), cap: 'Lifetime across all events', bar: Math.min(100, regs.length * 5), bc: 'vio' })
                + metricTile({ label: 'Total Spend', c: '#38bdf8', icon: 'dollar', value: spend === 0 ? 'Free only' : shortMoney(spend), cap: fmtN(myOrders.length) + ' settled order' + (myOrders.length === 1 ? '' : 's') + ' \u00b7 shown in ' + CUR_DEFAULT + (myOrders.some(o => o.currency && o.currency !== CUR_DEFAULT) ? ' equiv.' : '') })
                + metricTile({ label: 'Wishlist', c: '#f472b6', icon: 'heart', value: fmtN(favN), cap: 'Pinned experiences', bar: Math.min(100, favN * 20), bc: 'mag' })
                + '</div>'
                + '<div class="grid2 mb24">'
                + chartCard('My Activity \u2014 Registrations', 'Your passes across events, by category', catSegs.length ? donutChart(catSegs, { center: fmtN(regs.length), centerLabel: 'passes' }) : '<div class="mut small" style="padding:26px 0;text-align:center">Register for your first event to see your activity chart.</div>')
                + chartCard('My Spend \u2014 last 90 days', 'Settled order totals \u00b7 ' + CUR_DEFAULT + ' equiv.', spend > 0 ? areaChart(spendSeries, { fmt: shortMoney, tipFmt: 'money', color: '#34d399', aria: 'Personal spend trend' }) : '<div class="mut small" style="padding:26px 0;text-align:center">No paid orders yet \u2014 your spend will chart here after your first ticket. Free RSVPs don\u2019t count toward spend.</div>')
                + '</div>'
                + (attSegs.length ? '<div class="grid2 mb24">' + chartCard('My Event Mix', 'Upcoming vs completed events you\u2019re registered for', donutChart(attSegs, { center: fmtN(regs.length), centerLabel: 'events' })) + '<div></div></div>' : '')
                + '<div class="grid2 mb24" style="grid-template-columns:1.4fr 1fr">'
                + '<div class="glass" style="padding:22px"><div class="row-b mb16"><h3 style="font-size:16px">Upcoming Passes</h3><a class="btn btn-g sm" href="#/attendee/tickets">View all</a></div>'
                + (upcoming.length ? upcoming.slice(0, 3).map(r => {
                    const ev = db.events.find(e => e.id === r.eventId);
                    return '<div class="spot"><img src="' + coverOf(ev) + '" alt=""><div style="flex:1;min-width:180px"><b style="font:600 14.5px var(--fd)">' + esc(ev.title) + '</b>'
                        + '<div class="small mut" style="margin:4px 0 8px">' + fmtRange(ev.startDate, ev.endDate) + ' \u00b7 ' + esc(ev.venue) + '</div>'
                        + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-p sm" data-action="tkt-qr" data-id="' + r.id + '">' + ic('qr', 13) + ' Pass QR</button><a class="btn btn-g sm" href="#/event/' + ev.id + '">Event</a></div></div></div>'
                }).join('')
                    : emptyState('ticket', 'No upcoming passes', 'Browse the mesh and claim your first sealed pass.', '#/attendee/browse', 'Browse Events')) + '</div>'
                + '<div class="glass" style="padding:22px"><h3 style="font-size:16px" class="mb16">Quick Links</h3>'
                + [['cal', 'My Registrations', '#/attendee/registrations'], ['ticket', 'My Tickets', '#/attendee/tickets'], ['heart', 'Wishlist', '#/attendee/wishlist'], ['bell', 'Notifications (' + unreadCount() + ' unread)', '#/notifications'], ['user', 'Profile & Settings', '#/profile']].map(l => '<a class="dd-it" href="' + l[2] + '" style="margin-bottom:4px">' + ic(l[0], 15) + ' ' + l[1] + '</a>').join('') + '</div></div>'
                + '<h3 style="font-size:16px" class="mb16">Continue Exploring</h3>'
                + '<div class="ev-grid cols3">' + recs.map(eventCard).join('') + '</div>'
                + '</div>' + consoleFooter();
        }
        function AttendeeTickets() {
            const u = session(); if (!u) return guardLogin();
            const regs = db.registrations.filter(r => r.userId === u.id && r.status !== 'cancelled');
            const upcoming = regs.filter(r => { const ev = db.events.find(e => e.id === r.eventId); return ev && !evEnded(ev) });
            const past = regs.filter(r => { const ev = db.events.find(e => e.id === r.eventId); return ev && evEnded(ev) });
            const avaSrc = u.avatarSeed || pic(u.name.toLowerCase().replace(/[^a-z]/g, '') || 'me', 80, 80);
            return topNav('atickets')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('ticket', 13) + ' Digital Ticketing & Wallet</span><h1>My Tickets</h1>'
                + '<p class="sub">Sealed glass passes with rotating QR \u2014 present at any turnstile.</p>'
                + '<div class="tabs"><button class="' + (TK_TAB === 'upcoming' ? 'act' : '') + '" data-action="tkt-tab" data-t="upcoming">Upcoming (' + upcoming.length + ')</button><button class="' + (TK_TAB === 'past' ? 'act' : '') + '" data-action="tkt-tab" data-t="past">History (' + past.length + ')</button></div></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + (TK_TAB === 'upcoming' ? (upcoming.length ? '<div class="tk-grid">' + upcoming.map(r => passCard(r, db.events.find(e => e.id === r.eventId), avaSrc)).join('') + '</div>' : emptyState('ticket', 'No upcoming passes yet', 'Browse the mesh and claim your first sealed pass.', '#/attendee/browse', 'Browse Events'))
                    : (past.length ? '<div class="tk-grid">' + past.map(r => { const ev = db.events.find(e => e.id === r.eventId); return '<div class="glass" style="padding:18px;display:flex;gap:14px;align-items:center;opacity:.75;flex-wrap:wrap"><img src="' + coverOf(ev) + '" alt="" style="width:110px;aspect-ratio:16/9;object-fit:cover;border-radius:10px"><div><b style="font:600 14px var(--fd)">' + esc(ev.title) + '</b><div class="small mut">' + fmtRange(ev.startDate, ev.endDate) + ' \u00b7 ' + esc(r.tierName) + '</div><span class="pill pill-mut mt16" style="display:inline-flex">Attended</span></div></div>' }).join('') + '</div>' : emptyState('clock', 'No past events', 'Your attended experiences will appear here.', '#/attendee/browse', 'Browse Events')))
                + '</div>' + consoleFooter();
        }
        function AttendeeRegistrations() {
            const u = session(); if (!u) return guardLogin();
            const regs = db.registrations.filter(r => r.userId === u.id && r.status !== 'cancelled').sort((a, b) => b.created_at.localeCompare(a.created_at));
            return topNav('')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('cal', 13) + ' Registration Ledger</span><h1>My Registrations</h1>'
                + '<p class="sub">Every verified registration and its settlement record across the mesh. Pending (unverified) payments appear on your dashboard until confirmed.</p></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + (regs.length ? '<div class="glass tablewrap"><table class="dtable"><thead><tr><th>Event</th><th>Tier</th><th>Registered</th><th>Status</th><th>Order Total</th><th>Pass</th><th></th></tr></thead>'
                    + '<tbody>' + regs.map(r => {
                        const ev = db.events.find(e => e.id === r.eventId); const o = db.orders.find(o => o.registrationId === r.id);
                        return '<tr><td><div class="att"><img class="avatar" style="width:44px;height:32px;border-radius:6px" src="' + coverOf(ev) + '" alt=""><div><div class="nm">' + esc(ev.title) + '</div><div class="em">' + fmtDate(ev.startDate) + ' \u00b7 ' + esc(ev.city) + '</div></div></div></td>'
                            + '<td><span class="tier-b ' + (r.tierName.includes('VIP') ? 'tier-vip' : r.tierName === 'Virtual' ? 'tier-vir' : 'tier-std') + '">' + esc(r.tierName) + '</span></td>'
                            + '<td class="mut">' + fmtDate(r.created_at.slice(0, 10)) + '</td>'
                            + '<td>' + (r.status === 'checked_in' ? '<span class="pill pill-live">Checked In</span>' : '<span class="pill pill-green">Confirmed</span>') + '</td>'
                            + '<td class="tnum" style="font-weight:600">' + (o ? (o.total === 0 ? 'Free' : fmtMoney(o.total, o.currency)) : '\u2014') + '<div class="small mut">' + (o ? methodLabel(o.method) : '') + '</div></td>'
                            + '<td class="mono" style="color:#7dd3fc">' + truncHash(r.passId) + '</td>'
                            + '<td style="text-align:right"><div style="display:inline-flex;gap:8px"><button class="btn btn-g sm" data-action="tkt-qr" data-id="' + r.id + '">' + ic('qr', 13) + ' Pass</button><a class="btn btn-g sm" href="#/event/' + ev.id + '">' + ic('eye', 13) + '</a></div></td></tr>'
                    }).join('') + '</tbody></table></div>'
                    : emptyState('cal', 'No registrations yet', 'Your event registrations will be listed here with settlement records.', '#/attendee/browse', 'Browse Events'))
                + '</div>' + consoleFooter();
        }
        function AttendeeWishlist() {
            const u = session(); if (!u) return guardLogin();
            const favs = db.favorites.filter(f => f.userId === u.id).map(f => db.events.find(e => e.id === f.eventId)).filter(Boolean);
            return topNav('awish')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('heart', 13) + ' Wishlist</span><h1>Pinned Experiences</h1>'
                + '<p class="sub">Tap the heart on any event to pin it here for later.</p></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + (favs.length ? '<div class="ev-grid cols3">' + favs.map(eventCard).join('') + '</div>' : emptyState('heart', 'No favorites yet', 'Tap the heart on any event to pin it here.', '#/attendee/browse', 'Browse Events'))
                + '</div>' + consoleFooter();
        }
        function NotificationsView() {
            const u = session(); if (!u) return guardLogin();
            const all = myNotifs();
            const list = NF === 'unread' ? all.filter(n => !n.read) : all;
            const ti = { ticket: ['ticket', 'var(--green)', 'rgba(52,211,153,.12)'], sale: ['dollar', 'var(--cyan2)', 'rgba(6,182,212,.12)'], alert: ['warn', 'var(--amber)', 'rgba(251,191,36,.1)'], system: ['info', '#a5b4fc', 'rgba(99,102,241,.12)'] };
            return topNav('')
                + '<div class="wrap phead"><div class="row-b"><div><span class="eyebrow">' + ic('bell', 13) + ' Signal Feed</span><h1>Notifications</h1></div>'
                + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-g sm" data-action="notif-all">' + ic('check', 14) + ' Mark all read</button>'
                + '<button class="btn btn-danger sm" data-action="notif-clear">' + ic('trash', 14) + ' Clear all</button></div></div>'
                + '<div class="tabs"><button class="' + (NF === 'all' ? 'act' : '') + '" data-action="nf-tab" data-t="all">All (' + all.length + ')</button><button class="' + (NF === 'unread' ? 'act' : '') + '" data-action="nf-tab" data-t="unread">Unread (' + all.filter(n => !n.read).length + ')</button></div></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + (list.length ? '<div class="glass">' + list.map(n => {
                    const t = ti[n.type] || ti.system;
                    return '<div class="notif-it ' + (n.read ? '' : 'unread') + '"><span class="ni" style="color:' + t[1] + ';background:' + t[2] + '">' + ic(t[0], 16) + '</span>'
                        + '<div style="flex:1;min-width:0;cursor:pointer" data-action="notif-open" data-id="' + n.id + '"><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p></div>'
                        + '<span class="tm">' + since(n.created_at) + '</span>' + (n.read ? '' : '<span class="dot v" style="margin-top:6px"></span>') + '</div>'
                }).join('') + '</div>'
                    : emptyState('bell', 'All clear', 'No notifications in this filter right now.', '#/events', 'Browse Events'))
                + '</div>' + consoleFooter();
        }
        function ProfileView() {
            const u = session(); if (!u) return guardLogin();
            const myOrders = db.orders.filter(o => o.userId === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
            return topNav('')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('user', 13) + ' Account Core</span><h1>Profile & Settings</h1></div>'
                + '<div class="wrap grid2" style="padding-bottom:50px;align-items:start">'
                + '<div class="glass" style="padding:26px">'
                + '<div style="display:flex;gap:16px;align-items:center;margin-bottom:22px;flex-wrap:wrap">'
                + '<div style="position:relative;width:60px;height:60px;flex:none">'
                + (u.avatarSeed ? '<img class="avatar" src="' + esc(u.avatarSeed) + '" style="width:60px;height:60px;border-radius:16px">' : '<span class="avatar avx" style="width:60px;height:60px;border-radius:16px;font-size:20px">' + initials(u.name) + '</span>')
                + '<button type="button" data-action="avatar-pick" title="Change photo" style="position:absolute;bottom:-4px;right:-4px;width:24px;height:24px;border-radius:8px;background:var(--vio);display:grid;place-items:center;border:2px solid var(--bg2);color:#fff">' + ic('cam', 12) + '</button>'
                + '<input type="file" id="avatar-input" accept="image/*" style="display:none">'
                + '</div>'
                + '<div><b style="font:700 17px var(--fd)">' + esc(u.name) + '</b><div class="small mut">' + esc(u.email) + '</div>'
                + '<span class="pill ' + (u.role === 'admin' ? 'pill-red' : u.role === 'organizer' ? 'pill-vio' : 'pill-green') + '" style="margin-top:6px">' + u.role + (u.authProvider === 'google' ? ' \u00b7 Google' : '') + '</span></div></div>'
                + '<form data-form="profile">'
                + '<div class="field"><label>Display Name</label><input class="inp" name="name" value="' + esc(u.name) + '" required></div>'
                + '<div class="field"><label>Role Title</label><input class="inp" name="title" value="' + esc(u.title || '') + '"></div>'
                + (u.role === 'organizer' ? '<div class="field"><label>Organization</label><input class="inp" name="org" value="' + esc(u.org || '') + '"></div>' : '')
                + '<button class="btn btn-p" type="submit">' + ic('check', 15) + ' Save Profile</button></form></div>'
                + '<div style="display:flex;flex-direction:column;gap:20px">'
                + '<div class="glass" style="padding:22px"><h3 style="font-size:15px;margin-bottom:12px">Billing & Orders</h3>'
                + (myOrders.length ? '<div style="display:flex;flex-direction:column">' + myOrders.slice(0, 8).map(o => {
                    const ev = db.events.find(e => e.id === o.eventId);
                    return '<div class="row-b" style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div style="min-width:0"><b style="font:600 13px var(--fd);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(ev ? ev.title : '\u2014') + '</b>'
                        + '<div class="small mut">' + fmtMoney(o.total, o.currency) + ' \u00b7 ' + methodLabel(o.method) + (o.txnId ? ' \u00b7 Txn ' + truncHash(o.txnId) : '') + '</div></div>'
                        + '<div style="display:flex;gap:8px;align-items:center">' + payPill(o.status)
                        + (o.status === 'pending' ? '<button class="btn btn-p sm" data-action="pay-resume" data-id="' + o.id + '">Resume</button><button class="btn btn-g sm" data-action="pay-cancel" data-id="' + o.id + '">Cancel</button>' : '')
                        + (o.status === 'paid' && o.registrationId ? '<button class="btn btn-g sm" data-action="tkt-qr" data-id="' + o.registrationId + '">' + ic('qr', 13) + '</button>' : '')
                        + '</div></div>'
                }).join('') + '</div>' : '<p class="small mut">No orders yet \u2014 your payment history will appear here.</p>')
                + '</div>'
                + (u.pw ? '<div class="glass" style="padding:22px"><h3 style="font-size:15px;margin-bottom:16px">Security</h3>'
                    + '<form data-form="password"><div class="field"><label>Current Password</label><div class="pwrap"><input class="inp" name="cur" type="password" id="pw-cur" required><button type="button" class="pw-eye" data-action="pw-toggle" data-target="pw-cur">' + ic('eye', 15) + '</button></div></div>'
                    + '<div class="field"><label>New Password</label><div class="pwrap"><input class="inp" name="nw" type="password" id="pw-nw" minlength="8" required><button type="button" class="pw-eye" data-action="pw-toggle" data-target="pw-nw">' + ic('eye', 15) + '</button></div></div>'
                    + '<button class="btn btn-g" type="submit">' + ic('lock', 15) + ' Update Password</button></form></div>'
                    : '<div class="glass" style="padding:22px"><h3 style="font-size:15px;margin-bottom:10px">Security</h3>'
                    + '<p class="small mut">' + ic('shield', 14) + ' This account is secured by <b style="color:var(--text)">Google Sign-In</b>. Password management is handled by your Google identity \u2014 no separate Eventora password is stored.</p></div>')
                + '<div class="glass" style="padding:22px"><h3 style="font-size:15px;margin-bottom:16px">Notification Preferences</h3>'
                + [['email', 'Email me ticket confirmations & receipts'], ['push', 'Gate & schedule alerts'], ['updates', 'Organizer announcements']].map(p => '<div class="row-b" style="padding:9px 0"><span class="small" style="color:var(--body)">' + p[1] + '</span>'
                    + '<button class="tgl ' + (u.notifPrefs[p[0]] ? 'on' : '') + '" data-action="pref-toggle" data-k="' + p[0] + '" aria-label="Toggle ' + p[0] + '"></button></div>').join('') + '</div>'
                + '<div class="glass" style="padding:22px"><h3 style="font-size:15px;margin-bottom:8px">Session</h3>'
                + '<p class="small mut" style="margin-bottom:14px">Signed in on this device as ' + esc(u.email) + '. Member since ' + fmtDate(u.created_at.slice(0, 10)) + '.</p>'
                + '<button class="btn btn-danger" data-action="signout">' + ic('out', 15) + ' Sign Out</button></div>'
                + '</div></div>' + consoleFooter();
        }
        function OrgDashboard() {
            const u = session(); if (!u) return guardLogin();
            if (u.role !== 'organizer') { location.hash = ROLE_HOME[u.role]; return '' }
            const evs = myEvents(), ids = evs.map(e => e.id);
            const rev = evs.reduce((s, e) => s + evRevenue(e.id), 0);
            const sold = evs.reduce((s, e) => s + evRegs(e.id).length, 0);
            const live = evs.filter(e => { const s = evState(e); return s === 'live' || s === 'upcoming' }).length;
            const checked = db.registrations.filter(r => ids.indexOf(r.eventId) >= 0 && r.status === 'checked_in').length;
            const capSum = evs.reduce((s, e) => s + e.capacity, 0);
            const conv = capSum ? Math.round(sold / capSum * 100) : 0;
            const recent = db.orders.filter(o => ids.indexOf(o.eventId) >= 0 && o.status === 'paid').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
            const tm = tierMixSegs(ids), tmTot = tm.reduce((s, x) => s + x.value, 0);
            const top = [...evs].sort((a, b) => evRevenue(b.id) - evRevenue(a.id)).slice(0, 5).map(e => ({ label: e.title, value: evRevenue(e.id), sub: fmtN(evRegs(e.id).length) + ' sold' }));
            return topNav('odash')
                + '<div class="wrap phead"><div class="badge-row"><span class="pill pill-vio">' + ic('gauge', 12) + ' Organizer Console</span><span class="mono mut">Stage Arena Node #04</span></div>'
                + '<div class="row-b"><h1>Live Operations & Revenue Telemetry</h1>'
                + '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-g" href="#/organizer/attendees">' + ic('users', 15) + ' Attendees</a><a class="btn btn-p" href="#/organizer/events/create">' + ic('plus', 15) + ' Create Event</a></div></div></div>'
                + '<div class="wrap" style="padding-bottom:20px">'
                + '<div class="mgrid mb24">'
                + metricTile({ label: 'Total Revenue', c: '#38bdf8', icon: 'dollar', value: shortMoney(rev), trend: CUR_DEFAULT + ' equiv.', tc: 'var(--green)', cap: 'Across ' + evs.length + ' events on this node', bar: Math.min(100, rev / 200000 * 100) })
                + metricTile({ label: 'Tickets Sold', c: '#a5b4fc', icon: 'ticket', value: fmtN(sold), cap: fmtN(checked) + ' checked in (' + (sold ? Math.round(checked / sold * 100) : 0) + '%)', bar: sold ? Math.round(checked / sold * 100) : 0, bc: 'vio' })
                + metricTile({ label: 'Active Events', c: '#f472b6', icon: 'radio', value: live + ' <small>/ ' + evs.length + '</small>', cap: 'Upcoming & live arenas', bar: evs.length ? Math.round(live / evs.length * 100) : 0, bc: 'mag' })
                + metricTile({ label: 'Inventory Conversion', c: '#38bdf8', icon: 'gauge', value: conv + '%', cap: 'Tickets sold vs listed capacity', bar: conv })
                + '</div>'
                + '<div class="grid2 mb24">'
                + chartCard('Ticketing Velocity', 'Gross revenue settled \u00b7 last 14 days (' + CUR + ' BDT)', areaChart(revPerDay(ids, 14), { fmt: shortMoney, tipFmt: 'money', color: '#818cf8', aria: 'Revenue over the last 14 days' }), '<span class="pill pill-live"><span class="dot g pulse"></span>Live</span>')
                + chartCard('Passes by Tier', 'Confirmed passes across your portfolio', donutChart(tm, { center: fmtN(tmTot), centerLabel: 'passes' }))
                + '</div>'
                + '<div class="grid2 mb24" style="grid-template-columns:1.5fr 1fr">'
                + chartCard('Top Events by Revenue', 'All-time settled gross per event (' + CUR + ')', evs.length ? hbarList(top, { fmt: fmtMoney }) : '<p class="mut small">Create your first event to see analytics.</p>', '<a class="btn btn-g sm" href="#/organizer/events">All events</a>')
                + '<div class="glass" style="padding:22px"><h3 style="font-size:15.5px;font-weight:700" class="mb16">Recent Verified Sales</h3>'
                + (recent.map(o => {
                    const r = db.registrations.find(x => x.id === o.registrationId), ev = db.events.find(e => e.id === o.eventId);
                    return '<div class="row-b" style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div><b style="font:600 13px var(--fd)">' + esc(r ? r.attendeeName : '\u2014') + '</b><div class="small mut">' + esc(ev ? ev.title : '') + ' \u00b7 ' + esc(r ? r.tierName : '') + '</div></div><b class="tnum" style="color:var(--green);font:700 13px var(--fd)">' + (o.total === 0 ? 'Free' : fmtMoney(o.total, o.currency)) + '</b></div>'
                }).join('') || '<p class="mut small">No verified sales yet.</p>') + '</div></div>'
                + '</div>' + consoleFooter();
        }
        function OrgEvents() {
            const u = session(); if (!u) return guardLogin();
            if (u.role !== 'organizer') { location.hash = ROLE_HOME[u.role]; return '' }
            const evs = myEvents();
            return topNav('oevents')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('layers', 13) + ' Event Management</span>'
                + '<div class="row-b"><h1>My Events</h1><a class="btn btn-p" href="#/organizer/events/create">' + ic('plus', 15) + ' Create Event</a></div></div>'
                + '<div class="wrap" style="padding-bottom:30px">'
                + '<div class="glass tablewrap"><table class="dtable"><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Sold / Capacity</th><th>Revenue</th><th style="text-align:right">Actions</th></tr></thead>'
                + '<tbody>' + (evs.map(ev => {
                    const soldN = evRegs(ev.id).length, pct = ev.capacity ? Math.round(soldN / ev.capacity * 100) : 0;
                    return '<tr>'
                        + '<td><div class="att"><img src="' + coverOf(ev) + '" class="avatar" style="width:44px;height:32px;border-radius:6px" alt=""><div><div class="nm">' + esc(ev.title) + '</div><div class="em">' + esc(ev.venue) + '</div></div></div></td>'
                        + '<td class="mut">' + fmtDate(ev.startDate) + '</td>'
                        + '<td>' + statePill(ev) + '</td>'
                        + '<td style="min-width:150px"><div class="row-b small mut" style="margin-bottom:5px"><span class="tnum">' + fmtN(soldN) + ' / ' + fmtN(ev.capacity) + '</span></div><div class="pbar vio"><i style="width:' + pct + '%"></i></div></td>'
                        + '<td class="tnum" style="font-weight:600">' + (evRevenue(ev.id) === 0 ? 'Free tier' : fmtMoney(evRevenue(ev.id))) + '</td>'
                        + '<td style="text-align:right"><div class="dd-wrap" style="display:inline-block"><button class="kebab" data-dd aria-label="Event actions">' + ic('more', 16) + '</button>'
                        + '<div class="dd"><button class="dd-it" data-go="#/event/' + ev.id + '">' + ic('eye', 14) + ' View Public Page</button>'
                        + '<button class="dd-it" data-go="#/organizer/attendees?event=' + ev.id + '">' + ic('users', 14) + ' Manage Attendees</button>'
                        + '<button class="dd-it" data-go="#/organizer/events/' + ev.id + '/edit">' + ic('edit', 14) + ' Edit Event</button>'
                        + '<button class="dd-it" data-go="#/organizer/run-of-show?event=' + ev.id + '">' + ic('cal', 14) + ' Run of Show</button>'
                        + '<button class="dd-it" data-action="ev-publish" data-id="' + ev.id + '">' + ic('zap', 14) + ' ' + (ev.status === 'draft' ? 'Publish Event' : 'Unpublish to Draft') + '</button>'
                        + '<div class="dd-sep"></div><button class="dd-it danger" data-action="ev-delete" data-id="' + ev.id + '">' + ic('trash', 14) + ' Delete Event</button></div></div></td></tr>'
                }).join('')
                    || '<tr><td colspan="6">' + emptyState('cal', 'No events yet', 'Launch the wizard to build your first arena.', '#/organizer/events/create', 'Create New Event') + '</td></tr>') + '</tbody></table></div></div>' + consoleFooter();
        }
        function OrgAnalytics() {
            const u = session(); if (!u) return guardLogin();
            if (u.role !== 'organizer') { location.hash = ROLE_HOME[u.role]; return '' }
            const evs = myEvents(), ids = evs.map(e => e.id);
            const byEv = evs.map(e => ({ label: e.title, value: evRegs(e.id).length })).sort((a, b) => b.value - a.value);
            const tm = tierMixSegs(ids), tmTot = tm.reduce((s, x) => s + x.value, 0);
            const cm = catMixSegs(ids);
            const phases = eventPhaseMix(evs), phTot = phases.reduce((s, x) => s + x.value, 0);
            const totalViews = evs.reduce((s, e) => s + e.capacity, 0);
            const conv = totalViews ? Math.round(evs.reduce((s, e) => s + evRegs(e.id).length, 0) / totalViews * 100) : 0;
            const paidOs = db.orders.filter(o => ids.indexOf(o.eventId) >= 0 && o.status === 'paid' && o.total > 0);
            const aov = paidOs.length ? fmtMoney(paidOs.reduce((s, o) => s + o.total, 0) / paidOs.length) : '\u2014';
            return topNav('oanalytics')
                + '<div class="wrap phead"><span class="eyebrow">' + ic('activity', 13) + ' Analytics</span><h1>Performance Analytics</h1>'
                + '<p class="sub">Revenue concentration, tier mix and conversion across your portfolio \u2014 computed live from the order ledger in ' + CUR + ' BDT.</p></div>'
                + '<div class="wrap" style="padding-bottom:40px">'
                + '<div class="mgrid mb24">'
                + metricTile({ label: 'Portfolio Revenue', c: '#38bdf8', icon: 'dollar', value: shortMoney(evs.reduce((s, e) => s + evRevenue(e.id), 0)), cap: evs.length + ' events tracked \u00b7 ' + CUR_DEFAULT + ' equiv.' })
                + metricTile({ label: 'Passes Issued', c: '#a5b4fc', icon: 'ticket', value: fmtN(tmTot), cap: 'Across all tiers & events' })
                + metricTile({ label: 'Inventory Conversion', c: '#f0abfc', icon: 'gauge', value: conv + '%', cap: 'Registrations vs listed capacity', bar: conv, bc: 'mag' })
                + metricTile({ label: 'Avg Order Value', c: '#38bdf8', icon: 'bank', value: aov, cap: 'Paid orders only' })
                + '</div>'
                + '<div class="grid2 mb24">'
                + chartCard('Registrations Over Time', 'Confirmed passes per day \u00b7 last 30 days', areaChart(regsPerDay(ids, 30), { fmt: shortMoney, tipFmt: 'num', color: '#38bdf8', aria: 'Registrations over the last 30 days' }))
                + chartCard('Attendees by Category', 'Where your audience comes from', donutChart(cm, { center: fmtN(tmTot), centerLabel: 'passes' }))
                + '</div>'
                + '<div class="grid2 mb24">'
                + chartCard('Event Performance', 'Registrations per event', barChartV(byEv, { fmt: fmtN, tipFmt: 'num', color: '#818cf8', aria: 'Registrations per event' }))
                + chartCard('Portfolio Phases', 'Upcoming vs live vs completed events', donutChart(phases, { center: fmtN(phTot), centerLabel: 'events' }))
                + '</div>'
                + '<div class="grid2">'
                + chartCard('Revenue Over Time', 'Settled gross per day \u00b7 last 30 days (' + CUR + ')', areaChart(revPerDay(ids, 30), { fmt: shortMoney, tipFmt: 'money', color: '#34d399', aria: 'Revenue over the last 30 days' }))
                + chartCard('Tier Mix', 'Passes by ticket tier', donutChart(tm, { center: fmtN(tmTot), centerLabel: 'passes' }))
                + '</div></div>' + consoleFooter();
        }
        function RunOfShowView(q) {
            const u = session(); if (!u) return guardLogin();
            if (u.role !== 'organizer') { location.hash = ROLE_HOME[u.role]; return '' }
            const evs = myEvents().filter(e => e.status !== 'draft');
            ROS_EV = evs.find(e => e.id === q.get('event')) || (ROS_EV && evs.find(e => e.id === ROS_EV)) || evs[0] || null;
            const sched = ROS_EV ? evSchedule(ROS_EV.id) : [], spk = ROS_EV ? evSpeakers(ROS_EV.id) : [];
            const days = [...new Set(sched.map(s => s.day))].sort();
            return topNav('')
                + '<div class="wrap phead"><div class="row-b"><div><span class="eyebrow">' + ic('cal', 13) + ' Run of Show Builder</span><h1 class="h1-page">Stage Schedule & Agenda</h1>'
                + '<p class="sub">Anchor keynotes, panels and mixers to the stage grid \u2014 updates sync to every attendee wallet instantly.</p></div>'
                + (evs.length > 1 ? '<div class="dd-wrap"><button class="btn btn-g" data-dd>' + ic('layers', 15) + ' Switch Event ' + ic('chevD', 14) + '</button>'
                    + '<div class="dd" style="left:0;right:auto">' + evs.map(e => '<button class="dd-it" data-action="ros-ev" data-id="' + e.id + '"><span class="dot ' + (evLive(e) ? 'g pulse' : 'off') + '"></span> ' + esc(e.title) + '</button>').join('') + '</div></div>' : '') + '</div></div>'
                + '<div class="wrap grid2" style="padding-bottom:40px;align-items:start">'
                + '<div class="glass" style="padding:22px"><div class="row-b mb16"><h3 style="font-size:16px">Schedule \u2014 ' + (ROS_EV ? esc(ROS_EV.title) : '') + '</h3><span class="pill pill-mut">' + sched.length + ' items</span></div>'
                + (days.length ? days.map(day => '<div class="sched-day"><b>Day ' + day + ' \u2014 ' + fmtDate(day === 1 ? ROS_EV.startDate : ROS_EV.endDate) + '</b><div class="glass" style="margin-bottom:14px">' + sched.filter(s => s.day === day).map(s => '<div class="sitem"><span class="tm">' + esc(s.time) + '</span><div style="flex:1"><div class="tt">' + esc(s.title) + '</div><div class="lc">' + ic('pin', 12) + ' ' + esc(s.location) + '</div></div><button class="kebab" data-action="ros-del" data-id="' + s.id + '" aria-label="Delete session">' + ic('trash', 14) + '</button></div>').join('') + '</div></div>').join('')
                    : emptyState('cal', 'Empty stage grid', 'Add your first agenda block below.', '', ''))
                + (ROS_EV ? '<form data-form="ros-add" style="margin-top:18px"><label class="f-label">Add Agenda Block</label>'
                    + '<div class="sched-row" style="margin-bottom:12px">'
                    + '<div><label class="f-label">Day</label><select class="inp" name="day">' + [1, 2, 3, 4].map(n => '<option>' + n + '</option>').join('') + '</select></div>'
                    + '<div><label class="f-label">Time</label><input class="inp" name="time" placeholder="09:30" required></div>'
                    + '<div><label class="f-label">Session Title</label><input class="inp" name="title" placeholder="Opening Keynote" required></div>'
                    + '<div><label class="f-label">Location</label><input class="inp" name="loc" placeholder="Main Plenary Hall"></div>'
                    + '<button class="btn btn-p" type="submit">' + ic('plus', 15) + '</button></div></form>'
                    : '<p class="mut small">' + ic('info', 13) + ' Publish an event to build its run of show.</p>') + '</div>'
                + '<div class="glass" style="padding:22px"><div class="row-b mb16"><h3 style="font-size:16px">Speakers & Voices</h3><span class="pill pill-mut">' + spk.length + ' listed</span></div>'
                + '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">'
                + (spk.map(s => '<div class="glass spk" style="background:rgba(255,255,255,.03)"><img class="avatar" src="' + s.seed + '" style="width:42px;height:42px;border-radius:11px" alt=""><div style="flex:1"><b>' + esc(s.name) + '</b><span>' + esc(s.role) + ' \u00b7 ' + esc(s.org) + '</span></div><button class="kebab" data-action="ros-speaker-del" data-id="' + s.id + '" aria-label="Remove speaker">' + ic('trash', 14) + '</button></div>').join('') || '<p class="mut small mb16">No speakers listed yet.</p>') + '</div>'
                + (ROS_EV ? '<form data-form="speaker-add"><label class="f-label">Add Speaker</label><div class="spk-edit">'
                    + '<div><label class="f-label">Name</label><input class="inp" name="name" placeholder="Dr. Selin Aksoy" required></div>'
                    + '<div><label class="f-label">Role</label><input class="inp" name="role" placeholder="Chief Quantum Architect"></div>'
                    + '<div><label class="f-label">Organization</label><input class="inp" name="org" placeholder="Aether Dynamics"></div>'
                    + '<button class="btn btn-p" type="submit">' + ic('plus', 15) + '</button></div></form>' : '') + '</div>'
                + '</div>' + consoleFooter();
        }
        function DirectoryView(q) {
            const u = session(); if (!u) return guardLogin();
            if (u.role !== 'organizer') { location.hash = ROLE_HOME[u.role]; return '' }
            const evs = myEvents().filter(e => e.status !== 'draft');
            const qe = q.get('event');
            DS.eventId = (qe && evs.find(e => e.id === qe)) ? (qe) : (evs.find(e => e.id === DS.eventId) ? DS.eventId : (evs[0] ? evs[0].id : null));
            DS.page = 1; DS.sel = {};
            const ev = db.events.find(e => e.id === DS.eventId);
            const regs = ev ? evRegs(ev.id) : [];
            const checked = regs.filter(r => r.status === 'checked_in').length;
            const vipReg = regs.filter(r => r.tierName.includes('VIP'));
            const vipIn = vipReg.filter(r => r.status === 'checked_in').length;
            const occ = vipReg.length ? Math.round(vipIn / vipReg.length * 100) : 0;
            const occHigh = occ >= 80;
            const rfidElig = regs.filter(r => r.tierName !== 'Virtual').length;
            const rfidOn = regs.filter(r => r.rfid).length;
            after(() => {
                const qi = document.getElementById('dir-q');
                if (qi) qi.addEventListener('input', deb(e => { DS.q = e.target.value; DS.page = 1; dirDraw() }, 150));
            });
            return topNav('')
                + '<div class="wrap phead"><div class="row-b" style="align-items:flex-start">'
                + '<div><div class="badge-row" style="margin-bottom:10px"><span class="pill pill-vio"><span class="dot g pulse"></span>Operational Console</span><span class="mono mut">Stage Arena Node #04</span></div>'
                + '<h1 class="h1-xl" style="max-width:560px;margin:10px 0 0">Event Management & Attendee Directory</h1></div>'
                + '<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end">'
                + (evs.length ? '<div class="dd-wrap"><button class="btn btn-g" data-dd style="height:48px;min-width:280px;justify-content:flex-start"><span class="dot g pulse"></span><span style="text-align:left;flex:1"><b style="display:block;font-size:13.5px">' + esc(ev ? ev.title : '') + '</b><span class="small mut">' + (ev ? statePill(ev) : '') + '</span></span>' + ic('chevD', 15) + '</button>'
                    + '<div class="dd" style="left:0;right:auto;min-width:300px">' + evs.map(e => '<button class="dd-it" data-action="dir-set-event" data-id="' + e.id + '"><span class="dot ' + (evLive(e) ? 'g pulse' : 'off') + '"></span><span style="flex:1"><b style="display:block;font-size:13px">' + esc(e.title) + '</b><span class="small mut">' + fmtDate(e.startDate) + '</span></span>' + (DS.eventId === e.id ? ic('check', 14) : '') + '</button>').join('') + '</div></div>'
                    + '<button class="btn btn-g" data-action="export-manifest">' + ic('dl', 15) + ' Export Manifest (CSV)</button>'
                    + '<a class="btn btn-p" href="#/organizer/events/create" style="width:100%">' + ic('plus', 15) + ' + Create New Event</a>'
                    : '<a class="btn btn-p" href="#/organizer/events/create">' + ic('plus', 15) + ' + Create New Event</a>') + '</div></div></div>'
                + (ev ? '<div class="wrap" style="padding-bottom:30px">'
                    + '<div class="mgrid mb24">'
                    + metricTile({ label: 'Passes Issued', c: '#38bdf8', icon: 'ticket', value: fmtN(regs.length), cap: 'Confirmed passes for this event \u00b7 ' + fmtN(ev.capacity) + ' capacity', bar: ev.capacity ? Math.min(100, regs.length / ev.capacity * 100) : 0 })
                    + metricTile({ label: 'Lounge Occupancy', c: '#f472b6', icon: 'door', value: occ + '% <span class="trend" style="color:' + (occHigh ? 'var(--amber)' : 'var(--green)') + '">' + (occHigh ? '\u25b3 High Load' : '\u25b3 Nominal') + '</span>', cap: 'VIP Lounge Saturation: ' + fmtN(vipIn) + ' / ' + fmtN(vipReg.length) + ' capacity', bar: occ, bc: 'mag' })
                    + metricTile({ label: 'In-Venue Count', c: '#a5b4fc', icon: 'users', value: fmtN(checked) + ' <small>/ ' + fmtN(regs.length) + '</small>', cap: (regs.length ? Math.round(checked / regs.length * 100) : 0) + '% overall venue check-in completed', bar: regs.length ? checked / regs.length * 100 : 0, bc: 'vio' })
                    + metricTile({ label: 'RFID Lanyards', c: '#38bdf8', icon: 'radio', value: fmtN(rfidOn) + ' <small>/ ' + fmtN(rfidElig) + '</small>', cap: 'RFID-enabled lanyards synchronized', bar: rfidElig ? rfidOn / rfidElig * 100 : 0, bc: 'grn' })
                    + '</div>'
                    + '<div class="glass" style="padding:16px 18px;margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">'
                    + '<div style="position:relative;flex:1;min-width:240px"><span class="in-ic">' + ic('search', 15) + '</span><input class="inp has-ic" id="dir-q" placeholder="Search attendee name, email, or ticket hash ID\u2026"></div>'
                    + '<span class="f-label" style="margin:0">Ticket Tier:</span>'
                    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
                    + '<button class="chip-f ' + (DS.tier === 'all' ? 'act' : '') + '" data-action="dir-tier" data-t="all">All Tiers</button>'
                    + '<button class="chip-f ' + (DS.tier === 'vip' ? 'act' : '') + '" data-action="dir-tier" data-t="vip"><span class="dot a"></span> VIP All-Access</button>'
                    + '<button class="chip-f ' + (DS.tier === 'std' ? 'act' : '') + '" data-action="dir-tier" data-t="std"><span class="dot v"></span> Standard</button>'
                    + '<button class="chip-f ' + (DS.tier === 'vir' ? 'act' : '') + '" data-action="dir-tier" data-t="vir"><span class="dot c"></span> Virtual</button></div></div>'
                    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><span class="f-label" style="margin:0">Status:</span><span id="dir-status-pills" style="display:inline-flex;gap:6px;flex-wrap:wrap"></span></div>'
                    + '<div class="glass tablewrap"><table class="dtable"><thead><tr>'
                    + '<th style="width:40px"><input type="checkbox" class="cbx" id="dir-all" title="Select page"></th>'
                    + '<th>Attendee Profile</th><th>Ticket Tier</th><th>Pass ID / Cryptographic Hash</th><th>Check-In Status</th><th>Settlement</th><th>RFID Lanyard</th><th>Actions</th></tr></thead>'
                    + '<tbody id="dir-tbody"></tbody></table>'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-top:1px solid var(--line);flex-wrap:wrap;gap:12px">'
                    + '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><span class="pill pill-green"><span class="dot g"></span>Directory Synced</span><span class="small mut" id="dir-count"></span><span id="dir-selinfo" class="pill pill-vio" style="display:none"></span></div>'
                    + '<div class="pgn" id="dir-pgn"></div></div></div></div>'
                    : '<div class="wrap" style="padding-bottom:60px">' + emptyState('users', 'No events on this node yet', 'Create your first event to open the attendee directory.', '#/organizer/events/create', 'Create New Event') + '</div>')
                + consoleFooter();
        }
        function dirFiltered() {
            const ev = db.events.find(e => e.id === DS.eventId); if (!ev) return [];
            let list = evRegs(ev.id);
            if (DS.tier === 'vip') list = list.filter(r => r.tierName.includes('VIP'));
            if (DS.tier === 'std') list = list.filter(r => !r.tierName.includes('VIP') && r.tierName !== 'Virtual');
            if (DS.tier === 'vir') list = list.filter(r => r.tierName === 'Virtual');
            if (DS.status !== 'all') list = list.filter(r => DS.status === 'awaiting' ? r.status === 'confirmed' || r.status === 'vip_pending' : r.status === DS.status);
            if (DS.q) { const q = DS.q.toLowerCase(); list = list.filter(r => (r.attendeeName + ' ' + r.attendeeEmail + ' ' + r.passId).toLowerCase().includes(q)) }
            return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
        function dirDraw() {
            const all = evRegs(DS.eventId);
            const st = { all: all.length, confirmed: all.filter(r => r.status === 'confirmed').length, checked_in: all.filter(r => r.status === 'checked_in').length, vip_pending: all.filter(r => r.status === 'vip_pending').length, refunded: db.registrations.filter(r => r.eventId === DS.eventId && r.status === 'refunded').length };
            const sp = document.getElementById('dir-status-pills'); if (!sp) return;
            sp.innerHTML = [['all', 'All', ''], ['confirmed', 'Confirmed', ''], ['checked_in', 'Checked In', '<span class="dot g"></span> '], ['vip_pending', 'VIP Pending', '<span class="dot a"></span> '], ['refunded', 'Refunded', '']].map(s => '<button class="chip-f ' + (DS.status === s[0] ? 'act' : '') + '" data-action="dir-status" data-s="' + s[0] + '">' + s[2] + s[1] + ' (' + fmtN(st[s[0]]) + ')</button>').join('');
            const list = dirFiltered();
            const pages = Math.max(1, Math.ceil(list.length / DS.per));
            DS.page = Math.min(DS.page, pages);
            const rows = list.slice((DS.page - 1) * DS.per, DS.page * DS.per);
            document.getElementById('dir-tbody').innerHTML = rows.map(r => {
                const inName = r.tierName.includes('VIP');
                const tierCls = inName ? 'tier-vip' : r.tierName === 'Virtual' ? 'tier-vir' : 'tier-std';
                const ord = db.orders.find(o => o.registrationId === r.id);
                const checkedIn = r.status === 'checked_in';
                const ckTxt = checkedIn ? 'Checked In ' + (r.checkInTime || '') : r.status === 'vip_pending' ? 'VIP Pending' : r.status === 'refunded' ? 'Refunded' : 'Awaiting Check-in';
                return '<tr class="' + (DS.sel[r.id] ? 'sel' : '') + '">'
                    + '<td><input type="checkbox" class="cbx dir-ck" data-id="' + r.id + '" ' + (DS.sel[r.id] ? 'checked' : '') + ' aria-label="Select ' + esc(r.attendeeName) + '"></td>'
                    + '<td><div class="att"><img class="avatar" src="' + pic((r.attendeeName || 'g').toLowerCase().replace(/[^a-z]/g, '') || 'g', 80, 80) + '" alt=""><div><div class="nm">' + esc(r.attendeeName) + '</div><div class="em">' + esc(r.attendeeEmail) + '</div></div></div></td>'
                    + '<td><span class="tier-b ' + tierCls + '">' + (inName ? ic('crown', 12) : ic('ticket', 12)) + ' ' + esc(r.tierName) + '</span></td>'
                    + '<td><span class="mono" style="color:#7dd3fc">' + truncHash(r.passId) + '</span></td>'
                    + '<td><div class="ckcell"><span style="display:flex;align-items:center;gap:8px"><span class="dot ' + (checkedIn ? 'g' : 'a') + '"></span>' + ckTxt + '</span><span class="sub">' + esc(r.gate || (r.tierName === 'Virtual' ? 'Virtual Stream Node' : 'Expected Gate 1')) + '</span></div></td>'
                    + '<td><div class="settle tnum">' + (ord ? (ord.total === 0 ? 'Free' : fmtMoney(ord.total)) : '\u2014') + '<div class="paid">' + (ord && ord.status === 'refunded' ? '\u21ba Refunded' : ic('check', 11) + ' Paid (' + methodLabel(ord ? ord.method : 'Stripe') + ')') + '</div></div></td>'
                    + '<td><button class="tgl ' + (r.rfid ? 'on' : '') + '" data-action="dir-rfid" data-id="' + r.id + '" ' + (r.tierName === 'Virtual' ? 'disabled' : '') + ' aria-label="Toggle RFID"></button></td>'
                    + '<td><div class="dd-wrap" style="display:inline-block"><button class="kebab" data-dd aria-label="Attendee actions">' + ic('more', 16) + '</button>'
                    + '<div class="dd"><button class="dd-it" data-action="dir-qr" data-id="' + r.id + '">' + ic('qr', 14) + ' View Pass QR</button>'
                    + '<button class="dd-it" data-action="dir-resend" data-id="' + r.id + '">' + ic('mail', 14) + ' Resend Email</button>'
                    + '<button class="dd-it" data-action="dir-reassign" data-id="' + r.id + '">' + ic('refresh', 14) + ' Reassign Tier</button>'
                    + (!checkedIn && r.status !== 'refunded' ? '<button class="dd-it" data-action="dir-checkin" data-id="' + r.id + '">' + ic('check', 14) + ' Manual Check-In</button>' : '')
                    + (r.status !== 'refunded' ? '<div class="dd-sep"></div><button class="dd-it danger" data-action="dir-refund" data-id="' + r.id + '">' + ic('ban', 14) + ' Refund Pass</button>' : '') + '</div></div></td></tr>';
            }).join('') || '<tr><td colspan="8"><div class="empty"><b>No attendees match</b><p>Adjust the search or filters.</p></div></td></tr>';
            document.getElementById('dir-count').innerHTML = 'Showing <b style="color:var(--text)">' + rows.length + '</b> of <b style="color:var(--text)">' + fmtN(list.length) + '</b> Verified Attendees';
            const selN = Object.keys(DS.sel).length;
            const si = document.getElementById('dir-selinfo'); si.style.display = selN ? 'inline-flex' : 'none'; si.textContent = selN + ' selected';
            let pg = ''; const add = (l, p, dis, cur) => pg += '<button data-action="dir-page" data-p="' + p + '" ' + (dis ? 'disabled' : '') + ' class="' + (cur ? 'cur' : '') + '">' + l + '</button>';
            add('<span style="display:flex;align-items:center;gap:4px">' + ic('chevL', 13) + ' Previous</span>', DS.page - 1, DS.page <= 1, false);
            const win = [];
            for (let i = 1; i <= pages; i++) { if (i <= 3 || i > pages - 2 || Math.abs(i - DS.page) <= 1) win.push(i); else if (win[win.length - 1] !== '\u2026') win.push('\u2026') }
            win.forEach(w => { if (w === '\u2026') pg += '<span class="mut" style="padding:0 4px">\u2026</span>'; else add(w, w, false, w === DS.page) });
            add('Next ' + ic('chevR', 13), DS.page + 1, DS.page >= pages, false);
            document.getElementById('dir-pgn').innerHTML = pg;
            const allCk = document.getElementById('dir-all'); if (allCk) allCk.checked = rows.length > 0 && rows.every(r => DS.sel[r.id]);
        }
        const W_STEPS = ['Basic Info', 'Date & Venue', 'Ticket Tiers & Pricing', 'Run-of-Show & Speakers', 'Review & Telemetry'];
        const W_THEMES = ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b'];
        function blankWiz() {
            return {
                id: null, step: 1, title: '', category: 'tech-ai', subtitle: '', description: '', cover: null, theme: '#6366f1', deliveryMode: 'in-person', hub: 'dhaka', venue: '', hall: '', startDate: '', endDate: '', doors: '09:00', timezone: 'Asia/Dhaka', capacity: 5000, currency: guessCurrency(),
                tiers: [{ id: uid('t'), name: 'VIP All-Access', price: 18000, qty: 300, perks: 'Front-row plenary \u00b7 VIP Lounge \u00b7 NFC Encircle', vip: true }, { id: uid('t'), name: 'Standard', price: 6000, qty: 1500, perks: 'Main arena seating \u00b7 all keynotes', vip: false }, { id: uid('t'), name: 'Free RSVP', price: 0, qty: 500, perks: 'General entry \u2014 free community access', vip: false }],
                schedule: [{ day: 1, time: '09:30', title: 'Opening Keynote', location: 'Main Plenary Hall' }], speakers: []
            };
        }
        function startWizard(editId) {
            const u = session(); if (!u) return false;
            if (u.role !== 'organizer' && u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return false }
            if (editId) {
                if (RENDER_SAME && W && W.id === editId) return true;
                const ev = db.events.find(e => e.id === editId);
                if (!ev || (ev.organizerId !== u.id && u.role !== 'admin')) { toast('Event not found in your workspace.', 'warn'); location.hash = '#/organizer/events'; return false }
                W = Object.assign(blankWiz(), JSON.parse(JSON.stringify(ev)));
                W.tiers = evTiers(ev).map(t => ({ id: t.id, name: t.name, price: t.price, qty: t.quantity, perks: t.perks, vip: !!t.vip }));
                W.schedule = evSchedule(ev.id).map(s => ({ day: s.day, time: s.time, title: s.title, location: s.location }));
                W.speakers = evSpeakers(ev.id).map(s => ({ name: s.name, role: s.role, org: s.org }));
                W.cover = ev.cover; W.step = 1;
            } else {
                if (!(RENDER_SAME && W)) W = blankWiz();
            }
            return true;
        }
        function WizardView(editId) {
            if (!startWizard(editId)) return '';
            after(wizAfter);
            return topNav('ocreate')
                + '<div class="wrap" style="padding-bottom:110px">'
                + '<div style="padding:26px 0 0">'
                + '<div class="crumb"><a href="#/organizer/events">My Events</a>' + ic('chevR', 12) + ' <span style="color:var(--body)">' + (W.id ? 'Edit Experience' : 'New Experience Builder') + '</span></div>'
                + '<div class="row-b" style="margin-top:8px"><div>'
                + '<div class="badge-row" style="margin-bottom:8px"><h1 class="h1-page" style="margin:0">Create High-Stakes Summit or Arena Event</h1><span class="pill pill-vio">v4.2 Pro Engine</span></div>'
                + '<p class="sub">Configure global synchronization parameters, physical arena zoning, and real-time broadcast infrastructure.</p></div>'
                + '<span class="syspill"><span class="dot c pulse"></span>Latency Sync 12.4ms \u00b7 Global Mesh</span></div></div>'
                + '<div class="glass wsteps">' + W_STEPS.map((l, i) => '<div class="wstep ' + (W.step === i + 1 ? 'act' : '') + ' ' + (W.step > i + 1 ? 'done' : '') + '" data-action="wiz-goto" data-s="' + (i + 1) + '">'
                    + '<span class="wnum">' + (W.step > i + 1 ? ic('check', 13) : String(i + 1).padStart(2, '0')) + '</span>'
                    + '<span class="wl"><label>STEP ' + (i + 1) + '</label><span>' + l + '</span></span></div>').join('') + '</div>'
                + '<div class="wiz-grid" id="wiz-root"><div>' + wizStep() + '</div><div class="wiz-side">' + wizSide() + '</div></div></div>'
                + '<div class="wiz-foot"><div class="wrap wiz-foot-in">'
                + '<span class="autosave"><span class="dot g pulse"></span><span id="wiz-save">Auto-saved to cloud node: just now</span></span>'
                + '<div class="rt"><button class="btn btn-g" data-action="wiz-save-draft">' + ic('dl', 15) + ' Save Draft</button>'
                + '<button class="btn btn-g" data-action="wiz-preview">' + ic('eye', 15) + ' Live Preview</button>'
                + '<button class="btn btn-p" data-action="' + (W.step === 5 ? 'wiz-publish' : 'wiz-next') + '" id="wiz-continue">' + (W.step === 5 ? ic('zap', 15) + ' Publish Event' : 'Continue to ' + esc(W_STEPS[W.step]) + ' ' + ic('arrR', 15)) + '</button></div>'
                + '</div></div>' + consoleFooter();
        }
        function wizStep() {
            const c = catOf(W.category);
            if (W.step === 1) return '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#a5b4fc;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.35)">' + ic('edit', 17) + '</span>'
                + '<div><h3>1. Event Basics</h3><p>Core taxonomy, summit designations, and contextual narrative.</p></div>'
                + '<span class="badge-r"><span class="wbadge">Config-ID: ' + esc(W.id ? 'EVNT-' + W.id.slice(-4).toUpperCase() : 'PENDING') + '</span></span></div>'
                + '<div class="field"><label>Event Title <span class="mut" id="wiz-cc">' + (W.title || '').length + ' / 80 chars</span></label>'
                + '<input class="inp" data-wf="title" maxlength="80" value="' + esc(W.title) + '" placeholder="AI & Quantum Systems World Congress 2026"></div>'
                + '<div class="field"><label>Category Classification</label><div class="cat-chips">' + db.categories.map(cat => '<button type="button" class="chip-f ' + (W.category === cat.id ? 'act' : '') + '" data-action="wiz-cat" data-c="' + cat.id + '">' + ic(cat.icon, 13) + ' ' + esc(cat.name) + '</button>').join('') + '</div></div>'
                + '<div class="field"><label>Executive Subtitle</label><input class="inp" data-wf="subtitle" value="' + esc(W.subtitle) + '" placeholder="The Definitive Assembly of \u2026"></div>'
                + '<div class="field" style="margin-bottom:0"><label>Event Description & Operational Directive</label>'
                + '<div class="toolbar"><button type="button"><b>B</b></button><button type="button"><i>I</i></button><button type="button">\u2261</button><span class="md-ok"><span class="dot g pulse"></span>Markdown Synced</span></div>'
                + '<textarea class="inp" data-wf="description" rows="5" placeholder="Over two intensive days at the Global Arena\u2026" style="border-radius:0 0 8px 8px">' + esc(W.description) + '</textarea></div></div>'
                + '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#f0abfc;background:rgba(236,72,153,.1);border-color:rgba(236,72,153,.35)">' + ic('cam', 17) + '</span>'
                + '<div><h3>2. Visual Assets & Branding</h3><p>Holographic badge aesthetics, stream keyframes, and chromatic palette.</p></div>'
                + '<span class="badge-r"><span class="wbadge">Recommended: 3840 \u00d7 2160 (16:9)</span></span></div>'
                + '<div class="drop ' + (W.cover ? 'drop-prev' : '') + '" id="wiz-drop" data-action="wiz-browse">'
                + (W.cover ? '<img src="' + W.cover + '" alt="Event cover"><div style="flex:1;min-width:200px"><b>Cover & keyframe locked in</b><p class="mut small">High-fidelity visual synced to the ticket portal preview.</p><div class="drop-btns"><button type="button" class="btn btn-g sm" data-action="wiz-browse">' + ic('image', 14) + ' Replace File</button><button type="button" class="btn btn-g sm" data-action="wiz-gen-cover">' + ic('spark', 14) + ' Generate with Eventora AI</button></div></div>'
                    : '<div class="di">' + ic('cloud', 24) + '</div><b>Drop your high-fidelity Cover & Keyframe Visual here</b><p>Supports HDR PNG, ProRes still, or web-optimized assets. Auto-optimized for arena stream mesh telemetry.</p><div class="drop-btns"><button type="button" class="btn btn-g sm" data-action="wiz-browse">' + ic('image', 14) + ' Browse Files</button><button type="button" class="btn btn-g sm" data-action="wiz-gen-cover">' + ic('spark', 14) + ' Generate with Eventora AI</button></div>') + '</div>'
                + '<input type="file" id="wiz-file" accept="image/*" style="display:none">'
                + '<div class="grid2 mt24" style="grid-template-columns:1.2fr .8fr">'
                + '<div><label class="f-label">Event Chromatic Signature & Lighting Theme</label>'
                + '<div class="swatches">' + W_THEMES.map(tc => '<button type="button" class="sw ' + (W.theme === tc ? 'act' : '') + '" style="background:' + tc + '" data-action="wiz-theme" data-c="' + tc + '" aria-label="Theme ' + tc + '"></button>').join('') + '<span class="swatch-hex" id="wiz-hex">' + W.theme.toUpperCase() + '</span></div></div>'
                + '<div class="glass" style="padding:14px;background:rgba(255,255,255,.03)"><label class="f-label" style="margin-bottom:8px">Badge Pass Preview</label>'
                + '<div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><b style="font:700 13px var(--fd)">VIP Quantum Pass</b><div class="small mut">NFC Encircle + Arena Floor Access</div></div>'
                + '<span class="mono" style="background:linear-gradient(135deg,' + W.theme + ',' + W.theme + '88);padding:8px 12px;border-radius:8px;color:#fff;font-weight:700;text-align:center">SEC-A<br>#092</span></div></div></div></div>'
                + '<div class="glass wsec" style="margin-bottom:0"><div class="wsec-h"><span class="wt" style="color:#67e8f9;background:rgba(6,182,212,.1);border-color:rgba(6,182,212,.35)">' + ic('building', 17) + '</span>'
                + '<div><h3>3. Venue & Delivery Mode</h3><p>Global infrastructure staging, broadcast topology, and geographic hubs.</p></div></div>'
                + '<label class="f-label">Operational Orchestration Paradigm</label>'
                + '<div class="mode-grid mb16">' + [['in-person', 'building', '#a5b4fc', 'In-Person Arena', 'Full physical staging, RFID turnstiles, and backstage matrix control.', 'MAX 25,000 SEATS'], ['hybrid', 'tv', '#67e8f9', 'Hybrid 4K Simulcast', 'Dual-stream RTMP/SRT with real-time remote VIP interaction.', 'UNLIMITED CPMS'], ['virtual', 'globe', '#f0abfc', 'Pure Virtual Metaverse', 'Spatial audio nodes, WebGL environments, and generative avatars.', 'SPATIAL SYNC']].map(m => '<div class="mode-c ' + (W.deliveryMode === m[0] ? 'act' : '') + '" data-action="wiz-mode" data-m="' + m[0] + '"><span class="chk"></span>'
                    + '<span class="mi" style="color:' + m[2] + ';background:' + m[2] + '14;border-color:' + m[2] + '44">' + ic(m[1], 17) + '</span><b>' + m[3] + '</b><p>' + m[4] + '</p><span class="mm">' + m[5] + '</span></div>').join('') + '</div>'
                + '<div class="grid2">'
                + '<div class="field"><label>Global Metropolitan Hub</label><input class="inp" data-wf="venue" value="' + esc(W.venue) + '" placeholder="Dhaka / Bangabandhu International Conference Centre" list="hub-list"><datalist id="hub-list"><option value="Bangabandhu Intl Conference Centre"></option><option value="International Convention City, Bashundhara"></option><option value="Tokyo Big Sight Grand Dome"></option><option value="The O2 Meridian Complex"></option><option value="Kraftwerk Innovation Hub"></option></datalist></div>'
                + '<div class="field"><label>Specific Arena / Hall Segment</label><input class="inp" data-wf="hall" value="' + esc(W.hall) + '" placeholder="Main Plenary Hall (Hall 01 & Balcony Tier)"></div></div>'
                + '<div class="ven-map"><svg viewBox="0 0 800 210" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Venue map">'
                + '<rect width="800" height="210" fill="#e9e6dd"/><path d="M0 150 Q200 120 420 160 T800 140 L800 210 L0 210 Z" fill="#cfe3e8"/>'
                + '<g stroke="#d8d4c8" stroke-width="10" fill="none"><path d="M0 60 L800 90"/><path d="M120 0 L200 210"/><path d="M420 0 L460 210"/><path d="M640 0 L600 210"/></g>'
                + '<g stroke="#f3f1ea" stroke-width="4" fill="none"><path d="M0 30 L800 52"/><path d="M0 110 L800 128"/><path d="M60 0 L100 210"/><path d="M300 0 L330 210"/><path d="M540 0 L520 210"/><path d="M720 0 L700 210"/></g>'
                + '<g fill="#dcd8cc"><rect x="240" y="70" width="60" height="26" rx="3"/><rect x="330" y="140" width="80" height="30" rx="3"/><rect x="500" y="60" width="70" height="24" rx="3"/><rect x="650" y="150" width="60" height="26" rx="3"/><rect x="80" y="140" width="70" height="28" rx="3"/></g>'
                + '<text x="400" y="118" font-family="Plus Jakarta Sans" font-weight="800" font-size="26" fill="#3f3a2f" opacity=".55" text-anchor="middle">Dhaka</text>'
                + '<circle cx="402" cy="82" r="9" fill="#6366f1" stroke="#fff" stroke-width="3"/><circle cx="402" cy="82" r="16" fill="none" stroke="#6366f1" opacity=".4"><animate attributeName="r" values="12;22" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0" dur="1.6s" repeatCount="indefinite"/></circle></svg>'
                + '<div class="vm-chip"><label>\u25cf STAGE-ARENA CALIBRATED</label><span>' + esc(W.hall || 'Plenary Hall-A') + ' \u00b7 360\u00b0 Rig</span></div>'
                + '<button type="button" class="btn btn-g sm vm-exp" data-action="wiz-map">' + ic('globe', 13) + ' Expand Venue Floorplan</button></div></div>';
            if (W.step === 2) return '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#a5b4fc;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.35)">' + ic('cal', 17) + '</span>'
                + '<div><h3>Date, Schedule & Capacity</h3><p>Chronology anchors for the global mesh and gate telemetry windows. Sales close automatically when the final date passes.</p></div></div>'
                + '<div class="grid2">'
                + '<div class="field"><label>Start Date</label><input class="inp" type="date" data-wf="startDate" value="' + W.startDate + '"></div>'
                + '<div class="field"><label>End Date</label><input class="inp" type="date" data-wf="endDate" value="' + W.endDate + '"></div>'
                + '<div class="field"><label>Doors Open</label><input class="inp" type="time" data-wf="doors" value="' + W.doors + '"></div>'
                + '<div class="field"><label>Timezone</label><select class="inp" data-wf="timezone">' + ['Asia/Dhaka', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Dubai', 'Asia/Singapore'].map(t => '<option ' + (W.timezone === t ? 'selected' : '') + '>' + t + '</option>').join('') + '</select></div>'
                + '<div class="field"><label>Total Arena Capacity</label><input class="inp" type="number" min="1" data-wf="capacity" value="' + W.capacity + '"></div>'
                + '<div class="field"><label>Venue Hub Classification</label><select class="inp" data-wf="hub"><option value="dhaka" ' + (W.hub === 'dhaka' ? 'selected' : '') + '>Dhaka HQ</option><option value="global" ' + (W.hub === 'global' ? 'selected' : '') + '>Global Hub</option></select></div></div>'
                + '<div class="glass" style="padding:16px;background:rgba(99,102,241,.06);border-color:rgba(99,102,241,.35);display:flex;gap:12px;align-items:flex-start">'
                + '<span style="color:#a5b4fc;margin-top:2px">' + ic('info', 17) + '</span>'
                + '<div><b style="font:600 13px var(--fd)">Mesh scheduling tip</b><p class="small mut">Set any tier price to \u09f30 to make the event free \u2014 checkout then skips payment entirely. Event status (Upcoming / Live / Ended) is derived automatically from these dates.</p></div></div></div>';
            if (W.step === 3) {
                const proj = W.tiers.reduce((s, t) => s + (+t.price || 0) * (+t.qty || 0), 0);
                return '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#67e8f9;background:rgba(6,182,212,.1);border-color:rgba(6,182,212,.35)">' + ic('ticket', 17) + '</span>'
                    + '<div><h3>Ticket Tiers & Pricing</h3><p>Inventory envelopes, VIP gating, free tiers, and settlement math per tier.</p></div>'
                    + '<span class="badge-r"><span class="wbadge">Projected Gross: ' + fmtMoney(proj, W.currency) + '</span></span></div>'
                    + '<div class="field" style="max-width:280px;margin-bottom:18px"><label class="f-label">Event Currency</label><select class="inp" data-wf="currency">' + Object.keys(CURRENCIES).map(code => '<option value="' + code + '" ' + (W.currency === code ? 'selected' : '') + '>' + code + ' (' + CURRENCIES[code].symbol.trim() + ') \u2014 ' + CURRENCIES[code].name + '</option>').join('') + '</select><p class="small mut" style="margin-top:6px">' + ic('info', 12) + ' Attendees anywhere in the world can buy \u2014 they\u2019re charged in this currency at checkout, whatever region they\u2019re browsing from.</p></div>'
                    + '<div id="wiz-tiers">' + W.tiers.map((t, i) => '<div class="tier-row">'
                        + '<div><label class="f-label">Tier Name</label><input class="inp" data-wf="tier" data-i="' + i + '" data-k="name" value="' + esc(t.name) + '"></div>'
                        + '<div><label class="f-label">Price (' + curSym(W.currency).trim() + ' \u00b7 0 = Free)</label><input class="inp" type="number" min="0" step="50" data-wf="tier" data-i="' + i + '" data-k="price" value="' + t.price + '"></div>'
                        + '<div><label class="f-label">Quantity</label><input class="inp" type="number" min="1" data-wf="tier" data-i="' + i + '" data-k="qty" value="' + t.qty + '"></div>'
                        + '<div><label class="f-label">Perks</label><input class="inp" data-wf="tier" data-i="' + i + '" data-k="perks" value="' + esc(t.perks) + '"></div>'
                        + '<div><label class="f-label">VIP</label><button type="button" class="tgl ' + (t.vip ? 'on' : '') + '" data-action="wiz-tier-vip" data-i="' + i + '" aria-label="Toggle VIP"></button></div>'
                        + '<div><label class="f-label">&nbsp;</label><button type="button" class="btn btn-danger sm" data-action="wiz-del-tier" data-i="' + i + '" ' + (W.tiers.length <= 1 ? 'disabled' : '') + ' aria-label="Delete tier">' + ic('trash', 14) + '</button></div></div>').join('') + '</div>'
                    + '<button type="button" class="btn btn-g" data-action="wiz-add-tier">' + ic('plus', 15) + ' Add Tier</button>'
                    + '<p class="small mut mt16">' + ic('info', 13) + ' Platform settlement fee: ' + db.meta.fees + '% per paid transaction \u00b7 0 tiers settle as Free RSVPs \u00b7 all amounts in ' + (W.currency || CUR_DEFAULT) + '.</p></div>'
            }
            if (W.step === 4) return '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#a5b4fc;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.35)">' + ic('mic', 17) + '</span>'
                + '<div><h3>Run-of-Show Builder</h3><p>Stage grids, session anchors, and speaker manifest.</p></div></div>'
                + '<div id="wiz-sched">' + W.schedule.map((s, i) => '<div class="sched-row">'
                    + '<div><label class="f-label">Day</label><select class="inp" data-wf="sched" data-i="' + i + '" data-k="day">' + [1, 2, 3, 4].map(n => '<option ' + (String(s.day) === String(n) ? 'selected' : '') + '>' + n + '</option>').join('') + '</select></div>'
                    + '<div><label class="f-label">Time</label><input class="inp" data-wf="sched" data-i="' + i + '" data-k="time" value="' + esc(s.time) + '" placeholder="09:30"></div>'
                    + '<div><label class="f-label">Session Title</label><input class="inp" data-wf="sched" data-i="' + i + '" data-k="title" value="' + esc(s.title) + '"></div>'
                    + '<div><label class="f-label">Location</label><input class="inp" data-wf="sched" data-i="' + i + '" data-k="location" value="' + esc(s.location) + '"></div>'
                    + '<button type="button" class="btn btn-danger sm" data-action="wiz-del-sched" data-i="' + i + '" aria-label="Delete session">' + ic('trash', 14) + '</button></div>').join('') + '</div>'
                + '<button type="button" class="btn btn-g sm" data-action="wiz-add-sched">' + ic('plus', 14) + ' Add Session</button>'
                + '<h3 style="font-size:15px;margin:26px 0 14px">Speaker Manifest</h3>'
                + '<div id="wiz-spk">' + W.speakers.map((s, i) => '<div class="spk-edit">'
                    + '<div><label class="f-label">Name</label><input class="inp" data-wf="spk" data-i="' + i + '" data-k="name" value="' + esc(s.name) + '"></div>'
                    + '<div><label class="f-label">Role</label><input class="inp" data-wf="spk" data-i="' + i + '" data-k="role" value="' + esc(s.role) + '"></div>'
                    + '<div><label class="f-label">Organization</label><input class="inp" data-wf="spk" data-i="' + i + '" data-k="org" value="' + esc(s.org) + '"></div>'
                    + '<button type="button" class="btn btn-danger sm" data-action="wiz-del-spk" data-i="' + i + '" aria-label="Delete speaker">' + ic('trash', 14) + '</button></div>').join('') + '</div>'
                + '<button type="button" class="btn btn-g sm" data-action="wiz-add-spk">' + ic('plus', 14) + ' Add Speaker</button></div>';
            return '<div class="glass wsec"><div class="wsec-h"><span class="wt" style="color:#6ee7b7;background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.35)">' + ic('activity', 17) + '</span>'
                + '<div><h3>Review & Telemetry</h3><p>Final integrity sweep before the event joins the live mesh.</p></div></div>'
                + '<div class="rv-grid">'
                + '<div class="glass rv-card" style="background:rgba(255,255,255,.03)"><h4>' + ic('edit', 15) + ' Identity</h4>'
                + '<div class="fr"><span>Title</span><b>' + esc(W.title || '\u2014') + '</b></div><div class="fr"><span>Category</span><b>' + esc(catOf(W.category).name) + '</b></div>'
                + '<div class="fr"><span>Delivery</span><b style="text-transform:capitalize">' + esc(W.deliveryMode) + '</b></div><div class="fr" style="border:none"><span>Venue</span><b>' + esc(W.venue || '\u2014') + '</b></div></div>'
                + '<div class="glass rv-card" style="background:rgba(255,255,255,.03)"><h4>' + ic('cal', 15) + ' Chronology</h4>'
                + '<div class="fr"><span>Dates</span><b>' + (W.startDate ? fmtRange(W.startDate, W.endDate) : '\u2014') + '</b></div><div class="fr"><span>Doors</span><b>' + esc(W.doors) + ' \u00b7 ' + esc(W.timezone) + '</b></div>'
                + '<div class="fr" style="border:none"><span>Capacity</span><b class="tnum">' + fmtN(W.capacity) + '</b></div></div>'
                + '<div class="glass rv-card" style="background:rgba(255,255,255,.03)"><h4>' + ic('ticket', 15) + ' Tiers (' + W.tiers.length + ')</h4>'
                + W.tiers.map(t => '<div class="fr"><span>' + esc(t.name) + (t.vip ? ' \u00b7 VIP' : '') + '</span><b class="tnum">' + (+t.price === 0 ? 'Free' : fmtT(+t.price, W.currency) + ' \u00d7 ' + fmtN(t.qty)) + '</b></div>').join('')
                + '<div class="fr" style="border:none"><span>Projected gross</span><b class="tnum" style="color:var(--cyan2)">' + fmtMoney(W.tiers.reduce((s, t) => s + (+t.price || 0) * (+t.qty || 0), 0), W.currency) + '</b></div></div>'
                + '<div class="glass rv-card" style="background:rgba(255,255,255,.03)"><h4>' + ic('mic', 15) + ' Program</h4>'
                + '<div class="fr"><span>Sessions</span><b>' + W.schedule.length + '</b></div><div class="fr" style="border:none"><span>Speakers</span><b>' + W.speakers.length + '</b></div></div></div>'
                + '<div class="glass mt24" style="padding:6px 0;background:rgba(52,211,153,.05);border-color:rgba(52,211,153,.3)">'
                + wizHealth().map(h => '<div class="health-it" style="border-color:rgba(52,211,153,.15)"><span style="color:' + (h.ok ? 'var(--green)' : 'var(--amber)') + '">' + ic(h.ok ? 'checkc' : 'warn', 15) + '</span><span class="hl">' + h.l + '</span><span class="hs" style="color:' + (h.ok ? 'var(--green)' : 'var(--amber)') + '">' + h.s + '</span></div>').join('') + '</div></div>';
        }
        function wizHealth() {
            const tiersOk = W.tiers.length > 0 && W.tiers.every(t => t.name && +t.qty > 0);
            return [{ l: 'Basics & Metadata', s: (W.title && W.subtitle && W.description) ? '100% READY' : 'INCOMPLETE', ok: !!(W.title && W.subtitle && W.description) },
            { l: 'Visual Keyframes', s: W.cover ? 'KEYFRAME LOCKED' : 'DEFAULT ASSETS', ok: !!W.cover },
            { l: 'Chronology & Venue', s: (W.startDate && W.venue) ? 'SYNCED' : 'PENDING', ok: !!(W.startDate && W.venue) },
            { l: 'Ticketing Constructs', s: tiersOk ? 'READY' : 'STEP 3 PENDING', ok: tiersOk }];
        }
        function wizSide() {
            const paid = W.tiers.map(t => +t.price || 0).filter(p => p > 0);
            const min = paid.length ? Math.min.apply(null, paid) : 0;
            const hasFree = W.tiers.some(t => +t.price === 0);
            const c = catOf(W.category);
            return '<div class="glass" style="padding:16px"><div class="row-b mb16"><span class="eyebrow" style="font-size:10px">' + ic('eye', 12) + ' Live Ticket Portal Preview</span><span class="pill pill-live" style="font-size:9px">Realtime</span></div>'
                + '<div class="prev-card"><div class="pc-img">' + (W.cover ? '<img src="' + W.cover + '" alt="">' : '<div style="display:grid;place-items:center;height:100%;color:var(--mut)">' + ic('image', 26) + '</div>')
                + '<div style="position:absolute;top:10px;left:10px;display:flex;gap:6px"><span class="pill" style="background:' + W.theme + '22;border-color:' + W.theme + '66;color:' + W.theme + '">' + ic(c.icon, 10) + ' ' + esc(c.name) + '</span><span class="pill pill-warn" style="font-size:9px">Selling Fast</span></div></div>'
                + '<div class="pc-b"><div class="pc-meta">' + (W.startDate ? datePill(W.startDate, W.endDate) : 'DATE NOT SET') + ' \u00b7 ' + esc((W.venue || 'VENUE TBD').slice(0, 26)) + '</div>'
                + '<h4>' + esc(W.title || 'Untitled Arena Event') + '</h4><div class="pc-sub">' + esc(W.subtitle || 'Your executive subtitle appears here.') + '</div>'
                + '<div class="pc-tiers"><div><label class="small mut" style="letter-spacing:.08em;font-size:9.5px">' + (hasFree && !min ? 'ENTRY' : 'TIERS START AT') + '</label><b class="tnum">' + (hasFree && !min ? 'Free' : min ? fmtT(min) : '\u2014') + '</b></div><span class="pill pill-green" style="font-size:9px">' + ic('lock', 10) + ' 256-bit Secure</span></div></div></div></div>'
                + '<div class="glass" style="padding:6px 0"><div style="padding:10px 16px 4px"><span class="eyebrow" style="font-size:10px">' + ic('activity', 12) + ' Builder Health & Readiness</span></div>'
                + wizHealth().map(h => '<div class="health-it"><span style="color:' + (h.ok ? 'var(--cyan2)' : 'var(--mut)') + '">' + ic(h.ok ? 'checkc' : 'clock', 15) + '</span><span class="hl">' + h.l + '</span><span class="hs" style="color:' + (h.ok ? 'var(--green)' : 'var(--amber)') + '">' + h.s + '</span></div>').join('') + '</div>'
                + '<div class="ai-tip"><b>' + ic('spark', 14) + ' Eventora AI Co-Producer</b><p>Pro-tier summits incorporating hybrid multi-stream amplification increase average sponsor acquisition by <b style="color:#c7d2fe">34%</b>. Stage 2 seating map ready for import.</p></div>';
        }
        function wizSoftRefresh() { const s = document.querySelector('.wiz-side'); if (s) s.innerHTML = wizSide() }
        function syncWiz(publish) {
            const u = session(); if (!u || !W) return null;
            const errors = [];
            if (!W.title || W.title.trim().length < 4) errors.push('Event title (min 4 chars)');
            if (!W.startDate) errors.push('Start date');
            if (!W.venue) errors.push('Venue hub');
            if (!W.tiers.length || !W.tiers.every(t => t.name && +t.qty > 0)) errors.push('At least one valid ticket tier');
            if (publish && errors.length) { toast('Fix before publishing: ' + errors[0], 'warn'); return null }
            if (!W.id) { W.id = uid('ev'); W.configId = 'EVNT-' + Math.floor(1000 + Math.random() * 9000) }
            let ev = db.events.find(e => e.id === W.id);
            if (!ev) { ev = { id: W.id, status: 'draft' }; db.events.push(ev) }
            Object.assign(ev, { organizerId: u.id, category: W.category, title: W.title.trim(), subtitle: W.subtitle, description: W.description, cover: W.cover, coverSeed: null, theme: W.theme, deliveryMode: W.deliveryMode, hub: W.hub, venue: W.venue, city: W.venue ? W.venue.split('/')[0].trim().slice(0, 40) : 'Dhaka', hall: W.hall, startDate: W.startDate, endDate: W.endDate || W.startDate, doors: W.doors, timezone: W.timezone, capacity: Math.max(1, +W.capacity || 100), status: publish ? 'published' : (ev.status || 'draft'), configId: W.configId, currency: W.currency || CUR_DEFAULT });
            db.tickets = db.tickets.filter(t => t.eventId !== W.id || W.tiers.some(x => x.id === t.id));
            W.tiers.forEach(t => {
                let row = db.tickets.find(x => x.id === t.id);
                if (!row) { row = { id: t.id, eventId: W.id }; db.tickets.push(row) }
                Object.assign(row, { name: t.name, price: Math.max(0, +t.price || 0), quantity: Math.max(1, +t.qty || 1), perks: t.perks, vip: !!t.vip });
            });
            db.schedule = db.schedule.filter(s => s.eventId !== W.id);
            W.schedule.filter(s => s.title).forEach(s => db.schedule.push({ id: uid('sc'), eventId: W.id, day: Math.max(1, +s.day || 1), time: s.time, title: s.title, location: s.location }));
            db.speakers = db.speakers.filter(s => s.eventId !== W.id);
            W.speakers.filter(s => s.name).forEach(s => db.speakers.push({ id: uid('sp'), eventId: W.id, name: s.name, role: s.role, org: s.org, seed: pic(s.name.toLowerCase().replace(/[^a-z]/g, '') || 'spk', 80, 80) }));
            persist(); return ev;
        }
        function wizAfter() {
            const root = document.getElementById('wiz-root'); if (!root) return;
            const cc = document.getElementById('wiz-cc');
            root.addEventListener('input', e => {
                const el = e.target, wf = el.dataset.wf; if (!wf) return;
                if (wf === 'title') { W.title = el.value; if (cc) cc.textContent = (W.title || '').length + ' / 80 chars' }
                else if (wf === 'subtitle') W.subtitle = el.value;
                else if (wf === 'description') W.description = el.value;
                else if (wf === 'venue') W.venue = el.value;
                else if (wf === 'hall') W.hall = el.value;
                else if (wf === 'startDate') { W.startDate = el.value; if (W.endDate && W.endDate < W.startDate) W.endDate = W.startDate }
                else if (wf === 'endDate') W.endDate = el.value;
                else if (wf === 'doors') W.doors = el.value;
                else if (wf === 'timezone') W.timezone = el.value;
                else if (wf === 'capacity') W.capacity = el.value;
                else if (wf === 'hub') W.hub = el.value;
                else if (wf === 'tier') { const t = W.tiers[+el.dataset.i]; if (t) t[el.dataset.k] = el.value }
                else if (wf === 'sched') { const s = W.schedule[+el.dataset.i]; if (s) s[el.dataset.k] = el.value }
                else if (wf === 'spk') { const s = W.speakers[+el.dataset.i]; if (s) s[el.dataset.k] = el.value }
                else if (wf === 'currency') { W.currency = el.value; wizDirty(); render(); return }
                wizDirty(); wizSoftRefresh();
            });
            const file = document.getElementById('wiz-file');
            if (file) file.addEventListener('change', () => { const f = file.files && file.files[0]; if (f) fileToCover(f, url => { W.cover = url; render() }); file.value = '' });
            const drop = document.getElementById('wiz-drop');
            if (drop) ['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
                e.preventDefault(); drop.classList.toggle('over', ev === 'dragover');
                if (ev === 'drop' && e.dataTransfer.files[0]) fileToCover(e.dataTransfer.files[0], url => { W.cover = url; render() })
            }));
            timers.push(setInterval(() => {
                const el = document.getElementById('wiz-save'); if (!el) return;
                const s = Math.round((Date.now() - wizSaveAt) / 1000);
                el.textContent = 'Auto-saved to cloud node: ' + (s < 3 ? 'just now' : s + ' seconds ago')
            }, 1000));
        }
        let wizSaveTimer = null;
        function wizDirty() {
            wizSaveAt = Date.now(); clearTimeout(wizSaveTimer);
            wizSaveTimer = setTimeout(() => { if (W && W.title && W.title.trim().length > 3) syncWiz(false) }, 1400);
        }
        function fileToCover(file, cb) {
            if (!file.type || !file.type.startsWith('image/')) { toast('Please choose an image file.', 'warn'); return }
            const r = new FileReader();
            r.onerror = () => toast('Could not read that file.', 'err');
            r.onload = e => { const img = new Image(); img.onerror = () => toast('Could not decode that image.', 'err'); img.onload = () => { const c = document.createElement('canvas'); const s = Math.min(1, 1280 / img.width); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .82)) }; img.src = e.target.result };
            r.readAsDataURL(file);
        }
        function AdminView() {
            const u = session(); if (!u) return guardLogin('#/admin');
            if (u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return '' }
            const paidO = db.orders.filter(o => o.status === 'paid');
            const gmv = paidO.reduce((s, o) => s + o.total, 0);
            const hubs = db.events.filter(e => e.status === 'published').length;
            const passVol = db.registrations.length;
            const notRefunded = db.registrations.filter(r => r.status !== 'refunded').length;
            const verifiedPct = passVol ? Math.round(notRefunded / passVol * 100) : 0;
            const fees = paidO.reduce((s, o) => s + (o.fees || 0), 0);
            const refunded = db.orders.filter(o => o.status === 'refunded').reduce((s, o) => s + o.total, 0);
            const freeN = paidO.filter(o => o.total === 0).length;
            const monitor = publicEvents().filter(e => !evEnded(e)).sort((a, b) => evRegs(b.id).length - evRegs(a.id).length).slice(0, 4);
            const queue = db.users.filter(x => x.status === 'pending');
            return topNav('admin') + '<div class="admin-layout">' + adminSide('cc')
                + '<main class="admin-main">'
                + '<div class="row-b" style="align-items:flex-start;margin-bottom:6px">'
                + '<div><span class="eyebrow">' + ic('grid', 13) + ' Mission Control Tier 0 \u00b7 Live Synchronization</span>'
                + '<h1 class="h1-xl" style="margin:8px 0">Global Arena Infrastructure Command & Administration</h1>'
                + '<p class="sub">Real-time biometric turnstile triage, high-concurrency stream pipelines, multi-venue financial settlements in ' + CUR + ' BDT, and instant perimeter zero-trust security.</p></div>'
                + '<div style="display:flex;gap:10px;flex:none;flex-direction:column;align-items:flex-end"><span class="syspill">' + ic('refresh', 13) + ' Mesh Sync: 12ms</span>'
                + '<button class="btn btn-g" data-action="export-telemetry">' + ic('dl', 15) + ' Export Telemetry Log</button></div></div>'
                + '<div class="mgrid mb24">'
                + metricTile({ label: 'Total Platform GMV', c: '#38bdf8', icon: 'bank', value: shortMoney(gmv), trend: CUR_DEFAULT + ' equiv.', tc: 'var(--green)', cap: 'settled across ' + hubs + ' live & upcoming arenas', bar: Math.min(100, gmv / 200000 * 100) })
                + metricTile({ label: 'Active Summits', c: '#a5b4fc', icon: 'radio', value: hubs + ' Live Hubs', cap: 'Published & upcoming, worldwide synchronized', bar: 100, bc: 'vio' })
                + metricTile({ label: 'Global Pass Volume', c: '#f0abfc', icon: 'qr', value: fmtN(passVol), trend: verifiedPct + '% verified', tc: '#f472b6', cap: 'passes in verified (non-refunded) states', bar: verifiedPct, bc: 'mag' })
                + metricTile({ label: 'Settlement Health', c: '#38bdf8', icon: 'gauge', value: paidO.length ? '100%' : '\u2014', cap: 'All verified orders settled \u00b7 0 disputes open', bar: 100, bc: 'grn' })
                + '</div>'
                + '<div class="grid2 mb24" style="grid-template-columns:1.7fr 1fr">'
                + '<div class="glass"><div class="panel-h"><span class="pt">' + ic('radio', 17) + '</span><div><h3>Global Active Events Monitoring</h3><p>Upcoming & live arenas \u2014 real attendance, capacity fill and settled revenue</p></div>'
                + '<div class="rt"><span class="pill pill-live"><span class="dot g pulse"></span>' + monitor.length + ' Active Hubs</span></div></div>'
                + '<div class="panel-b"><div class="hub-grid">'
                + (monitor.map((ev, i) => {
                    const n = evRegs(ev.id).length, fill = ev.capacity ? Math.round(n / ev.capacity * 100) : 0;
                    return '<div class="glass hub-card" style="background:rgba(255,255,255,.03)">'
                        + '<div class="hub-top">' + (evLive(ev) ? '<span class="pill pill-live"><span class="dot g pulse"></span>Live Now</span>' : '<span class="pill pill-vio">Upcoming</span>') + '<span class="hn">Hub #' + String(i + 1).padStart(2, '0') + '</span></div>'
                        + '<h4>' + esc(ev.title) + '</h4><div class="hv">' + ic('pin', 12) + ' ' + esc(ev.venue) + ' \u00b7 ' + fmtDate(ev.startDate) + '</div>'
                        + '<div class="hub-stats"><div><label>Attendees</label><b class="tnum">' + fmtN(n) + '</b></div><div><label>Capacity Fill</label><b class="c tnum">' + fill + '%</b></div><div><label>Revenue</label><b>' + (evRevenue(ev.id) === 0 ? 'Free' : shortMoney(evRevenue(ev.id))) + '</b></div></div>'
                        + '<div class="hub-foot"><span>Doors ' + esc(ev.doors) + ' \u00b7 ' + fmtN(ev.capacity) + ' seats</span>'
                        + '<a href="#/event/' + ev.id + '">Telemetry Stream ' + ic('arrR', 13) + '</a></div></div>'
                }).join('') || '<div class="empty" style="grid-column:1/-1"><b>No active hubs</b><p>Publish an event to stream telemetry here.</p></div>')
                + '</div></div></div>'
                + '<div style="display:flex;flex-direction:column;gap:20px">'
                + '<div class="glass"><div class="panel-h"><span class="pt" style="color:#67e8f9;background:rgba(6,182,212,.1);border-color:rgba(6,182,212,.35)">' + ic('shield', 17) + '</span><div><h3>Security & Cryptographic Gate Triage</h3></div></div>'
                + '<div class="panel-b">'
                + '<div class="sec-row"><span style="color:#a5b4fc">' + ic('zap', 16) + '</span><div><b>Zero-Latency RFID Hardware</b><div class="small mut">Response window average</div></div><span class="rv">&lt; 3.2ms<br><span class="pill pill-live" style="font-size:8.5px;margin-top:4px;display:inline-flex">Active</span></span></div>'
                + '<div class="pbar mb16"><i style="width:92%"></i></div>'
                + '<div class="sec-row"><span style="color:#a5b4fc">' + ic('qr', 16) + '</span><div><b>Anti-Scalp QR Cipher</b> <span class="small mut">15s rotation</span><div class="small mut">Entropy salt integrity \u00b7 256-bit ECDSA</div></div><span class="rv pill pill-vio" style="font-size:9px">Rotation</span></div>'
                + '<div class="sec-row"><span style="color:#67e8f9">' + ic('shield', 16) + '</span><div><b>Edge DDoS Defenses</b><div class="small mut">Scrubbing centers \u00b7 zero malicious payloads in 24h</div></div><span class="rv">140 Tbps<br><span class="pill pill-live" style="font-size:8.5px;margin-top:4px;display:inline-flex">Filtering</span></span></div></div></div>'
                + '<div class="glass"><div class="panel-h"><span class="pt" style="color:#6ee7b7;background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.35)">' + ic('bank', 17) + '</span><div><h3>Financial Settlement (' + CUR_DEFAULT + ' equiv.)</h3><p>Computed live from the verified order ledger</p></div></div>'
                + '<div class="panel-b">'
                + '<div class="fin-row"><span>Gross Settled Revenue</span><b class="tnum">' + fmtMoney(gmv) + '</b></div>'
                + '<div class="fin-row"><span>Platform Fees Earned</span><b class="tnum" style="color:var(--cyan2)">' + fmtMoney(fees) + '</b></div>'
                + '<div class="fin-row"><span>Refunded Total</span><b class="tnum">' + fmtMoney(refunded) + '</b></div>'
                + '<div class="fin-row"><span>Free RSVPs Settled</span><b class="tnum">' + fmtN(freeN) + '</b></div>'
                + '<button class="btn btn-c w100 mt16" data-action="export-settlement">' + ic('dl', 15) + ' Export Settlement Report (CSV)</button></div></div></div></div>'
                + '<div class="glass"><div class="panel-h"><span class="pt">' + ic('users', 17) + '</span><div><h3>Platform User & Organizer Moderation Queue</h3><p>Pending executive clearances, KYC stage verifications, and anomalous tickets</p></div>'
                + '<div class="rt"><span class="pill pill-warn">' + queue.length + ' Pending Audits</span></div></div>'
                + '<div class="panel-b tablewrap"><table class="dtable" style="min-width:820px">'
                + '<thead><tr><th>Entity / Organizer</th><th>Role & Scope</th><th>Audit Metric</th><th>Risk Factor</th><th>Moderation Action</th></tr></thead>'
                + '<tbody>' + (queue.length ? queue.map(q => {
                    const rc = q.risk > .5 ? '#f472b6' : q.risk > .05 ? '#38bdf8' : 'var(--green)';
                    const rb = q.risk > .5 ? 'rgba(236,72,153,.1)' : q.risk > .05 ? 'rgba(6,182,212,.1)' : 'rgba(52,211,153,.1)';
                    const rl = q.risk > .5 ? 'High' : q.risk > .05 ? 'Low' : 'Minimal';
                    return '<tr><td><div class="att"><span class="avatar avx" style="background:' + (q.risk > .5 ? 'linear-gradient(135deg,#ec4899,#d946ef)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)') + '">' + initials(q.name) + '</span><div><div class="nm">' + esc(q.name) + '</div><div class="em">' + esc(q.auditNote || '') + '</div></div></div></td>'
                        + '<td class="mut">' + esc(q.auditScope || 'Organizer') + '</td><td>' + esc(q.auditMetric || '\u2014') + '</td>'
                        + '<td><span class="risk" style="color:' + rc + ';background:' + rb + ';border-color:' + rc + '66">' + rl + ' (' + q.risk.toFixed(2) + ')</span></td>'
                        + '<td><div style="display:flex;gap:8px;align-items:center"><button class="btn btn-p sm" data-action="mod-approve" data-id="' + q.id + '">Approve</button>'
                        + (q.risk > .5 ? '<button class="btn btn-danger sm" data-action="mod-revoke" data-id="' + q.id + '">Revoke API</button>' : '')
                        + '<button class="kebab" data-action="mod-flag" data-id="' + q.id + '" aria-label="Flag for review">' + ic('flag', 14) + '</button></div></td></tr>'
                }).join('')
                    : '<tr><td colspan="5"><div class="empty"><b>Queue clear</b><p>No pending audits. The mesh is fully verified.</p></div></td></tr>') + '</tbody></table></div></div>'
                + '</main></div>' + consoleFooter();
        }
        function AdminStagesView() {
            const u = session(); if (!u) return guardLogin('#/admin');
            if (u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return '' }
            return topNav('') + '<div class="admin-layout">' + adminSide('stages') + '<main class="admin-main">'
                + '<span class="eyebrow">' + ic('radio', 13) + ' Live Stage Registry</span><h1 class="h1-page" style="margin:8px 0 4px">Stages & Event Moderation</h1>'
                + '<p class="sub mb24">Feature, suspend or restore any arena on the global mesh.</p>'
                + '<div class="glass tablewrap"><table class="dtable"><thead><tr><th>Stage</th><th>Organizer</th><th>Date</th><th>Status</th><th>Attendees</th><th>Revenue</th><th style="text-align:right">Moderation</th></tr></thead>'
                + '<tbody>' + db.events.map(ev => {
                    const org = userById(ev.organizerId); return '<tr>'
                        + '<td><div class="att"><img class="avatar" style="width:44px;height:32px;border-radius:6px" src="' + coverOf(ev) + '" alt=""><div><div class="nm">' + esc(ev.title) + '</div><div class="em">' + esc(ev.venue) + ' \u00b7 ' + esc(ev.city) + '</div></div></div></td>'
                        + '<td class="mut">' + esc(org ? org.name : '\u2014') + '</td><td class="mut">' + fmtDate(ev.startDate) + '</td>'
                        + '<td>' + statePill(ev) + '</td>'
                        + '<td class="tnum">' + fmtN(evRegs(ev.id).length) + '</td><td class="tnum">' + (evRevenue(ev.id) === 0 ? 'Free tier' : fmtMoney(evRevenue(ev.id))) + '</td>'
                        + '<td style="text-align:right"><div style="display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
                        + '<button class="btn ' + (ev.featured ? 'btn-p' : 'btn-g') + ' sm" data-action="stage-feature" data-id="' + ev.id + '">' + ic('star', 13) + ' ' + (ev.featured ? 'Featured' : 'Feature') + '</button>'
                        + '<button class="btn ' + (ev.status === 'cancelled' ? 'btn-g' : 'btn-danger') + ' sm" data-action="stage-suspend" data-id="' + ev.id + '">' + (ev.status === 'cancelled' ? ic('refresh', 13) + ' Restore' : ic('ban', 13) + ' Suspend') + '</button></div></td></tr>'
                }).join('') + '</tbody></table></div>'
                + '</main></div>' + consoleFooter();
        }
        function AdminGuestsView() {
            const u = session(); if (!u) return guardLogin('#/admin');
            if (u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return '' }
            const regs = db.registrations.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60);
            return topNav('') + '<div class="admin-layout">' + adminSide('guests') + '<main class="admin-main">'
                + '<span class="eyebrow">' + ic('users', 13) + ' Perimeter Flow</span><h1 class="h1-page" style="margin:8px 0 4px">Guest Flow \u2014 Global Attendee Stream</h1>'
                + '<p class="sub mb24">Latest ' + regs.length + ' verified passes across all hubs.</p>'
                + '<div class="glass tablewrap"><table class="dtable"><thead><tr><th>Attendee</th><th>Event</th><th>Tier</th><th>Pass Hash</th><th>Status</th><th>Settled</th></tr></thead>'
                + '<tbody>' + (regs.map(r => {
                    const ev = db.events.find(e => e.id === r.eventId), o = db.orders.find(o => o.registrationId === r.id);
                    return '<tr><td><div class="att"><img class="avatar" src="' + pic((r.attendeeName || 'g').toLowerCase().replace(/[^a-z]/g, '') || 'g', 80, 80) + '" alt=""><div><div class="nm">' + esc(r.attendeeName) + '</div><div class="em">' + esc(r.attendeeEmail) + '</div></div></div></td>'
                        + '<td class="mut">' + esc(ev ? ev.title : '\u2014') + '</td><td><span class="tier-b ' + (r.tierName.includes('VIP') ? 'tier-vip' : r.tierName === 'Virtual' ? 'tier-vir' : 'tier-std') + '">' + esc(r.tierName) + '</span></td>'
                        + '<td class="mono" style="color:#7dd3fc">' + truncHash(r.passId) + '</td>'
                        + '<td><div class="ckcell"><span style="display:flex;gap:8px;align-items:center"><span class="dot ' + (r.status === 'checked_in' ? 'g' : 'a') + '"></span>' + r.status.replace('_', ' ') + '</span></div></td>'
                        + '<td class="tnum">' + (o ? (o.total === 0 ? 'Free' : fmtMoney(o.total, o.currency)) : '\u2014') + '</td></tr>'
                }).join('') || '<tr><td colspan="6"><div class="empty"><b>No passes yet</b></div></td></tr>') + '</tbody></table></div>'
                + '</main></div>' + consoleFooter();
        }
        function AdminTelemetryView() {
            const u = session(); if (!u) return guardLogin('#/admin');
            if (u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return '' }
            const allIds = db.events.map(e => e.id);
            const tm = tierMixSegs(allIds), tmTot = tm.reduce((s, x) => s + x.value, 0);
            const cm = catMixSegs(allIds);
            const byEv = db.events.map(e => ({ label: e.title, value: evRevenue(e.id), sub: fmtN(evRegs(e.id).length) + ' passes' })).filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
            return topNav('') + '<div class="admin-layout">' + adminSide('tele') + '<main class="admin-main">'
                + '<span class="eyebrow">' + ic('activity', 13) + ' Stage Schedule Telemetry</span><h1 class="h1-page" style="margin:8px 0 4px">Platform Telemetry & Analytics</h1>'
                + '<p class="sub mb24">Live sales velocity, revenue concentration and vertical distribution across the mesh (' + CUR + ' BDT).</p>'
                + '<div class="grid2 mb24">'
                + chartCard('Platform Revenue', 'Settled gross per day \u00b7 last 30 days', areaChart(revPerDay(allIds, 30), { fmt: shortMoney, tipFmt: 'money', color: '#38bdf8', aria: 'Platform revenue over the last 30 days' }), '<span class="pill pill-live"><span class="dot g pulse"></span>Streaming</span>')
                + chartCard('Attendees by Vertical', 'Pass distribution across event categories', donutChart(cm, { center: fmtN(tmTot), centerLabel: 'passes' }))
                + '</div>'
                + '<div class="grid2 mb24">'
                + chartCard('Registrations Velocity', 'Confirmed passes per day \u00b7 last 30 days', areaChart(regsPerDay(allIds, 30), { fmt: shortMoney, tipFmt: 'num', color: '#818cf8', aria: 'Registrations over the last 30 days' }))
                + chartCard('Tier Mix Across Mesh', 'Passes by tier type', donutChart(tm, { center: fmtN(tmTot), centerLabel: 'passes' }))
                + '</div>'
                + chartCard('Revenue by Stage', 'Top events by settled gross (' + CUR + ')', byEv.length ? hbarList(byEv, { fmt: fmtMoney }) : '<p class="mut small">No settled revenue yet.</p>')
                + '</main></div>' + consoleFooter();
        }
        function AdminSettingsView() {
            const u = session(); if (!u) return guardLogin('#/admin');
            if (u.role !== 'admin') { location.hash = ROLE_HOME[u.role]; return '' }
            return topNav('') + '<div class="admin-layout">' + adminSide('settings') + '<main class="admin-main">'
                + '<span class="eyebrow">' + ic('settings', 13) + ' Node Configuration</span><h1 class="h1-page" style="margin:8px 0 4px">Platform Settings</h1>'
                + '<p class="sub mb24">Settlement economics, maintenance posture and mesh data controls.</p>'
                + '<div class="grid2" style="align-items:start">'
                + '<div class="glass" style="padding:24px"><h3 style="font-size:15px" class="mb16">Settlement Economics (' + CUR_DEFAULT + ' equiv.)</h3>'
                + '<form data-form="settings"><div class="field"><label>Platform Fee (%) \u2014 paid tiers only</label><input class="inp" type="number" min="0" max="30" step="0.5" name="fees" value="' + db.meta.fees + '"></div>'
                + '<button class="btn btn-p" type="submit">' + ic('check', 15) + ' Save Configuration</button></form>'
                + '<div class="dd-sep" style="margin:18px 0"></div>'
                + '<div class="row-b"><div><b style="font:600 13.5px var(--fd)">Maintenance Mode</b><div class="small mut">Shows a status banner network-wide</div></div>'
                + '<button class="tgl ' + (db.meta.maintenance ? 'on' : '') + '" data-action="maint-toggle" aria-label="Toggle maintenance mode"></button></div>'
                + '<div class="dd-sep" style="margin:18px 0"></div>'
                + '<div><b style="font:600 13.5px var(--fd)">Payment Gateway</b><div class="small mut" style="margin-top:4px">' + (CONFIG.payments.createSessionUrl && CONFIG.payments.verifyUrl ? '<span style="color:var(--green)">Connected</span> \u2014 ' + (CONFIG.payments.gatewayName || 'custom gateway') + ' \u00b7 bKash / Nagad / Rocket / cards \u00b7 server-side verification' : '<span style="color:var(--amber)">Not connected</span> \u2014 paid checkout is disabled until EVENTORA_CONFIG.payments is configured. No simulated transactions are created.') + '</div></div></div>'
                + '<div class="glass" style="padding:24px"><h3 style="font-size:15px" class="mb16">Mesh Data Controls</h3>'
                + '<div class="fin-row"><span>Interest-list emails captured</span><b class="tnum">' + db.meta.interest.length + '</b></div>'
                + '<div class="fin-row"><span>Registered accounts</span><b class="tnum">' + db.users.length + '</b></div>'
                + '<div class="fin-row"><span>Contact messages</span><b class="tnum">' + db.messages.length + '</b></div>'
                + '<div class="fin-row"><span>Events on node</span><b class="tnum">' + db.events.length + '</b></div>'
                + '<button class="btn btn-g w100 mt16" data-action="export-interest" ' + (db.meta.interest.length ? '' : 'disabled') + '>' + ic('dl', 15) + ' Export Interest List (CSV)</button>'
                + '<div class="dd-sep" style="margin:18px 0"></div>'
                + '<h3 style="font-size:15px;color:#fca5a5" class="mb8">Danger Zone</h3>'
                + '<p class="small mut mb16">Resets the entire local mesh to factory seed data. All events, passes and accounts created in this session are destroyed.</p>'
                + '<button class="btn btn-danger" data-action="reset-demo">' + ic('refresh', 15) + ' Reset Demo Data</button></div></div>'
                + '</main></div>' + consoleFooter();
        }
        function NotFound() {
            return topNav('') + '<div class="wrap" style="padding:100px 0">' + emptyState('search', 'Signal lost \u2014 404', 'This arena node does not exist or has been decommissioned.', '#/events', 'Explore Events') + '</div>' + (session() ? consoleFooter() : publicFooter());
        }
        function guardLogin(next) {
            if (SESSION_CHECK_PENDING) {
                /* A Supabase session token is in storage and still being verified \u2014 show a
                   neutral loading state instead of bouncing to Sign In and right back. */
                return '<div class="wrap" style="padding:160px 0;text-align:center"><div class="spin" style="width:28px;height:28px;border-width:3px;margin:0 auto 16px"></div><p class="mut">Loading your session\u2026</p></div>';
            }
            const n = next || location.hash;
            toast('Please sign in to continue.', 'warn');
            location.hash = '#/login?next=' + encodeURIComponent(n); return '';
        }
        let PAL = { open: false, q: '', items: [], cur: 0 };
        function paletteOpen() {
            if (PAL.open) return; PAL.open = true; PAL.q = '';
            const b = document.createElement('div'); b.className = 'pal-back'; b.id = 'pal';
            b.innerHTML = '<div class="pal glass-hi"><div class="pal-in">' + ic('search', 18) + '<input id="pal-q" placeholder="Search events, attendees, actions\u2026 (Esc to close)" autocomplete="off"></div>'
                + '<div class="pal-res" id="pal-res"></div>'
                + '<div class="pal-foot"><span>\u2191\u2193 navigate</span><span>\u21b5 open</span><span>esc close</span><span style="margin-left:auto">Eventora Global Telemetry</span></div></div>';
            document.body.appendChild(b); document.body.classList.add('no-scroll');
            b.addEventListener('click', e => { if (e.target === b) paletteClose() });
            document.getElementById('pal-q').addEventListener('input', deb(e => { PAL.q = e.target.value; palDraw() }, 120));
            document.getElementById('pal-q').addEventListener('keydown', e => {
                if (e.key === 'ArrowDown') { PAL.cur = Math.min(PAL.cur + 1, PAL.items.length - 1); palCur(); e.preventDefault() }
                if (e.key === 'ArrowUp') { PAL.cur = Math.max(PAL.cur - 1, 0); palCur(); e.preventDefault() }
                if (e.key === 'Enter' && PAL.items[PAL.cur]) { const it = PAL.items[PAL.cur]; paletteClose(); if (it.go) location.hash = it.go }
            });
            palDraw(); document.getElementById('pal-q').focus();
        }
        function paletteClose() { PAL.open = false; const p = document.getElementById('pal'); if (p) p.remove(); if (!document.getElementById('modal-root').innerHTML) document.body.classList.remove('no-scroll') }
        function palDraw() {
            const u = session(), q = PAL.q.toLowerCase(), items = [];
            publicEvents().filter(e => !q || (e.title + ' ' + e.venue + ' ' + e.city).toLowerCase().includes(q)).slice(0, 6).forEach(e => items.push({ g: 'Events', icon: 'cal', t: e.title, s: fmtDate(e.startDate) + ' \u00b7 ' + e.city, go: '#/event/' + e.id }));
            if (u && (u.role === 'organizer' || u.role === 'admin')) {
                db.registrations.filter(r => q && (r.attendeeName + ' ' + r.attendeeEmail + ' ' + r.passId).toLowerCase().includes(q)).slice(0, 5).forEach(r => items.push({ g: 'Attendees', icon: 'user', t: r.attendeeName, s: r.attendeeEmail + ' \u00b7 ' + truncHash(r.passId), go: u.role === 'admin' ? '#/admin/guests' : '#/organizer/attendees?event=' + r.eventId }));
            }
            const acts = [];
            if (!u) { acts.push(['Sign In / Register', 'out', '#/login'], ['Help & FAQ', 'help', '#/faq']) }
            else {
                acts.push(['My Dashboard', 'grid', ROLE_HOME[u.role]]);
                if (u.role === 'attendee') acts.push(['My Tickets', 'ticket', '#/attendee/tickets'], ['My Registrations', 'cal', '#/attendee/registrations'], ['Wishlist', 'heart', '#/attendee/wishlist']);
                if (u.role === 'organizer') acts.push(['My Events', 'layers', '#/organizer/events'], ['Create Event', 'plus', '#/organizer/events/create'], ['Analytics', 'activity', '#/organizer/analytics']);
                if (u.role === 'admin') acts.push(['Stages Moderation', 'radio', '#/admin/stages'], ['Platform Settings', 'settings', '#/admin/settings']);
                acts.push(['Notifications', 'bell', '#/notifications'], ['Profile & Settings', 'user', '#/profile']);
            }
            acts.push(['Explore Events', 'search', '#/events'], ['About', 'globe', '#/about'], ['Help & FAQ', 'help', '#/faq']);
            acts.forEach(a => { if (!q || a[0].toLowerCase().includes(q)) items.push({ g: 'Actions', icon: a[1], t: a[0], s: 'Navigate', go: a[2] }) });
            PAL.items = items; PAL.cur = 0;
            const res = document.getElementById('pal-res'); if (!res) return;
            if (!items.length) { res.innerHTML = '<div class="pal-empty">No telemetry matches \u201c' + esc(PAL.q) + '\u201d.</div>'; return }
            let html = '', lastG = '';
            items.forEach((it, i) => {
                if (it.g !== lastG) { html += '<div class="pal-g">' + it.g + '</div>'; lastG = it.g }
                html += '<div class="pal-it ' + (i === 0 ? 'cur' : '') + '" data-pi="' + i + '"><span class="pi">' + ic(it.icon, 14) + '</span><div style="min-width:0"><b>' + esc(it.t) + '</b><span>' + esc(it.s) + '</span></div></div>';
            });
            res.innerHTML = html;
            res.querySelectorAll('.pal-it').forEach(el => {
                el.addEventListener('click', () => { const it = PAL.items[+el.dataset.pi]; paletteClose(); if (it.go) location.hash = it.go });
                el.addEventListener('mousemove', () => { PAL.cur = +el.dataset.pi; palCur() });
            });
        }
        function palCur() { const all = $$('#pal-res .pal-it'); all.forEach((el, i) => el.classList.toggle('cur', i === PAL.cur)); const c = document.querySelector('#pal-res .pal-it.cur'); if (c) c.scrollIntoView({ block: 'nearest' }) }
        const ALIAS = { 'dashboard': 'attendee/tickets', 'auth': 'login', 'explore': 'events', 'create': 'organizer/events/create', 'organizer': 'organizer/dashboard' };
        function resolve(seg, q) {
            const u = session(), k = seg[0] || '';
            if (k === '') { if (u) { location.hash = homeFor(u); return '' } return LandingView() }
            if (k === 'events' || (k === 'attendee' && seg[1] === 'browse')) return ExploreView(q);
            if (k === 'event') return EventDetailsView(seg[1]);
            if (k === 'about') return AboutView();
            if (k === 'contact') return ContactView();
            if (k === 'faq') return FaqView();
            if (k === 'privacy') return PrivacyView();
            if (k === 'terms') return TermsView();
            if (k === 'login') return LoginView(q);
            if (k === 'register') return RegisterView(q);
            if (k === 'forgot-password') return ForgotPasswordView();
            if (k === 'reset-password') return ResetPasswordView();
            if (k === 'checkout') return CheckoutView(seg[1], q);
            if (k === 'success') return SuccessView(seg[1]);
            if (k === 'payment') return PaymentCallbackView(q);
            if (k === 'notifications') { if (!u) return guardLogin(); return NotificationsView() }
            if (k === 'profile') { if (!u) return guardLogin(); return ProfileView() }
            if (k === 'attendee') {
                if (!u) return guardLogin();
                if (u.role !== 'attendee') { toast('That area is restricted to attendee accounts \u2014 redirected to your dashboard.', 'warn'); location.hash = ROLE_HOME[u.role]; return '' }
                if (seg[1] === 'dashboard') return AttendeeDashboard();
                if (seg[1] === 'tickets') return AttendeeTickets();
                if (seg[1] === 'registrations') return AttendeeRegistrations();
                if (seg[1] === 'wishlist') return AttendeeWishlist();
                return NotFound();
            }
            if (k === 'organizer') {
                if (!u) return guardLogin();
                if (u.role !== 'organizer') { toast('That area is restricted to organizer accounts \u2014 redirected to your dashboard.', 'warn'); location.hash = ROLE_HOME[u.role]; return '' }
                if (seg[1] === 'dashboard') return OrgDashboard();
                if (seg[1] === 'events') {
                    if (seg[2] === 'create') return WizardView(null);
                    if (seg[2] === 'edit' && seg[3]) return WizardView(seg[3]);
                    return OrgEvents();
                }
                if (seg[1] === 'analytics') return OrgAnalytics();
                if (seg[1] === 'attendees') return DirectoryView(q);
                if (seg[1] === 'run-of-show') return RunOfShowView(q);
                return NotFound();
            }
            if (k === 'admin') {
                if (!u) return guardLogin('#/admin');
                if (u.role !== 'admin') { toast('That area is restricted to admin accounts \u2014 redirected to your dashboard.', 'warn'); location.hash = ROLE_HOME[u.role]; return '' }
                if (seg[1] === 'stages') return AdminStagesView();
                if (seg[1] === 'guests') return AdminGuestsView();
                if (seg[1] === 'telemetry') return AdminTelemetryView();
                if (seg[1] === 'settings') return AdminSettingsView();
                return AdminView();
            }
            return NotFound();
        }
        function setPageTitle(seg) {
            const T = { events: 'Explore Events', about: 'About', contact: 'Contact', faq: 'Help & FAQ', privacy: 'Privacy Policy', terms: 'Terms & Conditions', login: 'Sign In', register: 'Create Account', 'forgot-password': 'Reset Password', 'reset-password': 'Set New Password', notifications: 'Notifications', profile: 'Profile & Settings', checkout: 'Checkout' };
            if (seg[0] === 'event') { const ev = db.events.find(e => e.id === seg[1]); document.title = (ev ? ev.title : 'Event') + ' \u2014 Eventora' }
            else if (seg[0] === 'attendee') document.title = 'Attendee Dashboard \u2014 Eventora';
            else if (seg[0] === 'organizer') document.title = 'Organizer Console \u2014 Eventora';
            else if (seg[0] === 'admin') document.title = 'Admin Command Center \u2014 Eventora';
            else if (seg[0] === 'success') document.title = 'Pass Confirmed \u2014 Eventora';
            else document.title = (T[seg[0]] ? T[seg[0]] + ' \u2014 Eventora' : 'Eventora \u2014 Next-Gen Experience Infrastructure');
        }
        function render() {
            if (AUTH_CALLBACK_PENDING) {
                /* Still resolving a fresh sign-in redirect \u2014 the boot sequence owns
                   navigation until it flips this flag off, so just show a loading state. */
                const app0 = document.getElementById('app');
                if (app0) app0.innerHTML = '<div class="wrap" style="padding:160px 0;text-align:center"><div class="spin" style="width:28px;height:28px;border-width:3px;margin:0 auto 16px"></div><p class="mut">Completing sign-in\u2026</p></div>';
                return;
            }
            timers.forEach(clearInterval); timers = []; afterHooks.length = 0;
            document.getElementById('modal-root').innerHTML = ''; document.body.classList.remove('no-scroll');
            $$('.dd-wrap.open').forEach(dd => dd.classList.remove('open'));
            closeMMenu();
            const sameHash = location.hash === lastRenderedHash;
            RENDER_SAME = sameHash;
            const scrollY = window.scrollY;
            const h = location.hash.replace(/^#\/?/, ''), parts = h.split('?');
            const seg = parts[0].split('/').filter(Boolean);
            if (seg[0] && ALIAS[seg[0]] && seg.length === 1) {
                const q0 = parts[1] ? '?' + parts[1] : '';
                const target = '#/' + ALIAS[seg[0]] + q0;
                if (target !== location.hash) { location.replace(target); return }
            }
            const q = new URLSearchParams(parts[1] || '');
            const app = document.getElementById('app');
            try {
                const html = resolve(seg, q);
                if (html === undefined || html === '') { lastRenderedHash = location.hash; return }
                app.innerHTML = '<div class="view">' + html + '</div>';
            } catch (err) {
                console.error('Eventora render error:', err);
                app.innerHTML = '<div class="glass err-panel"><span class="eyebrow" style="color:#fca5a5">' + ic('warn', 14) + ' Render Fault</span>'
                    + '<h2 style="margin:10px 0 6px">Something tripped the mesh</h2>'
                    + '<p class="mut">The view failed to build. Try resetting the demo data \u2014 the trace below pinpoints the fault.</p>'
                    + '<pre>' + esc(err && err.stack ? err.stack : String(err)) + '</pre>'
                    + '<button class="btn btn-p" onclick="localStorage.removeItem(\'eventora_db_v2\');location.reload()">Reset & Reload</button></div>';
                lastRenderedHash = location.hash; return;
            }
            afterHooks.forEach(f => { try { f() } catch (e) { console.error(e) } });
            bindCharts();
            fitMarquee();
            if (seg[0] === 'events' || (seg[0] === 'attendee' && seg[1] === 'browse')) exDraw();
            if (seg[0] === 'organizer' && seg[1] === 'attendees') dirDraw();
            if (seg[0] === 'checkout') { const ev0 = db.events.find(e => e.id === seg[1]); if (ev0) coSummaryFor(ev0) }
            setPageTitle(seg);
            if (pendingScroll) { const tid = pendingScroll; pendingScroll = null; setTimeout(() => { const el = document.getElementById(tid); if (el) el.scrollIntoView({ behavior: 'smooth' }) }, 80); window.scrollTo(0, 0) }
            else window.scrollTo(0, sameHash ? scrollY : 0);
            lastRenderedHash = location.hash;
        }
        const Actions = {
            'open-palette': () => paletteOpen(),
            'mobile-nav': () => toggleMMenu(),
            'signout': () => signOut(),
            'google-signin': (dd) => googleSignIn(dd.tab, dd.role),
            'pw-toggle': (dd, el) => {
                const inp = document.getElementById(dd.target); if (!inp) return;
                const showing = inp.type === 'text';
                inp.type = showing ? 'password' : 'text';
                el.innerHTML = ic(showing ? 'eye' : 'eyeoff', 15);
            },
            'avatar-pick': () => { const inp = document.getElementById('avatar-input'); if (inp) inp.click() },
            'scroll': dd => { if (location.hash === '#/' || location.hash === '') { const el = document.getElementById(dd.to); if (el) el.scrollIntoView({ behavior: 'smooth' }) } else { pendingScroll = dd.to; location.hash = '#/' } },
            'soc-missing': dd => { const m = SOCIAL_META[dd.k] || ['Social', '']; toast(m[0] + ' isn\u2019t linked yet. Set CONFIG.social.' + dd.k + ' (env ' + m[1] + ') in your config to enable this link.', 'info') },
            'sys-status': () => {
                const liveN = db.events.filter(e => evLive(e)).length, pubN = db.events.filter(e => e.status === 'published').length, draftN = db.events.filter(e => e.status === 'draft').length;
                openModal('<div class="modal-h"><h3>System Status \u2014 Local Node</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                    + '<div class="modal-b">'
                    + '<div class="sec-row"><span class="dot g"></span><b>Gate Mesh Core</b><span class="rv" style="color:var(--green)">Operational</span></div>'
                    + '<div class="sec-row"><span class="dot g"></span><b>Auth & Profiles</b><span class="rv" style="color:var(--green)">Supabase</span></div>'
                    + '<div class="sec-row"><span class="dot ' + (CONFIG.payments.createSessionUrl ? 'g' : 'a') + '"></span><b>Payment Rails (multi-currency)</b><span class="rv" style="color:' + (CONFIG.payments.createSessionUrl ? 'var(--green)' : 'var(--amber)') + '">' + (CONFIG.payments.createSessionUrl ? 'Connected \u00b7 ' + (CONFIG.payments.gatewayName || 'gateway') : 'Not connected') + '</span></div>'
                    + '<div class="sec-row"><span class="dot g"></span><b>Google Sign-In</b><span class="rv" style="color:var(--green)">Via Supabase</span></div>'
                    + '<div class="dd-sep" style="margin:14px 0"></div>'
                    + '<div class="fin-row"><span>Accounts on node</span><b class="tnum">' + fmtN(db.users.length) + '</b></div>'
                    + '<div class="fin-row"><span>Events (live / upcoming+archive / draft)</span><b class="tnum">' + liveN + ' / ' + pubN + ' / ' + draftN + '</b></div>'
                    + '<div class="fin-row"><span>Passes issued</span><b class="tnum">' + fmtN(db.registrations.length) + '</b></div>'
                    + '<div class="fin-row"><span>Verified orders settled</span><b class="tnum">' + fmtN(db.orders.filter(o => o.status === 'paid').length) + '</b></div></div>');
            },
            'reg-role': (dd, el) => { const hidden = document.getElementById('reg-role'); if (hidden) hidden.value = dd.r; const of = document.getElementById('org-field'); if (of) of.style.display = dd.r === 'organizer' ? 'block' : 'none'; el.parentElement.querySelectorAll('.chip-f').forEach(x => x.classList.toggle('act', x === el)) },
            'fav': dd => {
                const u = session(); if (!u) { location.hash = '#/login?next=' + encodeURIComponent(location.hash); return }
                const i = db.favorites.findIndex(f => f.userId === u.id && f.eventId === dd.id);
                if (i >= 0) { db.favorites.splice(i, 1); toast('Removed from wishlist.', 'info') }
                else { db.favorites.push({ id: uid('fv'), userId: u.id, eventId: dd.id, created_at: new Date().toISOString() }); toast('Added to wishlist.', 'ok') }
                persist(); render()
            },
            'checkout': dd => {
                const u = session();
                const ev = db.events.find(e => e.id === dd.id);
                if (ev && !evPurchasable(ev)) { openEndedModal(); return }
                const next = '#/checkout/' + dd.id + (dd.tier ? '?tier=' + dd.tier : '');
                if (!u) { location.hash = '#/login?next=' + encodeURIComponent(next); return } location.hash = next
            },
            'copy-link': dd => {
                const url = location.origin + location.pathname + '#/event/' + dd.id;
                if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Event link copied to clipboard.', 'ok')).catch(() => toast('Link: ' + url, 'info'));
                else toast('Link: ' + url, 'info')
            },
            'home-hub': dd => { HOME_HUB = dd.h; render() },
            'co-tier': dd => {
                CO.tierId = dd.id; CO.qty = 1; $$('.co-tier').forEach(x => x.classList.toggle('act', x.dataset.id === dd.id));
                const qn = document.getElementById('co-qty'); if (qn) qn.textContent = '1';
                coSummaryFor(db.events.find(e => e.id === location.hash.split('?')[0].replace('#/checkout/', '')))
            },
            'co-qty': dd => {
                const t = tierById(CO.tierId); if (!t) return; const left = t.quantity - soldOf(t.id);
                CO.qty = Math.max(1, Math.min(10, Math.min(left, CO.qty + +dd.d))); const qn = document.getElementById('co-qty'); if (qn) qn.textContent = CO.qty;
                coSummaryFor(db.events.find(e => e.id === location.hash.split('?')[0].replace('#/checkout/', '')))
            },
            'co-pay': (dd, el) => {
                CO.pay = dd.p; $$('.paycard').forEach(x => x.classList.toggle('act', x === el));
                coSummaryFor(db.events.find(e => e.id === location.hash.split('?')[0].replace('#/checkout/', '')))
            },
            'tkt-tab': dd => { TK_TAB = dd.t; render() },
            'tkt-qr': dd => { const r = db.registrations.find(x => x.id === dd.id); if (r) passModal(r) },
            'tkt-ics': dd => { const r = db.registrations.find(x => x.id === dd.id); if (!r) return; const ev = db.events.find(e => e.id === r.eventId); if (ev) downloadICS(ev, r) },
            'tkt-cancel': dd => {
                const r = db.registrations.find(x => x.id === dd.id); if (!r) return;
                const ev = db.events.find(e => e.id === r.eventId);
                if (ev && evEnded(ev)) { toast('This event has already taken place \u2014 passes for completed events can no longer be cancelled.', 'warn'); return }
                confirmModal({ title: 'Cancel this pass?', body: 'Your ' + esc(r.tierName) + ' pass will be released back into inventory and the order settled as cancelled.', okLabel: 'Cancel Pass', danger: true, onOk: () => { r.status = 'cancelled'; const o = db.orders.find(o => o.registrationId === r.id); if (o && o.status === 'paid') o.status = 'refunded'; persist(); toast('Pass cancelled \u2014 seat released to inventory.', 'info'); render() } })
            },
            'pay-resume': dd => {
                const o = db.orders.find(x => x.id === dd.id); if (!o || o.status !== 'pending') return;
                if (!CONFIG.payments.createSessionUrl) { toast('Payment gateway is not connected yet \u2014 configure EVENTORA_CONFIG.payments to complete this payment.', 'warn'); return }
                toast('Reopening ' + methodLabel(o.intent.method) + ' session\u2026', 'info');
                fetch(CONFIG.payments.createSessionUrl, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ref: o.intent.ref, amount: o.total, currency: o.currency || CUR_DEFAULT, method: o.intent.method,
                        description: 'Eventora pending order', callbackUrl: location.origin + location.pathname + '#/payment/callback'
                    })
                })
                    .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, j })))
                    .then(({ ok, j }) => {
                        if (!ok) throw new Error(j && j.error ? j.error : 'gateway error');
                        const url = j.redirectUrl || j.url || j.payment_url; if (url) window.location.href = url; else throw new Error(j && j.error ? j.error : 'no redirect url')
                    })
                    .catch(err => {
                        console.error('SSLCommerz resume failed:', err);
                        payFailModal('Payment could not be resumed', (err && err.message ? esc(err.message) : 'We couldn\u2019t reach the payment gateway.') + ' Your order remains pending \u2014 no charge has been made.');
                    });
            },
            'pay-cancel': dd => {
                const o = db.orders.find(x => x.id === dd.id); if (!o || o.status !== 'pending') return;
                confirmModal({ title: 'Cancel this pending payment?', body: 'No charge has been made. The pending order for ' + fmtMoney(o.total, o.currency) + ' will be marked cancelled \u2014 you can start a fresh checkout any time.', okLabel: 'Cancel Payment', danger: true, onOk: () => { o.status = 'cancelled'; persist(); toast('Pending payment cancelled.', 'info'); render() } })
            },
            'notif-open': dd => {
                const n = db.notifications.find(x => x.id === dd.id); if (!n) return; n.read = true; persist();
                if (n.link) { const target = n.link; location.hash = target; if (location.hash === target) render() } else render()
            },
            'notif-all': () => { myNotifs().forEach(n => n.read = true); persist(); toast('All notifications marked read.', 'ok'); render() },
            'notif-clear': () => confirmModal({ title: 'Clear all notifications?', body: 'This permanently clears your signal feed.', okLabel: 'Clear All', danger: true, onOk: () => { const u = session(); db.notifications = db.notifications.filter(n => n.userId !== u.id); persist(); toast('Feed cleared.', 'info'); render() } }),
            'nf-tab': dd => { NF = dd.t; render() },
            'pref-toggle': (dd, el) => { const u = session(); if (!u) return; u.notifPrefs[dd.k] = !u.notifPrefs[dd.k]; el.classList.toggle('on'); persist() },
            'dir-set-event': dd => { DS.eventId = dd.id; DS.page = 1; DS.sel = {}; render() },
            'dir-tier': dd => { DS.tier = dd.t; DS.page = 1; $$('[data-action="dir-tier"]').forEach(x => x.classList.toggle('act', x.dataset.t === dd.t)); dirDraw() },
            'dir-status': dd => { DS.status = dd.s; DS.page = 1; dirDraw() },
            'dir-page': dd => { DS.page = +dd.p; dirDraw() },
            'dir-rfid': dd => { const r = db.registrations.find(x => x.id === dd.id); if (!r || r.tierName === 'Virtual') return; r.rfid = !r.rfid; persist(); dirDraw() },
            'dir-qr': dd => { const r = db.registrations.find(x => x.id === dd.id); if (r) passModal(r) },
            'dir-resend': dd => { const r = db.registrations.find(x => x.id === dd.id); if (!r) return; toast('Pass email re-sent to ' + esc(r.attendeeEmail) + '.', 'ok') },
            'dir-reassign': dd => {
                const r = db.registrations.find(x => x.id === dd.id); if (!r) return; const ev = db.events.find(e => e.id === r.eventId);
                openModal('<div class="modal-h"><h3>Reassign Tier \u2014 ' + esc(r.attendeeName) + '</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                    + '<div class="modal-b"><form data-form="reassign" data-rid="' + r.id + '">'
                    + '<div class="field"><label>New Ticket Tier</label><select class="inp" name="tier">' + evTiers(ev).map(t => '<option value="' + t.id + '" ' + (t.id === r.ticketId ? 'selected' : '') + '>' + esc(t.name) + ' \u2014 ' + (t.price === 0 ? 'Free' : fmtMoney(t.price)) + '</option>').join('') + '</select></div>'
                    + '<div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-g" data-close>Cancel</button><button class="btn btn-p" type="submit">Reassign Pass</button></div></form></div>')
            },
            'dir-checkin': dd => {
                const r = db.registrations.find(x => x.id === dd.id); if (!r) return;
                const t = new Date(); r.status = 'checked_in'; r.checkInTime = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); r.gate = r.gate && r.gate.indexOf('VIP') === 0 ? r.gate : 'Gate 2 Turnstile';
                if (r.userId) notify(r.userId, 'You\u2019re checked in', 'Gate telemetry verified your pass at ' + r.gate + '.', 'system', '#/attendee/tickets');
                persist(); toast(esc(r.attendeeName) + ' checked in at ' + r.checkInTime + '.', 'ok'); dirDraw()
            },
            'dir-refund': dd => {
                const r = db.registrations.find(x => x.id === dd.id); if (!r) return;
                confirmModal({ title: 'Refund this pass?', body: esc(r.attendeeName) + '\u2019s settlement (' + CUR + ' BDT) will be reversed and the pass invalidated at the gate mesh.', okLabel: 'Refund Pass', danger: true, onOk: () => { r.status = 'refunded'; const o = db.orders.find(o => o.registrationId === r.id); if (o && o.status === 'paid') o.status = 'refunded'; persist(); toast('Pass refunded and invalidated.', 'info'); dirDraw() } })
            },
            'export-manifest': () => {
                const list = dirFiltered();
                const rows = [['Name', 'Email', 'Tier', 'PassID', 'Status', 'CheckIn', 'Gate', 'RFID', 'AmountBDT']].concat(list.map(r => { const o = db.orders.find(o => o.registrationId === r.id); return [r.attendeeName, r.attendeeEmail, r.tierName, r.passId, r.status, r.checkInTime || '', r.gate || '', r.rfid ? 'yes' : 'no', o ? o.total : ''] }));
                downloadFile('eventora-manifest-' + String(DS.eventId).slice(-6) + '.csv', rows.map(r => r.map(csvEsc).join(',')).join('\n'));
                toast('Manifest exported \u2014 ' + list.length + ' rows.', 'ok')
            },
            'ev-publish': dd => {
                const ev = db.events.find(e => e.id === dd.id); if (!ev) return;
                ev.status = ev.status === 'draft' ? 'published' : 'draft';
                persist(); toast(ev.title + (ev.status === 'published' ? ' published to the live mesh.' : ' moved to drafts.'), 'ok'); render()
            },
            'ev-delete': dd => {
                const ev = db.events.find(e => e.id === dd.id); if (!ev) return;
                confirmModal({
                    title: 'Delete \u201c' + esc(ev.title) + '\u201d?', body: 'All tiers, registrations and passes for this event are permanently destroyed. This cannot be undone.', okLabel: 'Delete Event', danger: true, onOk: () => {
                        db.events = db.events.filter(e => e.id !== dd.id); db.tickets = db.tickets.filter(t => t.eventId !== dd.id);
                        db.registrations = db.registrations.filter(r => r.eventId !== dd.id); db.orders = db.orders.filter(o => o.eventId !== dd.id);
                        db.schedule = db.schedule.filter(s => s.eventId !== dd.id); db.speakers = db.speakers.filter(s => s.eventId !== dd.id);
                        db.favorites = db.favorites.filter(f => f.eventId !== dd.id);
                        persist(); toast('Event deleted from the mesh.', 'info'); render()
                    }
                })
            },
            'ros-ev': dd => { ROS_EV = dd.id; render() },
            'ros-del': dd => { db.schedule = db.schedule.filter(s => s.id !== dd.id); persist(); toast('Session removed.', 'info'); render() },
            'ros-speaker-del': dd => { db.speakers = db.speakers.filter(s => s.id !== dd.id); persist(); toast('Speaker removed.', 'info'); render() },
            'wiz-goto': dd => { if (!W) return; W.step = +dd.s; render() },
            'wiz-next': () => { if (!W) return; W.step = Math.min(5, W.step + 1); render() },
            'wiz-cat': (dd, el) => { if (!W) return; W.category = dd.c; el.parentElement.querySelectorAll('.chip-f').forEach(x => x.classList.toggle('act', x === el)); wizDirty(); wizSoftRefresh() },
            'wiz-mode': (dd, el) => { if (!W) return; W.deliveryMode = dd.m; el.parentElement.querySelectorAll('.mode-c').forEach(x => x.classList.toggle('act', x === el)); wizDirty() },
            'wiz-theme': (dd, el) => { if (!W) return; W.theme = dd.c; el.parentElement.querySelectorAll('.sw').forEach(x => x.classList.toggle('act', x === el)); const hx = document.getElementById('wiz-hex'); if (hx) hx.textContent = dd.c.toUpperCase(); wizDirty(); wizSoftRefresh() },
            'wiz-browse': () => { const f = document.getElementById('wiz-file'); if (f) f.click() },
            'wiz-gen-cover': () => { if (!W) return; W.cover = pic('gen' + Math.random().toString(36).slice(2, 7), 1280, 720); wizDirty(); toast('Eventora AI rendered a keyframe.', 'ok'); render() },
            'wiz-add-tier': () => { if (!W) return; W.tiers.push({ id: uid('t'), name: 'New Tier', price: 5000, qty: 500, perks: '', vip: false }); wizDirty(); render() },
            'wiz-del-tier': dd => { if (!W) return; W.tiers.splice(+dd.i, 1); wizDirty(); render() },
            'wiz-tier-vip': (dd, el) => { if (!W) return; W.tiers[+dd.i].vip = !W.tiers[+dd.i].vip; el.classList.toggle('on'); wizDirty() },
            'wiz-add-sched': () => { if (!W) return; W.schedule.push({ day: 1, time: '10:00', title: '', location: '' }); wizDirty(); render() },
            'wiz-del-sched': dd => { if (!W) return; W.schedule.splice(+dd.i, 1); wizDirty(); render() },
            'wiz-add-spk': () => { if (!W) return; W.speakers.push({ name: '', role: '', org: '' }); wizDirty(); render() },
            'wiz-del-spk': dd => { if (!W) return; W.speakers.splice(+dd.i, 1); wizDirty(); render() },
            'wiz-save-draft': () => {
                if (!W) return; if (!W.title || W.title.trim().length < 4) { toast('Give your event a title (min 4 chars) before saving.', 'warn'); return }
                syncWiz(false); wizSaveAt = Date.now(); toast('Draft saved to cloud node.', 'ok')
            },
            'wiz-preview': () => {
                if (!W) return; if (!W.title) { toast('Add a title first \u2014 the portal needs a headline.', 'warn'); return }
                const paid = W.tiers.map(t => +t.price || 0).filter(p => p > 0), min = paid.length ? Math.min.apply(null, paid) : 0;
                const hasFree = W.tiers.some(t => +t.price === 0), c = catOf(W.category);
                openModal('<div class="modal-h"><h3>Live Ticket Portal Preview</h3><span class="pill pill-live" style="font-size:9px">Realtime</span><button class="mclose" data-close style="margin-left:8px">' + ic('x', 16) + '</button></div>'
                    + '<div class="modal-b"><div class="glass ev-card" style="max-width:420px;margin:0 auto;pointer-events:none">'
                    + '<div class="ev-media">' + (W.cover ? '<img src="' + W.cover + '">' : '<div style="height:100%;display:grid;place-items:center;color:var(--mut)">' + ic('image', 30) + '</div>')
                    + '<div class="ev-datep">' + (W.startDate ? datePill(W.startDate, W.endDate) : 'DATE TBD') + '</div></div>'
                    + '<div class="ev-body"><div class="ev-cat" style="color:' + c.color + '">' + esc(c.name) + '</div><h3>' + esc(W.title) + '</h3>'
                    + '<div class="ev-venue">' + ic('pin', 13) + ' ' + esc(W.venue || 'Venue TBD') + '</div><p class="ev-desc">' + esc(W.subtitle || '') + '</p>'
                    + '<div class="ev-meta"><div class="pr"><span class="tnum">' + (hasFree && !min ? 'Free' : 'From ' + fmtT(min)) + '</span><label>Starting</label></div></div></div></div>'
                    + '<p class="small mut mt16" style="text-align:center">This is exactly how attendees will see your portal card once published.</p></div>')
            },
            'wiz-publish': () => {
                if (!W) return; const ev = syncWiz(true); if (!ev) return;
                notify(ev.organizerId, 'Event published \u2014 ' + ev.title, 'Your arena is live on the public mesh. Manage attendees from the directory.', 'sale', '#/organizer/attendees?event=' + ev.id);
                persist(); toast('\u201c' + esc(ev.title) + '\u201d published to the live mesh.', 'ok'); location.hash = '#/organizer/events'
            },
            'wiz-map': () => {
                if (!W) return; openModal('<div class="modal-h"><h3>Venue Floorplan \u2014 ' + esc(W.hall || 'Main Hall') + '</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                    + '<div class="modal-b"><div class="ven-map" style="margin:0"><svg viewBox="0 0 800 400" style="height:340px">'
                    + '<rect width="800" height="400" fill="#e9e6dd"/>'
                    + '<g stroke="#d8d4c8" stroke-width="12" fill="none"><path d="M0 120 L800 150"/><path d="M180 0 L240 400"/><path d="M600 0 L560 400"/></g>'
                    + '<g fill="#dcd8cc"><rect x="80" y="40" width="180" height="50" rx="4"/><rect x="80" y="180" width="160" height="140" rx="4"/><rect x="320" y="200" width="160" height="120" rx="4"/><rect x="620" y="60" width="140" height="80" rx="4"/><rect x="620" y="250" width="140" height="100" rx="4"/></g>'
                    + '<rect x="330" y="60" width="180" height="110" rx="8" fill="#6366f1" opacity=".85"/>'
                    + '<text x="420" y="120" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="16" fill="#fff">PLENARY HALL</text>'
                    + '<circle cx="420" cy="170" r="8" fill="#ec4899" stroke="#fff" stroke-width="3"/>'
                    + '<text x="420" y="196" text-anchor="middle" font-family="Inter" font-size="11" fill="#3f3a2f">360\u00b0 Camera Rig \u00b7 Stage Edge</text></svg></div></div>', 'wide')
            },
            'mod-approve': dd => {
                const qq = db.users.find(x => x.id === dd.id); if (!qq) return; qq.status = 'active'; qq.verified = true;
                notify(qq.id, 'KYC approved \u2014 welcome to Eventora OS', 'Your organizer clearance is active. You can now publish arenas on the mesh.', 'system');
                persist(); toast(esc(qq.name) + ' approved and verified.', 'ok'); render()
            },
            'mod-revoke': dd => {
                const qq = db.users.find(x => x.id === dd.id); if (!qq) return; qq.status = 'suspended';
                notify(qq.id, 'API access revoked', 'Anomalous velocity detected. Contact platform moderation to appeal.', 'alert');
                persist(); toast(esc(qq.name) + ' suspended \u2014 API revoked.', 'warn'); render()
            },
            'mod-flag': dd => {
                const qq = db.users.find(x => x.id === dd.id); if (!qq) return; const me = session();
                if (me) notify(me.id, 'Audit flagged for manual review', qq.name + ' queued for executive inspection.', 'alert', '#/admin');
                persist(); toast(esc(qq.name) + ' flagged for manual review.', 'info')
            },
            'stage-feature': dd => {
                const ev = db.events.find(e => e.id === dd.id); if (!ev) return; ev.featured = !ev.featured; persist();
                toast(ev.title + (ev.featured ? ' featured on the landing mesh.' : ' removed from featured.'), 'ok'); render()
            },
            'stage-suspend': dd => {
                const ev = db.events.find(e => e.id === dd.id); if (!ev) return; ev.status = ev.status === 'cancelled' ? 'published' : 'cancelled'; persist();
                toast(ev.title + (ev.status === 'cancelled' ? ' suspended from the mesh.' : ' restored.'), ev.status === 'cancelled' ? 'warn' : 'ok'); render()
            },
            'export-telemetry': () => {
                const rows = [['Event', 'Status', 'Attendees', 'RevenueBDT', 'Date']].concat(db.events.map(e => [e.title, evState(e), evRegs(e.id).length, evRevenue(e.id).toFixed(2), e.startDate]));
                downloadFile('eventora-telemetry-log.csv', rows.map(r => r.map(csvEsc).join(',')).join('\n')); toast('Telemetry log exported.', 'ok')
            },
            'export-settlement': () => {
                const rows = [['OrderID', 'Event', 'Tier', 'Qty', 'UnitBDT', 'FeesBDT', 'TotalBDT', 'Method', 'Status', 'TxnRef', 'CreatedAt']].concat(db.orders.map(o => {
                    const ev = db.events.find(e => e.id === o.eventId);
                    return [o.id, ev ? ev.title : '', o.tierName || '', o.quantity || 1, o.unitPrice || 0, o.fees || 0, o.total || 0, methodLabel(o.method), o.status, o.txnId || '', o.created_at || '']
                }));
                downloadFile('eventora-settlement-report.csv', rows.map(r => r.map(csvEsc).join(',')).join('\n')); toast('Settlement report exported.', 'ok')
            },
            'maint-toggle': (dd, el) => { db.meta.maintenance = !db.meta.maintenance; persist(); el.classList.toggle('on'); toast('Maintenance mode ' + (db.meta.maintenance ? 'enabled' : 'disabled') + '.', 'info') },
            'reset-demo': () => confirmModal({
                title: 'Reset the entire demo mesh?', body: 'All accounts, events, passes and orders return to factory seed data.', okLabel: 'Reset Everything', danger: true, onOk: () => {
                    freshDB(); persist();
                    W = null; ROS_EV = null; DS = { eventId: null, q: '', tier: 'all', status: 'all', page: 1, per: 10, sel: {} };
                    EX = { q: '', cat: 'all', hub: 'all', sort: 'soon' }; CO = { tierId: null, qty: 1, pay: 'bkash' }; HOME_HUB = 'all'; NF = 'all'; TK_TAB = 'upcoming';
                    toast('Mesh reset to factory seed.', 'info'); location.hash = '#/'; render()
                }
            }),
            'export-interest': () => { downloadFile('eventora-interest-list.csv', 'email\n' + db.meta.interest.map(csvEsc).join('\n')); toast('Interest list exported.', 'ok') },
            'confirm-yes': () => { const fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn() },
        };
        document.addEventListener('click', e => {
            if (e.target.classList && e.target.classList.contains('modal-back')) { closeModal(); return }
            const ddBtn = e.target.closest('[data-dd]');
            if (ddBtn) {
                const w = ddBtn.closest('.dd-wrap'), was = w.classList.contains('open');
                $$('.dd-wrap.open').forEach(x => x.classList.remove('open'));
                if (!was) { w.classList.add('open'); const dd = w.querySelector('.dd'); if (dd) clampDD(dd) }
                return
            }
            if (!e.target.closest('.dd-wrap')) $$('.dd-wrap.open').forEach(x => x.classList.remove('open'));
            const go = e.target.closest('[data-go]');
            if (go) { $$('.dd-wrap.open').forEach(x => x.classList.remove('open')); location.hash = go.dataset.go; return }
            const act = e.target.closest('[data-action]');
            if (act) {
                e.preventDefault(); e.stopPropagation(); $$('.dd-wrap.open').forEach(x => x.classList.remove('open'));
                const fn = Actions[act.dataset.action]; if (fn) fn(act.dataset, act, e); return
            }
            const cl = e.target.closest('[data-close]');
            if (cl) { if (cl.dataset.close === 'mmenu') closeMMenu(); else closeModal(); return }
        });
        document.addEventListener('change', e => {
            const t = e.target;
            if (t.id === 'dir-all') {
                const rows = dirFiltered().slice((DS.page - 1) * DS.per, DS.page * DS.per);
                rows.forEach(r => { if (t.checked) DS.sel[r.id] = 1; else delete DS.sel[r.id] });
                dirDraw();
            } else if (t.classList && t.classList.contains('dir-ck')) {
                if (t.checked) DS.sel[t.dataset.id] = 1; else delete DS.sel[t.dataset.id];
                const tr = t.closest('tr'); if (tr) tr.classList.toggle('sel', t.checked);
                const n = Object.keys(DS.sel).length;
                const si = document.getElementById('dir-selinfo'); if (si) { si.style.display = n ? 'inline-flex' : 'none'; si.textContent = n + ' selected' }
                const allCk = document.getElementById('dir-all');
                const rows = dirFiltered().slice((DS.page - 1) * DS.per, DS.page * DS.per);
                if (allCk) allCk.checked = rows.length > 0 && rows.every(r => DS.sel[r.id]);
            } else if (t.id === 'avatar-input' && t.files && t.files[0]) {
                uploadAvatar(t.files[0]);
            }
        });
        document.addEventListener('submit', async e => {
            const f = e.target, kind = f.dataset.form; if (!kind) return; e.preventDefault();
            if (kind === 'login' || kind === 'register') {
                const err = document.getElementById('auth-err'); err.textContent = '';
                const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
                try {
                    if (kind === 'register') {
                        const name = f.name.value.trim(), email = f.email.value.trim(), pass = f.pass.value;
                        const roleEl = document.getElementById('reg-role'), role = roleEl ? roleEl.value : 'attendee';
                        if (name.length < 2) { err.textContent = 'Please enter your full name.'; return }
                        if (!/.+@.+\..+/.test(email)) { err.textContent = 'Please enter a valid email address.'; return }
                        const pwErr = passwordStrengthError(pass);
                        if (pwErr) { err.textContent = pwErr; return }
                        const e2 = await doRegister(name, email, pass, role, f.org ? f.org.value : '');
                        if (e2 === 'ACCOUNT_CREATED_CONFIRM_EMAIL') { toast('Account created \u2014 check your email to confirm, then sign in.', 'ok'); location.hash = '#/login'; return }
                        if (e2 === 'ACCOUNT_CREATED_GO_LOGIN') { toast('Account created \u2014 sign in to continue.', 'ok'); location.hash = '#/login'; return }
                        if (e2) { err.textContent = e2; return }
                    } else {
                        const e2 = await doLogin(f.email.value, f.pass.value);
                        if (e2) { err.textContent = e2; return }
                        const u = session(); toast('Welcome back, ' + esc(u.name.split(' ')[0]) + '.', 'ok');
                        const rawNext = f.dataset.next ? decodeURIComponent(f.dataset.next) : '';
                        /* Only honor "return to where you were" if that page actually belongs
                           to the role that just logged in \u2014 otherwise it bounces through a
                           rejected route first, which looks like a flicker. */
                        const nextIsAllowed = rawNext && (
                            u.role === 'admin' ||
                            (u.role === 'organizer' && rawNext.indexOf('#/organizer') === 0) ||
                            (u.role === 'attendee' && /^#\/(attendee|profile|notifications|events)/.test(rawNext))
                        );
                        location.hash = nextIsAllowed ? rawNext : homeFor(u);
                    }
                } finally { if (btn) btn.disabled = false }
            }
            else if (kind === 'checkout') placeOrder(f);
            else if (kind === 'forgotpw') {
                const err = document.getElementById('fp-err'); err.textContent = '';
                const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
                try {
                    const { error } = await sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: location.origin + location.pathname + '#/reset-password' });
                    if (error) { err.textContent = error.message; return }
                    toast('If that email has an account, a reset link is on its way.', 'ok');
                    location.hash = '#/login';
                } finally { if (btn) btn.disabled = false }
            }
            else if (kind === 'setnewpw') {
                const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
                try {
                    const pwErr1 = passwordStrengthError(f.nw.value); if (pwErr1) { toast(pwErr1, 'warn'); return }
                    const { error } = await sb.auth.updateUser({ password: f.nw.value });
                    if (error) { toast('Could not update password: ' + error.message, 'err'); return }
                    PW_RECOVERY_READY = false;
                    await sb.auth.signOut();
                    toast('Password updated \u2014 please sign in.', 'ok');
                    location.hash = '#/login';
                } finally { if (btn) btn.disabled = false }
            }
            else if (kind === 'request-access') {
                const em = document.getElementById('cta-email').value.trim();
                if (!/.+@.+\..+/.test(em)) { toast('Enter a valid email to request access.', 'warn'); return }
                if (db.meta.interest.indexOf(em) >= 0) { toast('You\u2019re already on the access list.', 'info'); return }
                db.meta.interest.push(em); persist();
                document.getElementById('cta-zone').innerHTML = '<div class="cta-ok">' + ic('checkc', 18) + ' You\u2019re on the list \u2014 invite waves go out every Friday.</div>';
                toast('Access request sealed into the queue.', 'ok');
            }
            else if (kind === 'contact') {
                db.messages.push({ id: uid('msg'), name: f.name.value.trim(), email: f.email.value.trim(), topic: f.topic.value, msg: f.msg.value.trim(), created_at: new Date().toISOString() });
                persist(); f.reset(); toast('Message delivered to the operations inbox.', 'ok');
            }
            else if (kind === 'profile') {
                const u = session(); if (!u) return;
                const name = f.name.value.trim() || u.name, title = f.title.value, org = f.org ? f.org.value : u.org;
                const { error } = await sb.from('profiles').update({ name, title, org }).eq('id', u.id);
                if (error) { toast('Could not save profile: ' + error.message, 'err'); return }
                u.name = name; u.title = title; if (f.org) u.org = org; persist(); toast('Profile updated.', 'ok'); render()
            }
            else if (kind === 'password') {
                const u = session(); if (!u) return;
                const pwErr2 = passwordStrengthError(f.nw.value); if (pwErr2) { toast(pwErr2, 'warn'); return }
                const { error: reErr } = await sb.auth.signInWithPassword({ email: u.email, password: f.cur.value });
                if (reErr) { toast('Current password is incorrect.', 'err'); return }
                const { error } = await sb.auth.updateUser({ password: f.nw.value });
                if (error) { toast('Could not update password: ' + error.message, 'err'); return }
                f.reset(); toast('Password updated.', 'ok')
            }
            else if (kind === 'settings') { db.meta.fees = Math.max(0, Math.min(30, parseFloat(f.fees.value) || 5)); persist(); toast('Settlement configuration saved.', 'ok') }
            else if (kind === 'reassign') {
                const r = db.registrations.find(x => x.id === f.dataset.rid), t = tierById(f.tier.value);
                if (r && t) { r.ticketId = t.id; r.tierName = t.name; persist(); closeModal(); toast('Pass reassigned to ' + esc(t.name) + '.', 'ok'); dirDraw() }
            }
            else if (kind === 'ros-add') {
                if (!ROS_EV) { toast('Publish an event first.', 'warn'); return }
                db.schedule.push({ id: uid('sc'), eventId: ROS_EV.id, day: +f.day.value, time: f.time.value, title: f.title.value, location: f.loc.value || 'Main Hall' });
                persist(); toast('Session anchored to the stage grid.', 'ok'); render()
            }
            else if (kind === 'speaker-add') {
                if (!ROS_EV) { toast('Publish an event first.', 'warn'); return }
                db.speakers.push({ id: uid('sp'), eventId: ROS_EV.id, name: f.name.value, role: f.role.value || 'Speaker', org: f.org.value || 'Independent', seed: pic(f.name.value.toLowerCase().replace(/[^a-z]/g, '') || 'spk', 80, 80) });
                persist(); toast('Speaker added to the manifest.', 'ok'); render()
            }
        });
        function passModal(reg) {
            const ev = db.events.find(e => e.id === reg.eventId);
            const owner = reg.userId ? userById(reg.userId) : null;
            const ava = owner && owner.avatarSeed ? owner.avatarSeed : pic((reg.attendeeName || 'g').toLowerCase().replace(/[^a-z]/g, '') || 'g', 80, 80);
            const ord = db.orders.find(o => o.registrationId === reg.id);
            openModal('<div class="modal-h"><h3>Digital Pass</h3><button class="mclose" data-close>' + ic('x', 16) + '</button></div>'
                + '<div class="modal-b"><div class="pass"><div class="p-cover"><img src="' + coverOf(ev) + '" alt=""></div>'
                + '<div class="p-body"><img class="p-ava" src="' + ava + '" alt=""><div class="p-name">' + esc(reg.attendeeName) + '</div>'
                + '<span class="tier-b ' + (reg.tierName.includes('VIP') ? 'tier-vip' : reg.tierName === 'Virtual' ? 'tier-vir' : 'tier-std') + '" style="margin-top:6px">' + esc(reg.tierName) + '</span>'
                + '<div class="p-grid"><div><label>Event</label><b>' + esc(ev.title) + '</b></div><div><label>Date</label><b>' + fmtRange(ev.startDate, ev.endDate) + '</b></div>'
                + '<div><label>Pass ID</label><b class="mono" style="color:var(--cyan2)">' + reg.passId + '</b></div>'
                + '<div><label>Status</label><b style="color:' + (reg.status === 'checked_in' ? 'var(--green)' : 'var(--amber)') + '">' + reg.status.replace('_', ' ') + '</b></div></div>'
                + '<div class="qr-panel" id="qr-host"></div>'
                + (ord && ord.txnId ? '<p class="small mut" style="text-align:center;margin-bottom:8px">Txn <span class="mono" style="color:#7dd3fc">' + esc(ord.txnId) + '</span> \u00b7 ' + fmtMoney(ord.total) + '</p>' : '')
                + '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><span class="pill pill-mut">' + ic('shield', 11) + ' NFC Encrypted</span><span class="pill pill-mut">ECDSA-256</span></div></div></div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">'
                + '<button class="btn btn-g" data-action="tkt-ics" data-id="' + reg.id + '">' + ic('cal', 14) + ' Add to Calendar</button>'
                + '<button class="btn btn-p" data-close>Done</button></div></div>');
            qrInto(document.getElementById('qr-host'), 'EVENTORA-PASS|' + reg.passId + '|' + reg.eventId + '|' + reg.attendeeName);
        }
        document.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paletteOpen() }
            if (e.key === 'Escape') { if (PAL.open) paletteClose(); else if (document.getElementById('modal-root').innerHTML) closeModal(); else { const mm = document.getElementById('mmenu'); if (mm && mm.classList.contains('open')) closeMMenu() } }
        });
        window.addEventListener('resize', deb(fitMarquee, 200));
        const IMG_FB = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2038"/><stop offset="1" stop-color="#0b0f19"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/><circle cx="400" cy="200" r="46" fill="none" stroke="#6366f1" stroke-opacity=".55" stroke-width="2"/><path d="M370 200l22 22 42-48" stroke="#8b5cf6" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="400" y="300" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#64748b">Eventora Visual Mesh</text></svg>');
        document.addEventListener('error', e => {
            const t = e.target;
            if (t && t.tagName === 'IMG' && !t.dataset.fbked) { t.dataset.fbked = '1'; t.src = IMG_FB }
        }, true);
        if (!load()) { freshDB() }
        /* Never trust a leftover local session pointer \u2014 only a real, live Supabase session counts. */
        db.meta.sessionUserId = null;
        persist()
        /* Peeking at localStorage synchronously for a persisted Supabase auth token tells us,
           before the first paint, whether a hard reload on a guarded page (dashboard, etc.) is
           likely to end up logged in once Supabase's own async session check resolves. If a
           token is sitting there, guardLogin() shows a brief loading state instead of bouncing
           to Sign In and immediately back \u2014 that flash-to-login-then-back was the whole bug. */
        let SESSION_CHECK_PENDING = false;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && /^sb-.*-auth-token$/.test(k)) { SESSION_CHECK_PENDING = true; break }
            }
        } catch (e) { /* localStorage inaccessible \u2014 fall back to the old (non-flickering-safe) behavior */ }
        window.addEventListener('hashchange', render);
        /* Remember whether we booted straight into a raw Supabase token bundle (Google OAuth
           return, magic link, or password-recovery link) BEFORE anything else touches the hash,
           and use it to arm AUTH_CALLBACK_PENDING \u2014 render() will hold a loading state under
           that flag alone, since the hash itself can be silently rewritten by the SDK. */
        const BOOT_HASH = location.hash;
        const BOOT_WAS_AUTH_CALLBACK = isAuthCallbackHash(BOOT_HASH);
        AUTH_CALLBACK_PENDING = BOOT_WAS_AUTH_CALLBACK;
        try { render() } catch (err) {
            console.error('Eventora boot error:', err);
            document.getElementById('app').innerHTML = '<div class="glass err-panel"><h2>Startup fault</h2><pre>' + esc(String(err)) + '</pre><button class="btn btn-p" onclick="localStorage.removeItem(\'eventora_db_v2\');location.reload()">Reset & Reload</button></div>';
        }
        window.__eventoraBooted = true;
        /* Ends the "resolving sign-in" state and sends the user to a clean "#/..." route in one
           shot. Gated on AUTH_CALLBACK_PENDING itself (not the live hash) so it can't be fooled
           by Supabase quietly stripping the token bundle out from under us, and can't double-fire
           if both the boot IIFE and onAuthStateChange race to call it. */
        async function landAfterAuthCallback(u, authUser) {
            if (!AUTH_CALLBACK_PENDING) return; /* already handled elsewhere */
            AUTH_CALLBACK_PENDING = false;
            const intent = consumeAuthIntent();
            if (u && authUser && intent && intent.tab === 'register') {
                /* Supabase sets created_at and last_sign_in_at to (near enough) the same
                   instant only on a brand-new account's very first sign-in \u2014 a big gap
                   between them means this Google identity already had an Eventora account,
                   so clicking "Register" this time doesn't get to create a second one. */
                const created = Date.parse(authUser.created_at || '');
                const lastSignIn = Date.parse(authUser.last_sign_in_at || authUser.created_at || '');
                const isBrandNew = created && Math.abs(lastSignIn - created) < 8000;
                if (!isBrandNew) {
                    db.meta.sessionUserId = null; persist();
                    try { await sb.auth.signOut() } catch (e) { }
                    toast('An account with this Google email already exists \u2014 please sign in instead.', 'warn');
                    location.replace('#/login');
                    lastRenderedHash = null; render();
                    return;
                }
                if (intent.role && intent.role !== u.role) {
                    try {
                        await sb.from('profiles').update({ role: intent.role }).eq('id', u.id);
                        u.role = intent.role; persist();
                    } catch (e) { /* non-fatal \u2014 keep whatever role the trigger assigned */ }
                }
            }
            if (u) toast('Signed in as ' + esc(u.name) + ' \u00b7 ' + u.role + ' account.', 'ok');
            location.replace(u ? homeFor(u) : '#/login');
            lastRenderedHash = null; render();
        }
        /* A live Supabase session exists but no matching public.profiles row was found (even
           after syncProfileIntoLocalCache's retry) \u2014 almost always because the auth.users \u2192
           profiles database trigger doesn't run for OAuth sign-ins, or requires a "role" that
           only the email/password sign-up form supplies. Rather than silently rendering as
           logged-out on the public page, sign the broken session back out and say so. */
        async function bailOnMissingProfile() {
            AUTH_CALLBACK_PENDING = false;
            db.meta.sessionUserId = null; persist();
            try { await sb.auth.signOut() } catch (e) { }
            toast('Signed in with Google, but no account profile was found for it. Please contact support, or try Sign Up instead.', 'err');
            location.replace('#/login');
            lastRenderedHash = null; render();
        }
        /* Failsafe: if a callback redirect never resolves (network hiccup, SDK hang, etc.),
           don't leave the user staring at "Completing sign-in\u2026" forever. */
        if (BOOT_WAS_AUTH_CALLBACK) {
            setTimeout(() => {
                if (AUTH_CALLBACK_PENDING) {
                    AUTH_CALLBACK_PENDING = false;
                    toast('Sign-in is taking longer than expected. Please try again.', 'warn');
                    location.replace('#/login'); lastRenderedHash = null; render();
                }
            }, 8000);
        }
        /* ---- Real auth boot: pick up an existing Supabase session (incl. after a Google OAuth
           redirect). The SDK parses the token bundle out of the URL internally; once
           getSession() resolves we know whether it worked and can send the user straight to
           their dashboard \u2014 or, if it failed, off the broken URL and back to Sign In. ---- */
        /* True only during this initial page-load session restore. While true, a SIGNED_IN
           event from onAuthStateChange (which races the getSession() call below on every
           fresh load, not just OAuth callbacks) must NOT navigate the user away \u2014 it should
           just sync the session quietly so whatever page they landed on (e.g. a payment
           gateway redirect back to #/payment/callback) stays put instead of being yanked to
           their dashboard mid-render. */
        let BOOT_RESTORING = true;
        (async () => {
            try {
                const { data: { session: sbSession } } = await sb.auth.getSession();
                if (sbSession && sbSession.user) {
                    await syncProfileIntoLocalCache(sbSession.user.id);
                    const u = userById(sbSession.user.id);
                    if (!u) { await bailOnMissingProfile(); return }
                    db.meta.sessionUserId = sbSession.user.id; persist();
                    if (AUTH_CALLBACK_PENDING) {
                        landAfterAuthCallback(u, sbSession.user);
                    } else { lastRenderedHash = null; render(); }
                } else if (AUTH_CALLBACK_PENDING && !PW_RECOVERY_READY) {
                    const m = /error_description=([^&]+)/.exec(BOOT_HASH);
                    toast(m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : 'Sign-in could not be completed. Please try again.', 'err');
                    landAfterAuthCallback(null);
                } else if (SESSION_CHECK_PENDING) {
                    /* We suspected a session (a token was sitting in storage) but none came back
                       \u2014 now safe to let guarded routes redirect to Sign In for real. */
                    lastRenderedHash = null; render();
                }
            } catch (e) {
                console.warn('[Eventora] Supabase session check failed', e);
                if (AUTH_CALLBACK_PENDING && !PW_RECOVERY_READY) { toast('Sign-in could not be completed. Please try again.', 'err'); landAfterAuthCallback(null) }
                else if (SESSION_CHECK_PENDING) { lastRenderedHash = null; render(); }
            } finally {
                BOOT_RESTORING = false;
                SESSION_CHECK_PENDING = false;
            }
        })();
        sb.auth.onAuthStateChange(async (event, sbSession) => {
            if (event === 'PASSWORD_RECOVERY') {
                PW_RECOVERY_READY = true;
                AUTH_CALLBACK_PENDING = false;
                if (location.hash.indexOf('#/reset-password') !== 0) location.replace('#/reset-password');
                lastRenderedHash = null; render();
                return;
            }
            if (AUTH_FLOW_BUSY) return; /* doLogin/doRegister are already handling this transition explicitly */
            if (event === 'SIGNED_IN' && sbSession && sbSession.user) {
                await syncProfileIntoLocalCache(sbSession.user.id);
                if (db.meta.sessionUserId !== sbSession.user.id) {
                    const u = userById(sbSession.user.id);
                    if (!u) { await bailOnMissingProfile(); return }
                    db.meta.sessionUserId = sbSession.user.id; persist();
                    if (AUTH_CALLBACK_PENDING) {
                        /* The boot IIFE above is also racing to handle this same fresh
                           OAuth-callback load \u2014 landAfterAuthCallback's own guard makes
                           sure only whichever gets here first actually navigates. */
                        landAfterAuthCallback(u, sbSession.user);
                    } else if (BOOT_RESTORING) {
                        /* Just an existing session being restored on a normal page load (e.g.
                           the browser landing back on #/payment/callback after a gateway
                           redirect) \u2014 sync state and redraw the CURRENT route only. Do not
                           steal the user away to their dashboard. */
                        lastRenderedHash = null; render();
                    } else {
                        lastRenderedHash = null; render();
                        toast('Signed in as ' + esc(u.name) + ' \u00b7 ' + u.role + ' account.', 'ok'); location.hash = homeFor(u);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                if (db.meta.sessionUserId) { db.meta.sessionUserId = null; persist(); lastRenderedHash = null; render(); }
            }
        });

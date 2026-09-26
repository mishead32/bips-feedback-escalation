import crypto from 'crypto';
import { CONFIG } from './config.js';

const OFF = () => CONFIG.TZ_OFFSET_MIN * 60000;

/** Google Sheets serial date (sheet timezone) -> epoch ms */
export const serialToMs = s => Math.round((Number(s) - 25569) * 86400000 - OFF());
/** epoch ms -> Google Sheets serial date (sheet timezone) */
export const msToSerial = ms => (ms + OFF()) / 86400000 + 25569;

/** Accepts serial number, "dd/mm/yyyy hh:mm:ss" text or ISO -> epoch ms (or null) */
export function toMs(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return v > 1e11 ? v : serialToMs(v);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - OFF();
  const d = Date.parse(s);
  return isNaN(d) ? null : d;
}

/** epoch ms -> "26/09/2026, 11:10 AM" in IST */
export function fmt(ms) {
  if (!ms) return '—';
  const d = new Date(ms + OFF());
  const p = n => ('0' + n).slice(-2);
  const h = d.getUTCHours(), h12 = h % 12 || 12;
  return p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() + ', ' + p(h12) + ':' + p(d.getUTCMinutes()) + (h < 12 ? ' AM' : ' PM');
}
export function stamp(ms) {
  const d = new Date(ms + OFF());
  const p = n => ('0' + n).slice(-2);
  return '[' + p(d.getUTCDate()) + '/' + p(d.getUTCMonth() + 1) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ']';
}
export function yymm(ms) {
  const d = new Date(ms + OFF());
  return String(d.getUTCFullYear()).slice(-2) + ('0' + (d.getUTCMonth() + 1)).slice(-2);
}
export const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
export const clean = v => String(v == null ? '' : v).replace(/[ \t]+\n/g, '\n').trim();
export const newToken = () => crypto.randomBytes(6).toString('hex');
export function safeEqual(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
export function colLetter(n) { let s = ''; n++; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

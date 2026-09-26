import { CONFIG } from './config.js';
import { safeEqual } from './util.js';

export function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export function checkDashboardKey(req) {
  if (!CONFIG.DASHBOARD_PASSWORD) throw Object.assign(new Error('DASHBOARD_PASSWORD is not set in Vercel environment variables.'), { code: 500 });
  const key = req.headers['x-key'] || '';
  if (!safeEqual(key, CONFIG.DASHBOARD_PASSWORD)) throw Object.assign(new Error('Wrong dashboard password'), { code: 401 });
}
export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch (e) { return {}; }
}
export function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error(e); json(res, e.code || 500, { error: e.message || String(e) }); }
  };
}

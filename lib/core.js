// Business logic: responses -> tickets -> escalation -> resolution -> parent confirmation
import { CONFIG } from './config.js';
import { Sheets } from './sheets.js';
import { send, escalationEmail, closureEmail, resolutionAlertEmail, reminderEmail, parentAlertEmail } from './email.js';
import { WA, sendParentWhatsApp } from './whatsapp.js';
import { analyse, markDuplicates, isAboutLeadership } from './insights.js';
import { toMs, msToSerial, num, clean, newToken, stamp, yymm, colLetter } from './util.js';

export const TCOLS = ['Ticket ID', 'Source Row', 'Received On', 'Parent Name', 'Mobile', 'Student Name',
  'Class & Section', 'Overall', 'Teaching & Learning', 'Environment & Safety', 'Improvement Feedback',
  'Suggestions', 'Trigger', 'Status', 'Level', 'Escalated On', 'Escalation Email', 'Token',
  'Resolution', 'Resolved By', 'Resolved On', 'Resolution WA Sent On', 'Parent Response',
  'Response Via', 'Response Remarks', 'Response On', 'Closed On', 'Last Reminder On', 'History', 'Parent Token', 'Route'];
const DATE_COLS = ['Received On', 'Escalated On', 'Resolved On', 'Resolution WA Sent On', 'Response On', 'Closed On', 'Last Reminder On'];
const NUM_COLS = ['Source Row', 'Overall', 'Teaching & Learning', 'Environment & Safety', 'Level'];

export const ST = {
  ESC: 'Escalated', REESC: 'Re-escalated', RES: 'Resolved – Awaiting Parent',
  SAT: 'Closed – Satisfied', NORESP: 'Closed – No Response',
  NC: 'Not a Complaint', DUP: 'Duplicate'
};

/* ---------------- sheet I/O ---------------- */
async function sheetNames() { return (await Sheets.listSheets()).map(s => s.title); }

/** Creates FB Tickets + FB Settings on first run. Returns true if it just set up. */
export async function ensureSetup() {
  const names = await sheetNames();
  if (!names.includes(CONFIG.RESPONSE_SHEET)) throw new Error('Tab "' + CONFIG.RESPONSE_SHEET + '" not found in the Google Sheet.');
  let fresh = false;
  if (!names.includes(CONFIG.SETTINGS_SHEET)) {
    await Sheets.addSheet(CONFIG.SETTINGS_SHEET, ['Setting', 'Value', 'Note'], []);
    await Sheets.append(CONFIG.SETTINGS_SHEET, [['EMAIL_FROM', msToSerial(Date.now()), 'Responses received before this time are imported without sending escalation emails']]);
    fresh = true;
  }
  if (!names.includes(CONFIG.TICKET_SHEET)) {
    await Sheets.addSheet(CONFIG.TICKET_SHEET, TCOLS, DATE_COLS.map(c => TCOLS.indexOf(c)));
    fresh = true;
  }
  return fresh;
}

async function settings() {
  const v = await Sheets.getValues(CONFIG.SETTINGS_SHEET);
  const o = {}; v.slice(1).forEach(r => { if (r[0]) o[r[0]] = r[1]; });
  return o;
}

export async function readResponses() {
  const vals = await Sheets.getValues(CONFIG.RESPONSE_SHEET);
  if (vals.length < 2) return [];
  const h = vals[0].map(x => String(x).toLowerCase().replace(/\s+/g, ' ').trim());
  const col = kw => h.findIndex(x => x.indexOf(kw) > -1);
  const ix = { ts: col('timestamp'), parent: col('parent name'), mobile: col('mobile'), student: col('student name'), cls: col('class'),
    overall: col('overall'), tl: col('teaching'), env: col('environment'), improve: col('less than 5'), suggest: col('additional'), remarks: col('remarks') };
  const g = (r, k) => (ix[k] > -1 ? r[ix[k]] : '');
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i] || [];
    if (!String(g(r, 'ts')).trim() && !String(g(r, 'parent')).trim()) continue;
    out.push({ row: i + 1, ts: toMs(g(r, 'ts')), parent: clean(g(r, 'parent')), mobile: clean(g(r, 'mobile')), student: clean(g(r, 'student')),
      cls: clean(g(r, 'cls')), overall: num(g(r, 'overall')), tl: num(g(r, 'tl')), env: num(g(r, 'env')),
      improve: clean(g(r, 'improve')), suggest: clean(g(r, 'suggest')), remarks: clean(g(r, 'remarks')) });
  }
  markDuplicates(out);
  out.forEach(r => Object.assign(r, analyse(r, CONFIG.THRESHOLD)));
  return out;
}

export async function readTickets() {
  const vals = await Sheets.getValues(CONFIG.TICKET_SHEET);
  const seen = {};
  const out = [];
  vals.slice(1).forEach((r, i) => {
    if (!r || !r[0]) return;
    const o = { _row: i + 2 };
    TCOLS.forEach((h, j) => {
      let v = r[j] === undefined ? '' : r[j];
      if (DATE_COLS.includes(h)) v = toMs(v);
      else if (NUM_COLS.includes(h)) v = v === '' ? '' : num(v);
      else v = String(v);
      o[h] = v;
    });
    if (seen[o['Source Row']]) return;          // ignore accidental duplicate
    seen[o['Source Row']] = 1;
    out.push(o);
  });
  return out;
}

function toRow(o) {
  return TCOLS.map(h => {
    const v = o[h];
    if (DATE_COLS.includes(h)) return v ? msToSerial(v) : '';
    return v == null ? '' : v;
  });
}
async function saveTicket(o) {
  await Sheets.update(CONFIG.TICKET_SHEET, 'A' + o._row + ':' + colLetter(TCOLS.length - 1) + o._row, [toRow(o)]);
}
function hist(o, text) { o['History'] = (o['History'] ? o['History'] + '\n' : '') + stamp(Date.now()) + ' ' + text; }

/* ---------------- sync ---------------- */
/**
 * Creates tickets for new qualifying responses.
 * minAgeMs: skip responses younger than this (lets the real-time webhook handle them, avoids duplicates)
 */
export async function sync(base, { minAgeMs = 0 } = {}) {
  await ensureSetup();
  const [resp, tickets, set] = await Promise.all([readResponses(), readTickets(), settings()]);
  const emailFrom = toMs(set.EMAIL_FROM) || 0;
  const now = Date.now();
  const byRow = {}; resp.forEach(r => byRow[r.row] = r);
  const tByRow = {}; tickets.forEach(t => tByRow[String(t['Source Row'])] = t);
  let tidied = 0;

  // 1) tidy tickets that were never emailed: positive comments and older duplicates
  for (const t of tickets) {
    if (t.Status !== ST.ESC || t['Escalation Email'] === 'Sent' || /^Manual/.test(t.Trigger)) continue;
    const r = byRow[t['Source Row']];
    if (!r) continue;
    if (r.dupOf) {
      Object.assign(t, { Status: ST.DUP, 'Closed On': now });
      hist(t, 'Marked Duplicate – parent submitted again (sheet row ' + r.dupOf + '); the latest response is used');
    } else if (!r.complaint) {
      Object.assign(t, { Status: ST.NC, 'Closed On': now });
      hist(t, 'Marked Not a Complaint – comment is positive ("' + String(r.improve).slice(0, 60) + '")');
    } else continue;
    await saveTicket(t); tidied++;
  }

  // 2) new tickets for real complaints (latest response only)
  const active = t => t && t.Status !== ST.DUP && t.Status !== ST.NC;
  const todo = [];
  for (const r of resp) {
    if (tByRow[String(r.row)] || r.dupOf || !r.complaint) continue;
    if (minAgeMs && r.ts && now - r.ts < minAgeMs) continue;
    // an older copy from the same parent/student already has a live ticket -> note it there instead of a new ticket
    const olderLive = resp.filter(x => x.dupOf === r.row).map(x => tByRow[String(x.row)]).find(t => active(t));
    if (olderLive) {
      if (!String(olderLive.History).includes('row ' + r.row + ')')) {
        hist(olderLive, 'Parent submitted the form again (sheet row ' + r.row + '): "' + String(r.improve).slice(0, 120) + '"');
        await saveTicket(olderLive);
      }
      continue;
    }
    todo.push(r);
  }
  if (!todo.length) return { created: 0, emailed: 0, tidied };
  const ids = nextIds(tickets, todo.map(r => r.ts || now));
  const newOnes = todo.map((r, i) => buildTicket(r, ids[i], r.reason, (r.ts || now) >= emailFrom));
  // re-check just before writing (another request may have created them)
  const again = new Set((await readTickets()).map(t => String(t['Source Row'])));
  const finalOnes = newOnes.filter(t => !again.has(String(t['Source Row'])));
  if (!finalOnes.length) return { created: 0, emailed: 0, tidied };
  await Sheets.append(CONFIG.TICKET_SHEET, finalOnes.map(toRow));
  let emailed = 0;
  const fresh = await readTickets();
  for (const t of finalOnes.filter(x => x['Escalation Email'] === 'Sent')) {
    const saved = fresh.find(x => x['Ticket ID'] === t['Ticket ID']);
    try { await send(escalationEmail(saved, false, base)); hist(saved, 'Escalation email sent'); emailed++; }
    catch (e) { saved['Escalation Email'] = 'FAILED – ' + e.message; hist(saved, 'Escalation email FAILED: ' + e.message); }
    await saveTicket(saved);
  }
  return { created: finalOnes.length, emailed, tidied };
}

function nextIds(tickets, dates) {
  const max = {};
  tickets.forEach(t => { const m = String(t['Ticket ID']).match(/-(\d{4})-(\d+)$/); if (m) max[m[1]] = Math.max(max[m[1]] || 0, +m[2]); });
  return dates.map(d => { const k = yymm(d); max[k] = (max[k] || 0) + 1; return CONFIG.SHORT_NAME + '-FB-' + k + '-' + ('00' + max[k]).slice(-3); });
}

function buildTicket(r, id, trigger, sendEmail) {
  const now = Date.now();
  const o = {};
  TCOLS.forEach(h => o[h] = '');
  Object.assign(o, {
    'Ticket ID': id, 'Source Row': r.row, 'Received On': r.ts || now, 'Parent Name': r.parent, 'Mobile': String(r.mobile),
    'Student Name': r.student, 'Class & Section': r.cls, 'Overall': r.overall ?? '', 'Teaching & Learning': r.tl ?? '',
    'Environment & Safety': r.env ?? '', 'Improvement Feedback': r.improve, 'Suggestions': r.suggest, 'Trigger': trigger,
    'Status': ST.ESC, 'Level': 1, 'Escalated On': sendEmail ? now : (r.ts || now),
    'Escalation Email': sendEmail ? 'Sent' : 'Not sent (old response)', 'Token': newToken(),
    'Route': isAboutLeadership(r.improve, r.suggest) ? 'Confidential' : 'Standard',
    'History': stamp(now) + ' Ticket created (' + trigger + ')' + (isAboutLeadership(r.improve, r.suggest) ? ' – CONFIDENTIAL: mentions Principal (Indu Sharma Ma\'am), not sent to the usual escalation team' : '')
  });
  return o;
}

/* ---------------- actions ---------------- */
async function getTicket(id) {
  const t = (await readTickets()).find(x => x['Ticket ID'] === String(id));
  if (!t) throw new Error('Ticket ' + id + ' not found');
  return t;
}

export async function escalateResponse(base, sourceRow, reason) {
  await ensureSetup();
  const [resp, tickets] = await Promise.all([readResponses(), readTickets()]);
  const r = resp.find(x => x.row === Number(sourceRow));
  if (!r) throw new Error('Response not found');
  const existing = tickets.find(t => String(t['Source Row']) === String(sourceRow));
  if (existing && existing.Status !== ST.NC && existing.Status !== ST.DUP) throw new Error('A ticket already exists for this response');
  let saved;
  if (existing) {           // re-open a ticket that was auto-marked Not a Complaint / Duplicate
    Object.assign(existing, { Status: ST.ESC, 'Closed On': '', 'Escalated On': Date.now(), 'Escalation Email': 'Sent', Trigger: 'Manual – ' + (reason || 'complaint in comments') });
    hist(existing, 'Re-opened and escalated manually: ' + (reason || ''));
    saved = existing;
  } else {
    const [id] = nextIds(tickets, [r.ts || Date.now()]);
    const t = buildTicket(r, id, 'Manual – ' + (reason || 'complaint in comments'), true);
    await Sheets.append(CONFIG.TICKET_SHEET, [toRow(t)]);
    saved = await getTicket(id);
  }
  await send(escalationEmail(saved, false, base));
  hist(saved, 'Escalation email sent');
  await saveTicket(saved);
  return saved['Ticket ID'];
}

/** Dashboard: close an open ticket as "Not a Complaint" (e.g. parent only gave a low star by mistake) */
export async function markNotComplaint(id, remarks) {
  const t = await getTicket(id);
  if (t.Status !== ST.ESC && t.Status !== ST.REESC) throw new Error('Only open tickets can be marked Not a Complaint.');
  Object.assign(t, { Status: ST.NC, 'Closed On': Date.now() });
  hist(t, 'Marked Not a Complaint by MIS' + (remarks ? ': ' + remarks : ''));
  await saveTicket(t);
  return 'ok';
}

export async function saveResolution(base, id, text, by, token) {
  const t = await getTicket(id);
  if (token !== undefined && t['Token'] !== token) throw new Error('This link is not valid.');
  text = String(text || '').trim();
  if (text.length < 5) throw new Error('Please write the resolution.');
  if (t.Status !== ST.ESC && t.Status !== ST.REESC) throw new Error('This ticket is already "' + t.Status + '". No resolution needed now.');
  Object.assign(t, { 'Resolution': text, 'Resolved By': by || '', 'Resolved On': Date.now(), 'Status': ST.RES, 'Parent Token': newToken() });
  hist(t, 'Resolution submitted by ' + by + ': ' + text);
  await saveTicket(t);
  await autoWhatsApp(t, 'resolution', base);
  await saveTicket(t);
  try { await send(resolutionAlertEmail(t, base)); } catch (e) { /* alert is optional */ }
  return 'saved';
}

export async function markWhatsApp(id, what) {
  const t = await getTicket(id);
  if (what === 'resolution') t['Resolution WA Sent On'] = Date.now();
  hist(t, 'WhatsApp sent: ' + what);
  await saveTicket(t);
  return 'ok';
}

export async function parentResponse(base, id, response, via, remarks) {
  const t = await getTicket(id);
  const now = Date.now();
  Object.assign(t, { 'Parent Response': response, 'Response Via': via || '', 'Response Remarks': remarks || '', 'Response On': now });
  if (response === 'Satisfied') {
    Object.assign(t, { 'Status': ST.SAT, 'Closed On': now });
    hist(t, 'Parent Satisfied (' + via + ') – ticket closed');
    await saveTicket(t);
    await send(closureEmail(t));
    hist(t, 'Closure email sent');
    await autoWhatsApp(t, 'closed', base);
  } else if (response === 'Not Satisfied') {
    const prev = t['Resolution'];
    const lvl = Number(t['Level'] || 1) + 1;
    hist(t, 'Parent NOT Satisfied (' + via + '): ' + (remarks || '') + ' | previous resolution: ' + prev);
    Object.assign(t, { 'Status': ST.REESC, 'Level': lvl, 'Escalated On': now, 'Escalation Email': 'Sent', 'Resolution': '', 'Resolved By': '',
      'Resolved On': '', 'Resolution WA Sent On': '', 'Last Reminder On': '', 'Token': newToken() });
    await saveTicket(t);
    await send(escalationEmail(t, true, base, prev));
    hist(t, 'Re-escalation email sent (level ' + lvl + ')');
    await autoWhatsApp(t, 'notsat', base);
  } else {
    Object.assign(t, { 'Status': ST.NORESP, 'Closed On': now });
    hist(t, 'Closed – no response from parent. ' + (remarks || ''));
  }
  await saveTicket(t);
  return 'ok';
}

export async function resendEscalation(base, id) {
  const t = await getTicket(id);
  if (t['Escalation Email'] !== 'Sent') { t['Escalated On'] = Date.now(); t['Escalation Email'] = 'Sent'; }
  const prev = (String(t.History).split('\n').filter(l => l.includes('previous resolution:')).pop() || '').split('previous resolution:')[1];
  await send(escalationEmail(t, t.Status === ST.REESC, base, prev && prev.trim()));
  hist(t, 'Escalation email (re)sent from dashboard');
  await saveTicket(t);
  return 'ok';
}

export async function sendOverdueReminders(base) {
  const now = Date.now();
  let n = 0;
  for (const t of await readTickets()) {
    if (t.Status !== ST.ESC && t.Status !== ST.REESC) continue;
    if (t['Escalation Email'] !== 'Sent') continue;
    if (now - t['Escalated On'] < CONFIG.RESOLUTION_HOURS * 3600000) continue;
    if (t['Last Reminder On'] && now - t['Last Reminder On'] < 20 * 3600000) continue;
    const hrs = Math.round((now - t['Escalated On']) / 3600000);
    await send(reminderEmail(t, base, hrs));
    t['Last Reminder On'] = now;
    hist(t, 'Overdue reminder email sent (' + hrs + ' hrs)');
    await saveTicket(t);
    n++;
  }
  return n;
}

/** Sends a WhatsApp message automatically when the Meta API is configured. Never throws. */
async function autoWhatsApp(t, type, base) {
  if (!WA.enabled()) return false;
  try {
    const link = base + '/confirm.html?t=' + encodeURIComponent(t['Ticket ID']) + '&p=' + t['Parent Token'];
    const id = await sendParentWhatsApp(type, t, link);
    if (type === 'resolution') t['Resolution WA Sent On'] = Date.now();
    hist(t, 'WhatsApp auto-sent: ' + type + ' (' + id + ')');
    return true;
  } catch (e) {
    hist(t, 'WhatsApp auto-send FAILED (' + type + '): ' + e.message + ' – send manually from dashboard');
    return false;
  }
}

/** Parent confirmation form (link sent on WhatsApp) */
export async function parentConfirm(base, id, ptoken, response, remarks) {
  const t = await getTicket(id);
  if (!t['Parent Token'] || t['Parent Token'] !== ptoken) throw Object.assign(new Error('This link is not valid.'), { code: 403 });
  if (t.Status !== ST.RES) throw Object.assign(new Error('Thank you, your response has already been recorded.'), { code: 409 });
  if (response !== 'Satisfied' && response !== 'Not Satisfied') throw Object.assign(new Error('Please choose Satisfied or Not Satisfied.'), { code: 400 });
  if (response === 'Not Satisfied' && String(remarks || '').trim().length < 3) throw Object.assign(new Error('Please tell us what more we can do.'), { code: 400 });
  await parentResponse(base, id, response, 'Parent form', String(remarks || '').trim());
  try { await send(parentAlertEmail(await getTicket(id), response, base)); } catch (e) { /* optional */ }
  return 'ok';
}

/** 'Confidential' tickets go to management only. Blank (older rows) = decided from the comment. */
export function routeOf(t) {
  if (t.Route === 'Confidential' || t.Route === 'Standard') return t.Route;
  return isAboutLeadership(t['Improvement Feedback'], t['Suggestions']) ? 'Confidential' : 'Standard';
}
export function resolversFor(t) { return routeOf(t) === 'Confidential' ? CONFIG.CONFIDENTIAL_RESOLVERS : CONFIG.RESOLVER_NAMES; }

/** Dashboard: change routing (e.g. the word "principal" was used but the complaint is not about her) */
export async function setRoute(base, id, route) {
  const t = await getTicket(id);
  if (route !== 'Confidential' && route !== 'Standard') throw new Error('Bad route');
  t.Route = route;
  hist(t, 'Routing changed to ' + route + ' by MIS');
  const open = t.Status === ST.ESC || t.Status === ST.REESC;
  if (open && t['Escalation Email'] === 'Sent') {
    t.Token = newToken();              // old link (sent to the other group) stops working
    await send(escalationEmail(t, t.Status === ST.REESC, base));
    hist(t, 'Escalation email sent to the ' + (route === 'Confidential' ? 'confidential (management)' : 'standard') + ' group');
  }
  await saveTicket(t);
  return 'ok';
}

/** public (browser-safe) version of a ticket */
export function publicTicket(t) { const p = { ...t, Route: routeOf(t) }; delete p.Token; delete p._row; p['Parent Link'] = t['Parent Token'] ? '/confirm.html?t=' + encodeURIComponent(t['Ticket ID']) + '&p=' + t['Parent Token'] : ''; delete p['Parent Token']; return p; }

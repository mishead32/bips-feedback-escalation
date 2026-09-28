// Email templates + sending through Gmail (app password)
import nodemailer from 'nodemailer';
import { CONFIG } from './config.js';
import { fmt } from './util.js';
import { analyse, isAboutLeadership } from './insights.js';

let transport = null;
let sender = async (msg) => {
  if (!transport) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error('Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD).');
    transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s/g, '') } });
  }
  return transport.sendMail({ from: '"' + CONFIG.SHORT_NAME + ' Parent Feedback Cell" <' + process.env.GMAIL_USER + '>', ...msg });
};
export function useMailer(fn) { sender = fn; }
export function send(msg) {
  const clean = { ...msg, to: [].concat(msg.to || []).join(','), cc: [].concat(msg.cc || []).filter(Boolean).join(',') || undefined };
  if (!clean.to) throw new Error('No recipient email configured.');
  return sender(clean);
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
function table(rows) {
  return '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px;margin:12px 0">' +
    rows.map((r, i) => '<tr style="background:' + (i % 2 ? '#ffffff' : '#F4F7FB') + '"><td style="border:1px solid #D9E1EC;width:38%;color:#44546A;font-weight:bold;vertical-align:top">' +
      esc(r[0]) + '</td><td style="border:1px solid #D9E1EC;vertical-align:top">' + esc(r[1]) + '</td></tr>').join('') + '</table>';
}
function button(url, label) {
  return '<p style="margin:18px 0"><a href="' + url + '" style="background:#1F3864;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">' + label + '</a></p>';
}
const signature = () => '<p>Warm regards,<br>' + CONFIG.COORDINATOR_NAME + '<br>' + CONFIG.SCHOOL_NAME + '</p>';
function shell(color, title, body) {
  return '<div style="font-family:Arial,sans-serif;color:#1d2433;max-width:680px">' +
    '<div style="background:' + color + ';color:#fff;padding:14px 18px;border-radius:6px 6px 0 0;font-size:16px;font-weight:bold">' + title + '</div>' +
    '<div style="border:1px solid #D9E1EC;border-top:0;padding:16px 18px;border-radius:0 0 6px 6px;font-size:14px;line-height:1.5">' + body + '</div></div>';
}
function isConf(tk) {
  if (tk.Route === 'Confidential') return true;
  if (tk.Route === 'Standard') return false;
  return isAboutLeadership(tk['Improvement Feedback'], tk['Suggestions']);
}
/** who receives mails about this ticket */
function group(tk) {
  return isConf(tk)
    ? { to: CONFIG.CONFIDENTIAL_TO, cc: CONFIG.CONFIDENTIAL_CC, names: CONFIG.CONFIDENTIAL_NAMES, tag: '[CONFIDENTIAL] ',
        note: '<div style="background:#F3E8FF;border:1px solid #D8B4FE;color:#581C87;padding:10px 12px;border-radius:6px;margin:0 0 12px"><b>CONFIDENTIAL:</b> this feedback mentions the Principal (Indu Sharma Ma\'am), so it has <b>not</b> been sent to the Principal or Poonam Gulati Ma\'am.</div>' }
    : { to: CONFIG.ESCALATE_TO, cc: CONFIG.CC, names: CONFIG.ESCALATE_TO_NAMES, tag: '', note: '' };
}
const resolveLink = (base, tk) => base + '/resolve.html?t=' + encodeURIComponent(tk['Ticket ID']) + '&k=' + tk['Token'];

export function escalationEmail(tk, isRe, base, prevResolution) {
  const link = resolveLink(base, tk);
  const due = tk['Escalated On'] + CONFIG.RESOLUTION_HOURS * 3600000;
  const subject = (isRe ? '[RE-ESCALATION] Parent Not Satisfied – ' : '[ESCALATION] Parent Feedback – ') +
    tk['Ticket ID'] + ' | ' + tk['Student Name'] + ', Class ' + tk['Class & Section'] + ' | Overall: ' + tk['Overall'] + '/5';
  const rows = [
    ['Ticket No', tk['Ticket ID']],
    ['Feedback Received On', fmt(tk['Received On'])],
    ['Parent Name', tk['Parent Name']],
    ['Mobile Number', tk['Mobile']],
    ['Student Name', tk['Student Name']],
    ['Class and Section', tk['Class & Section']],
    ['Overall Experience', tk['Overall'] + ' / 5'],
    ['Teaching & Learning', tk['Teaching & Learning'] + ' / 5'],
    ['School Environment & Safety', tk['Environment & Safety'] + ' / 5'],
    ['If you gave less than 5 stars in any area, please let us know how we can improve', tk['Improvement Feedback'] || '—'],
    ['What additional initiatives, support, or opportunities would you like BIPS to offer', tk['Suggestions'] || '—'],
    ['Escalation Reason', tk['Trigger']],
    ['Escalation Level', tk['Level']]
  ];
  const ai = analyse({ improve: tk['Improvement Feedback'], suggest: tk['Suggestions'], overall: Number(tk['Overall']) });
  if (ai.actions.length) {
    rows.push(['Concern Area', ai.actions.map(a => a.category).join(', ') + (ai.priority ? '  (Priority: ' + ai.priority + ')' : '')]);
    rows.push(['Suggested Action', ai.actions.map(a => '• ' + a.action + ' [Owner: ' + a.owner + ']').join('\n')]);
  }
  if (isRe) {
    rows.push(['Previous Resolution', prevResolution || '—']);
    rows.push(["Parent's Reason for Dissatisfaction", tk['Response Remarks'] || '—']);
    rows.push(['Response Captured Via', tk['Response Via'] || '—']);
  }
  rows.push(['Resolution Due By', fmt(due) + ' (within ' + CONFIG.RESOLUTION_HOURS + ' hours)']);
  rows.push(['Parent Confirmation', isRe ? 'Not Satisfied' : 'Satisfied / Not Satisfied (to be filled once the parent replies)']);
  const intro = isRe
    ? 'The resolution shared for the ticket below was communicated to the parent. The parent has informed us that they are <b>NOT SATISFIED</b> with the action taken. Kindly review the matter on priority and share a revised resolution within ' + CONFIG.RESOLUTION_HOURS + ' hours. A personal call or meeting with the parent is recommended.'
    : 'We have received parent feedback that requires your attention and action. The details are as follows:';
  const html = shell(isRe ? '#C0392B' : '#1F3864', isRe ? 'Re-escalation – Parent Not Satisfied' : 'Parent Feedback Escalation',
    group(tk).note + '<p>Dear ' + group(tk).names + ',</p><p>Greetings.</p><p>' + intro + '</p>' + table(rows) +
    '<p>Kindly review the concern, take the necessary action and submit the resolution within ' + CONFIG.RESOLUTION_HOURS +
    ' hours using the button below. We will communicate it to the parent and update the Parent Confirmation as Satisfied or Not Satisfied.</p>' +
    button(link, 'Submit Resolution') +
    '<p style="font-size:12px;color:#666">If the button does not open, copy this link: ' + link + '</p><p>Thank you for your support.</p>' + signature());
  const G = group(tk);
  return { to: G.to, cc: G.cc, subject: G.tag + subject, html };
}

export function closureEmail(tk) {
  const hrs = (tk['Closed On'] - tk['Received On']) / 3600000;
  const html = shell('#2E7D4F', 'Ticket Closed – Parent Satisfied',
    group(tk).note + '<p>Dear ' + group(tk).names + ',</p><p>We are pleased to inform you that the parent has confirmed satisfaction with the resolution provided, and the ticket has been closed.</p>' +
    table([
      ['Ticket No', tk['Ticket ID']], ['Parent Name', tk['Parent Name']],
      ['Student Name', tk['Student Name'] + ', Class ' + tk['Class & Section']],
      ['Concern', tk['Improvement Feedback'] || tk['Trigger']], ['Resolution', tk['Resolution']],
      ['Parent Confirmation', 'Satisfied'], ['Raised On', fmt(tk['Received On'])], ['Closed On', fmt(tk['Closed On'])],
      ['Turnaround Time', hrs < 48 ? Math.round(hrs) + ' hours' : Math.round(hrs / 24) + ' days'], ['Confirmed Via', tk['Response Via']]
    ]) + '<p>Thank you for your prompt action.</p>' + signature());
  return { to: group(tk).to, cc: group(tk).cc, subject: group(tk).tag + '[CLOSED] Parent Feedback – ' + tk['Ticket ID'] + ' | ' + tk['Student Name'] + ', Class ' + tk['Class & Section'], html };
}

export function resolutionAlertEmail(tk, base) {
  const html = shell('#1F3864', 'Resolution received – send WhatsApp to parent',
    '<p>The resolution for <b>' + esc(tk['Ticket ID']) + '</b> has been submitted by ' + esc(tk['Resolved By']) + '.</p>' +
    table([['Parent', tk['Parent Name'] + ' (' + tk['Mobile'] + ')'], ['Student', tk['Student Name'] + ', ' + tk['Class & Section']], ['Resolution', tk['Resolution']]]) +
    '<p>Please open the dashboard, send the resolution message on WhatsApp and record Satisfied / Not Satisfied.</p>' + button(base + '/', 'Open Dashboard'));
  return { to: CONFIG.MIS_EMAIL, subject: 'Resolution received – ' + tk['Ticket ID'] + ' | ' + tk['Parent Name'], html };
}

export function reminderEmail(tk, base, hrs) {
  const html = shell('#B35C00', 'Reminder – Resolution Overdue',
    group(tk).note + '<p>Dear ' + group(tk).names + ',</p><p>The escalation below is pending for <b>' + hrs + ' hours</b> (target: ' + CONFIG.RESOLUTION_HOURS +
    ' hours). Kindly submit the resolution at the earliest.</p>' +
    table([['Ticket No', tk['Ticket ID']], ['Parent', tk['Parent Name']], ['Student', tk['Student Name'] + ', ' + tk['Class & Section']],
      ['Overall', tk['Overall'] + ' / 5'], ['Concern', tk['Improvement Feedback'] || '—']]) +
    button(resolveLink(base, tk), 'Submit Resolution') + signature());
  return { to: group(tk).to, cc: group(tk).cc, subject: group(tk).tag + '[REMINDER] Resolution overdue – ' + tk['Ticket ID'] + ' | ' + tk['Student Name'], html };
}

export function parentAlertEmail(tk, response, base) {
  const ok = response === 'Satisfied';
  const html = shell(ok ? '#2E7D4F' : '#C0392B', 'Parent ' + (ok ? 'SATISFIED' : 'NOT SATISFIED') + ' – ' + esc(tk['Ticket ID']),
    '<p>The parent has submitted the confirmation form.</p>' +
    table([['Ticket No', tk['Ticket ID']], ['Parent', tk['Parent Name'] + ' (' + tk['Mobile'] + ')'], ['Student', tk['Student Name'] + ', ' + tk['Class & Section']],
      ['Parent Response', response], ['Remarks', tk['Response Remarks'] || '—'],
      ['What happened', ok ? 'Ticket closed and closure email sent.' : 'Ticket re-escalated (level ' + tk['Level'] + ') and re-escalation email sent.']]) +
    button(base + '/', 'Open Dashboard'));
  return { to: CONFIG.MIS_EMAIL, subject: 'Parent ' + (ok ? 'Satisfied' : 'NOT Satisfied') + ' – ' + tk['Ticket ID'] + ' | ' + tk['Parent Name'], html };
}

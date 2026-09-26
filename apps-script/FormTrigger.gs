/**
 * BIPS Feedback – real-time link between the Google Sheet and the Vercel app.
 * Paste into: Google Sheet → Extensions → Apps Script. Fill the 2 values, run installTriggers() once.
 *
 *  - Every new form response  -> calls the Vercel app instantly (ticket + escalation email within seconds)
 *  - Every hour               -> safety sync + overdue reminder emails
 */
const APP_URL = 'https://YOUR-PROJECT.vercel.app';   // your Vercel URL, no slash at the end
const SYNC_SECRET = 'PASTE-THE-SAME-SYNC_SECRET-AS-IN-VERCEL';

function onFeedbackSubmit(e) {
  Utilities.sleep(2000);                               // let Google finish writing the row
  callApp_('');
}

function hourlySync() {
  callApp_('&reminders=1');
}

function callApp_(extra) {
  const url = APP_URL + '/api/sync?secret=' + encodeURIComponent(SYNC_SECRET) + extra;
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText());
}

/** Run this ONCE from the editor */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFeedbackSubmit').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  ScriptApp.newTrigger('hourlySync').timeBased().everyHours(1).create();
  callApp_('');                                        // first run: creates FB Tickets tab + imports old responses
}

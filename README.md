# BIPS – Parent Feedback & Escalation System (Vercel)

Live dashboard + automatic escalation emails on top of the Google Form response sheet.

## How it works
```
Google Form ──► Google Sheet "Form responses 1"
                    │  (Apps Script trigger – instant)
                    ▼
            Vercel  /api/sync  ──► ticket in "FB Tickets" tab
                                  ──► escalation email (Indu Ma'am, Poonam Gulati Ma'am, CC Principal)
Email button ──► /resolve.html ──► resolution saved ──► alert email to MIS
Dashboard (/) ──► Send on WhatsApp (message contains parent link)
Parent link ──► /confirm.html ──► Satisfied (closure email) / Not Satisfied + remarks (re-escalation email)
Hourly (Apps Script) + daily 9 AM (Vercel cron) ──► overdue reminder emails
```
The Google Sheet is the database. The dashboard reads it live (auto-refresh every 60 seconds).

## Folder
| Path | What |
|---|---|
| `public/index.html` | Dashboard |
| `public/resolve.html` | Resolution form opened from the email (Indu Ma'am / Poonam Ma'am) |
| `public/confirm.html` | Parent's Satisfied / Not Satisfied form (link in the WhatsApp message) |
| `api/*.js` | Serverless API (data, action, resolve, sync, cron, health) |
| `lib/*.js` | Logic, Google Sheets access, email templates |
| `apps-script/FormTrigger.gs` | Paste into the Google Sheet's Apps Script (real-time trigger) |
| `.env.example` | List of Environment Variables to add in Vercel |

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Example |
|---|---|
| `SHEET_ID` | `1CythY7lD6i0UqX8MEsSQkQgTV5F3cLtIk3jq2t3ocH8` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `sales-report-reader@bodyzone-reports.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | the `private_key` value from the service-account JSON file |
| `GMAIL_USER` | `mis.gcs1@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-letter Gmail App Password |
| `ESCALATE_TO` | `indu@...,poonam@...` |
| `CC` | `principal@...` |
| `MIS_EMAIL` | `mis.gcs1@gmail.com` |
| `DASHBOARD_PASSWORD` | your dashboard password |
| `SYNC_SECRET` | any long random text (same value goes in FormTrigger.gs) |
| `CRON_SECRET` | any long random text |

Optional – automatic WhatsApp (Meta Cloud API): `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_LANG` (default `en`). Template names: `bips_resolution`, `bips_ticket_closed`, `bips_reescalated` (see guide Part D). Without these the dashboard uses the manual Send on WhatsApp button.

Optional: `RESPONSE_SHEET` (default `Form responses 1`), `ESCALATE_IF_OVERALL_AT_OR_BELOW` (4), `RESOLUTION_HOURS` (24), `PARENT_REPLY_HOURS` (24), `APP_URL`.

Check setup any time: `https://YOUR-APP.vercel.app/api/health?key=DASHBOARD_PASSWORD`

See **BIPS_Feedback_Vercel_Setup_Guide.pdf** for step-by-step instructions.

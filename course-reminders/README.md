# Course Reminders — Express Training student emails

Automatic emails for every 8-day Express Training cohort, driven by one Google Sheet:

| When | Template | What it's for |
|---|---|---|
| 14 days before Day 1 | `WELCOME` | You're in + full schedule + Zoom details |
| 5 days before Day 1 | `CHECKIN` | Touch base + Day 1 prep |
| 1 hour before **each** session | `SESSION` | Zoom link + that day's resources (one template, all 8 days) |
| 3 hours after the last session | `FOLLOWUP` | Thank you / feedback (off by default) |

All timings are editable on the **Settings** tab.

This is a **separate Apps Script project** from the cold-email system in `/src` — different
sheet, sends from your normal Google account, never from the cold-email domain.

## Setup (about 15 minutes)

1. Create a new blank Google Sheet (e.g. "Express Training — Course Emails").
2. **Extensions → Apps Script.** Delete the starter `Code.gs`.
3. Create 5 script files and paste in the matching file from `course-reminders/src/`:
   `Config`, `Schedule`, `Render`, `SheetStore`, `Main`.
4. **Project Settings (gear) → check "Show appsscript.json"**, open it, and replace it with
   `course-reminders/appsscript.json`. Set `timeZone` to your timezone if it isn't New York.
5. Back in the editor, pick `setup` in the function dropdown → **Run** → **Allow** permissions.
   (Google may warn the app is unverified — it's your own script: Advanced → Go to project.)
6. Reload the sheet. You now have a **Course Emails** menu and these tabs, with sample data:

| Tab | You fill in |
|---|---|
| **Cohorts** | One row per run of a course: Cohort ID, Course Name, **Confirmed** ☑, Zoom Link, Meeting ID, Passcode, Day 1–8 Resources |
| **Calendar** | One row per session: Cohort ID, Day (1–8), Date, Start Time, optional Zoom Link Override |
| **Recipients** | First Name, Email, Cohort ID, Paused ☐ |
| **Templates** | Subject/body for WELCOME, CHECKIN, SESSION, FOLLOWUP (Active ☑) |
| **Settings** | Test Email, Internal Emails, timing, sender name, test mode |
| **Send Log** | *Written by the script* — every email sent/skipped/errored |
| **Upcoming** | *Written by the script* — every planned email, its send time and status, plus a list of setup problems |

## Going live

1. **Settings:** fill in `Test Email` (you) and `Internal Emails` (your team). `Test Mode` starts **TRUE**.
2. Add a real cohort, its 8 Calendar rows, and recipients. Check **Confirmed**.
3. **Course Emails → Refresh Upcoming tab** — check every send time and the "Setup problems" column.
4. **Course Emails → Email me a preview of every template** — read them in your inbox.
5. **Course Emails → Turn on automatic sending.** In test mode, everything due goes to your Test
   Email with `[TEST → student@email]` in the subject.
6. When happy, set `Test Mode` to **FALSE**. Anything already due goes to students on the next run.

## How it behaves

- **Nothing sends until a cohort is Confirmed.** Uncheck it to freeze that cohort.
- Runs every 10 minutes. Reminders go out 50–60 minutes before each session.
- **Never double-sends:** every send is recorded in Send Log. Deleting a log row lets that email go again.
- **Team visibility:** instead of BCCing every student email (which eats Google's daily limit),
  the team gets **one summary email per batch** ("SESSION Day 3 → 20 sent"). Prefer BCCs? Set
  `BCC Internal On Every Email` to TRUE.
- **Late joiners:** added after the welcome date → they get the welcome right away; the check-in is
  skipped if it would arrive minutes later. Added after Day 1 → they just get the remaining session
  reminders.
- **Missed windows:** a session reminder is never sent after the session has started. Welcome and
  check-in won't send after Day 1 starts.
- **Typos are caught:** a template with an unknown `{{Placeholder}}` is never sent — it's logged as
  an ERROR, included in the team summary, retried 3 times, then dropped. Bad dates/emails show up in
  Upcoming → Setup problems.
- **Dates changed?** Just edit the Calendar. Emails not yet sent follow the new dates.

## Placeholders

`{{FirstName}}` `{{Email}}` `{{CourseName}}` `{{CohortId}}` `{{ZoomLink}}` `{{MeetingId}}`
`{{Passcode}}` `{{DayNumber}}` `{{TotalDays}}` `{{SessionDate}}` `{{SessionTime}}` `{{Resources}}`
`{{StartDate}}` `{{StartTime}}` `{{EndDate}}` `{{Schedule}}` (all sessions, one per line) `{{SenderName}}`

In WELCOME/CHECKIN, the session fields (`{{Resources}}`, `{{SessionDate}}`…) refer to Day 1.

## Limits

Google allows ~100 recipients/day on a free Gmail account, ~1,500 on Google Workspace. Each student
email = 1 (plus 1 per BCC if BCC mode is on). If the limit is hit, the rest go out on the next run
after it resets, and the team summary says so.

## Updating

There's no auto-deploy. After changing a file here, paste it into the Apps Script editor again.

## Tests

`node course-reminders/tests/course-reminders.test.js` — scheduling rules plus an end-to-end run
against a fake sheet and mailbox.

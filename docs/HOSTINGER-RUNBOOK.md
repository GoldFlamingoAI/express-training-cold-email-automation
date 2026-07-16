# Hostinger Manual-Send Runbook

This is the current deployment and operating guide. Hostinger owns the sender mailbox and all
mail transport. Google Sheets and Apps Script prepare content and record campaign state; they do
not send email or read the Hostinger mailbox.

## Architecture

```text
Google Sheets + Apps Script
  -> validates and prepares QUEUE subject/body
  -> operator copies content into Hostinger Webmail
  -> operator sends manually
  -> operator records SENT/REPLIED/BOUNCED/UNSUBSCRIBED from the Sheet menu

Warmup Inbox
  <-> Hostinger SMTP/IMAP directly
```

## Deploy The Migration

1. In the bound Apps Script project, replace every existing `.gs` file with the corresponding
   merged file from `src/`.
2. Add the new `CampaignStateService.gs` file.
3. Replace `appsscript.json`. The Gmail OAuth scope is intentionally absent.
4. Save the project and reload the spreadsheet.
5. In Apps Script **Triggers**, delete:
   - `runReplyMonitorTrigger`
   - `runBounceMonitorTrigger`
6. Keep or create:
   - `runFollowUpSchedulerTrigger` (daily is sufficient)
   - `runDashboardRefreshTrigger` (daily is sufficient)
7. In the spreadsheet, open **Cold Email -> Set up Hostinger columns** once.

The retired monitor trigger functions remain safe no-ops, so an overlooked installed trigger will
not fail after the migrated code is deployed. Deleting those triggers still avoids unnecessary
executions.

## Required Sheets

Keep the ten existing tabs. `QUEUE` gains these additive columns automatically:

```text
sequenceStep, subject, body, preparedAt, sentAt
```

`CONTACTS` must contain:

```text
status, emailsSent, lastSentAt
```

## Prepare Emails

1. Populate and verify contacts as described in `COLD-EMAIL-MONDAY.md`.
2. Put approved contacts into `QUEUE` with status `QUEUED`.
3. Run **Cold Email -> Prepare queued emails**.
4. Review `QUEUE.subject` and `QUEUE.body`; prepared rows have status `PREPARED`.
5. Copy one subject/body into Hostinger Webmail, review it, and send it manually.
6. With that QUEUE row selected, run **Cold Email -> Mark selected email sent**.

Marking a send is idempotent. It records `EMAIL_SENT`, sets `QUEUE.status=SENT`, sets `sentAt`,
increments `CONTACTS.emailsSent` to the sequence step, and sets `CONTACTS.lastSentAt`.

The old `runDraftPipeline()` name is retained for operator compatibility, but it now performs the
same preparation behavior as `runPreparationPipeline()` and creates no Gmail draft.

## Record Inbox Outcomes

Review Hostinger Webmail daily. Select the matching row in `QUEUE` or `CONTACTS`, then use:

- **Mark selected contact replied**: sets `CONTACTS.status=REPLIED`.
- **Mark selected contact bounced**: sets `BOUNCED` and adds the email to `SUPPRESSION`.
- **Mark selected contact unsubscribed**: sets `UNSUBSCRIBED` and adds the email to `SUPPRESSION`.

Suppression writes are idempotent. Reply and bounce detection are manual because Apps Script has
no native SMTP/IMAP socket support. Automating them later requires an external HTTPS bridge that
reads Hostinger IMAP and updates the Sheet.

## Follow-Ups And Limits

`ApprovalGate` applies the daily limit to recorded `EMAIL_SENT` events, not prepared rows.
Follow-up queue identities include `sequenceStep`, so a sent first touch no longer blocks step 2.
The daily follow-up trigger uses `CONTACTS.emailsSent` and `lastSentAt`, which makes marking every
manual Hostinger send mandatory.

Recommended initial settings:

```text
DAILY_LIMIT=5
APPROVAL_THRESHOLD=75
SENDER_NAME=Adam Graney
FOLLOW_UP_DELAY_DAYS=4
FOLLOW_UP_MAX_EMAILS=3
```

`DRAFT_ONLY` and Gmail monitor settings are ignored by the current runtime and may be removed from
the SETTINGS tab after deployment.

## Smoke Test

Before the first outreach batch:

1. Prepare one owned test contact in `QUEUE`.
2. Confirm the row becomes `PREPARED` with rendered subject/body.
3. Send it manually through Hostinger.
4. Mark it sent and confirm both QUEUE and CONTACTS update.
5. Reply from the recipient and mark the contact replied.
6. Refresh the dashboard and confirm prepared, sent, and reply metrics.
7. Confirm the received message reports SPF, DKIM, and DMARC as `PASS`.

## Functionality Intentionally Removed

- Gmail draft creation
- Automatic Gmail reply detection
- Automatic Gmail bounce detection
- Gmail OAuth scope and sender-mailbox authorization

Contact import, cleaning, scoring, approval, enrichment clients, template merging, queueing,
suppression, follow-up eligibility, audit logging, daily limits, and dashboard metrics remain.

# SmileCare Dashboard — Production Report (2026-08-08)

## What was actually checked
- Full read of `src/App.jsx` (2,354 lines), `ErrorBoundary.jsx`, `main.jsx`, `sw.js`, build config.
- Live Supabase project `koakepftcwqqhtcwxngi` inspected directly via the Supabase connector:
  tables, RLS policies, `is_owner()`/`is_staff()` function definitions, the `booking_records`
  exclusion constraint, indexes, and the security advisor.
- `npm run build` run end-to-end — succeeds, no errors.

## Good news the earlier audit couldn't see
The zip has no SQL files, so a prior review (correctly) couldn't confirm whether RLS or the
double-booking constraint existed. Pulling the live schema confirms they do, and they're correct:
- RLS is enabled on all 24 public tables, policies gated by `is_staff()`/`is_owner()`, both of
  which `coalesce(...)`/`exists(...)` to **false** on any error or missing row — i.e. they fail
  closed. A front-desk account cannot write to `dentists`, `clinic_settings`, or `staff_accounts`
  no matter what the browser UI shows.
- `booking_records` already has `no_overlapping_dentist_bookings`, a Postgres `EXCLUDE USING gist`
  constraint on `(dentist_name, appt_range)` — real double-bookings are rejected by the database,
  not just discouraged by client-side JS.
- Indexes exist on the columns the dashboard filters/sorts by.

None of this was in the zip or version-controlled, so `supabase/migrations/00000000000000_baseline_snapshot.sql`
was added — an idempotent snapshot of what's already live, so it's reviewable and reproducible.
**It was not re-applied to your live project** (everything in it already exists there); it's there
for the repo and for spinning up a fresh dev/staging project later.

## Bugs actually fixed in `src/App.jsx`
1. **Fail-open role default (real bug).** `refresh()` set `myRole` to `"owner"` whenever the
   `staff_accounts` fetch failed *or* returned no row. Since RLS enforces the real permission
   server-side, this wasn't a data breach, but it was a genuine bug: any unprovisioned or
   network-glitched user saw the owner UI. Now: a fetch failure sets an `"unknown"` role (owner
   tabs hidden, error surfaced) and no matching row sets `"unprovisioned"` (dedicated "ask the
   owner to add you" screen, sign-out button, no dashboard access).
2. **Indistinguishable errors.** `Promise.allSettled` collapsed every rejected query into `[]`,
   so a failed `staff_accounts` fetch looked identical to "no row." Fixed by reading that one
   result's `status` directly instead of through the flattened array.
3. **Double-booking race had no friendly message.** The DB constraint was always correct, but a
   23P01 (exclusion violation) surfaced as a raw HTTP-error string. `makeClient` now parses
   PostgREST's structured JSON error and attaches `.code`; booking insert/reschedule catch blocks
   special-case `23P01` with "someone just took that slot" instead of a raw error dump.
4. **Silent audit-trail failures.** Failed `audit_log` writes are still non-blocking (correct),
   but now increment a session counter surfaced as a banner on the Alerts tab, so a persistently
   broken audit trail doesn't go unnoticed indefinitely.
5. **Accessibility.** Icon-only call/WhatsApp/conversation buttons now have `aria-label`s.

## Not changed, and why
- **ConnectScreen / localStorage anon key** — already secondary to the `VITE_SUPABASE_*` env-var
  path per the existing code comments; genuinely low severity since the anon key is meant to be
  public. Left as-is; flagged if you want it hidden in prod builds.
- **`btree_gist` extension in `public` schema**, **`is_owner`/`is_staff` RPC-callable**, **leaked
  password protection off** — real advisor warnings, but each needs an owner decision (moving an
  extension, revoking RPC execute, toggling an Auth setting) rather than a code fix. Noted in the
  migration file with the exact commands.

## Not touched at all
GitHub push and Vercel deploy — see the message alongside this report for why, and what I need
from you to do each one.

## n8n: "Resend Reminder" webhook
The dashboard's Alerts tab "resend reminder" button POSTs `{patient_phone, execution_error_id}`
to `clinic_settings.reminder_resend_webhook_url`. That workflow didn't exist (the previously-live
"Reminder Engine" workflow is a scheduled batch job with no HTTP trigger), so a new one was built:
**Resend Reminder (Dashboard Webhook)**, activated at
`https://yashwantkumar1642025.app.n8n.cloud/webhook/resend-reminder`. It looks up the patient's
next upcoming confirmed booking, sends the WhatsApp reminder, and logs to `reminders_sent`.

It's protected by a shared-secret header (`X-Webhook-Secret`) using n8n's existing "Header Auth
account" credential — **you still need to open that credential in n8n and set Name=
`X-Webhook-Secret`, Value = the token below**, or the webhook will reject every request with 403:

```
WiJy6NcfCdVs3N-uOC4Jugilk6wqS4_E_hshC-uquB8
```

This value is already hardcoded into `resendReminder()` in `src/App.jsx` to match. It's visible in
the shipped browser bundle (unavoidable for a pure-frontend app calling a webhook directly) — it
stops randoms from finding the URL and spamming WhatsApp sends, not a determined attacker with
devtools access to your own staff's browser. Rotate it in both places if that's ever a concern.


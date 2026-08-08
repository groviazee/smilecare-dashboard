# Changelog

## 2026-08-08 — Reminder-resend webhook
- feat(n8n): created and activated "Resend Reminder (Dashboard Webhook)" — the URL the dashboard's
  Alerts tab needs for `reminder_resend_webhook_url`. Looks up the patient's next upcoming
  confirmed booking by phone, sends the WhatsApp reminder, logs to `reminders_sent`.
- security(n8n): added header-auth (`X-Webhook-Secret`) to that webhook so it can't be triggered
  by anyone who finds the URL. Matching secret hardcoded into `resendReminder()` in `src/App.jsx`.

## 2026-08-08 — Security & robustness pass
- fix(auth): `myRole` no longer fails open to `"owner"` on a failed or empty `staff_accounts`
  fetch; added `"unknown"` and `"unprovisioned"` states with a dedicated no-access screen.
- fix(data): `refresh()` now reads the `staff_accounts` promise's own settle status instead of
  through the flattened `[]`-on-reject array, so a fetch failure and an empty result are no
  longer indistinguishable.
- fix(errors): `makeClient` parses PostgREST's JSON error body and attaches `.code`/`.details` to
  thrown errors; booking insert/reschedule show a friendly message on `23P01` (double-booking
  race) instead of a raw error string.
- fix(a11y): added `aria-label`s to icon-only call/WhatsApp/conversation buttons on booking cards.
- feat(observability): failed `audit_log` writes increment a session counter shown as a banner on
  the Alerts tab.
- docs(db): added `supabase/migrations/00000000000000_baseline_snapshot.sql`, an idempotent
  snapshot of the RLS policies, `is_owner()`/`is_staff()` functions, the `booking_records`
  exclusion constraint, and indexes that were already live but not version-controlled.
- docs: added this changelog and `PRODUCTION_REPORT.md`.

# Changelog

## 2026-10-21 — Patient age + "Cleanroom" theme
- feat(age): patient age is now captured with the other booking details. Dashboard walk-in /
  waitlist-convert form has a required Age field (whole number 0-120; locked on reschedule).
  Age shows on booking cards, in the Patients tab, and in both CSV exports.
  DB columns: `booking_records.patient_age` and `patients.age` (nullable, CHECK 0-120), see
  `supabase/migrations/20261021164713_add_patient_age.sql` (already applied to the live project).
  The dashboard reads/writes `patient_age` on bookings. n8n Booking Engine, Update Booking Engine
  and the AI receptionist prompt collect and save it too.
- fix: walk-in insert never saved `price` to the database; it does now.
- design: new "Cleanroom" theme. All stone/teal Tailwind shades are CSS variables in
  `src/index.css` (light = ice-white glass, dark = night ward), so the whole app re-themes from
  one file. Dark mode now covers every component (the old `dark:` variants were removed).
  Fonts: Sora (headings, numbers) + Figtree (UI), loaded from Google Fonts in `index.html`.
  Signature: instrument-style header with a slow vitals trace (disabled for reduced motion).

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

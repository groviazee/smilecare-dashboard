# Changelog

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

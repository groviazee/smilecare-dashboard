-- ============================================================================
-- Baseline snapshot of what is ALREADY LIVE in the connected Supabase project
-- (koakepftcwqqhtcwxngi), pulled via the Supabase MCP connector on 2026-08-08.
--
-- This file did not exist in the original zip — the app was pointing at a
-- database that already had correct RLS, the exclusion constraint, and
-- indexes applied directly (probably via the SQL editor or an earlier
-- session), but none of it was checked into the repo. That's a real gap:
-- undocumented production schema is hard to review, hard to reproduce in a
-- new environment, and easy to accidentally break.
--
-- This migration is NOT applied automatically — everything in it already
-- exists in the live database. It's here so the schema is version-controlled
-- going forward. Every statement is idempotent (IF NOT EXISTS / DROP-then-
-- CREATE) so it's safe to run against a fresh database (e.g. a new
-- staging/dev Supabase project) without erroring on existing objects.
-- ============================================================================

-- ---- Extensions ----
create extension if not exists btree_gist with schema public;
-- Note: the Supabase security advisor flags btree_gist living in `public`
-- (extension_in_public). Moving it requires recreating dependent objects
-- (the exclusion constraint below uses it) — do this in a maintenance
-- window, not silently:
--   create schema if not exists extensions;
--   alter extension btree_gist set schema extensions;

-- ---- Role helper functions (SECURITY DEFINER, used by every RLS policy) ----
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select clinic_role from staff_accounts where user_id = auth.uid()) = 'owner',
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from staff_accounts where user_id = auth.uid());
$$;

-- Advisor flags these as callable directly via /rest/v1/rpc/is_owner and
-- /rest/v1/rpc/is_staff by any authenticated user. That's low-risk (they
-- only leak a boolean about the caller's own role, same as they'd learn from
-- staff_accounts SELECT anyway) but tightening is one line if desired:
-- revoke execute on function public.is_owner() from authenticated;
-- revoke execute on function public.is_staff() from authenticated;
-- (only Postgres itself, via the RLS policies that call them internally,
-- needs execute rights — policies still work with EXECUTE revoked from
-- `authenticated` because the policy evaluates as the defining role.)

-- ---- Double-booking guard (DB is the source of truth, not the client) ----
alter table public.booking_records
  drop constraint if exists no_overlapping_dentist_bookings;
alter table public.booking_records
  add constraint no_overlapping_dentist_bookings
  exclude using gist (
    dentist_name with =,
    appt_range with &&
  )
  where (status <> all (array['cancelled','no_show']));

-- ---- Indexes ----
create index if not exists idx_booking_records_phone on public.booking_records using btree (patient_phone);
create index if not exists idx_booking_records_start on public.booking_records using btree (appointment_start);
create index if not exists idx_booking_records_status on public.booking_records using btree (status);
create index if not exists idx_patients_last_visit on public.patients using btree (last_visit_date);

-- ---- RLS: enable on every table the dashboard touches ----
alter table public.clinic_settings enable row level security;
alter table public.dentists enable row level security;
alter table public.patients enable row level security;
alter table public.booking_records enable row level security;
alter table public.escalations enable row level security;
alter table public.execution_errors enable row level security;
alter table public.failed_booking_attempts enable row level security;
alter table public.review_tracking enable row level security;
alter table public.ai_cost_tracking enable row level security;
alter table public.faq_misses enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.admin_alerts enable row level security;
alter table public.conversation_logs enable row level security;
alter table public.cancellation_logs enable row level security;
alter table public.reschedule_logs enable row level security;
alter table public.reminders_sent enable row level security;
alter table public.webhook_errors enable row level security;
alter table public.error_log enable row level security;
alter table public.booking_locks enable row level security;
alter table public.processed_messages enable row level security;
alter table public.response_cache enable row level security;
alter table public.documents_embedding_staging enable row level security;

-- ---- staff_accounts: everyone can see their own row; owners see all ----
drop policy if exists "staff view own row" on public.staff_accounts;
create policy "staff view own row" on public.staff_accounts
  for select to authenticated
  using (user_id = auth.uid() or is_owner());

drop policy if exists "owner insert staff_accounts" on public.staff_accounts;
create policy "owner insert staff_accounts" on public.staff_accounts
  for insert to authenticated with check (is_owner());

drop policy if exists "owner update staff_accounts" on public.staff_accounts;
create policy "owner update staff_accounts" on public.staff_accounts
  for update to authenticated using (is_owner()) with check (is_owner());

drop policy if exists "owner delete staff_accounts" on public.staff_accounts;
create policy "owner delete staff_accounts" on public.staff_accounts
  for delete to authenticated using (is_owner());

-- ---- Owner-only write tables (clinic_settings, dentists, documents) ----
drop policy if exists "staff select clinic_settings" on public.clinic_settings;
create policy "staff select clinic_settings" on public.clinic_settings for select to authenticated using (is_staff());
drop policy if exists "owner update clinic_settings" on public.clinic_settings;
create policy "owner update clinic_settings" on public.clinic_settings for update to authenticated using (is_owner()) with check (is_owner());

drop policy if exists "staff select dentists" on public.dentists;
create policy "staff select dentists" on public.dentists for select to authenticated using (is_staff());
drop policy if exists "owner insert dentists" on public.dentists;
create policy "owner insert dentists" on public.dentists for insert to authenticated with check (is_owner());
drop policy if exists "owner update dentists" on public.dentists;
create policy "owner update dentists" on public.dentists for update to authenticated using (is_owner()) with check (is_owner());
drop policy if exists "owner delete dentists" on public.dentists;
create policy "owner delete dentists" on public.dentists for delete to authenticated using (is_owner());

drop policy if exists "staff select documents" on public.documents;
create policy "staff select documents" on public.documents for select to authenticated using (is_staff());
drop policy if exists "owner update documents" on public.documents;
create policy "owner update documents" on public.documents for update to authenticated using (is_owner()) with check (is_owner());

-- ---- Staff read/write day-to-day data ----
drop policy if exists "staff select booking_records" on public.booking_records;
create policy "staff select booking_records" on public.booking_records for select to authenticated using (is_staff());
drop policy if exists "staff insert booking_records" on public.booking_records;
create policy "staff insert booking_records" on public.booking_records for insert to authenticated with check (is_staff());
drop policy if exists "staff update booking_records" on public.booking_records;
create policy "staff update booking_records" on public.booking_records for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "staff select patients" on public.patients;
create policy "staff select patients" on public.patients for select to authenticated using (is_staff());
drop policy if exists "staff update patients" on public.patients;
create policy "staff update patients" on public.patients for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "staff select waitlist_entries" on public.waitlist_entries;
create policy "staff select waitlist_entries" on public.waitlist_entries for select to authenticated using (is_staff());
drop policy if exists "staff insert waitlist_entries" on public.waitlist_entries;
create policy "staff insert waitlist_entries" on public.waitlist_entries for insert to authenticated with check (is_staff());
drop policy if exists "staff update waitlist_entries" on public.waitlist_entries;
create policy "staff update waitlist_entries" on public.waitlist_entries for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "staff select escalations" on public.escalations;
create policy "staff select escalations" on public.escalations for select to authenticated using (is_staff());
drop policy if exists "staff update escalations" on public.escalations;
create policy "staff update escalations" on public.escalations for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "staff select execution_errors" on public.execution_errors;
create policy "staff select execution_errors" on public.execution_errors for select to authenticated using (is_staff());
drop policy if exists "staff insert execution_errors" on public.execution_errors;
create policy "staff insert execution_errors" on public.execution_errors for insert to authenticated with check (is_staff());
drop policy if exists "staff update execution_errors" on public.execution_errors;
create policy "staff update execution_errors" on public.execution_errors for update to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "staff select admin_alerts" on public.admin_alerts;
create policy "staff select admin_alerts" on public.admin_alerts for select to authenticated using (is_staff());
drop policy if exists "owner update admin_alerts" on public.admin_alerts;
create policy "owner update admin_alerts" on public.admin_alerts for update to authenticated using (is_owner()) with check (is_owner());

drop policy if exists "staff select audit_log" on public.audit_log;
create policy "staff select audit_log" on public.audit_log for select to authenticated using (is_staff());
drop policy if exists "staff insert audit_log" on public.audit_log;
create policy "staff insert audit_log" on public.audit_log for insert to authenticated with check (is_staff());

drop policy if exists "owner select ai_cost_tracking" on public.ai_cost_tracking;
create policy "owner select ai_cost_tracking" on public.ai_cost_tracking for select to authenticated using (is_owner());

-- ---- Read-only staff visibility on remaining log/report tables ----
drop policy if exists "staff select cancellation_logs" on public.cancellation_logs;
create policy "staff select cancellation_logs" on public.cancellation_logs for select to authenticated using (is_staff());
drop policy if exists "staff select conversation_logs" on public.conversation_logs;
create policy "staff select conversation_logs" on public.conversation_logs for select to authenticated using (is_staff());
drop policy if exists "staff select error_log" on public.error_log;
create policy "staff select error_log" on public.error_log for select to authenticated using (is_staff());
drop policy if exists "staff select failed_booking_attempts" on public.failed_booking_attempts;
create policy "staff select failed_booking_attempts" on public.failed_booking_attempts for select to authenticated using (is_staff());
drop policy if exists "staff select faq_misses" on public.faq_misses;
create policy "staff select faq_misses" on public.faq_misses for select to authenticated using (is_staff());
drop policy if exists "staff select reminders_sent" on public.reminders_sent;
create policy "staff select reminders_sent" on public.reminders_sent for select to authenticated using (is_staff());
drop policy if exists "staff select reschedule_logs" on public.reschedule_logs;
create policy "staff select reschedule_logs" on public.reschedule_logs for select to authenticated using (is_staff());
drop policy if exists "staff select review_tracking" on public.review_tracking;
create policy "staff select review_tracking" on public.review_tracking for select to authenticated using (is_staff());
drop policy if exists "staff update review_tracking" on public.review_tracking;
create policy "staff update review_tracking" on public.review_tracking for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "staff select webhook_errors" on public.webhook_errors;
create policy "staff select webhook_errors" on public.webhook_errors for select to authenticated using (is_staff());
drop policy if exists "staff_select" on public.booking_locks;
create policy "staff_select" on public.booking_locks for select to authenticated using (is_staff());
drop policy if exists "staff_select" on public.processed_messages;
create policy "staff_select" on public.processed_messages for select to authenticated using (is_staff());
drop policy if exists "staff_select" on public.response_cache;
create policy "staff_select" on public.response_cache for select to authenticated using (is_staff());
drop policy if exists "staff_select" on public.documents_embedding_staging;
create policy "staff_select" on public.documents_embedding_staging for select to authenticated using (is_staff());

-- ============================================================================
-- Also flagged by the Supabase security advisor (WARN level, not fixed here
-- because they need an owner decision, not a code change):
--   - Leaked-password protection is disabled in Auth. Turn on in
--     Dashboard → Authentication → Policies → "Leaked password protection".
--   - is_owner()/is_staff() are directly callable via PostgREST RPC by any
--     authenticated user (see comment above) — low risk, tighten if desired.
-- ============================================================================

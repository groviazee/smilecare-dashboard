-- Patient age: asked together with the other booking details (AI receptionist + dashboard).
-- Mirrors the migration already applied to the live project (version 20261021164713), so it is a
-- no-op there and correct for a fresh dev/staging project.
-- Naming: booking_records uses the patient_* prefix (patient_name, patient_phone, ...), so the
-- booking column is patient_age; patients already is "the patient", so its column is just age.
-- Nullable because rows created before this change have no age. New bookings require it at the
-- application layer (dashboard form, Booking Engine).
alter table public.booking_records add column if not exists patient_age integer check (patient_age is null or (patient_age between 0 and 120));
alter table public.patients add column if not exists age integer check (age is null or (age between 0 and 120));

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import {
  Search, ChevronLeft, ChevronRight, Phone, MessageCircle, Check, X,
  AlertTriangle, AlertOctagon, Info, Star, Settings as SettingsIcon, Users,
  CalendarDays, TrendingUp, Printer, Download, RefreshCw, Plus,
  ChevronDown, ChevronUp, StickyNote, Stethoscope,
  CircleCheck, CircleDot, WifiOff, Wifi, MessageSquare, CalendarClock,
  Ban, Send, BookOpen, History, HelpCircle, Edit3, Lock, LogOut, Trash2,
  SlidersHorizontal, Undo2, Mail, Sun, Moon, FileDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/* ============================== helpers ============================== */

const CONFIG_KEY = "smilecare_supabase_config"; // { url, key } — project connection, per device

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(d, h, m) { const x = new Date(d); x.setHours(h, m, 0, 0); return x.toISOString(); }
function fromToday(offsetDays, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISO(d, h, m);
}
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function sameDay(iso, d) {
  if (!iso) return false;
  const a = new Date(iso);
  return dateKey(a) === dateKey(d);
}
// All four format helpers take an optional locale (defaults to en-IN, the
// existing behavior) so a clinic's `clinic_settings.locale` can override it.
// Per the plan, full timezone-database handling is a known v1 simplification
// — this covers locale (number/date formatting conventions), not timezone.
function fmtTime(iso, locale = "en-IN") {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtTime24(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDateLong(d, locale = "en-IN") {
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(iso, locale = "en-IN") {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}
function timeAgo(iso) {
  if (!iso) return "";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}
// Replaces the old isSunday() — closed days are now whichever weekdays the
// clinic configured (0=Sun..6=Sat, matching JS Date.getDay()), not a
// hardcoded assumption.
function isClosedDay(date, closedWeekdays) {
  return (closedWeekdays || [0]).includes(date.getDay());
}
function digitsOnly(phone) { return (phone || "").replace(/[^0-9]/g, ""); }
function waLink(phone) { return `https://wa.me/${digitsOnly(phone)}`; }
function telLink(phone) { return `tel:${phone}`; }
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ============================== demo data ============================== */

function buildDemoData() {
  const dentists = [
    { id: 1, name: "Dr. Sharma", specialty: "General Dentistry, Root Canal Specialist", active: true, display_order: 0 },
    { id: 2, name: "Dr. Mehta", specialty: "Cosmetic Dentistry, Braces", active: true, display_order: 1 },
    { id: 3, name: "Dr. Kapoor", specialty: "Pediatric Dentistry, Extractions", active: true, display_order: 2 },
  ];

  const bookings = [
    { booking_id: "BK-DEMO01", patient_name: "Priya Sharma", patient_phone: "+919876500001", reason_for_visit: "Cleaning", dentist_name: "Dr. Sharma", appointment_start: fromToday(0, 9, 30), appointment_end: fromToday(0, 10, 0), status: "arrived", price: 1500 },
    { booking_id: "BK-DEMO02", patient_name: "Rohit Verma", patient_phone: "+919876500002", reason_for_visit: "Root canal consult", dentist_name: "Dr. Mehta", appointment_start: fromToday(0, 10, 30), appointment_end: fromToday(0, 11, 30), status: "confirmed", price: 4500 },
    { booking_id: "BK-DEMO03", patient_name: "Anjali Gupta", patient_phone: "+919876500003", reason_for_visit: "Check-up", dentist_name: "Dr. Kapoor", appointment_start: fromToday(0, 11, 0), appointment_end: fromToday(0, 11, 30), status: "no_show", price: 600 },
    { booking_id: "BK-DEMO04", patient_name: "Karan Malhotra", patient_phone: "+919876500004", reason_for_visit: "Filling", dentist_name: "Dr. Sharma", appointment_start: fromToday(0, 15, 0), appointment_end: fromToday(0, 15, 30), status: "confirmed", price: 1800 },
    { booking_id: "BK-DEMO05", patient_name: "Neha Joshi", patient_phone: "+919876500005", reason_for_visit: "Teeth whitening", dentist_name: "Dr. Mehta", appointment_start: fromToday(0, 16, 30), appointment_end: fromToday(0, 17, 30), status: "confirmed", price: 7000 },
    { booking_id: "BK-DEMO06", patient_name: "Sameer Khan", patient_phone: "+919876500006", reason_for_visit: "Extraction", dentist_name: "Dr. Kapoor", appointment_start: fromToday(1, 9, 0), appointment_end: fromToday(1, 9, 45), status: "confirmed", price: 2500 },
    { booking_id: "BK-DEMO07", patient_name: "Divya Nair", patient_phone: "+919876500007", reason_for_visit: "Braces adjustment", dentist_name: "Dr. Mehta", appointment_start: fromToday(1, 14, 0), appointment_end: fromToday(1, 14, 30), status: "confirmed", price: 2000 },
    { booking_id: "BK-DEMO08", patient_name: "Arjun Rao", patient_phone: "+919876500008", reason_for_visit: "Cleaning", dentist_name: "Dr. Sharma", appointment_start: fromToday(2, 10, 0), appointment_end: fromToday(2, 10, 30), status: "confirmed", price: 1500 },
    { booking_id: "BK-DEMO09", patient_name: "Priya Sharma", patient_phone: "+919876500001", reason_for_visit: "Filling", dentist_name: "Dr. Sharma", appointment_start: fromToday(-7, 9, 30), appointment_end: fromToday(-7, 10, 0), status: "completed", price: 1800 },
    { booking_id: "BK-DEMO10", patient_name: "Priya Sharma", patient_phone: "+919876500001", reason_for_visit: "Check-up", dentist_name: "Dr. Sharma", appointment_start: fromToday(-14, 9, 30), appointment_end: fromToday(-14, 10, 0), status: "no_show", price: 600 },
    { booking_id: "BK-DEMO11", patient_name: "Sameer Khan", patient_phone: "+919876500006", reason_for_visit: "Cleaning", dentist_name: "Dr. Kapoor", appointment_start: fromToday(-21, 9, 0), appointment_end: fromToday(-21, 9, 30), status: "no_show", price: 1500 },
    { booking_id: "BK-DEMO12", patient_name: "Priya Sharma", patient_phone: "+919876500001", reason_for_visit: "Cleaning", dentist_name: "Dr. Sharma", appointment_start: fromToday(-195, 9, 30), appointment_end: fromToday(-195, 10, 0), status: "completed", price: 1500 },
  ];

  const patients = [
    { phone: "+919876500001", name: "Priya Sharma", email: "priya.sharma@example.com", total_visits: 4, last_visit_date: fromToday(-7, 9, 30), staff_notes: "Prefers morning slots." },
    { phone: "+919876500002", name: "Rohit Verma", email: "rohit.verma@example.com", total_visits: 1, last_visit_date: fromToday(0, 10, 30), staff_notes: "" },
    { phone: "+919876500003", name: "Anjali Gupta", email: "anjali.gupta@example.com", total_visits: 2, last_visit_date: fromToday(0, 11, 0), staff_notes: "" },
    { phone: "+919876500004", name: "Karan Malhotra", email: "karan.malhotra@example.com", total_visits: 3, last_visit_date: fromToday(0, 15, 0), staff_notes: "" },
    { phone: "+919876500005", name: "Neha Joshi", email: "neha.joshi@example.com", total_visits: 1, last_visit_date: fromToday(0, 16, 30), staff_notes: "" },
    { phone: "+919876500006", name: "Sameer Khan", email: "sameer.khan@example.com", total_visits: 5, last_visit_date: fromToday(1, 9, 0), staff_notes: "Two prior no-shows — call to confirm before visit." },
  ];

  const escalations = [
    { id: 1, patient_phone: "+919876500009", reason: "Human handoff requested by patient", patient_message: "I want to talk to a real person, this isn't helping", ai_response: "A staff member will contact you shortly.", escalated_at: fromToday(0, 8, 15), resolved: false },
    { id: 2, patient_phone: "+919876500010", reason: "AI expressed uncertainty or reported a system issue", patient_message: "Can I get a same-day emergency slot for a broken tooth?", ai_response: "I'm having trouble confirming that right now.", escalated_at: fromToday(0, 7, 40), resolved: false },
  ];

  const executionErrors = [
    { id: 1, error_type: "reminder_whatsapp_send_failed", error_message: "Failed to send 24h WhatsApp reminder to patient.", severity: "error", patient_phone: "+919876500004", timestamp: fromToday(0, 6, 0), resolved: false },
    { id: 2, error_type: "calendar_api", error_message: "Google Calendar API timeout while checking availability.", severity: "warning", patient_phone: "+919876500005", timestamp: fromToday(-1, 12, 0), resolved: false },
    { id: 3, error_type: "database", error_message: "Supabase connection dropped mid-write, retried successfully.", severity: "critical", patient_phone: "+919876500011", timestamp: fromToday(-1, 18, 0), resolved: false },
  ];

  const failedBookingAttempts = [
    { id: 1, patient_name: "Vikram Singh", patient_phone: "+919876500011", requested_start: fromToday(1, 13, 30), failure_reason: "LUNCH_BREAK", retry_count: 1, timestamp: fromToday(0, 9, 5) },
  ];

  const reviewTracking = [
    { id: 1, patient_name: "Priya Sharma", phone: "+919876500001", appointment_date: fmtDateShort(fromToday(-7, 9, 30)), request_timestamp: fromToday(-7, 9, 30), rating: 5, complaint: null, complaint_status: "None" },
    { id: 2, patient_name: "Anjali Gupta", phone: "+919876500003", appointment_date: fmtDateShort(fromToday(-3, 11, 0)), request_timestamp: fromToday(-3, 11, 0), rating: 4, complaint: null, complaint_status: "None" },
    { id: 3, patient_name: "Rakesh Iyer", phone: "+919876500012", appointment_date: fmtDateShort(fromToday(-2, 15, 0)), request_timestamp: fromToday(-2, 15, 0), rating: 2, complaint: "Waited over 40 minutes past my appointment time.", complaint_status: "Logged" },
    { id: 4, patient_name: "Sunita Desai", phone: "+919876500013", appointment_date: fmtDateShort(fromToday(-5, 10, 0)), request_timestamp: fromToday(-5, 10, 0), rating: 5, complaint: null, complaint_status: "None" },
    { id: 5, patient_name: "Manoj Pillai", phone: "+919876500014", appointment_date: fmtDateShort(fromToday(-6, 16, 0)), request_timestamp: fromToday(-6, 16, 0), rating: 3, complaint: null, complaint_status: "None" },
  ];

  const aiCostTracking = Array.from({ length: 14 }).map((_, i) => ({
    id: i + 1,
    timestamp: fromToday(-i, 12, 0),
    estimated_cost: Number((0.004 + Math.random() * 0.02).toFixed(6)),
  }));

  const clinicSettings = {
    id: 1,
    clinic_name: "Smile Care Dental Clinic",
    clinic_phone: "+91 6377682356",
    admin_email: "yashwantkumar.biz@gmail.com",
    staff_email: "yashwantkumar.biz@gmail.com",
    admin_phone: "916375113421",
    review_url: "https://g.page/r/smilecare-dental/review",
    reminder_delay_hours: 48,
    reminder_resend_webhook_url: "",
    // Phase 1 — configuration fields (previously hardcoded in the code)
    opening_hour: 9,
    closing_hour: 18,
    lunch_start_hour: 13,
    lunch_end_hour: 14,
    slot_interval_minutes: 30,
    min_notice_minutes: 60,
    max_duration_minutes: 180,
    closed_weekdays: [0],
    currency_symbol: "₹",
    currency_to_usd_rate: 0.012,
    locale: "en-IN",
    // Phase 6 — revenue, budgets, recall
    default_prices: { "Cleaning": 1500, "Check-up": 600, "Filling": 1800, "Root canal": 4500, "Root canal consult": 800, "Extraction": 2500, "Teeth whitening": 7000, "Braces adjustment": 2000 },
    ai_daily_budget_usd: 2,
    ai_monthly_budget_usd: 40,
    recall_interval_days: 180,
    // Phase 7 — true (default) keeps the old single-shared-calendar behavior;
    // set false for clinics where each dentist has their own chair/calendar.
    shared_calendar: true,
  };

  const conversationLogs = [
    { id: 1, patient_phone: "+919876500009", direction: "inbound", message_text: "I want to talk to a real person, this isn't helping", timestamp: fromToday(0, 8, 14) },
    { id: 2, patient_phone: "+919876500009", direction: "outbound", message_text: "I want to make sure you get the best assistance possible. A staff member will contact you shortly.", timestamp: fromToday(0, 8, 15) },
    { id: 3, patient_phone: "+919876500004", direction: "inbound", message_text: "Can I move my filling appointment to next week?", timestamp: fromToday(-1, 17, 0) },
    { id: 4, patient_phone: "+919876500004", direction: "outbound", message_text: "Sure — what day and time works for you next week?", timestamp: fromToday(-1, 17, 1) },
  ];

  const faqMisses = [
    { id: 1, patient_phone: "+919876500015", question_text: "Do you accept Niva Bupa insurance?", best_similarity: 0.52, timestamp: fromToday(0, 9, 10) },
    { id: 2, patient_phone: "+919876500016", question_text: "Can I get a dental implant done in one sitting?", best_similarity: 0.61, timestamp: fromToday(-1, 14, 20) },
  ];

  const documents = [
    { id: 1, content: "DENTAL CLINIC INFORMATION\n\nClinic Name: Smile Care Dental Clinic\nAddress: 12, MI Road, Near Central Park, Jaipur, Rajasthan - 302001\nPhone: +91 6377682356\n\nCLINIC HOURS:\nMonday to Saturday: 9:00 AM - 6:00 PM\nLunch Break: 1:00 PM - 2:00 PM\nSunday: Closed\n\n(full knowledge-base text — edit below and re-sync in n8n)" },
  ];

  const auditLog = [
    { id: 1, actor: "front_desk", action: "marked_arrived", detail: "BK-DEMO01 · Priya Sharma", timestamp: fromToday(0, 9, 35) },
    { id: 2, actor: "front_desk", action: "resolved_complaint", detail: "Rakesh Iyer's complaint", timestamp: fromToday(-1, 11, 0) },
  ];

  // Clinic-wide alerts raised by the n8n "Notify Staff Or Owner" sub-workflow
  // (also emailed + sent to Telegram at the same time — this table is the
  // dashboard's copy of that same alert).
  const adminAlerts = [
    { id: 1, subject: "AI daily budget exceeded", message: "Today's AI spend has crossed the configured daily budget.", severity: "warning", resolved: false, created_at: fromToday(0, 8, 30) },
  ];

  const inboundContacts = conversationLogs.filter((c) => c.direction === "inbound").map((c) => ({ patient_phone: c.patient_phone, timestamp: c.timestamp }));

  // Phase 7 — waitlist: patients who wanted a slot that was already taken.
  const waitlist = [
    { id: 1, patient_name: "Deepak Nair", patient_phone: "+919876500020", patient_email: "", reason_for_visit: "Cleaning", dentist_name: "Dr. Sharma", preferred_start: fromToday(0, 9, 30), preferred_end: fromToday(0, 10, 0), status: "pending", created_at: fromToday(0, 8, 0) },
  ];

  return { dentists, bookings, patients, escalations, executionErrors, failedBookingAttempts, reviewTracking, aiCostTracking, clinicSettings, conversationLogs, faqMisses, documents, auditLog, inboundContacts, waitlist, adminAlerts };
}

/* ============================== data client (REST, using the signed-in user's token) ============================== */

// apikey is always the project's anon key (Supabase's gateway needs it to
// route to the right project), but Authorization carries the SIGNED-IN
// USER's JWT access token — issued and refreshed by @supabase/supabase-js.
// RLS policies (run separately, see phase2_supabase_auth.sql) check this
// token's role (`authenticated`), not the anon key — that's the actual
// security boundary. No access token yet → no client → no data.
function makeClient(url, anonKey, accessToken) {
  if (!url || !anonKey || !accessToken) return null;
  const base = url.replace(/\/$/, "") + "/rest/v1";
  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  // PostgREST returns structured JSON errors ({code, message, details, hint}).
  // Postgres error codes (e.g. 23P01 = exclusion_violation, the double-booking
  // guard; 42501 = insufficient_privilege from RLS) show up in `code`. We
  // parse that out and attach it to the thrown Error so call sites can give
  // specific, friendly messages instead of a raw HTTP-status string.
  async function throwApiError(prefix, res) {
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { /* not JSON — plain text error */ }
    const err = new Error(`${prefix}: ${parsed?.message || text || res.status}`);
    err.status = res.status;
    err.code = parsed?.code || null;
    err.details = parsed?.details || null;
    throw err;
  }
  return {
    async select(table, query = "select=*") {
      const res = await fetch(`${base}/${table}?${query}`, { headers });
      if (!res.ok) await throwApiError(table, res);
      return res.json();
    },
    async update(table, filterQuery, patch) {
      const res = await fetch(`${base}/${table}?${filterQuery}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) await throwApiError(`${table} update`, res);
      return res.json();
    },
    async insert(table, row) {
      const res = await fetch(`${base}/${table}`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      if (!res.ok) await throwApiError(`${table} insert`, res);
      return res.json();
    },
    async remove(table, filterQuery) {
      const res = await fetch(`${base}/${table}?${filterQuery}`, { method: "DELETE", headers });
      if (!res.ok) await throwApiError(`${table} delete`, res);
      return true;
    },
  };
}

// Catches the two most common paste mistakes: missing "https://" and using
// the "db.<ref>.supabase.co" host (that's direct-Postgres, port 5432 — the
// REST/Auth API the dashboard needs lives at "https://<ref>.supabase.co").
function normalizeSupabaseUrl(raw) {
  let url = (raw || "").trim().replace(/\/+$/, "");
  if (!url) return { error: "Enter your Supabase Project URL." };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let hostname;
  try { hostname = new URL(url).hostname; }
  catch { return { error: "That doesn't look like a valid URL." }; }
  if (hostname.startsWith("db.")) {
    return { error: `That's the database host (for direct Postgres connections). Use the REST API URL instead — in Supabase go to Project Settings → API → Project URL. It should look like https://${hostname.slice(3)}` };
  }
  return { url };
}

/* ============================== small UI atoms ============================== */

function StatusBadge({ status }) {
  const map = {
    confirmed: { label: "Awaiting", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    arrived: { label: "Arrived", cls: "bg-teal-100 text-teal-800 border-teal-300" },
    no_show: { label: "No-show", cls: "bg-red-100 text-red-800 border-red-300" },
    cancelled: { label: "Cancelled", cls: "bg-stone-200 text-stone-600 border-stone-300" },
    completed: { label: "Completed", cls: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  };
  const s = map[status] || { label: status, cls: "bg-stone-100 text-stone-600 border-stone-300" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>;
}

function SeverityBadge({ severity }) {
  const map = {
    critical: "bg-red-100 text-red-800 border-red-300",
    error: "bg-orange-100 text-orange-800 border-orange-300",
    warning: "bg-amber-100 text-amber-800 border-amber-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[severity] || map.warning}`}>{severity}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm ${className}`}>{children}</div>;
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-stone-400 dark:text-stone-500">
      <Icon size={28} className="mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// Config-driven — takes the clinic's own rules instead of hardcoded numbers,
// so a different clinic's hours/lunch/interval/notice/duration/closed-days
// all just work by editing Settings, no code change.
function validateSlot(dateStr, timeStr, durationMin, settings) {
  const [h, m] = timeStr.split(":").map(Number);
  const start = new Date(dateStr);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  const now = new Date();

  const openingHour = settings?.opening_hour ?? 9;
  const closingHour = settings?.closing_hour ?? 18;
  const lunchStartHour = settings?.lunch_start_hour;
  const lunchEndHour = settings?.lunch_end_hour;
  const slotInterval = settings?.slot_interval_minutes ?? 30;
  const minNotice = settings?.min_notice_minutes ?? 60;
  const maxDuration = settings?.max_duration_minutes ?? 180;
  const closedWeekdays = settings?.closed_weekdays ?? [0];

  if (isClosedDay(start, closedWeekdays)) return `Clinic is closed on ${WEEKDAY_LABELS[start.getDay()]}s.`;
  if (start.getHours() < openingHour || end.getHours() > closingHour || (end.getHours() === closingHour && end.getMinutes() > 0)) {
    return `Clinic operates ${openingHour}:00–${closingHour}:00.`;
  }
  if (lunchStartHour != null && lunchEndHour != null) {
    const lunchStart = new Date(start); lunchStart.setHours(lunchStartHour, 0, 0, 0);
    const lunchEnd = new Date(start); lunchEnd.setHours(lunchEndHour, 0, 0, 0);
    if ((start >= lunchStart && start < lunchEnd) || (end > lunchStart && end <= lunchEnd)) {
      return `Clinic is closed for lunch ${lunchStartHour}:00–${lunchEndHour}:00.`;
    }
  }
  if (durationMin > maxDuration) return `Maximum appointment duration is ${maxDuration} minutes.`;
  if (m % slotInterval !== 0) return `Appointments must start on a ${slotInterval}-minute interval.`;
  if ((start - now) / 60000 < minNotice) return `Appointments need at least ${minNotice} minutes notice.`;
  return { start, end };
}

// By default all dentists share ONE clinic calendar, so a slot must be
// checked against EVERY active booking, not just ones for the same dentist
// — otherwise two bookings can silently overlap the same time. Phase 7 adds
// clinic_settings.shared_calendar (default true = old behavior). Clinics
// with a separate chair per dentist can turn it off in Settings so two
// different dentists CAN be booked at the same time slot; same-dentist
// double-booking is still always blocked.
function hasConflict(existingBookings, start, end, excludeBookingId, dentistName, sharedCalendar = true) {
  return existingBookings.some((b) => {
    if (b.booking_id === excludeBookingId) return false;
    if (b.status === "cancelled" || b.status === "no_show") return false;
    if (!sharedCalendar && dentistName && b.dentist_name && b.dentist_name !== dentistName) return false;
    const bs = new Date(b.appointment_start);
    const be = new Date(b.appointment_end);
    return start < be && end > bs;
  });
}

/* ============================== connect + login screens ============================== */

function ConnectScreen({ onConnected }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const normalized = normalizeSupabaseUrl(url);
      if (normalized.error) throw new Error(normalized.error);
      if (!key.trim()) throw new Error("Enter the project's anon (public) key.");
      const res = await fetch(`${normalized.url}/auth/v1/settings`, { headers: { apikey: key.trim() } });
      if (!res.ok) throw new Error("Couldn't verify that URL/key against Supabase. Double-check both.");
      const cfg = { url: normalized.url, key: key.trim() };
      try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch (e2) { /* ignore */ }
      onConnected(cfg);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
            <Stethoscope size={20} />
          </div>
          <h1 className="font-semibold text-stone-900">Connect the dashboard</h1>
          <p className="text-xs text-stone-500 mt-1">One-time setup, per device. Get these from Supabase → Project Settings → API.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxx.supabase.co"
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="anon (public) key"
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">{busy ? "Checking…" : "Continue"}</button>
        </form>
        <p className="text-[11px] text-stone-400 mt-4">Never paste the service_role key here — only the anon (public) key. Actual data access is controlled by staff login next, not by this key.</p>
      </div>
    </div>
  );
}

function LoginScreen({ supabase, onChangeProject, configFromEnv }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "Wrong email or password." : signInError.message);
    }
    // On success, supabase-js fires onAuthStateChange itself — the app
    // re-renders into the dashboard automatically, no manual state needed.
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
            <Lock size={20} />
          </div>
          <h1 className="font-semibold text-stone-900">Smile Care Dental</h1>
          <p className="text-xs text-stone-500 mt-1">Sign in with your staff account.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@clinic.com"
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Password"
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="text-[11px] text-stone-400 mt-4 text-center">
          No account? Ask whoever manages the clinic's Supabase project to add you under Authentication → Users.
        </p>
        {!configFromEnv && (
          <button onClick={onChangeProject} className="text-[11px] text-stone-400 underline mt-3 w-full text-center">Connect a different Supabase project</button>
        )}
      </div>
    </div>
  );
}

/* ============================== top-level app: config → auth → dashboard ============================== */

// Production-readiness: prefer build-time env vars (set as Vercel env vars)
// over the hand-pasted localStorage config. This means a wrong paste, a
// cleared browser, or a new staff laptop doesn't require re-entering config —
// there's a single source of truth baked into the deploy. The manual-paste
// screen (ConnectScreen) remains as a fallback for local dev / preview
// environments where env vars aren't set.
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const HAS_ENV_CONFIG = Boolean(ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY);

export default function App() {
  const [config, setConfig] = useState(() => {
    if (HAS_ENV_CONFIG) return { url: ENV_SUPABASE_URL, key: ENV_SUPABASE_ANON_KEY, fromEnv: true };
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  });

  // supabase-js handles session persistence + silent token refresh on its
  // own (default: persistSession + autoRefreshToken both on, using
  // localStorage) — no hand-rolled refresh-timer/refresh-token code needed.
  const supabase = useMemo(() => (config ? createClient(config.url, config.key) : null), [config]);

  const [session, setSession] = useState(undefined); // undefined = "not checked yet"

  useEffect(() => {
    if (!supabase) { setSession(undefined); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  function handleChangeProject() {
    if (HAS_ENV_CONFIG) return; // config is baked in at build time, nothing to clear
    try { localStorage.removeItem(CONFIG_KEY); } catch (e) { /* ignore */ }
    setConfig(null);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
  }

  if (!config) return <ConnectScreen onConnected={setConfig} />;
  if (session === undefined) return null; // brief check on load, avoids a login-screen flash
  if (!session) return <LoginScreen supabase={supabase} onChangeProject={handleChangeProject} configFromEnv={config?.fromEnv} />;
  return <Dashboard config={config} session={session} userEmail={session.user?.email} onLogout={handleLogout} supabase={supabase} />;
}

/* ============================== main dashboard ============================== */

function Dashboard({ config, session, userEmail, onLogout, supabase }) {
  const [tab, setTab] = useState("today");
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  // Production-readiness: surface realtime connection state so staff see a
  // "reconnecting…" indicator instead of silently-stale data after a laptop
  // sleep / wifi blip. "live" once SUBSCRIBED, "reconnecting" on drop/error.
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  // Staff theme preference — per-browser, same localStorage pattern already
  // used for the Supabase config paste screen.
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("smilecare_dark_mode") === "1"; } catch (e) { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try { localStorage.setItem("smilecare_dark_mode", darkMode ? "1" : "0"); } catch (e) { /* ignore */ }
  }, [darkMode]);
  const [usingDemoData, setUsingDemoData] = useState(true);

  const [data, setData] = useState(buildDemoData());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dentistFilter, setDentistFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchNotice, setSearchNotice] = useState("");
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [conversationPhone, setConversationPhone] = useState(null);
  const [myRole, setMyRole] = useState(null); // null = still loading; "owner" | "front_desk" | "dentist" | "unprovisioned" (authenticated, no staff_accounts row) | "unknown" (staff_accounts fetch failed)
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const client = useMemo(() => makeClient(config.url, config.key, session?.access_token), [config, session]);

  const [auditWriteFailures, setAuditWriteFailures] = useState(0);
  const logAudit = useCallback((action, detail) => {
    const entry = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, actor: userEmail || "staff_dashboard", action, detail, timestamp: new Date().toISOString() };
    setData((d) => ({ ...d, auditLog: [entry, ...d.auditLog].slice(0, 50) }));
    if (client) {
      // Non-fatal — an audit-log write must never block the UI. But a
      // persistently broken audit trail (e.g. RLS silently rejecting
      // inserts) should be visible to staff, not lost forever, so we count
      // failures this session and surface the count in the Alerts tab.
      client.insert("audit_log", { actor: entry.actor, action: entry.action, detail: entry.detail, timestamp: entry.timestamp })
        .catch(() => { setAuditWriteFailures((n) => n + 1); });
    }
  }, [client, userEmail]);

  const refresh = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        // Phase 7 bug fix: this used to filter out status=eq.cancelled at the
        // query level, which meant a cancelled booking vanished from EVERY
        // tab after the next refresh — not just Today (where that's wanted),
        // but also the Reports "Cancelled" funnel/status-breakdown counts
        // (always showed 0) and a patient's visit-history timeline (missing
        // events). We now fetch everything and hide cancelled bookings only
        // where that's actually desired (Today tab), client-side.
        // Production-readiness: hard cap + explicit ordering so a table that
        // grows past a few thousand rows over time doesn't silently pull an
        // unbounded payload into the browser. At today's row counts this cap
        // is a no-op; it's here so growth degrades gracefully (slower load,
        // most-recent-first) instead of failing outright.
        client.select("booking_records", "select=*&order=appointment_start.asc&limit=5000"),
        client.select("patients", "select=*&order=last_visit_date.desc.nullslast&limit=3000"),
        client.select("escalations", "select=*&resolved=eq.false&order=escalated_at.desc"),
        client.select("execution_errors", "select=*&resolved=eq.false&order=timestamp.desc"),
        client.select("failed_booking_attempts", "select=*&order=timestamp.desc&limit=25"),
        client.select("review_tracking", "select=*&order=request_timestamp.desc.nullslast"),
        client.select("ai_cost_tracking", "select=*&order=timestamp.desc&limit=500"),
        client.select("clinic_settings", "select=*&id=eq.1"),
        client.select("faq_misses", "select=*&order=timestamp.desc&limit=50"),
        client.select("documents", "select=id,content&limit=20"),
        client.select("audit_log", "select=*&order=timestamp.desc&limit=50"),
        client.select("dentists", "select=*&order=display_order.asc"),
        client.select("staff_accounts", `select=clinic_role&user_id=eq.${session?.user?.id}`),
        // Phase 6 — inbound-only, lightweight (no message text) for funnel metrics
        client.select("conversation_logs", "select=patient_phone,timestamp&direction=eq.inbound&order=timestamp.desc&limit=5000"),
        // Phase 7 — waitlist
        client.select("waitlist_entries", "select=*&status=eq.pending&order=created_at.asc"),
        // Phase 8 — clinic-wide alerts from the n8n notify sub-workflow
        client.select("admin_alerts", "select=*&resolved=eq.false&order=created_at.desc"),
      ]);
      const [bookings, patients, escalations, executionErrors, failedBookingAttempts, reviewTracking, aiCostTracking, clinicSettingsArr, faqMisses, documents, auditLog, dentists, staffAccountRows, inboundContacts, waitlist, adminAlerts] =
        results.map((r) => (r.status === "fulfilled" ? r.value : []));

      // Security fix: this used to default to "owner" (full access) whenever
      // the staff_accounts fetch failed OR came back empty. That's a
      // fail-open default — a transient network blip or an unprovisioned
      // account both silently granted the owner UI. Real writes are still
      // gated by Postgres RLS (is_owner()/is_staff() in staff_accounts), so
      // this was a UI/UX bug rather than a data breach — but it's still
      // wrong and confusing, so we now fail closed:
      //   - staff_accounts fetch rejected (network/permission error) →
      //     "unknown" role: hide owner-only tabs, surface the error instead
      //     of guessing.
      //   - staff_accounts fetch succeeded but returned no row for this
      //     user → "unprovisioned": they're authenticated but not set up as
      //     staff yet. Show a dedicated screen asking them to contact the
      //     clinic owner, instead of quietly acting as owner.
      const staffAccountsResult = results[12];
      if (staffAccountsResult.status === "rejected") {
        setMyRole("unknown");
      } else {
        const row = staffAccountsResult.value && staffAccountsResult.value[0];
        setMyRole(row ? row.clinic_role : "unprovisioned");
      }

      setData((d) => ({
        ...d,
        bookings, patients, escalations, executionErrors, failedBookingAttempts,
        reviewTracking, aiCostTracking, clinicSettings: (clinicSettingsArr && clinicSettingsArr[0]) || d.clinicSettings,
        faqMisses, documents: (documents && documents.length ? documents : d.documents),
        auditLog: auditLog && auditLog.length ? auditLog : d.auditLog,
        dentists: dentists && dentists.length ? dentists : d.dentists,
        inboundContacts: inboundContacts || [],
        waitlist: waitlist || [],
        adminAlerts: adminAlerts || [],
      }));
      setUsingDemoData(false);

      const firstFailure = results.find((r) => r.status === "rejected");
      setConnectError(firstFailure ? `Some data couldn't load (${firstFailure.reason.message}). Core tabs still work.` : "");
      setLastRefreshed(new Date());
    } catch (e) {
      setConnectError(e.message || "Could not reach Supabase.");
    } finally {
      setLoading(false);
    }
  }, [client, session]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => { /* ignore — beep still works without this */ });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ---- Realtime: booking_records / escalations / execution_errors /
  // admin_alerts push changes over a websocket instead of waiting for a
  // manual refresh. Requires the tables to be added to the
  // `supabase_realtime` publication (see phase5_realtime_and_indexes.sql
  // and the admin_alerts migration) — if that hasn't been run yet, this
  // subscription simply receives nothing and the dashboard behaves
  // exactly as before (manual refresh still works either way).
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    let debounceTimer = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refreshRef.current(), 600);
    };

    function playAlertBeep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      } catch (e) { /* AudioContext can be blocked before user interaction — non-fatal */ }
    }

    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_records" }, debouncedRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "execution_errors" }, (payload) => {
        if (payload?.new?.severity === "critical") {
          playAlertBeep();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification("Critical system error", { body: payload.new.error_message?.slice(0, 120) || "Check the Alerts tab." }); } catch (e) { /* ignore */ }
          }
        }
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "execution_errors" }, debouncedRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "escalations" }, () => {
        playAlertBeep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("New escalation", { body: "A patient needs staff attention — check the Alerts tab." }); } catch (e) { /* ignore */ }
        }
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "escalations" }, debouncedRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_alerts" }, (payload) => {
        if (payload?.new?.severity === "critical" || payload?.new?.severity === "warning") {
          playAlertBeep();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification(payload?.new?.subject || "Clinic alert", { body: (payload?.new?.message || "").slice(0, 120) || "Check the Alerts tab." }); } catch (e) { /* ignore */ }
          }
        }
        debouncedRefresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_alerts" }, debouncedRefresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setRealtimeStatus("live"); refreshRef.current(); } // catch up on anything missed while reconnecting
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("reconnecting");
      });

    return () => { if (debounceTimer) clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [supabase]);

  // Settings holds clinic-wide configuration (dentists, hours, currency) —
  // restrict it to owners. If a front_desk/dentist staff account somehow
  // lands on this tab (e.g. it was open before their role loaded), bounce
  // them back to "today" rather than leaving a locked tab visible-but-broken.
  const handleCrash = useCallback((error, info) => {
    if (!client) return; // not signed in / no connection — nothing to log to
    client.insert("execution_errors", {
      error_type: "dashboard_crash",
      error_message: String(error?.message || error).slice(0, 500),
      severity: "error",
      timestamp: new Date().toISOString(),
      resolved: false,
    }).catch(() => { /* best-effort — a failed crash-log must not itself crash anything */ });
  }, [client]);

  const canSeeSettings = myRole === "owner";
  const isUnprovisioned = myRole === "unprovisioned";
  useEffect(() => { if ((tab === "settings" || tab === "reports") && !canSeeSettings) setTab("today"); }, [tab, canSeeSettings]);
  const visibleTabs = useMemo(() => TABS.filter((t) => (t.key !== "settings" && t.key !== "reports") || canSeeSettings), [canSeeSettings]);

  /* ---- booking status updates ---- */
  async function setBookingStatus(booking, status) {
    const previousStatus = booking.status;
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, status } : b)) }));
    const auditLabel = status === "arrived" ? "marked_arrived" : status === "completed" ? "marked_completed" : "marked_no_show";
    logAudit(auditLabel, `${booking.booking_id} · ${booking.patient_name}`);
    if (client) {
      try { await client.update("booking_records", `booking_id=eq.${booking.booking_id}`, { status }); }
      catch (e) {
        // Bug fix: previously the local state stayed changed even when this
        // write failed, so staff saw a status the database never actually
        // recorded until their next refresh silently reverted it. Roll back.
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, status: previousStatus } : b)) }));
        setConnectError(`Status change was not saved, reverted: ${e.message}`);
      }
    }
  }

  async function setBookingPrice(booking, price) {
    const numeric = Number(price);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    const previousPrice = booking.price;
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, price: numeric } : b)) }));
    logAudit("set_price", `${booking.booking_id} · ${booking.patient_name} → ${numeric}`);
    if (client) {
      try { await client.update("booking_records", `booking_id=eq.${booking.booking_id}`, { price: numeric }); }
      catch (e) {
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, price: previousPrice } : b)) }));
        setConnectError(`Price was not saved, reverted: ${e.message}`);
      }
    }
  }

  async function rescheduleBooking(booking, start, end) {
    const previousStart = booking.appointment_start;
    const previousEnd = booking.appointment_end;
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, appointment_start: start.toISOString(), appointment_end: end.toISOString() } : b)) }));
    logAudit("rescheduled", `${booking.booking_id} · ${booking.patient_name} → ${fmtDateShort(start.toISOString(), data.clinicSettings.locale)} ${fmtTime(start.toISOString(), data.clinicSettings.locale)}`);
    if (client) {
      try { await client.update("booking_records", `booking_id=eq.${booking.booking_id}`, { appointment_start: start.toISOString(), appointment_end: end.toISOString() }); }
      catch (e) {
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, appointment_start: previousStart, appointment_end: previousEnd } : b)) }));
        setConnectError(e.code === "23P01"
          ? "That new time overlaps another booking. Reverted — pick a different time."
          : `Reschedule was not saved, reverted: ${e.message}`);
      }
    }
  }
  const [undoCancel, setUndoCancel] = useState(null); // { booking_id, patient_name, previousStatus } | null
  const undoTimerRef = useRef(null);

  async function cancelBooking(booking) {
    const previousStatus = booking.status;
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, status: "cancelled" } : b)) }));
    logAudit("cancelled", `${booking.booking_id} · ${booking.patient_name}`);
    if (client) {
      try { await client.update("booking_records", `booking_id=eq.${booking.booking_id}`, { status: "cancelled" }); }
      catch (e) {
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking.booking_id ? { ...b, status: previousStatus } : b)) }));
        setConnectError(`Cancel was not saved, reverted: ${e.message}`);
        return; // don't offer "Undo" on a cancel that never actually happened
      }
    }

    // Give staff a short window to undo an accidental tap — clears itself
    // after 10s, but tapping Undo any time before that reinstates the
    // booking's exact prior status (confirmed, arrived, etc.), not just "confirmed".
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoCancel({ booking_id: booking.booking_id, patient_name: booking.patient_name, previousStatus });
    undoTimerRef.current = setTimeout(() => setUndoCancel(null), 10000);
  }

  async function undoLastCancel() {
    if (!undoCancel) return;
    const { booking_id, patient_name, previousStatus } = undoCancel;
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    setUndoCancel(null);
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking_id ? { ...b, status: previousStatus } : b)) }));
    logAudit("undid_cancel", `${booking_id} · ${patient_name} → back to ${previousStatus}`);
    if (client) {
      try { await client.update("booking_records", `booking_id=eq.${booking_id}`, { status: previousStatus }); }
      catch (e) {
        setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.booking_id === booking_id ? { ...b, status: "cancelled" } : b)) }));
        setConnectError(`Undo was not saved, reverted: ${e.message}`);
      }
    }
  }

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  async function resolveEscalation(e) {
    setData((d) => ({ ...d, escalations: d.escalations.filter((x) => x.id !== e.id) }));
    logAudit("resolved_escalation", `${e.patient_phone}`);
    if (client) {
      try { await client.update("escalations", `id=eq.${e.id}`, { resolved: true }); }
      catch (err) { setData((d) => ({ ...d, escalations: [...d.escalations, e] })); setConnectError(`Could not resolve — restored: ${err.message}`); }
    }
  }
  async function resolveError(e) {
    setData((d) => ({ ...d, executionErrors: d.executionErrors.filter((x) => x.id !== e.id) }));
    logAudit("resolved_error", `${e.error_type} · ${e.patient_phone || "—"}`);
    if (client) {
      try { await client.update("execution_errors", `id=eq.${e.id}`, { resolved: true }); }
      catch (err) { setData((d) => ({ ...d, executionErrors: [...d.executionErrors, e] })); setConnectError(`Could not resolve — restored: ${err.message}`); }
    }
  }
  async function resolveAdminAlert(a) {
    // admin_alerts UPDATE is owner-only at the RLS level — this call will
    // fail silently (row just won't update) for front_desk/dentist logins.
    setData((d) => ({ ...d, adminAlerts: d.adminAlerts.filter((x) => x.id !== a.id) }));
    logAudit("resolved_admin_alert", `${a.subject}`);
    if (client) {
      try { await client.update("admin_alerts", `id=eq.${a.id}`, { resolved: true }); }
      catch (err) { setData((d) => ({ ...d, adminAlerts: [...d.adminAlerts, a] })); setConnectError(`Could not resolve — restored: ${err.message}`); }
    }
  }
  async function resendReminder(e) {
    const webhook = data.clinicSettings?.reminder_resend_webhook_url;
    if (!webhook) { setConnectError("Add a reminder-resend webhook URL in Settings first (points at your n8n workflow's webhook trigger)."); return; }
    try {
      // The n8n webhook requires a shared-secret header (see README /
      // PRODUCTION_REPORT for the value) — anyone with just the URL can't
      // trigger it without this header.
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Secret": "WiJy6NcfCdVs3N-uOC4Jugilk6wqS4_E_hshC-uquB8" },
        body: JSON.stringify({ patient_phone: e.patient_phone, execution_error_id: e.id }),
      });
      logAudit("resent_reminder", `${e.patient_phone || "—"}`);
      resolveError(e);
    } catch (err) { setConnectError(`Could not reach the resend webhook: ${err.message}`); }
  }
  async function resolveComplaint(id) {
    const r = data.reviewTracking.find((x) => x.id === id);
    setData((d) => ({ ...d, reviewTracking: d.reviewTracking.map((x) => (x.id === id ? { ...x, complaint_status: "Resolved" } : x)) }));
    logAudit("resolved_complaint", `${r ? r.patient_name : id}`);
    if (client) { try { await client.update("review_tracking", `id=eq.${id}`, { complaint_status: "Resolved" }); } catch (e) { setConnectError(e.message); } }
  }

  async function saveNotes(phone) {
    if (!(phone in notesDraft)) return;
    const text = notesDraft[phone];
    setData((d) => ({ ...d, patients: d.patients.map((p) => (p.phone === phone ? { ...p, staff_notes: text } : p)) }));
    if (client) { try { await client.update("patients", `phone=eq.${encodeURIComponent(phone)}`, { staff_notes: text }); } catch (e) { setConnectError(e.message); } }
  }

  async function saveClinicSettings(form) {
    setData((d) => ({ ...d, clinicSettings: form }));
    logAudit("updated_clinic_settings", "");
    if (client) { try { await client.update("clinic_settings", "id=eq.1", form); } catch (e) { setConnectError(e.message); } }
  }

  async function saveDocument(doc) {
    setData((d) => ({ ...d, documents: d.documents.map((x) => (x.id === doc.id ? doc : x)) }));
    logAudit("edited_knowledge_base", `document ${doc.id}`);
    if (client) { try { await client.update("documents", `id=eq.${doc.id}`, { content: doc.content }); } catch (e) { setConnectError(e.message); } }
  }

  /* ---- dentists CRUD (Phase 1 — replaces the hardcoded DENTISTS array) ---- */
  async function addDentist() {
    const draft = { name: "New Dentist", specialty: "", active: true, display_order: data.dentists.length };
    if (client) {
      try {
        const [saved] = await client.insert("dentists", draft);
        setData((d) => ({ ...d, dentists: [...d.dentists, saved] }));
        logAudit("added_dentist", saved.name);
        return;
      } catch (e) { setConnectError(e.message); return; }
    }
    setData((d) => ({ ...d, dentists: [...d.dentists, { ...draft, id: `local-${Date.now()}` }] }));
  }
  async function updateDentist(dentist) {
    setData((d) => ({ ...d, dentists: d.dentists.map((x) => (x.id === dentist.id ? dentist : x)) }));
    logAudit("updated_dentist", dentist.name);
    if (client) { try { await client.update("dentists", `id=eq.${dentist.id}`, { name: dentist.name, specialty: dentist.specialty, active: dentist.active, display_order: dentist.display_order }); } catch (e) { setConnectError(e.message); } }
  }
  async function deleteDentist(dentist) {
    if (!window.confirm(`Remove ${dentist.name}? Existing bookings for them are kept, but they won't appear for new bookings.`)) return;
    setData((d) => ({ ...d, dentists: d.dentists.filter((x) => x.id !== dentist.id) }));
    logAudit("removed_dentist", dentist.name);
    if (client) { try { await client.remove("dentists", `id=eq.${dentist.id}`); } catch (e) { setConnectError(e.message); } }
  }

  async function addWalkIn(booking) {
    setData((d) => ({ ...d, bookings: [...d.bookings, booking] }));
    logAudit("added_walk_in", `${booking.booking_id} · ${booking.patient_name}`);
    if (client) {
      try {
        await client.insert("booking_records", {
          booking_id: booking.booking_id, patient_phone: booking.patient_phone, patient_name: booking.patient_name,
          patient_email: booking.patient_email || null,
          reason_for_visit: booking.reason_for_visit, dentist_name: booking.dentist_name,
          appointment_start: booking.appointment_start, appointment_end: booking.appointment_end,
          status: booking.status, created_by: "staff_dashboard",
        });
      } catch (e) {
        // 23P01 = the DB's no_overlapping_dentist_bookings exclusion
        // constraint fired — someone else booked this exact slot between
        // this staff member's client-side conflict check and the actual
        // insert (a race two staff members can hit simultaneously).
        setConnectError(e.code === "23P01"
          ? "Someone just booked that slot. Refresh and pick a different time."
          : `Walk-in booking was not saved: ${e.message}`);
        setData((d) => ({ ...d, bookings: d.bookings.filter((b) => b.booking_id !== booking.booking_id) }));
      }
    }
  }

  /* ---- Phase 7: waitlist ---- */
  async function addWaitlistEntry(fields) {
    const entry = {
      id: `local-${Date.now()}`, patient_name: fields.name, patient_phone: fields.phone,
      patient_email: fields.email?.trim() || null, reason_for_visit: fields.reason,
      dentist_name: fields.dentist || "Any available",
      preferred_start: fields.start.toISOString(), preferred_end: fields.end.toISOString(),
      status: "pending", created_at: new Date().toISOString(),
    };
    setData((d) => ({ ...d, waitlist: [...d.waitlist, entry] }));
    logAudit("added_to_waitlist", `${entry.patient_name} · ${fmtDateShort(entry.preferred_start, data.clinicSettings.locale)} ${fmtTime(entry.preferred_start, data.clinicSettings.locale)}`);
    if (client) {
      try {
        const [saved] = await client.insert("waitlist_entries", {
          patient_name: entry.patient_name, patient_phone: entry.patient_phone, patient_email: entry.patient_email,
          reason_for_visit: entry.reason_for_visit, dentist_name: entry.dentist_name,
          preferred_start: entry.preferred_start, preferred_end: entry.preferred_end, status: "pending",
        });
        setData((d) => ({ ...d, waitlist: d.waitlist.map((w) => (w.id === entry.id ? saved : w)) }));
      } catch (e) {
        setData((d) => ({ ...d, waitlist: d.waitlist.filter((w) => w.id !== entry.id) }));
        setConnectError(`Waitlist entry was not saved: ${e.message}`);
      }
    }
  }

  async function removeWaitlistEntry(entry) {
    setData((d) => ({ ...d, waitlist: d.waitlist.filter((w) => w.id !== entry.id) }));
    logAudit("removed_from_waitlist", `${entry.patient_name}`);
    if (client) {
      try { await client.update("waitlist_entries", `id=eq.${entry.id}`, { status: "cancelled" }); }
      catch (e) { setData((d) => ({ ...d, waitlist: [...d.waitlist, entry] })); setConnectError(`Could not remove — restored: ${e.message}`); }
    }
  }

  // Converting doesn't auto-book — it just prefills the walk-in form with
  // the waitlisted patient's details so staff can confirm the actual final
  // time (the freed-up slot may not be exactly what they originally wanted).
  async function markWaitlistConverted(entry) {
    setData((d) => ({ ...d, waitlist: d.waitlist.filter((w) => w.id !== entry.id) }));
    if (client) { try { await client.update("waitlist_entries", `id=eq.${entry.id}`, { status: "converted" }); } catch (e) { /* non-fatal — entry already removed from view */ } }
  }

  const [conversationMessages, setConversationMessages] = useState([]);
  useEffect(() => {
    if (!conversationPhone) return;
    if (!client) {
      setConversationMessages(data.conversationLogs.filter((c) => c.patient_phone === conversationPhone).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      return;
    }
    client.select("conversation_logs", `patient_phone=eq.${encodeURIComponent(conversationPhone)}&order=timestamp.asc&limit=100`)
      .then(setConversationMessages)
      .catch((e) => setConnectError(e.message));
  }, [conversationPhone, client]); // eslint-disable-line

  const dayBookings = useMemo(() => {
    let list = data.bookings.filter((b) => sameDay(b.appointment_start, selectedDate) && b.status !== "cancelled");
    if (dentistFilter !== "all") list = list.filter((b) => b.dentist_name === dentistFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => (b.booking_id || "").toLowerCase().includes(q) || (b.patient_name || "").toLowerCase().includes(q) || digitsOnly(b.patient_phone).includes(digitsOnly(q)));
    }
    return list.slice().sort((a, b) => new Date(a.appointment_start) - new Date(b.appointment_start));
  }, [data.bookings, selectedDate, dentistFilter, search]);

  const upcoming3Days = useMemo(() => [0, 1, 2].map((off) => {
    const d = new Date(); d.setDate(d.getDate() + off);
    const count = data.bookings.filter((b) => sameDay(b.appointment_start, d) && b.status !== "cancelled").length;
    return { date: d, count };
  }), [data.bookings]);

  const activeDentistNames = useMemo(() => data.dentists.filter((d) => d.active).map((d) => d.name), [data.dentists]);

  const alertCount = data.escalations.length + data.executionErrors.length + data.adminAlerts.length;
  useEffect(() => { document.title = alertCount > 0 ? `(${alertCount}) Clinic Dashboard` : "Clinic Dashboard"; }, [alertCount]);

  function handleGlobalSearchEnter() {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const bookingHit = data.bookings.find((b) => (b.booking_id || "").toLowerCase().includes(q) || (b.patient_name || "").toLowerCase().includes(q) || digitsOnly(b.patient_phone).includes(digitsOnly(q)));
    if (bookingHit) { setTab("today"); setSelectedDate(new Date(bookingHit.appointment_start)); setSearchNotice(""); return; }
    const patientHit = data.patients.find((p) => p.name.toLowerCase().includes(q) || digitsOnly(p.phone).includes(digitsOnly(q)));
    if (patientHit) { setTab("patients"); setExpandedPatient(patientHit.phone); setSearchNotice(""); return; }
    setSearchNotice("No booking or patient matched that search.");
  }

  if (isUnprovisioned) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <div className="text-sm font-semibold text-stone-800">No access yet</div>
          <p className="text-sm text-stone-600">
            You're signed in as <span className="font-medium">{userEmail}</span>, but this account
            hasn't been added as clinic staff yet. Ask the clinic owner to add you in Settings → Staff,
            then sign in again.
          </p>
          <button onClick={onLogout} className="w-full px-3 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleCrash}>
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col">
      <style>{`@media print { .no-print { display: none !important; } .print-area { padding: 0 !important; } }`}</style>

      <header className="sticky top-0 z-20 bg-teal-800 dark:bg-stone-800 text-white px-4 py-3 no-print">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope size={22} className="text-teal-200" />
            <div>
              <h1 className="font-semibold text-sm leading-tight">{data.clinicSettings?.clinic_name || "Smile Care Dental"}</h1>
              <p className="text-[11px] text-teal-200 leading-tight">{userEmail || "Staff Dashboard"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!usingDemoData && realtimeStatus === "reconnecting" ? (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-100 bg-amber-700/70 px-2 py-1 rounded-full animate-pulse" title="Live updates dropped — data shown may be stale until this reconnects">
                <WifiOff size={12} /> Reconnecting…
              </span>
            ) : !usingDemoData ? (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-teal-100 bg-teal-700 px-2 py-1 rounded-full">
                <Wifi size={12} /> {lastRefreshed ? `Refreshed ${fmtTime(lastRefreshed.toISOString(), data.clinicSettings.locale)}` : "Connected"}
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-100 bg-amber-700/60 px-2 py-1 rounded-full">
                <WifiOff size={12} /> Loading…
              </span>
            )}
            <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-teal-700" title="Refresh">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setDarkMode((v) => !v)} className="p-1.5 rounded-lg hover:bg-teal-700" title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-teal-700" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-300" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchNotice(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleGlobalSearchEnter()}
            placeholder="Search booking ID, patient name, or phone — press Enter"
            className="w-full pl-9 pr-14 py-2 rounded-lg bg-teal-700/60 placeholder-teal-200 text-white text-sm border border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button onClick={() => setPaletteOpen(true)} className="hidden sm:block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-teal-200 border border-teal-500 rounded px-1.5 py-0.5" title="Command palette">⌘K</button>
        </div>
        {searchNotice && <p className="text-[11px] text-amber-200 mt-1">{searchNotice}</p>}

        <nav className="hidden md:flex gap-1 mt-3">
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-white text-teal-800" : "text-teal-100 hover:bg-teal-700"}`}>
              <t.icon size={15} />
              {t.label}
              {t.key === "alerts" && alertCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{alertCount}</span>}
            </button>
          ))}
        </nav>
      </header>

      {connectError && (
        <div className="no-print bg-red-50 border-b border-red-200 text-red-700 text-xs px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={14} /> {connectError}
        </div>
      )}

      <main className="flex-1 px-3 sm:px-4 py-4 pb-24 md:pb-6 max-w-5xl w-full mx-auto print-area">
        {tab === "today" && (
          <TodayTab
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            dentistFilter={dentistFilter} setDentistFilter={setDentistFilter}
            dentistNames={activeDentistNames}
            upcoming3Days={upcoming3Days} bookings={dayBookings} allBookings={data.bookings}
            settings={data.clinicSettings}
            setBookingStatus={setBookingStatus}
            showWalkIn={showWalkIn} setShowWalkIn={setShowWalkIn}
            onAddWalkIn={addWalkIn}
            rescheduleTarget={rescheduleTarget} setRescheduleTarget={setRescheduleTarget}
            onReschedule={rescheduleBooking} onCancel={cancelBooking}
            onViewConversation={setConversationPhone}
            onSetPrice={setBookingPrice}
            waitlist={data.waitlist || []}
            onAddToWaitlist={addWaitlistEntry}
            onRemoveFromWaitlist={removeWaitlistEntry}
            onConvertWaitlistEntry={markWaitlistConverted}
          />
        )}
        {tab === "patients" && (
          <PatientsTab
            patients={data.patients} bookings={data.bookings}
            escalations={data.escalations} reviewTracking={data.reviewTracking}
            expanded={expandedPatient} setExpanded={setExpandedPatient}
            notesDraft={notesDraft} setNotesDraft={setNotesDraft} saveNotes={saveNotes}
            onViewConversation={setConversationPhone}
            settings={data.clinicSettings}
          />
        )}
        {tab === "alerts" && (
          <>
            {auditWriteFailures > 0 && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                {auditWriteFailures} audit-log write{auditWriteFailures > 1 ? "s" : ""} failed to save this session.
                The audit trail may be incomplete — if this keeps happening, check Supabase RLS on audit_log.
              </div>
            )}
            <AlertsTab
              escalations={data.escalations} executionErrors={data.executionErrors}
              failedBookingAttempts={data.failedBookingAttempts} faqMisses={data.faqMisses}
              adminAlerts={data.adminAlerts} resolveAdminAlert={resolveAdminAlert} isOwner={canSeeSettings}
              resolveEscalation={resolveEscalation} resolveError={resolveError}
              onViewConversation={setConversationPhone} onResendReminder={resendReminder}
              settings={data.clinicSettings}
            />
          </>
        )}
        {tab === "reviews" && <ReviewsTab reviewTracking={data.reviewTracking} resolveComplaint={resolveComplaint} settings={data.clinicSettings} />}
        {tab === "reports" && canSeeSettings && (
          <ReportsTab
            bookings={data.bookings} escalations={data.escalations} aiCostTracking={data.aiCostTracking}
            settings={data.clinicSettings} dentists={data.dentists} inboundContacts={data.inboundContacts || []}
            waitlist={data.waitlist || []}
          />
        )}
        {tab === "settings" && canSeeSettings && (
          <SettingsTab
            clinicSettings={data.clinicSettings} saveClinicSettings={saveClinicSettings}
            dentists={data.dentists} addDentist={addDentist} updateDentist={updateDentist} deleteDentist={deleteDentist}
            documents={data.documents} saveDocument={saveDocument}
            auditLog={data.auditLog}
          />
        )}
      </main>

      {conversationPhone && <ConversationModal phone={conversationPhone} messages={conversationMessages} onClose={() => setConversationPhone(null)} settings={data.clinicSettings} />}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          patients={data.patients} bookings={data.bookings}
          onGoToTab={(t) => { setTab(t); setPaletteOpen(false); }}
          onOpenPatient={(phone) => { setTab("patients"); setExpandedPatient(phone); setPaletteOpen(false); }}
          onOpenBooking={(b) => { setTab("today"); setSelectedDate(new Date(b.appointment_start)); setPaletteOpen(false); }}
          onNewWalkIn={() => { setTab("today"); setShowWalkIn(true); setPaletteOpen(false); }}
          onRefresh={() => { refresh(); setPaletteOpen(false); }}
          canSeeSettings={canSeeSettings}
        />
      )}

      {undoCancel && (
        <div className="no-print fixed bottom-16 md:bottom-4 inset-x-0 flex justify-center z-30 px-3">
          <div className="bg-stone-900 text-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 text-sm max-w-sm w-full sm:w-auto">
            <span className="flex-1">Cancelled {undoCancel.booking_id} for {undoCancel.patient_name}.</span>
            <button onClick={undoLastCancel} className="flex items-center gap-1 font-medium text-teal-300 hover:text-teal-200 whitespace-nowrap">
              <Undo2 size={14} /> Undo
            </button>
          </div>
        </div>
      )}

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 flex justify-around py-1.5 z-20">
        {visibleTabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="relative flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px]">
            <t.icon size={20} className={tab === t.key ? "text-teal-700" : "text-stone-400"} />
            <span className={`text-[10px] ${tab === t.key ? "text-teal-700 font-medium" : "text-stone-400"}`}>{t.label}</span>
            {t.key === "alerts" && alertCount > 0 && <span className="absolute top-0 right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">{alertCount}</span>}
          </button>
        ))}
      </nav>
    </div>
    </ErrorBoundary>
  );
}

const TABS = [
  { key: "today", label: "Today", icon: CalendarDays },
  { key: "patients", label: "Patients", icon: Users },
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "reports", label: "Reports", icon: TrendingUp },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

/* ============================== Command palette (⌘K) ============================== */

function CommandPalette({ onClose, patients, bookings, onGoToTab, onOpenPatient, onOpenBooking, onNewWalkIn, onRefresh, canSeeSettings }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const staticActions = [
    { label: "New walk-in booking", icon: Plus, run: onNewWalkIn },
    { label: "Go to Today", icon: CalendarDays, run: () => onGoToTab("today") },
    { label: "Go to Patients", icon: Users, run: () => onGoToTab("patients") },
    { label: "Go to Alerts", icon: AlertTriangle, run: () => onGoToTab("alerts") },
    { label: "Go to Reviews", icon: Star, run: () => onGoToTab("reviews") },
    ...(canSeeSettings ? [{ label: "Go to Reports", icon: TrendingUp, run: () => onGoToTab("reports") }] : []),
    ...(canSeeSettings ? [{ label: "Go to Settings", icon: SettingsIcon, run: () => onGoToTab("settings") }] : []),
    { label: "Refresh data", icon: RefreshCw, run: onRefresh },
  ];

  const query = q.trim().toLowerCase();
  const matchedActions = query ? staticActions.filter((a) => a.label.toLowerCase().includes(query)) : staticActions;
  const matchedPatients = query.length >= 2 ? patients.filter((p) => p.name.toLowerCase().includes(query) || digitsOnly(p.phone).includes(digitsOnly(query))).slice(0, 5) : [];
  const matchedBookings = query.length >= 2 ? bookings.filter((b) => (b.booking_id || "").toLowerCase().includes(query) || (b.patient_name || "").toLowerCase().includes(query)).slice(0, 5) : [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 z-40 no-print" onClick={onClose}>
      <div className="bg-white w-full sm:w-[480px] mx-3 sm:mx-0 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100">
          <Search size={16} className="text-stone-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command, patient name, or booking ID…"
            className="flex-1 text-sm outline-none" />
          <kbd className="text-[10px] text-stone-400 border border-stone-200 rounded px-1">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {matchedActions.length > 0 && (
            <div className="px-1.5">
              <p className="text-[10px] uppercase tracking-wide text-stone-400 px-2 py-1">Actions</p>
              {matchedActions.map((a) => (
                <button key={a.label} onClick={a.run} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-stone-700 hover:bg-teal-50">
                  <a.icon size={14} className="text-teal-700" /> {a.label}
                </button>
              ))}
            </div>
          )}
          {matchedPatients.length > 0 && (
            <div className="px-1.5 mt-1">
              <p className="text-[10px] uppercase tracking-wide text-stone-400 px-2 py-1">Patients</p>
              {matchedPatients.map((p) => (
                <button key={p.phone} onClick={() => onOpenPatient(p.phone)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-stone-700 hover:bg-teal-50">
                  <Users size={14} className="text-teal-700" /> {p.name} <span className="text-xs text-stone-400">{p.phone}</span>
                </button>
              ))}
            </div>
          )}
          {matchedBookings.length > 0 && (
            <div className="px-1.5 mt-1">
              <p className="text-[10px] uppercase tracking-wide text-stone-400 px-2 py-1">Bookings</p>
              {matchedBookings.map((b) => (
                <button key={b.booking_id} onClick={() => onOpenBooking(b)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-stone-700 hover:bg-teal-50">
                  <CalendarDays size={14} className="text-teal-700" /> {b.patient_name} <span className="text-xs text-stone-400">{b.booking_id}</span>
                </button>
              ))}
            </div>
          )}
          {matchedActions.length === 0 && matchedPatients.length === 0 && matchedBookings.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-6">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== Conversation viewer ============================== */

function ConversationModal({ phone, messages, onClose, settings }) {
  const locale = settings?.locale;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 no-print">
      <div className="bg-white w-full sm:w-[420px] sm:rounded-xl rounded-t-2xl p-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5"><MessageSquare size={15} /> Conversation · {phone}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="overflow-y-auto space-y-2 py-2">
          {messages.length === 0 && <EmptyState icon={MessageSquare} text="No WhatsApp history found for this number." />}
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.direction === "outbound" ? "ml-auto bg-teal-700 text-white" : "bg-stone-100 text-stone-800"}`}>
              <p>{m.message_text}</p>
              <p className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-teal-200" : "text-stone-400"}`}>{fmtDateShort(m.timestamp, locale)} · {fmtTime(m.timestamp, locale)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== Today Tab ============================== */

function TodayTab({ selectedDate, setSelectedDate, dentistFilter, setDentistFilter, dentistNames, upcoming3Days, bookings, allBookings, settings, setBookingStatus, showWalkIn, setShowWalkIn, onAddWalkIn, rescheduleTarget, setRescheduleTarget, onReschedule, onCancel, onViewConversation, onSetPrice, waitlist = [], onAddToWaitlist, onRemoveFromWaitlist, onConvertWaitlistEntry }) {
  const isToday = dateKey(selectedDate) === dateKey(new Date());
  function shiftDay(n) { const d = new Date(selectedDate); d.setDate(d.getDate() + n); setSelectedDate(d); }

  // Phase 7 — bulk check-in: select several "Awaiting" bookings and mark
  // them all Arrived in one tap, for busy morning rushes.
  const [selected, setSelected] = useState(() => new Set());
  const selectableIds = useMemo(() => new Set(bookings.filter((b) => b.status === "confirmed").map((b) => b.booking_id)), [bookings]);
  useEffect(() => { setSelected((s) => new Set([...s].filter((id) => selectableIds.has(id)))); }, [selectableIds]);
  function toggleSelected(id) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function bulkMarkArrived() {
    bookings.filter((b) => selected.has(b.booking_id)).forEach((b) => setBookingStatus(b, "arrived"));
    setSelected(new Set());
  }
  const [convertDraft, setConvertDraft] = useState(null); // waitlist entry being turned into a real booking

  return (
    <div className="space-y-3">
      <div className="flex justify-end no-print">
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-100 flex items-center gap-1.5 text-xs font-medium">
          <Printer size={15} /> Print
        </button>
      </div>

      <Card className="p-3 no-print">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg hover:bg-stone-100"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="font-semibold text-sm">{fmtDateLong(selectedDate, settings?.locale)}</p>
            {!isToday && <button onClick={() => setSelectedDate(new Date())} className="text-xs text-teal-700 underline">Jump to today</button>}
          </div>
          <button onClick={() => shiftDay(1)} className="p-2 rounded-lg hover:bg-stone-100"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {upcoming3Days.map(({ date, count }) => (
            <button key={dateKey(date)} onClick={() => setSelectedDate(date)}
              className={`flex-1 min-w-[90px] text-center px-2 py-1.5 rounded-lg border text-xs ${dateKey(date) === dateKey(selectedDate) ? "border-teal-600 bg-teal-50 text-teal-800" : "border-stone-200 text-stone-500"}`}>
              <div className="font-medium">{fmtDateShort(date.toISOString(), settings?.locale)}</div>
              <div>{count} booked</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto no-print">
        {["all", ...dentistNames].map((d) => (
          <button key={d} onClick={() => setDentistFilter(d)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border ${dentistFilter === d ? "bg-teal-700 text-white border-teal-700" : "bg-white text-stone-600 border-stone-300"}`}>
            {d === "all" ? "All dentists" : d}
          </button>
        ))}
        <button onClick={() => setShowWalkIn(true)} className="ml-auto whitespace-nowrap flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300">
          <Plus size={14} /> Walk-in
        </button>
      </div>

      {selected.size > 0 && (
        <div className="no-print flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
          <span className="text-xs text-teal-800 font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={bulkMarkArrived} className="flex items-center gap-1 text-xs font-medium bg-teal-700 text-white rounded-lg px-2.5 py-1.5"><CircleCheck size={13} /> Mark arrived</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-stone-500">Clear</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {bookings.length === 0 && <EmptyState icon={CalendarDays} text="No appointments match this view." />}
        {bookings.map((b) => (
          <BookingCard key={b.booking_id} booking={b}
            onStatus={(s) => setBookingStatus(b, s)}
            onReschedule={() => setRescheduleTarget(b)}
            onCancel={() => { if (window.confirm(`Cancel ${b.booking_id} for ${b.patient_name}? The patient should still be informed directly — this only updates records.`)) onCancel(b); }}
            onViewConversation={() => onViewConversation(b.patient_phone)}
            onSetPrice={(price) => onSetPrice(b, price)}
            locale={settings?.locale} currencySymbol={settings?.currency_symbol ?? "₹"}
            selectable={selectableIds.has(b.booking_id)}
            selected={selected.has(b.booking_id)}
            onToggleSelect={() => toggleSelected(b.booking_id)}
          />
        ))}
      </div>

      <WaitlistPanel waitlist={waitlist} settings={settings} onRemove={onRemoveFromWaitlist} onConvert={(w) => setConvertDraft(w)} />

      {showWalkIn && (
        <BookingFormModal
          title="Add walk-in booking" onClose={() => setShowWalkIn(false)}
          existingBookings={allBookings} settings={settings} dentistNames={dentistNames}
          initial={{ date: dateKey(selectedDate), time: "10:00", duration: "30", dentist: "" }}
          onWaitlist={onAddToWaitlist}
          onSave={(fields) => {
            onAddWalkIn({
              booking_id: `BK-WALK-${Date.now().toString(36).toUpperCase()}`,
              patient_name: fields.name, patient_phone: fields.phone, patient_email: fields.email?.trim() || null,
              reason_for_visit: fields.reason, dentist_name: fields.dentist || "Any available",
              appointment_start: fields.start.toISOString(), appointment_end: fields.end.toISOString(), status: "confirmed",
              price: fields.price ? Number(fields.price) : (settings?.default_prices?.[fields.reason] ?? null),
            });
            setShowWalkIn(false);
          }}
        />
      )}

      {rescheduleTarget && (
        <BookingFormModal
          title={`Reschedule ${rescheduleTarget.booking_id}`} onClose={() => setRescheduleTarget(null)}
          existingBookings={allBookings} settings={settings} dentistNames={dentistNames}
          excludeBookingId={rescheduleTarget.booking_id}
          initial={{
            name: rescheduleTarget.patient_name, phone: rescheduleTarget.patient_phone, email: rescheduleTarget.patient_email || "", reason: rescheduleTarget.reason_for_visit,
            date: dateKey(new Date(rescheduleTarget.appointment_start)), time: fmtTime24(rescheduleTarget.appointment_start),
            duration: String(Math.round((new Date(rescheduleTarget.appointment_end) - new Date(rescheduleTarget.appointment_start)) / 60000)),
            dentist: rescheduleTarget.dentist_name,
          }}
          lockPatient
          onSave={(fields) => { onReschedule(rescheduleTarget, fields.start, fields.end); setRescheduleTarget(null); }}
        />
      )}

      {convertDraft && (
        <BookingFormModal
          title={`Book ${convertDraft.patient_name} (from waitlist)`} onClose={() => setConvertDraft(null)}
          existingBookings={allBookings} settings={settings} dentistNames={dentistNames}
          onWaitlist={onAddToWaitlist}
          initial={{
            name: convertDraft.patient_name, phone: convertDraft.patient_phone, email: convertDraft.patient_email || "", reason: convertDraft.reason_for_visit,
            date: dateKey(new Date(convertDraft.preferred_start)), time: fmtTime24(convertDraft.preferred_start),
            duration: String(Math.round((new Date(convertDraft.preferred_end) - new Date(convertDraft.preferred_start)) / 60000)) || "30",
            dentist: convertDraft.dentist_name === "Any available" ? "" : convertDraft.dentist_name,
          }}
          onSave={(fields) => {
            onAddWalkIn({
              booking_id: `BK-WAIT-${Date.now().toString(36).toUpperCase()}`,
              patient_name: fields.name, patient_phone: fields.phone, patient_email: fields.email?.trim() || null,
              reason_for_visit: fields.reason, dentist_name: fields.dentist || "Any available",
              appointment_start: fields.start.toISOString(), appointment_end: fields.end.toISOString(), status: "confirmed",
              price: fields.price ? Number(fields.price) : (settings?.default_prices?.[fields.reason] ?? null),
            });
            onConvertWaitlistEntry(convertDraft);
            setConvertDraft(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================== Waitlist panel (Phase 7) ============================== */

function WaitlistPanel({ waitlist, settings, onRemove, onConvert }) {
  if (!waitlist || waitlist.length === 0) return null;
  const locale = settings?.locale;
  return (
    <Card className="p-3 no-print">
      <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1.5"><CalendarClock size={13} /> Waitlist ({waitlist.length})</p>
      <div className="space-y-1.5">
        {waitlist.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{w.patient_name} · {w.reason_for_visit}</p>
              <p className="text-[11px] text-stone-500">Wanted {fmtDateShort(w.preferred_start, locale)} {fmtTime(w.preferred_start, locale)} · {w.dentist_name}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onConvert(w)} className="px-2 py-1 rounded-lg bg-teal-700 text-white text-[11px] font-medium">Book now</button>
              <button onClick={() => onRemove(w)} className="p-1.5 rounded-lg bg-stone-100 text-stone-500"><X size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BookingCard({ booking: b, onStatus, onReschedule, onCancel, onViewConversation, onSetPrice, locale, currencySymbol = "₹", selectable = false, selected = false, onToggleSelect }) {
  const ended = new Date(b.appointment_end) < new Date();
  const missedAction = ended && b.status === "confirmed";
  const active = b.status === "confirmed" || b.status === "arrived";
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(b.price ?? "");
  return (
    <Card className={`p-3 ${selected ? "ring-2 ring-teal-500" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {selectable && (
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className="no-print mt-1 w-3.5 h-3.5 accent-teal-700" title="Select for bulk actions" />
          )}
          <div>
            <p className="text-sm font-semibold">{fmtTime(b.appointment_start, locale)} – {fmtTime(b.appointment_end, locale)}</p>
            <p className="text-sm text-stone-800">{b.patient_name}</p>
            <p className="text-xs text-stone-500">{b.reason_for_visit} · {b.dentist_name}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{b.booking_id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={b.status} />
          {missedAction && <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium"><AlertTriangle size={11} /> No action taken</span>}
          {editingPrice ? (
            <div className="flex items-center gap-1 no-print">
              <input autoFocus type="number" min="0" value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { onSetPrice(priceDraft); setEditingPrice(false); } if (e.key === "Escape") setEditingPrice(false); }}
                className="w-16 border border-stone-300 rounded px-1 py-0.5 text-xs" />
              <button onClick={() => { onSetPrice(priceDraft); setEditingPrice(false); }} className="text-teal-700"><Check size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setEditingPrice(true)} className="text-[11px] text-stone-500 hover:text-teal-700 no-print flex items-center gap-1">
              {b.price != null ? `${currencySymbol}${b.price}` : "Set price"} <Edit3 size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-stone-100">
        <div className="flex gap-2">
          <a href={telLink(b.patient_phone)} aria-label="Call patient" title="Call patient" className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"><Phone size={14} /></a>
          <a href={waLink(b.patient_phone)} target="_blank" rel="noreferrer" aria-label="Message on WhatsApp" title="Message on WhatsApp" className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><MessageCircle size={14} /></a>
          <button onClick={onViewConversation} aria-label="View WhatsApp conversation" title="View WhatsApp conversation" className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"><MessageSquare size={14} /></button>
        </div>
        {b.status === "confirmed" && (
          <div className="flex gap-1.5 no-print">
            <button onClick={() => onStatus("arrived")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium"><Check size={13} /> Arrived</button>
            <button onClick={() => onStatus("no_show")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium"><X size={13} /> No-show</button>
          </div>
        )}
        {b.status === "arrived" && (
          <div className="flex gap-1.5 no-print">
            <button onClick={() => onStatus("completed")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium"><CircleCheck size={13} /> Completed</button>
          </div>
        )}
      </div>
      {active && (
        <div className="flex gap-1.5 mt-1.5 no-print">
          <button onClick={onReschedule} className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium"><CalendarClock size={13} /> Reschedule</button>
          <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium"><Ban size={13} /> Cancel</button>
        </div>
      )}
    </Card>
  );
}

function BookingFormModal({ title, onClose, onSave, existingBookings, initial, excludeBookingId, lockPatient, settings, dentistNames, onWaitlist }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", reason: "", ...initial });
  const [error, setError] = useState("");
  const [conflictFields, setConflictFields] = useState(null); // form snapshot when the slot is taken, so "Add to waitlist" can offer it
  const sharedCalendar = settings?.shared_calendar !== false;

  function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.reason.trim()) { setError("Name, phone, and reason are required."); return; }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("That email address doesn't look right — fix it or leave it blank."); return; }
    const result = validateSlot(form.date, form.time, Number(form.duration), settings);
    if (typeof result === "string") { setError(result); return; }
    const { start, end } = result;
    if (hasConflict(existingBookings, start, end, excludeBookingId, form.dentist, sharedCalendar)) {
      setError(sharedCalendar
        ? "This slot is already booked (the clinic calendar is shared across all dentists). Pick a different time, or add the patient to the waitlist below."
        : `${form.dentist || "That dentist"} already has a booking then. Pick a different time, or add the patient to the waitlist below.`);
      setConflictFields({ ...form, start, end });
      return;
    }
    setConflictFields(null);
    onSave({ ...form, start, end });
  }

  function addToWaitlist() {
    if (!onWaitlist || !conflictFields) return;
    onWaitlist(conflictFields);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 no-print">
      <div className="bg-white w-full sm:w-96 sm:rounded-xl rounded-t-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 space-y-1.5">
            <p>{error}</p>
            {conflictFields && onWaitlist && (
              <button onClick={addToWaitlist} className="flex items-center gap-1 font-medium text-red-700 underline underline-offset-2">
                <CalendarClock size={12} /> Add to waitlist for this time instead
              </button>
            )}
          </div>
        )}
        {lockPatient && (
          <p className="text-[11px] text-stone-400 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
            Patient, reason, and dentist stay as booked. Only the date/time/duration can change here.
          </p>
        )}
        <input placeholder="Patient name" value={form.name} disabled={lockPatient} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-500" />
        <input placeholder="Mobile number" value={form.phone} disabled={lockPatient} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-500" />
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="email" placeholder="Email address (optional)" value={form.email} disabled={lockPatient} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-500" />
        </div>
        <input placeholder="Reason for visit" value={form.reason} disabled={lockPatient}
          onChange={(e) => {
            const reason = e.target.value;
            const suggested = settings?.default_prices?.[reason];
            setForm((f) => ({ ...f, reason, price: f.price || (suggested != null ? String(suggested) : f.price) }));
          }} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-500" />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">{settings?.currency_symbol ?? "₹"}</span>
          <input type="number" min="0" placeholder="Price (optional)" value={form.price || ""} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border border-stone-300 rounded-lg pl-7 pr-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setConflictFields(null); }} className="border border-stone-300 rounded-lg px-2 py-2 text-sm" />
          <input type="time" value={form.time} onChange={(e) => { setForm({ ...form, time: e.target.value }); setConflictFields(null); }} className="border border-stone-300 rounded-lg px-2 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.duration} onChange={(e) => { setForm({ ...form, duration: e.target.value }); setConflictFields(null); }} className="border border-stone-300 rounded-lg px-2 py-2 text-sm">
            <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option>
          </select>
          <select value={form.dentist} disabled={lockPatient} onChange={(e) => { setForm({ ...form, dentist: e.target.value }); setConflictFields(null); }} className="border border-stone-300 rounded-lg px-2 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-500">
            <option value="">Any dentist</option>
            {dentistNames.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={submit} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium">Save</button>
      </div>
    </div>
  );
}

/* ============================== Patients Tab ============================== */

function PatientsTab({ patients, bookings, escalations, reviewTracking, expanded, setExpanded, notesDraft, setNotesDraft, saveNotes, onViewConversation, settings }) {
  const locale = settings?.locale;
  const [q, setQ] = useState("");
  const [recallOnly, setRecallOnly] = useState(false);
  const recallDays = settings?.recall_interval_days ?? 180;

  function historyFor(phone) { return bookings.filter((b) => b.patient_phone === phone).sort((a, b) => new Date(b.appointment_start) - new Date(a.appointment_start)); }
  function pendingFor(phone) { return escalations.some((e) => e.patient_phone === phone) || reviewTracking.some((r) => r.phone === phone && r.complaint_status === "Logged"); }
  function noShowPattern(phone) {
    const h = historyFor(phone).slice(0, 6);
    return { noShows: h.filter((b) => b.status === "no_show").length, of: h.length };
  }
  // Recall due: last visit older than the clinic's recall window, and no upcoming (future, non-cancelled) booking already on the books.
  function isRecallDue(p) {
    if (!p.last_visit_date) return false;
    const daysSince = (Date.now() - new Date(p.last_visit_date).getTime()) / 86400000;
    if (daysSince < recallDays) return false;
    const hasUpcoming = bookings.some((b) => b.patient_phone === p.phone && new Date(b.appointment_start) > new Date() && b.status !== "cancelled");
    return !hasUpcoming;
  }

  const filtered = patients
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || digitsOnly(p.phone).includes(digitsOnly(q)))
    .filter((p) => !recallOnly || isRecallDue(p));
  const recallCount = patients.filter(isRecallDue).length;

  function exportPatientsCSV() {
    const rows = [["Name", "Phone", "Email", "Total visits", "Last visit", "Recall due", "Staff notes"]];
    patients.forEach((p) => rows.push([p.name, p.phone, p.email || "", p.total_visits ?? "", p.last_visit_date || "", isRecallDue(p) ? "Yes" : "No", (p.staff_notes || "").replace(/\n/g, " ")]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `patients_${dateKey(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Unified CRM timeline: bookings + review/complaint events, chronological, newest first.
  function timelineFor(phone) {
    const events = [];
    historyFor(phone).forEach((b) => events.push({ type: "booking", date: b.appointment_start, booking: b }));
    reviewTracking.filter((r) => r.phone === phone).forEach((r) => events.push({ type: "review", date: r.request_timestamp || r.appointment_date, review: r }));
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setRecallOnly((v) => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${recallOnly ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-white text-stone-600 border-stone-300"}`}>
          <CalendarClock size={13} /> Recall due{recallCount > 0 && ` (${recallCount})`}
        </button>
        <button onClick={exportPatientsCSV} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-stone-300 bg-white text-stone-600 whitespace-nowrap">
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState icon={Users} text="No patients found." />}
        {filtered.map((p) => {
          const isOpen = expanded === p.phone;
          const pattern = noShowPattern(p.phone);
          const dueForRecall = isRecallDue(p);
          return (
            <Card key={p.phone} className="p-3">
              <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(isOpen ? null : p.phone)}>
                <div className="flex items-center gap-2">
                  {pendingFor(p.phone) && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Needs attention" />}
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {p.name}
                      {dueForRecall && <span className="text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-1.5 py-0.5">Recall due</span>}
                    </p>
                    <p className="text-xs text-stone-500">{p.phone} · {p.total_visits} visits · last {fmtDateShort(p.last_visit_date, locale)}</p>
                    {pattern.noShows > 0 && <p className="text-[11px] text-red-600 mt-0.5">{pattern.noShows} no-shows in last {pattern.of} visits</p>}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
              </button>
              {isOpen && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
                  <div className="flex gap-2">
                    <a href={telLink(p.phone)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs"><Phone size={13} /> Call</a>
                    <a href={waLink(p.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs"><MessageCircle size={13} /> WhatsApp</a>
                    <button onClick={() => onViewConversation(p.phone)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs"><MessageSquare size={13} /> Full chat</button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><History size={12} /> Timeline</p>
                    <div className="space-y-1">
                      {timelineFor(p.phone).map((ev, i) => ev.type === "booking" ? (
                        <div key={`b-${ev.booking.booking_id}`} className="flex items-center justify-between text-xs bg-stone-50 rounded-lg px-2 py-1.5">
                          <span>{fmtDateShort(ev.date, locale)} · {ev.booking.reason_for_visit} · {ev.booking.dentist_name}{ev.booking.price != null ? ` · ${settings?.currency_symbol ?? "₹"}${ev.booking.price}` : ""}</span>
                          <StatusBadge status={ev.booking.status} />
                        </div>
                      ) : (
                        <div key={`r-${i}`} className="flex items-center justify-between text-xs bg-amber-50 rounded-lg px-2 py-1.5">
                          <span className="flex items-center gap-1"><Star size={11} className="text-amber-500" /> {fmtDateShort(ev.date, locale)} · rated {ev.review.rating}★{ev.review.complaint ? ` — "${ev.review.complaint}"` : ""}</span>
                        </div>
                      ))}
                      {timelineFor(p.phone).length === 0 && <p className="text-xs text-stone-400">No visit history yet.</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><StickyNote size={12} /> Staff notes</p>
                    <textarea defaultValue={p.staff_notes || ""} onChange={(e) => setNotesDraft((n) => ({ ...n, [p.phone]: e.target.value }))} onBlur={() => saveNotes(p.phone)}
                      placeholder="Allergies, preferences, anything the front desk should know…" className="w-full border border-stone-300 rounded-lg px-2.5 py-2 text-xs resize-none" rows={2} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Alerts Tab ============================== */

function AlertsTab({ escalations, executionErrors, failedBookingAttempts, faqMisses, adminAlerts = [], resolveAdminAlert, isOwner, resolveEscalation, resolveError, onViewConversation, onResendReminder, settings }) {
  const locale = settings?.locale;
  const [warningsOpen, setWarningsOpen] = useState(false);
  const critical = executionErrors.filter((e) => e.severity !== "warning");
  const warnings = executionErrors.filter((e) => e.severity === "warning");
  const SLA_MINUTES = 30;
  const sortedEscalations = [...escalations].sort((a, b) => new Date(a.escalated_at) - new Date(b.escalated_at));
  const sortedAdminAlerts = [...adminAlerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-4">
      {adminAlerts.length > 0 && (
        <Section title="Clinic alerts" count={adminAlerts.length} icon={AlertTriangle}>
          {sortedAdminAlerts.map((a) => (
            <Card key={a.id} className={`p-3 ${a.severity === "critical" ? "border-red-300 bg-red-50/40" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={a.severity} /></div>
                  <p className="text-sm font-medium">{a.subject}</p>
                  <p className="text-xs text-stone-500 mt-1">{a.message}</p>
                  <p className="text-[11px] text-stone-400 mt-1">{fmtDateShort(a.created_at, locale)} {fmtTime(a.created_at, locale)}</p>
                </div>
                {isOwner ? (
                  <button onClick={() => resolveAdminAlert(a)} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium"><Check size={13} /> Resolve</button>
                ) : (
                  <span className="flex-shrink-0 text-[11px] text-stone-400">Owner only</span>
                )}
              </div>
            </Card>
          ))}
        </Section>
      )}

      <Section title="Escalations" count={escalations.length} icon={AlertOctagon}>
        {escalations.length === 0 && <EmptyState icon={CircleCheck} text="No open escalations." />}
        {sortedEscalations.map((e) => {
          const minsAgo = Math.floor((Date.now() - new Date(e.escalated_at).getTime()) / 60000);
          const overdue = minsAgo > SLA_MINUTES;
          return (
          <Card key={e.id} className={`p-3 ${overdue ? "border-red-300 bg-red-50/40" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                {overdue && (
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100 border border-red-300 rounded-full px-2 py-0.5 mb-1">
                    <AlertTriangle size={11} /> Overdue — {minsAgo}m (SLA {SLA_MINUTES}m)
                  </p>
                )}
                <p className="text-sm font-medium">{e.reason}</p>
                <p className="text-xs text-stone-500 mt-1">"{e.patient_message}"</p>
                <p className="text-[11px] text-stone-400 mt-1">{e.patient_phone} · {fmtTime(e.escalated_at, locale)}, {fmtDateShort(e.escalated_at, locale)}{!overdue && ` · ${minsAgo}m ago`}</p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => resolveEscalation(e)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium"><Check size={13} /> Handled</button>
                <button onClick={() => onViewConversation(e.patient_phone)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium"><MessageSquare size={13} /> Chat</button>
              </div>
            </div>
          </Card>
          );
        })}
      </Section>

      <Section title="System errors" count={executionErrors.length} icon={AlertTriangle}>
        {critical.length === 0 && warnings.length === 0 && <EmptyState icon={CircleCheck} text="No unresolved errors." />}
        {critical.map((e) => <ErrorCard key={e.id} e={e} onResolve={() => resolveError(e)} onResend={onResendReminder} locale={locale} />)}
        {warnings.length > 0 && (
          <button onClick={() => setWarningsOpen((v) => !v)} className="flex items-center gap-1 text-xs text-stone-500 font-medium px-1">
            {warningsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </button>
        )}
        {warningsOpen && warnings.map((e) => <ErrorCard key={e.id} e={e} onResolve={() => resolveError(e)} onResend={onResendReminder} locale={locale} />)}
      </Section>

      <Section title="Failed booking attempts" count={failedBookingAttempts.length} icon={Info}>
        {failedBookingAttempts.length === 0 && <EmptyState icon={CircleCheck} text="No failed attempts logged." />}
        {failedBookingAttempts.map((f) => (
          <Card key={f.id} className="p-3">
            <p className="text-sm font-medium">{f.patient_name} <span className="text-stone-400 font-normal">· {f.patient_phone}</span></p>
            <p className="text-xs text-stone-500 mt-1">Requested {fmtDateShort(f.requested_start, locale)} {fmtTime(f.requested_start, locale)} — failed: {f.failure_reason}</p>
            <p className="text-[11px] text-stone-400 mt-1">Retries: {f.retry_count} · Logged {fmtDateShort(f.timestamp, locale)}</p>
          </Card>
        ))}
      </Section>

      <Section title="Bot couldn't answer" count={faqMisses.length} icon={HelpCircle}>
        {faqMisses.length === 0 && <EmptyState icon={CircleCheck} text="No knowledge-base gaps logged." />}
        {faqMisses.map((f) => (
          <Card key={f.id} className="p-3">
            <p className="text-sm">"{f.question_text}"</p>
            <p className="text-[11px] text-stone-400 mt-1">{f.patient_phone} · match confidence {Math.round((f.best_similarity || 0) * 100)}% · {fmtDateShort(f.timestamp, locale)}</p>
          </Card>
        ))}
        {faqMisses.length > 0 && <p className="text-[11px] text-stone-400 px-0.5">Add answers to these in Settings → Knowledge base, then re-sync in n8n.</p>}
      </Section>
    </div>
  );
}

function ErrorCard({ e, onResolve, onResend, locale }) {
  const canResend = e.error_type === "reminder_whatsapp_send_failed";
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={e.severity} /><span className="text-xs text-stone-400">{e.error_type}</span></div>
          <p className="text-sm">{e.error_message}</p>
          <p className="text-[11px] text-stone-400 mt-1">{e.patient_phone || "—"} · {fmtDateShort(e.timestamp, locale)} {fmtTime(e.timestamp, locale)}</p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onResolve} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium"><Check size={13} /> Resolve</button>
          {canResend && <button onClick={() => onResend(e)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium"><Send size={13} /> Resend</button>}
        </div>
      </div>
    </Card>
  );
}

function Section({ title, count, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Icon size={14} className="text-stone-500" />
        <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
        {count > 0 && <span className="text-xs text-stone-400">({count})</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ============================== Reviews Tab ============================== */

function ReviewsTab({ reviewTracking, resolveComplaint, settings }) {
  const locale = settings?.locale;
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  function reviewDate(r) { return new Date(r.request_timestamp || r.appointment_date); }
  const thisWeek = reviewTracking.filter((r) => reviewDate(r) >= weekAgo);
  const avg = reviewTracking.length ? (reviewTracking.reduce((s, r) => s + (r.rating || 0), 0) / reviewTracking.length).toFixed(1) : "—";
  const dist = [1, 2, 3, 4, 5].map((star) => ({ star: `${star}★`, count: reviewTracking.filter((r) => r.rating === star).length }));
  const complaints = reviewTracking.filter((r) => r.complaint_status === "Logged");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-teal-800">{avg}</p><p className="text-xs text-stone-500 mt-1">Average rating</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-teal-800">{thisWeek.length}</p><p className="text-xs text-stone-500 mt-1">Reviews this week</p></Card>
      </div>
      <Card className="p-4">
        <p className="text-xs font-medium text-stone-500 mb-2">Rating distribution</p>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={dist}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="star" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip /><Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Section title="Complaints" count={complaints.length} icon={AlertOctagon}>
        {complaints.length === 0 && <EmptyState icon={CircleCheck} text="No open complaints." />}
        {complaints.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{r.patient_name} <span className="text-stone-400 font-normal">· {r.rating}★</span></p>
                <p className="text-xs text-stone-600 mt-1">"{r.complaint}"</p>
                <p className="text-[11px] text-stone-400 mt-1">{fmtDateShort(r.request_timestamp || r.appointment_date, locale)} · {r.phone}</p>
              </div>
              <button onClick={() => resolveComplaint(r.id)} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-medium"><Check size={13} /> Resolve</button>
            </div>
          </Card>
        ))}
      </Section>
    </div>
  );
}

/* ============================== Reports Tab ============================== */

function ReportsTab({ bookings, escalations, aiCostTracking, settings, dentists = [], inboundContacts = [], waitlist = [] }) {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
  const currencySymbol = settings?.currency_symbol ?? "₹";
  const usdRate = settings?.currency_to_usd_rate || 0.012;

  const todays = bookings.filter((b) => sameDay(b.appointment_start, today));
  const week = bookings.filter((b) => new Date(b.appointment_start) >= weekAgo && new Date(b.appointment_start) <= today);
  const monthBookings = bookings.filter((b) => new Date(b.appointment_start) >= monthStart);
  const settled = bookings.filter((b) => b.status === "completed" || b.status === "no_show");
  const noShowRate = settled.length ? Math.round((settled.filter((b) => b.status === "no_show").length / settled.length) * 100) : 0;
  const monthCostUsd = aiCostTracking.filter((c) => new Date(c.timestamp) >= monthStart).reduce((s, c) => s + Number(c.estimated_cost || 0), 0);
  const todayCostUsd = aiCostTracking.filter((c) => new Date(c.timestamp) >= dayStart).reduce((s, c) => s + Number(c.estimated_cost || 0), 0);
  const monthCostLocal = monthCostUsd / usdRate;

  /* ---- Revenue (Phase 6) — only counts bookings that actually happened ---- */
  const revenueOf = (list) => list.filter((b) => b.status === "completed" || b.status === "arrived").reduce((s, b) => s + Number(b.price || 0), 0);
  const revenueToday = revenueOf(todays);
  const revenueWeek = revenueOf(week);
  const revenueMonth = revenueOf(monthBookings);
  const revenueByDentist = useMemo(() => {
    const names = [...new Set(monthBookings.map((b) => b.dentist_name).filter(Boolean))];
    return names.map((name) => ({
      dentist: name.replace(/^Dr\.?\s*/i, ""),
      revenue: monthBookings.filter((b) => b.dentist_name === name && (b.status === "completed" || b.status === "arrived")).reduce((s, b) => s + Number(b.price || 0), 0),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [monthBookings]);

  /* ---- Conversion funnel (Phase 6) — WhatsApp contacts → bookings → outcome ---- */
  const funnelWindow = weekAgo;
  const uniqueContacts = new Set(inboundContacts.filter((c) => new Date(c.timestamp) >= funnelWindow).map((c) => c.patient_phone)).size;
  const weekBookingsCreated = week.length;
  const weekCompleted = week.filter((b) => b.status === "completed" || b.status === "arrived").length;
  const weekNoShow = week.filter((b) => b.status === "no_show").length;
  const weekCancelled = week.filter((b) => b.status === "cancelled").length;
  const funnelStages = [
    { stage: "WhatsApp\ncontacts", count: uniqueContacts },
    { stage: "Bookings\ncreated", count: weekBookingsCreated },
    { stage: "Completed /\nArrived", count: weekCompleted },
    { stage: "No-show", count: weekNoShow },
    { stage: "Cancelled", count: weekCancelled },
  ];
  const conversionPct = uniqueContacts ? Math.round((weekBookingsCreated / uniqueContacts) * 100) : null;

  /* ---- Dentist utilization (Phase 6) — booked hours vs available hours this week ---- */
  const utilization = useMemo(() => {
    const openH = settings?.opening_hour ?? 9, closeH = settings?.closing_hour ?? 18;
    const lunchGap = (settings?.lunch_start_hour != null && settings?.lunch_end_hour != null) ? (settings.lunch_end_hour - settings.lunch_start_hour) : 0;
    const closedDays = settings?.closed_weekdays ?? [0];
    const workingDaysThisWeek = 7 - closedDays.length;
    const availableHoursPerDentist = Math.max(0, (closeH - openH - lunchGap) * workingDaysThisWeek);
    const active = (dentists.length ? dentists.filter((d) => d.active) : []).map((d) => d.name);
    const names = active.length ? active : [...new Set(week.map((b) => b.dentist_name).filter(Boolean))];
    return names.map((name) => {
      const bookedMinutes = week.filter((b) => b.dentist_name === name && b.status !== "cancelled")
        .reduce((s, b) => s + (new Date(b.appointment_end) - new Date(b.appointment_start)) / 60000, 0);
      const bookedHours = bookedMinutes / 60;
      return { dentist: name.replace(/^Dr\.?\s*/i, ""), pct: availableHoursPerDentist ? Math.min(100, Math.round((bookedHours / availableHoursPerDentist) * 100)) : 0 };
    });
  }, [dentists, week, settings]);

  /* ---- AI cost budget alert (Phase 6) ---- */
  const dailyBudget = settings?.ai_daily_budget_usd;
  const monthlyBudget = settings?.ai_monthly_budget_usd;
  const overDaily = dailyBudget && todayCostUsd > dailyBudget;
  const overMonthly = monthlyBudget && monthCostUsd > monthlyBudget;

  const statusBreakdown = ["confirmed", "arrived", "completed", "no_show", "cancelled"].map((s) => ({
    status: { confirmed: "Awaiting", arrived: "Arrived", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" }[s],
    count: todays.filter((b) => b.status === s).length,
  }));

  const costTrend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const total = aiCostTracking.filter((c) => dateKey(new Date(c.timestamp)) === key).reduce((s, c) => s + Number(c.estimated_cost || 0), 0);
      days.push({ day: fmtDateShort(d.toISOString(), settings?.locale), cost: Number(total.toFixed(4)) });
    }
    return days;
  }, [aiCostTracking, settings]);

  function exportCSV() {
    const rows = [["Booking ID", "Patient", "Phone", "Reason", "Dentist", "Start", "End", "Status"]];
    todays.forEach((b) => rows.push([b.booking_id, b.patient_name, b.patient_phone, b.reason_for_visit, b.dentist_name, b.appointment_start, b.appointment_end, b.status]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bookings_${dateKey(today)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Reports</h2>
        <button onClick={() => window.print()} className="flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 font-medium border border-stone-300 dark:border-stone-600 rounded-full px-3 py-1.5">
          <FileDown size={13} /> Save as PDF
        </button>
      </div>
      {(overDaily || overMonthly) && (
        <div className="bg-red-50 border border-red-300 text-red-700 text-xs rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertOctagon size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI spend over budget</p>
            {overDaily && <p>Today: ${todayCostUsd.toFixed(2)} of ${dailyBudget} daily budget.</p>}
            {overMonthly && <p>This month: ${monthCostUsd.toFixed(2)} of ${monthlyBudget} monthly budget.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today's bookings" value={todays.length} />
        <StatCard label="This week" value={week.length} />
        <StatCard label="No-show rate" value={`${noShowRate}%`} />
        <StatCard label="Pending escalations" value={escalations.length} />
        <StatCard label="On waitlist" value={waitlist.length} />
        <StatCard label="Cancelled this week" value={weekCancelled} />
      </div>

      <Card className="p-4">
        <p className="text-xs font-medium text-stone-500 mb-2">Revenue (completed / arrived visits only)</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-lg font-bold text-teal-800">{currencySymbol}{revenueToday.toLocaleString()}</p><p className="text-[11px] text-stone-500">Today</p></div>
          <div><p className="text-lg font-bold text-teal-800">{currencySymbol}{revenueWeek.toLocaleString()}</p><p className="text-[11px] text-stone-500">This week</p></div>
          <div><p className="text-lg font-bold text-teal-800">{currencySymbol}{revenueMonth.toLocaleString()}</p><p className="text-[11px] text-stone-500">This month</p></div>
        </div>
        {revenueByDentist.length > 0 && (
          <div style={{ width: "100%", height: 140 }} className="mt-3">
            <ResponsiveContainer>
              <BarChart data={revenueByDentist} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="dentist" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => [`${currencySymbol}${v}`, "Revenue (month)"]} /><Bar dataKey="revenue" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!settings?.default_prices && <p className="text-[11px] text-amber-600 mt-2">Set default prices per treatment in Settings so new AI bookings carry a price automatically.</p>}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-stone-500">Conversion funnel — last 7 days</p>
          {conversionPct != null && <span className="text-xs font-semibold text-teal-700">{conversionPct}% contact → booking</span>}
        </div>
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={funnelStages}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip /><Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-stone-400 mt-1">"WhatsApp contacts" counts unique patients who messaged in; requires `conversation_logs` realtime/select access.</p>
      </Card>

      {utilization.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-medium text-stone-500 mb-2">Dentist utilization — booked vs available hours, this week</p>
          <div className="space-y-2">
            {utilization.map((u) => (
              <div key={u.dentist}>
                <div className="flex items-center justify-between text-xs mb-0.5"><span className="text-stone-600">{u.dentist}</span><span className="text-stone-400">{u.pct}%</span></div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-teal-600" style={{ width: `${u.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-xs font-medium text-stone-500 mb-1">AI cost — last 14 days</p>
        <p className="text-2xl font-bold text-teal-800 mb-2">{currencySymbol}{monthCostLocal.toFixed(2)} <span className="text-sm font-normal text-stone-400">this month (${monthCostUsd.toFixed(4)})</span></p>
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <BarChart data={costTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip formatter={(v) => [`$${v}`, "Cost"]} /><Bar dataKey="cost" fill="#0f766e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-stone-500">Today's status breakdown</p>
          <button onClick={exportCSV} className="flex items-center gap-1 text-xs text-teal-700 font-medium"><Download size={13} /> Export CSV</button>
        </div>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip /><Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value }) {
  return <Card className="p-4"><p className="text-xl font-bold text-teal-800 dark:text-teal-400">{value}</p><p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</p></Card>;
}

/* ============================== Settings Tab ============================== */

function SettingsTab({ clinicSettings, saveClinicSettings, dentists, addDentist, updateDentist, deleteDentist, documents, saveDocument, auditLog }) {
  const [form, setForm] = useState(clinicSettings || {});
  const [savedFlash, setSavedFlash] = useState(false);
  const [configForm, setConfigForm] = useState(clinicSettings || {});
  const [configSavedFlash, setConfigSavedFlash] = useState(false);
  const [kbOpenId, setKbOpenId] = useState(null);
  const [kbDraft, setKbDraft] = useState({});
  const [kbSavedId, setKbSavedId] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [dentistDrafts, setDentistDrafts] = useState({});

  useEffect(() => { setForm(clinicSettings || {}); setConfigForm(clinicSettings || {}); }, [clinicSettings]);

  function save() { saveClinicSettings({ ...clinicSettings, ...form }); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); }
  function saveConfig() { saveClinicSettings({ ...clinicSettings, ...configForm }); setConfigSavedFlash(true); setTimeout(() => setConfigSavedFlash(false), 1500); }
  function saveKb(doc) { const content = kbDraft[doc.id] ?? doc.content; saveDocument({ ...doc, content }); setKbSavedId(doc.id); setTimeout(() => setKbSavedId(null), 1500); }

  function dentistField(d, field) { return dentistDrafts[d.id]?.[field] ?? d[field]; }
  function setDentistField(d, field, value) { setDentistDrafts((s) => ({ ...s, [d.id]: { ...s[d.id], [field]: value } })); }
  function saveDentistRow(d) {
    const draft = dentistDrafts[d.id] || {};
    updateDentist({ ...d, ...draft });
    setDentistDrafts((s) => { const n = { ...s }; delete n[d.id]; return n; });
  }
  function toggleClosedDay(day) {
    const current = configForm.closed_weekdays || [];
    const next = current.includes(day) ? current.filter((x) => x !== day) : [...current, day].sort();
    setConfigForm({ ...configForm, closed_weekdays: next });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-1.5"><SlidersHorizontal size={14} /> Clinic Configuration</h2>
        <p className="text-[11px] text-stone-400 mb-3">These rules drive every booking check in the app — hours, lunch, slot size, notice, currency. Change them here any time, no code changes or redeploys needed.</p>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-stone-600 mb-1.5">Dentists</p>
            <div className="space-y-1.5">
              {dentists.map((d) => (
                <div key={d.id} className="flex items-center gap-1.5">
                  <input value={dentistField(d, "name")} onChange={(e) => setDentistField(d, "name", e.target.value)}
                    className="flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" placeholder="Name" />
                  <input value={dentistField(d, "specialty") || ""} onChange={(e) => setDentistField(d, "specialty", e.target.value)}
                    className="flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" placeholder="Specialty" />
                  <label className="flex items-center gap-1 text-[11px] text-stone-500 whitespace-nowrap">
                    <input type="checkbox" checked={!!dentistField(d, "active")} onChange={(e) => setDentistField(d, "active", e.target.checked)} /> Active
                  </label>
                  <button onClick={() => saveDentistRow(d)} className="p-1.5 rounded-lg bg-teal-700 text-white"><Check size={13} /></button>
                  <button onClick={() => deleteDentist(d)} className="p-1.5 rounded-lg bg-red-100 text-red-700"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button onClick={addDentist} className="mt-2 flex items-center gap-1 text-xs text-teal-700 font-medium"><Plus size={13} /> Add dentist</button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
            <div><label className="text-xs text-stone-500">Opening hour (24h)</label>
              <input type="number" min="0" max="23" value={configForm.opening_hour ?? 9} onChange={(e) => setConfigForm({ ...configForm, opening_hour: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            <div><label className="text-xs text-stone-500">Closing hour (24h)</label>
              <input type="number" min="0" max="23" value={configForm.closing_hour ?? 18} onChange={(e) => setConfigForm({ ...configForm, closing_hour: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
          </div>

          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input type="checkbox" checked={configForm.lunch_start_hour != null} onChange={(e) => setConfigForm({ ...configForm, lunch_start_hour: e.target.checked ? 13 : null, lunch_end_hour: e.target.checked ? 14 : null })} />
            Has a lunch break
          </label>
          {configForm.lunch_start_hour != null && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-stone-500">Lunch start</label>
                <input type="number" min="0" max="23" value={configForm.lunch_start_hour} onChange={(e) => setConfigForm({ ...configForm, lunch_start_hour: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
              <div><label className="text-xs text-stone-500">Lunch end</label>
                <input type="number" min="0" max="23" value={configForm.lunch_end_hour} onChange={(e) => setConfigForm({ ...configForm, lunch_end_hour: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-stone-500">Slot size (min)</label>
              <input type="number" value={configForm.slot_interval_minutes ?? 30} onChange={(e) => setConfigForm({ ...configForm, slot_interval_minutes: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            <div><label className="text-xs text-stone-500">Min notice (min)</label>
              <input type="number" value={configForm.min_notice_minutes ?? 60} onChange={(e) => setConfigForm({ ...configForm, min_notice_minutes: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            <div><label className="text-xs text-stone-500">Max duration (min)</label>
              <input type="number" value={configForm.max_duration_minutes ?? 180} onChange={(e) => setConfigForm({ ...configForm, max_duration_minutes: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
          </div>

          <div>
            <label className="text-xs text-stone-500 block mb-1">Closed days</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_LABELS.map((label, day) => (
                <button key={day} onClick={() => toggleClosedDay(day)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${(configForm.closed_weekdays || []).includes(day) ? "bg-red-100 text-red-700 border-red-300" : "bg-white text-stone-500 border-stone-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-stone-500">Currency symbol</label>
              <input value={configForm.currency_symbol ?? "₹"} onChange={(e) => setConfigForm({ ...configForm, currency_symbol: e.target.value })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            <div><label className="text-xs text-stone-500">Local-to-USD rate</label>
              <input type="number" step="0.001" value={configForm.currency_to_usd_rate ?? 0.012} onChange={(e) => setConfigForm({ ...configForm, currency_to_usd_rate: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-600 mb-1.5">AI cost budget alerts</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-stone-500">Daily budget (USD)</label>
                <input type="number" min="0" step="0.5" value={configForm.ai_daily_budget_usd ?? ""} onChange={(e) => setConfigForm({ ...configForm, ai_daily_budget_usd: e.target.value === "" ? null : Number(e.target.value) })} placeholder="e.g. 2" className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
              <div><label className="text-xs text-stone-500">Monthly budget (USD)</label>
                <input type="number" min="0" step="1" value={configForm.ai_monthly_budget_usd ?? ""} onChange={(e) => setConfigForm({ ...configForm, ai_monthly_budget_usd: e.target.value === "" ? null : Number(e.target.value) })} placeholder="e.g. 40" className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" /></div>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Reports shows a banner if Claude spend crosses either threshold.</p>
          </div>

          <label className="flex items-start gap-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
            <input type="checkbox" checked={configForm.shared_calendar !== false} onChange={(e) => setConfigForm({ ...configForm, shared_calendar: e.target.checked })} className="mt-0.5" />
            <span>
              Shared clinic calendar<br />
              <span className="text-[11px] text-stone-400">On (default): all dentists share one calendar — a slot can only be booked once, for anyone. Off: each dentist has their own calendar — two different dentists can be booked at the same time.</span>
            </span>
          </label>

          <div>
            <label className="text-xs text-stone-500">Patient recall reminder (days since last visit)</label>
            <input type="number" min="1" value={configForm.recall_interval_days ?? 180} onChange={(e) => setConfigForm({ ...configForm, recall_interval_days: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mt-1" />
            <p className="text-[11px] text-stone-400 mt-1">Patients past this with no upcoming booking get flagged "Recall due" in the Patients tab.</p>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-600 mb-1.5">Default prices by treatment</p>
            <p className="text-[11px] text-stone-400 mb-1.5">Used to suggest a price on new walk-in bookings and to power the Revenue report. Reason text must match what the AI receptionist logs (case-sensitive).</p>
            <div className="space-y-1.5">
              {Object.entries(configForm.default_prices || {}).map(([reason, price], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input value={reason} placeholder="Treatment / reason"
                    onChange={(e) => {
                      const entries = Object.entries(configForm.default_prices || {});
                      entries[i] = [e.target.value, price];
                      setConfigForm({ ...configForm, default_prices: Object.fromEntries(entries) });
                    }} className="flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                  <input type="number" min="0" value={price} placeholder="Price"
                    onChange={(e) => {
                      const entries = Object.entries(configForm.default_prices || {});
                      entries[i] = [reason, Number(e.target.value)];
                      setConfigForm({ ...configForm, default_prices: Object.fromEntries(entries) });
                    }} className="w-24 border border-stone-300 rounded-lg px-2 py-1.5 text-xs" />
                  <button onClick={() => {
                    const entries = Object.entries(configForm.default_prices || {}).filter((_, x) => x !== i);
                    setConfigForm({ ...configForm, default_prices: Object.fromEntries(entries) });
                  }} className="p-1.5 rounded-lg bg-red-100 text-red-700"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setConfigForm({ ...configForm, default_prices: { ...(configForm.default_prices || {}), "": 0 } })} className="mt-1.5 flex items-center gap-1 text-xs text-teal-700 font-medium"><Plus size={13} /> Add treatment price</button>
          </div>

          <button onClick={saveConfig} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium">{configSavedFlash ? "Saved ✓" : "Save configuration"}</button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Clinic info</h2>
        <div className="space-y-2">
          {[["clinic_name", "Clinic name"], ["clinic_phone", "Clinic phone"], ["admin_email", "Admin email"], ["staff_email", "Staff email"], ["admin_phone", "Admin WhatsApp number"], ["review_url", "Google review link"]].map(([key, label]) => (
            <div key={key}><label className="text-xs text-stone-500">{label}</label>
              <input value={form?.[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          ))}
          <div><label className="text-xs text-stone-500">Reminder delay before review nudge (hours)</label>
            <input type="number" value={form?.reminder_delay_hours || ""} onChange={(e) => setForm({ ...form, reminder_delay_hours: Number(e.target.value) })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mt-1" /></div>
          <div><label className="text-xs text-stone-500">Reminder-resend webhook URL (n8n)</label>
            <input value={form?.reminder_resend_webhook_url || ""} onChange={(e) => setForm({ ...form, reminder_resend_webhook_url: e.target.value })} placeholder="https://your-n8n-instance/webhook/resend-reminder" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mt-1" />
            <p className="text-[11px] text-stone-400 mt-1">Needed for the "Resend" button on failed reminders in Alerts.</p></div>
          <button onClick={save} className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium mt-1">{savedFlash ? "Saved ✓" : "Save clinic info"}</button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-1.5"><BookOpen size={14} /> Knowledge base</h2>
        <p className="text-[11px] text-stone-400 mb-3">Edits save as plain text only. Re-run the n8n "Knowledge Base Setup Trigger" workflow afterward so the FAQ agent picks up the change.</p>
        <div className="space-y-2">
          {documents.map((doc) => {
            const isOpen = kbOpenId === doc.id;
            return (
              <div key={doc.id} className="border border-stone-200 rounded-lg">
                <button onClick={() => setKbOpenId(isOpen ? null : doc.id)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                  <span className="text-xs text-stone-600 truncate pr-2">{(doc.content || "").split("\n")[0] || `Document ${doc.id}`}</span>
                  {isOpen ? <ChevronUp size={14} className="text-stone-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-stone-400 flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    <textarea defaultValue={doc.content} onChange={(e) => setKbDraft((d) => ({ ...d, [doc.id]: e.target.value }))} rows={8} className="w-full border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-mono" />
                    <button onClick={() => saveKb(doc)} className="w-full bg-teal-700 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1"><Edit3 size={12} /> {kbSavedId === doc.id ? "Saved ✓" : "Save document"}</button>
                  </div>
                )}
              </div>
            );
          })}
          {documents.length === 0 && <p className="text-xs text-stone-400">No knowledge-base documents found.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <button onClick={() => setActivityOpen((v) => !v)} className="w-full flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><History size={14} /> Recent staff activity</h2>
          {activityOpen ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
        </button>
        {activityOpen && (
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {auditLog.length === 0 && <p className="text-xs text-stone-400">No activity logged yet this session.</p>}
            {auditLog.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
                <span className="text-stone-600">{a.actor ? `${a.actor} — ` : ""}{a.action.replace(/_/g, " ")}{a.detail ? ` — ${a.detail}` : ""}</span>
                <span className="text-stone-400 flex-shrink-0 pl-2">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

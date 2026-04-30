import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Search, CalendarDays, HelpCircle, LogOut,
  Bell, Sparkles, Network, ArrowLeft, CheckCircle2, AlertTriangle,
  Clock, Calendar, X, Loader2, RefreshCw, ChevronRight, ChevronDown,
  BookOpen, Phone, Mail, MapPin,
} from "lucide-react";
import SearchBox from "../components/SearchBox";
import AssetCard from "../components/AssetCard";
import BookingConfirmation from "./BookingConfirmation";
import { api } from "../api/client";
import { HillingOneIcon, HillingOneWordmark } from "../components/HillingOneLogo";

const STATE_META = {
  confirmed:    { label: "Confirmed",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  held:         { label: "Holding",        cls: "bg-amber-100 text-amber-700 border-amber-200" },
  swap_pending: { label: "Swap Request",   cls: "bg-orange-100 text-orange-700 border-orange-200" },
  completed:    { label: "Completed",      cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onNavigate, onLogout }) {
  const nav = [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { key: "book",      icon: Search,          label: "Book a Space" },
    { key: "bookings",  icon: CalendarDays,    label: "My Bookings" },
    { key: "help",      icon: HelpCircle,      label: "Help & Support" },
  ];

  return (
    <aside className="w-60 h-full bg-[#1D4442] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <HillingOneIcon size={34} variant="light" />
          <HillingOneWordmark variant="light" size="sm" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active === key
                ? "bg-[#EAB830] text-[#1D4442] shadow-sm font-semibold"
                : "text-white/65 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, action, notifications, onClearNotification, user }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = notifications.length;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="h-14 flex items-center px-6 border-b border-gray-200 bg-white flex-shrink-0 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {action}

        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <Bell size={17} className="text-gray-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Reminders</span>
                <button onClick={() => setShowNotifs(false)}><X size={12} className="text-gray-400" /></button>
              </div>
              {unread === 0 ? (
                <div className="p-5 text-center text-sm text-gray-500">No pending reminders</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-4 py-3 hover:bg-gray-50 group flex items-start gap-2">
                      <Calendar size={13} className="text-[#2A5C5A] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.remind_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => onClearNotification(n.id)} className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition">
                        <X size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* User pill */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-[#EAB830] flex items-center justify-center text-[#1D4442] text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</div>
              <div className="text-[10px] text-gray-500 capitalize">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard home page ───────────────────────────────────────────────────────
function DashboardHome({ user, myBookings, bookingsLoading, onNavigate, onBookingAction }) {
  const upcoming = myBookings.filter((b) => b.state === "confirmed" || b.state === "swap_pending");
  const swapPending = myBookings.filter((b) => b.state === "swap_pending");
  const next = [...upcoming].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];

  return (
    <div className="p-8 space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name.split(" ")[0]}
        </h2>
        <p className="text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Swap alert banner */}
      {swapPending.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-orange-900">Action required: Swap request</div>
            <p className="text-sm text-orange-800 mt-0.5">
              Atrium has found an alternative venue for {swapPending.length === 1 ? "one of your bookings" : `${swapPending.length} bookings`}. Review and accept or decline.
            </p>
            <button
              onClick={() => onNavigate("bookings")}
              className="mt-2 text-sm font-semibold text-orange-700 underline-offset-2 hover:underline"
            >
              View swap request →
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={<CalendarDays size={20} className="text-[#2A5C5A]" />}
          label="Active bookings"
          value={upcoming.length}
          sub={upcoming.length === 0 ? "Nothing booked yet" : `${upcoming.length} upcoming`}
          bg="bg-white"
          accent="#2A5C5A"
        />
        <StatCard
          icon={<Clock size={20} className="text-[#2A5C5A]" />}
          label="Next booking"
          value={next ? new Date(next.start_time).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "None scheduled"}
          sub={next ? next.asset?.name : "Make your first booking below"}
          bg="bg-white"
          accent="#EAB830"
        />
      </div>

      {/* Quick Book */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #2A5C5A 0%, #3D7573 60%, #1D4442 100%)" }}>
        {/* Decorative dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Gold accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#EAB830] rounded-t-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-[#EAB830] rounded-full flex items-center justify-center">
                <Sparkles size={12} className="text-[#1D4442]" />
              </div>
              <span className="text-xs uppercase tracking-widest text-white/70 font-semibold">AI-Powered Search</span>
            </div>
            <h3 className="text-xl font-bold mb-1">Find a Space</h3>
            <p className="text-sm text-white/70">
              Describe what you need in plain English. Atrium searches the entire borough instantly.
            </p>
          </div>
          <button
            onClick={() => onNavigate("book")}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#EAB830] text-[#1D4442] rounded-xl text-sm font-bold hover:bg-[#F0C840] transition shadow-sm"
          >
            Book a Space
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent bookings */}
      {myBookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Bookings</h3>
            <button
              onClick={() => onNavigate("bookings")}
              className="text-sm text-[#2A5C5A] font-medium hover:underline"
            >
              View all →
            </button>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Date", "Time", "Space", "Purpose", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {myBookings.slice(0, 5).map((b) => (
                    <BookingRow key={b.id} booking={b} onAction={onBookingAction} compact />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My Bookings full page ─────────────────────────────────────────────────────
function MyBookingsPage({ myBookings, bookingsLoading, onRefresh, onBookingAction, onNavigate }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? myBookings
    : myBookings.filter((b) => b.state === filter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Showing {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={bookingsLoading}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#2A5C5A] transition border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            <RefreshCw size={13} className={bookingsLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => onNavigate("book")}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-semibold hover:bg-[#2A5C5A]/90 transition"
          >
            + Book a Space
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {["all", "confirmed", "swap_pending", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === f
                ? "bg-[#2A5C5A] text-white border-[#2A5C5A]"
                : "border-gray-200 text-gray-600 hover:border-[#2A5C5A]"
            }`}
          >
            {f === "all" ? "All" : f === "swap_pending" ? "Swap Request" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {myBookings.length === 0 && !bookingsLoading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CalendarDays size={32} className="text-gray-300 mx-auto mb-3" />
          <div className="text-gray-600 font-medium">No bookings yet</div>
          <div className="text-sm text-gray-500 mt-1">Book a council space to get started.</div>
          <button
            onClick={() => onNavigate("book")}
            className="mt-4 px-5 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-semibold hover:bg-[#2A5C5A]/90 transition"
          >
            Find a Space
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Date", "Time", "Space", "Purpose", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No bookings in this category.</td></tr>
                ) : (
                  filtered.map((b) => (
                    <BookingRow key={b.id} booking={b} onAction={onBookingAction} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Booking row ───────────────────────────────────────────────────────────────
function BookingRow({ booking, onAction, compact }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const meta = STATE_META[booking.state] || { label: booking.state, cls: "bg-gray-100 text-gray-600 border-gray-200" };

  const act = async (action) => {
    setActing(true);
    await onAction(booking, action);
    setActing(false);
  };

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${booking.state === "swap_pending" ? "bg-orange-50/40" : ""}`}>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-medium text-gray-900 text-xs">
            {start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </div>
          {!compact && <div className="text-[10px] text-gray-400 font-mono">{booking.reference}</div>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
          {start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 text-xs">{booking.asset?.name || "—"}</div>
          <div className="text-[10px] text-gray-400">{booking.asset?.ward}</div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">
          {booking.purpose || "—"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${meta.cls}`}>
            {booking.state === "swap_pending" && <AlertTriangle size={9} />}
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {booking.state === "swap_pending" && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="px-2.5 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition"
              >
                Review
              </button>
            )}
            {booking.state === "confirmed" && (
              <>
                <a
                  href={api.icsUrl(booking.id)}
                  download
                  className="p-1.5 border border-gray-200 rounded hover:border-[#2A5C5A] hover:bg-[#EAF2F1] transition"
                  title="Add to calendar"
                >
                  <Calendar size={12} className="text-[#2A5C5A]" />
                </a>
                <button
                  onClick={() => act("cancel")}
                  disabled={acting}
                  className="p-1.5 border border-gray-200 rounded hover:border-red-300 hover:bg-red-50 transition"
                  title="Cancel booking"
                >
                  <X size={12} className="text-red-500" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Swap expanded row */}
      {expanded && booking.state === "swap_pending" && (
        <tr className="bg-orange-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="max-w-2xl">
              <div className="font-semibold text-orange-900 mb-1 flex items-center gap-1.5 text-sm">
                <Bell size={13} /> Message from Atrium
              </div>
              <p className="text-sm text-orange-800 mb-3 leading-relaxed">{booking.swap_message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => act("accept_swap")}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {acting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Accept swap
                </button>
                <button
                  onClick={() => act("decline_swap")}
                  disabled={acting}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition text-gray-700"
                >
                  Decline — keep my booking
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Help page ────────────────────────────────────────────────────────────────
function HelpPage() {
  const [open, setOpen] = useState(0);
  const faqs = [
    {
      q: "How do I book a space?",
      a: "Click 'Book a Space', pick your date and time, then describe what you need in plain English — for example 'a room for 20 people with a kitchen'. HillingOne finds the best match instantly. No forms, no phone calls.",
    },
    {
      q: "Are my bookings protected?",
      a: "Yes. Once confirmed, only you can cancel your booking. If the council ever needs to cancel it, you'll receive a notification, an alternative venue offer, and a 20% credit automatically.",
    },
    {
      q: "What is a swap request?",
      a: "Occasionally HillingOne may suggest an equivalent alternative space. You can always say no — your original booking stays confirmed if you decline.",
    },
    {
      q: "How do I add my booking to my calendar?",
      a: "On any confirmed booking, tap the calendar icon. It downloads a file that works with Google Calendar, Outlook, Apple Calendar, and all major apps — with reminders built in.",
    },
    {
      q: "Can I search by voice or upload a photo?",
      a: "Yes. Tap the microphone to speak your request in English, Urdu, Punjabi, Polish, Arabic, Somali, Romanian, or Hindi. Or tap the camera icon to upload a handwritten note or photo describing what you need.",
    },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Help & Support</h2>
      <p className="text-sm text-gray-500 mb-5">Everything you need to know</p>

      <div className="space-y-2 mb-5">
        {faqs.map(({ q, a }, i) => (
          <div key={i} className={`bg-white border rounded-xl overflow-hidden transition-all ${open === i ? "border-[#2A5C5A]/40 shadow-sm" : "border-gray-200"}`}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className={`text-sm font-semibold ${open === i ? "text-[#2A5C5A]" : "text-gray-900"}`}>{q}</span>
              <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180 text-[#2A5C5A]" : ""}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                {a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#1D4442] rounded-xl p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="text-white font-bold text-sm mb-3">Need more help?</div>
          <div className="flex items-center gap-2 text-white/75 text-sm mb-2">
            <Phone size={13} /> 01895 556000
          </div>
          <div className="flex items-center gap-2 text-white/75 text-sm">
            <Mail size={13} /> bookings@hillingdon.gov.uk
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-2 text-white/45 text-xs">
            <MapPin size={12} /> Mon–Fri, 9am–5pm
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, bg, accent }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-100 relative overflow-hidden`}>
      {accent && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: accent }} />}
      <div className={`flex items-center gap-2 mb-2 ${accent ? "pl-3" : ""}`}>{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
      <div className={`text-2xl font-bold text-gray-900 ${accent ? "pl-3" : ""}`}>{value}</div>
      {sub && <div className={`text-xs text-gray-500 mt-0.5 truncate ${accent ? "pl-3" : ""}`}>{sub}</div>}
    </div>
  );
}

// ─── Date/time picker for booking ────────────────────────────────────────────
function DateTimePicker({ date, setDate, time, setTime, duration, setDuration }) {
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const fmtDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const times = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
  const fmtTime = (t) => { const [h, m] = t.split(":"); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "pm" : "am"}`; };
  const durations = [{ v: "1", label: "1 hour" }, { v: "2", label: "2 hours" }, { v: "3", label: "3 hours" }, { v: "4", label: "Half day (4h)" }, { v: "8", label: "Full day (8h)" }];

  const selectCls = "w-full px-3 py-2.5 text-sm border-2 border-[#2A5C5A]/25 rounded-xl bg-white text-gray-900 font-medium focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/15 transition appearance-none cursor-pointer";

  return (
    <div className="rounded-2xl mb-4 overflow-hidden border-2 border-[#2A5C5A]/30 shadow-sm">
      {/* Header stripe */}
      <div className="bg-[#2A5C5A] px-5 py-3 flex items-center gap-2">
        <Calendar size={15} className="text-white/80" />
        <span className="text-sm font-bold text-white uppercase tracking-wide">When do you need it?</span>
      </div>
      {/* Selects */}
      <div className="bg-white px-5 py-4 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#2A5C5A] mb-1.5 uppercase tracking-wide">Date</label>
          <select value={date} onChange={(e) => setDate(e.target.value)} className={selectCls}>
            <option value="">Any date</option>
            {dates.map((d, i) => (
              <option key={i} value={d.toISOString().split("T")[0]}>
                {i === 0 ? "Today" : i === 1 ? "Tomorrow" : fmtDate(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2A5C5A] mb-1.5 uppercase tracking-wide">Start time</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className={selectCls}>
            <option value="">Any time</option>
            {times.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#2A5C5A] mb-1.5 uppercase tracking-wide">Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className={selectCls}>
            {durations.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Book a space (full flow) ─────────────────────────────────────────────────
function BookASpace({ user, onConfirmed }) {
  const [stage, setStage] = useState("search");
  const [intent, setIntent] = useState(null);
  const [matches, setMatches] = useState([]);
  const [searchWindow, setSearchWindow] = useState(null);
  const [holding, setHolding] = useState(false);
  const [holdBooking, setHoldBooking] = useState(null);
  const [holdAsset, setHoldAsset] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [encouragement, setEncouragement] = useState(null);
  const [remindersCount, setRemindersCount] = useState(0);
  const [error, setError] = useState(null);
  const [originalQuery, setOriginalQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("2");
  const replyRef = useRef(null);

  const reset = () => {
    setStage("search"); setIntent(null); setMatches([]);
    setHoldBooking(null); setHoldAsset(null); setConfirmed(null);
    setError(null); setOriginalQuery(""); setReplyText("");
  };

  const buildFullQuery = (baseQuery) => {
    if (!baseQuery.trim()) return baseQuery;
    const parts = [baseQuery.trim()];
    if (bookingDate) {
      const d = new Date(bookingDate);
      parts.push(`on ${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`);
    }
    if (bookingTime) {
      const [h, m] = bookingTime.split(":");
      const hr = parseInt(h);
      parts.push(`at ${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "pm" : "am"}`);
    }
    if (bookingDuration) {
      parts.push(`for ${bookingDuration} hour${bookingDuration === "1" ? "" : "s"}`);
    }
    return parts.join(" ");
  };

  const handleSearch = async (query) => {
    const fullQuery = buildFullQuery(query);
    setError(null); setStage("loading"); setOriginalQuery(fullQuery); setReplyText("");
    try {
      const res = await api.search(fullQuery, user.id);
      setIntent(res.intent); setMatches(res.matches); setSearchWindow(res.search_window); setStage("results");
      if (res.intent?.follow_up_question) setTimeout(() => replyRef.current?.focus(), 100);
    } catch (err) { setError(err.message); setStage("search"); }
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    handleSearch(`${originalQuery}. ${replyText.trim()}`);
  };

  const handleBook = async (asset) => {
    setHolding(true); setHoldAsset(asset); setError(null);
    try {
      const b = await api.hold({ asset_id: asset.id, user_id: user.id, start_time: searchWindow.start, end_time: searchWindow.end, purpose: intent?.purpose_summary || "Booking via HillingOne", attendee_count: intent?.capacity || null });
      setHoldBooking(b); setStage("hold");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("booking_window_exceeded")) {
        const days = msg.split(":")[1] || "7";
        setError(`You can book up to ${days} days in advance. Contact the council for earlier bookings.`);
      } else if (msg.includes("slot_unavailable")) {
        setError("This slot was just taken. Please choose a different space or time.");
      } else {
        setError(msg.replace(/^\d+:\s*/, ""));
      }
    } finally { setHolding(false); }
  };

  const handleConfirm = async () => {
    try {
      const res = await api.confirm(holdBooking.id, user.id, true);
      setConfirmed(res); setEncouragement(res.encouragement || null); setRemindersCount(res.reminders_scheduled || 0); setStage("confirmed");
      onConfirmed?.();
    } catch (err) { setError(err.message); }
  };

  const fmtWindow = (w) => {
    if (!w?.start) return null;
    const s = new Date(w.start), e = new Date(w.end);
    return {
      date: s.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
      time: `${s.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    };
  };

  if (stage === "loading") return (
    <div className="flex flex-col items-center justify-center py-32 gap-5">
      <div className="w-14 h-14 bg-[#EAF2F1] rounded-2xl flex items-center justify-center">
        <Loader2 size={28} className="text-[#2A5C5A] animate-spin" />
      </div>
      <div className="text-center">
        <div className="font-semibold text-gray-900 mb-1">Finding the best spaces for you…</div>
        <p className="text-sm text-gray-500">Searching 25 Hillingdon venues in real time</p>
      </div>
    </div>
  );

  if (stage === "results") {
    const win = fmtWindow(searchWindow);
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2A5C5A] mb-5 transition">
          <ArrowLeft size={14} /> Start over
        </button>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={14} className="flex-shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
          </div>
        )}

        {/* Booking window banner */}
        {win && (
          <div className="bg-[#1D4442] text-white rounded-xl px-5 py-3 mb-4 flex items-center gap-3">
            <Calendar size={16} className="text-[#EAB830] flex-shrink-0" />
            <div>
              <div className="text-xs text-white/60 uppercase tracking-wide">Your booking is for</div>
              <div className="font-semibold text-sm">{win.date} · {win.time}</div>
            </div>
          </div>
        )}

        {intent?.extracted_summary && (
          <div className="bg-[#EAF2F1] border border-[#2A5C5A]/20 rounded-xl p-3 mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[#2A5C5A] flex-shrink-0" />
            <p className="text-sm text-gray-700">{intent.extracted_summary}</p>
          </div>
        )}

        {intent?.follow_up_question && (
          <div className="bg-white border border-[#2A5C5A]/30 rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles size={14} className="text-[#2A5C5A] flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-gray-900">{intent.follow_up_question}</p>
            </div>
            <div className="flex gap-2">
              <input
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                placeholder="Type your answer…"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#2A5C5A] transition"
              />
              <button onClick={handleReply} disabled={!replyText.trim()} className="px-4 py-2 bg-[#2A5C5A] text-white text-sm font-medium rounded-lg hover:bg-[#2A5C5A]/90 disabled:opacity-40 transition">
                Search
              </button>
            </div>
          </div>
        )}

        {matches.length === 0 && !intent?.follow_up_question ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <MapPin size={28} className="text-gray-300 mx-auto mb-3" />
            <div className="font-medium text-gray-600 mb-1">No spaces found</div>
            <div className="text-sm text-gray-400 mb-4">Try a different date, time, or description.</div>
            <button onClick={reset} className="px-4 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-medium">Search again</button>
          </div>
        ) : matches.length > 0 ? (
          <>
            <div className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">{matches.length} space{matches.length !== 1 ? "s" : ""} ranked by best fit</div>
            <div className="space-y-3">{matches.map((m) => <AssetCard key={m.asset_id} match={m} onBook={handleBook} booking={holding && holdAsset?.id === m.asset?.id} disabled={holding} />)}</div>
          </>
        ) : null}
      </div>
    );
  }

  if (stage === "hold") return (
    <div className="p-6 max-w-xl mx-auto">
      <HoldScreen booking={holdBooking} asset={holdAsset} onConfirm={handleConfirm} onCancel={reset} error={error} searchWindow={searchWindow} />
    </div>
  );

  if (stage === "confirmed") return (
    <div className="p-6">
      <BookingConfirmation booking={confirmed} asset={holdAsset} onBack={() => { reset(); onConfirmed?.(); }} encouragement={encouragement} remindersScheduled={remindersCount} />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
        </div>
      )}
      <div className="mb-2">
        <h2 className="text-xl font-bold text-gray-900">Find a Space</h2>
        <p className="text-sm text-gray-500 mt-0.5">Pick your date and time, then describe what you need.</p>
      </div>
      <div className="mt-4">
        <DateTimePicker date={bookingDate} setDate={setBookingDate} time={bookingTime} setTime={setBookingTime} duration={bookingDuration} setDuration={setBookingDuration} />
        <SearchBox onSearch={handleSearch} loading={holding} compact />
      </div>
    </div>
  );
}

// ─── Hold screen ──────────────────────────────────────────────────────────────
function HoldScreen({ booking, asset, onConfirm, onCancel, error, searchWindow }) {
  const heldUntil = new Date(booking.held_until).getTime();
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.round((heldUntil - Date.now()) / 1000)));
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.round((heldUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [heldUntil]);

  const HOLD_SECS = 300;
  const expired = secondsLeft === 0;
  const progress = Math.min(100, (secondsLeft / HOLD_SECS) * 100);
  const minsLeft = Math.floor(secondsLeft / 60);
  const secsLeft = secondsLeft % 60;
  const timeDisplay = secondsLeft >= 60
    ? `${minsLeft}:${String(secsLeft).padStart(2, "0")}`
    : `${secondsLeft}s`;

  const doConfirm = async () => { setConfirming(true); await onConfirm(); setConfirming(false); };

  const win = searchWindow?.start ? (() => {
    const s = new Date(searchWindow.start), e = new Date(searchWindow.end);
    return {
      date: s.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: `${s.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    };
  })() : null;

  return (
    <div className="space-y-4">
      {/* Booking summary card */}
      <div className="bg-[#1D4442] rounded-2xl p-5 text-white">
        <div className="text-xs text-white/60 uppercase tracking-wide font-medium mb-3">You're booking</div>
        <div className="font-bold text-lg leading-snug mb-1">{asset.name}</div>
        {asset.ward && <div className="text-sm text-white/60 mb-3">{asset.ward}, Hillingdon</div>}
        {win && (
          <div className="bg-white/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={13} className="text-[#EAB830] flex-shrink-0" />
              <span className="font-semibold">{win.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={13} className="text-[#EAB830] flex-shrink-0" />
              <span>{win.time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Timer card */}
      <div className={`bg-white border-2 rounded-2xl p-5 ${expired ? "border-red-300" : "border-amber-200"}`}>
        {expired ? (
          <div className="text-center">
            <AlertTriangle size={28} className="text-red-500 mx-auto mb-2" />
            <div className="font-bold text-gray-900 mb-1">Hold expired</div>
            <p className="text-sm text-gray-500">This slot is no longer reserved. Search again to rebook.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Space reserved for you</div>
                <div className="text-xs text-gray-500 mt-0.5">Confirm before the timer runs out</div>
              </div>
              <div className="text-2xl font-bold text-amber-700 tabular-nums">{timeDisplay}</div>
            </div>
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress < 20 ? "bg-red-500" : "bg-amber-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition text-gray-700">
          {expired ? "Back to search" : "Cancel"}
        </button>
        {!expired && (
          <button
            onClick={doConfirm}
            disabled={confirming}
            className="flex-1 px-6 py-3 bg-[#2A5C5A] text-white rounded-xl text-sm font-bold hover:bg-[#2A5C5A]/90 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirm booking
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Root resident view ───────────────────────────────────────────────────────
export default function ResidentView({ user, onLogout, notifications, onClearNotification, onNotificationsRefresh }) {
  const [page, setPage] = useState("dashboard");
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try { setMyBookings(await api.listBookings(user.id)); } catch { /* silent */ } finally { setBookingsLoading(false); }
  }, [user.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleBookingAction = async (booking, action) => {
    if (action === "cancel") {
      if (!confirm(`Cancel booking at ${booking.asset?.name}? This cannot be undone.`)) return;
      await api.cancelBooking(booking.id, user.id).catch(() => {});
    } else if (action === "accept_swap") {
      await api.acceptSwap(booking.id, user.id).catch(() => {});
      onNotificationsRefresh?.();
    } else if (action === "decline_swap") {
      await api.declineSwap(booking.id, user.id).catch(() => {});
    }
    await loadBookings();
  };

  const PAGE_TITLES = {
    dashboard: { title: "Dashboard", subtitle: "Manage your council space bookings" },
    book:      { title: "Book a Space", subtitle: "Describe what you need and Atrium will find it" },
    bookings:  { title: "My Bookings", subtitle: "Your active and past council bookings" },
    help:      { title: "Help & Support", subtitle: "Frequently asked questions and contact info" },
  };
  const { title, subtitle } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar active={page} onNavigate={setPage} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          title={title}
          subtitle={subtitle}
          notifications={notifications}
          onClearNotification={onClearNotification}
          user={user}
          action={
            page !== "book" ? (
              <button
                onClick={() => setPage("book")}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-bold hover:bg-[#2A5C5A]/90 transition"
              >
                <Search size={14} /> Quick Book
              </button>
            ) : null
          }
        />

        <main className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <DashboardHome
              user={user}
              myBookings={myBookings}
              bookingsLoading={bookingsLoading}
              onNavigate={setPage}
              onBookingAction={handleBookingAction}
            />
          )}
          {page === "book" && (
            <BookASpace
              user={user}
              onConfirmed={() => { loadBookings(); onNotificationsRefresh?.(); }}
            />
          )}
          {page === "bookings" && (
            <MyBookingsPage
              myBookings={myBookings}
              bookingsLoading={bookingsLoading}
              onRefresh={loadBookings}
              onBookingAction={handleBookingAction}
              onNavigate={setPage}
            />
          )}
          {page === "help" && <HelpPage />}
        </main>
      </div>
    </div>
  );
}

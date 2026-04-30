import { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard, CalendarDays, Bot, TrendingUp, LogOut,
  Bell, Activity, MapPin, AlertTriangle, Clock, ShieldCheck,
  RefreshCw, Users, Play, X, Loader2, AlertCircle, ChevronDown,
  ChevronRight, CheckCircle2, BarChart3, ArrowRight, Cpu, Zap,
  Package, MessageSquare,
} from "lucide-react";
import { HillingOneIcon, HillingOneWordmark } from "../components/HillingOneLogo";
import { api } from "../api/client";

// ─── Top bar ────────────────────────────────────────────────────────────────
function TopBar({ user, notifications, onClearNotification }) {
  const [bellOpen, setBellOpen] = useState(false);
  const count = notifications.length;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1" />

      {/* Notification bell */}
      <div className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-gray-600" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-11 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            {count === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">All clear</div>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                    <Bell size={14} className="text-[#2A5C5A] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 leading-snug">{n.message}</p>
                    </div>
                    <button
                      onClick={() => { onClearNotification(n.id); }}
                      className="text-[10px] text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      dismiss
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* User pill */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
        <div className="w-8 h-8 rounded-full bg-[#EAB830] flex items-center justify-center text-[#1D4442] text-xs font-bold">
          {user.name?.[0] ?? "S"}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</div>
          <div className="text-[10px] text-gray-500 capitalize">{user.role}</div>
        </div>
      </div>
    </header>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { id: "bookings",   label: "All Bookings",   icon: CalendarDays },
  { id: "agent-runs", label: "Agent Runs",     icon: Bot },
  { id: "analytics",  label: "Demand Analytics", icon: BarChart3 },
];

function Sidebar({ active, onNav, onLogout }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#1D4442] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <HillingOneIcon size={34} variant="light" />
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/40 leading-none mb-0.5">
              Staff Portal
            </div>
            <HillingOneWordmark variant="light" size="sm" />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active === id
                ? "bg-[#EAB830] text-[#1D4442] shadow-sm font-semibold"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function StaffView({ user, onLogout, onAgentRun, notifications, onClearNotification }) {
  const [page, setPage] = useState("dashboard");
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [agentRuns, setAgentRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [agentModal, setAgentModal] = useState(null);
  const [agentsStatus, setAgentsStatus] = useState(null);
  const [demandReport, setDemandReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [runningAgent, setRunningAgent] = useState(null); // which background agent is running
  const [agentToast, setAgentToast] = useState(null);    // {label, outcome}

  const refreshDash = useCallback(async () => {
    try {
      const res = await api.staffDashboard();
      setDashData(res);
      setDashError(null);
    } catch (err) {
      setDashError(err.message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const refreshBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      setAllBookings(await api.staffAllBookings());
    } catch { /* non-critical */ }
    finally { setBookingsLoading(false); }
  }, []);

  const refreshRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      setAgentRuns(await api.recentAgentRuns());
    } catch { /* non-critical */ }
    finally { setRunsLoading(false); }
  }, []);

  const refreshAgentData = useCallback(async () => {
    try { setAgentsStatus(await api.agentsStatus()); } catch { /* non-critical */ }
    try { setDemandReport(await api.demandReport()); } catch { /* non-critical */ }
    try { setInventoryReport(await api.inventoryReport()); } catch { /* non-critical */ }
  }, []);

  const handleRunBackgroundAgent = useCallback(async (agentKey) => {
    if (runningAgent) return;
    setRunningAgent(agentKey);
    setAgentToast(null);
    const RUNNERS = {
      demand_sensing: api.runDemandAgent,
      inventory_optimisation: api.runInventoryAgent,
      booking_conversation: api.runBookingConversationAgent,
    };
    try {
      await RUNNERS[agentKey]();
      const labels = {
        demand_sensing: "Demand Sensing",
        inventory_optimisation: "Inventory Optimisation",
        booking_conversation: "Booking Conversation",
      };
      setAgentToast({ label: labels[agentKey], ok: true });
      await refreshAgentData();
      await refreshRuns();
    } catch (err) {
      setAgentToast({ label: agentKey, ok: false, error: err.message });
    } finally {
      setRunningAgent(null);
      setTimeout(() => setAgentToast(null), 5000);
    }
  }, [runningAgent, refreshAgentData, refreshRuns]);

  useEffect(() => {
    refreshDash();
    refreshBookings();
    refreshRuns();
    refreshAgentData();
    const id = setInterval(() => { refreshDash(); refreshBookings(); refreshAgentData(); }, 30000);
    return () => clearInterval(id);
  }, [refreshDash, refreshBookings, refreshRuns, refreshAgentData]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar active={page} onNav={setPage} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} notifications={notifications} onClearNotification={onClearNotification} />

        <main className="flex-1 overflow-y-auto">
          {page === "dashboard" && (
            <DashboardPage
              data={dashData}
              loading={dashLoading}
              error={dashError}
              onRetry={refreshDash}
              onRefresh={refreshDash}
              agentsStatus={agentsStatus}
              runningAgent={runningAgent}
              onRunAgent={handleRunBackgroundAgent}
            />
          )}
          {page === "bookings" && (
            <BookingsPage
              bookings={allBookings}
              loading={bookingsLoading}
              onRefresh={refreshBookings}
              onRunAgent={(b) => setAgentModal(b)}
            />
          )}
          {page === "agent-runs" && (
            <AgentRunsPage
              runs={agentRuns}
              loading={runsLoading}
              onRefresh={refreshRuns}
              onViewRun={(run) => onAgentRun?.(run)}
            />
          )}
          {page === "analytics" && (
            <AnalyticsPage
              data={dashData}
              loading={dashLoading}
              demandReport={demandReport}
              inventoryReport={inventoryReport}
            />
          )}
        </main>
      </div>

      {agentModal && (
        <AgentTriggerModal
          booking={agentModal}
          onClose={() => setAgentModal(null)}
          onAgentRun={(run) => {
            onAgentRun?.(run);
            refreshRuns();
            refreshAgentData();
            setAgentModal(null);
          }}
        />
      )}

      {/* Toast for background agent completions */}
      {agentToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          agentToast.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {agentToast.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {agentToast.ok
            ? `${agentToast.label} Agent completed successfully`
            : `${agentToast.label} failed: ${agentToast.error}`}
          <button onClick={() => setAgentToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard page ──────────────────────────────────────────────────────────
const COLOUR = {
  blue:  { dot: "#6B7280", bg: "bg-gray-50",    text: "text-gray-600",    label: "Underused" },
  green: { dot: "#10B981", bg: "bg-emerald-50",  text: "text-emerald-700", label: "Healthy" },
  amber: { dot: "#F59E0B", bg: "bg-amber-50",    text: "text-amber-700",   label: "Oversubscribed" },
};

const AGENT_META = [
  {
    key: "conflict_resolution",
    label: "Resolve Conflict",
    icon: ShieldCheck,
    description: "Finds an alternative space when two bookings clash — suggests a swap to the resident",
    schedule: "On demand",
  },
  {
    key: "booking_conversation",
    label: "Help Residents Book",
    icon: MessageSquare,
    description: "Guides residents through finding the right space using plain English descriptions",
    schedule: "Per search",
  },
  {
    key: "demand_sensing",
    label: "Spot Demand Trends",
    icon: TrendingUp,
    description: "Reviews recent searches to flag areas where residents can't find what they need",
    schedule: "Every 15 min",
  },
  {
    key: "inventory_optimisation",
    label: "Optimise Space Use",
    icon: Package,
    description: "Identifies spaces that are over- or under-used and suggests how to rebalance them",
    schedule: "Every 30 min",
  },
];

const RUNNABLE_AGENTS = ["demand_sensing", "inventory_optimisation", "booking_conversation"];

function AgentStatusPanel({ agentsStatus, runningAgent, onRunAgent }) {
  function timeAgo(iso) {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <Cpu size={15} className="text-[#2A5C5A]" />
        <span className="font-semibold text-sm text-gray-900">AI Assistants</span>
        <span className="text-xs text-gray-400 ml-1">— working quietly in the background</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide bg-[#EAF2F1] text-[#2A5C5A] px-2 py-0.5 rounded-full">
          4 active
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-gray-100">
        {AGENT_META.map(({ key, label, icon: Icon, description, schedule }) => {
          const status = agentsStatus?.[key];
          const ran = status?.last_run;
          const ago = timeAgo(ran);
          const isRecent = ran && (Date.now() - new Date(ran).getTime()) < 60 * 60 * 1000;
          const isRunnable = RUNNABLE_AGENTS.includes(key);
          const isThisRunning = runningAgent === key;
          const anyRunning = !!runningAgent;
          return (
            <div key={key} className="p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-[#2A5C5A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  {isThisRunning
                    ? <Loader2 size={13} className="text-[#2A5C5A] animate-spin" />
                    : <Icon size={13} className="text-[#2A5C5A]" />
                  }
                </div>
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isThisRunning ? "bg-emerald-400 animate-pulse"
                    : ran ? (isRecent ? "bg-emerald-500" : "bg-amber-400")
                    : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="text-xs font-semibold text-gray-900 leading-tight mb-0.5">{label}</div>
              <div className="text-[10px] text-gray-400 leading-snug mb-3 flex-1">{description}</div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{schedule}</span>
                {isRunnable ? (
                  <button
                    onClick={() => onRunAgent?.(key)}
                    disabled={anyRunning}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#2A5C5A]/30 text-[#2A5C5A] hover:bg-[#2A5C5A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isThisRunning ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                    {isThisRunning ? "Running…" : "Run Now"}
                  </button>
                ) : (
                  ago ? (
                    <span className="text-[10px] text-gray-400">{ago}</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Via bookings tab</span>
                  )
                )}
              </div>
              {ago && isRunnable && (
                <div className="text-[10px] text-gray-300 mt-1">{ago}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardPage({ data, loading, error, onRetry, onRefresh, agentsStatus, runningAgent, onRunAgent }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" /> Loading dashboard…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <div className="text-red-700 font-semibold mb-2">Dashboard unavailable</div>
        <div className="text-sm text-gray-600 mb-4">{error || "Unknown error"}</div>
        <button onClick={onRetry} className="px-4 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-medium hover:bg-[#2A5C5A]/90 transition">
          Retry
        </button>
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="px-6 py-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hillingdon Council · Booking Management</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Activity size={18} />}   label="Bookings this week"        value={m.weekly_bookings} />
        <MetricCard icon={<Clock size={18} />}       label="Hours of admin saved"      value={`${Math.round(m.estimated_staff_hours_saved)}h`} highlight />
        <MetricCard icon={<TrendingUp size={18} />}  label="Phone calls no longer needed" value={m.phone_calls_avoided} />
        <MetricCard icon={<ShieldCheck size={18} />} label="Old systems replaced"      value={m.interfaces_replaced} />
      </div>

      {/* Principles strip */}
      <div className="bg-[#1D4442] text-white rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2">How HillingOne works for you</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm opacity-80">
          {(data.principles || []).map((p, i) => <div key={i}>✓ {p}</div>)}
        </div>
      </div>

      {/* Agent status */}
      <AgentStatusPanel agentsStatus={agentsStatus} runningAgent={runningAgent} onRunAgent={onRunAgent} />

      {/* Utilisation + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Utilisation table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <MapPin size={15} className="text-[#2A5C5A]" />
            <span className="font-semibold text-sm text-gray-900">Asset utilisation</span>
            <div className="ml-auto flex items-center gap-3 text-xs">
              {Object.values(COLOUR).map((s) => (
                <span key={s.label} className="flex items-center gap-1 text-gray-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left font-medium">Asset</th>
                  <th className="px-4 py-2.5 text-left font-medium">Ward</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cap.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Bookings</th>
                  <th className="px-4 py-2.5 text-right font-medium">Utilisation</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.asset_utilisation || []).map((a) => {
                  const s = COLOUR[a.colour] || COLOUR.green;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[160px] truncate">{a.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{a.ward}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{a.capacity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{a.weekly_bookings}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: s.dot }}>{a.utilisation_pct}%</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Live agent feed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Activity size={15} className="text-[#2A5C5A]" />
              <span className="font-semibold text-sm text-gray-900">Live agent feed</span>
              <span className="ml-auto text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Live</span>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
              {(data.agent_feed || []).length === 0 ? (
                <div className="p-5 text-sm text-gray-500 text-center">No recent activity</div>
              ) : (
                (data.agent_feed || []).map((entry) => (
                  <div key={entry.id} className="px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {entry.ai_reasoning && (
                      <div className="text-xs text-gray-500 mt-0.5 italic line-clamp-2">{entry.ai_reasoning}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Demand alerts */}
          {(data.demand_alerts || []).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <span className="font-semibold text-sm text-gray-900">Unmet demand</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {data.demand_alerts.length} queries
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {data.demand_alerts.map((d, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-800 italic">"{d.raw_query}"</div>
                    <div className="text-xs text-gray-500 mt-0.5">Only {d.results_count} match{d.results_count !== 1 ? "es" : ""} found</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── All Bookings page ───────────────────────────────────────────────────────
const STATE_STYLES = {
  confirmed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  held:         "bg-amber-50 text-amber-700 border-amber-200",
  swap_pending: "bg-orange-50 text-orange-700 border-orange-200",
  completed:    "bg-gray-100 text-gray-600 border-gray-200",
  cancelled:    "bg-red-50 text-red-700 border-red-200",
};
const STATE_LABELS = {
  confirmed: "Confirmed", held: "Held", swap_pending: "Swap Pending",
  completed: "Completed", cancelled: "Cancelled",
};

function BookingsPage({ bookings, loading, onRefresh, onRunAgent }) {
  const [stateFilter, setStateFilter] = useState("all");
  const tabs = ["all", "confirmed", "swap_pending", "held", "completed"];

  const filtered = stateFilter === "all"
    ? bookings
    : bookings.filter((b) => b.state === stateFilter);

  return (
    <div className="px-6 py-6 space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review all bookings — click "Resolve" on any confirmed booking to let the AI handle a conflict</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setStateFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
              stateFilter === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "all" ? "All" : STATE_LABELS[t] || t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            {loading ? "Loading bookings…" : "No bookings match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Resident</th>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-left font-medium">Date &amp; Time</th>
                  <th className="px-4 py-3 text-left font-medium">Attendees</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const start = new Date(b.start_time);
                  const ss = STATE_STYLES[b.state] || "bg-gray-100 text-gray-600 border-gray-200";
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.reference || "—"}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{b.user?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{b.asset?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {" · "}
                        {start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{b.attendee_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${ss}`}>
                          {b.state === "swap_pending" && <AlertTriangle size={9} />}
                          {STATE_LABELS[b.state] || b.state}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.state === "confirmed" && (
                          <button
                            onClick={() => onRunAgent(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2A5C5A] text-white rounded-lg text-xs font-semibold hover:bg-[#2A5C5A]/90 transition"
                          >
                            <Bot size={11} /> Resolve
                          </button>
                        )}
                        {b.state === "swap_pending" && (
                          <span className="text-xs text-orange-600 font-medium">Awaiting resident</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Runs page ─────────────────────────────────────────────────────────
const TOOL_PLAIN = {
  search_inventory:  { label: "Searched available spaces",       icon: "🔍" },
  check_availability:{ label: "Verified slot availability",      icon: "📅" },
  score_alternative: { label: "Scored alternative suitability",  icon: "⭐" },
  send_swap_request: { label: "Sent swap offer to resident",     icon: "✉️" },
  escalate_to_staff: { label: "Escalated to staff for review",   icon: "🚨" },
  log_decision:      { label: "Recorded decision in audit log",  icon: "📝" },
};

const AGENT_TYPE_META = {
  "Conflict Resolution Agent": { color: "bg-[#2A5C5A]/10 text-[#2A5C5A]", badge: "Conflict Resolution" },
  "Demand Sensing Agent":       { color: "bg-amber-100 text-amber-700",     badge: "Demand Sensing"      },
  "Inventory Optimisation Agent":{ color: "bg-purple-100 text-purple-700", badge: "Inventory"           },
  "Booking Conversation Agent": { color: "bg-blue-100 text-blue-700",       badge: "Conversation"        },
};

function friendlyGoal(run) {
  const goal = run.goal_summary || run.goal || "";
  if (goal.toLowerCase().includes("conflict") || goal.toLowerCase().includes("alternative")) {
    return "Found an alternative space for a booking conflict";
  }
  if (goal.toLowerCase().includes("demand") || goal.toLowerCase().includes("search")) {
    return "Analysed resident demand patterns across the borough";
  }
  if (goal.toLowerCase().includes("inventory") || goal.toLowerCase().includes("asset")) {
    return "Reviewed space utilisation and optimisation opportunities";
  }
  if (goal.toLowerCase().includes("conversation") || goal.toLowerCase().includes("booking intent")) {
    return "Helped a resident find the right space via conversation";
  }
  return goal || "AI agent completed a task";
}

function friendlyTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` at ${time}`;
}

function AgentRunsPage({ runs, loading, onRefresh, onViewRun }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" /> Loading agent runs…
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-5 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agent Runs</h1>
          <p className="text-sm text-gray-500 mt-0.5">A plain-English log of everything the AI has done — fully transparent</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <Bot size={28} className="mx-auto mb-3 text-gray-300" />
          <div className="text-sm font-medium text-gray-500 mb-1">No agent runs yet</div>
          <div className="text-xs text-gray-400">Go to All Bookings and click "Resolve" on any confirmed booking to see the AI in action.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const isExpanded = expanded === run.id;
            const meta = AGENT_TYPE_META[run.agent_name] || AGENT_TYPE_META["Conflict Resolution Agent"];
            const outcome = run.final_decision;
            const steps = run.steps || [];
            const toolSteps = steps.filter((s) => s.type === "tool_call");

            return (
              <div key={run.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                  onClick={() => setExpanded(isExpanded ? null : run.id)}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <Bot size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>
                        {meta.badge}
                      </span>
                      {outcome && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold capitalize">
                          {outcome.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 leading-snug">
                      {friendlyGoal(run)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {toolSteps.length > 0 ? `${toolSteps.length} action${toolSteps.length !== 1 ? "s" : ""} taken` : "Completed"}
                      {" · "}
                      {friendlyTime(run.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewRun(run); }}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                    >
                      View live
                    </button>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What the AI did, step by step</div>
                    {steps.length === 0 ? (
                      <div className="text-xs text-gray-500">No step details recorded for this run.</div>
                    ) : (
                      steps.map((step, i) => {
                        if (step.type === "tool_call") {
                          const plain = TOOL_PLAIN[step.tool] || { label: step.tool, icon: "🔧" };
                          return (
                            <div key={i} className="flex items-start gap-3 text-xs">
                              <span className="w-5 h-5 bg-[#2A5C5A] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                                {step.step ?? i + 1}
                              </span>
                              <div className="flex-1">
                                <span className="font-semibold text-gray-800">{plain.icon} {plain.label}</span>
                              </div>
                            </div>
                          );
                        }
                        if (step.type === "tool_result") {
                          const isErr = !!step.result?.error;
                          return (
                            <div key={i} className="flex items-start gap-3 text-xs ml-8">
                              <ArrowRight size={11} className="text-gray-300 mt-0.5 flex-shrink-0" />
                              <span className={`px-2 py-0.5 rounded text-[10px] ${isErr ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
                                {isErr ? `Could not complete: ${step.result.error}` : "Done"}
                              </span>
                            </div>
                          );
                        }
                        if (step.type === "agent_thought") {
                          return (
                            <div key={i} className="flex items-start gap-3 text-xs ml-2">
                              <span className="text-gray-400 italic">💭 {step.content}</span>
                            </div>
                          );
                        }
                        return null;
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Analytics page ───────────────────────────────────────────────────────────
const SEVERITY_STYLES = {
  high:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   dot: "#EF4444" },
  medium: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", dot: "#F59E0B" },
  low:    { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",  dot: "#6B7280" },
};
const IMPACT_STYLES = {
  high:   "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low:    "bg-gray-50 text-gray-600",
};

function DemandSection({ report }) {
  if (!report || report.status === "no_data") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <TrendingUp size={28} className="mx-auto mb-3 text-gray-300" />
        <div className="text-sm font-medium text-gray-500">Demand Sensing Agent hasn't run yet</div>
        <div className="text-xs text-gray-400 mt-1">Results appear within 15 minutes of first search activity.</div>
      </div>
    );
  }
  const a = report.analysis;
  if (!a) return null;
  const genAt = new Date(report.generated_at);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-[#2A5C5A]" />
        <h2 className="text-base font-bold text-gray-900">What Residents Are Searching For</h2>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
          a.confidence === "high" ? "bg-emerald-100 text-emerald-700"
          : a.confidence === "medium" ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-500"
        }`}>{a.confidence} confidence</span>
        <span className="text-xs text-gray-400">
          {genAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Summary */}
      <div className="bg-[#1D4442] text-white rounded-xl px-5 py-4">
        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">AI Summary</div>
        <p className="text-sm leading-relaxed opacity-90">{a.summary}</p>
      </div>

      {/* Hotspots */}
      {(a.hotspots || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="font-semibold text-sm text-gray-900">Demand Hotspots</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.hotspots.map((h, i) => {
              const sty = SEVERITY_STYLES[h.severity] || SEVERITY_STYLES.medium;
              return (
                <div key={i} className="px-5 py-4 flex items-start gap-4">
                  <span className={`mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${sty.bg} ${sty.text} ${sty.border} flex-shrink-0`}>
                    {h.severity}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{h.ward}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{h.issue}</div>
                    <div className="text-xs text-[#2A5C5A] mt-1.5 font-medium">→ {h.recommendation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Peak times */}
      {(a.peak_times || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock size={14} className="text-[#2A5C5A]" />
            <span className="font-semibold text-sm text-gray-900">Peak Time Patterns</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.peak_times.map((t, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="text-xs font-mono font-semibold text-gray-900 w-44 flex-shrink-0">{t.time_window}</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{t.demand_level}</span>
                <div className="text-xs text-gray-600 flex-1">{t.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing capacity */}
      {(a.missing_capacity || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Zap size={14} className="text-[#2A5C5A]" />
            <span className="font-semibold text-sm text-gray-900">Missing Capacity</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.missing_capacity.map((c, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900 capitalize">{c.facility_type?.replace(/_/g, " ")}</span>
                  <span className="text-xs text-gray-500">· {c.ward}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">{c.evidence}</div>
                <div className="text-xs text-[#2A5C5A] font-medium">→ {c.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InventorySection({ report }) {
  if (!report || report.status === "no_data") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Package size={28} className="mx-auto mb-3 text-gray-300" />
        <div className="text-sm font-medium text-gray-500">Inventory Optimisation Agent hasn't run yet</div>
        <div className="text-xs text-gray-400 mt-1">Results appear within 30 minutes of app start.</div>
      </div>
    );
  }
  const a = report.analysis;
  const stats = report.stats;
  if (!a) return null;
  const genAt = new Date(report.generated_at);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package size={16} className="text-[#2A5C5A]" />
        <h2 className="text-base font-bold text-gray-900">How Well Are Your Spaces Used?</h2>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
          a.confidence === "high" ? "bg-emerald-100 text-emerald-700"
          : a.confidence === "medium" ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-500"
        }`}>{a.confidence} confidence</span>
        <span className="text-xs text-gray-400">
          {genAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Health score + stats */}
      {(stats || a.portfolio_health_score != null) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#2A5C5A]">{a.portfolio_health_score ?? "—"}</div>
            <div className="text-xs text-gray-500 mt-0.5">Portfolio health score</div>
          </div>
          {stats && (
            <>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-gray-600">{stats.underused ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Underused assets</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-700">{stats.oversubscribed ?? 0}</div>
                <div className="text-xs text-amber-600 mt-0.5">Oversubscribed</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-[#1D4442] text-white rounded-xl px-5 py-4">
        <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">AI Summary</div>
        <p className="text-sm leading-relaxed opacity-90">{a.summary}</p>
      </div>

      {/* Priority actions */}
      {(a.priority_actions || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Zap size={14} className="text-[#2A5C5A]" />
            <span className="font-semibold text-sm text-gray-900">Priority Actions</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.priority_actions.map((action, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <span className="w-5 h-5 bg-[#2A5C5A] text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-gray-700">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underused actions */}
      {(a.underused_actions || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Activity size={14} className="text-[#2A5C5A]" />
            <span className="font-semibold text-sm text-gray-900">Underused Assets — Activation Opportunities</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.underused_actions.map((item, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{item.asset}</span>
                    <span className="text-xs text-gray-500">· {item.ward}</span>
                    <span className="text-xs text-gray-500 font-semibold">{item.utilisation_pct}% utilised</span>
                    {item.impact && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${IMPACT_STYLES[item.impact] || IMPACT_STYLES.medium}`}>
                        {item.impact} impact
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#2A5C5A] mt-1.5 font-medium">→ {item.recommendation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Oversubscribed actions */}
      {(a.oversubscribed_actions || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="font-semibold text-sm text-gray-900">Oversubscribed Assets — Demand Shifting</span>
          </div>
          <div className="divide-y divide-gray-100">
            {a.oversubscribed_actions.map((item, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{item.asset}</span>
                    <span className="text-xs text-gray-500">· {item.ward}</span>
                    <span className="text-xs text-amber-600 font-semibold">{item.utilisation_pct}% utilised</span>
                    {item.impact && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${IMPACT_STYLES[item.impact] || IMPACT_STYLES.medium}`}>
                        {item.impact} impact
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#2A5C5A] mt-1.5 font-medium">→ {item.recommendation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsPage({ data, loading, demandReport, inventoryReport }) {
  const [tab, setTab] = useState("demand");

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" /> Loading analytics…
      </div>
    );
  }

  const alerts = data?.demand_alerts || [];
  const utilisation = data?.asset_utilisation || [];

  return (
    <div className="px-6 py-6 space-y-5 max-w-[960px]">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Demand Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Understand what residents need and how well spaces are used</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: "demand", label: "What residents need" },
          { id: "inventory", label: "How spaces are used" },
          { id: "utilisation", label: "Booking data" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "demand" && <DemandSection report={demandReport} />}
      {tab === "inventory" && <InventorySection report={inventoryReport} />}

      {tab === "utilisation" && (
        <div className="space-y-4">
          {/* Unmet demand raw */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <span className="font-semibold text-sm text-gray-900">Unmet demand queries (raw)</span>
              <span className="ml-auto text-xs text-gray-500">{alerts.length} recent low-result searches</span>
            </div>
            {alerts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                No unmet demand detected.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {alerts.map((d, i) => (
                  <div key={i} className="px-5 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 italic">"{d.raw_query}"</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Only <span className="font-semibold text-amber-700">{d.results_count}</span> match{d.results_count !== 1 ? "es" : ""} found
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Utilisation bars */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <BarChart3 size={15} className="text-[#2A5C5A]" />
              <span className="font-semibold text-sm text-gray-900">Asset utilisation (this week)</span>
            </div>
            <div className="p-5 space-y-3">
              {utilisation.map((a) => {
                const s = COLOUR[a.colour] || COLOUR.green;
                const pct = Math.min(100, a.utilisation_pct);
                return (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-gray-800 truncate max-w-[200px]">{a.name}</div>
                      <div className="text-xs font-semibold" style={{ color: s.dot }}>{a.utilisation_pct}%</div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.dot }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{a.ward} · {a.weekly_bookings} bookings · Cap. {a.capacity}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent trigger modal (with live SSE streaming) ───────────────────────────
function AgentTriggerModal({ booking, onClose, onAgentRun }) {
  const [summary, setSummary] = useState("");
  const [running, setRunning] = useState(false);
  const [liveSteps, setLiveSteps] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const stepsEndRef = useRef(null);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveSteps]);

  const handleRun = () => {
    if (!summary.trim()) return;
    setRunning(true);
    setLiveSteps([]);
    setError(null);
    setResult(null);

    api.triggerAgentStream(
      { confirmed_booking_id: booking.id, priority_request_summary: summary.trim() },
      (step) => setLiveSteps((prev) => [...prev, step]),
      (res) => {
        setResult(res);
        setRunning(false);
        onAgentRun(res);
      },
      (msg) => { setError(msg); setRunning(false); },
    );
  };

  const toolLabel = (step) => {
    const plain = {
      search_inventory:   "🔍 Searching available spaces…",
      check_availability: "📅 Checking slot availability…",
      score_alternative:  "⭐ Scoring best alternatives…",
      send_swap_request:  "✉️ Sending swap offer to resident…",
      escalate_to_staff:  "🚨 Escalating to staff…",
      log_decision:       "📝 Logging decision…",
    };
    if (step.type === "tool_call") return plain[step.tool] || `→ ${step.tool}`;
    if (step.type === "tool_result") return `✓ Done`;
    if (step.type === "agent_thought") return `💭 Thinking…`;
    return step.type;
  };

  const DECISION_LABELS = {
    swap_proposed: { text: "Swap proposed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
    escalated: { text: "Escalated to staff", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    incomplete: { text: "Incomplete", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-[#1D4442] text-white p-5 rounded-t-2xl flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-75">AI Assistant</div>
              <h3 className="font-semibold text-lg">Resolve a Booking Conflict</h3>
              <p className="text-xs opacity-70 mt-0.5">The AI searches for an alternative space and sends a polite swap offer to the resident.</p>
            </div>
          </div>
          {!running && (
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Booking context */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Booking to resolve</div>
          <div className="font-semibold text-gray-900">{booking.asset?.name}</div>
          <div className="text-sm text-gray-600">
            {booking.user?.name} · {new Date(booking.start_time).toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "long",
            })} · Ref: <span className="font-mono">{booking.reference}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Input — hide once running or done */}
          {!running && !result && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                What is the priority need that requires this space?
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="e.g. Emergency councillor surgery for 40 residents affected by the Hayes flooding."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/20 transition"
              />
            </div>
          )}

          {/* Live step trace */}
          {(running || (result && liveSteps.length > 0)) && (
            <div className="bg-gray-950 rounded-xl p-4 max-h-52 overflow-y-auto font-mono text-xs space-y-1.5">
              {running && (
                <div className="text-emerald-400 mb-2 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  AI working — live steps below…
                </div>
              )}
              {liveSteps.map((s, i) => (
                <div key={i} className={`${s.type === "tool_call" ? "text-cyan-300" : s.type === "tool_result" ? "text-emerald-300" : "text-gray-400"}`}>
                  {toolLabel(s)}
                </div>
              ))}
              <div ref={stepsEndRef} />
            </div>
          )}

          {/* Result banner */}
          {result && (() => {
            const dec = DECISION_LABELS[result.final_decision] || DECISION_LABELS.incomplete;
            return (
              <div className={`rounded-xl p-4 border ${dec.bg} flex items-start gap-3`}>
                <CheckCircle2 size={18} className={`${dec.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className={`font-semibold text-sm ${dec.color}`}>{dec.text}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {result.iterations_used ?? 0} step{result.iterations_used !== 1 ? "s" : ""} taken · full record saved in Agent Runs
                  </div>
                </div>
              </div>
            );
          })()}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {!running && (
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  onClick={handleRun}
                  disabled={!summary.trim()}
                  className="px-5 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-semibold hover:bg-[#2A5C5A]/90 disabled:opacity-50 transition flex items-center gap-2"
                >
                  <Play size={14} /> Let the AI resolve it
                </button>
              )}
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            The agent suggests. The human decides. Every step is logged.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared metric card ───────────────────────────────────────────────────────
function MetricCard({ icon, label, value, highlight }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "bg-[#2A5C5A] text-white border-[#2A5C5A]" : "bg-white border-gray-200"}`}>
      <div className={`flex items-center gap-2 text-xs uppercase tracking-wide ${highlight ? "opacity-75" : "text-gray-500"}`}>
        {icon} {label}
      </div>
      <div className={`text-3xl font-bold mt-1 ${highlight ? "" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

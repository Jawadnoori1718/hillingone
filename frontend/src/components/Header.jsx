import { useState, useRef, useEffect } from "react";
import { Building2, Bell, LogOut, Calendar, X } from "lucide-react";
import { api } from "../api/client";

export default function Header({ view, onViewChange, user, onLogout, notifications, onClearNotification }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.sent).length;

  return (
    <header className="bg-[#2A5C5A] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center">
          <Building2 size={20} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest opacity-60 leading-none">
            London Borough of Hillingdon
          </div>
          <div className="text-lg font-semibold leading-tight">Atrium</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1 text-sm">
        <button
          onClick={() => onViewChange("resident")}
          className={`px-4 py-2 rounded transition ${view === "resident" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
        >
          Resident
        </button>
        <button
          onClick={() => onViewChange("staff")}
          className={`px-4 py-2 rounded transition ${view === "staff" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
        >
          Staff
        </button>
      </nav>

      {/* Right side: notifications + user */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg hover:bg-white/10 transition"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Reminders {unread > 0 && <span className="text-[#2A5C5A]">({unread} upcoming)</span>}
                </span>
                <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="p-5 text-center text-sm text-gray-500">No upcoming reminders</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <li key={n.id} className="px-4 py-3 hover:bg-gray-50 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Calendar size={14} className="text-[#2A5C5A] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-800 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.remind_at).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onClearNotification(n.id)}
                          className="text-gray-300 hover:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition"
                          aria-label="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-2">
          <div className="text-sm text-right hidden sm:block">
            <div className="font-medium leading-tight">{user?.name}</div>
            <div className="text-xs opacity-60 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="p-2 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

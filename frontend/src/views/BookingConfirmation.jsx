import { CheckCircle2, Lock, Calendar, Bell, ArrowLeft, Sparkles } from "lucide-react";
import { api } from "../api/client";

export default function BookingConfirmation({ booking, asset, onBack, encouragement, remindersScheduled }) {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#2A5C5A] mb-6">
        <ArrowLeft size={16} /> Back to search
      </button>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-emerald-50 border-b border-emerald-200 p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={32} className="text-emerald-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Booking confirmed</h2>
          <p className="text-sm text-gray-600 mt-1">Reference: <span className="font-mono font-semibold">{booking.reference}</span></p>

          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-white border border-emerald-300 rounded-full text-sm">
            <Lock size={14} className="text-emerald-700" />
            <span className="font-medium text-emerald-900">Confirmed and protected</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Venue</div>
            <div className="text-lg font-semibold text-gray-900">{asset.name}</div>
            <div className="text-sm text-gray-600">{asset.ward}, Hillingdon</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">When</div>
              <div className="text-sm font-medium text-gray-900">
                {startTime.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <div className="text-sm text-gray-600">
                {startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" "}
                – {endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Attendees</div>
              <div className="text-sm font-medium text-gray-900">
                {booking.attendee_count || "Not specified"}
              </div>
            </div>
          </div>

          {booking.purpose && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Purpose</div>
              <div className="text-sm text-gray-900">{booking.purpose}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={api.icsUrl(booking.id)}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A5C5A] text-white rounded-lg text-sm font-medium hover:bg-[#2A5C5A]/90 transition"
            >
              <Calendar size={14} />
              Add to calendar
            </a>
            {remindersScheduled > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                <Bell size={14} />
                {remindersScheduled} reminders scheduled
              </span>
            )}
          </div>

          {encouragement && (
            <div className="mt-4 p-4 bg-[#EAF2F1] border border-[#2A5C5A]/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-[#2A5C5A] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#2A5C5A] font-semibold mb-1">
                    A short note from us
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{encouragement}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* THE TRUST PANEL - critical for the pitch */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Lock size={20} className="text-[#2A5C5A] flex-shrink-0 mt-1" />
          <div>
            <div className="font-semibold text-gray-900 mb-2">Your booking, protected</div>
            <p className="text-sm text-gray-700 leading-relaxed">
              This booking can only be cancelled by you, or by staff for a documented operational
              reason. If staff need to cancel, you will be notified immediately with the full
              reason, an equivalent alternative venue, and a 20 percent goodwill credit on your
              next booking.
            </p>
            <div className="mt-3 text-xs text-gray-500 italic">
              Trust is not built by saying never. It is built by saying always with transparency.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Users, ShieldCheck, ArrowRight, Sparkles, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import HillingOneLogo, { HillingOneIcon } from "../components/HillingOneLogo";

export default function LoginScreen({ onLogin }) {
  const [step, setStep] = useState("role");   // role → auth
  const [role, setRole] = useState(null);
  const [mode, setMode] = useState("login");  // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", ward: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendDown, setBackendDown] = useState(false);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(null); },
  });

  const handleDemo = async (demoRole) => {
    setLoading(true); setError(null);
    try {
      const user = await api.demoLogin(demoRole);
      onLogin(user);
    } catch (err) {
      if (err.message.includes("fetch") || err.message.includes("NetworkError")) {
        setBackendDown(true);
      } else {
        setError(err.message);
      }
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      let user;
      if (mode === "login") {
        user = await api.login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError("Please enter your full name."); setLoading(false); return; }
        user = await api.register(form.name, form.email, form.password, role === "staff" ? "staff" : "resident", form.ward || null);
      }
      onLogin(user);
    } catch (err) {
      if (err.message.includes("fetch") || err.message.includes("NetworkError")) {
        setBackendDown(true);
      } else {
        setError(err.message.replace(/^\d+:\s*/, ""));
      }
    } finally { setLoading(false); }
  };

  if (backendDown) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F6]">
        <div className="max-w-sm text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <div className="font-semibold text-gray-900 mb-1">Backend not running</div>
          <div className="text-sm text-gray-500 mb-4">Start Docker first, then reload this page.</div>
          <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg text-gray-700 block">docker compose up</code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F4F7F6]">
      {/* Left panel */}
      <div className="hidden lg:flex w-[400px] flex-shrink-0 bg-[#1D4442] flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="net" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="2" fill="white"/>
                <circle cx="0" cy="0" r="2" fill="white"/>
                <circle cx="80" cy="0" r="2" fill="white"/>
                <circle cx="0" cy="80" r="2" fill="white"/>
                <circle cx="80" cy="80" r="2" fill="white"/>
                <line x1="0" y1="0" x2="40" y2="40" stroke="white" strokeWidth="0.5"/>
                <line x1="80" y1="0" x2="40" y2="40" stroke="white" strokeWidth="0.5"/>
                <line x1="0" y1="80" x2="40" y2="40" stroke="white" strokeWidth="0.5"/>
                <line x1="80" y1="80" x2="40" y2="40" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#net)"/>
          </svg>
        </div>
        <div className="relative flex flex-col h-full px-10 py-10">
          <HillingOneLogo size={40} variant="light" textSize="lg" />
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-white text-3xl font-bold leading-snug mb-4">
              One front door for every council booking
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-10">
              Search in plain English, book in seconds, protected by AI-driven fairness.
            </p>
            <div className="space-y-4">
              {[
                { label: "Plain English search", sub: "Describe what you need, we'll find it" },
                { label: "AI conflict resolution", sub: "Fair, transparent, always logged" },
                { label: "Voice & photo booking", sub: "Speak or snap a photo to book" },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAB830] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="#1D4442" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{f.label}</div>
                    <div className="text-white/50 text-xs">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-white/30 text-xs">© 2026 HillingOne</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="lg:hidden mb-10">
          <HillingOneLogo size={44} variant="dark" textSize="xl" />
        </div>

        <div className="w-full max-w-md">
          {step === "role" ? (
            <RoleStep onChoose={(r) => { setRole(r); setStep("auth"); setMode("login"); setError(null); }} />
          ) : (
            <AuthStep
              role={role}
              mode={mode}
              setMode={(m) => { setMode(m); setError(null); }}
              form={form}
              field={field}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loading={loading}
              error={error}
              onBack={() => { setStep("role"); setError(null); }}
              onSubmit={handleSubmit}
              onDemo={() => handleDemo(role)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleStep({ onChoose }) {
  return (
    <>
      <div className="mb-8 text-center lg:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2A5C5A] bg-[#EAF2F1] px-3 py-1 rounded-full mb-4">
          <Sparkles size={11} /> Intelligent Booking System
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">Welcome</h1>
        <p className="mt-2 text-gray-500 text-sm">How would you like to sign in?</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <RoleCard
          icon={<Users size={24} />}
          title="Resident"
          description="Search and book council spaces across Hillingdon."
          accent="teal"
          onClick={() => onChoose("resident")}
        />
        <RoleCard
          icon={<ShieldCheck size={24} />}
          title="Staff / Councillor"
          description="Manage bookings, run the AI agent, view analytics."
          accent="gold"
          onClick={() => onChoose("staff")}
        />
      </div>
    </>
  );
}

function AuthStep({ role, mode, setMode, form, field, showPassword, setShowPassword, loading, error, onBack, onSubmit, onDemo }) {
  const isStaff = role === "staff";
  const WARDS = ["Hayes Town", "Yiewsley", "Uxbridge", "Ruislip", "Northwood", "Botwell", "Hillingdon East", "Manor", "Other"];

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#2A5C5A] transition mb-6">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isStaff ? "Staff sign in" : "Resident sign in"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "login" ? "Sign in to your account." : "Create a new account."}
        </p>
      </div>

      {/* Demo button — prominent, above the form */}
      <button
        onClick={onDemo}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-5 border-2 border-[#2A5C5A]/30 bg-[#EAF2F1] text-[#2A5C5A] rounded-xl text-sm font-semibold hover:bg-[#2A5C5A]/10 transition disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Try as Demo {isStaff ? "Staff" : "Resident"} — no account needed
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or sign in with email</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {["login", "register"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              required
              {...field("name")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/20 transition"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            {...field("email")}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/20 transition"
          />
        </div>

        {mode === "register" && !isStaff && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ward (optional)</label>
            <select
              {...field("ward")}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/20 transition bg-white"
            >
              <option value="">Select your ward</option>
              {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" ? "Choose a password" : "Your password"}
              required
              minLength={mode === "register" ? 6 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...field("password")}
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:border-[#2A5C5A] focus:ring-2 focus:ring-[#2A5C5A]/20 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mode === "register" && (
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#2A5C5A] text-white rounded-xl text-sm font-bold hover:bg-[#2A5C5A]/90 disabled:opacity-60 transition"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </>
  );
}

function RoleCard({ icon, title, description, accent, onClick }) {
  const styles = {
    teal: { icon: "bg-[#EAF2F1] text-[#2A5C5A]", border: "hover:border-[#2A5C5A]", arrow: "text-[#2A5C5A]" },
    gold: { icon: "bg-[#FEF8E7] text-[#EAB830]", border: "hover:border-[#EAB830]", arrow: "text-[#EAB830]" },
  }[accent];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all group ${styles.border}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-base">{title}</div>
        <div className="text-sm text-gray-500 mt-0.5 leading-snug">{description}</div>
      </div>
      <ArrowRight size={18} className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition ${styles.arrow}`} />
    </button>
  );
}

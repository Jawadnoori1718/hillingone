const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res;
}

export const api = {
  // Auth
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name, email, password, role, ward = null) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, role, ward }) }),
  demoLogin: (role) =>
    request("/api/auth/demo", { method: "POST", body: JSON.stringify({ role }) }),

  // Search
  search: (query, userId = null) =>
    request("/api/search", { method: "POST", body: JSON.stringify({ query, user_id: userId }) }),

  searchByImage: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/api/search/image`, { method: "POST", body: form });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).detail; } catch { detail = res.statusText; }
      throw new Error(`${res.status}: ${detail}`);
    }
    return res.json();
  },

  // Bookings
  listBookings: (userId = null, state = null) => {
    const params = new URLSearchParams();
    if (userId) params.set("user_id", userId);
    if (state) params.set("state", state);
    return request(`/api/bookings${params.toString() ? "?" + params.toString() : ""}`);
  },

  hold: (data) =>
    request("/api/bookings/hold", { method: "POST", body: JSON.stringify(data) }),

  confirm: (bookingId, userId, enableReminders = true) =>
    request(`/api/bookings/${bookingId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, enable_reminders: enableReminders }),
    }),

  cancelBooking: (bookingId, userId) =>
    request(`/api/bookings/${bookingId}?user_id=${userId}`, { method: "DELETE" }),

  acceptSwap: (bookingId, userId) =>
    request(`/api/bookings/${bookingId}/swap-accept`, {
      method: "POST",
      body: JSON.stringify({ booking_id: bookingId, user_id: userId, accept: true }),
    }),

  declineSwap: (bookingId, userId) =>
    request(`/api/bookings/${bookingId}/swap-decline`, {
      method: "POST",
      body: JSON.stringify({ booking_id: bookingId, user_id: userId, accept: false }),
    }),

  getBooking: (bookingId) => request(`/api/bookings/${bookingId}`),
  icsUrl: (bookingId) => `${BASE}/api/bookings/${bookingId}/ics`,

  // Agent
  triggerAgent: (data) =>
    request("/api/agent/conflict-resolution", { method: "POST", body: JSON.stringify(data) }),

  // Streaming agent — calls onStep(step) for each SSE event, onComplete(result) when done
  triggerAgentStream: async (data, onStep, onComplete, onError) => {
    let response;
    try {
      response = await fetch(`${BASE}/api/agent/conflict-resolution/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    } catch (err) {
      onError(err.message);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "complete") { onComplete(event); }
            else if (event.type === "error") { onError(event.message); }
            else { onStep(event); }
          } catch { /* malformed line — skip */ }
        }
      }
    } catch (err) {
      onError(err.message);
    }
  },

  recentAgentRuns: () => request("/api/agent/runs/recent"),

  // Staff
  staffDashboard: () => request("/api/staff/dashboard"),
  staffAllBookings: () => request("/api/staff/all-bookings"),
  staffOverride: (data) =>
    request("/api/staff/override", { method: "POST", body: JSON.stringify(data) }),
  decisionQueue: () => request("/api/staff/decision-queue"),
  agentsStatus: () => request("/api/staff/agents/status"),
  demandReport: () => request("/api/staff/agents/demand"),
  inventoryReport: () => request("/api/staff/agents/inventory"),
  runDemandAgent: () => request("/api/staff/agents/demand/run", { method: "POST" }),
  runInventoryAgent: () => request("/api/staff/agents/inventory/run", { method: "POST" }),
  runBookingConversationAgent: () => request("/api/staff/agents/booking-conversation/run", { method: "POST" }),

  // Assets
  listAssets: () => request("/api/assets"),

  // Reminders
  listReminders: (userId) =>
    request(userId ? `/api/reminders/all?user_id=${userId}` : "/api/reminders/all"),
  dueReminders: (userId) =>
    request(userId ? `/api/reminders/due?user_id=${userId}` : "/api/reminders/due"),
  markReminderSent: (reminderId) =>
    request(`/api/reminders/${reminderId}/mark-sent`, { method: "POST" }),

  // Demo
  demoUsers: () => request("/api/demo/users"),
  runScenarioAgentSwap: () =>
    request("/api/demo/scenario/agent-swap-request", { method: "POST" }),
  runScenarioOverride: () =>
    request("/api/demo/scenario/legitimate-override", { method: "POST" }),
  resetDemo: () => request("/api/demo/reset", { method: "POST" }),
};

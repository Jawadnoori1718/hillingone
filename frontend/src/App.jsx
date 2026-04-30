import { useEffect, useState, useCallback } from "react";
import LoginScreen from "./views/LoginScreen";
import ResidentView from "./views/ResidentView";
import StaffView from "./views/StaffView";
import AgentReasoningPanel from "./components/AgentReasoningPanel";
import { api } from "./api/client";

export default function App() {
  const [user, setUser] = useState(null);
  const [agentRun, setAgentRun] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const all = await api.listReminders(userId);
      setNotifications(all.filter((r) => !r.sent));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications(user.id);
    const id = setInterval(() => fetchNotifications(user.id), 30000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    setUser(null);
    setAgentRun(null);
    setNotifications([]);
  };

  const handleClearNotification = async (id) => {
    await api.markReminderSent(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const isStaff = user.role === "staff" || user.role === "councillor";

  return (
    <>
      {isStaff ? (
        <StaffView
          user={user}
          onLogout={handleLogout}
          onAgentRun={setAgentRun}
          notifications={notifications}
          onClearNotification={handleClearNotification}
        />
      ) : (
        <ResidentView
          user={user}
          onLogout={handleLogout}
          notifications={notifications}
          onClearNotification={handleClearNotification}
          onNotificationsRefresh={() => fetchNotifications(user.id)}
        />
      )}
      <AgentReasoningPanel run={agentRun} onClose={() => setAgentRun(null)} />
    </>
  );
}

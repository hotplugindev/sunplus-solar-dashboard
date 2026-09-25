import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./Toast";

export default function LoginModal() {
  const { login, initialize, isSetupComplete } = useAuth();
  const { addToast } = useToast();
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [dashboardPassword, setDashboardPassword] = useState("");
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(!isSetupComplete);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(password);
      addToast("Logged in successfully", "success");
    } catch (err: any) {
      setError(err?.message ?? "Invalid password");
      addToast("Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (adminPassword.length < 8 || dashboardPassword.length < 8) {
      setError("Passwords must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await initialize(adminPassword, dashboardPassword);
      setIsSetup(false);
      addToast("System initialized successfully", "success");
    } catch (err: any) {
      setError(err?.message ?? "Setup failed");
      addToast("Setup failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-white">
          {isSetup ? "Initial Setup" : "Dashboard Login"}
        </h2>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {isSetup ? (
          <form onSubmit={handleSetup} className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Admin Password</label>
              <p className="text-xs text-gray-600 mb-1">Full access to manage sources and settings. Min 8 characters.</p>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Dashboard Password</label>
              <p className="text-xs text-gray-600 mb-1">Read-only access for viewing metrics. Min 8 characters.</p>
              <input
                type="password"
                value={dashboardPassword}
                onChange={(e) => setDashboardPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-solar-500 text-black font-medium rounded hover:bg-solar-400 disabled:opacity-50"
            >
              {submitting ? "Initializing..." : "Initialize"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Dashboard Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-solar-500 text-black font-medium rounded hover:bg-solar-400 disabled:opacity-50"
            >
              {submitting ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginModal() {
  const { login, initialize, isSetupComplete } = useAuth();
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [dashboardPassword, setDashboardPassword] = useState("");
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(!isSetupComplete);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(password);
    } catch {
      setError("Invalid password");
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await initialize(adminPassword, dashboardPassword);
      setIsSetup(false);
    } catch {
      setError("Setup failed");
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
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Dashboard Password</label>
              <input
                type="password"
                value={dashboardPassword}
                onChange={(e) => setDashboardPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-solar-500 text-black font-medium rounded hover:bg-solar-400"
            >
              Initialize
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
              className="w-full py-2 bg-solar-500 text-black font-medium rounded hover:bg-solar-400"
            >
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

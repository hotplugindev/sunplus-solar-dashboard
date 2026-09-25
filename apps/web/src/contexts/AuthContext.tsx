import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, setToken, clearToken, getToken } from "../lib/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  isSetupComplete: boolean;
  role: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  initialize: (adminPassword: string, dashboardPassword: string) => Promise<void>;
  checkSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const checkSetup = async () => {
    try {
      const res = await api.setup.status();
      setIsSetupComplete(res.setupComplete);
    } catch {
      setIsSetupComplete(false);
    }
  };

  useEffect(() => {
    checkSetup();
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")));
          setRole(payload.role ?? null);
        }
      } catch {}
    }
    const handler = () => { setIsAuthenticated(false); setRole(null); };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = async (password: string) => {
    const res = await api.setup.login({ password, role: "dashboard" });
    setToken(res.token);
    setRole(res.role);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
    setRole(null);
  };

  const initialize = async (adminPassword: string, dashboardPassword: string) => {
    await api.setup.initialize({ admin_password: adminPassword, dashboard_password: dashboardPassword });
    setIsSetupComplete(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isSetupComplete, role, login, logout, initialize, checkSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

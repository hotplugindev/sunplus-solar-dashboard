import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Activity, BarChart3, Settings, Sun, LogOut, HeartPulse } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/status", label: "Status", icon: HeartPulse },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "1": navigate("/dashboard"); break;
        case "2": navigate("/analytics"); break;
        case "3": navigate("/status"); break;
        case "4": navigate("/settings"); break;
        case "r": window.dispatchEvent(new Event("manual:refresh")); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
          <Sun className="h-7 w-7 text-solar-400" />
          <span className="text-lg font-bold tracking-tight">SunPlus</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-solar-500/10 text-solar-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-6 py-4 text-sm text-gray-400 hover:text-red-400 border-t border-gray-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import { useAuth } from "./contexts/AuthContext";
import LoginModal from "./components/LoginModal";

export default function App() {
  const { isAuthenticated, isSetupComplete } = useAuth();

  if (!isSetupComplete || !isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

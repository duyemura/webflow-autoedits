import { Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard.js";
import { SiteChat } from "./pages/SiteChat.js";
import { Connect } from "./pages/Connect.js";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/connect" element={<Connect />} />
      <Route path="/sites/:siteId" element={<SiteChat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

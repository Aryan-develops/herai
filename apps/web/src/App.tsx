import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, RequireConsent, RequireOnboarding } from "@/components/ProtectedRoute";
import { GuardianConsent } from "@/pages/GuardianConsent";
import { ConsentPending } from "@/pages/ConsentPending";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { LogEntry } from "@/pages/LogEntry";
import { Timeline } from "@/pages/Timeline";
import { Cycle } from "@/pages/Cycle";
import { Chat } from "@/pages/Chat";
import { ReportUpload } from "@/pages/ReportUpload";
import { ReportDetail } from "@/pages/ReportDetail";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Guardian-facing: reached from an emailed link, no account needed. */}
        <Route path="/consent/:token" element={<GuardianConsent />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/consent-pending" element={<ConsentPending />} />
          <Route element={<RequireConsent />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<RequireOnboarding />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/log" element={<LogEntry />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/cycle" element={<Cycle />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/reports" element={<ReportUpload />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

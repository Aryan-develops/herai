import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, RequireConsent, RequireDateOfBirth, RequireOnboarding } from "@/components/ProtectedRoute";
import { GuardianConsent } from "@/pages/GuardianConsent";
import { ConsentPending } from "@/pages/ConsentPending";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { OAuthCallback } from "@/pages/OAuthCallback";
import { ConfirmDateOfBirth } from "@/pages/ConfirmDateOfBirth";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { LogEntry } from "@/pages/LogEntry";
import { Timeline } from "@/pages/Timeline";
import { Cycle } from "@/pages/Cycle";
import { Care } from "@/pages/Care";
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
        {/* Creates the session itself (Supabase OAuth code exchange) — must sit
            outside ProtectedRoute, which would otherwise bounce to /login first. */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/confirm-dob" element={<ConfirmDateOfBirth />} />
          <Route path="/consent-pending" element={<ConsentPending />} />
          <Route element={<RequireDateOfBirth />}>
            <Route element={<RequireConsent />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<RequireOnboarding />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/log" element={<LogEntry />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/cycle" element={<Cycle />} />
                <Route path="/care" element={<Care />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/reports" element={<ReportUpload />} />
                <Route path="/reports/:id" element={<ReportDetail />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

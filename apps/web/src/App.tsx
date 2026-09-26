import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { PrefsProvider } from "@/context/PrefsContext";
import { ProtectedRoute, RequireConsent, RequireDateOfBirth, RequireOnboarding } from "@/components/ProtectedRoute";
const GuardianConsent = lazy(() => import("@/pages/GuardianConsent").then((m) => ({ default: m.GuardianConsent })));
const ConsentPending = lazy(() => import("@/pages/ConsentPending").then((m) => ({ default: m.ConsentPending })));
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback").then((m) => ({ default: m.OAuthCallback })));
const ConfirmDateOfBirth = lazy(() => import("@/pages/ConfirmDateOfBirth").then((m) => ({ default: m.ConfirmDateOfBirth })));
const Onboarding = lazy(() => import("@/pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const LogEntry = lazy(() => import("@/pages/LogEntry").then((m) => ({ default: m.LogEntry })));
const Timeline = lazy(() => import("@/pages/Timeline").then((m) => ({ default: m.Timeline })));
const Cycle = lazy(() => import("@/pages/Cycle").then((m) => ({ default: m.Cycle })));
const Care = lazy(() => import("@/pages/Care").then((m) => ({ default: m.Care })));
const CareProviderPage = lazy(() => import("@/pages/CareProviderPage").then((m) => ({ default: m.CareProviderPage })));
const MyRequests = lazy(() => import("@/pages/MyRequests").then((m) => ({ default: m.MyRequests })));
const ProviderDashboard = lazy(() => import("@/pages/ProviderDashboard").then((m) => ({ default: m.ProviderDashboard })));
const Chat = lazy(() => import("@/pages/Chat").then((m) => ({ default: m.Chat })));
const ReportUpload = lazy(() => import("@/pages/ReportUpload").then((m) => ({ default: m.ReportUpload })));
const ReportDetail = lazy(() => import("@/pages/ReportDetail").then((m) => ({ default: m.ReportDetail })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const PartnerHome = lazy(() => import("@/pages/PartnerHome").then((m) => ({ default: m.PartnerHome })));
const PartnerUpgrade = lazy(() => import("@/pages/PartnerUpgrade").then((m) => ({ default: m.PartnerUpgrade })));
const Join = lazy(() => import("@/pages/Join").then((m) => ({ default: m.Join })));

function App() {
  return (
    <AuthProvider>
      <PrefsProvider>
      <ToastProvider>
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-neutral-50 text-neutral-500">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Guardian-facing: reached from an emailed link, no account needed. */}
        <Route path="/consent/:token" element={<GuardianConsent />} />
        {/* Creates the session itself (Supabase OAuth code exchange) — must sit
            outside ProtectedRoute, which would otherwise bounce to /login first. */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        {/* Invite links work signed out: the page remembers the invite through sign-in. */}
        <Route path="/join/:token" element={<Join />} />
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
                <Route path="/care/requests" element={<MyRequests />} />
                <Route path="/care/:id" element={<CareProviderPage />} />
                <Route path="/provider" element={<ProviderDashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/partner" element={<PartnerHome />} />
                <Route path="/partner/upgrade" element={<PartnerUpgrade />} />
                <Route path="/reports" element={<ReportUpload />} />
                <Route path="/reports/:id" element={<ReportDetail />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
      </Suspense>
      </ToastProvider>
      </PrefsProvider>
    </AuthProvider>
  );
}

export default App;

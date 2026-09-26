import { Suspense, lazy, useEffect } from "react";
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

/** Shape of a page while its code loads, so the screen never flashes blank text. */
function PageSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pt-20" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto h-10 w-2/3 rounded-2xl" />
      <div className="skeleton mx-auto mt-4 h-14 w-48 rounded-full" />
      <div className="skeleton mt-8 h-28 w-full rounded-3xl" />
      <div className="skeleton mt-4 h-24 w-full rounded-3xl" />
    </div>
  );
}

// Warm the tabs people open most once the browser is idle, so the first tap doesn't wait on a download.
function prefetchMainTabs() {
  const run = () => {
    void import("@/pages/Dashboard");
    void import("@/pages/Cycle");
    void import("@/pages/LogEntry");
    void import("@/pages/PartnerHome");
    void import("@/pages/Chat");
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(run);
  else setTimeout(run, 2000);
}

function App() {
  useEffect(() => {
    if (localStorage.getItem("herai.session")) prefetchMainTabs();
  }, []);

  return (
    <AuthProvider>
      <PrefsProvider>
      <ToastProvider>
      <Suspense fallback={<PageSkeleton />}>
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

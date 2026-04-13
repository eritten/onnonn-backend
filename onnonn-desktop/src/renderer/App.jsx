import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useOffline } from "./hooks/useOffline";
import { useAuthStore } from "./store/authStore";
import { authService } from "./services/authService";
import { orgService } from "./services/otherServices";

const { LoginPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage } = {
  LoginPage: lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.LoginPage }))),
  RegisterPage: lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.RegisterPage }))),
  VerifyEmailPage: lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.VerifyEmailPage }))),
  ForgotPasswordPage: lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.ForgotPasswordPage })))
};
const { DashboardPage, MeetingsPage, MeetingDetailPage, RecordingsPage, ContactsPage, OrganizationPage, SettingsPage } = {
  DashboardPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.DashboardPage }))),
  MeetingsPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.MeetingsPage }))),
  MeetingDetailPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.MeetingDetailPage }))),
  RecordingsPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.RecordingsPage }))),
  ContactsPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.ContactsPage }))),
  OrganizationPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.OrganizationPage }))),
  SettingsPage: lazy(() => import("./pages/AppPages").then((module) => ({ default: module.SettingsPage })))
};
const MeetingRoomPage = lazy(() => import("./pages/MeetingRoomPage").then((module) => ({ default: module.MeetingRoomPage })));

function ScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 text-brand-muted">
      Loading Onnonn...
    </div>
  );
}

function OfflineBanner() {
  const offline = useOffline();
  if (!offline) {
    return null;
  }

  return (
    <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full border border-brand-warning/40 bg-brand-warning/15 px-5 py-3 text-sm font-medium text-brand-text shadow-panel">
      You are offline. Some Onnonn features may be unavailable until your connection returns.
    </div>
  );
}

function ProtectedRoute({ children }) {
  const status = useAuthStore((state) => state.status);

  if (status === "booting" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-950 text-brand-muted">
        Restoring your workspace...
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const status = useAuthStore((state) => state.status);
  if (status === "authenticated") {
    return <Navigate to="/app/home" replace />;
  }
  return children;
}

function RouteEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const setExternalSession = useAuthStore((state) => state.setExternalSession);

  useEffect(() => {
    const completeGoogleLogin = async (code) => {
      const result = await authService.googleCallback(code);
      if (!result?.accessToken || !result?.refreshToken) {
        throw new Error("Google callback completed, but the backend did not return app session tokens.");
      }
      await setExternalSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        sessionId: result.session?._id,
        user: result.user
      });
      toast.success("Signed in with Google.");
      navigate("/app/home", { replace: true });
    };

    const handleProtocolUrl = async (url) => {
      try {
        const parsed = new URL(url);
        const code = parsed.pathname.includes("/google/callback") ? parsed.searchParams.get("code") : null;
        const state = parsed.searchParams.get("state");
        const email = parsed.searchParams.get("email");
        if (code) {
          if (state === "calendar") {
            await orgService.googleCalendarConnect(code);
            toast.success("Google Calendar connected.");
            navigate("/app/settings", { replace: true });
            return;
          }
          await completeGoogleLogin(code);
          return;
        }
        if (email) {
          navigate("/verify-email", { state: { email } });
        }
      } catch (_error) {
        toast.error("Could not complete the desktop callback.");
      }
    };

    const handleStartInstantMeeting = () => {
      navigate("/app/meetings?new=instant");
    };

    window.electronAPI.getPendingProtocolUrls().then((urls) => {
      urls.forEach((url) => {
        handleProtocolUrl(url).catch(() => {});
      });
    }).catch(() => {});
    window.electronAPI.onProtocolUrl(handleProtocolUrl);
    window.electronAPI.onStartInstantMeeting(handleStartInstantMeeting);
  }, [navigate, setExternalSession]);

  useEffect(() => {
    if (status === "authenticated" && ["/", "/login", "/register"].includes(location.pathname)) {
      navigate("/app/home", { replace: true });
    }
  }, [location.pathname, navigate, status]);

  return null;
}

export default function App() {
  useAuthBootstrap();

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <RouteEvents />
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/meeting-room" element={<MeetingRoomPage />} />

          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/verify-email" element={<PublicOnlyRoute><VerifyEmailPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<DashboardPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="meetings/:meetingId" element={<MeetingDetailPage />} />
            <Route path="recordings" element={<RecordingsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to={useAuthStore.getState().status === "authenticated" ? "/app/home" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

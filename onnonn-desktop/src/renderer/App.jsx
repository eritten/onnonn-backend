import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useOffline } from "./hooks/useOffline";
import { useAuthStore } from "./store/authStore";
import { useUiStore } from "./store/uiStore";
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
  const announce = useUiStore((state) => state.announce);

  useEffect(() => {
    if (offline) {
      announce("You are offline. Some features may be unavailable.");
    }
  }, [announce, offline]);

  if (!offline) {
    return null;
  }

  return (
    <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full border border-brand-warning/40 bg-brand-warning/15 px-5 py-3 text-sm font-medium text-brand-text shadow-panel">
      You are offline. Some Onnonn features may be unavailable until your connection returns.
    </div>
  );
}

function AccessibilityAnnouncer() {
  const announcement = useUiStore((state) => state.announcement);
  const clearAnnouncement = useUiStore((state) => state.clearAnnouncement);

  useEffect(() => {
    if (!announcement) {
      return undefined;
    }
    const timer = window.setTimeout(() => clearAnnouncement(), 2500);
    return () => window.clearTimeout(timer);
  }, [announcement, clearAnnouncement]);

  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
      {announcement}
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
  const applySessionRefresh = useAuthStore((state) => state.applySessionRefresh);
  const consumePendingMeetingJoin = useUiStore((state) => state.consumePendingMeetingJoin);
  const announce = useUiStore((state) => state.announce);

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
        if (parsed.host === "meeting" && parsed.pathname.includes("/join")) {
          const payload = {
            meetingId: parsed.searchParams.get("meetingId"),
            title: parsed.searchParams.get("title") || "Meeting"
          };
          if (!payload.meetingId) {
            throw new Error("Meeting ID was missing from the desktop link.");
          }
          await window.electronAPI.openMeetingWindow(payload);
          announce(`Opening meeting ${payload.title}.`);
          return;
        }
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
        announce("The desktop link could not be completed.");
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
    const offProtocolUrl = window.electronAPI.onProtocolUrl((url) => {
      handleProtocolUrl(url).catch(() => {});
    });
    const offStartInstantMeeting = window.electronAPI.onStartInstantMeeting(handleStartInstantMeeting);
    const offSessionRefreshed = window.electronAPI.onSessionRefreshed((sessionPayload) => {
      applySessionRefresh(sessionPayload).catch((error) => {
        console.error("Failed to apply refreshed desktop session", error);
      });
    });

    return () => {
      offProtocolUrl?.();
      offStartInstantMeeting?.();
      offSessionRefreshed?.();
    };
  }, [announce, applySessionRefresh, navigate, setExternalSession, status]);

  useEffect(() => {
    if (status === "authenticated" && ["/", "/login", "/register"].includes(location.pathname)) {
      navigate("/app/home", { replace: true });
    }
  }, [location.pathname, navigate, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const pendingMeetingJoin = consumePendingMeetingJoin();
    if (!pendingMeetingJoin?.meetingId) {
      return;
    }
    window.electronAPI.openMeetingWindow(pendingMeetingJoin).catch(() => {});
    announce(`Opening meeting ${pendingMeetingJoin.title || pendingMeetingJoin.meetingId}.`);
  }, [announce, consumePendingMeetingJoin, status]);

  return null;
}

function FallbackRoute() {
  const status = useAuthStore((state) => state.status);
  return <Navigate to={status === "authenticated" ? "/app/home" : "/login"} replace />;
}

export default function App() {
  useAuthBootstrap();

  return (
    <ErrorBoundary>
      <AccessibilityAnnouncer />
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

          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

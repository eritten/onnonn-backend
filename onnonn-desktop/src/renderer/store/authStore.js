import { create } from "zustand";
import toast from "react-hot-toast";
import { authService } from "../services/authService";
import { registerAuthHandlers } from "../services/api";
import { getRefreshDelay, getTokenLifetimeMs } from "../utils/jwt";

let refreshTimer;

function buildSessionEnvelope(payload) {
  const tokenLifetimeMs = getTokenLifetimeMs(payload.accessToken);
  const refreshAtMs = tokenLifetimeMs
    ? Date.now() + Math.max(tokenLifetimeMs - 120000, 30000)
    : null;

  return {
    ...payload,
    refreshAtMs
  };
}

export const useAuthStore = create((set, get) => ({
  status: "booting",
  session: null,
  user: null,
  async restore() {
    const stored = await window.electronAPI.getSession();
    if (!stored?.accessToken) {
      set({ status: "anonymous", session: null, user: null });
      return null;
    }

    set({ session: stored, user: stored.user || null, status: "loading" });
    try {
      const user = await authService.me();
      const session = buildSessionEnvelope({ ...stored, user });
      await window.electronAPI.setSession(session);
      set({ session, user, status: "authenticated" });
      get().scheduleRefresh();
      return session;
    } catch (_error) {
      try {
        const refreshed = await get().refreshTokens();
        set({ status: refreshed ? "authenticated" : "anonymous" });
        return refreshed;
      } catch (_refreshError) {
        await get().clearSession();
        return null;
      }
    }
  },
  async login(payload) {
    set({ status: "loading" });
    const result = await authService.login(payload);
    const session = buildSessionEnvelope({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.session?._id
    });
    const user = await authService.me(result.accessToken);
    session.user = user;
    await window.electronAPI.setSession(session);
    set({ session, user, status: "authenticated" });
    get().scheduleRefresh();
    toast.success(`Welcome back, ${user.displayName}`);
    return user;
  },
  async refreshTokens() {
    const session = get().session || await window.electronAPI.getSession();
    if (!session?.refreshToken) {
      return null;
    }
    const refreshed = await authService.refresh(session.refreshToken);
    const user = await authService.me(refreshed.accessToken);
    const nextSession = buildSessionEnvelope({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      sessionId: refreshed.session?._id,
      user
    });
    await window.electronAPI.setSession(nextSession);
    set({ session: nextSession, user, status: "authenticated" });
    get().scheduleRefresh();
    return nextSession;
  },
  async setExternalSession(payload) {
    const session = buildSessionEnvelope({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      sessionId: payload.sessionId,
      user: payload.user || null
    });
    await window.electronAPI.setSession(session);
    set({ session, user: payload.user || null, status: "authenticated" });
    get().scheduleRefresh();
    return session;
  },
  scheduleRefresh() {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }
    const session = get().session;
    const tokenDelay = getRefreshDelay(session?.accessToken);
    const storedDelay = typeof session?.refreshAtMs === "number"
      ? Math.max(session.refreshAtMs - Date.now(), 0)
      : null;
    const delay = storedDelay ?? tokenDelay;
    if (delay === null) {
      return;
    }
    refreshTimer = window.setTimeout(() => {
      get().refreshTokens().catch(() => get().clearSession());
    }, delay);
  },
  async logout() {
    const session = get().session;
    try {
      if (session?.refreshToken) {
        await authService.logout(session.refreshToken);
      }
    } catch (_error) {
      // ignore logout failures and clear local state
    }
    await get().clearSession();
  },
  async clearSession() {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }
    await window.electronAPI.clearSession();
    set({ session: null, user: null, status: "anonymous" });
  }
}));

registerAuthHandlers({
  sessionGetter: () => useAuthStore.getState().session,
  refreshHandler: () => useAuthStore.getState().refreshTokens(),
  unauthorizedHandler: () => useAuthStore.getState().clearSession()
});

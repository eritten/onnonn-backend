import { api } from "./api";

export const authService = {
  register: (payload) => api.post("/auth/register", payload).then((response) => response.data.user),
  login: (payload) => api.post("/auth/login", payload).then((response) => response.data),
  verifyEmail: (payload) => api.post("/auth/verify-email", payload).then((response) => response.data.user),
  resendVerification: (email) => api.post("/auth/resend-verification", { email }).then((response) => response.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((response) => response.data),
  resetPassword: (payload) => api.post("/auth/reset-password", payload).then((response) => response.data),
  me: (accessToken) => api.get("/auth/me", accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined).then((response) => response.data.user),
  refresh: (refreshToken) => api.post("/auth/refresh", { refreshToken }).then((response) => response.data),
  updateProfile: (payload) => api.patch("/auth/profile", payload).then((response) => response.data.user),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }),
  logoutAll: () => api.post("/auth/logout-all"),
  listSessions: () => api.get("/auth/sessions").then((response) => response.data.sessions),
  revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
  changePassword: (payload) => api.post("/auth/change-password", payload),
  setup2FA: () => api.post("/auth/2fa/setup").then((response) => response.data),
  enable2FA: (code) => api.post("/auth/2fa/enable", { code }),
  disable2FA: (password) => api.post("/auth/2fa/disable", { password }),
  getGoogleUrl: () => api.get("/auth/google/url").then((response) => response.data.url),
  googleCallback: (code) => api.get("/auth/google/callback", { params: { code } }).then((response) => response.data)
};

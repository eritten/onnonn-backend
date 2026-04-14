import axios from "axios";
import toast from "react-hot-toast";
import sharedConfig from "@shared/config.json";

const { API_BASE_URL } = sharedConfig;

let getSession = () => null;
let onUnauthorized = async () => null;
let onSessionUpdated = async () => null;
let refreshPromise = null;
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

export function registerAuthHandlers({ sessionGetter, sessionUpdatedHandler, unauthorizedHandler }) {
  getSession = sessionGetter;
  onSessionUpdated = sessionUpdatedHandler;
  onUnauthorized = unauthorizedHandler;
}

export function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

async function refreshStoredSession() {
  const session = getSession();
  if (!session?.refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await refreshClient.post("/auth/refresh", { refreshToken: session.refreshToken });
  const nextSession = {
    ...session,
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken || session.refreshToken,
    sessionId: response.data.session?._id || session.sessionId
  };
  await window.electronAPI.setSession(nextSession);
  return onSessionUpdated(nextSession);
}

function queueRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshStoredSession()
      .catch(async (error) => {
        await window.electronAPI.clearSession();
        await onUnauthorized();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    console.error("Onnonn API request failed", {
      method: originalRequest.method,
      url: originalRequest.url,
      baseURL: originalRequest.baseURL,
      status: error.response?.status,
      response: error.response?.data,
      message: error.message
    });
    if (
      error.response?.status === 401 &&
      !originalRequest.__retry &&
      !String(originalRequest.url || "").includes("/auth/refresh")
    ) {
      originalRequest.__retry = true;
      try {
        const session = await queueRefresh();
        if (session?.accessToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${session.accessToken}`
          };
          return api(originalRequest);
        }
      } catch (_refreshError) {
        console.error("Onnonn API token refresh failed", _refreshError);
      }
    }

    const message = getErrorMessage(error);
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;

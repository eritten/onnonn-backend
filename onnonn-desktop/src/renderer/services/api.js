import axios from "axios";
import toast from "react-hot-toast";
import sharedConfig from "@shared/config.json";

const { API_BASE_URL } = sharedConfig;

let getSession = () => null;
let onRefresh = async () => null;
let onUnauthorized = async () => null;

export function registerAuthHandlers({ sessionGetter, refreshHandler, unauthorizedHandler }) {
  getSession = sessionGetter;
  onRefresh = refreshHandler;
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
    if (error.response?.status === 401 && !originalRequest.__retry) {
      originalRequest.__retry = true;
      try {
        const session = await onRefresh();
        if (session?.accessToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${session.accessToken}`
          };
          return api(originalRequest);
        }
      } catch (_refreshError) {
        await onUnauthorized();
      }
    }

    const message = getErrorMessage(error);
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;

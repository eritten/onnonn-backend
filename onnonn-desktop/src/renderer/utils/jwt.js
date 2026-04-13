import sharedConfig from "@shared/config.json";

const { TOKEN_REFRESH_LEEWAY_MS } = sharedConfig;

export function decodeJwt(token) {
  if (!token) {
    return null;
  }
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(window.atob(normalized));
}

export function getRefreshDelay(token) {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) {
    return null;
  }
  return Math.max((decoded.exp * 1000) - Date.now() - TOKEN_REFRESH_LEEWAY_MS, 0);
}

export function getTokenLifetimeMs(token) {
  const decoded = decodeJwt(token);
  if (!decoded?.exp || !decoded?.iat) {
    return null;
  }

  return Math.max(((decoded.exp - decoded.iat) * 1000), 0);
}

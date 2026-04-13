export function buildDesktopOAuthUrl(url, state = "login") {
  const parsed = new URL(url);
  parsed.searchParams.set("redirect_uri", "onnonn://auth/google/callback");
  parsed.searchParams.set("state", state);
  return parsed.toString();
}

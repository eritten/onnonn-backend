const env = require("../config/env");
const { decrypt, encrypt } = require("../utils/crypto");
const { AuthenticationError, NotFoundError } = require("../utils/errors");
const { CalendarConnection, User } = require("../models");

function buildGoogleOAuthUrl(state = "") {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: env.googleOAuthScope,
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!response.ok) {
    throw new AuthenticationError("Failed to exchange Google OAuth code");
  }
  return response.json();
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new AuthenticationError("Failed to fetch Google user profile");
  }
  return response.json();
}

async function loginWithGoogleCallback(code) {
  const tokens = await exchangeCodeForTokens(code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  let user = await User.findOne({ email: profile.email.toLowerCase() });
  if (!user) {
    user = await User.create({
      email: profile.email.toLowerCase(),
      displayName: profile.name || profile.email.split("@")[0],
      profilePhotoUrl: profile.picture,
      googleId: profile.sub,
      googleAccessTokenEncrypted: encrypt(tokens.access_token),
      googleRefreshTokenEncrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      isEmailVerified: true,
      isActive: true,
      personalRoomId: `pmr-${profile.sub.slice(0, 8)}`
    });
  } else {
    user.googleId = profile.sub;
    user.googleAccessTokenEncrypted = encrypt(tokens.access_token);
    if (tokens.refresh_token) {
      user.googleRefreshTokenEncrypted = encrypt(tokens.refresh_token);
    }
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();
  }
  return { user, tokens, profile };
}

async function connectGoogleCalendar(userId, code) {
  const tokens = await exchangeCodeForTokens(code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  await CalendarConnection.findOneAndUpdate(
    { user: userId },
    {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      calendarId: "primary"
    },
    { upsert: true, new: true }
  );
  return profile;
}

async function getValidGoogleAccessToken(userId) {
  const connection = await CalendarConnection.findOne({ user: userId });
  if (!connection) {
    throw new NotFoundError("Google Calendar is not connected");
  }
  if (connection.expiresAt && connection.expiresAt > new Date()) {
    return decrypt(connection.accessToken);
  }
  if (!connection.refreshToken) {
    throw new AuthenticationError("Google refresh token is unavailable");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: decrypt(connection.refreshToken),
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) {
    throw new AuthenticationError("Failed to refresh Google access token");
  }
  const tokens = await response.json();
  connection.accessToken = encrypt(tokens.access_token);
  connection.expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
  await connection.save();
  return tokens.access_token;
}

module.exports = {
  buildGoogleOAuthUrl,
  loginWithGoogleCallback,
  connectGoogleCalendar,
  getValidGoogleAccessToken
};

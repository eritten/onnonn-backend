const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

function signAccessToken(payload) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiry });
}

function signRefreshToken(payload) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiry });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

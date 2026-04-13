const { asyncHandler } = require("../utils/asyncHandler");
const authService = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.validated.body);
  res.status(201).json({ user });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail({
    email: req.body.email,
    code: req.body.code
  });
  res.json({ user });
});

const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  res.json({ sent: true });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser({
    ...req.validated.body,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip
  });
  res.json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.body.refreshToken);
  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logoutSession(req.body.refreshToken);
  res.status(204).send();
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllSessions(req.user._id);
  res.status(204).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.sendPasswordReset(req.body.email);
  res.json({ sent: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword({
    email: req.body.email,
    code: req.body.code,
    newPassword: req.body.newPassword
  });
  res.status(204).send();
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => res.json({ user: await authService.getCurrentUserProfile(req.user._id) }));
const updateProfile = asyncHandler(async (req, res) => res.json({ user: await authService.updateProfile(req.user._id, req.body) }));
const listSessions = asyncHandler(async (req, res) => res.json({ sessions: await authService.listSessions(req.user._id) }));
const revokeSession = asyncHandler(async (req, res) => { await authService.revokeSession(req.user._id, req.params.sessionId); res.status(204).send(); });
const setupTwoFactor = asyncHandler(async (req, res) => res.json(await authService.generateTwoFactorSetup(req.user._id)));
const enableTwoFactor = asyncHandler(async (req, res) => { await authService.enableTwoFactor(req.user._id, req.body.code); res.status(204).send(); });
const disableTwoFactor = asyncHandler(async (req, res) => { await authService.disableTwoFactor(req.user._id, req.body.password); res.status(204).send(); });

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
  updateProfile,
  listSessions,
  revokeSession,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor
};

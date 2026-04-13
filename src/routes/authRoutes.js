const router = require("express").Router();
const controller = require("../controllers/authController");
const { validate } = require("../middlewares/validate");
const { registerSchema, loginSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } = require("../validators/authValidators");
const { authMiddleware } = require("../middlewares/auth");
const { authRateLimit, refreshRateLimit, recoveryRateLimit } = require("../middlewares/rateLimit");

router.post("/register", authRateLimit, validate(registerSchema), controller.register);
router.post("/verify-email", recoveryRateLimit, validate(verifyEmailSchema), controller.verifyEmail);
router.post("/resend-verification", recoveryRateLimit, validate(resendVerificationSchema), controller.resendVerification);
router.post("/login", authRateLimit, validate(loginSchema), controller.login);
router.post("/refresh", refreshRateLimit, controller.refresh);
router.post("/logout", controller.logout);
router.post("/logout-all", authMiddleware, controller.logoutAll);
router.post("/forgot-password", recoveryRateLimit, validate(forgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password", recoveryRateLimit, validate(resetPasswordSchema), controller.resetPassword);
router.post("/change-password", authMiddleware, controller.changePassword);
router.get("/me", authMiddleware, controller.me);
router.patch("/profile", authMiddleware, controller.updateProfile);
router.get("/sessions", authMiddleware, controller.listSessions);
router.delete("/sessions/:sessionId", authMiddleware, controller.revokeSession);
router.post("/2fa/setup", authMiddleware, controller.setupTwoFactor);
router.post("/2fa/enable", authMiddleware, controller.enableTwoFactor);
router.post("/2fa/disable", authMiddleware, controller.disableTwoFactor);

module.exports = router;

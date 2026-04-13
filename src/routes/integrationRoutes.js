const router = require("express").Router();
const controller = require("../controllers/integrationController");
const { authMiddleware } = require("../middlewares/auth");

/**
 * @swagger
 * /api/v1/auth/google/url:
 *   get:
 *     tags: [Auth]
 *     summary: Get Google OAuth URL
 *     responses:
 *       200:
 *         description: OAuth URL returned
 */
router.get("/auth/google/url", controller.googleLoginUrl);
router.get("/auth/google/callback", controller.googleCallback);
router.post("/calendar/google/connect", authMiddleware, controller.googleCalendarConnect);
router.delete("/calendar/google/disconnect", authMiddleware, controller.googleCalendarDisconnect);
router.get("/calendar/google/status", authMiddleware, controller.googleCalendarStatus);
router.post("/auth/saml/callback", controller.samlCallback);
router.post("/webinars", authMiddleware, controller.createWebinar);
router.post("/webinars/:webinarId/register", controller.registerWebinar);
router.get("/webinars/:webinarId/registrants", authMiddleware, controller.listWebinarRegistrants);
router.post("/webinars/:webinarId/panelist-token", authMiddleware, controller.webinarPanelistToken);
router.post("/webinars/attendee-token", controller.webinarAttendeeToken);
router.post("/webinars/:webinarId/polls", authMiddleware, controller.webinarPoll);
router.post("/webinar-polls/:pollId/responses", controller.webinarPollResponse);
router.post("/webinars/:webinarId/questions", controller.webinarQuestion);
router.get("/webinars/:webinarId/questions", authMiddleware, controller.webinarQuestions);
router.post("/webinars/:webinarId/registrants/:registrantId/promote", authMiddleware, controller.webinarPromote);
router.get("/webinars/:webinarId/analytics", authMiddleware, controller.webinarAnalytics);

module.exports = router;

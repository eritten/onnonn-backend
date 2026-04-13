const router = require("express").Router();
const controller = require("../controllers/aiController");
const { authMiddleware } = require("../middlewares/auth");
const { aiRateLimit } = require("../middlewares/rateLimit");

router.get("/meetings/:meetingId/transcription", authMiddleware, aiRateLimit, controller.getTranscription);
router.post("/meetings/:meetingId/transcription/translate", authMiddleware, aiRateLimit, controller.translate);
router.get("/meetings/:meetingId/summary", authMiddleware, aiRateLimit, controller.getSummary);
router.post("/meetings/:meetingId/summary/regenerate", authMiddleware, aiRateLimit, controller.regenerateSummary);
router.get("/meetings/:meetingId/action-items", authMiddleware, aiRateLimit, controller.listActionItems);
router.post("/action-items/:itemId/complete", authMiddleware, aiRateLimit, controller.completeActionItem);
router.patch("/action-items/:itemId", authMiddleware, aiRateLimit, controller.updateActionItem);
router.delete("/action-items/:itemId", authMiddleware, aiRateLimit, controller.deleteActionItem);
router.get("/meetings/:meetingId/coaching", authMiddleware, aiRateLimit, controller.coaching);
router.get("/meetings/:meetingId/sentiment", authMiddleware, aiRateLimit, controller.sentiment);
router.post("/meetings/:meetingId/assistant", authMiddleware, aiRateLimit, controller.assistant);
router.post("/meetings/:meetingId/agenda", authMiddleware, aiRateLimit, controller.generateAgenda);
router.get("/meetings/:meetingId/agenda", authMiddleware, aiRateLimit, controller.getAgenda);
router.put("/meetings/:meetingId/agenda", authMiddleware, aiRateLimit, controller.updateAgenda);
router.post("/suggestions/title-description", authMiddleware, aiRateLimit, controller.titleSuggestion);
router.post("/meetings/:meetingId/follow-up", authMiddleware, aiRateLimit, controller.followUp);
router.get("/search", authMiddleware, aiRateLimit, controller.search);
router.post("/meetings/:meetingId/captions", authMiddleware, aiRateLimit, controller.captions);

module.exports = router;

const router = require("express").Router();
const controller = require("../controllers/recordingController");
const { authMiddleware } = require("../middlewares/auth");

router.post("/meetings/:meetingId/start", authMiddleware, controller.start);
router.post("/:recordingId/stop", authMiddleware, controller.stop);
router.get("/", authMiddleware, controller.list);
router.get("/:recordingId", authMiddleware, controller.get);
router.delete("/:recordingId", authMiddleware, controller.remove);
router.post("/:recordingId/share", authMiddleware, controller.share);
router.post("/shared/:token", controller.sharedView);

module.exports = router;

const router = require("express").Router();
const controller = require("../controllers/webhookController");

router.post("/stripe", controller.stripe);
router.post("/livekit", controller.livekit);

module.exports = router;

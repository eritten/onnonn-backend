const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { requestIdMiddleware } = require("./middlewares/requestId");
const { requestLoggerMiddleware } = require("./middlewares/requestLogger");
const { notFoundMiddleware } = require("./middlewares/notFound");
const { errorHandlerMiddleware } = require("./middlewares/errorHandler");
const { createSwaggerSpec } = require("./config/swagger");
const env = require("./config/env");
const apiRoutes = require("./routes");
const { healthController } = require("./controllers/healthController");
const { apiRateLimit } = require("./middlewares/rateLimit");
const { queues } = require("./jobs");
const { authMiddleware } = require("./middlewares/auth");
const { authorize } = require("./middlewares/authorize");
const { Meeting } = require("./models");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = new Set([
      env.frontendUrl,
      "https://onnonn.niveel.com",
      "onnonn://",
      "null"
    ]);

    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true
}));
app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api/v1/webhooks/livekit", express.raw({ type: "*/*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

app.get("/health", healthController);
app.get("/join/:meetingId", async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId }).select("meetingId title status");
    if (!meeting) {
      res.status(404).type("html").send("<!doctype html><html><body><h1>Meeting not found</h1><p>The meeting link may be invalid or expired.</p></body></html>");
      return;
    }

    const desktopUrl = `onnonn://meeting/join?meetingId=${encodeURIComponent(meeting.meetingId)}&title=${encodeURIComponent(meeting.title || "Meeting")}`;
    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Open ${meeting.title || "Meeting"} in Onnonn</title>
    <style>
      body { margin:0; font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:#0F172A; color:#E2E8F0; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
      .card { max-width:640px; width:100%; background:#111827; border:1px solid #334155; border-radius:24px; padding:32px; box-shadow:0 24px 60px rgba(0,0,0,.35); }
      .eyebrow { display:inline-block; margin-bottom:16px; padding:6px 12px; border-radius:999px; background:rgba(99,102,241,.15); color:#A5B4FC; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
      h1 { margin:0 0 12px; font-size:32px; line-height:1.15; }
      p { margin:0 0 16px; color:#94A3B8; line-height:1.6; }
      .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:24px; }
      a, button { border:0; border-radius:14px; padding:14px 18px; font-size:15px; font-weight:700; cursor:pointer; text-decoration:none; }
      .primary { background:#6366F1; color:white; }
      .secondary { background:#1E293B; color:#E2E8F0; border:1px solid #334155; }
      .meta { margin-top:20px; font-size:13px; color:#64748B; }
      code { color:#CBD5E1; }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="eyebrow">Onnonn Meeting</div>
      <h1>${meeting.title || "Join your meeting"}</h1>
      <p>We’re opening the Onnonn desktop app so you can join securely. If nothing happens, use the button below.</p>
      <div class="actions">
        <a class="primary" href="${desktopUrl}">Open in Onnonn</a>
        <button class="secondary" id="copy-link" type="button">Copy app link</button>
      </div>
      <p class="meta">Meeting ID: <code>${meeting.meetingId}</code>${meeting.status ? ` · Status: <code>${meeting.status}</code>` : ""}</p>
    </main>
    <script>
      const desktopUrl = ${JSON.stringify(desktopUrl)};
      window.setTimeout(() => { window.location.href = desktopUrl; }, 150);
      document.getElementById("copy-link").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(desktopUrl);
          document.getElementById("copy-link").textContent = "App link copied";
        } catch (_error) {
          document.getElementById("copy-link").textContent = desktopUrl;
        }
      });
    </script>
  </body>
</html>`);
  } catch (error) {
    next(error);
  }
});
app.use(apiRateLimit);
app.use("/api/v1", apiRoutes);

const swaggerSpec = createSwaggerSpec();
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: Object.values(queues).map((queue) => new BullAdapter(queue)),
  serverAdapter
});
app.use("/admin/queues", authMiddleware, authorize("superadmin"), serverAdapter.getRouter());

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;

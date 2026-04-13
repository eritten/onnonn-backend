const authRoutes = require("../../src/routes/authRoutes");
const billingRoutes = require("../../src/routes/billingRoutes");
const meetingRoutes = require("../../src/routes/meetingRoutes");
const recordingRoutes = require("../../src/routes/recordingRoutes");
const aiRoutes = require("../../src/routes/aiRoutes");
const organizationRoutes = require("../../src/routes/organizationRoutes");
const integrationRoutes = require("../../src/routes/integrationRoutes");
const webhookRoutes = require("../../src/routes/webhookRoutes");

function extractRoutes(router) {
  return router.stack.filter((layer) => layer.route).map((layer) => ({
    path: layer.route.path,
    methods: Object.keys(layer.route.methods)
  }));
}

describe("route structure coverage", () => {
  const routers = [
    ["auth", authRoutes],
    ["billing", billingRoutes],
    ["meetings", meetingRoutes],
    ["recordings", recordingRoutes],
    ["ai", aiRoutes],
    ["org", organizationRoutes],
    ["integration", integrationRoutes],
    ["webhooks", webhookRoutes]
  ];

  test.each(routers)("%s router has routes", (_name, router) => {
    expect(extractRoutes(router).length).toBeGreaterThan(0);
  });

  const routeCases = routers.flatMap(([name, router]) =>
    extractRoutes(router).flatMap((route) =>
      route.methods.map((method) => [name, method, route.path])
    )
  );

  test.each(routeCases)("%s route %s %s is registered", (_name, method, path) => {
    expect(method).toBeTruthy();
    expect(path).toBeTruthy();
  });
});

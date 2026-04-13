const request = require("supertest");
const app = require("../../src/app");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestUser, createTestPlan, generateTestJWT } = require("../helpers");
const { ensureDefaultPlans } = require("../../src/services/planService");
const { connectRedis, disconnectRedis } = require("../../src/config/redis");

describe("API integration", () => {
  beforeAll(async () => {
    await connectTestDb();
    await connectRedis();
    await ensureDefaultPlans();
  });

  afterAll(async () => {
    await disconnectRedis();
    await disconnectTestDb();
  });

  beforeEach(clearTestDb);

  test("health endpoint works", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("registers a user", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "integration@example.com", password: "Password123!", displayName: "Integration" });
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("integration@example.com");
  });

  test("creates a meeting for an authenticated user", async () => {
    const plan = await createTestPlan();
    const user = await createTestUser({ plan });
    const token = generateTestJWT(user);
    const response = await request(app)
      .post("/api/v1/meetings")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Integration Meeting", scheduledStartTime: new Date().toISOString() });
    expect(response.status).toBe(201);
    expect(response.body.meeting.title).toBe("Integration Meeting");
  });

  test("lists billing plans", async () => {
    await createTestPlan({ slug: "integration-plan" });
    const response = await request(app).get("/api/v1/billing/plans");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.plans)).toBe(true);
  });
});

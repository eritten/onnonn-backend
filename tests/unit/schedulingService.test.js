const schedulingService = require("../../src/services/schedulingService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestUser, createTestPlan } = require("../helpers");

describe("schedulingService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("sets availability and lists slots", async () => {
    const plan = await createTestPlan();
    const user = await createTestUser({ plan });
    await schedulingService.upsertAvailability(user._id, {
      bookingHandle: "tester",
      slots: [{ dayOfWeek: new Date().getDay(), startTime: "09:00", endTime: "17:00" }]
    });
    const slots = await schedulingService.listAvailableSlots("tester");
    expect(slots.length).toBeGreaterThan(0);
  });
});

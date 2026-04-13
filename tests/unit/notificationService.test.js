const notificationService = require("../../src/services/notificationService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestUser } = require("../helpers");

describe("notificationService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("creates notifications and preferences", async () => {
    const user = await createTestUser();
    const notification = await notificationService.createNotification({
      userId: user._id,
      type: "test",
      title: "Hello",
      message: "World"
    });
    expect(notification.type).toBe("test");
    const preferences = await notificationService.getPreferences(user._id);
    expect(preferences.user.toString()).toBe(user._id.toString());
  });
});

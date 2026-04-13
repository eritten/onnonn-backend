const gdprService = require("../../src/services/gdprService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestUser } = require("../helpers");
const { GDPRRequest } = require("../../src/models");

describe("gdprService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("creates and processes export request", async () => {
    const user = await createTestUser();
    const request = await gdprService.createGdprRequest(user._id, "export");
    const processed = await gdprService.processGdprRequest(request._id);
    expect(processed.status).toBe("completed");
    expect(await GDPRRequest.countDocuments()).toBe(1);
  });
});

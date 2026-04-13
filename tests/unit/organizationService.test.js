const organizationService = require("../../src/services/organizationService");
const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
const { createTestUser } = require("../helpers");
const { OrganizationMember, Department } = require("../../src/models");

describe("organizationService", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearTestDb);

  test("creates organization and department", async () => {
    const owner = await createTestUser();
    const organization = await organizationService.createOrganization(owner._id, { name: "Acme" });
    expect(await OrganizationMember.countDocuments({ organization: organization._id })).toBe(1);
    await organizationService.createDepartment(organization._id, { name: "Engineering" });
    expect(await Department.countDocuments()).toBe(1);
  });
});

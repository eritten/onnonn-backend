const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDatabase, disconnectDatabase } = require("../config/db");
const { ensureDefaultPlans, getFreePlan } = require("../services/planService");
const { User, Organization, Meeting, Recording, Subscription } = require("../models");
const { createMeeting } = require("../services/meetingService");

async function seed() {
  await connectDatabase();
  await ensureDefaultPlans();
  await mongoose.connection.dropDatabase();
  await ensureDefaultPlans();
  const freePlan = await getFreePlan();
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const users = await User.insertMany([
    { email: "alice@example.com", passwordHash, displayName: "Alice Host", isEmailVerified: true, isActive: true, stripeCustomerId: "cus_seed_1", personalRoomId: "pmr-alice" },
    { email: "bob@example.com", passwordHash, displayName: "Bob Admin", isEmailVerified: true, isActive: true, stripeCustomerId: "cus_seed_2", role: "organization_admin", personalRoomId: "pmr-bob" },
    { email: "sam@example.com", passwordHash, displayName: "Sam Superadmin", isEmailVerified: true, isActive: true, stripeCustomerId: "cus_seed_3", role: "superadmin", personalRoomId: "pmr-sam" }
  ]);
  await Subscription.insertMany(users.map((user) => ({ user: user._id, plan: freePlan._id, stripeCustomerId: user.stripeCustomerId, status: "active" })));
  const organization = await Organization.create({ name: "Onnonn Demo Org", owner: users[1]._id, industry: "Software", size: "51-200" });
  const meeting = await createMeeting(users[0]._id, { title: "Seed Demo Meeting", scheduledStartTime: new Date(), expectedDuration: 30, meetingType: "group" });
  await Recording.create({ meeting: meeting._id, host: users[0]._id, status: "ready", fileUrl: "https://example.com/demo.mp4", fileSizeBytes: 1024, storageProvider: "cloudinary" });
  console.log(`Seed complete for organization ${organization.name}`);
}

seed().finally(async () => {
  await disconnectDatabase();
  process.exit(0);
});

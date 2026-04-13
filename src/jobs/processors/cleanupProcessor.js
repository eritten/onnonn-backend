const dayjs = require("dayjs");
const { Recording, PasswordResetToken, EmailVerificationToken, OrganizationInvitation, AuditLog, Subscription, Plan } = require("../../models");

module.exports = async function cleanupProcessor() {
  const freePlan = await Plan.findOne({ slug: "free" });
  const freeSubs = await Subscription.find({ plan: freePlan?._id }).select("user");
  const freeUserIds = freeSubs.map((sub) => sub.user);
  const deleted = await Recording.deleteMany({
    host: { $in: freeUserIds },
    createdAt: { $lt: dayjs().subtract(7, "day").toDate() }
  });
  await PasswordResetToken.deleteMany({ expiresAt: { $lt: new Date() } });
  await EmailVerificationToken.deleteMany({ expiresAt: { $lt: new Date() } });
  await OrganizationInvitation.deleteMany({ expiresAt: { $lt: new Date() } });
  await AuditLog.deleteMany({ timestamp: { $lt: dayjs().subtract(180, "day").toDate() } });
  return { deletedRecordings: deleted.deletedCount };
};

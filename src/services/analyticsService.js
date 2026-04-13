const { Meeting, Recording, Subscription, User, PlatformMetrics, OrganizationMember } = require("../models");

async function computeMeetingAnalytics(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  const recording = await Recording.findOne({ meeting: meetingId, status: "ready" });
  const participantCount = meeting.analytics?.participantCount || 0;
  meeting.analytics = {
    totalDuration: meeting.actualDuration || 0,
    scheduledVsActualDiff: (meeting.actualDuration || 0) - (meeting.expectedDuration || 0),
    participantCount,
    peakConcurrent: meeting.analytics?.peakConcurrent || participantCount,
    perParticipantEngagement: meeting.analytics?.perParticipantEngagement || [],
    recordingDuration: recording?.duration || 0,
    pollParticipationRate: meeting.analytics?.pollParticipationRate || 0,
    qnaCount: meeting.analytics?.qnaCount || 0,
    avgNetworkQuality: meeting.analytics?.avgNetworkQuality || 0,
    chatMessageCount: meeting.analytics?.chatMessageCount || 0,
    reactionCount: meeting.reactions?.length || 0,
    engagementScore: Math.round((((meeting.reactions?.length || 0) * 2) + (meeting.analytics?.chatMessageCount || 0) + ((meeting.analytics?.pollParticipationRate || 0) * 100)) / Math.max(participantCount || 1, 1))
  };
  await meeting.save();
  return meeting.analytics;
}

async function getUserAnalytics(userId) {
  const [meetingsHosted, recordings, subscription] = await Promise.all([
    Meeting.find({ host: userId }),
    Recording.find({ host: userId, status: "ready" }),
    Subscription.findOne({ user: userId })
  ]);
  return {
    totalMeetingsHosted: meetingsHosted.length,
    totalMinutesHosted: meetingsHosted.reduce((sum, meeting) => sum + (meeting.actualDuration || 0), 0),
    totalRecordingStorageBytes: recordings.reduce((sum, recording) => sum + (recording.fileSizeBytes || 0), 0),
    aiUsageTranslations: subscription?.aiTranslationCount || 0
  };
}

async function getOrganizationAnalytics(organizationId) {
  const members = await OrganizationMember.find({ organization: organizationId });
  const userIds = members.map((member) => member.user);
  const meetings = await Meeting.find({ host: { $in: userIds } });
  return { totalMeetings: meetings.length, totalMinutes: meetings.reduce((sum, meeting) => sum + (meeting.actualDuration || 0), 0) };
}

async function getSuperadminAnalytics() {
  const [users, subscriptions, meetings, metrics] = await Promise.all([
    User.countDocuments(),
    Subscription.find().populate("plan"),
    Meeting.find(),
    PlatformMetrics.find().sort({ metricDate: -1 }).limit(30)
  ]);
  return {
    totalUsers: users,
    subscriptionsByPlan: subscriptions.reduce((accumulator, subscription) => {
      const planName = subscription.plan?.name || "Unknown";
      accumulator[planName] = (accumulator[planName] || 0) + 1;
      return accumulator;
    }, {}),
    meetingsToday: meetings.filter((meeting) => meeting.createdAt >= new Date(new Date().setHours(0, 0, 0, 0))).length,
    totalStorageUsed: subscriptions.reduce((sum, subscription) => sum + (subscription.storageUsedBytes || 0), 0),
    openAiCostsLast30Days: metrics.reduce((sum, entry) => sum + (entry.openAiUsageCost || 0), 0)
  };
}

module.exports = { computeMeetingAnalytics, getUserAnalytics, getOrganizationAnalytics, getSuperadminAnalytics };

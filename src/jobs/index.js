const Bull = require("bull");
const env = require("../config/env");
const { logger } = require("../config/logger");
const processors = {
  email: require("./processors/emailProcessor"),
  push: require("./processors/pushProcessor"),
  "recording-processing": require("./processors/recordingProcessingProcessor"),
  "ai-transcription": require("./processors/aiTranscriptionProcessor"),
  "ai-summary": require("./processors/aiSummaryProcessor"),
  "ai-analysis": require("./processors/aiAnalysisProcessor"),
  reminder: require("./processors/reminderProcessor"),
  cleanup: require("./processors/cleanupProcessor"),
  subscription: require("./processors/subscriptionProcessor"),
  gdpr: require("./processors/gdprProcessor"),
  "calendar-sync": require("./processors/calendarSyncProcessor"),
  "availability-booking": require("./processors/availabilityBookingProcessor"),
  analytics: require("./processors/analyticsProcessor"),
  "follow-up-email": require("./processors/followUpEmailProcessor")
};

const queueNames = [
  "email",
  "push",
  "recording-processing",
  "ai-transcription",
  "ai-summary",
  "ai-analysis",
  "reminder",
  "cleanup",
  "subscription",
  "gdpr",
  "calendar-sync",
  "availability-booking",
  "analytics",
  "follow-up-email"
];

const queues = {};

async function initQueues() {
  for (const name of queueNames) {
    queues[name] = new Bull(name, env.redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    queues[name].process(async (job) => {
      logger.info("Queue job started", { queue: name, jobId: job.id, data: job.data });
      return processors[name](job);
    });
  }
}

function getQueue(name) {
  return queues[name];
}

async function closeQueues() {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
}

module.exports = { initQueues, getQueue, closeQueues, queues };

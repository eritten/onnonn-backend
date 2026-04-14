const env = require("../config/env");
const { Plan } = require("../models");

const defaultPlans = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    stripePriceId: env.stripeFreePlanPriceId,
    limits: {
      maxMeetingDurationMinutes: 40,
      maxParticipantsPerMeeting: 100,
      cloudRecordingStorageGb: 2,
      flags: {
        cloudRecording: true,
        aiTranscription: false,
        aiSummary: false,
        smartNotes: false,
        actionItems: false
      }
    }
  },
  {
    name: "Pro",
    slug: "pro",
    price: 1999,
    stripePriceId: env.stripeProPlanPriceId,
    limits: {
      maxMeetingDurationMinutes: 0,
      maxParticipantsPerMeeting: 300,
      cloudRecordingStorageGb: 5,
      flags: {
        cloudRecording: true,
        aiTranscription: true,
        aiSummary: true,
        smartNotes: true,
        actionItems: true
      }
    }
  },
  {
    name: "Business",
    slug: "business",
    price: 4999,
    stripePriceId: env.stripeBusinessPlanPriceId,
    limits: {
      maxMeetingDurationMinutes: 0,
      maxParticipantsPerMeeting: 1000,
      cloudRecordingStorageGb: Number.MAX_SAFE_INTEGER,
      flags: {
        cloudRecording: true,
        aiTranscription: true,
        aiSummary: true,
        smartNotes: true,
        actionItems: true,
        sentiment: true,
        coaching: true,
        sso: true,
        ipAllowlisting: true,
        analytics: true
      }
    }
  }
];

async function ensureDefaultPlans() {
  for (const plan of defaultPlans) {
    await Plan.findOneAndUpdate({ slug: plan.slug }, plan, { upsert: true, new: true });
  }

  await Plan.updateOne(
    { slug: "free" },
    {
      $set: {
        name: "Free",
        price: 0,
        stripePriceId: env.stripeFreePlanPriceId,
        "limits.maxMeetingDurationMinutes": 40,
        "limits.maxParticipantsPerMeeting": 100,
        "limits.cloudRecordingStorageGb": 2,
        "limits.flags.cloudRecording": true
      }
    }
  );
}

async function getFreePlan() {
  await ensureDefaultPlans();
  return Plan.findOne({ slug: "free" });
}

async function listPlans() {
  await ensureDefaultPlans();
  return Plan.find().sort({ price: 1 });
}

module.exports = { ensureDefaultPlans, getFreePlan, listPlans };

const { z } = require("zod");

const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    scheduledStartTime: z.string().datetime().optional(),
    expectedDuration: z.number().int().positive().optional(),
    maxParticipants: z.number().int().positive().optional(),
    password: z.string().min(4).optional(),
    waitingRoomEnabled: z.boolean().optional(),
    joinBeforeHost: z.boolean().optional(),
    muteOnEntry: z.boolean().optional(),
    allowSelfUnmute: z.boolean().optional(),
    autoRecord: z.boolean().optional(),
    meetingType: z.enum(["one-on-one", "group", "webinar"]).optional(),
    e2eEncryptionEnabled: z.boolean().optional(),
    personalRoom: z.boolean().optional(),
    invitedParticipants: z.array(z.object({
      userId: z.string().optional(),
      email: z.string().email().optional(),
      name: z.string().optional(),
      role: z.enum(["participant", "guest", "cohost"]).optional()
    }).refine((value) => Boolean(value.userId || value.email), {
      message: "Each invited participant must include a userId or email"
    })).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

module.exports = { createMeetingSchema };

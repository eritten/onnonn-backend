const { z } = require("zod");

const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    scheduledStartTime: z.string().datetime().optional(),
    instantMeeting: z.boolean().optional(),
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

const respondPollSchema = z.object({
  body: z.object({
    participantId: z.string().optional(),
    guestName: z.string().optional(),
    selectedOption: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
    optionIndex: z.number().int().nonnegative().optional(),
    optionValue: z.string().min(1).optional()
  }).refine((value) => value.selectedOption !== undefined || value.optionIndex !== undefined || value.optionValue !== undefined, {
    message: "A poll response must include selectedOption, optionIndex, or optionValue"
  }),
  query: z.object({}).optional(),
  params: z.object({
    pollId: z.string().min(1)
  })
});

module.exports = { createMeetingSchema, respondPollSchema };

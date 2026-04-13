const dayjs = require("dayjs");
const { Availability, AvailabilityBooking } = require("../models");
const { createMeeting } = require("./meetingService");
const { sendEmail } = require("./notificationService");
const { NotFoundError, ConflictError } = require("../utils/errors");

async function upsertAvailability(userId, payload) {
  return Availability.findOneAndUpdate({ user: userId }, payload, { upsert: true, new: true });
}

async function getAvailabilityByHandle(handle) {
  const availability = await Availability.findOne({ bookingHandle: handle, isActive: true }).populate("user");
  if (!availability) {
    throw new NotFoundError("Availability page not found");
  }
  return availability;
}

async function listAvailableSlots(handle) {
  const availability = await getAvailabilityByHandle(handle);
  const slots = [];
  const now = dayjs();
  for (let offset = 0; offset < 30; offset += 1) {
    const date = now.add(offset, "day");
    const matching = availability.slots.filter((slot) => slot.dayOfWeek === date.day());
    for (const slot of matching) {
      const [hour, minute] = slot.startTime.split(":").map(Number);
      slots.push(date.hour(hour).minute(minute).second(0).millisecond(0).toISOString());
    }
  }
  return slots;
}

async function bookAvailability(handle, payload) {
  const availability = await getAvailabilityByHandle(handle);
  const existing = await AvailabilityBooking.findOne({
    availability: availability._id,
    scheduledTime: new Date(payload.scheduledTime),
    status: "scheduled"
  });
  if (existing) {
    throw new ConflictError("That slot has already been booked");
  }
  const meeting = await createMeeting(availability.user._id, {
    title: payload.title || `Meeting with ${payload.bookerName}`,
    scheduledStartTime: payload.scheduledTime,
    expectedDuration: availability.meetingDuration,
    meetingType: "one-on-one"
  });
  const booking = await AvailabilityBooking.create({
    availability: availability._id,
    bookerName: payload.bookerName,
    bookerEmail: payload.bookerEmail,
    bookerUserId: payload.bookerUserId,
    scheduledTime: payload.scheduledTime,
    meetingId: meeting._id
  });
  await sendEmail({
    to: payload.bookerEmail,
    template: "meetingInvitation",
    variables: {
      recipientName: payload.bookerName,
      title: meeting.title,
      joinUrl: meeting.joinUrl,
      scheduledTime: new Date(payload.scheduledTime).toISOString()
    }
  });
  return { booking, meeting };
}

module.exports = { upsertAvailability, getAvailabilityByHandle, listAvailableSlots, bookAvailability };

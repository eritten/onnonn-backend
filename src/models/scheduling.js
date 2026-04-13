const mongoose = require("mongoose");
const { Schema, auditFields } = require("./common");

const calendarConnectionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  accessToken: String,
  refreshToken: String,
  expiresAt: Date,
  calendarId: String,
  ...auditFields
});

const availabilitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  bookingHandle: { type: String, required: true, unique: true, index: true },
  slots: [
    {
      dayOfWeek: { type: Number, min: 0, max: 6, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    }
  ],
  bufferMinutes: { type: Number, default: 15 },
  meetingDuration: { type: Number, default: 30 },
  isActive: { type: Boolean, default: true },
  ...auditFields
});

const availabilityBookingSchema = new Schema({
  availability: { type: Schema.Types.ObjectId, ref: "Availability", required: true, index: true },
  bookerName: { type: String, required: true },
  bookerEmail: { type: String, required: true, lowercase: true, trim: true },
  bookerUserId: { type: Schema.Types.ObjectId, ref: "User" },
  scheduledTime: { type: Date, required: true, index: true },
  meetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
  status: { type: String, enum: ["scheduled", "cancelled", "completed"], default: "scheduled" },
  ...auditFields
});

module.exports = {
  CalendarConnection: mongoose.model("CalendarConnection", calendarConnectionSchema),
  Availability: mongoose.model("Availability", availabilitySchema),
  AvailabilityBooking: mongoose.model("AvailabilityBooking", availabilityBookingSchema)
};

const mongoose = require("mongoose");
const { Schema, auditFields } = require("./common");

const contactSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "blocked"], default: "pending", index: true },
  ...auditFields
});
contactSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const contactRequestSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "blocked"], default: "pending" },
  ...auditFields
});

module.exports = {
  Contact: mongoose.model("Contact", contactSchema),
  ContactRequest: mongoose.model("ContactRequest", contactRequestSchema)
};

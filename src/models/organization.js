const mongoose = require("mongoose");
const { Schema, auditFields } = require("./common");

const ssoConfigurationSchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
  idpEntityId: String,
  idpSsoUrl: String,
  idpCertificate: String,
  spEntityId: String,
  attributeMapping: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: false },
  ...auditFields
});

const organizationSchema = new Schema({
  name: { type: String, required: true, index: true },
  logo: String,
  industry: String,
  size: String,
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  billingSettings: { type: Schema.Types.Mixed, default: {} },
  securityPolicy: {
    recordingConsentRequired: { type: Boolean, default: false },
    waitingRoomRequired: { type: Boolean, default: false },
    restrictToOrgMembers: { type: Boolean, default: false },
    allowedDomains: [{ type: String }],
    allowedCidrs: [{ type: String }]
  },
  defaultMeetingSettings: { type: Schema.Types.Mixed, default: {} },
  ssoConfiguration: { type: Schema.Types.ObjectId, ref: "SSOConfiguration" },
  ...auditFields
});

const organizationMemberSchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  department: { type: Schema.Types.ObjectId, ref: "Department" },
  joinedAt: { type: Date, default: Date.now },
  ...auditFields
});
organizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });

const departmentSchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true },
  description: String,
  memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  ...auditFields
});

const organizationInvitationSchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedAt: Date,
  ...auditFields
});

module.exports = {
  Organization: mongoose.model("Organization", organizationSchema),
  OrganizationMember: mongoose.model("OrganizationMember", organizationMemberSchema),
  Department: mongoose.model("Department", departmentSchema),
  SSOConfiguration: mongoose.model("SSOConfiguration", ssoConfigurationSchema),
  OrganizationInvitation: mongoose.model("OrganizationInvitation", organizationInvitationSchema)
};

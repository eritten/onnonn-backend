jest.mock("ioredis", () => require("ioredis-mock"));
process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "test-livekit-key";
process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "test-livekit-secret";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";
jest.mock("ip-cidr", () => {
  return jest.fn().mockImplementation(() => ({
    contains: jest.fn().mockReturnValue(true)
  }));
});

jest.mock("../src/config/mailer", () => ({
  transporter: { sendMail: jest.fn().mockResolvedValue({ messageId: "test-message" }) }
}));

jest.mock("../src/config/firebase", () => ({
  firebaseAdmin: {
    apps: [{}],
    messaging: () => ({
      send: jest.fn().mockResolvedValue("message-id")
    })
  }
}));

jest.mock("../src/config/cloudinary", () => ({
  cloudinary: {
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: "https://cloudinary.test/file", bytes: 128, public_id: "pid" }),
      destroy: jest.fn().mockResolvedValue({ result: "ok" })
    }
  }
}));

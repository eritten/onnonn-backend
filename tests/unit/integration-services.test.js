describe("integration wrapper services", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("googleService builds auth URL and exchanges calendar tokens", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ email: "google@example.com", sub: "sub1", name: "Google User", picture: "pic" }) });
    const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
    const { createTestUser } = require("../helpers");
    await connectTestDb();
    await clearTestDb();
    const user = await createTestUser({ email: "google@example.com" });
    const googleService = require("../../src/services/googleService");
    expect(googleService.buildGoogleOAuthUrl("state")).toContain("state=state");
    const profile = await googleService.connectGoogleCalendar(user._id, "code");
    expect(profile.email).toBe("google@example.com");
    await disconnectTestDb();
  });

  test("googleService login callback links accounts", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ email: "oauth@example.com", sub: "sub2", name: "OAuth User", picture: "pic" }) });
    const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
    await connectTestDb();
    await clearTestDb();
    const googleService = require("../../src/services/googleService");
    const result = await googleService.loginWithGoogleCallback("code");
    expect(result.user.email).toBe("oauth@example.com");
    await disconnectTestDb();
  });

  test("calendarService syncs create update delete and status", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "event1" }), status: 200 });
    jest.doMock("../../src/services/googleService", () => ({ getValidGoogleAccessToken: jest.fn().mockResolvedValue("token") }));
    const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
    const { createTestUser, createTestMeeting } = require("../helpers");
    const { CalendarConnection, Meeting } = require("../../src/models");
    await connectTestDb();
    await clearTestDb();
    const user = await createTestUser({ email: "cal@example.com" });
    await CalendarConnection.create({ user: user._id, accessToken: "x", refreshToken: "y", calendarId: "primary" });
    const meeting = await createTestMeeting(user, { title: "Calendar Meeting" });
    const calendarService = require("../../src/services/calendarService");
    expect((await calendarService.getCalendarStatus(user._id)).connected).toBe(true);
    await calendarService.syncMeetingCreate(meeting._id);
    await Meeting.findByIdAndUpdate(meeting._id, { title: "Updated" });
    await calendarService.syncMeetingUpdate(meeting._id);
    await calendarService.syncMeetingDelete(meeting._id);
    await calendarService.disconnectGoogleCalendar(user._id);
    await disconnectTestDb();
  });

  test("ssoService validates callback and returns jwt", async () => {
    const { connectTestDb, disconnectTestDb, clearTestDb } = require("../helpers/testDb");
    const { Organization, SSOConfiguration } = require("../../src/models");
    const { createTestUser } = require("../helpers");
    await connectTestDb();
    await clearTestDb();
    const owner = await createTestUser({ email: "owner@sso.com" });
    const org = await Organization.create({ name: "SSO Org", owner: owner._id });
    await SSOConfiguration.create({ organization: org._id, idpEntityId: "issuer", idpCertificate: "CERT", isActive: true });
    const ssoService = require("../../src/services/ssoService");
    const xml = `<Response><Issuer>issuer</Issuer><NameID>user@sso.com</NameID><AttributeValue>user@sso.com</AttributeValue></Response>`;
    const result = await ssoService.handleSamlCallback(Buffer.from(xml).toString("base64"));
    expect(result.accessToken).toBeTruthy();
    await disconnectTestDb();
  });

  test("openaiService chat, moderation and embeddings work with mocks", async () => {
    jest.doMock("../../src/config/openai", () => ({
      openai: {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }) } },
        moderations: { create: jest.fn().mockResolvedValue({ results: [{ flagged: false }] }) },
        embeddings: { create: jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] }) }
      }
    }));
    const openaiService = require("../../src/services/openaiService");
    expect((await openaiService.chatJson({ system: "s", user: "u", jsonSchemaHint: "{}" })).ok).toBe(true);
    expect((await openaiService.moderation("hello")).flagged).toBe(false);
    expect((await openaiService.createEmbedding("hello")).length).toBe(2);
  });

  test("stripeService supports customer, checkout, setup intent and webhook", async () => {
    jest.doMock("../../src/config/stripe", () => ({
      stripe: {
        customers: { create: jest.fn().mockResolvedValue({ id: "cus_1" }) },
        checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: "http://checkout" }) } },
        setupIntents: { create: jest.fn().mockResolvedValue({ client_secret: "secret" }) },
        webhooks: { constructEvent: jest.fn().mockReturnValue({ type: "ok" }) }
      }
    }));
    const stripeService = require("../../src/services/stripeService");
    expect((await stripeService.createCustomer({ email: "a@b.com", name: "A" })).id).toBe("cus_1");
    expect((await stripeService.createCheckoutSession({ customerId: "c", priceId: "p" })).url).toContain("checkout");
    expect((await stripeService.createSetupIntent("c")).client_secret).toBe("secret");
    expect(stripeService.verifyStripeWebhook("{}", "sig").type).toBe("ok");
  });

  test("livekitService and storageService wrappers execute", async () => {
    jest.doMock("../../src/config/livekit", () => ({
      roomService: {
        createRoom: jest.fn().mockResolvedValue({ name: "room" }),
        deleteRoom: jest.fn().mockResolvedValue({}),
        listParticipants: jest.fn().mockResolvedValue([]),
        removeParticipant: jest.fn().mockResolvedValue({}),
        mutePublishedTrack: jest.fn().mockResolvedValue({}),
        sendData: jest.fn().mockResolvedValue({})
      },
      egressClient: {
        startRoomCompositeEgress: jest.fn().mockResolvedValue({ egressId: "eg1" }),
        stopEgress: jest.fn().mockResolvedValue({})
      },
      livekitWebhookReceiver: { receive: jest.fn().mockResolvedValue({ event: "ok" }) },
      buildLiveKitToken: jest.fn().mockReturnValue("jwt")
    }));
    jest.doMock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
      PutObjectCommand: jest.fn(),
      DeleteObjectCommand: jest.fn()
    }));
    const livekitService = require("../../src/services/livekitService");
    const storageService = require("../../src/services/storageService");
    expect((await livekitService.createRoom({ name: "room" })).name).toBe("room");
    await livekitService.deleteRoom("room");
    await livekitService.listParticipants("room");
    await livekitService.removeParticipant("room", "id");
    await livekitService.mutePublishedTrack("room", "id", "track", true);
    await livekitService.sendData("room", { ok: true });
    expect((await livekitService.startRecording("room", "file")).egressId).toBe("eg1");
    await livekitService.stopRecording("eg1");
    expect((await livekitService.verifyWebhook("{}", "auth")).event).toBe("ok");
    expect((await storageService.uploadBuffer({ buffer: Buffer.from("x"), folder: "f" })).url).toContain("cloudinary");
  });
});

const admin = require("firebase-admin");
const env = require("./env");

if (env.firebaseProjectId && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebaseProjectId,
      privateKey: env.firebasePrivateKey.replace(/\\n/g, "\n"),
      clientEmail: env.firebaseClientEmail
    })
  });
}

module.exports = { firebaseAdmin: admin };

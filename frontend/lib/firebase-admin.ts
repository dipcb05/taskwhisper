import * as admin from "firebase-admin"

function getServiceAccount() {
  const encoded = process.env.FIREBASE_SECRET_BASE64
  if (encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8")
    const parsed = JSON.parse(decoded)
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n")
    }
    return parsed
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount() as admin.ServiceAccount),
  })
}

const auth = admin.auth()
const db = admin.firestore()

export { auth, db }

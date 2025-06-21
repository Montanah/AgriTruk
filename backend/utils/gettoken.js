// get-id-token.js
const admin = require("firebase-admin");
const axios = require("axios");
const serviceAccount = require("../serviceAccountKey.json");

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firebase Auth REST API endpoint
const FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyAXJfJ7Vc5AavATttxs50DKHaW-OMV5L2A";

// Replace with a test UID
const uid = "mAUnB2ZLdjTAg4DnGKBHnXE8npF3"; // Must match an existing UID or will be auto-created

async function getIdToken() {
  try {
    // 1. Create a custom token using Admin SDK
    const customToken = await admin.auth().createCustomToken(uid);

    // 2. Exchange custom token for ID token (real login)
    const response = await axios.post(FIREBASE_AUTH_URL, {
      token: customToken,
      returnSecureToken: true
    });

    const idToken = response.data.idToken;
    console.log("✅ Firebase ID Token:\n", idToken);
  } catch (error) {
    console.error("❌ Error getting ID token:", error.response?.data || error.message);
  }
}

getIdToken();

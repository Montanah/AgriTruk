const admin = require("firebase-admin");

// Initialize Firebase Admin with environment variables
let serviceAccount;
try {
  // Try to parse service account from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    // Fallback to individual environment variables
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "agritruk-d543b",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
      client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
      client_id: process.env.FIREBASE_CLIENT_ID || "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };
    
    // Validate required fields
    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      console.error('Missing required Firebase configuration fields');
      throw new Error('Firebase configuration incomplete');
    }
  }
} catch (error) {
  console.error('Error parsing Firebase service account:', error);
  // Fallback to default credentials (for local development)
  serviceAccount = null;
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Use default credentials (for local development or if env vars are not set)
  admin.initializeApp({
    // This will use GOOGLE_APPLICATION_CREDENTIALS or default service account
  });
}

module.exports = admin;

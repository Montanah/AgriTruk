const admin = require("../config/firebase");

const authenticateToken = async (req, res, next) => {
  console.log('🔐 AUTH MIDDLEWARE - Request received');
  console.log('🔐 Method:', req.method);
  console.log('🔐 URL:', req.url);
  console.log('🔐 Headers present:', {
    'authorization': !!req.headers["authorization"],
    'content-type': req.headers["content-type"],
    'content-length': req.headers["content-length"]
  });
  
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: 'ERR_NO_TOKEN',
      message: "Unauthorized!! No token provided"
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      code: 'MISSING_TOKEN',
      message: "Authorization token required"
    });
  }

  // Check if Firebase Admin is properly initialized
  if (!admin.apps || admin.apps.length === 0) {
    console.error('Firebase Admin not initialized - skipping authentication');
    return res.status(500).json({
      code: 'FIREBASE_NOT_INITIALIZED',
      message: "Authentication service unavailable"
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    // console.log('Token verified successfully:', decodedToken);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({
      code: 'INVALID_TOKEN',
      message: "Invalid or expired token"
    });
  }
};

module.exports = { authenticateToken };

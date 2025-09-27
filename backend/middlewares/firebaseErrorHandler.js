// Firebase error handling middleware
const firebaseErrorHandler = (req, res, next) => {
  // Check if Firebase Admin is properly initialized
  try {
    const admin = require('../config/firebase');
    if (!admin.apps || admin.apps.length === 0) {
      console.error('Firebase Admin not initialized');
      return res.status(500).json({
        success: false,
        message: 'Firebase service unavailable',
        error: 'FIREBASE_NOT_INITIALIZED'
      });
    }
    next();
  } catch (error) {
    console.error('Firebase error handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Firebase service error',
      error: 'FIREBASE_ERROR'
    });
  }
};

module.exports = firebaseErrorHandler;

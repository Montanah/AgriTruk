const admin = require("../config/firebase");

const loadUserProfile = async (req, res, next) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        code: "ERR_USER_NOT_FOUND",
        message: "User not found"
      });
    }

    req.user.profile = userDoc.data(); // Attach user profile to request
    next();
  } catch (error) {
    console.error("Load profile error:", error);
    return res.status(500).json({
      code: "ERR_PROFILE_LOAD_FAILED",
      message: "Failed to load user profile"
    });
  }
};

module.exports = loadUserProfile;

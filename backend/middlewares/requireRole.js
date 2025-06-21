const admin = require("../config/firebase");

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ message: "User not authenticated" });

      const userDoc = await admin.firestore().collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User profile not found" });
      }

      const userRole = userDoc.data().role || "user";

      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];  
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          code: "UNAUTHORIZED_ROLE",
          message: "Insufficient permissions",
        });
      }

      req.user.role = userRole; 
      next();
    } catch (err) {
      console.error("Role authorization error:", err);
      res.status(500).json({ message: "Server error during role check" });
    }
  };
};

module.exports = requireRole;

const admin = require("../config/firebase");
const User = require("../models/User");

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      // console.log("Checking user role for UID:", uid);
      if (!uid) return res.status(401).json({ message: "User not authenticated" });

      const userDoc = await admin.firestore().collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User profile not found" });
      }

      const userRole = userDoc.data().role || "user";

      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];  
      }

      // Check if the user's role is in the list of allowed roles
      // console.log("User role:", userRole);
      // console.log("Allowed roles:", allowedRoles);

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


const requireAuth = (allowedRoles, requiredPermission = null) => {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ message: "User not authenticated" });

      const userDoc = await admin.firestore().collection("users").doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ message: "User profile not found" });
      }

      const userData = userDoc.data();
      const userRole = userData.role || "user";

      // Check role first
      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          code: "UNAUTHORIZED_ROLE",
          message: "Insufficient role permissions",
        });
      }

      // If a specific permission is required, check it
      if (requiredPermission && userRole === 'admin') {
        const userPermissions = await User.getPermissions(uid);
        const hasPermission = userPermissions.some(p => p.name === requiredPermission && p.status === 'active');
        if (!hasPermission) {
          return res.status(403).json({
            code: "UNAUTHORIZED_PERMISSION",
            message: "Missing required permission",
          });
        }
      }

      req.user.role = userRole;
      req.user.permissions = await User.getPermissions(uid);
      next();
    } catch (err) {
      console.error("Authorization error:", err);
      res.status(500).json({ message: "Server error during authorization check" });
    }
  };
};

module.exports = { requireAuth, requireRole };
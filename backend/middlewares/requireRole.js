const admin = require("../config/firebase");
const Admin = require("../models/Admin");
const User = require("../models/User");

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid || req.admin.adminId;
      console.log("UID:", uid);
      // console.log("Checking user role for UID:", uid);
      if (!uid) return res.status(401).json({ message: "User not authenticated" });

      let userRole;
      let userData;

      let userDoc = await admin.firestore().collection("users").doc(uid).get();
      
      if (userDoc.exists) {
        userData = userDoc.data();
        userRole = userData?.role;
      } else {
        // If not found in users, check admins
        const adminData = await Admin.getByUserId(uid);
        // console.log("Admin:", adminData);
        
        if (adminData) {
          userData = adminData;
          userRole = adminData.role;
        } else {
          // Check if user is a driver (company-recruited driver)
          const driverQuery = await admin.firestore().collection("drivers")
            .where("userId", "==", uid)
            .limit(1)
            .get();
          
          if (!driverQuery.empty) {
            userData = driverQuery.docs[0].data();
            userRole = "driver"; // Company-recruited drivers have driver role
          } else {
            // Check if user is a company transporter
            const companyQuery = await admin.firestore().collection("companies")
              .where("transporterId", "==", uid)
              .limit(1)
              .get();
            
            if (!companyQuery.empty) {
              userData = companyQuery.docs[0].data();
              userRole = "transporter"; // Company transporters have transporter role
            } else {
              // Check if user is an individual transporter
              const transporterQuery = await admin.firestore().collection("transporters")
                .where("userId", "==", uid)
                .limit(1)
                .get();
              
              if (!transporterQuery.empty) {
                userData = transporterQuery.docs[0].data();
                userRole = "transporter"; // Individual transporters have transporter role
              } else {
                return res.status(404).json({ message: "User profile not found" });
              }
            }
          }
        }
      }

      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];  
      }

      // Automatically allow 'driver' role when 'transporter' is allowed
      // Drivers work like transporters for job-related operations
      let expandedAllowedRoles = [...allowedRoles];
      if (allowedRoles.includes('transporter') && !allowedRoles.includes('driver')) {
        expandedAllowedRoles.push('driver');
      }

      // Check if the user's role is in the list of allowed roles
      console.log("User role:", userRole);
      console.log("Allowed roles:", allowedRoles);
      console.log("Expanded allowed roles:", expandedAllowedRoles);

      if (!expandedAllowedRoles.includes(userRole)) {
        return res.status(403).json({
          code: "UNAUTHORIZED_ROLE",
          message: `Insufficient permissions. User role: ${userRole}, Allowed roles: ${allowedRoles.join(', ')}`,
        });
      }
      req.user = req.user || {};
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

      let userData;
      let userRole;

      if (userDoc.exists) {
        userData = userDoc.data();
        userRole = userData.role || "user";
      } else {
        // Check if user is a driver (company-recruited driver)
        const driverQuery = await admin.firestore().collection("drivers")
          .where("userId", "==", uid)
          .limit(1)
          .get();
        
        if (!driverQuery.empty) {
          userData = driverQuery.docs[0].data();
          userRole = "driver";
        } else {
          // Check if user is a company transporter
          const companyQuery = await admin.firestore().collection("companies")
            .where("transporterId", "==", uid)
            .limit(1)
            .get();
          
          if (!companyQuery.empty) {
            userData = companyQuery.docs[0].data();
            userRole = "transporter";
          } else {
            // Check if user is an individual transporter
            const transporterQuery = await admin.firestore().collection("transporters")
              .where("userId", "==", uid)
              .limit(1)
              .get();
            
            if (!transporterQuery.empty) {
              userData = transporterQuery.docs[0].data();
              userRole = "transporter";
            } else {
              return res.status(404).json({ message: "User profile not found" });
            }
          }
        }
      }

      // Check role first
      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
      }

      // Automatically allow 'driver' role when 'transporter' is allowed
      let expandedAllowedRoles = [...allowedRoles];
      if (allowedRoles.includes('transporter') && !allowedRoles.includes('driver')) {
        expandedAllowedRoles.push('driver');
      }

      if (!expandedAllowedRoles.includes(userRole)) {
        return res.status(403).json({
          code: "UNAUTHORIZED_ROLE",
          message: `Insufficient role permissions. User role: ${userRole}, Allowed roles: ${allowedRoles.join(', ')}`,
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
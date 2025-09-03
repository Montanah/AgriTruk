const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Authentication middleware
// const authenticate = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Access denied. No token provided'
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Get fresh admin data
//     const adminData = await Admin.get(decoded.adminId);
    
//     if (adminData.status !== 'active') {
//       return res.status(401).json({
//         success: false,
//         message: 'Account is not active'
//       });
//     }

//     req.admin = {
//       adminId: adminData.adminId,
//       userId: adminData.userId,
//       email: adminData.email,
//       name: adminData.name,
//       permissions: adminData.permissions,
//       status: adminData.status
//     };
    
//     next();
//   } catch (error) {
//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid token'
//       });
//     }
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Token expired'
//       });
//     }

//     if (error.message === 'Admin not found') {
//       return res.status(401).json({
//         success: false,
//         message: 'Admin account not found'
//       });
//     }
    
//     console.error('Authentication error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Authentication failed'
//     });
//   }
// };

// Authorization middleware - check for specific permissions
const authorize = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
     
      const userId = req.user.user_id;

      const adminData = await Admin.getByUserId(userId);

      const adminPermissions = adminData.permissions || [];
      
      // Super admin has all permissions
      if (adminPermissions.includes('super_admin')) {
        return next();
      }
      
      // Check if admin has any of the required permissions
      const hasPermission = requiredPermissions.some(permission => 
        adminPermissions.includes(permission)
      );
      
      if (!hasPermission && requiredPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed'
      });
    }
  };
};

// Super admin only middleware
// const requireSuperAdmin = (req, res, next) => {
async function requireSuperAdmin(req, res, next) {
  try {
    const userId = req.user.user_id;

    const adminData = await Admin.getByUserId(userId);

    const adminPermissions = adminData.permissions || [];
    if (!adminPermissions.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

// Self or super admin middleware (for profile operations)
const requireSelfOrSuperAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const currentAdminId = req.user.user_id;
    const adminData = await Admin.getByUserId(currentAdminId);
    const adminPermissions = adminData.permissions || [];
    
    // Allow if it's the same admin or if current admin is super admin
    if (adminId === currentAdminId || adminPermissions.includes('super_admin')) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Can only access own profile or require super admin privileges'
    });
  } catch (error) {
    console.error('Self or super admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

// Rate limiting middleware for login attempts
const loginRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  // authenticate,
  authorize,
  requireSuperAdmin,
  requireSelfOrSuperAdmin,
  loginRateLimit
};
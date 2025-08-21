const Admin = require('../models/Admin'); 
const admin = require('../config/firebase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Permission = require('../models/Permission');
const sendEmail = require('../utils/sendEmail');
const { generateRandomPassword } = require('./companyController');
const { uploadImage } = require('../utils/upload');
const fs = require('fs');

const AdminManagementController = {
  //generate password
  async generatePassword(req, res) {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;  
  },
  // Admin Login
  // async login(req, res) {
  //   try {
  //     const { email, password, firebaseToken } = req.body;
  //     console.log(req.body);

  //     if (!email || (!password && !firebaseToken)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Email and password or Firebase token required'
  //       });
  //     }

  //     let decodedToken;
      
  //     // Verify Firebase token if provided
  //     if (firebaseToken) {
  //       try {
  //         decodedToken = await admin.auth().verifyIdToken(firebaseToken);
  //       } catch (error) {
  //         return res.status(401).json({
  //           success: false,
  //           message: 'Invalid Firebase token'
  //         });
  //       }
  //     }

  //     // Get admin by email or userId
  //     const adminQuery = await admin.firestore()
  //       .collection('admins')
  //       .where('email', '==', email)
  //       .where('status', '==', 'active')
  //       .get();

  //     if (adminQuery.empty) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid credentials'
  //       });
  //     }

  //     const adminDoc = adminQuery.docs[0];
  //     const adminData = adminDoc.data();

  //     // If using Firebase token, verify the userId matches
  //     if (firebaseToken && decodedToken.uid !== adminData.userId) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid credentials'
  //       });
  //     }

  //     // Update last login
  //     await Admin.update(adminData.adminId, {
  //       lastLogin: admin.firestore.Timestamp.now()
  //     });

  //     // Generate JWT token
  //     const token = jwt.sign(
  //       { 
  //         adminId: adminData.adminId,
  //         userId: adminData.userId,
  //         email: adminData.email,
  //         permissions: adminData.permissions
  //       },
  //       process.env.JWT_SECRET,
  //       { expiresIn: '24h' }
  //     );

  //     res.json({
  //       success: true,
  //       message: 'Login successful',
  //       data: {
  //         admin: {
  //           adminId: adminData.adminId,
  //           name: adminData.name,
  //           email: adminData.email,
  //           permissions: adminData.permissions
  //         },
  //         token
  //       }
  //     });

  //   } catch (error) {
  //     console.error('Login error:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Internal server error'
  //     });
  //   }
  // },
  async login(req, res) {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token required'
      });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // Get admin by userId (Firebase UID)
    const adminQuery = await admin.firestore()
      .collection('admins')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (adminQuery.empty) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or inactive'
      });
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();

    // Update last login
    await admin.firestore()
      .collection('admins')
      .doc(adminDoc.id)
      .update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          adminId: adminDoc.id,
          name: adminData.name,
          email: adminData.email,
          permissions: adminData.permissions
        },
        // You can return the Firebase token if needed
        firebaseToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    const errorMessage = error.code === 'auth/id-token-expired' 
      ? 'Firebase token expired' 
      : 'Authentication failed';
    
    res.status(401).json({
      success: false,
      message: errorMessage
    });
  }
},

  // Create Admin (Super Admin only)
  async createAdmin(req, res) {
    try {
      const { name, email, phone, permissions } = req.body;
      
      if (!name || !email || !permissions || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and permissions are required'
        });
      }

      //check permissions
      const allValidPermissions = Object.values(Permission);
      // console.log(allValidPermissions);
      // console.log(permissions);
      let finalPermissions = [];
      
      // Process permissions array
      const inputPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      for (const perm of inputPermissions) {
        if (allValidPermissions.includes(perm)) {
          finalPermissions.push(perm);
        } else {
          return res.status(400).json({
            success: false,
            message: `Invalid permission or permission group: ${perm}`
          });
        }
      }

      // Check if admin already exists
      const existingAdmin = await admin.firestore()
        .collection('admins')
        .where('email', '==', email)
        .get();

      if (!existingAdmin.empty) {
        return res.status(409).json({
          success: false,
          message: 'Admin with this email already exists'
        });
      }

      const password = generateRandomPassword();
      // Create Firebase user
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().createUser({
          email,
          displayName: name,
          password,
          emailVerified: false
        });
      } catch (firebaseError) {
        return res.status(400).json({
          success: false,
          message: `Firebase user creation failed: ${firebaseError.message}`
        });
      }

      finalPermissions = [...new Set(finalPermissions)];

      // Create admin record
      const adminData = {
        adminId: firebaseUser.uid,
        userId: firebaseUser.uid,
        name,
        email,
        phone: phone || null,
        permissions: finalPermissions,
        status: 'active'
      };

      const newAdmin = await Admin.create(adminData);

      //send password reset email
      try {
        const link = await admin.auth().generatePasswordResetLink(email);

        await sendEmail ({
          to: email,
          subject: 'Password Reset',
          text: `Click the following link to reset your password: ${link}`,
          html: `<p>Click the following link to reset your password: <a href="${link}">${link}</a></p>`
        });
        // await sendEmail({
        //   to: email,
        //   subject: 'Your New Admin Account',
        //   text: `Your temporary password is: ${password}\nPlease change it after logging in.`,
        //   html: `
        //     <p>Your temporary password is: <strong>${password}</strong></p>
        //     <p>Please change it after logging in.</p>
        //   `
        // });
        
      } catch (emailError) {
        await admin.auth().deleteUser(firebaseUser.uid);
        await Admin.hardDelete(newAdmin.adminId);
        return res.status(500).json({
          success: false,
          message: `Failed to send password reset email: ${emailError.message}`,
        });
      }
      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: {
          adminId: newAdmin.adminId,
          name: newAdmin.name,
          email: newAdmin.email,
          permissions: newAdmin.permissions,
          status: newAdmin.status
        }
      });

    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin'
      });
    }
  },

  // Get all admins (Super Admin only)
  async getAllAdmins(req, res) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      
      let query = admin.firestore().collection('admins');
      
      // Filter by status if provided
      if (status && ['active', 'inactive', 'suspended'].includes(status)) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      let admins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      }));

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        admins = admins.filter(admin => 
          admin.name?.toLowerCase().includes(searchLower) ||
          admin.email?.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedAdmins = admins.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          admins: paginatedAdmins,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(admins.length / limit),
            totalItems: admins.length,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get all admins error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admins'
      });
    }
  },

  // Get single admin
  async getAdmin(req, res) {
    try {
      const { adminId } = req.params;
      
      const adminData = await Admin.get(adminId);
      
      res.json({
        success: true,
        data: {
          ...adminData,
          createdAt: adminData.createdAt?.toDate(),
          updatedAt: adminData.updatedAt?.toDate(),
          lastLogin: adminData.lastLogin?.toDate()
        }
      });

    } catch (error) {
      if (error.message === 'Admin not found') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      console.error('Get admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admin'
      });
    }
  },

  // Update admin
  async updateAdmin(req, res) {
    try {
      const adminId = req.params.adminId;
      console.log(adminId);

      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      delete updates.adminId;
      delete updates.userId;
      delete updates.createdAt;
      delete updates.updatedAt;

      // Validate permissions if being updated
      if (updates.permissions) {
        if (!Array.isArray(updates.permissions)) {
          return res.status(400).json({
            success: false,
            message: 'Permissions must be an array'
          });
        }
      }

      // Validate status if being updated
      if (updates.status && !['active', 'inactive', 'suspended'].includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }

      const updatedAdmin = await Admin.update(adminId, updates);
      
      res.json({
        success: true,
        message: 'Admin updated successfully',
        data: updatedAdmin
      });

    } catch (error) {
      if (error.message === 'Admin not found') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      console.error('Update admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update admin'
      });
    }
  },

  // Soft delete admin (change status to inactive)
  async deleteAdmin(req, res) {
    try {
      const { adminId } = req.params;
      
      // Get admin first to check if exists
      await Admin.get(adminId);
      
      // Soft delete by updating status
      await Admin.update(adminId, { 
        accountStatus: false,
        deactivatedAt: admin.firestore.Timestamp.now()
      });
      
      res.json({
        success: true,
        message: 'Admin deactivated successfully'
      });

    } catch (error) {
      if (error.message === 'Admin not found') {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }
      
      console.error('Delete admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate admin'
      });
    }
  },

  // Get current admin profile
  async getProfile(req, res) {
    try {
      console.log(req.user.user_id);
      const adminData = await Admin.getByUserId(req.user.user_id);
      
      res.json({
        success: true,
        data: {
          ...adminData,
          createdAt: adminData.createdAt?.toDate(),
          updatedAt: adminData.updatedAt?.toDate(),
          lastLogin: adminData.lastLogin?.toDate()
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  },

  // Update current admin profile
  async updateProfile(req, res) {
    try {
      const updates = req.body;

      
      // Only allow certain fields to be updated by the admin themselves
      const allowedUpdates = ['name', 'phone'];
      const filteredUpdates = {};
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }
      
      const adminData = await Admin.getByUserId(req.user.uid);
      const updatedAdmin = await Admin.update(adminData.adminId, filteredUpdates);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedAdmin
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  },

  async logout(req, res) {
    try {
      await Admin.update(req.user.uid, { lastLogin: admin.firestore.Timestamp.now() });
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Failed to logout' });
    }
  },

  async uploadImage(req, res) {
    try {
      console.log('Uploading image...');
      const userId = req.user.uid;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const adminData = await Admin.getByUserId(userId);

      if (!adminData) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      const adminId = adminData.adminId;

      console.log('Admin ID:', adminId);

      let profilePhotoUrl = '';
      
          // Upload image if provided
      if (req.file) {
        const publicId = await uploadImage(req.file.path);
        profilePhotoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
  
        // Optional: remove local file
        fs.unlinkSync(req.file.path);
      }

      console.log('Profile photo URL:', profilePhotoUrl);

      const result = profilePhotoUrl;

      //save the image url to the admin document
      const updatedAdmin = await Admin.update(adminId, { avatar: result });

      console.log('Updated admin:', updatedAdmin);

      res.json({ success: true, message: 'Image uploaded successfully', data: result });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
  }
};

module.exports = AdminManagementController;
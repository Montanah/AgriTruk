const Transporter = require("../models/Transporter");
const AgriBooking = require("../models/AgriBooking");
const CargoBooking  = require("../models/CargoBooking");
const { logAdminActivity } = require("../utils/activityLogger");
const User = require('../models/User');
const Permission = require('../models/Permission');

exports.approveTransporter = async (req, res) => {
  try {
    const transporterId = req.params.transporterId;

    //check if transporter exists
    if (!(await Transporter.get(transporterId))) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    //check if transporter is already approved
    const transporter = await Transporter.get(transporterId);
    if (transporter.status === 'approved') {
      return res.status(400).json({ message: 'Transporter is already approved' });
    }

    const updated = await Transporter.approve(transporterId);
    await logAdminActivity(req.user.uid, 'approve_transporter', req,  { type: 'transporter', id: transporterId });
    res.status(200).json({ message: 'Transporter approved', updated });
  } catch (error) {
    console.error('Approve transporter error:', error);
    res.status(500).json({ message: 'Failed to approve transporter' });
  }
};

exports.rejectTransporter = async (req, res) => {
  try {
    const reason = req.body.reason || 'Unqualified';

    const transporterId = req.params.transporterId;
    // check if transporter exists
    if (!(await Transporter.get(transporterId))) {
      return res.status(404).json({ message: 'Transporter not found' });
    };

    const result = await Transporter.reject(transporterId, reason); 

    await logAdminActivity(req.user.uid, 'reject_transporter', req,  { type: 'transporter', id: transporterId });
    
    res.status(200).json({ message: 'Transporter rejected', result });
  } catch (err) {
    console.error('Reject transporter error:', err);
    res.status(500).json({ message: 'Failed to reject transporter' });
  }
};

exports.deleteTransporter = async (req, res) => {
  try {
    await Transporter.delete(req.params.transporterId);
    await logAdminActivity(req.user.uid, 'delete_transporter', req, { type: 'transporter', id: transporterId });
    res.status(200).json({ message: 'Transporter deleted successfully' });
  } catch (error) {
    console.error('Delete transporter error:', error);
    res.status(500).json({ message: 'Failed to delete transporter' });
  }
};

exports.updateAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissionIds } = req.body;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'Permission IDs must be a non-empty array' });
    }

    // Validate that all permissionIds exist and are active
    const permissions = await Promise.all(permissionIds.map(async id => {
      const perm = await Permission.get(id);
      if (perm.status !== 'active') throw new Error(`Permission ${id} is inactive`);
      return perm;
    }));

    // Check if the target admin exists and is an admin
    const admin = await User.get(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update permissions
    await User.update(adminId, { permissionIds });
    await logActivity(req.user.uid, 'update_admin_permissions', req);
    res.status(200).json({ message: 'Admin permissions updated successfully', permissions });
  } catch (err) {
    console.error('Update admin permissions error:', err);
    if (err.message.includes('Permission') || err.message.includes('not found')) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to update admin permissions' });
    }
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const agriBookings = await AgriBooking.getAllBookings();
    const cargoBookings = await CargoBooking.getAllBookings();
    
    // Add type labels and merge
    const allBookings = [
      ...agriBookings.map(booking => ({ ...booking, type: 'agri' })),
      ...cargoBookings.map(booking => ({ ...booking, type: 'cargo' }))
    ];
    console.log(req.user.uid);
    try {
      await logAdminActivity(req.user.uid, 'get_all_bookings', req);
    } catch (error) {
      console.error('Admin activity log error:', error);  
    }
    
    res.status(200).json({ 
      message: 'All bookings retrieved successfully', 
      bookings: allBookings,
      count: allBookings.length 
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Failed to retrieve all bookings' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    console.log('Searching for users...');
    console.log(req.query);
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter is required'
      });
    }

    const results = await User.search(query, limit);

    await logAdminActivity(req.user.uid, 'search_users', req, { query });
    
    res.status(200).json({
      success: true,
      count: results.length,
      users: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to perform search'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    await logAdminActivity(req.user.uid, 'get_all_users', req);
    res.status(200).json({ message: 'All users retrieved successfully', users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to retrieve all users' });
  }
};

exports.getPermissions = async (req, res) => {
  try {
    const permissions = Object.values(Permission);
    // const permissions = await Permission.getAllPermissions();
    await logAdminActivity(req.user.uid, 'get_all_permissions', req);
    res.status(200).json({ message: 'All permissions retrieved successfully', permissions });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ message: 'Failed to retrieve all permissions' });
  }
};
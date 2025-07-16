const Transporter = require("../models/Transporter");
const logActivity = require("../utils/activityLogger");
const User = require('../models/User');
const Permission = require('../models/Permission');


exports.approveTransporter = async (req, res) => {
  try {
    const updated = await Transporter.approve(req.params.transporterId);
    await logActivity(req.user.uid, 'approve_transporter', req);
    res.status(200).json({ message: 'Transporter approved', updated });
  } catch (error) {
    console.error('Approve transporter error:', error);
    res.status(500).json({ message: 'Failed to approve transporter' });
  }
};

exports.rejectTransporter = async (req, res) => {
  try {
    const reason = req.body.reason || 'Unqualified';
    const result = await Transporter.reject(req.params.transporterId, reason); 
    await logActivity(req.user.uid, 'reject_transporter', req);
    res.status(200).json({ message: 'Transporter rejected', result });
  } catch (err) {
    console.error('Reject transporter error:', err);
    res.status(500).json({ message: 'Failed to reject transporter' });
  }
};


exports.deleteTransporter = async (req, res) => {
  try {
    await Transporter.delete(req.params.transporterId);
    await logActivity(req.user.uid, 'delete_transporter', req);
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
const Permission = require('../models/Permission');
const logActivity = require('../utils/activityLogger');

exports.createPermission = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Permission name is required' });
    }
    const existingPermission = await Permission.getAll().then(perms => perms.find(p => p.name === name));
    if (existingPermission) {
      return res.status(400).json({ message: 'Permission name already exists' });
    }
    const permission = await Permission.create({ name, description, status });
    await logActivity(req.user.uid, 'create_permission', req);
    res.status(201).json({ message: 'Permission created successfully', permission });
  } catch (err) {
    console.error('Create permission error:', err);
    res.status(500).json({ message: 'Failed to create permission' });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const { name, description, status } = req.body;
    if (!name && !description && !status) {
      return res.status(400).json({ message: 'At least one field (name, description, or status) is required for update' });
    }
    const permission = await Permission.get(permissionId);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    const updatedPermission = await Permission.update(permissionId, { name, description, status });
    await logActivity(req.user.uid, 'update_permission', req);
    res.status(200).json({ message: 'Permission updated successfully', permission: updatedPermission });
  } catch (err) {
    console.error('Update permission error:', err);
    if (err.message === 'Permission not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to update permission' });
    }
  }
};

exports.deletePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const permission = await Permission.get(permissionId);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    await Permission.delete(permissionId);
    await logActivity(req.user.uid, 'delete_permission', req);
    res.status(200).json({ message: 'Permission marked as inactive successfully' });
  } catch (err) {
    console.error('Delete permission error:', err);
    if (err.message === 'Permission not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to delete permission' });
    }
  }
};
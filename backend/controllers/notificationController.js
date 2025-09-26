const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const userType = req.user.role || 'user';

        const notifications = await Notification.getByUser(req.user.uid, userType);
        res.status(200).json({ 
            success: true, 
            message: 'Notifications retrieved successfully', 
            data: notifications });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Error retrieving notifications: ${error.message}` });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        await Notification.markAsRead(req.params.notificationId);
        res.status(200).json({ 
            success: true, 
            message: 'Notification marked as read successfully' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Error marking notification as read: ${error.message}` });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        await Notification.delete(req.params.notificationId);
        res.status(200).json({ 
            success: true, 
            message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Error deleting notification: ${error.message}` });
    }
};
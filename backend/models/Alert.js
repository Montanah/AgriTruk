const admin = require('../config/firebase');
const db = admin.firestore();

const Alert = {
  // Create a new alert
  async create(alertData) {
    try {
      const alertId = db.collection('alerts').doc().id;
      
      const alert = {
        alertId,
        type: alertData.type, // 'gps_loss', 'route_deviation', 'maintenance', 'document_expiry', 'booking'
        severity: alertData.severity || 'medium', // 'low', 'medium', 'high', 'critical'
        title: alertData.title,
        description: alertData.description,
        entityType: alertData.entityType, // 'vehicle', 'driver', 'booking', 'document'
        entityId: alertData.entityId, // transporterId, bookingId, etc.
        status: alertData.status || 'active', // 'active', 'acknowledged', 'resolved'
        metadata: alertData.metadata || {},
        triggeredBy: alertData.triggeredBy || 'system',
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        expiresAt: alertData.expiresAt || null
      };

      await db.collection('alerts').doc(alertId).set(alert);
      return { id: alertId, ...alert };
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  // Get alert by ID
  async get(alertId) {
    try {
      const doc = await db.collection('alerts').doc(alertId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting alert:', error);
      return null;
    }
  },

  // Update alert
  async update(alertId, updates) {
    try {
      const updatedData = {
        ...updates,
        updatedAt: admin.firestore.Timestamp.now()
      };
      await db.collection('alerts').doc(alertId).update(updatedData);
      return updatedData;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },

  // Get alerts with filtering
  async getAlerts(filters = {}) {
    try {
      let query = db.collection('alerts');
      
      // Apply filters
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      if (filters.severity) {
        query = query.where('severity', '==', filters.severity);
      }
      if (filters.entityType) {
        query = query.where('entityType', '==', filters.entityType);
      }
      if (filters.entityId) {
        query = query.where('entityId', '==', filters.entityId);
      }
      
      // Sort by creation date (newest first)
      query = query.orderBy('createdAt', 'desc');
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  },

  // Acknowledge alert
  async acknowledge(alertId, userId) {
    try {
      const updateData = {
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      await db.collection('alerts').doc(alertId).update(updateData);
      return updateData;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  },

  // Resolve alert
  async resolve(alertId, userId) {
    try {
      const updateData = {
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      await db.collection('alerts').doc(alertId).update(updateData);
      return updateData;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  },

  // Get alert statistics
  async getStats() {
    try {
      const activeAlerts = await this.getAlerts({ status: 'active' });
      const acknowledgedAlerts = await this.getAlerts({ status: 'acknowledged' });
      
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
      
      const typeCounts = {};
      
      activeAlerts.forEach(alert => {
        severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
        typeCounts[alert.type] = (typeCounts[alert.type] || 0) + 1;
      });
      
      return {
        totalActive: activeAlerts.length,
        totalAcknowledged: acknowledgedAlerts.length,
        bySeverity: severityCounts,
        byType: typeCounts
      };
    } catch (error) {
      console.error('Error getting alert stats:', error);
      return {};
    }
  }
};

module.exports = Alert;
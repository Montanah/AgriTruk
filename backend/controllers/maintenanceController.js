const db = require('../config/firebase');

// Get all maintenance records for a company
const getMaintenanceRecords = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      return res.status(200).json({ records: [] });
    }

    const companyId = companyQuery.docs[0].id;

    // Get all maintenance records for the company
    const maintenanceQuery = await db.collection('maintenance')
      .where('companyId', '==', companyId)
      .orderBy('dueDate', 'asc')
      .get();

    const records = [];
    for (const doc of maintenanceQuery.docs) {
      const recordData = { id: doc.id, ...doc.data() };
      
      // Get vehicle info
      if (recordData.vehicleId) {
        const vehicleDoc = await db.collection('vehicles').doc(recordData.vehicleId).get();
        if (vehicleDoc.exists) {
          const vehicleData = vehicleDoc.data();
          recordData.vehicleInfo = {
            make: vehicleData.vehicleMake,
            model: vehicleData.vehicleModel,
            registration: vehicleData.vehicleRegistration,
          };
        }
      }

      records.push(recordData);
    }

    res.status(200).json({ records });
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ message: 'Failed to fetch maintenance records' });
  }
};

// Add a new maintenance record
const addMaintenanceRecord = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { vehicleId, type, description, dueDate, cost, notes } = req.body;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyId = companyQuery.docs[0].id;

    // Verify vehicle belongs to company
    const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
    if (!vehicleDoc.exists || vehicleDoc.data().companyId !== companyId) {
      return res.status(403).json({ message: 'Vehicle not found or unauthorized' });
    }

    // Create maintenance record
    const maintenanceData = {
      companyId,
      vehicleId,
      type,
      description,
      dueDate: new Date(dueDate),
      status: 'pending',
      cost: cost ? parseFloat(cost) : null,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const maintenanceRef = await db.collection('maintenance').add(maintenanceData);

    res.status(201).json({
      message: 'Maintenance record added successfully',
      record: { id: maintenanceRef.id, ...maintenanceData }
    });
  } catch (error) {
    console.error('Error adding maintenance record:', error);
    res.status(500).json({ message: 'Failed to add maintenance record' });
  }
};

// Update maintenance status
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.uid;

    // Get maintenance record
    const maintenanceDoc = await db.collection('maintenance').doc(id).get();
    if (!maintenanceDoc.exists) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const maintenanceData = maintenanceDoc.data();

    // Verify user owns the company
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty || companyQuery.docs[0].id !== maintenanceData.companyId) {
      return res.status(403).json({ message: 'Unauthorized to update this record' });
    }

    // Update status
    const updateData = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.completedDate = new Date();
    }

    await db.collection('maintenance').doc(id).update(updateData);

    res.status(200).json({
      message: 'Maintenance status updated successfully',
      record: { id, ...updateData }
    });
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    res.status(500).json({ message: 'Failed to update maintenance status' });
  }
};

// Delete maintenance record
const deleteMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Get maintenance record
    const maintenanceDoc = await db.collection('maintenance').doc(id).get();
    if (!maintenanceDoc.exists) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    const maintenanceData = maintenanceDoc.data();

    // Verify user owns the company
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty || companyQuery.docs[0].id !== maintenanceData.companyId) {
      return res.status(403).json({ message: 'Unauthorized to delete this record' });
    }

    await db.collection('maintenance').doc(id).delete();

    res.status(200).json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ message: 'Failed to delete maintenance record' });
  }
};

module.exports = {
  getMaintenanceRecords,
  addMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord
};

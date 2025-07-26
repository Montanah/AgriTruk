const User = require('../models/User');
const Broker = require('../models/Broker');
const Client = require('../models/Client');
const Request = require('../models/Request');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const { uploadImage } = require('../utils/upload');
const fs = require('fs');

exports.createBroker = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    //check if broker exists
    const existingBroker = await Broker.get(uid);
    if (existingBroker) {
      return res.status(409).json({ success: false, message: 'Broker already exists' });
    }
    let idUrl = null;

    if (req.files) {
      if (req.files.idImage?.[0]) {
        const publicId = await uploadImage(req.files.idImage[0].path);
        idUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.jpg`;
        fs.unlinkSync(req.files.idImage[0].path);
      }
    }

    const brokerData = {
      userId: uid,
      brokerIdUrl: idUrl,
      status: 'pending',
    };

    const broker = await Broker.create(brokerData);
    await logActivity(uid, 'create_broker', req);

    res.status(201).json({
      success: true,
      message: 'Broker created successfully',
      data: broker,
    });
  } catch (error) {
    console.error('Error creating broker:', error);
    if (req.files) {
      for (let key in req.files) {
        req.files[key].forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getBroker = async (req, res) => {
  try {
    const broker = await Broker.get(req.params.brokerId);
    await logAdminActivity(req.user.uid, 'get_broker', req);
    res.status(200).json({
      success: true,
      message: 'Broker retrieved successfully',
      data: broker,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: `Error retrieving broker: ${error.message}`,
    });
  }
};

exports.addClient = async (req, res) => {
  try {
    const clientData = {
      email: req.body.email,
      name: req.body.name,
      type: req.body.type, // 'business' or 'individual'
      region: req.body.region,
    };

    const userId = req.user.uid;
    // console.log('User ID:', userId);
    const brokerRecord = await Broker.getByUserId(userId);
    // console.log('Broker Record:', brokerRecord);
    if (!brokerRecord || !brokerRecord.id) {
      return res.status(400).json({ success: false, message: 'Broker not found' });
    }

    //check if client exists
    const existingClient = await Client.getByEmail(clientData.email);
    if (existingClient) {
      return res.status(409).json({ success: false, message: 'Client already exists' });
    }

    const client = await Client.create({ ...clientData, brokerId: brokerRecord.id });

    await logActivity(userId, 'create_client', req);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: `Error creating client: ${error.message}`,
    });
  }
};

exports.getClients = async (req, res) => {
  try {
    console.log('searching');
    const userId = req.user.uid;
    console.log('User ID:', userId);
    const broker = await Broker.getByUserId(userId);
    console.log('Broker:', broker.id);
    const brokerId = broker.id;
    if (!brokerId) {
      return res.status(400).json({ success: false, message: 'Broker ID is required' });
    }
    const clients = await Client.getClients(brokerId);
    await logActivity(req.user.uid, 'get_clients', req);
    res.status(200).json({
      success: true,
      message: 'Clients retrieved successfully',
      data: clients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving clients: ${error.message}`,
    });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const requestData = {
      category: req.body.category,
      type: req.body.type,
      pickUpLocation: req.body.pickUpLocation,
      dropOffLocation: req.body.dropOffLocation,
      productType: req.body.productType,
      weightKg: req.body.weightKg,
      value: req.body.value,
      additionalRequest: req.body.additionalRequest,
    };
    const clientId = req.params.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const request = await Request.create(requestData, clientId);

    await logActivity(req.user.uid, 'create_request', req);
    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error creating request: ${error.message}`,
    });
  }
};

exports.consolidateRequests = async (req, res) => {
  try {
    const requestIds = req.body.requestIds;
    if (!Array.isArray(requestIds) || requestIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two request IDs are required for consolidation',
      });
    }

      if (requestIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two request IDs are required'
      });
    }

      // Verify all requests exist and are not already consolidated
    const requests = await Request.getRequestByIds(requestIds);
    // console.log(requests);
    if (requests.length !== requestIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more requests not found',
      });
    }
    
    const consolidatedRequests = requests.filter(request => request.status === 'consolidated');
    if (consolidatedRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more requests are already consolidated',
      });
    }
    
    // Perform consolidation
    const result = await Request.consolidateRequests(requestIds);
    // const consolidated = await Request.consolidate(requestIds);

    await logActivity(req.user.uid, 'consolidate_requests', req);
    res.status(200).json({
      success: true,
      message: 'Requests consolidated successfully',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error consolidating requests: ${error.message}`,
    });
  }
};

exports.getRequestsByClient = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const requests = await Request.getByClient(clientId);

    await logActivity(req.user.uid, 'get_requests_by_client', req);
    res.status(200).json({
      success: true,
      message: 'Requests retrieved successfully',
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving requests: ${error.message}`,
    });
  }
};

exports.getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.getAll();
    res.status(200).json({
      success: true,
      message: 'Brokers retrieved successfully',
      data: brokers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving brokers: ${error.message}`,
    });
  }
};

exports.deactivateClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    await Client.softDelete(clientId);

    await logActivity(req.user.uid, 'deactivate_client', req);
    res.json({
      success: true,
      message: 'Client deactivated successfully',
    });
  } catch (error) {
    if (error.message === 'Client not found') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }
    console.error('Deactivate client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate client',
    });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    await Client.hardDelete(clientId);

    await logAdminActivity(req.admin.adminId, 'delete_client', req);
    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Client not found') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
    });
  }
};

exports.restoreClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    await Client.restore(clientId);
    await logActivity(req.user.uid, 'restore_client', req);
    res.json({
      success: true,
      message: 'Client restored successfully',
    });
  } catch (error) {
    if (error.message === 'Client not found') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }
    console.error('Restore client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore client',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { clientId } = req.params;
    const updates = req.body;

    const allowedUpdates = ['name', 'email', 'region'];
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedUpdates.includes(key))
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const updatedClient = await Client.update(clientId, filteredUpdates);

    await logActivity(req.user.uid, 'update_profile', req);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedClient,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

// module.exports = {
//   createBroker,
//   getBroker,
//   addClient,
//   getClients,
//   createRequest,
//   consolidateRequests,
//   getRequestsByClient,
//   getAllBrokers,
//   deactivateClient,
//   deleteClient,
//   restoreClient,
//   updateProfile,
// };
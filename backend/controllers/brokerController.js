const User = require('../models/User');
const Broker = require('../models/Broker');
const Client = require('../models/Client');
const Request = require('../models/Request');
const Booking = require('../models/Booking');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const { uploadImage } = require('../utils/upload');
const fs = require('fs');
const sendEmail = require("../utils/sendEmail");
const Notification = require('../models/Notification');
const MatchingService = require('../services/matchingService');
const { formatTimestamps } = require('../utils/formatData');
const Action = require('../models/Action');
const { generateEmailTemplate } = require('../services/documentExpiryCronService');
const { getBrokerTemplate, getRejectTemplate, adminNotification } = require('../utils/sendMailTemplate');
const { get } = require('../models/Alert');
const { app } = require('firebase-admin');

exports.createBroker = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    //check if broker exists
    const existingBroker = await Broker.getByUserId(uid);
    if (existingBroker) {
      return res.status(409).json({ success: false, message: 'Broker already exists' });
    }
    // console.log("idImage", req.file);
    let idImage = null; 
        if (req.file) {
          console.log('Processing  file:', req.file.originalname, req.file.mimetype, req.file.path); // Debug file
          try {
            idImage = await uploadImage(req.file.path);
            if (idImage) {
              console.log('idImage uploaded successfully:', idImage);
              fs.unlinkSync(req.file.path); 
            } else {
              console.error('Failed to upload logo, continuing without idImage');
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError.message);
            return res.status(500).json({ message: 'Failed to upload idImage' });
          }
        } else {
          console.log('No idImage file received');
        }
    
    const brokerData = {
      userId: uid,
      brokerIdUrl: idImage,
      status: 'pending',
    };

    const broker = await Broker.create(brokerData);
    await logActivity(uid, 'create_broker', req);

    const notificationData = {
      userId: uid,
      userType: 'broker',
      type: 'broker_created',
      message: 'Your broker account has been created successfully and is pending approval.',
    };
    await Notification.create(notificationData);

    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // } 
    await Action.create({
      type: "broker_created",
      entityId: uid,
      priority: "high",
      metadata: {
        brokerId: broker.brokerId,
      },
      status: "Needs Approval",
      message: 'New broker needs approval',
    });

    await sendEmail({
        to: "support@trukafrica.com",
        subject: 'Broker Account Needs Review',
        html: adminNotification('Broker Account Needs Review', 'A new broker needs approval', `Broker ID: ${broker.brokerId}`),
      });

    res.status(201).json({
      success: true,
      message: 'Broker created successfully',
      data: formatTimestamps(broker),
    });
  } catch (error) {
    console.error('Error creating broker:', error);
    
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getBroker = async (req, res) => {
  try {
    const broker = await Broker.get(req.params.brokerId);
    const user = await User.get(broker.userId);
    broker.user = formatTimestamps(user);
    const clients = await Client.getClients(broker.id);
    broker.clients = formatTimestamps(clients);
    broker.clientCount = clients.length;
    const bookings = await Booking.get(broker.id);
    broker.bookings = formatTimestamps(bookings);
    broker.bookingCount = bookings.length;

    const totalEarnings = 0;
    for (const booking of bookings) {
      totalEarnings += booking.cost;
    }
    broker.totalEarnings = totalEarnings * broker.commission / 100;

    const averageShippmentValue = 0;
    for (const booking of bookings) {
      averageShippmentValue += booking.cost;
    }
    broker.averageShippmentValue = averageShippmentValue / bookings.length;

    const monthlyActiveClients = await Client.getMonthlyActiveClients(broker.id);
    broker.monthlyActiveClients = monthlyActiveClients.length;

    await logAdminActivity(req.user.uid, 'get_broker', req);

    const notificationData = {
      userId: broker.userId,
      userType: 'broker',
      type: 'broker_retrieved',
      message: 'Your broker account has been retrieved successfully.',
    };

    await Notification.create(notificationData);
    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }
    res.status(200).json({
      success: true,
      message: 'Broker retrieved successfully',
      data: formatTimestamps(broker),
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
   
    const brokerRecord = await Broker.getByUserId(userId);
    
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

    const notificationData = {
      userId: userId,
      userType: 'broker',
      type: 'client_created',
      message: 'A new client has been added to your account.',
    };
    await Notification.create(notificationData);
    // if (brokerRecord.notificationPreferences.method === 'email' || brokerRecord.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Client Account Created', notificationData.message);
    // }
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
    const userId = req.user.uid;
    const brokerId = await Broker.getByUserId(userId);
    if (!brokerId) {
      return res.status(400).json({ success: false, message: 'Broker ID is required' });
    }
    const clientId = req.body.clientId;

    // check if client exists
    const existingClient = await Client.get(clientId);
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    const requestData = {
      brokerId: brokerId.id,
      clientId: clientId,
      category: req.body.category,
      type: req.body.type,
      pickUpLocation: req.body.pickUpLocation,
      dropOffLocation: req.body.dropOffLocation,
      productType: req.body.productType,
      weightKg: req.body.weightKg,
      value: req.body.value,
      additionalRequest: req.body.additionalRequest,
    };
    
    const request = await Request.create(requestData, clientId);

    await logActivity(req.user.uid, 'create_request', req);

    const notificationData = {
      userId: userId,
      userType: 'broker',
      type: 'new_request',
      message: 'A new request has been added to your account.',
    };
    await Notification.create(notificationData);
    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }
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

    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'consolidated_requests',
      message: 'Requests consolidated successfully',
    };
    await Notification.create(notificationData);
    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }

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
    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'get_requests_by_client',
      message: 'Requests retrieved successfully',
    };
    await Notification.create(notificationData);
    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }

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

exports.getAllBrokerRequests = async (req, res) => {
  try {
    // Get broker ID from user profile
    const brokerId = req.user.profile?.brokerId;
    if (!brokerId) {
      return res.status(400).json({ success: false, message: 'Broker ID not found in user profile' });
    }

    // Get all clients for this broker
    const clients = await Client.getClients(brokerId);
    const clientIds = clients.map(client => client.id);

    // Get all requests for all clients
    const allRequests = [];
    for (const clientId of clientIds) {
      const clientRequests = await Request.getByClient(clientId);
      // Add client information to each request
      const client = clients.find(c => c.id === clientId);
      const requestsWithClient = clientRequests.map(request => ({
        ...request,
        clientName: client.name,
        clientCompany: client.company,
        clientPhone: client.phone,
        clientEmail: client.email
      }));
      allRequests.push(...requestsWithClient);
    }

    await logActivity(req.user.uid, 'get_all_broker_requests', req);
    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'get_all_broker_requests',
      message: 'All broker requests retrieved successfully',
    };
    await Notification.create(notificationData);

    res.status(200).json({
      success: true,
      message: 'All broker requests retrieved successfully',
      requests: allRequests,
    });
  } catch (error) {
    console.error('Error getting all broker requests:', error);
    res.status(500).json({
      success: false,
      message: `Error getting broker requests: ${error.message}`,
    });
  }
};

exports.getClientsWithRequests = async (req, res) => {
  try {
    // Get broker ID from user profile
    const brokerId = req.user.profile?.brokerId;
    if (!brokerId) {
      return res.status(400).json({ success: false, message: 'Broker ID not found in user profile' });
    }

    // Get all clients for this broker
    const clients = await Client.getClients(brokerId);
    
    // Get requests for each client and add request statistics
    const clientsWithRequests = await Promise.all(
      clients.map(async (client) => {
        const clientRequests = await Request.getByClient(client.id);
        
        // Calculate request statistics
        const totalRequests = clientRequests.length;
        const activeRequests = clientRequests.filter(req => 
          ['pending', 'confirmed', 'in_transit'].includes(req.status)
        ).length;
        const instantRequests = clientRequests.filter(req => req.type === 'instant').length;
        const bookingRequests = clientRequests.filter(req => req.type === 'booking').length;
        
        // Get latest request
        const latestRequest = clientRequests.length > 0 
          ? clientRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
          : null;

        return {
          ...client,
          totalRequests,
          activeRequests,
          instantRequests,
          bookingRequests,
          lastRequest: latestRequest ? latestRequest.createdAt : null,
          latestRequestStatus: latestRequest ? latestRequest.status : null,
          latestRequestType: latestRequest ? latestRequest.type : null,
          requests: clientRequests // Include full request details if needed
        };
      })
    );

    await logActivity(req.user.uid, 'get_clients_with_requests', req);
    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'get_clients_with_requests',
      message: 'Clients with requests retrieved successfully',
    };
    await Notification.create(notificationData);

    res.status(200).json({
      success: true,
      message: 'Clients with requests retrieved successfully',
      data: clientsWithRequests,
    });
  } catch (error) {
    console.error('Error getting clients with requests:', error);
    res.status(500).json({
      success: false,
      message: `Error getting clients with requests: ${error.message}`,
    });
  }
};

exports.getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.getAll();
    const bookings = [];

   for (const broker of brokers) {
      const user = await User.get(broker.userId);
      broker.user = formatTimestamps(user); 

      const clients = await Client.getClients(broker.id);
      broker.clients = formatTimestamps(clients);
      broker.clientCount = clients.length;

      const bookings = await Booking.get(broker.id);
      broker.bookings = formatTimestamps(bookings);
      broker.bookingCount = bookings.length;
      bookings.push(...bookings);
    }

    const activeBrokers = brokers.filter(broker => broker.status === 'active' || broker.status === 'approved');
    const inactiveBrokers = brokers.filter(broker => broker.status === 'pending' || broker.status === 'rejected');
    const totalClients = await Client.getAll();
    
    await logAdminActivity(req.user.uid, 'get_all_brokers', req);

    const notificationData = {
      userId: req.user.uid,
      userType: 'admin',
      type: 'get_all_brokers',
      message: 'Brokers retrieved successfully',
    };
    await Notification.create(notificationData);
    
    res.status(200).json({
      success: true,
      message: 'Brokers retrieved successfully',
      data: formatTimestamps(brokers), 
      activeBrokers: activeBrokers.length,
      inactiveBrokers: inactiveBrokers.length,
      totalBrokers: brokers.length,
      totalClients: totalClients.length,
      totalBookings: bookings.length  
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

    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'deactivate_client',
      message: 'Client deactivated successfully',
    };
    await Notification.create(notificationData);

    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }
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

    await logAdminActivity(req.user.uid, 'delete_client', req);

    const notificationData = {
      userId: req.user.uid,
      userType: 'admin',
      type: 'delete_client',
      message: 'Client deleted successfully',
    }
    await Notification.create(notificationData);
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
    
    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'restore_client',
      message: 'Client restored successfully',
    };

    await Notification.create(notificationData);
    
    // if (broker.notificationPreferences.method === 'email' || broker.notificationPreferences.method === 'both') {
    //   await sendEmail(email, 'Broker Account Created', notificationData.message);
    // }
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
    
    const notificationData = {
      userId: req.user.uid,
      userType: 'broker',
      type: 'update_profile',
      message: 'Profile updated successfully',
    };
    await Notification.create(notificationData);
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

exports.consolidateAndMatch = async (req, res) => {
  try {
    const requestIds = req.body.requestIds;
    const { newBooking, matchedTransporter } = await MatchingService.matchConsolidatedBookings(requestIds);

    res.status(200).json({
      success: true,
      message: 'Bookings consolidated and matched successfully',
      newBooking, 
      matchedTransporter,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error consolidating bookings: ${error.message}`,
    });
  }
};

exports.deleteBroker = async (req, res) => {
  try {
    const { brokerId } = req.params;
    const adminId = req.user.uid;
    const deletedBroker = await Broker.deleteBroker(brokerId, adminId);
    await logAdminActivity(req.user.uid, 'delete_broker', req);
    res.status(200).json({
      success: true,
      message: 'Broker deleted successfully',
      data: deletedBroker,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error deleting broker: ${error.message}`,
    });
  }
};

exports.reviewBroker = async (req, res) => {
  try {
    const { brokerId } = req.params;
    const adminId = req.user.uid;
    const { action, reason, idExpiryDate } = req.body;

    const broker = await Broker.get(brokerId);
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }

    const validActions = ['approve', 'reject', 'suspend', 'unsuspend', 'deactivate'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: `Invalid action. Use one of: ${validActions.join(', ')}` });
    }

    const user = await User.get(broker.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ---------------- REJECT ----------------
    if (action === 'reject') {
      const updateData = {
        status: 'rejected',
        rejectionReason: reason || 'Not specified',
        idVerified: false,
        approvedBy: adminId
      };
      await Broker.update(brokerId, updateData);

      await logAdminActivity(adminId, 'reject_broker', req);

      await sendEmail({
        to: user.email,
        subject: 'Broker Account Rejected',
        html: getRejectTemplate('Broker Account Rejected', `Your broker account has been rejected. Reason: ${reason}`, user),
        text: `Your broker account has been rejected. Reason: ${reason}`
      });

      return res.status(200).json({ success: true, message: 'Broker rejected successfully' });
    }

    // ---------------- APPROVE ----------------
    if (action === 'approve') {
      const updateData = {
        status: 'approved',
        approvedBy: adminId,
        idExpiryDate: idExpiryDate || null,
        idVerified: true,
        accountStatus: true
      };
      await Broker.update(brokerId, updateData);
      await logAdminActivity(adminId, 'approve_broker', req);

      await sendEmail({
        to: user.email,
        subject: 'Broker Account Approved',
        html: getBrokerTemplate(user),
        text: 'Your broker account has been approved. Welcome to Truk!'
      });

      return res.status(200).json({ success: true, message: 'Broker approved successfully' });
    }

    // ---------------- SUSPEND ----------------
    if (action === 'suspend') {
      const updateData = {
        status: 'suspended',
        suspendedBy: adminId,
        suspensionReason: reason || 'Not specified'
      };
      await Broker.update(brokerId, updateData);
      await logAdminActivity(adminId, 'suspend_broker', req);

      await sendEmail({
        to: user.email,
        subject: 'Broker Account Suspended',
        html: getBrokerTemplate(user),
        text: `Your broker account has been suspended. Reason: ${reason}`
      });

      return res.status(200).json({ success: true, message: 'Broker suspended successfully' });
    }

    // ---------------- UNSUSPEND ----------------
    if (action === 'unsuspend') {
      const updateData = {
        status: 'approved',
        suspendedBy: null,
        approvedBy: adminId
      };
      await Broker.update(brokerId, updateData);
      await logAdminActivity(adminId, 'unsuspend_broker', req);

      await sendEmail({
        to: user.email,
        subject: 'Broker Account Unsuspended',
        html: getBrokerTemplate(user),
        text: 'Your broker account has been unsuspended. Welcome back to Truk!'
      });

      return res.status(200).json({ success: true, message: 'Broker unsuspended successfully' });
    }

    // ---------------- DEACTIVATE ----------------
    if (action === 'deactivate') {
      const updateData = {
        status: 'deactivated',
        accountStatus: false,
        deactivatedBy: adminId,
        deactivationReason: reason || 'Not specified'
      };
      await Broker.update(brokerId, updateData);
      await logAdminActivity(adminId, 'deactivate_broker', req);

      await sendEmail({
        to: user.email,
        subject: 'Broker Account Deactivated',
        html: getRejectTemplate('Broker Account Deactivated', `Your broker account has been deactivated. Reason: ${reason}`, user),
        text: `Your broker account has been deactivated. Reason: ${reason}`
      });

      return res.status(200).json({ success: true, message: 'Broker deactivated successfully' });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error reviewing broker: ${error.message}`
    });
  }
};

exports.uploadDocuments = async (req, res) => {
  try {
    const { brokerId }= req.params;
   
    const broker = await Broker.getByUserId(brokerId);
    if (!broker) {
      return res.status(404).json({ success: false, message: 'Broker not found' });
    }

    // console.log("idImage", req.file);
    let idImage = null; 
        if (req.file) {
          console.log('Processing  file:', req.file.originalname, req.file.mimetype, req.file.path); // Debug file
          try {
            idImage = await uploadImage(req.file.path);
            if (idImage) {
              console.log('idImage uploaded successfully:', idImage);
              fs.unlinkSync(req.file.path); 
            } else {
              console.error('Failed to upload logo, continuing without idImage');
            }
          } catch (uploadError) {
            console.error('Upload error:', uploadError.message);
            return res.status(500).json({ message: 'Failed to upload idImage' });
          }
        } else {
          console.log('No idImage file received');
        }
    const documents = {
      brokerIdUrl: idImage,
      status: 'renewal'
    };

    const updated = await Broker.update(broker.brokerId, documents);
    console.log("updated", updated);

    await logActivity(req.user.uid, 'update_broker_documents', req);

    await Action.create({
      type: "broker_review",
      entityId: broker.brokerId,
      priority: "high",
      metadata: {
        brokerId: broker.brokerId
      },
      status: "Needs Approval",
      message: 'Broker documents changed',
    });

    await sendEmail({
      to: 'support@trukafrica.com',
      subject: 'Broker Documents Updated',
      html: adminNotification('Broker Documents Updated', 'A broker has updated their documents', broker.brokerId),
      text: 'Your broker account has been approved. Welcome to Truk!'
    })

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error uploading documents: ${error.message}`,
    });
  }
};
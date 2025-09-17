const Transporter = require("../models/Transporter");
const Booking = require("../models/Booking");
const { logAdminActivity } = require("../utils/activityLogger");
const User = require('../models/User');
const Permission = require('../models/Permission');
const admin = require('../config/firebase');
const db = admin.firestore();
const json2csv = require('json2csv').parse;
const fastcsv = require('fast-csv');
const { Parser } = require('json2csv');
const pdf = require('html-pdf');
const moment = require('moment');
const exportData  = require("../utils/exportData");
const sendEmail = require("../utils/sendEmail");
const SMSService = require('../utils/sendSms');
const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);
const formatPhoneNumber = require("../utils/formatPhone");
const Subscribers = require("../models/Subscribers");
const subscriptionController = require('./subscriptionController');
const {formatTimestamps } = require('../utils/formatData');
const Company = require("../models/Company");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Action = require("../models/Action");
const { getRejectTemplate } = require("../utils/sendMailTemplate");


exports.deleteTransporter = async (req, res) => {
  try {
    await Transporter.softDelete(req.params.transporterId);
    await logAdminActivity(req.user.uid, 'delete_transporter', req, { type: 'transporter', id: transporterId });
    res.status(200).json({ message: 'Transporter deleted successfully' });
  } catch (error) {
    console.error('Delete transporter error:', error);
    res.status(500).json({ message: 'Failed to delete transporter' });
  }
};

exports.hardDeleteTransporter = async (req, res) => {
  try {
    await Transporter.delete(req.params.transporterId);
    await logAdminActivity(req.user.uid, 'hard_delete_transporter', req, { type: 'transporter', id: transporterId });
    res.status(200).json({ message: 'Transporter hard deleted successfully' });
  } catch (error) {
    console.error('Hard delete transporter error:', error);
    res.status(500).json({ message: 'Failed to hard delete transporter' });
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
    res.status(200).json({ message: 'Admin permissions updated successfully', permissions: formatTimestamps(permissions) });
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
    const allBookings = await Booking.getAll();
    try {
      await logAdminActivity(req.user.uid, 'get_all_bookings', req);
    } catch (error) {
      console.error('Admin activity log error:', error);  
    }
    
    const bookResponse = formatTimestamps(allBookings);
    
    res.status(200).json({ 
      message: 'All bookings retrieved successfully', 
      bookings: bookResponse,
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
      users: formatTimestamps(results), // Format the results
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
    res.status(200).json({ message: 'All users retrieved successfully', users: formatTimestamps(users) });
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
    res.status(200).json({ message: 'All permissions retrieved successfully', permissions: formatTimestamps(permissions) });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ message: 'Failed to retrieve all permissions' });
  }
};

exports.exportToCSV = async (req, res) => {
  try {
    const { entity, startDate, endDate } = req.query;
    let data = [];
    let collectionRef = db.collection(entity);

    // Add date filtering if provided
    if (startDate || endDate) {
      collectionRef = collectionRef
        .where('createdAt', '>=', startDate ? new Date(startDate) : new Date(0))
        .where('createdAt', '<=', endDate ? new Date(endDate) : new Date());
    }

    const snapshot = await collectionRef.get();
    data = snapshot.docs.map(doc => {
      const docData = doc.data();
      // Format dates for better CSV readability
      if (docData.createdAt) {
        docData.createdAt = moment(docData.createdAt.toDate()).format('YYYY-MM-DD HH:mm:ss');
      }
      return { id: doc.id, ...docData };
    });

    if (data.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found' });
    }

    const fields = Object.keys(data[0]);
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${entity}_export_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export to CSV error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
};

exports.generatePDFReport = async (req, res) => {
  try {
    const { entity, startDate, endDate } = req.query;
    let data = [];

    console.log(entity, startDate, endDate);

    const query = db.collection(entity || 'bookings')
      .where('createdAt', '>=', startDate ? new Date(startDate) : new Date(0))
      .where('createdAt', '<=', endDate ? new Date(endDate) : new Date());

    const snapshot = await query.get();
    data = snapshot.docs.map(doc => {
      const docData = doc.data();
      // Format Firestore timestamps
      if (docData.createdAt) {
        docData.createdAt = moment(docData.createdAt.toDate()).format('LLL');
      }
      return { id: doc.id, ...docData };
    });

    if (data.length === 0) {
      return res.status(404).json({ success: false, message: 'No data found' });
    }

    // Get company info (you might want to store this in a config or database)
    const companyName = "TRUK AFRICA";
    const companyAddress = "123 NAIROBI";
    const companyPhone = "+254 758-594951";
    const companyEmail = "info@trukafrica.com";
    const companyWebsite = "www.trukafrica.com";
    
    // Generate HTML for PDF with professional styling
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${entity.charAt(0).toUpperCase() + entity.slice(1)} Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #4a86e8;
          padding-bottom: 15px;
        }
        .company-info {
          flex: 1;
          text-align: center;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #4a86e8;
          margin-bottom: 5px;
        }
        .report-info {
          text-align: right;
        }
        .report-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
         .logo {
            flex: 0 0 auto;
            margin-right: 30px;
        }
        
        .logo-placeholder {
            width: 80px;
            height: 80px;
            background: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: #4a6580;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        }
        .report-details {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        .date-range {
          font-style: italic;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #4a86e8;
          color: white;
          padding: 10px;
          text-align: left;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #777;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        .page-break {
          page-break-after: always;
        }
        .summary {
          margin: 15px 0;
          padding: 10px;
          background-color: #e7f3fe;
          border-left: 4px solid #4a86e8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo"> 
          <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" class="logo-placeholder" alt="Company Logo">
        </div>
        <div class="company-info">
        <div class="company-name">${companyName}</div>
          <div>${companyAddress}</div>
          <div>${companyPhone} | ${companyEmail}</div>
          <div>${companyWebsite}</div>
        </div>        
      </div>

      <div class="report-info">
        <div class="report-title">${entity.charAt(0).toUpperCase() + entity.slice(1)} Report</div>
        <div>Generated on: ${moment().format('LLLL')}</div>
      </div>

      <div class="report-details">
        <div class="date-range">
          Date Range: ${startDate ? moment(startDate).format('LL') : 'Beginning of records'} to ${endDate ? moment(endDate).format('LL') : 'Present'}
        </div>
        <div>Total Records: ${data.length}</div>
      </div>

      <div class="summary">
        <strong>Report Summary:</strong> This report contains all ${entity} records for the specified date range.
      </div>

      <table>
        <thead>
          <tr>
            ${Object.keys(data[0]).map(key => `<th>${key.charAt(0).toUpperCase() + key.slice(1)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${Object.values(row).map(val => `<td>${val !== null && val !== undefined ? val : '-'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>${companyName} - Confidential Report</div>
        <div>Generated on ${moment().format('LLLL')} | Page {{page}} of {{pages}}</div>
      </div>
    </body>
    </html>
    `;

    const options = { 
      format: 'A4', 
      orientation: 'portrait',
      footer: {
        height: "15mm",
        contents: {
          default: '<span style="color: #444; font-size: 10px;">{{page}}/{{pages}}</span>', 
        }
      },
      border: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.7in",
        left: "0.5in"
      }
    };

    pdf.create(html, options).toStream((err, stream) => {
      if (err) throw err;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
      stream.pipe(res);
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

exports.sendReminders = async (req, res) => {
  try {
    const { entity, reminderType } = req.body;
    let usersToNotify = [];
    let message = '';

    // Get relevant entities based on type
    switch (entity) {
      case 'bookings':
        const bookings = await db.collection('bookings')
          .where('status', '==', 'pending')
          .get();
        
        usersToNotify = bookings.docs.map(doc => {
          const booking = doc.data();
          return {
            email: booking.farmerEmail,
            name: booking.farmerName,
            bookingId: doc.id,
            type: 'booking_reminder'
          };
        });
        message = 'Your booking is still pending confirmation';
        break;

      case 'transporters':
        const transporters = await db.collection('transporters')
          .where('status', '==', 'active')
          .get();
        
        usersToNotify = transporters.docs.map(doc => {
          const transporter = doc.data();
          return {
            email: transporter.email,
            name: transporter.name,
            transporterId: doc.id,
            type: 'availability_reminder'
          };
        });
        message = 'Please update your availability for upcoming jobs';
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    // Send notifications
    const batch = db.batch();
    const notificationsCollection = db.collection('notifications');

    for (const user of usersToNotify) {
      const notificationRef = notificationsCollection.doc();
      batch.set(notificationRef, {
        userId: user.transporterId || user.bookingId,
        email: user.email,
        message: `${message} - ${reminderType || 'standard reminder'}`,
        type: user.type,
        status: 'sent',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Here you would integrate with your email service (e.g., SendGrid, Mailgun)
      // await sendEmail(user.email, 'Reminder Notification', message);
    }

    await batch.commit();

    res.json({
      success: true,
      message: `Reminders sent to ${usersToNotify.length} ${entity}`,
      count: usersToNotify.length
    });

  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reminders' });
  }
};

// exports.generateReports = async (req, res) => {
exports.generateReports = async (req, res) => {
  try {
    const { type, format, ids } = req.body;

    console.log(type, format, ids);

    if (!type || !['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid report type or format' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one entity ID' });
    }

    let data = [];
    let fieldsConfig = [];
    let filename = '';
    let reportOptions = {};

    if (type === 'transporters') {
      const snapshot = await db.collection('transporters').where('transporterId', 'in', ids).get();
      data = snapshot.docs.map(doc => doc.data());
      fieldsConfig = [
        { key: 'transporterId', label: 'Transporter ID' },
        { key: 'driverName', label: 'Driver Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone Number' },
        { key: 'status', label: 'Status' },
        { key: 'acceptingBooking', label: 'Accepting Bookings' },
        { key: 'vehicleType', label: 'Vehicle Type' },
        { key: 'vehicleMake', label: 'Make' },
        { key: 'vehicleModel', label: 'Model' },
        { key: 'vehicleRegistration', label: 'Registration' },
        { key: 'vehicleCapacity', label: 'Capacity' },
        { key: 'humidityControl', label: 'Humidity Control' },
        { key: 'refrigerated', label: 'Refrigeration' },
        { key: 'specialCargo', label: 'Special Cargo' },
      ];
      filename = 'transporters';
      reportOptions = {
        companyName: 'Truk Company',
        companyAddress: '123 Business Street\nNairobi, Kenya\n+254 700 000 000',
        reportTitle: 'Transporters Report',
        logoPath: '../assets/logo.png',
        primaryColor: '#059669',
        secondaryColor: '#64748b',
      };
    } else {
      // Handle other types (bookings, brokers) as needed
      return res.status(400).json({ success: false, message: 'Unsupported report type' });
    }

    console.log("Fetched data:", data);
    console.log("Field config:", fieldsConfig);
    console.log("Filename:", filename);
    console.log("Format:", format);

    if (!data.length) {
      return res.status(404).json({ success: false, message: 'No records found for the provided IDs' });
    }

    exportData(data, fieldsConfig, format, res, filename, reportOptions);
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message || error,
    });
  }
};

exports.getAllShippers = async(req, res) => {
  try {
    const shippers = await User.getShippers();
    await logAdminActivity(req.user.uid, 'get_all_shippers', req);
    res.status(200).json({ message: 'All shippers retrieved successfully', shippers: formatTimestamps(shippers) });
  } catch (error) {
    console.error('Get all shippers error:', error);
    res.status(500).json({ message: 'Failed to retrieve all shippers' });
  }
}

exports.reviewTransporter = async (req, res) => {
  try {
    const transporterId = req.params.transporterId;
    const { action, reason, insuranceExpiryDate, driverLicenseExpiryDate, idExpiryDate } = req.body;

    // 1. Check if transporter exists
    const transporter = await Transporter.get(transporterId);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // 2. Check if already approved/rejected
    if (transporter.status === 'approved' && (action === 'approve-dl' || action === 'approve-insurance' || action === 'approve-id')) {
      return res.status(400).json({ message: 'Transporter already approved' });
    }
    if (transporter.status === 'rejected' && action === 'reject') {
      return res.status(400).json({ message: 'Transporter already rejected' });
    }

    let updates = {};

    if (action === 'approve-dl') {
      if (!driverLicenseExpiryDate) {
        return res.status(400).json({ message: 'driverLicenseExpiryDate is required' });
      }
      updates = {
        driverLicenseExpiryDate: admin.firestore.Timestamp.fromDate(new Date(driverLicenseExpiryDate)),
        driverLicenseapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Transporter.update(transporterId, updates);

      // Check if all documents are approved
      if (transporter.insuranceapproved && transporter.idapproved) {
        updates = {
          ...updates,
          status: 'approved',
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await Transporter.update(transporterId, updates);

        await sendEmail({
          to: transporter.email,
          subject: 'Transporter Approved',
          text: 'Your transporter account has been approved. Welcome to Truk!'
        });

        const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
        const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
        await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

        await logAdminActivity(
          req.user.uid,
          'approve_transporter',
          req,
          { type: 'transporter', id: transporterId }
        );
      }
      return res.status(200).json({ message: 'Driver license approved', updates });
    }

    if (action === 'approve-insurance') {
      if (!insuranceExpiryDate) {
        return res.status(400).json({ message: 'insuranceExpiryDate is required' });
      }
      updates = {
        insuranceExpiryDate: admin.firestore.Timestamp.fromDate(new Date(insuranceExpiryDate)),
        insuranceapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Transporter.update(transporterId, updates);

      // Check if all documents are approved
      if (transporter.driverLicenseapproved && transporter.idapproved) {
        updates = {
          ...updates,
          status: 'approved',
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await Transporter.update(transporterId, updates);

        await sendEmail({
          to: transporter.email,
          subject: 'Transporter Approved',
          text: 'Your transporter account has been approved. Welcome to Truk!'
        });

        const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
        const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
        //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

        await logAdminActivity(
          req.user.uid,
          'approve_transporter',
          req,
          { type: 'transporter', id: transporterId }
        );
      }
      return res.status(200).json({ message: 'Insurance approved', updates });
    }

    if (action === 'approve-id') {
      if (idExpiryDate) {
        updates = {
          idExpiryDate: admin.firestore.Timestamp.fromDate(new Date(idExpiryDate)),
          idapproved: true,
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await Transporter.update(transporterId, updates);
      }
      updates = {
        idapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Transporter.update(transporterId, updates);

      // Check if all documents are approved
      if (transporter.driverLicenseapproved && transporter.insuranceapproved) {
        updates = {
          ...updates,
          status: 'approved',
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await Transporter.update(transporterId, updates);

        await sendEmail({
          to: transporter.email,
          subject: 'Transporter Approved',
          text: 'Your transporter account has been approved. Welcome to Truk!'
        });

        const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
        const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
        //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

        await logAdminActivity(
          req.user.uid,
          'approve_transporter',
          req,
          { type: 'transporter', id: transporterId }
        );
      }
      return res.status(200).json({ message: 'ID approved', updates });
    }

    if (action === 'reject') {
      updates = {
        status: 'rejected',
        rejectionReason: reason || 'Unqualified',
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await Transporter.update(transporterId, updates);

      await sendEmail({
        to: transporter.email,
        subject: 'Transporter Rejected',
        html: getRejectTemplate('Transporter Rejected', `Your transporter account has been rejected. Reason: ${reason || 'Unqualified'}`, transporter),
        text: `Your transporter account has been rejected. Reason: ${reason || 'Unqualified'}`
      });

      const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
      const smsMessage = `Your Truk documents have been rejected. Reason: ${reason || 'Unqualified'}.`;
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'reject_transporter',
        req,
        { type: 'transporter', id: transporterId }
      );

      return res.status(200).json({ message: 'Transporter rejected', updates });
    }

    return res.status(400).json({ message: 'Invalid action, must be approve-dl, approve-insurance, approve-id, or reject' });
  } catch (error) {
    console.error('Review transporter error:', error);
    res.status(500).json({ message: 'Failed to review transporter' });
  }
};

exports.reviewCompany = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { action, reason, insuranceExpiryDate, driverLicenseExpiryDate, idExpiryDate, driverId, vehicleId } = req.body;
    console.log(`Reviewing company ${companyId} with action ${action} and vehicleId ${vehicleId} and driverId ${driverId}`);

    // 1. Check if transporter exists
    const company = await Company.get(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // 2. Check if already approved/rejected
    if (!company.status === 'approved' && (action === 'approve-dl' || action === 'approve-insurance' || action === 'approve-id')) {
      return res.status(400).json({ message: 'Company already not approved' });
    }
    if (company.status === 'rejected' && action === 'reject') {
      return res.status(400).json({ message: 'Transporter already rejected' });
    }

    let updates = {};

    if (action === 'approve-dl') {
      if (!driverId || !driverLicenseExpiryDate) {
        return res.status(400).json({ message: 'driverId and driverLicenseExpiryDate is required' });
      }
      updates = {
        driverLicenseExpiryDate: admin.firestore.Timestamp.fromDate(new Date(driverLicenseExpiryDate)),
        driverLicenseapproved: true,
        status: 'approved',
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Driver.update(companyId, driverId, updates);

      // await sendEmail({
      //   to: company.companyEmail,
      //   subject: 'Company Driver Approved',
      //   text: 'Your Driver license has been approved. Welcome to Truk!'
      // });

      const formattedPhone = formatPhoneNumber(company.companyContact);
      const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'approve_insurance documents',
        req,
        { type: 'company', id: companyId }
      );


      return res.status(200).json({ message: 'Driver license approved', updates });
    }

    if (action === 'approve-insurance') {
      if (!vehicleId || !insuranceExpiryDate) {
        return res.status(400).json({ message: ' vehicleId and insuranceExpiryDate is required' });
      }
      updates = {
        insuranceExpiryDate: admin.firestore.Timestamp.fromDate(new Date(insuranceExpiryDate)),
        insuranceapproved: true,
        status: 'approved',
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Vehicle.update(companyId, vehicleId, updates);

      // await sendEmail({
      //   to: company.companyEmail,
      //   subject: 'Company Vehicle Approved',
      //   text: 'Your Vehicle documents have been approved. Welcome to Truk!'
      // });

      const formattedPhone = formatPhoneNumber(company.companyContact);
      const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'approve_insurance documents',
        req,
        { type: 'company', id: companyId }
      );

      return res.status(200).json({ message: 'Insurance approved', updates });
    }

    if (action === 'approve-id') {
      if (idExpiryDate) {
        updates = {
          idExpiryDate: admin.firestore.Timestamp.fromDate(new Date(idExpiryDate)),
          idapproved: true,
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await Driver.update(companyId, driverId, updates);
      }
      updates = {
        idapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      await Driver.update(companyId, driverId, updates);

      // await sendEmail({
      //   to: company.companyEmail,
      //   subject: 'Driver Id Approved',
      //   text: 'Your driver Id has been approved. Welcome to Truk!'
      // });

      const formattedPhone = formatPhoneNumber(company.companyContact);
      const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'approve_driver',
        req,
        { type: 'company', id: companyId }
      );

      return res.status(200).json({ message: 'ID approved', updates });
    }

    if (action === 'reject-driver') {
      updates = {
        status: 'rejected',
        rejectionReason: reason || 'Unqualified',
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await Driver.update(companyId, driverId, updates);

      // await sendEmail({
      //   to: company.companyEmail,
      //   subject: 'DriverRejected',
      //   text: `Your Driver has been rejected. Reason: ${reason || 'Unqualified'}`
      // });

      const formattedPhone = formatPhoneNumber(company.companyContact);
      const smsMessage = `Your Truk documents have been rejected. Reason: ${reason || 'Unqualified'}.`;
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'reject_driver',
        req,
        { type: 'company', id: companyId }
      );

      return res.status(200).json({ message: 'Driver rejected', updates });
    }

    if (action === 'reject-vehicle') {
      updates = {
        status: 'rejected',
        rejectionReason: reason || 'Unqualified',
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await Vehicle.update(companyId, vehicleId, updates);

      // await sendEmail({
      //   to: company.companyEmail,
      //   subject: 'Vehicle Rejected',
      //   text: `Your vehicle has been rejected. Reason: ${reason || 'Unqualified'}`
      // });

      const formattedPhone = formatPhoneNumber(company.companyContact);
      const smsMessage = `Your Truk documents have been rejected. Reason: ${reason || 'Unqualified'}.`;
      //await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

      await logAdminActivity(
        req.user.uid,
        'reject_vehicle',
        req,
        { type: 'company', id: companyId }
      );

      return res.status(200).json({ message: 'Vehicle rejected', updates });
    }

    return res.status(400).json({ message: 'Invalid action, must be approve-dl, approve-insurance, approve-id, or reject' });
  } catch (error) {
    console.error('Review transporter error:', error);
    res.status(500).json({ message: 'Failed to review transporter' });
  }
};

exports.getAllActions = async (req, res) => {
  try {
    const actions = await Action.getAll();
    res.status(200).json({ 
      message: 'Actions retrieved successfully',
      actions: formatTimestamps(actions) 
    });
  } catch (error) {
    console.error('Error retrieving actions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getPendingActions = async (req, res) => {
  try {
    const actions = await Action.getPending();

    res.status(200).json({ 
      success: true, 
      actions: formatTimestamps(actions),
      count: actions.length
    });
  } catch (error) {
    console.error('Get pending actions error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve actions' });
  }
};

exports.markAsResolved = async (req, res) => {
  try {
    const actionId = req.params.actionId;
    const adminId = req.user.uid;
    await Action.markResolved(actionId, adminId);
    res.status(200).json({ message: 'Action marked as resolved' });
  } catch (error) {
    console.error('Error marking action as resolved:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


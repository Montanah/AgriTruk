const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Company = require('../models/Company');
const admin = require('../config/firebase');
const { sendEmail } = require('../utils/sendEmail');
const SMSService = require('../utils/sendSms');
const formatPhoneNumber = require("../utils/formatPhone");
const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

const CompanyDocumentExpiryService = {
  /**
   * Check all documents and send reminders
   */
  async checkAllDocuments() {
    try {
      console.log('Starting document expiry check...');
      
      // Check driver documents
      await this.checkDriverDocuments();
      
      // Check vehicle documents
      await this.checkVehicleDocuments();
      
      console.log('Document expiry check completed');
    } catch (error) {
      console.error('Error checking documents:', error);
      throw error;
    }
  },

  /**
   * Check driver documents expiry
   */
  async checkDriverDocuments() {
    try {
      const drivers = await Driver.getAll();
      const expiryThresholds = [30, 14, 7, 3, 1]; // Days before expiry to send reminders

      for (const driver of drivers) {
        const company = await Company.get(driver.companyId);
        if (!company) continue;

        // Check each document type
        const documents = [
          {
            type: 'ID Document',
            expiryDate: driver.idExpiryDate,
            approved: driver.idApproved,
          },
          {
            type: 'Driver License',
            expiryDate: driver.driverLicenseExpiryDate,
            approved: driver.driverLicenseApproved,
          },
          {
            type: 'Good Conduct Certificate',
            expiryDate: driver.goodConductCertExpiryDate,
            approved: driver.goodConductCertApproved,
          },
          {
            type: 'Goods Service License',
            expiryDate: driver.goodsServiceLicenseExpiryDate,
            approved: driver.goodsServiceLicenseApproved,
          },
        ];

        for (const doc of documents) {
          if (!doc.expiryDate || !doc.approved) continue;

          const daysUntilExpiry = this.calculateDaysUntilExpiry(doc.expiryDate);

          // Document has expired
          if (daysUntilExpiry < 0) {
            await this.sendDriverDocumentExpiredNotification(driver, company, doc);
          }
          // Document is expiring soon
          else if (expiryThresholds.includes(daysUntilExpiry)) {
            await this.sendDriverDocumentExpiringNotification(driver, company, doc, daysUntilExpiry);
          }
        }
      }
    } catch (error) {
      console.error('Error checking driver documents:', error);
      throw error;
    }
  },

  /**
   * Check vehicle documents expiry
   */
  async checkVehicleDocuments() {
    try {
      const vehicles = await Vehicle.getAll();
      const expiryThresholds = [30, 14, 7, 3, 1];

      for (const vehicle of vehicles) {
        const company = await Company.get(vehicle.companyId);
        if (!company) continue;

        // Check insurance expiry
        if (vehicle.insuranceExpiry && vehicle.insuranceApproved) {
          const daysUntilExpiry = this.calculateDaysUntilExpiry(vehicle.insuranceExpiry);

          // Insurance has expired
          if (daysUntilExpiry < 0) {
            await this.sendVehicleDocumentExpiredNotification(vehicle, company, 'Insurance');
          }
          // Insurance is expiring soon
          else if (expiryThresholds.includes(daysUntilExpiry)) {
            await this.sendVehicleDocumentExpiringNotification(vehicle, company, 'Insurance', daysUntilExpiry);
          }
        }
      }
    } catch (error) {
      console.error('Error checking vehicle documents:', error);
      throw error;
    }
  },

  /**
   * Send driver document expired notification
   */
  async sendDriverDocumentExpiredNotification(driver, company, document) {
    try {
      // Get transporter/company owner details
      const companyDoc = await Company.get(company.id);
      if (!companyDoc) return;

    //   const transporterDoc = await db.collection('users').doc(company.transporterId).get();
    //   if (!transporterDoc.exists) return;

      const transporter = companyDoc;

      const subject = `URGENT: Driver Document Expired - ${driver.firstName} ${driver.lastName}`;
      const message = `
        URGENT: Document Expired
        
        Driver: ${driver.firstName} ${driver.lastName}
        Company: ${company.name}
        Document: ${document.type}
        Expired On: ${new Date(document.expiryDate).toLocaleDateString()}
        
        This driver's ${document.type} has EXPIRED. Please update the document immediately to maintain compliance.
        
        The driver may be restricted from accepting new loads until the document is renewed.
        
        Action Required:
        1. Upload the renewed document
        2. Wait for approval
        
        Login to your dashboard: ${process.env.APP_URL}/dashboard
      `;

      // Send to company owner
      if (transporter.companyEmail) {
        await sendEmail({
          to: transporter.email,
          subject,
          text: message,
          html: this.generateDriverDocumentExpiredHTML(driver, company, document, transporter.name),
        })
      }

      // Send SMS alert if phone available
      if (transporter.companyContact) {
        const formattedPhone = formatPhoneNumber(transporter.companyContact);
        const message= `URGENT: ${driver.firstName} ${driver.lastName}'s ${document.type} has EXPIRED. Update immediately. Login: ${process.env.APP_URL}/dashboard`;
        await smsService.sendSMS(
          'TRUK LTD', 
          message,
          formattedPhone
        );
      }

      // Also notify the driver
      if (driver.email) {
        await sendEmail({
          to: driver.email,
          subject: `Your ${document.type} Has Expired`,
          text: `Your ${document.type} expired on ${new Date(document.expiryDate).toLocaleDateString()}. Please contact your company to update it.`,
          html: this.generateDriverDocumentExpiredHTMLForDriver(driver, document),
        });
      }

      // Log notification
      await Notification.create({
        userId: company.transporterId,
        type: 'driver_document_expired',
        channel: ['email', transporter.companyContact ? 'sms' : null].filter(Boolean),
        metadata: {
          driverId: driver.driverId,
          documentType: document.type,
          expiryDate: document.expiryDate,
        },
        sentAt: new Date(),
      });

      console.log(`Expired document notification sent for driver ${driver.driverId}`);
    } catch (error) {
      console.error('Error sending driver document expired notification:', error);
    }
  },

  /**
   * Send driver document expiring notification
   */
  async sendDriverDocumentExpiringNotification(driver, company, document, daysRemaining) {
    try {
      const companyDoc = await Company.get(company.id);
      if (!companyDoc) return;

    //   const transporterDoc = await db.collection('users').doc(company.transporterId).get();
    //   if (!transporterDoc.exists) return;

      const transporter = companyDoc;

      const subject = `Reminder: Driver Document Expiring in ${daysRemaining} Days - ${driver.firstName} ${driver.lastName}`;
      const message = `
        Document Expiry Reminder
        
        Driver: ${driver.firstName} ${driver.lastName}
        Company: ${company.name}
        Document: ${document.type}
        Expires On: ${new Date(document.expiryDate).toLocaleDateString()}
        Days Remaining: ${daysRemaining}
        
        Please renew this document before it expires to avoid service disruption.
        
        Login to your dashboard: ${process.env.APP_URL}/dashboard
      `;

      if (transporter.companyEmail) {
        await sendEmail({
          to: transporter.email,
          subject,
          text: message,
          html: this.generateDriverDocumentExpiringHTML(driver, company, document, daysRemaining, transporter.name),
        });
      }

      // Notify driver
      if (driver.email) {
        await sendEmail({
          to: driver.email,
          subject: `Your ${document.type} Expires in ${daysRemaining} Days`,
          text: `Your ${document.type} will expire on ${new Date(document.expiryDate).toLocaleDateString()}. Please renew it soon.`,
          html: this.generateDriverDocumentExpiringHTMLForDriver(driver, document, daysRemaining),
        });
      }

      await Notification.create({
        userId: company.transporterId,
        type: 'driver_document_expiring',
        channel: ['email'],
        metadata: {
          driverId: driver.driverId,
          documentType: document.type,
          expiryDate: document.expiryDate,
          daysRemaining,
        },
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending driver document expiring notification:', error);
    }
  },

  /**
   * Send vehicle document expired notification
   */
  async sendVehicleDocumentExpiredNotification(vehicle, company, documentType) {
    try {
      const companyDoc = await Company.get(company.id);
      if (!companyDoc) return;

    //   const transporterDoc = await db.collection('users').doc(company.transporterId).get();
    //   if (!transporterDoc.exists) return;

      const transporter = companyDoc;

      const subject = `URGENT: Vehicle ${documentType} Expired - ${vehicle.vehicleRegistration}`;
      const message = `
        URGENT: Vehicle Document Expired
        
        Vehicle: ${vehicle.vehicleRegistration} (${vehicle.make || ''} ${vehicle.type || ''})
        Company: ${company.name}
        Document: ${documentType}
        Expired On: ${new Date(vehicle.insuranceExpiry).toLocaleDateString()}
        
        This vehicle's ${documentType} has EXPIRED. Please update immediately to maintain compliance.
        
        The vehicle may be restricted from use until the document is renewed.
        
        Login to your dashboard: ${process.env.APP_URL}/dashboard
      `;

      if (transporter.companyEmail) {
        await sendEmail({
          to: transporter.email,
          subject,
          text: message,
          html: this.generateVehicleDocumentExpiredHTML(vehicle, company, documentType, transporter.name),
        });
      }

      if (transporter.companyContact) {
        const formattedPhone = formatPhoneNumber(transporter.companyContact);
        const message= `URGENT: Vehicle ${vehicle.vehicleRegistration} ${documentType} EXPIRED. Update immediately.`;
        await smsService.sendSMS(
          'TRUK LTD', 
          message,
          formattedPhone
        );
      }

      await Notification.create({
        userId: company.transporterId,
        type: 'vehicle_document_expired',
        channel: ['email', transporter.phone ? 'sms' : null].filter(Boolean),
        metadata: {
          vehicleId: vehicle.vehicleId,
          documentType,
          expiryDate: vehicle.insuranceExpiry,
        },
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending vehicle document expired notification:', error);
    }
  },

  /**
   * Send vehicle document expiring notification
   */
  async sendVehicleDocumentExpiringNotification(vehicle, company, documentType, daysRemaining) {
    try {
      const companyDoc = await Company.get(company.id);
      if (!companyDoc) return;

    //   const transporterDoc = await db.collection('users').doc(company.transporterId).get();
    //   if (!transporterDoc.exists) return;

      const transporter = companyDoc;

      const subject = `Reminder: Vehicle ${documentType} Expiring in ${daysRemaining} Days - ${vehicle.vehicleRegistration}`;
      const message = `
        Vehicle Document Expiry Reminder
        
        Vehicle: ${vehicle.vehicleRegistration} (${vehicle.make || ''} ${vehicle.type || ''})
        Company: ${company.name}
        Document: ${documentType}
        Expires On: ${new Date(vehicle.insuranceExpiry).toLocaleDateString()}
        Days Remaining: ${daysRemaining}
        
        Please renew this document before it expires.
        
        Login to your dashboard: ${process.env.APP_URL}/dashboard
      `;

      if (transporter.companyEmail) {
        await sendEmail({
          to: transporter.email,
          subject,
          text: message,
          html: this.generateVehicleDocumentExpiringHTML(vehicle, company, documentType, daysRemaining, transporter.name),
        });
      }

      await Notification.create({
        userId: company.transporterId,
        type: 'vehicle_document_expiring',
        channel: ['email'],
        metadata: {
          vehicleId: vehicle.vehicleId,
          documentType,
          expiryDate: vehicle.insuranceExpiry,
          daysRemaining,
        },
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending vehicle document expiring notification:', error);
    }
  },

  /**
   * Calculate days until expiry
   */
  calculateDaysUntilExpiry(expiryDate) {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },

  /**
   * Generate HTML templates for notifications
   */
  generateDriverDocumentExpiredHTML(driver, company, document, transporterName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .alert { background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; }
          .info-box { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 URGENT: Document Expired</h1>
          </div>
          <div class="content">
            <p>Dear ${transporterName},</p>
            <div class="warning">
              <strong>⚠️ Reminder:</strong> A driver's document will expire in <strong>${daysRemaining} days</strong>
            </div>
            <div class="info-box">
              <p><strong>Driver:</strong> ${driver.firstName} ${driver.lastName}</p>
              <p><strong>Company:</strong> ${company.name}</p>
              <p><strong>Document Type:</strong> ${document.type}</p>
              <p><strong>Expiry Date:</strong> ${new Date(document.expiryDate).toLocaleDateString()}</p>
              <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
            </div>
            <p>Please renew this document before it expires to avoid service disruption and maintain compliance.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/dashboard/drivers/${driver.driverId}" class="button">View Driver Details</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  generateDriverDocumentExpiringHTMLForDriver(driver, document, daysRemaining) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Dear ${driver.firstName},</p>
            <div class="warning">
              <strong>Your ${document.type} will expire in ${daysRemaining} days</strong> on ${new Date(document.expiryDate).toLocaleDateString()}
            </div>
            <p>Please renew your ${document.type} as soon as possible to continue working without interruption.</p>
            <p>Contact your company manager for assistance with the renewal process.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  generateVehicleDocumentExpiredHTML(vehicle, company, documentType, transporterName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .alert { background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; }
          .info-box { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 URGENT: Vehicle Document Expired</h1>
          </div>
          <div class="content">
            <p>Dear ${transporterName},</p>
            <div class="alert">
              <strong>⚠️ Immediate Action Required</strong>
            </div>
            <div class="info-box">
              <p><strong>Vehicle:</strong> ${vehicle.vehicleRegistration}</p>
              <p><strong>Type:</strong> ${vehicle.make || ''} ${vehicle.type || ''}</p>
              <p><strong>Company:</strong> ${company.name}</p>
              <p><strong>Document:</strong> ${documentType}</p>
              <p><strong>Expired On:</strong> ${new Date(vehicle.insuranceExpiry).toLocaleDateString()}</p>
            </div>
            <p>This vehicle's ${documentType} has <strong>EXPIRED</strong>. The vehicle must not be used until the document is renewed and approved.</p>
            <p><strong>Action Required:</strong></p>
            <ol>
              <li>Upload the renewed ${documentType} document</li>
              <li>Wait for verification and approval</li>
              <li>Vehicle can resume operations once approved</li>
            </ol>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/dashboard/vehicles/${vehicle.vehicleId}" class="button">Update Document Now</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  generateVehicleDocumentExpiringHTML(vehicle, company, documentType, daysRemaining, transporterName) {
    const urgencyColor = daysRemaining <= 7 ? '#ff9800' : '#ffc107';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .warning { background-color: #fff3cd; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; }
          .info-box { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Vehicle Document Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Dear ${transporterName},</p>
            <div class="warning">
              <strong>⚠️ Reminder:</strong> A vehicle document will expire in <strong>${daysRemaining} days</strong>
            </div>
            <div class="info-box">
              <p><strong>Vehicle:</strong> ${vehicle.vehicleRegistration}</p>
              <p><strong>Type:</strong> ${vehicle.make || ''} ${vehicle.type || ''}</p>
              <p><strong>Company:</strong> ${company.name}</p>
              <p><strong>Document:</strong> ${documentType}</p>
              <p><strong>Expiry Date:</strong> ${new Date(vehicle.insuranceExpiry).toLocaleDateString()}</p>
              <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
            </div>
            <p>Please renew this document before it expires to keep the vehicle operational.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/dashboard/vehicles/${vehicle.vehicleId}" class="button">View Vehicle Details</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Get expiring documents summary for a company
   */
  async getExpiringDocumentsSummary(companyId) {
    try {
      const company = await Company.get(companyId);
      const drivers = await Driver.getByCompanyId(companyId);
      const vehicles = await Vehicle.getByCompanyId(companyId);

      const summary = {
        expired: [],
        expiringSoon: [],
      };

      // Check driver documents
      for (const driver of drivers) {
        const documents = [
          { type: 'ID Document', expiryDate: driver.idExpiryDate },
          { type: 'Driver License', expiryDate: driver.driverLicenseExpiryDate },
          { type: 'Good Conduct Cert', expiryDate: driver.goodConductCertExpiryDate },
          { type: 'Goods Service License', expiryDate: driver.goodsServiceLicenseExpiryDate },
        ];

        for (const doc of documents) {
          if (!doc.expiryDate) continue;
          const daysRemaining = this.calculateDaysUntilExpiry(doc.expiryDate);

          if (daysRemaining < 0) {
            summary.expired.push({
              category: 'driver',
              driverId: driver.driverId,
              driverName: `${driver.firstName} ${driver.lastName}`,
              documentType: doc.type,
              expiryDate: doc.expiryDate,
              daysOverdue: Math.abs(daysRemaining),
            });
          } else if (daysRemaining <= 30) {
            summary.expiringSoon.push({
              category: 'driver',
              driverId: driver.driverId,
              driverName: `${driver.firstName} ${driver.lastName}`,
              documentType: doc.type,
              expiryDate: doc.expiryDate,
              daysRemaining,
            });
          }
        }
      }

      // Check vehicle documents
      for (const vehicle of vehicles) {
        if (vehicle.insuranceExpiry) {
          const daysRemaining = this.calculateDaysUntilExpiry(vehicle.insuranceExpiry);

          if (daysRemaining < 0) {
            summary.expired.push({
              category: 'vehicle',
              vehicleId: vehicle.vehicleId,
              vehicleReg: vehicle.vehicleRegistration,
              documentType: 'Insurance',
              expiryDate: vehicle.insuranceExpiry,
              daysOverdue: Math.abs(daysRemaining),
            });
          } else if (daysRemaining <= 30) {
            summary.expiringSoon.push({
              category: 'vehicle',
              vehicleId: vehicle.vehicleId,
              vehicleReg: vehicle.vehicleRegistration,
              documentType: 'Insurance',
              expiryDate: vehicle.insuranceExpiry,
              daysRemaining,
            });
          }
        }
      }

      return summary;
    } catch (error) {
      console.error('Error getting expiring documents summary:', error);
      throw error;
    }
  },
};

module.exports = CompanyDocumentExpiryService;
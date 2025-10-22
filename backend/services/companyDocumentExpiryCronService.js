const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Company = require('../models/Company');
const sendEmail = require('../utils/sendEmail');
const SMSService = require('../utils/sendSms');
const formatPhoneNumber = require('../utils/formatPhone');
const admin = require('../config/firebase');
const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);

class CompanyDocumentExpiryCronService {
  constructor() {
    this.notificationIntervals = {
      EXPIRING_SOON: [15, 7, 3, 1], // Days before expiry: 15, 7, 3, 1
      EXPIRED: [0], // On expiry day
      GRACE_PERIOD: [1, 7, 14] // Days after expiry: 1, 7, 14
    };
    
    this.documentTypes = {
      DRIVER_LICENSE: 'driverLicense',
      ID: 'id',
      VEHICLE_INSURANCE: 'insurance' // Added for vehicles
    };
  }

  // Main cron job method
  async runDocumentExpiryNotifications() {
    try {
      console.log('🚀 Starting company document expiry notification cron job...');

      const allCompanies = await Company.getAll();
      console.log('Processing companies:', allCompanies.length);

      const tasks = allCompanies.map(company => 
        this.processCompanyDocuments(company.id)
      );

      const results = await Promise.allSettled(tasks);
      console.log('📊 Document expiry results:', results);
      
      console.log('✅ Company document expiry cron job completed');
      return this.formatResults(results);
      
    } catch (error) {
      console.error('❌ Error in company document expiry cron:', error);
      throw error;
    }
  }

  // Process documents for a specific company
  async processCompanyDocuments(companyId) {
    const company = await Company.get(companyId);
    if (!company || !company.companyEmail) {
      console.warn(`⚠️ Company ${companyId} not found or lacks email`);
      return { type: 'skipped_company', companyId };
    }

    const tasks = [
      this.checkExpiringDocuments(companyId),
      this.checkExpiredDocuments(companyId),
      this.checkGracePeriodDocuments(companyId),
      this.deactivateNonCompliantResources(companyId)
    ];

    const results = await Promise.allSettled(tasks);
    return {
      companyId,
      results: this.formatCompanyResults(results)
    };
  }

  // Check for documents expiring soon
  async checkExpiringDocuments(companyId) {
    const notificationsSent = [];
    const company = await Company.get(companyId);
  
    for (const daysBefore of this.notificationIntervals.EXPIRING_SOON) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBefore);

      // Check drivers
      const drivers = await Driver.getByCompanyId(companyId);
      console.log(`🚗 Checking ${drivers.length} drivers for expiry in ${daysBefore} days...`);
      for (const driver of drivers) {
        for (const [docType, field] of Object.entries({
          [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
          [this.documentTypes.ID]: 'idExpiryDate'
        })) {
          const expiryDate = driver[field];
          if (expiryDate && this.isDateWithinDays(expiryDate.toDate(), targetDate, daysBefore)) {
            if (!this.hasNotificationBeenSent(driver, docType, 'expiring', daysBefore)) {
              await this.sendExpiringNotification(company, driver, docType, daysBefore);
              notificationsSent.push({
                driverId: driver.driverId,
                docType,
                type: 'expiring',
                daysBefore,
                sentAt: new Date()
              });
            }
          }
        }
      }

      // Check vehicles
      const vehicles = await Vehicle.getByCompanyId(companyId);
      for (const vehicle of vehicles) {
        const expiryDate = vehicle.insuranceExpiry; // Assuming this field exists
        if (expiryDate && this.isDateWithinDays(expiryDate.toDate(), targetDate, daysBefore)) {
          console.log(`🚚 Found expiring insurance for vehicle ${vehicle.id}, expiry: ${expiryDate.toDate()}`);
          if (!this.hasNotificationBeenSent(vehicle, this.documentTypes.VEHICLE_INSURANCE, 'expiring', daysBefore)) {
            await this.sendExpiringNotification(company, vehicle, this.documentTypes.VEHICLE_INSURANCE, daysBefore);
            notificationsSent.push({
              vehicleId: vehicle.id,
              docType: this.documentTypes.VEHICLE_INSURANCE,
              type: 'expiring',
              daysBefore,
              sentAt: new Date()
            });
          }
        }
      }
    }
    
    return { type: 'expiring_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for expired documents
  async checkExpiredDocuments(companyId) {
    const notificationsSent = [];
    const today = new Date();
    const company = await Company.get(companyId);

    // Check drivers
    const drivers = await Driver.getByCompanyId(companyId);
    for (const driver of drivers) {
      for (const [docType, field] of Object.entries({
        [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
        [this.documentTypes.ID]: 'idExpiryDate'
      })) {
        const expiryDate = driver[field];
        if (expiryDate && expiryDate.toDate() <= today) {
          if (!this.hasNotificationBeenSent(driver, docType, 'expired')) {
            await this.sendExpiredNotification(company, driver, docType);
            notificationsSent.push({
              driverId: driver.driverId,
              docType,
              type: 'expired',
              sentAt: new Date()
            });
          }
        }
      }
    }

    // Check vehicles
    const allVehicles = await Vehicle.getAll(); 
    console.log("allvehicles", allVehicles.length);
    const vehicles = await Vehicle.getByCompanyId(companyId);
    console.log(`🚗 Checking vehicles for expiry...`);
    console.log(vehicles.length);
    for (const vehicle of vehicles) {
      const expiryDate = vehicle.insuranceExpiry;
      if (expiryDate && expiryDate.toDate() <= today) {
        if (!this.hasNotificationBeenSent(vehicle, this.documentTypes.VEHICLE_INSURANCE, 'expired')) {
          await this.sendExpiredNotification(company, vehicle, this.documentTypes.VEHICLE_INSURANCE);
          notificationsSent.push({
            vehicleId: vehicle.id,
            docType: this.documentTypes.VEHICLE_INSURANCE,
            type: 'expired',
            sentAt: new Date()
          });
        }
      }
    }
    
    return { type: 'expired_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Check for documents in grace period
  async checkGracePeriodDocuments(companyId) {
    const notificationsSent = [];
    const company = await Company.get(companyId);

    for (const daysAfter of this.notificationIntervals.GRACE_PERIOD) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAfter);

      // Check drivers
      const drivers = await Driver.getByCompanyId(companyId);
      for (const driver of drivers) {
        for (const [docType, field] of Object.entries({
          [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
          [this.documentTypes.ID]: 'idExpiryDate'
        })) {
          const expiryDate = driver[field];
          if (expiryDate && expiryDate.toDate() <= targetDate) {
            if (!this.hasNotificationBeenSent(driver, docType, 'grace_period', daysAfter)) {
              await this.sendGracePeriodNotification(company, driver, docType, daysAfter);
              notificationsSent.push({
                driverId: driver.driverId,
                docType,
                type: 'grace_period',
                daysAfter,
                sentAt: new Date()
              });
            }
          }
        }
      }

      // Check vehicles
      const vehicles = await Vehicle.getByCompanyId(companyId);
      for (const vehicle of vehicles) {
        const expiryDate = vehicle.insuranceExpiry;
        if (expiryDate && expiryDate.toDate() <= targetDate) {
          if (!this.hasNotificationBeenSent(vehicle, this.documentTypes.VEHICLE_INSURANCE, 'grace_period', daysAfter)) {
            await this.sendGracePeriodNotification(company, vehicle, this.documentTypes.VEHICLE_INSURANCE, daysAfter);
            notificationsSent.push({
              vehicleId: vehicle.id,
              docType: this.documentTypes.VEHICLE_INSURANCE,
              type: 'grace_period',
              daysAfter,
              sentAt: new Date()
            });
          }
        }
      }
    }
    return { type: 'grace_period_documents', count: notificationsSent.length, notifications: notificationsSent };
  }

  // Deactivate non-compliant drivers or vehicles
  async deactivateNonCompliantResources(companyId) {
    const deactivated = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days grace period
    const company = await Company.get(companyId);

    // Deactivate drivers
    const drivers = await Driver.getByCompanyId(companyId);
    for (const driver of drivers) {
      for (const [docType, field] of Object.entries({
        [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
        [this.documentTypes.ID]: 'idExpiryDate'
      })) {
        const expiryDate = driver[field];
        if (expiryDate && expiryDate.toDate() <= cutoffDate && driver.status !== 'suspended') {
          await Driver.update(driver.driverId, {
            status: 'suspended',
            updatedAt: admin.firestore.Timestamp.now(),
            suspensionReason: `${this.getDocumentName(docType)} expired for more than 30 days`
          });
          deactivated.push({
            driverId: driver.driverId,
            docType,
            deactivatedAt: new Date()
          });
        }
      }
    }

    // Deactivate vehicles
    const vehicles = await Vehicle.getByCompanyId(companyId);
    for (const vehicle of vehicles) {
      const expiryDate = vehicle.insuranceExpiry;
      if (expiryDate && expiryDate.toDate() <= cutoffDate && vehicle.status !== 'maintenance') {
        await Vehicle.update(vehicle.id, {
          status: 'maintenance',
          updatedAt: admin.firestore.Timestamp.now(),
          suspensionReason: 'Insurance expired for more than 30 days'
        });
        deactivated.push({
          vehicleId: vehicle.id,
          docType: this.documentTypes.VEHICLE_INSURANCE,
          deactivatedAt: new Date()
        });
      }
    }
    
    return { type: 'deactivated_resources', count: deactivated.length, deactivated };
  }

  // Notification methods
  async sendExpiringNotification(company, entity, docType, daysBefore) {
    const docName = this.getDocumentName(docType);
    const entityName = this.getEntityName(entity);
    const expiryDate = this.getExpiryDate(entity, docType);
    const message = `${entityName} (${entity.id}) ${docName} expires in ${daysBefore} days (on ${expiryDate.toDateString()}). Please renew it to avoid service interruption.`;
    
    await this.sendNotification(company, message, `${docName} Expiring Soon for ${entityName}`);
    await this.updateNotificationRecord(entity, docType, 'expiring', daysBefore);
  }

  async sendExpiredNotification(company, entity, docType) {
    const docName = this.getDocumentName(docType);
    const entityName = this.getEntityName(entity);
    const message = `${entityName} (${entity.id}) ${docName} has expired. Please renew it immediately to continue using our services.`;
    
    await this.sendNotification(company, message, `${docName} Expired for ${entityName}`);
    await this.updateNotificationRecord(entity, docType, 'expired', true);
  }

  async sendGracePeriodNotification(company, entity, docType, daysAfter) {
    const docName = this.getDocumentName(docType);
    const entityName = this.getEntityName(entity);
    const message = `${entityName} (${entity.id}) ${docName} expired ${daysAfter} days ago. Renew now to avoid deactivation.`;
    
    await this.sendNotification(company, message, `Urgent: ${docName} Renewal Required for ${entityName}`);
    await this.updateNotificationRecord(entity, docType, 'grace_period', daysAfter);
  }

  async sendDeactivationNotification(company, entity, docType) {
    const docName = this.getDocumentName(docType);
    const entityName = this.getEntityName(entity);
    const message = `${entityName} (${entity.id}) has been deactivated because ${docName} has been expired for more than 30 days. Please renew documents and contact support.`;
    
    await this.sendNotification(company, message, `${entityName} Deactivated`);
  }

  // Send notification via email and SMS to company
  async sendNotification(company, message, subject) {
    try {
      if (company.companyEmail) {
        const emailTemplate = this.generateEmailTemplate(subject, message, company);
        await sendEmail({
          to: company.companyEmail,
          subject: subject,
          html: emailTemplate
        });
      }

      if (company.companyContact) {
        const formattedPhone = formatPhoneNumber(company.phone);
        await smsService.sendSMS(
          'TRUK LTD',
          message,
          formattedPhone
        );
      }

      console.log(`📧 Document notification sent to company ${company.id}: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send notification to company ${company.id}:`, error);
    }
  }

  // Helper methods
  getDocumentName(docType) {
    const names = {
      [this.documentTypes.DRIVER_LICENSE]: 'Driver License',
      [this.documentTypes.ID]: 'ID Document',
      [this.documentTypes.VEHICLE_INSURANCE]: 'Vehicle Insurance'
    };
    return names[docType] || 'Document';
  }

  getEntityName(entity) {
    return entity.driverId ? 'Driver' : 'Vehicle';
  }

  getExpiryDate(entity, docType) {
    const expiryFields = {
      [this.documentTypes.DRIVER_LICENSE]: 'driverLicenseExpiryDate',
      [this.documentTypes.ID]: 'idExpiryDate',
      [this.documentTypes.VEHICLE_INSURANCE]: 'insuranceExpiry'
    };
    const expiryDate = entity[expiryFields[docType]];
    return expiryDate ? expiryDate.toDate() : null;
  }

  hasNotificationBeenSent(entity, docType, notificationType, value) {
    const notifications = entity.documentNotifications || {};
    const docNotifications = notifications[docType] || {};
    
    if (notificationType === 'expiring' || notificationType === 'grace_period') {
      return docNotifications[notificationType]?.includes(value) || false;
    }
    
    return docNotifications[notificationType] || false;
  }

  async updateNotificationRecord(entity, docType, notificationType, value) {
    const model = entity.driverId ? Driver : Vehicle;
    try {
      await model.update(entity.id || entity.driverId, {
        documentNotifications: {
          ...entity.documentNotifications,
          [docType]: {
            ...entity.documentNotifications?.[docType],
            [notificationType]: value
          }
        },
        updatedAt: admin.firestore.Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating notification record:', error);
    }
  }

  generateEmailTemplate(subject, message, company) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { background: #eee; padding: 10px; text-align: center; font-size: 12px; }
          .urgent { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p>Hello ${company.name},</p>
            <p class="urgent">${message}</p>
            <p>Please log into your company account to upload renewed documents and maintain your fleet's status.</p>
            <p>If documents have already been renewed, ensure they are uploaded promptly.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} TRUK LTD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  isDateWithinDays(expiryDate, targetDate, days) {
    const diffTime = Math.ceil((expiryDate - targetDate) / (1000 * 60 * 60 * 24));
    return diffTime === days;
  }

  formatResults(results) {
    const summary = {
      totalNotifications: 0,
      deactivatedResources: 0,
      byCompany: {}
    };

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.results) {
        const { companyId, results: companyResults } = result.value;
        summary.byCompany[companyId] = {
          totalNotifications: 0,
          deactivatedResources: 0,
          byType: {}
        };

        companyResults.forEach(r => {
          if (r.status === 'fulfilled') {
            if (r.value.type === 'deactivated_resources') {
              summary.deactivatedResources += r.value.count;
              summary.byCompany[companyId].deactivatedResources += r.value.count;
            } else {
              summary.totalNotifications += r.value.count;
              summary.byCompany[companyId].totalNotifications += r.value.count;
            }
            summary.byCompany[companyId].byType[r.value.type] = (summary.byCompany[companyId].byType[r.value.type] || 0) + r.value.count;
          }
        });
      }
    });

    return summary;
  }

  formatCompanyResults(results) {
    return results.map(result => {
      if (result.status === 'fulfilled') return result.value;
      return { type: 'error', message: result.reason.message };
    });
  }
}

module.exports = new CompanyDocumentExpiryCronService();
const Alert = require('../models/Alert');
const Transporter = require('../models/Transporter');
const Booking = require('../models/Booking');
const sendEmail  = require('../utils/sendEmail');
const SMSService = require('../utils/sendSms');
const healthMonitor = require('../utils/healthMonitor');

const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);


class AlertService {
  constructor() {
    this.alertTypes = {
      GPS_LOSS: 'gps_loss',
      ROUTE_DEVIATION: 'route_deviation',
      MAINTENANCE: 'maintenance',
      DOCUMENT_EXPIRY: 'document_expiry',
      BOOKING_URGENT: 'booking_urgent',
      VEHICLE_OFFLINE: 'vehicle_offline',
      PAYMENT_ISSUE: 'payment_issue'
    };
    
    this.alertSeverity = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  // Create and trigger a new alert
  async triggerAlert(alertData) {
    try {
      const alert = await Alert.create(alertData);
      
      // Send notifications based on alert severity
      await this.sendNotifications(alert);
      
      return alert;
    } catch (error) {
      console.error('Error triggering alert:', error);
      throw error;
    }
  }

  // Send notifications for alert
  async sendNotifications(alert) {
    try {
      const notificationConfig = {
        [this.alertSeverity.CRITICAL]: {
          email: true,
          sms: true,
          push: true,
          users: ['admin', 'fleet_manager', 'dispatcher']
        },
        [this.alertSeverity.HIGH]: {
          email: true,
          sms: false,
          push: true,
          users: ['fleet_manager', 'dispatcher']
        },
        [this.alertSeverity.MEDIUM]: {
          email: true,
          sms: false,
          push: false,
          users: ['dispatcher']
        },
        [this.alertSeverity.LOW]: {
          email: false,
          sms: false,
          push: false,
          users: []
        }
      };

      const config = notificationConfig[alert.severity];
      
      if (config.email) {
        await this.sendEmailAlert(alert, config.users);
      }
      
      // if (config.sms) {
      //   await this.sendSMSAlert(alert, config.users);
      // }
      
      // Here you would add push notification logic
      if (config.push) {
        await this.sendPushAlert(alert, config.users);
      }
      
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  async sendEmailAlert(alert, recipients) {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = `
      <h2>${alert.title}</h2>
      <p>${alert.description}</p>
      <p><strong>Entity:</strong> ${alert.entityType} ${alert.entityId}</p>
      <p><strong>Time:</strong> ${alert.createdAt.toDate().toLocaleString()}</p>
      <p>Please take appropriate action.</p>
    `;
    
    // This would be replaced with actual user email lookup
    const adminEmails = ['agritrukltd@gmail.com', 'support@truk.com'];
    
    for (const email of adminEmails) {
      try {
        await sendEmail({
          to: email,
          subject,
          html
        });
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }
  }

  // async sendSMSAlert(alert, recipients) {
  //   const message = `ALERT ${alert.severity}: ${alert.title}. ${alert.description.substring(0, 100)}...`;
    
  //   // This would be replaced with actual user phone number lookup
  //   const adminNumbers = ['+254700000001', '+254700000002'];
    
  //   for (const number of adminNumbers) {
  //     try {
  //       await smsService.sendSMS(
  //           'TRUK LTD', 
  //           message,
  //           number
  //       );
  //     } catch (error) {
  //       console.error(`Failed to send SMS to ${number}:`, error);
  //     }
  //   }
  // }

  async sendPushAlert(alert, recipients) {
    // Implementation for push notifications would go here
    console.log('Push notification would be sent for alert:', alert.alertId);
  }

  // Specific alert generators
  async triggerGpsLossAlert(transporterId, lastSeen) {
    const transporter = await Transporter.get(transporterId);
    if (!transporter) return null;

    const alert = await this.triggerAlert({
      type: this.alertTypes.GPS_LOSS,
      severity: this.alertSeverity.HIGH,
      title: 'GPS Signal Lost',
      description: `Vehicle ${transporter.vehicleRegistration} (${transporterId}) has lost GPS signal. Last seen: ${lastSeen}`,
      entityType: 'vehicle',
      entityId: transporterId,
      metadata: {
        lastSeen,
        vehicleRegistration: transporter.vehicleRegistration,
        driverId: transporter.userId
      }
    });

    return alert;
  }

  async triggerRouteDeviationAlert(bookingId, actualRoute, plannedRoute, deviationDistance) {
    const booking = await Booking.get(bookingId);
    if (!booking) return null;

    const severity = deviationDistance > 20 ? this.alertSeverity.HIGH : this.alertSeverity.MEDIUM;

    const alert = await this.triggerAlert({
      type: this.alertTypes.ROUTE_DEVIATION,
      severity,
      title: 'Route Deviation Detected',
      description: `Booking ${bookingId} has deviated ${deviationDistance}km from planned route`,
      entityType: 'booking',
      entityId: bookingId,
      metadata: {
        deviationDistance,
        plannedRoute,
        actualRoute,
        transporterId: booking.transporterId
      }
    });

    return alert;
  }

  async triggerDocumentExpiryAlert(transporterId, documentType, expiryDate) {
    
    const transporter = await Transporter.get(transporterId);
    if (!transporter) return null;

    const daysUntilExpiry = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    let severity = this.alertSeverity.MEDIUM;

    if (daysUntilExpiry <= 7) {
      severity = this.alertSeverity.HIGH;
    } else if (daysUntilExpiry <= 30) {
      severity = this.alertSeverity.MEDIUM;
    } else {
      severity = this.alertSeverity.LOW;
    }

    const alert = await this.triggerAlert({
      type: this.alertTypes.DOCUMENT_EXPIRY,
      severity,
      title: `${documentType} Expiring Soon`,
      description: `${documentType} for vehicle ${transporter.vehicleRegistration} expires in ${daysUntilExpiry} days`,
      entityType: 'document',
      entityId: transporterId,
      metadata: {
        documentType,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        vehicleRegistration: transporter.vehicleRegistration
      }
    });

    return alert;
  }

  async triggerMaintenanceAlert(transporterId, maintenanceType, dueDate) {
    const transporter = await Transporter.get(transporterId);
    if (!transporter) return null;

    const alert = await this.triggerAlert({
      type: this.alertTypes.MAINTENANCE,
      severity: this.alertSeverity.MEDIUM,
      title: 'Maintenance Due',
      description: `${maintenanceType} maintenance due for vehicle ${transporter.vehicleRegistration}`,
      entityType: 'vehicle',
      entityId: transporterId,
      metadata: {
        maintenanceType,
        dueDate: dueDate.toISOString(),
        vehicleRegistration: transporter.vehicleRegistration
      }
    });

    return alert;
  }

  // Check for and trigger alerts based on system conditions
  async checkSystemAlerts() {
    const startTime = Date.now();

    try {
      
      // Check for GPS offline vehicles
    //   await this.checkGpsStatus();
      
      // Check for document expiry
    //   await this.checkDocumentExpiry();
      
      // Check for maintenance due
    //   await this.checkMaintenanceDue();
      
      // Check for route deviations
    //   await this.checkRouteDeviations();

    const checks = [
      this.checkGpsStatus().catch(error => console.error('GPS check failed:', error)),
      this.checkDocumentExpiry().catch(error => console.error('Document expiry check failed:', error)),
      this.checkMaintenanceDue().catch(error => console.error('Maintenance check failed:', error)),
      this.checkRouteDeviations().catch(error => console.error('Route deviation check failed:', error))
    ];
    
    await Promise.allSettled(checks);

    healthMonitor.recordExecution(startTime);
    
    console.timeEnd('System alert check');
    console.log('✅ System alert check completed');
      
      console.log('System alert check completed');
    } catch (error) {
      console.error('Error in system alert check:', error);
    }
  }

  async checkGpsStatus() {
    // const transporters = await Transporter.getAll();
    // const now = Date.now();
    // const fifteenMinutesAgo = now - (15 * 60 * 1000);
    
    // for (const transporter of transporters) {
    //   if (transporter.lastKnownLocation && transporter.lastKnownLocation.timestamp) {
    //     const lastUpdate = transporter.lastKnownLocation.timestamp.toDate().getTime();
    //     if (lastUpdate < fifteenMinutesAgo) {
    //       // Vehicle is offline
    //       await this.triggerGpsLossAlert(
    //         transporter.transporterId, 
    //         new Date(lastUpdate).toLocaleString()
    //       );
    //     }
    //   }
    // }
    try {
        const transporters = await Transporter.getAllActive(); // Only get active transporters
        const now = Date.now();
        const fifteenMinutesAgo = now - (15 * 60 * 1000);
        
        // Process in batches to avoid memory issues
        const batchSize = 50;
        for (let i = 0; i < transporters.length; i += batchSize) {
        const batch = transporters.slice(i, i + batchSize);
        const batchPromises = batch.map(async transporter => {
            if (transporter.lastKnownLocation && transporter.lastKnownLocation.timestamp) {
            const lastUpdate = transporter.lastKnownLocation.timestamp.toDate().getTime();
            if (lastUpdate < fifteenMinutesAgo) {
                return this.triggerGpsLossAlert(
                transporter.transporterId, 
                new Date(lastUpdate).toLocaleString()
                );
            }
            }
            return null;
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < transporters.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        }
    } catch (error) {
        console.error('Error in GPS status check:', error);
        throw error;
    }

  }

  async checkDocumentExpiry() {
    
    const transporters = await Transporter.getAll();
    const now = new Date();
    
    for (const transporter of transporters) {
      // Check insurance expiry
      if (transporter.insuranceExpiryDate) {
        const expiryDate = transporter.insuranceExpiryDate.toDate();
        if (expiryDate > now && (expiryDate - now) < (30 * 24 * 60 * 60 * 1000)) {
          await this.triggerDocumentExpiryAlert(
            transporter.transporterId,
            'Insurance',
            expiryDate
          );
        }
      }
      
      // Check driver license expiry
      if (transporter.driverLicenseExpiryDate) {
        const expiryDate = transporter.driverLicenseExpiryDate.toDate();
        if (expiryDate > now && (expiryDate - now) < (30 * 24 * 60 * 60 * 1000)) {
          await this.triggerDocumentExpiryAlert(
            transporter.transporterId,
            'Driver License',
            expiryDate
          );
        }
      }
    }
  }

  async checkMaintenanceDue() {
    // This would integrate with your maintenance scheduling system
    // For now, we'll just log that this check would happen
    console.log('Maintenance due check would happen here');
  }

  async checkRouteDeviations() {
    // This would integrate with your routing system
    // For now, we'll just log that this check would happen
    console.log('Route deviation check would happen here');
  }
}

module.exports = new AlertService();
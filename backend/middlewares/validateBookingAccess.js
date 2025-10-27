const Company = require('../models/Company');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const SubscriptionService = require('../services/subscriptionService');
const Subscribers = require('../models/Subscribers');

async function validateBookingAccess(req, res, next) {
  try {
    const userId = req.user?.uid || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing user ID' });
    }

    // if not driver next
    if (req.user.role !== 'driver') {
      return next();
    }

    // 1️⃣ Get driver record
    const driver = await Driver.getDriverIdByUserId(userId);
    if (!driver) {
      return res.status(403).json({ success: false, message: 'Driver profile not found' });
    }

    // 2️⃣ Check driver approval and license
    if (driver.status !== 'approved' || driver.driverLicenseApproved !== true) {
      return res.status(403).json({
        success: false,
        message: 'Driver not approved or license not verified.',
      });
    }

    // 3️⃣ Ensure driver has an assigned vehicle
    if (!driver.assignedVehicleId) {
      return res.status(403).json({
        success: false,
        message: 'Driver not assigned a vehicle. Contact your company admin.',
      });
    }

    // 4️⃣ Get and validate vehicle insurance
    const vehicle = await Vehicle.get(driver.assignedVehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Assigned vehicle not found.',
      });
    }

    console.log('vehicle: ', vehicle);

    if (vehicle.status !== 'approved' || vehicle.insuranceApproved !== true) {
      return res.status(403).json({
        success: false,
        message: 'Vehicle insurance not approved or vehicle not verified.',
      });
    }

    // 5️⃣ Get company and verify active subscription
    const company = await Company.get(driver.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found for this driver.',
      });
    }

    const subscription = await Subscribers.getByUserId(company.transporterId);
    if (!subscription || !subscription.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Company does not have an active subscription.',
      });
    }

    // 6️⃣ (Optional) Check if subscription expired
    const daysRemaining = SubscriptionService.calculateDaysRemaining(subscription.endDate);
    if (daysRemaining <= 0) {
      return res.status(403).json({
        success: false,
        message: 'Company subscription has expired.',
      });
    }

    // ✅ All checks passed
    req.driver = driver;
    req.company = company;
    req.vehicle = vehicle;
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error('Error validating booking access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during access validation',
      error: error.message,
    });
  }
}

module.exports = validateBookingAccess;

// /mock/mockTrackingNotifications.ts
import { notificationService } from '../services/notificationService';

// Notify when driver is nearing pickup point
export function notifyApproachingPickup({ driver, customer, company, broker, admin, request }) {
  const msg = `Driver ${driver.name} is nearing the pickup point for request ${request.summary}.`;
  notificationService.sendInApp(driver.id, 'You are nearing the pickup point.', 'driver', 'tracking_near_pickup', { request });
  notificationService.sendInApp(customer.id, msg, 'customer', 'tracking_near_pickup', { driver, request });
  if (company) notificationService.sendInApp(company.id, msg, 'transporter', 'tracking_near_pickup', { driver, request });
  if (broker) notificationService.sendInApp(broker.id, msg, 'broker', 'tracking_near_pickup', { driver, request });
  if (admin) notificationService.sendInApp(admin.id, msg, 'admin', 'tracking_near_pickup', { driver, request });
}

// Notify when driver takes a wrong route
export function notifyWrongRoute({ driver, customer, company, broker, admin, request }) {
  const msg = `Driver ${driver.name} has deviated from the planned route for request ${request.summary}.`;
  notificationService.sendInApp(driver.id, 'You are off the planned route. Please return to the correct path.', 'driver', 'tracking_wrong_route', { request });
  notificationService.sendInApp(customer.id, msg, 'customer', 'tracking_wrong_route', { driver, request });
  if (company) notificationService.sendInApp(company.id, msg, 'transporter', 'tracking_wrong_route', { driver, request });
  if (broker) notificationService.sendInApp(broker.id, msg, 'broker', 'tracking_wrong_route', { driver, request });
  if (admin) notificationService.sendInApp(admin.id, msg, 'admin', 'tracking_wrong_route', { driver, request });
}

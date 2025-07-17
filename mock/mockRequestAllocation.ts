// /mock/mockRequestAllocation.ts
import { notificationService } from '../services/notificationService';

// Example request allocation logic
export function allocateRequestToDriver({
  driver,
  request,
  customer,
  company,
  broker,
  admin
}: {
  driver: any,
  request: any,
  customer: any,
  company?: any,
  broker?: any,
  admin?: any
}) {
  // Notify driver (all channels)
  const details = `Request: ${request.summary}\nCustomer: ${customer.name} (${customer.phone}, ${customer.email})\nPickup: ${request.pickup}\nDropoff: ${request.dropoff}\nSpecial: ${request.special || 'None'}`;
  notificationService.sendEmail(
    driver.email,
    'New Transport Request Assigned',
    `Hi ${driver.name}, you have been assigned a new request.\n${details}`,
    'driver',
    'request_allocated',
    { driver, request, customer }
  );
  notificationService.sendSMS(
    driver.phone,
    `New request assigned. Customer: ${customer.name}, Contact: ${customer.phone}. Pickup: ${request.pickup}. Special: ${request.special || 'None'}`,
    'driver',
    'request_allocated',
    { driver, request, customer }
  );
  notificationService.sendInApp(
    driver.id,
    `You have been assigned a new request. Contact customer: ${customer.name}, ${customer.phone}`,
    'driver',
    'request_allocated',
    { driver, request, customer }
  );

  // Notify customer
  notificationService.sendInApp(
    customer.id,
    `Your request has been assigned to driver ${driver.name}. They will contact you soon.`,
    'customer',
    'request_status',
    { driver, request, customer }
  );

  // Notify company (if any)
  if (company) {
    notificationService.sendInApp(
      company.id,
      `Request allocated to driver ${driver.name}.`,
      'transporter',
      'request_allocated',
      { driver, request, customer }
    );
  }
  // Notify broker (if any)
  if (broker) {
    notificationService.sendInApp(
      broker.id,
      `Request allocated to driver ${driver.name}.`,
      'broker',
      'request_allocated',
      { driver, request, customer }
    );
  }
  // Notify admin
  if (admin) {
    notificationService.sendInApp(
      admin.id,
      `Request allocated to driver ${driver.name}.`,
      'admin',
      'request_allocated',
      { driver, request, customer }
    );
  }
}

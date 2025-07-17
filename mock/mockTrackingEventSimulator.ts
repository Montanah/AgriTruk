// /mock/mockTrackingEventSimulator.ts
import { notifyApproachingPickup, notifyWrongRoute } from './mockTrackingNotifications';

// Example mock data (replace with real objects in your app)
const driver = { id: 'D001', name: 'Alice Mumo' };
const customer = { id: 'C001', name: 'Green Agri Co.' };
const company = { id: 'COMP001', name: 'TransCo Ltd.' };
const broker = { id: 'B001', name: 'BrokerX' };
const admin = { id: 'ADMIN', name: 'Admin' };
const request = {
  summary: 'Maize, 10 tons, to Mombasa',
  pickup: 'Westlands, Nairobi',
  dropoff: 'Mombasa',
  special: 'Handle with care',
};

// Simulate driver nearing pickup
export function simulateApproachingPickup() {
  notifyApproachingPickup({ driver, customer, company, broker, admin, request });
}

// Simulate driver taking wrong route
export function simulateWrongRoute() {
  notifyWrongRoute({ driver, customer, company, broker, admin, request });
}

// Example usage:
// simulateApproachingPickup();
// simulateWrongRoute();

// /mock/mockRequestManager.ts
import { allocateRequestToDriver } from './mockRequestAllocation';

// Example mock data (replace with real objects in your app)
const driver = { id: 'D001', name: 'Alice Mumo', email: 'alice.mumo@example.com', phone: '+254700111111' };
const customer = { id: 'C001', name: 'Green Agri Co.', email: 'info@greenagri.com', phone: '+254712345678' };
const company = { id: 'COMP001', name: 'TransCo Ltd.', id: 'COMP001' };
const broker = { id: 'B001', name: 'BrokerX' };
const admin = { id: 'ADMIN', name: 'Admin' };
const request = {
  summary: 'Maize, 10 tons, to Mombasa',
  pickup: 'Westlands, Nairobi',
  dropoff: 'Mombasa',
  special: 'Handle with care',
};

// Simulate request allocation
export function simulateRequestAllocation() {
  allocateRequestToDriver({ driver, request, customer, company, broker, admin });
}

// Example usage:
// simulateRequestAllocation();

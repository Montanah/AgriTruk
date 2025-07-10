// Mock data for company/broker revenue screen
export default {
  totalRevenue: 1200000,
  outstandingPayments: 200000,
  inventory: [
    { id: 1, name: 'Truck A', trips: 34, revenue: 450000 },
    { id: 2, name: 'Truck B', trips: 28, revenue: 320000 },
    { id: 3, name: 'Refrigerated Van', trips: 12, revenue: 180000 },
    { id: 4, name: 'Flatbed Trailer', trips: 19, revenue: 250000 },
  ],
  topDrivers: [
    { name: 'John Doe', revenue: 400000 },
    { name: 'Jane Smith', revenue: 350000 },
  ],
  frequentJobs: [
    'Depot X → Market Z',
    'Farm Y → Shop Q',
    'Depot X → Shop Q',
  ],
};

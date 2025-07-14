export const MOCK_REQUESTS = [
  {
    id: 'REQ-101',
    from: 'Farm X',
    to: 'Market Y',
    type: 'AgriTRUK',
    date: '2024-06-12 10:00',
    cargo: 'Fruits, Perishable',
    weight: '500kg',
    price: 1500,
    status: 'Incoming',
    customer: { name: 'Jane Doe', phone: '+254712345678' },
  },
  {
    id: 'REQ-102',
    from: 'Depot A',
    to: 'Shop B',
    type: 'CargoTRUK',
    date: '2024-06-12 12:30',
    cargo: 'Electronics',
    weight: '200kg',
    price: 900,
    status: 'Incoming',
    customer: { name: 'John Smith', phone: '+254798765432' },
  },
];

export const MOCK_ACTIVE = [
  {
    id: 'REQ-099',
    from: 'Farm Z',
    to: 'Market Q',
    type: 'AgriTRUK',
    date: '2024-06-11 09:00',
    cargo: 'Vegetables',
    weight: '300kg',
    price: 1100,
    status: 'On Transit',
    customer: { name: 'Alice', phone: '+254700000000' },
    progress: 0.7,
  },
];

export const MOCK_COMPLETED = [
  {
    id: 'REQ-090',
    from: 'Warehouse W',
    to: 'Client E',
    type: 'CargoTRUK',
    date: '2024-06-09 15:00',
    cargo: 'Machinery',
    weight: '1.2T',
    price: 2500,
    status: 'Completed',
    customer: { name: 'Bob', phone: '+254733333333' },
    rating: 5,
  },
];

export const MOCK_INSIGHTS = {
  totalRevenue: 1540000,
  recentRevenue: 24000,
  currentTripRevenue: 15000,
  successfulTrips: 72,
  accumulatedTrips: 85,
  completionRate: 95,
  currency: 'KES'
};


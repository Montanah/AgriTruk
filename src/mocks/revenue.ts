export const MOCK_COMPANY_REVENUE = {
  total: 1200000,
  outstanding: 200000,
  topDrivers: [
    { name: 'John Doe', amount: 400000 },
    { name: 'Jane Smith', amount: 350000 },
  ],
  frequentJobs: [
    'Depot X → Market Z',
    'Farm Y → Shop Q',
  ],
};

export const MOCK_INDIVIDUAL_REVENUE = {
  total: 120000,
  lastPayment: { amount: 10000, date: '2024-06-10' },
  recentJobs: [
    { route: 'Farm Z → Market Q', amount: 8000 },
    { route: 'Depot A → Shop B', amount: 12000 },
  ],
};

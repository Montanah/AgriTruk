// API Configuration
// Updated to the correct backend URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com';

// API Endpoints - Updated to match Swagger documentation
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  USERS: `${API_BASE_URL}/api/users`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  TRANSPORTERS: `${API_BASE_URL}/api/transporters`,
  BROKERS: `${API_BASE_URL}/api/brokers`,
  COMPANIES: `${API_BASE_URL}/api/companies`,
  VEHICLES: `${API_BASE_URL}/api/vehicles`,
  DRIVERS: `${API_BASE_URL}/api/drivers`,
  DISPUTES: `${API_BASE_URL}/api/disputes`,
  RATINGS: `${API_BASE_URL}/api/ratings`,
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  ALERTS: `${API_BASE_URL}/api/alerts`,
  REPORTS: `${API_BASE_URL}/api/reports`,
  CHATS: `${API_BASE_URL}/api/chats`,
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  SUBSCRIPTIONS: `${API_BASE_URL}/api/subscriptions`,
  PAYMENTS: `${API_BASE_URL}/api/payments`,
  HEALTH: `${API_BASE_URL}/api/health`,
  ADMIN: `${API_BASE_URL}/api/admin`,
} as const;

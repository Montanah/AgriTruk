// API Configuration
// Updated to the real backend URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://agritruk-backend.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  TRANSPORTERS: `${API_BASE_URL}/api/transporters`,
  BROKERS: `${API_BASE_URL}/api/brokers`,
  COMPANIES: `${API_BASE_URL}/api/companies`,
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  SUBSCRIPTIONS: `${API_BASE_URL}/api/subscriptions`,
  PAYMENTS: `${API_BASE_URL}/api/payments`,
  RATINGS: `${API_BASE_URL}/api/ratings`,
  CHATS: `${API_BASE_URL}/api/chats`,
  DISPUTES: `${API_BASE_URL}/api/disputes`,
  REPORTS: `${API_BASE_URL}/api/reports`,
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;

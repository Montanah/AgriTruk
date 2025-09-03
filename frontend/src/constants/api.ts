// API Configuration
// To be updated to the real backend URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://agritruk-backend.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  TRANSPORTERS: `${API_BASE_URL}/api/transporters`,
  BROKERS: `${API_BASE_URL}/api/brokers`,
  NOTIFICATIONS: `${API_BASE_URL}/api/notification`,
  SUBSCRIPTIONS: `${API_BASE_URL}/api/subscriptions`,
  PAYMENTS: `${API_BASE_URL}/api/payments`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;

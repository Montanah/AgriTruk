// Image and URL Constants
export const PLACEHOLDER_IMAGES = {
  // Profile placeholders
  PROFILE_PHOTO: 'https://via.placeholder.com/150x150?text=TRUK',
  PROFILE_PHOTO_SMALL: 'https://via.placeholder.com/40x40?text=TRUK',
  PROFILE_PHOTO_MEDIUM: 'https://via.placeholder.com/54x54?text=TRUK',
  
  // Vehicle placeholders
  VEHICLE_PHOTO: 'https://via.placeholder.com/300x200?text=TRUCK',
  VEHICLE_PHOTO_SMALL: 'https://via.placeholder.com/80x60?text=VEHICLE',
  VEHICLE_PHOTO_MEDIUM: 'https://via.placeholder.com/54x54?text=TRUK',
  
  // Default user photos
  DEFAULT_USER_MALE: 'https://randomuser.me/api/portraits/men/32.jpg',
  DEFAULT_USER_FEMALE: 'https://randomuser.me/api/portraits/women/32.jpg',
} as const;

export const EXTERNAL_URLS = {
  // Google services
  GOOGLE: 'https://www.google.com',
  FIREBASE_FIRESTORE: 'https://firestore.googleapis.com',
} as const;

export const API_TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  UPLOAD: 30000,  // 30 seconds
  HEALTH_CHECK: 5000, // 5 seconds
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;


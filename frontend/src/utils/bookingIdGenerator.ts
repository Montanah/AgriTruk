/**
 * User-friendly booking ID generator
 * Generates readable IDs like C001, A002, etc.
 */

export interface BookingIdConfig {
  prefix: string;
  startNumber: number;
  padding: number;
}

// Default configurations for different booking types
export const BOOKING_ID_CONFIGS = {
  cargo: {
    prefix: 'C',
    startNumber: 1,
    padding: 3
  },
  agri: {
    prefix: 'A',
    startNumber: 1,
    padding: 3
  },
  instant: {
    prefix: 'I',
    startNumber: 1,
    padding: 3
  },
  booking: {
    prefix: 'B',
    startNumber: 1,
    padding: 3
  }
} as const;

/**
 * Generate a user-friendly booking ID
 * @param type - Booking type (cargo, agri, instant, booking)
 * @param sequenceNumber - Sequential number for this type
 * @returns Formatted booking ID (e.g., C001, A002)
 */
export function generateUserFriendlyBookingId(
  type: keyof typeof BOOKING_ID_CONFIGS,
  sequenceNumber: number
): string {
  const config = BOOKING_ID_CONFIGS[type];
  const paddedNumber = sequenceNumber.toString().padStart(config.padding, '0');
  return `${config.prefix}${paddedNumber}`;
}

/**
 * Parse a user-friendly booking ID to extract type and number
 * @param bookingId - User-friendly booking ID (e.g., C001)
 * @returns Object with type and number, or null if invalid
 */
export function parseUserFriendlyBookingId(bookingId: string): {
  type: keyof typeof BOOKING_ID_CONFIGS;
  number: number;
} | null {
  if (!bookingId || bookingId.length < 2) {
    return null;
  }

  const prefix = bookingId[0].toUpperCase();
  const numberStr = bookingId.slice(1);

  // Find the type by prefix
  const type = Object.keys(BOOKING_ID_CONFIGS).find(
    key => BOOKING_ID_CONFIGS[key as keyof typeof BOOKING_ID_CONFIGS].prefix === prefix
  ) as keyof typeof BOOKING_ID_CONFIGS;

  if (!type) {
    return null;
  }

  const number = parseInt(numberStr, 10);
  if (isNaN(number)) {
    return null;
  }

  return { type, number };
}

/**
 * Get the next sequence number for a booking type
 * This would typically be fetched from the backend or database
 * @param type - Booking type
 * @param existingBookings - Array of existing booking IDs
 * @returns Next sequence number
 */
export function getNextSequenceNumber(
  type: keyof typeof BOOKING_ID_CONFIGS,
  existingBookings: string[] = []
): number {
  const config = BOOKING_ID_CONFIGS[type];
  const prefix = config.prefix;
  
  // Filter bookings of this type and extract numbers
  const typeBookings = existingBookings
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const parsed = parseUserFriendlyBookingId(id);
      return parsed ? parsed.number : 0;
    })
    .filter(num => num > 0);

  // Return the next number
  return typeBookings.length > 0 ? Math.max(...typeBookings) + 1 : config.startNumber;
}

/**
 * Format booking ID for display
 * @param bookingId - Original or user-friendly booking ID
 * @param type - Booking type (optional, for fallback)
 * @returns Formatted booking ID for display
 */
export function formatBookingIdForDisplay(
  bookingId: string,
  type?: keyof typeof BOOKING_ID_CONFIGS
): string {
  if (!bookingId) return 'N/A';

  // If it's already a user-friendly ID, return as is
  if (parseUserFriendlyBookingId(bookingId)) {
    return bookingId;
  }

  // If it's a long UUID-style ID, try to generate a user-friendly one
  if (bookingId.length > 10) {
    // This would typically be handled by the backend
    // For now, return a truncated version
    return `ID-${bookingId.slice(-6).toUpperCase()}`;
  }

  return bookingId;
}

/**
 * Get booking type from booking data
 * @param booking - Booking object
 * @returns Booking type
 */
export function getBookingType(booking: any): keyof typeof BOOKING_ID_CONFIGS {
  if (booking.bookingMode === 'instant') {
    return 'instant';
  }
  
  if (booking.bookingType === 'Cargo') {
    return 'cargo';
  }
  
  if (booking.bookingType === 'Agri') {
    return 'agri';
  }
  
  // Default to booking
  return 'booking';
}

/**
 * Generate display ID for a booking
 * @param booking - Booking object
 * @param userFriendlyId - Optional user-friendly ID (if already generated)
 * @returns Display-ready booking ID
 */
export function getDisplayBookingId(booking: any, userFriendlyId?: string): string {
  if (userFriendlyId) {
    return userFriendlyId;
  }

  const type = getBookingType(booking);
  const originalId = booking.bookingId || booking.id;
  
  return formatBookingIdForDisplay(originalId, type);
}

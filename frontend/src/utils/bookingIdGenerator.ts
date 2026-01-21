/**
 * Enhanced user-friendly booking ID generator
 * Generates readable IDs like A240925I001, C240925B002, etc.
 * Format: [TYPE][DATE][SUBTYPE][SEQUENCE]
 * - TYPE: A (Agri) or C (Cargo)
 * - DATE: YYMMDD (Year, Month, Day)
 * - SUBTYPE: I (Instant) or B (Booking)
 * - SEQUENCE: 3-digit sequential number
 */

export interface BookingIdConfig {
  typePrefix: string;
  subtypePrefix: string;
  startNumber: number;
  padding: number;
}

// Enhanced configurations for different booking types
export const BOOKING_ID_CONFIGS = {
  agri_instant: {
    typePrefix: 'A',
    subtypePrefix: 'I',
    startNumber: 1,
    padding: 3
  },
  agri_booking: {
    typePrefix: 'A',
    subtypePrefix: 'B',
    startNumber: 1,
    padding: 3
  },
  cargo_instant: {
    typePrefix: 'C',
    subtypePrefix: 'I',
    startNumber: 1,
    padding: 3
  },
  cargo_booking: {
    typePrefix: 'C',
    subtypePrefix: 'B',
    startNumber: 1,
    padding: 3
  }
} as const;

/**
 * Generate a user-friendly booking ID
 * @param bookingType - Main type (agri, cargo)
 * @param bookingMode - Subtype (instant, booking)
 * @param sequenceNumber - Sequential number for this type/subtype combination
 * @param date - Optional date (defaults to current date)
 * @returns Formatted booking ID (e.g., A240925I001, C240925B002)
 */
export function generateUserFriendlyBookingId(
  bookingType: 'agri' | 'cargo',
  bookingMode: 'instant' | 'booking',
  sequenceNumber: number,
  date?: Date
): string {
  const configKey = `${bookingType}_${bookingMode}` as keyof typeof BOOKING_ID_CONFIGS;
  const config = BOOKING_ID_CONFIGS[configKey];
  
  // Use provided date or current date
  const targetDate = date || new Date();
  
  // Format date as YYMMDD
  const year = targetDate.getFullYear().toString().slice(-2);
  const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const day = targetDate.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Format sequence number
  const paddedNumber = sequenceNumber.toString().padStart(config.padding, '0');
  
  return `${config.typePrefix}${dateStr}${config.subtypePrefix}${paddedNumber}`;
}

/**
 * Parse a user-friendly booking ID to extract components
 * @param bookingId - User-friendly booking ID (e.g., A240925I001)
 * @returns Object with parsed components, or null if invalid
 */
export function parseUserFriendlyBookingId(bookingId: string): {
  bookingType: 'agri' | 'cargo';
  bookingMode: 'instant' | 'booking';
  date: Date;
  sequenceNumber: number;
} | null {
  if (!bookingId || bookingId.length < 10) {
    return null;
  }

  // Expected format: A240925I001 (10 characters minimum)
  const typePrefix = bookingId[0].toUpperCase();
  const dateStr = bookingId.slice(1, 7); // YYMMDD
  const subtypePrefix = bookingId[7].toUpperCase();
  const sequenceStr = bookingId.slice(8);

  // Validate type prefix
  if (!['A', 'C'].includes(typePrefix)) {
    return null;
  }

  // Validate subtype prefix
  if (!['I', 'B'].includes(subtypePrefix)) {
    return null;
  }

  // Parse date
  const year = parseInt('20' + dateStr.slice(0, 2), 10);
  const month = parseInt(dateStr.slice(2, 4), 10) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.slice(4, 6), 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  const date = new Date(year, month, day);
  
  // Parse sequence number
  const sequenceNumber = parseInt(sequenceStr, 10);
  if (isNaN(sequenceNumber)) {
    return null;
  }

  return {
    bookingType: typePrefix === 'A' ? 'agri' : 'cargo',
    bookingMode: subtypePrefix === 'I' ? 'instant' : 'booking',
    date,
    sequenceNumber
  };
}

/**
 * Get the next sequence number for a booking type/subtype combination
 * This would typically be fetched from the backend or database
 * @param bookingType - Main type (agri, cargo)
 * @param bookingMode - Subtype (instant, booking)
 * @param existingBookings - Array of existing booking IDs
 * @param date - Optional date to filter by (defaults to today)
 * @returns Next sequence number
 */
export function getNextSequenceNumber(
  bookingType: 'agri' | 'cargo',
  bookingMode: 'instant' | 'booking',
  existingBookings: string[] = [],
  date?: Date
): number {
  const targetDate = date || new Date();
  const dateStr = formatDateForId(targetDate);
  const configKey = `${bookingType}_${bookingMode}` as keyof typeof BOOKING_ID_CONFIGS;
  const config = BOOKING_ID_CONFIGS[configKey];
  
  // Filter bookings of this type/subtype/date combination
  const typeBookings = existingBookings
    .filter(id => {
      const parsed = parseUserFriendlyBookingId(id);
      return parsed && 
             parsed.bookingType === bookingType && 
             parsed.bookingMode === bookingMode &&
             formatDateForId(parsed.date) === dateStr;
    })
    .map(id => {
      const parsed = parseUserFriendlyBookingId(id);
      return parsed ? parsed.sequenceNumber : 0;
    })
    .filter(num => num > 0);

  // Return the next number
  return typeBookings.length > 0 ? Math.max(...typeBookings) + 1 : config.startNumber;
}

/**
 * Format date for booking ID (YYMMDD)
 */
function formatDateForId(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format booking ID for display
 * @param bookingId - Original or user-friendly booking ID
 * @param bookingType - Booking type (optional, for fallback)
 * @param bookingMode - Booking mode (optional, for fallback)
 * @returns Formatted booking ID for display
 */
export function formatBookingIdForDisplay(
  bookingId: string,
  bookingType?: 'agri' | 'cargo',
  bookingMode?: 'instant' | 'booking'
): string {
  if (!bookingId) return 'N/A';

  // If it's already a user-friendly ID, return as is
  if (parseUserFriendlyBookingId(bookingId)) {
    return bookingId;
  }

  // If it's a long UUID-style ID, try to generate a user-friendly one
  if (bookingId.length > 10 && bookingType && bookingMode) {
    // Generate a user-friendly ID based on the original ID
    const sequenceNumber = Math.abs(bookingId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 1000 + 1;
    return generateUserFriendlyBookingId(bookingType, bookingMode, sequenceNumber);
  }

  // If it's a long UUID-style ID without type info, return a truncated version
  if (bookingId.length > 10) {
    return `ID-${bookingId.slice(-6).toUpperCase()}`;
  }

  return bookingId;
}

/**
 * Get booking type and mode from booking data
 * @param booking - Booking object
 * @returns Object with bookingType and bookingMode
 */
export function getBookingTypeAndMode(booking: any): {
  bookingType: 'agri' | 'cargo';
  bookingMode: 'instant' | 'booking';
} {
  // Determine main type
  let bookingType: 'agri' | 'cargo' = 'cargo'; // Default to cargo
  if (booking.bookingType === 'Agri' || booking.productType === 'Agricultural' || booking.category === 'agricultural') {
    bookingType = 'agri';
  }
  
  // Determine mode
  let bookingMode: 'instant' | 'booking' = 'booking'; // Default to booking
  if (booking.bookingMode === 'instant' || booking.type === 'instant' || booking.isInstant === true) {
    bookingMode = 'instant';
  }
  
  return { bookingType, bookingMode };
}

/**
 * Generate display ID for a booking
 * @param booking - Booking object
 * @param userFriendlyId - Optional user-friendly ID (if already generated)
 * @returns Display-ready booking ID
 */
export function getDisplayBookingId(booking: any, userFriendlyId?: string): string {
  // Prioritize readableId from backend response
  if (booking?.readableId) {
    return booking.readableId;
  }
  
  if (userFriendlyId) {
    return userFriendlyId;
  }

  const { bookingType, bookingMode } = getBookingTypeAndMode(booking);
  const originalId = booking.bookingId || booking.id;
  
  return formatBookingIdForDisplay(originalId, bookingType, bookingMode);
}

/**
 * Generate a new user-friendly booking ID for a booking
 * @param booking - Booking object
 * @param sequenceNumber - Optional sequence number (will be generated if not provided)
 * @returns New user-friendly booking ID
 */
export function generateBookingId(booking: any, sequenceNumber?: number): string {
  const { bookingType, bookingMode } = getBookingTypeAndMode(booking);
  
  if (sequenceNumber === undefined) {
    // Generate sequence number based on booking creation date or current date
    const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date();
    sequenceNumber = Math.abs((booking.bookingId || booking.id || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 1000 + 1;
  }
  
  return generateUserFriendlyBookingId(bookingType, bookingMode, sequenceNumber, booking.createdAt ? new Date(booking.createdAt) : undefined);
}

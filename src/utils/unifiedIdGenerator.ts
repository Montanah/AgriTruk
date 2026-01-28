/**
 * Unified user-friendly ID generator for all booking types
 * Uses the simpler format: [TYPE][DATE][SUBTYPE][SEQUENCE]
 * - TYPE: A (Agri) or C (Cargo)
 * - DATE: YYMMDD (Year, Month, Day)
 * - SUBTYPE: I (Instant) or B (Booking)
 * - SEQUENCE: 3-digit sequential number
 * 
 * Examples:
 * - A240925I001 (Agri Instant #001)
 * - C240925B002 (Cargo Booking #002)
 * - A240925B003 (Agri Booking #003)
 * - C240925I004 (Cargo Instant #004)
 */

export interface BookingIdComponents {
  type: 'agri' | 'cargo';
  mode: 'instant' | 'booking';
  date: Date;
  sequenceNumber: number;
}

export interface UnifiedIdConfig {
  typePrefix: string;
  modePrefix: string;
  startNumber: number;
  padding: number;
}

// Configuration for different booking types
export const UNIFIED_ID_CONFIGS: Record<string, UnifiedIdConfig> = {
  agri_instant: {
    typePrefix: 'A',
    modePrefix: 'I',
    startNumber: 1,
    padding: 3
  },
  agri_booking: {
    typePrefix: 'A',
    modePrefix: 'B',
    startNumber: 1,
    padding: 3
  },
  cargo_instant: {
    typePrefix: 'C',
    modePrefix: 'I',
    startNumber: 1,
    padding: 3
  },
  cargo_booking: {
    typePrefix: 'C',
    modePrefix: 'B',
    startNumber: 1,
    padding: 3
  }
};

/**
 * Generate a unified user-friendly booking ID
 * @param type - Main type (agri, cargo)
 * @param mode - Subtype (instant, booking)
 * @param sequenceNumber - Sequential number for this type/mode combination
 * @param date - Optional date (defaults to current date)
 * @returns Formatted booking ID (e.g., A240925I001, C240925B002)
 */
export function generateUnifiedBookingId(
  type: 'agri' | 'cargo',
  mode: 'instant' | 'booking',
  sequenceNumber: number,
  date?: Date
): string {
  const configKey = `${type}_${mode}` as keyof typeof UNIFIED_ID_CONFIGS;
  const config = UNIFIED_ID_CONFIGS[configKey];
  
  // Use provided date or current date
  const targetDate = date || new Date();
  
  // Format date as YYMMDD
  const year = targetDate.getFullYear().toString().slice(-2);
  const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const day = targetDate.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Format sequence number
  const paddedNumber = sequenceNumber.toString().padStart(config.padding, '0');
  
  return `${config.typePrefix}${dateStr}${config.modePrefix}${paddedNumber}`;
}

/**
 * Parse a unified booking ID to extract components
 * @param bookingId - User-friendly booking ID (e.g., A240925I001)
 * @returns Object with parsed components, or null if invalid
 */
export function parseUnifiedBookingId(bookingId: string): BookingIdComponents | null {
  // Validate format: [TYPE][DATE][SUBTYPE][SEQUENCE]
  const pattern = /^([AC])(\d{6})([IB])(\d{3})$/;
  const match = bookingId.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const [, typePrefix, dateStr, modePrefix, sequenceStr] = match;
  
  // Parse type
  const type = typePrefix === 'A' ? 'agri' : 'cargo';
  
  // Parse mode
  const mode = modePrefix === 'I' ? 'instant' : 'booking';
  
  // Parse date
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(4, 6));
  const date = new Date(year, month, day);
  
  // Parse sequence number
  const sequenceNumber = parseInt(sequenceStr);
  
  return {
    type,
    mode,
    date,
    sequenceNumber
  };
}

/**
 * Get the next sequence number for a booking type/mode combination
 * @param type - Main type (agri, cargo)
 * @param mode - Subtype (instant, booking)
 * @param existingBookings - Array of existing booking IDs
 * @param date - Optional date to filter by (defaults to today)
 * @returns Next sequence number
 */
export function getNextSequenceNumber(
  type: 'agri' | 'cargo',
  mode: 'instant' | 'booking',
  existingBookings: string[] = [],
  date?: Date
): number {
  const targetDate = date || new Date();
  const dateStr = formatDateForId(targetDate);
  const configKey = `${type}_${mode}` as keyof typeof UNIFIED_ID_CONFIGS;
  const config = UNIFIED_ID_CONFIGS[configKey];
  
  // Filter bookings of this type/mode/date combination
  const typeBookings = existingBookings
    .map(id => parseUnifiedBookingId(id))
    .filter(parsed => 
      parsed && 
      parsed.type === type && 
      parsed.mode === mode &&
      formatDateForId(parsed.date) === dateStr
    )
    .map(parsed => parsed!.sequenceNumber)
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
 * Generate a display-friendly booking ID for UI
 * @param booking - Booking object
 * @param userFriendlyId - Optional pre-generated user-friendly ID
 * @returns Display-friendly booking ID
 */
export function getDisplayBookingId(booking: any, userFriendlyId?: string): string {
  if (userFriendlyId) {
    return userFriendlyId;
  }

  // Try to generate from booking data
  if (booking?.id) {
    const type = booking.bookingType === 'Agri' ? 'agri' : 'cargo';
    const mode = booking.bookingMode === 'instant' ? 'instant' : 'booking';
    const sequenceNumber = Math.abs(booking.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 1000 + 1;
    
    return generateUnifiedBookingId(type, mode, sequenceNumber, booking.createdAt ? new Date(booking.createdAt) : undefined);
  }

  // Fallback to showing last 8 characters of original ID
  return booking?.id?.slice(-8) || 'N/A';
}

/**
 * Generate a new unified booking ID for a booking
 * @param booking - Booking object
 * @param sequenceNumber - Optional sequence number (will be generated if not provided)
 * @returns New unified booking ID
 */
export function generateBookingId(booking: any, sequenceNumber?: number): string {
  const type = booking.bookingType === 'Agri' ? 'agri' : 'cargo';
  const mode = booking.bookingMode === 'instant' ? 'instant' : 'booking';
  
  if (sequenceNumber === undefined) {
    // Generate sequence number based on booking creation date or current date
    const bookingDate = booking.createdAt ? new Date(booking.createdAt) : new Date();
    sequenceNumber = Math.abs((booking.bookingId || booking.id || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 1000 + 1;
  }
  
  return generateUnifiedBookingId(type, mode, sequenceNumber, booking.createdAt ? new Date(booking.createdAt) : undefined);
}

/**
 * Validate if a booking ID follows the unified format
 * @param bookingId - Booking ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidUnifiedBookingId(bookingId: string): boolean {
  return parseUnifiedBookingId(bookingId) !== null;
}

/**
 * Get a short display version of the booking ID (last 8 characters)
 * @param bookingId - Full booking ID
 * @returns Short display version
 */
export function getShortDisplayId(bookingId: string): string {
  if (isValidUnifiedBookingId(bookingId)) {
    return bookingId; // Already short and user-friendly
  }
  return bookingId?.slice(-8) || 'N/A';
}

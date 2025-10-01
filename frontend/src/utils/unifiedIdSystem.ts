/**
 * Unified ID System for TRUK App
 * Based on backend format: YYMMDD-HHMM-TYPE-MODE
 * 
 * Format: YYMMDD-HHMM-TYPE-MODE
 * - YYMMDD: Date (Year, Month, Day)
 * - HHMM: Time (Hour, Minute)
 * - TYPE: AGR (Agri) or CRG (Cargo)
 * - MODE: INST (Instant), BOOK (Booking), CONS (Consolidated)
 * 
 * Examples:
 * - 250930-1430-AGR-INST (Agri Instant)
 * - 250930-1430-CRG-BOOK (Cargo Booking)
 * - 250930-1430-CONS-AGR (Consolidated Agri)
 * - 250930-1430-CONS-CRG (Consolidated Cargo)
 */

export interface BookingIdComponents {
  date: Date;
  time: string;
  type: 'agri' | 'cargo';
  mode: 'instant' | 'booking' | 'consolidated';
  isConsolidated: boolean;
}

/**
 * Generate a unified booking ID
 * @param bookingType - Main type (agri, cargo)
 * @param bookingMode - Subtype (instant, booking)
 * @param isConsolidated - Whether this is a consolidated request
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Formatted booking ID
 */
export function generateUnifiedBookingId(
  bookingType: 'agri' | 'cargo',
  bookingMode: 'instant' | 'booking',
  isConsolidated: boolean = false,
  timestamp?: Date
): string {
  const now = timestamp || new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  const type = bookingType === 'agri' ? 'AGR' : 'CRG';
  const mode = isConsolidated ? 'CONS' : (bookingMode === 'instant' ? 'INST' : 'BOOK');
  
  return `${year}${month}${day}-${hour}${minute}-${type}-${mode}`;
}

/**
 * Parse a unified booking ID to extract components
 * @param bookingId - User-friendly booking ID
 * @returns Object with parsed components, or null if invalid
 */
export function parseUnifiedBookingId(bookingId: string): BookingIdComponents | null {
  // Validate format: YYMMDD-HHMM-TYPE-MODE
  const pattern = /^(\d{6})-(\d{4})-(AGR|CRG)-(INST|BOOK|CONS)$/;
  const match = bookingId.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const [, dateStr, timeStr, typeStr, modeStr] = match;
  
  // Parse date
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(4, 6));
  const date = new Date(year, month, day);
  
  // Parse type
  const type = typeStr === 'AGR' ? 'agri' : 'cargo';
  
  // Parse mode
  const isConsolidated = modeStr === 'CONS';
  const mode = isConsolidated ? 'consolidated' : (modeStr === 'INST' ? 'instant' : 'booking');
  
  return {
    date,
    time: timeStr,
    type,
    mode,
    isConsolidated
  };
}

/**
 * Get display-friendly booking ID for UI
 * @param booking - Booking object
 * @param userFriendlyId - Optional pre-generated user-friendly ID
 * @returns Display-friendly booking ID
 */
export function getDisplayBookingId(booking: any, userFriendlyId?: string): string {
  if (userFriendlyId) {
    return userFriendlyId;
  }

  // Try to generate from booking data
  if (booking?.id || booking?.bookingId) {
    const bookingId = booking.bookingId || booking.id;
    
    // Check if it's already in the unified format
    if (parseUnifiedBookingId(bookingId)) {
      return bookingId;
    }
    
    // Try to determine type and mode from booking data
    const bookingType = booking.bookingType === 'Agri' || booking.type === 'agri' ? 'agri' : 'cargo';
    const bookingMode = booking.bookingMode === 'instant' || booking.mode === 'instant' ? 'instant' : 'booking';
    const isConsolidated = booking.isConsolidated || booking.consolidated || false;
    
    // Generate new unified ID
    const timestamp = booking.createdAt ? new Date(booking.createdAt) : new Date();
    return generateUnifiedBookingId(bookingType, bookingMode, isConsolidated, timestamp);
  }

  // Fallback to showing last 8 characters of original ID
  return booking?.id?.slice(-8) || booking?.bookingId?.slice(-8) || 'N/A';
}

/**
 * Generate a new unified booking ID for a booking
 * @param booking - Booking object
 * @param isConsolidated - Whether this is a consolidated request
 * @returns New unified booking ID
 */
export function generateBookingId(booking: any, isConsolidated: boolean = false): string {
  const bookingType = booking.bookingType === 'Agri' || booking.type === 'agri' ? 'agri' : 'cargo';
  const bookingMode = booking.bookingMode === 'instant' || booking.mode === 'instant' ? 'instant' : 'booking';
  
  const timestamp = booking.createdAt ? new Date(booking.createdAt) : new Date();
  return generateUnifiedBookingId(bookingType, bookingMode, isConsolidated, timestamp);
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
 * Get a short display version of the booking ID
 * @param bookingId - Full booking ID
 * @returns Short display version
 */
export function getShortDisplayId(bookingId: string): string {
  if (isValidUnifiedBookingId(bookingId)) {
    return bookingId; // Already short and user-friendly
  }
  return bookingId?.slice(-8) || 'N/A';
}

/**
 * Get booking type and mode from a unified ID
 * @param bookingId - Unified booking ID
 * @returns Object with type and mode, or null if invalid
 */
export function getBookingTypeAndMode(bookingId: string): { type: 'agri' | 'cargo'; mode: 'instant' | 'booking' | 'consolidated' } | null {
  const parsed = parseUnifiedBookingId(bookingId);
  if (!parsed) return null;
  
  return {
    type: parsed.type,
    mode: parsed.mode
  };
}

/**
 * Format booking ID for display in different contexts
 * @param bookingId - Booking ID
 * @param context - Display context
 * @returns Formatted ID for display
 */
export function formatBookingIdForDisplay(
  bookingId: string,
  context: 'header' | 'list' | 'detail' | 'chat' = 'list'
): string {
  if (isValidUnifiedBookingId(bookingId)) {
    switch (context) {
      case 'header':
        return `Job: ${bookingId}`;
      case 'list':
        return `#${bookingId}`;
      case 'detail':
        return `Booking ID: ${bookingId}`;
      case 'chat':
        return `Job #${bookingId}`;
      default:
        return bookingId;
    }
  }
  
  // Fallback for non-unified IDs
  const shortId = getShortDisplayId(bookingId);
  switch (context) {
    case 'header':
      return `Job: ${shortId}`;
    case 'list':
      return `#${shortId}`;
    case 'detail':
      return `Booking ID: ${shortId}`;
    case 'chat':
      return `Job #${shortId}`;
    default:
      return shortId;
  }
}

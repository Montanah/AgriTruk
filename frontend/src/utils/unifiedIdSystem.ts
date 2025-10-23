/**
 * Unified ID System for TRUK App
 * Consolidates all booking and request ID generation and parsing
 * 
 * Standard Format: [TYPE][DATE][MODE][SEQUENCE]
 * - TYPE: A (Agri) or C (Cargo)
 * - DATE: YYMMDD (Year, Month, Day)
 * - MODE: I (Instant), B (Booking), or S (Consolidated)
 * - SEQUENCE: 3-digit sequential number
 * 
 * Examples:
 * - A250930I001 (Agri Instant #001)
 * - C250930B002 (Cargo Booking #002)
 * - A250930S003 (Agri Consolidated #003)
 * - C250930I004 (Cargo Instant #004)
 */

export interface BookingIdComponents {
  type: 'agri' | 'cargo';
  mode: 'instant' | 'booking' | 'consolidated';
  date: Date;
  sequenceNumber: number;
  isConsolidated: boolean;
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
  agri_consolidated: {
    typePrefix: 'A',
    modePrefix: 'S',
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
  },
  cargo_consolidated: {
    typePrefix: 'C',
    modePrefix: 'S',
    startNumber: 1,
    padding: 3
  }
};

/**
 * Generate a unified booking ID
 * @param type - Main type (agri, cargo)
 * @param mode - Subtype (instant, booking, consolidated)
 * @param sequenceNumber - Sequential number for this type/mode combination
 * @param date - Optional date (defaults to current date)
 * @returns Formatted booking ID (e.g., A250930I001, C250930B002)
 */
export function generateUnifiedBookingId(
  type: 'agri' | 'cargo',
  mode: 'instant' | 'booking' | 'consolidated',
  sequenceNumber: number,
  date?: Date
): string {
  const configKey = `${type}_${mode}` as keyof typeof UNIFIED_ID_CONFIGS;
  const config = UNIFIED_ID_CONFIGS[configKey];
  
  if (!config) {
    throw new Error(`Invalid booking type/mode combination: ${type}_${mode}`);
  }
  
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
 * @param bookingId - User-friendly booking ID (e.g., A250930I001)
 * @returns Object with parsed components, or null if invalid
 */
export function parseUnifiedBookingId(bookingId: string): BookingIdComponents | null {
  try {
    // Validate format: [TYPE][YYMMDD][MODE][SEQUENCE]
    const match = bookingId.match(/^([AC])(\d{6})([IBS])(\d{3})$/);
  
  if (!match) {
    return null;
  }
  
    const [, typePrefix, dateStr, modePrefix, sequenceStr] = match;
    
    // Parse type
    const type = typePrefix === 'A' ? 'agri' : 'cargo';
    
    // Parse mode
    let mode: 'instant' | 'booking' | 'consolidated';
    switch (modePrefix) {
      case 'I':
        mode = 'instant';
        break;
      case 'B':
        mode = 'booking';
        break;
      case 'S':
        mode = 'consolidated';
        break;
      default:
        return null;
    }
  
  // Parse date
    const year = parseInt('20' + dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // Month is 0-indexed
  const day = parseInt(dateStr.substring(4, 6));
  const date = new Date(year, month, day);
  
    // Validate date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Parse sequence number
    const sequenceNumber = parseInt(sequenceStr);
  
  return {
    type,
    mode,
      date,
      sequenceNumber,
      isConsolidated: mode === 'consolidated'
  };
  } catch (error) {
    console.error('Error parsing booking ID:', error);
    return null;
  }
}

/**
 * Get display-friendly booking ID from various input formats
 * @param input - Booking object, ID string, or any object with id/bookingId
 * @returns Display-friendly booking ID
 */
export function getDisplayBookingId(input: any): string {
  if (!input) return 'Unknown';
  
  // If it's already a formatted ID, return it
  if (typeof input === 'string') {
    const parsed = parseUnifiedBookingId(input);
    if (parsed) {
      return input;
    }
    // If it's not a formatted ID, try to generate one
    return generateDisplayIdFromString(input);
  }
  
  // If it's an object, try to extract or generate ID
  if (typeof input === 'object') {
    // Check for existing formatted ID
    if (input.bookingId && parseUnifiedBookingId(input.bookingId)) {
      return input.bookingId;
    }
    
    // Check for existing ID and try to format it
    if (input.id) {
      return generateDisplayIdFromString(input.id);
    }
    
    // Generate new ID based on object properties
    return generateDisplayIdFromObject(input);
  }
  
  return 'Unknown';
}

/**
 * Generate display ID from string input
 */
function generateDisplayIdFromString(input: string): string {
  // If it looks like a database ID, generate a new formatted ID
  if (input.length > 10 || input.includes('-') || input.includes('_')) {
    return generateDisplayIdFromObject({ id: input });
  }
  
  return input;
}

/**
 * Generate display ID from object properties
 */
function generateDisplayIdFromObject(obj: any): string {
  try {
    // Determine type based on product type or other indicators
    const productType = obj.productType || obj.cargoType || obj.cargoDetails || '';
    const type = productType.toLowerCase().includes('agricultural') || 
                 productType.toLowerCase().includes('crop') || 
                 productType.toLowerCase().includes('farm') ? 'agri' : 'cargo';
    
    // Determine mode
    const bookingType = obj.type || obj.bookingType || 'booking';
    let mode: 'instant' | 'booking' | 'consolidated';
    
    if (bookingType === 'instant') {
      mode = 'instant';
    } else if (obj.isConsolidated || bookingType === 'consolidated') {
      mode = 'consolidated';
    } else {
      mode = 'booking';
    }
    
    // Use current date and a random sequence number
    const sequenceNumber = Math.floor(Math.random() * 999) + 1;
    
    return generateUnifiedBookingId(type, mode, sequenceNumber);
  } catch (error) {
    console.error('Error generating display ID from object:', error);
    return `ID-${Date.now()}`;
  }
}

/**
 * Get booking type and mode from ID
 * @param bookingId - Booking ID
 * @returns Object with type and mode information
 */
export function getBookingTypeAndMode(bookingId: string): {
  type: 'agri' | 'cargo' | 'unknown';
  mode: 'instant' | 'booking' | 'consolidated' | 'unknown';
  isConsolidated: boolean;
} {
  const parsed = parseUnifiedBookingId(bookingId);
  
  if (!parsed) {
    return {
      type: 'unknown',
      mode: 'unknown',
      isConsolidated: false
    };
  }
  
  return {
    type: parsed.type,
    mode: parsed.mode,
    isConsolidated: parsed.isConsolidated
  };
}

/**
 * Validate if a booking ID is in the correct format
 * @param bookingId - Booking ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidBookingId(bookingId: string): boolean {
  return parseUnifiedBookingId(bookingId) !== null;
}

/**
 * Get next sequence number for a booking type
 * This would typically be fetched from the backend
 * For now, we'll use a simple incrementing approach
 */
export function getNextSequenceNumber(
  type: 'agri' | 'cargo',
  mode: 'instant' | 'booking' | 'consolidated'
): number {
  // In a real implementation, this would query the backend
  // For now, we'll use timestamp-based approach
  const now = new Date();
  const timestamp = now.getTime();
  return (timestamp % 999) + 1;
}

/**
 * Generate a new booking ID with automatic sequence number
 * @param type - Main type (agri, cargo)
 * @param mode - Subtype (instant, booking, consolidated)
 * @param date - Optional date (defaults to current date)
 * @returns New booking ID
 */
export function generateNewBookingId(
  type: 'agri' | 'cargo',
  mode: 'instant' | 'booking' | 'consolidated',
  date?: Date
): string {
  const sequenceNumber = getNextSequenceNumber(type, mode);
  return generateUnifiedBookingId(type, mode, sequenceNumber, date);
}

/**
 * Format booking ID for display with additional context
 * @param bookingId - Booking ID
 * @param showType - Whether to show type information
 * @param showDate - Whether to show date information
 * @returns Formatted display string
 */
export function formatBookingIdForDisplay(
  bookingId: string,
  showType: boolean = true,
  showDate: boolean = true
): string {
  const parsed = parseUnifiedBookingId(bookingId);
  
  if (!parsed) {
        return bookingId;
  }
  
  let display = bookingId;
  
  if (showType || showDate) {
    const parts = [];
    
    if (showType) {
      const typeLabel = parsed.type === 'agri' ? 'Agricultural' : 'Cargo';
      const modeLabel = parsed.mode === 'instant' ? 'Instant' : 
                       parsed.mode === 'booking' ? 'Booking' : 'Consolidated';
      parts.push(`${typeLabel} ${modeLabel}`);
    }
    
    if (showDate) {
      const dateStr = parsed.date.toLocaleDateString();
      parts.push(dateStr);
    }
    
    if (parts.length > 0) {
      display = `${bookingId} (${parts.join(' - ')})`;
    }
  }
  
  return display;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateUnifiedBookingId instead
 */
export function generateBookingId(
  bookingType: 'agri' | 'cargo',
  bookingMode: 'instant' | 'booking',
  isConsolidated: boolean = false,
  timestamp?: Date
): string {
  const mode = isConsolidated ? 'consolidated' : bookingMode;
  const sequenceNumber = getNextSequenceNumber(bookingType, mode);
  return generateUnifiedBookingId(bookingType, mode, sequenceNumber, timestamp);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseUnifiedBookingId instead
 */
export function parseBookingId(bookingId: string): BookingIdComponents | null {
  return parseUnifiedBookingId(bookingId);
}
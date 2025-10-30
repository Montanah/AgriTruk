/**
 * Utility functions for generating and managing readable IDs
 */

export interface ReadableIdOptions {
  bookingType: 'Agri' | 'Cargo';
  bookingMode: 'instant' | 'booking';
  isConsolidated?: boolean;
  timestamp?: Date;
}

/**
 * Generate a readable ID for display purposes
 * Format: YYMMDD-HHMM-TYPE-MODE
 * Example: 250930-1430-AGR-INST (Agri Instant)
 * Example: 250930-1430-CRG-BOOK (Cargo Booking)
 * Example: 250930-1430-CONS-AGR (Consolidated Agri)
 */
export const generateReadableId = (options: ReadableIdOptions): string => {
  const now = options.timestamp || new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  const type = options.bookingType === 'Agri' ? 'AGR' : 'CAR';
  const mode = options.isConsolidated ? 'CONS' : (options.bookingMode === 'instant' ? 'INST' : 'BOOK');
  
  return `${year}${month}${day}-${hour}${minute}-${type}-${mode}`;
};

/**
 * Generate a readable ID for a single request (PLACEHOLDER - backend will generate final ID)
 */
export const generateRequestReadableId = (bookingType: 'Agri' | 'Cargo', bookingMode: 'instant' | 'booking', timestamp?: Date, seed?: string): string => {
  return generateReadableId({ bookingType, bookingMode, timestamp }, seed);
};

/**
 * Generate a readable ID for consolidated requests (PLACEHOLDER - backend will generate final ID)
 */
export const generateConsolidationReadableId = (bookingType: 'Agri' | 'Cargo', timestamp?: Date, seed?: string): string => {
  return generateReadableId({ bookingType, bookingMode: 'booking', isConsolidated: true, timestamp }, seed);
};

/**
 * Parse a readable ID to extract information
 */
export const parseReadableId = (readableId: string) => {
  const parts = readableId.split('-');
  if (parts.length !== 3) {
    return null;
  }
  
  const [datePart, timePart, typeModePart] = parts;
  
  // Parse date (YYMMDD)
  const year = 2000 + parseInt(datePart.slice(0, 2));
  const month = parseInt(datePart.slice(2, 4)) - 1; // Month is 0-indexed
  const day = parseInt(datePart.slice(4, 6));
  
  // Parse time (HHMM)
  const hour = parseInt(timePart.slice(0, 2));
  const minute = parseInt(timePart.slice(2, 4));
  
  // Parse type and mode
  const isConsolidated = typeModePart.startsWith('CONS');
  const bookingType = typeModePart.includes('AGR') ? 'Agri' : 'Cargo';
  const bookingMode = isConsolidated ? 'booking' : (typeModePart.includes('INST') ? 'instant' : 'booking');
  
  return {
    date: new Date(year, month, day, hour, minute),
    bookingType: bookingType as 'Agri' | 'Cargo',
    bookingMode: bookingMode as 'instant' | 'booking',
    isConsolidated,
    originalId: readableId
  };
};

/**
 * Check if an ID is a readable ID format (supports both old and new formats)
 */
export const isReadableId = (id: string): boolean => {
  // New format: YYMMDD-HHMMSS-TYPE-[B/I/C]xxx (e.g., 251029-215720-AGR-B34A)
  const newPattern = /^\d{6}-\d{6}-(AGR|CAR)-(B|I|C)[A-Z0-9]{3}$/;
  // Old format: YYMMDD-HHMM-TYPE-MODE (for backward compatibility)
  const oldPattern = /^\d{6}-\d{4}-(AGR|CRG|CAR)-(INST|BOOK|CONS)$/;
  return newPattern.test(id) || oldPattern.test(id);
};

/**
 * Generate a display ID for UI purposes
 * This creates a readable ID but keeps the original database ID for backend operations
 */
export const createDisplayId = (originalId: string, options: ReadableIdOptions): { displayId: string; originalId: string } => {
  return {
    displayId: generateReadableId(options),
    originalId: originalId
  };
};

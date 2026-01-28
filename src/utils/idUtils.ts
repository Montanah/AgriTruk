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
 * Generate a readable ID for display purposes (PLACEHOLDER - backend will generate final ID with unique suffix)
 * Format: YYMMDD-HHMMSS-TYPE-[B/I/C]XXX
 * Example: 251029-215720-AGR-BXXX (Agri Booking - backend adds unique suffix)
 * Example: 251029-215720-CAR-IXXX (Cargo Instant - backend adds unique suffix)
 * Example: 251029-215720-AGR-CXXX (Consolidated - backend adds unique suffix)
 * 
 * NOTE: This is a placeholder. The backend will generate the final readableId using createdAt timestamp
 * and bookingId (Firestore document ID) to create a unique suffix. The backend readableId takes priority.
 */
export const generateReadableId = (options: ReadableIdOptions, seed?: string): string => {
  const now = options.timestamp || new Date();
  
  // Convert to UTC+3 (same as backend does)
  const utcPlus3 = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  
  const year = utcPlus3.getUTCFullYear().toString().slice(-2);
  const month = (utcPlus3.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = utcPlus3.getUTCDate().toString().padStart(2, '0');
  const hour = utcPlus3.getUTCHours().toString().padStart(2, '0');
  const minute = utcPlus3.getUTCMinutes().toString().padStart(2, '0');
  const second = utcPlus3.getUTCSeconds().toString().padStart(2, '0');
  
  const type = options.bookingType === 'Agri' ? 'AGR' : 'CAR';
  const letter = options.isConsolidated ? 'C' : (options.bookingMode === 'instant' ? 'I' : 'B');
  
  // Generate a placeholder suffix (backend will use actual bookingId for unique suffix)
  let suffix = 'XXX';
  if (seed) {
    // Simple hash for placeholder (backend uses computeShortSuffix with actual bookingId)
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    suffix = (hash % 1000).toString(36).toUpperCase().padStart(3, '0').slice(-3);
  }
  
  return `${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suffix}`;
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

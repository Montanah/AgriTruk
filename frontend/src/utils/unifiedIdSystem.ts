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
  
  // If it's already a formatted ID, return it (but skip temp IDs)
  if (typeof input === 'string') {
    // Skip temporary IDs generated on frontend
    if (input.startsWith('temp-')) {
      return 'Pending...';
    }
    // Check if it's already in the correct format (YYMMDD-HHMM-TYPE-MODE)
    if (/^\d{6}-\d{4}-(AGR|CAR)-(BOOK|INST|CONS)$/.test(input)) {
      return input;
    }
    // Check if it matches old unified format
    const parsed = parseUnifiedBookingId(input);
    if (parsed) {
      return input;
    }
    // Return as-is if it looks like a readable ID
    return input;
  }
  
  // If it's an object, try to extract or generate ID
  if (typeof input === 'object') {
    // PRIORITY 1: Always use readableId from backend if provided (backend is source of truth)
    const aliasReadableId = input.readableId 
      || input.displayId 
      || input.userFriendlyId 
      || input.customerReadableId 
      || input.shipperReadableId;
    
    if (aliasReadableId) {
      // Backend provides readableId - use it directly (trust backend as source of truth)
      // If it's an old format, convert it to new format for display consistency
      if (/^\d{6}-\d{4}-(AGR|CAR)-(BOOK|INST|CONS)$/.test(aliasReadableId)) {
        return convertOldReadableToNew(aliasReadableId, input.id || input.bookingId || input._id);
      }
      return aliasReadableId;
    }
    
    // PRIORITY 2: Check if id is already in readable format (only if from backend - not temp IDs)
    if (input.id && typeof input.id === 'string' && !input.id.startsWith('temp-')) {
      // Check if it's already in the correct format (YYMMDD-HHMM-TYPE-MODE)
      if (/^\d{6}-\d{4}-(AGR|CAR)-(BOOK|INST|CONS)/.test(input.id)) {
        return input.id;
      }
    }
    
    // PRIORITY 3: Check if bookingId is already in correct format - trust backend data
    if (input.bookingId) {
      // Check if it's already in the correct format (YYMMDD-HHMM-TYPE-MODE)
      if (/^\d{6}-\d{4}-(AGR|CAR)-(BOOK|INST|CONS)$/.test(input.bookingId)) {
        // Backend bookingId in correct format - use it directly
        // Don't recompute - backend is source of truth
        return input.bookingId;
      }
      // Check if it matches old unified format
      const parsed = parseUnifiedBookingId(input.bookingId);
      if (parsed) {
        return input.bookingId;
      }
      // If it's a readable ID format, use it
      if (input.bookingId.length < 30 && !input.bookingId.includes('_') && !input.bookingId.includes('-')) {
        // Might be a readable ID from backend
        return input.bookingId;
      }
    }
    
    // PRIORITY 4: Only generate if we don't have a readable ID
    // Generate new ID based on object properties (this should only happen for old data without readableId)
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
 * Parse Firestore timestamp or date string to Date object
 */
function parseFirestoreTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  try {
    // Firestore timestamp object: { _seconds: 1234567890, _nanoseconds: 0 }
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    }
    
    // Firestore Timestamp object with toDate method
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Firestore timestamp object with seconds property (alternative format)
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    // ISO string
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Number (Unix timestamp in milliseconds or seconds)
    if (typeof timestamp === 'number') {
      // If less than 1e12, assume it's seconds, otherwise milliseconds
      const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
      const parsed = new Date(ms);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing timestamp:', error, 'timestamp:', timestamp);
    return null;
  }
}

/**
 * Generate display ID from object properties
 * Format: YYMMDD-HHMM-TYPE-MODE (e.g., 251029-1758-AGR-BOOK)
 * IMPORTANT: Uses createdAt from the booking object, never current time
 */
function generateDisplayIdFromObject(obj: any): string {
  try {
    // CRITICAL: Parse createdAt properly from various formats (Firestore timestamp, ISO string, etc.)
    let bookingDate: Date | null = null;
    
    // Try to get createdAt from various possible fields (including date for consolidation items)
    const createdAtSource = obj.createdAt || obj.created_at || obj.timestamp || obj.dateCreated || obj.date;
    
    if (createdAtSource) {
      bookingDate = parseFirestoreTimestamp(createdAtSource);
    }
    
    // If we couldn't parse createdAt, check if id is already in readable format first (only if from backend)
    if (!bookingDate || isNaN(bookingDate.getTime())) {
      // If id exists and is already in readable format from backend (not temp), use it without warning
      if (obj.id && typeof obj.id === 'string' && !obj.id.startsWith('temp-') && /^\d{6}-\d{4}-(AGR|CAR)-(BOOK|INST|CONS)/.test(obj.id)) {
        return obj.id;
      }
      
      // If readableId exists, use it even if createdAt is missing (no warning needed)
      if (obj.readableId && typeof obj.readableId === 'string' && obj.readableId.length > 0) {
        return obj.readableId;
      }
      
      // Only warn if we're actually going to use a fallback (not if we have a valid ID)
      console.warn('⚠️ Cannot parse createdAt for booking ID generation:', {
        rawId: obj.id || obj.bookingId || obj._id,
        createdAtSource: obj.createdAt || obj.created_at || obj.timestamp || obj.dateCreated || obj.date,
        readableId: obj.readableId,
      });
      
      // As absolute last resort, use current time (not ideal but better than raw ID)
      // This ensures we always have a readable format, even if timestamp parsing fails
      const fallbackDate = new Date();
      const utcPlus3 = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      
      // Extract and validate date components to prevent NaN
      const yearNum = utcPlus3.getUTCFullYear();
      const monthNum = utcPlus3.getUTCMonth() + 1;
      const dayNum = utcPlus3.getUTCDate();
      const hourNum = utcPlus3.getUTCHours();
      const minuteNum = utcPlus3.getUTCMinutes();
      const secondNum = utcPlus3.getUTCSeconds();
      
      // Validate all components are valid numbers (defensive check)
      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum) || isNaN(secondNum)) {
        console.error('⚠️ Even fallback date is invalid! Using raw ID instead.');
        const rawId = obj.id || obj.bookingId || obj._id || '';
        return rawId && rawId.length > 8 ? `#${rawId.slice(-8).toUpperCase()}` : `#${rawId || 'UNKNOWN'}`;
      }
      
      // Convert to strings with proper formatting
      const year = String(yearNum).slice(-2);
      const month = String(monthNum).padStart(2, '0');
      const day = String(dayNum).padStart(2, '0');
      const hour = String(hourNum).padStart(2, '0');
      const minute = String(minuteNum).padStart(2, '0');
      const second = String(secondNum).padStart(2, '0');
      
      // Try to infer type from productType if bookingType is missing
      const bookingTypeField = (obj.bookingType || obj.type || '').toString().toLowerCase();
      let type: 'AGR' | 'CAR' = 'CAR';
      if (bookingTypeField.includes('agri')) {
        type = 'AGR';
      } else {
        const productType = (obj.productType || obj.cargoType || '').toString().toLowerCase();
        if (productType.includes('agricultural') || productType.includes('crop') || productType.includes('farm')) {
          type = 'AGR';
        }
      }
      
      const bookingModeField = (obj.bookingMode || (obj.type === 'instant' ? 'instant' : 'booking') || 'booking').toString().toLowerCase();
      const isConsolidated = obj.isConsolidated || bookingModeField === 'consolidated';
      const isInstant = bookingModeField === 'instant';
      const letter = isConsolidated ? 'C' : (isInstant ? 'I' : 'B');
      
      const rawId = obj.id || obj.bookingId || obj._id || '';
      const suf = computeShortSuffix(rawId || `${fallbackDate.getTime()}-${Math.random()}`);
      
      // Prefix with "FALLBACK-" to indicate this is a fallback ID
      return `FALLBACK-${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suf}`;
    }
    
    // Use the parsed createdAt date for ID generation (NOT current time)
    // CRITICAL: Validate the date is actually valid before using it
    const dateTime = bookingDate.getTime();
    if (isNaN(dateTime) || !isFinite(dateTime)) {
      console.warn('⚠️ Invalid date time value:', dateTime, 'falling back to readableId or generating new ID');
      // If readableId exists, use it
      if (obj.readableId && typeof obj.readableId === 'string' && obj.readableId.length > 0) {
        return obj.readableId;
      }
      // Fall back to current time
      const fallbackDate = new Date();
      const utcPlus3Fallback = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      const year = String(utcPlus3Fallback.getUTCFullYear()).slice(-2);
      const month = String(utcPlus3Fallback.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcPlus3Fallback.getUTCDate()).padStart(2, '0');
      const hour = String(utcPlus3Fallback.getUTCHours()).padStart(2, '0');
      const minute = String(utcPlus3Fallback.getUTCMinutes()).padStart(2, '0');
      const second = String(utcPlus3Fallback.getUTCSeconds()).padStart(2, '0');
      
      // Determine type and mode
      const bookingTypeField = (obj.bookingType || obj.type || '').toString().toLowerCase();
      let type: 'AGR' | 'CAR' = 'CAR';
      if (bookingTypeField.includes('agri')) {
        type = 'AGR';
      } else {
        const productType = (obj.productType || obj.cargoType || '').toString().toLowerCase();
        if (productType.includes('agricultural') || productType.includes('crop') || productType.includes('farm')) {
          type = 'AGR';
        }
      }
      
      const bookingModeField = (obj.bookingMode || (obj.type === 'instant' ? 'instant' : 'booking') || 'booking').toString().toLowerCase();
      const isConsolidated = obj.isConsolidated || bookingModeField === 'consolidated';
      const isInstant = bookingModeField === 'instant';
      const letter = isConsolidated ? 'C' : (isInstant ? 'I' : 'B');
      
      const rawId = obj.id || obj.bookingId || obj._id || '';
      const suf = computeShortSuffix(rawId || `${fallbackDate.getTime()}-${Math.random()}`);
      
      return `FALLBACK-${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suf}`;
    }
    
    // CRITICAL: Convert to UTC+3 timezone explicitly (Kenya time)
    // Firestore timestamps are in UTC, so we need to add 3 hours to get UTC+3
    const utcPlus3 = new Date(dateTime + (3 * 60 * 60 * 1000)); // Add 3 hours
    
    // Validate the Date object itself is valid before extracting components
    if (!utcPlus3 || isNaN(utcPlus3.getTime()) || !isFinite(utcPlus3.getTime())) {
      console.warn('⚠️ Invalid utcPlus3 date object, falling back to readableId or current time');
      if (obj.readableId && typeof obj.readableId === 'string' && obj.readableId.length > 0) {
        return obj.readableId;
      }
      // Use current time as fallback
      const fallbackDate = new Date();
      const fallbackUtcPlus3 = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      const year = String(fallbackUtcPlus3.getUTCFullYear()).slice(-2);
      const month = String(fallbackUtcPlus3.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fallbackUtcPlus3.getUTCDate()).padStart(2, '0');
      const hour = String(fallbackUtcPlus3.getUTCHours()).padStart(2, '0');
      const minute = String(fallbackUtcPlus3.getUTCMinutes()).padStart(2, '0');
      const second = String(fallbackUtcPlus3.getUTCSeconds()).padStart(2, '0');
      
      const bookingTypeField = (obj.bookingType || obj.type || '').toString().toLowerCase();
      let type: 'AGR' | 'CAR' = 'CAR';
      if (bookingTypeField.includes('agri')) {
        type = 'AGR';
      }
      
      const bookingModeField = (obj.bookingMode || (obj.type === 'instant' ? 'instant' : 'booking') || 'booking').toString().toLowerCase();
      const isConsolidated = obj.isConsolidated || bookingModeField === 'consolidated';
      const isInstant = bookingModeField === 'instant';
      const letter = isConsolidated ? 'C' : (isInstant ? 'I' : 'B');
      
      const rawId = obj.id || obj.bookingId || obj._id || '';
      const suf = computeShortSuffix(rawId || `${fallbackDate.getTime()}-${Math.random()}`);
      
      return `FALLBACK-${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suf}`;
    }
    
    // Extract date components with validation to prevent NaN
    const yearNum = utcPlus3.getUTCFullYear();
    const monthNum = utcPlus3.getUTCMonth() + 1;
    const dayNum = utcPlus3.getUTCDate();
    const hourNum = utcPlus3.getUTCHours();
    const minuteNum = utcPlus3.getUTCMinutes();
    const secondNum = utcPlus3.getUTCSeconds();
    
    // Validate all components are valid numbers
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum) || isNaN(secondNum)) {
      console.warn('⚠️ Invalid date components, falling back:', { yearNum, monthNum, dayNum, hourNum, minuteNum, secondNum });
      // If readableId exists, use it
      if (obj.readableId && typeof obj.readableId === 'string' && obj.readableId.length > 0) {
        return obj.readableId;
      }
      // Generate fallback ID
      const fallbackDate = new Date();
      const utcPlus3Fallback = new Date(fallbackDate.getTime() + (3 * 60 * 60 * 1000));
      const year = String(utcPlus3Fallback.getUTCFullYear()).slice(-2);
      const month = String(utcPlus3Fallback.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcPlus3Fallback.getUTCDate()).padStart(2, '0');
      const hour = String(utcPlus3Fallback.getUTCHours()).padStart(2, '0');
      const minute = String(utcPlus3Fallback.getUTCMinutes()).padStart(2, '0');
      const second = String(utcPlus3Fallback.getUTCSeconds()).padStart(2, '0');
      
      const bookingTypeField = (obj.bookingType || obj.type || '').toString().toLowerCase();
      let type: 'AGR' | 'CAR' = 'CAR';
      if (bookingTypeField.includes('agri')) {
        type = 'AGR';
      }
      
      const bookingModeField = (obj.bookingMode || (obj.type === 'instant' ? 'instant' : 'booking') || 'booking').toString().toLowerCase();
      const isConsolidated = obj.isConsolidated || bookingModeField === 'consolidated';
      const isInstant = bookingModeField === 'instant';
      const letter = isConsolidated ? 'C' : (isInstant ? 'I' : 'B');
      
      const rawId = obj.id || obj.bookingId || obj._id || '';
      const suf = computeShortSuffix(rawId || `${fallbackDate.getTime()}-${Math.random()}`);
      
      return `FALLBACK-${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suf}`;
    }
    
    // Convert to strings with proper formatting - ensure no NaN leaks through
    const year = (isNaN(yearNum) ? '00' : String(yearNum).slice(-2));
    const month = (isNaN(monthNum) ? '01' : String(monthNum).padStart(2, '0'));
    const day = (isNaN(dayNum) ? '01' : String(dayNum).padStart(2, '0'));
    const hour = (isNaN(hourNum) ? '00' : String(hourNum).padStart(2, '0'));
    const minute = (isNaN(minuteNum) ? '00' : String(minuteNum).padStart(2, '0'));
    const second = (isNaN(secondNum) ? '00' : String(secondNum).padStart(2, '0'));
    
    // Determine type - PRIORITIZE bookingType over product name to avoid "Carrots" -> CAR mistakes
    // bookingType is set explicitly to 'Agri' or 'Cargo' at creation time
    let type: 'AGR' | 'CAR';
    const bookingTypeField = (obj.bookingType || obj.type || '').toString().toLowerCase();
    if (bookingTypeField.includes('agri')) {
      type = 'AGR';
    } else if (bookingTypeField.includes('cargo') || bookingTypeField.includes('car')) {
      // If bookingType explicitly says cargo, treat as cargo
      type = 'CAR';
    } else {
      // Fallback to product-based inference only when bookingType is missing
      const productType = (obj.productType || obj.cargoType || obj.cargoDetails || '').toString().toLowerCase();
      type = (
        productType.includes('agricultural') ||
        productType.includes('crop') ||
        productType.includes('farm') ||
        productType.includes('agri')
      ) ? 'AGR' : 'CAR';
    }
    
    // Determine mode - prioritize bookingMode field
    const bookingModeField = (obj.bookingMode || (obj.type === 'instant' ? 'instant' : 'booking') || 'booking').toString().toLowerCase();
    const isConsolidated = obj.isConsolidated || bookingModeField === 'consolidated' || bookingModeField === 'cons';
    const isInstant = bookingModeField === 'instant' || bookingModeField === 'inst';
    
    // Unique format: YYMMDD-HHMMSS-TYPE-[B/I/C]xxx
    const letter = isConsolidated ? 'C' : (isInstant ? 'I' : 'B');
    
    // Generate unique suffix from raw ID
    const rawId = obj.id || obj.bookingId || obj._id || '';
    const suf = computeShortSuffix(rawId || `${bookingDate.getTime()}-${Math.random()}`);
    
    return `${year}${month}${day}-${hour}${minute}${second}-${type}-${letter}${suf}`;
  } catch (error) {
    console.error('Error generating display ID from object:', error);
    // Fallback to database ID if generation fails
    const rawId = obj.id || obj.bookingId || obj._id || '';
    return rawId && rawId.length > 8 ? `#${rawId.slice(-8).toUpperCase()}` : `#${rawId || 'UNKNOWN'}`;
  }
}

/**
 * Compute short suffix for unique ID generation
 */
function computeShortSuffix(seed: string): string {
  try {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return (hash >>> 0).toString(36).toUpperCase().slice(-3).padStart(3, '0');
  } catch {
    return Math.random().toString(36).toUpperCase().slice(2, 5);
  }
}

/**
 * Convert old readable ID format to new unique format
 */
function convertOldReadableToNew(oldId: string, rawId: string): string {
  // Old format: YYMMDD-HHMM-TYPE-MODE
  // New format: YYMMDD-HHMMSS-TYPE-[B/I/C]xxx
  const match = oldId.match(/^(\d{6})-(\d{4})-(AGR|CAR)-(BOOK|INST|CONS)$/);
  if (!match) return oldId;
  
  const [, ymd, hm, type, modeWord] = match;
  const letter = modeWord === 'CONS' ? 'C' : (modeWord === 'INST' ? 'I' : 'B');
  const suf = computeShortSuffix(rawId || oldId);
  
  // Append '00' for seconds (unknown in old format)
  return `${ymd}-${hm}00-${type}-${letter}${suf}`;
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
/**
 * Phone number validation and formatting utilities for M-Pesa payments
 * Supports Safaricom numbers in formats: 07..., 01..., 2547..., 2541...
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
}

/**
 * Validates and formats M-Pesa phone numbers for Safaricom
 * Supports formats: 07..., 01..., 2547..., 2541...
 */
export const validateMpesaPhone = (phone: string): PhoneValidationResult => {
  if (!phone) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check for valid Safaricom number patterns
  const patterns = [
    // 07... format (10 digits)
    { pattern: /^07\d{8}$/, format: (num: string) => `254${num.substring(1)}` },
    // 01... format (10 digits) - new Safaricom numbers
    { pattern: /^01\d{8}$/, format: (num: string) => `254${num.substring(1)}` },
    // 2547... format (12 digits)
    { pattern: /^2547\d{8}$/, format: (num: string) => num },
    // 2541... format (12 digits) - new Safaricom numbers
    { pattern: /^2541\d{8}$/, format: (num: string) => num },
    // +2547... format (13 characters with +)
    { pattern: /^\+2547\d{8}$/, format: (num: string) => num.substring(1) },
    // +2541... format (13 characters with +)
    { pattern: /^\+2541\d{8}$/, format: (num: string) => num.substring(1) }
  ];

  // Find matching pattern
  const matchedPattern = patterns.find(p => p.pattern.test(cleaned));
  
  if (matchedPattern) {
    return {
      isValid: true,
      formatted: matchedPattern.format(cleaned)
    };
  }

  // Check for common errors
  if (cleaned.length < 10) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Phone number is too short'
    };
  }

  if (cleaned.length > 12) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Phone number is too long'
    };
  }

  if (cleaned.startsWith('254') && !cleaned.startsWith('2547') && !cleaned.startsWith('2541')) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Only Safaricom numbers (07..., 01..., 2547..., 2541...) are supported for M-Pesa'
    };
  }

  return {
    isValid: false,
    formatted: cleaned,
    error: 'Invalid phone number format. Please use Safaricom number (07..., 01..., 2547..., 2541...)'
  };
};

/**
 * Formats phone number for display
 */
export const formatPhoneForDisplay = (phone: string): string => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +254 7XX XXX XXX or +254 1XX XXX XXX
  if (cleaned.length === 12 && (cleaned.startsWith('2547') || cleaned.startsWith('2541'))) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // Format as +254 7XX XXX XXX or +254 1XX XXX XXX from 07... or 01...
  if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
    const international = `254${cleaned.substring(1)}`;
    return `+${international.slice(0, 3)} ${international.slice(3, 6)} ${international.slice(6, 9)} ${international.slice(9)}`;
  }
  
  return phone;
};

/**
 * Gets phone number placeholder text
 */
export const getPhonePlaceholder = (): string => {
  return 'e.g., 0712345678 or 254712345678';
};

/**
 * Validates phone number for general use (not M-Pesa specific)
 */
export const validatePhoneNumber = (phone: string): PhoneValidationResult => {
  if (!phone) {
    return {
      isValid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  const cleaned = phone.replace(/\D/g, '');
  
  // Accept various formats
  const patterns = [
    // 07... format (10 digits)
    { pattern: /^07\d{8}$/, format: (num: string) => `254${num.substring(1)}` },
    // 01... format (10 digits)
    { pattern: /^01\d{8}$/, format: (num: string) => `254${num.substring(1)}` },
    // 254... format (12 digits)
    { pattern: /^254\d{9}$/, format: (num: string) => num },
    // +254... format (13 characters with +)
    { pattern: /^\+254\d{9}$/, format: (num: string) => num.substring(1) }
  ];

  const matchedPattern = patterns.find(p => p.pattern.test(cleaned));
  
  if (matchedPattern) {
    return {
      isValid: true,
      formatted: matchedPattern.format(cleaned)
    };
  }

  return {
    isValid: false,
    formatted: cleaned,
    error: 'Invalid phone number format'
  };
};

/**
 * Smart Credit/Debit Card Validation Utility
 * Provides comprehensive card validation including CVC, expiry, and card type detection
 */

export interface CardValidationResult {
  isValid: boolean;
  cardType: string;
  errors: string[];
  warnings: string[];
}

export interface CardData {
  number: string;
  expiry: string;
  cvc: string;
  cardholderName: string;
}

// Card type patterns
const CARD_PATTERNS = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$|^2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  diners: /^3[0689][0-9]{12}$/,
  jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  unionpay: /^(62[0-9]{14,17})$/,
};

// CVC length requirements by card type
const CVC_LENGTHS = {
  visa: 3,
  mastercard: 3,
  amex: 4,
  discover: 3,
  diners: 3,
  jcb: 3,
  unionpay: 3,
};

export class CardValidator {
  /**
   * Validates a complete card data object
   */
  static validateCard(cardData: CardData): CardValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Clean and validate card number
    const cleanNumber = cardData.number.replace(/\s/g, '');
    const cardType = this.detectCardType(cleanNumber);
    
    // Validate card number
    if (!this.validateCardNumber(cleanNumber)) {
      errors.push('Invalid card number');
    }
    
    // Validate card type
    if (cardType === 'unknown') {
      errors.push('Unsupported card type');
    }
    
    // Validate expiry date
    if (!this.validateExpiryDate(cardData.expiry)) {
      errors.push('Invalid expiry date');
    }
    
    // Validate CVC
    const cvcValidation = this.validateCVC(cardData.cvc, cardType);
    if (!cvcValidation.isValid) {
      errors.push(...cvcValidation.errors);
    }
    
    // Validate cardholder name
    if (!this.validateCardholderName(cardData.cardholderName)) {
      errors.push('Cardholder name is required');
    }
    
    // Check if card is expired
    if (this.isCardExpired(cardData.expiry)) {
      errors.push('Card has expired');
    }
    
    // Add warnings for security
    if (cardData.number.length < 13) {
      warnings.push('Card number seems too short');
    }
    
    if (cardData.cvc.length < 3) {
      warnings.push('CVC seems too short');
    }
    
    return {
      isValid: errors.length === 0,
      cardType,
      errors,
      warnings,
    };
  }
  
  /**
   * Validates card number using Luhn algorithm
   */
  static validateCardNumber(number: string): boolean {
    const cleanNumber = number.replace(/\s/g, '');
    
    // Check if it's all digits and proper length
    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Detects card type based on number pattern
   */
  static detectCardType(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    
    for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
      if (pattern.test(cleanNumber)) {
        return type;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Validates CVC based on card type
   */
  static validateCVC(cvc: string, cardType: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const cleanCVC = cvc.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cleanCVC)) {
      errors.push('CVC must contain only numbers');
      return { isValid: false, errors };
    }
    
    const requiredLength = CVC_LENGTHS[cardType as keyof typeof CVC_LENGTHS] || 3;
    
    if (cleanCVC.length !== requiredLength) {
      errors.push(`CVC must be ${requiredLength} digits for ${cardType} cards`);
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: [] };
  }
  
  /**
   * Validates expiry date format and future date
   */
  static validateExpiryDate(expiry: string): boolean {
    const cleanExpiry = expiry.replace(/\s/g, '');
    
    // Check format MM/YY or MM/YYYY
    if (!/^\d{2}\/\d{2,4}$/.test(cleanExpiry)) {
      return false;
    }
    
    const [month, year] = cleanExpiry.split('/');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year.length === 2 ? `20${year}` : year);
    
    // Validate month
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }
    
    // Validate year (not too far in the future)
    const currentYear = new Date().getFullYear();
    if (yearNum < currentYear || yearNum > currentYear + 20) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Checks if card is expired
   */
  static isCardExpired(expiry: string): boolean {
    if (!this.validateExpiryDate(expiry)) {
      return true;
    }
    
    const cleanExpiry = expiry.replace(/\s/g, '');
    const [month, year] = cleanExpiry.split('/');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year.length === 2 ? `20${year}` : year);
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (yearNum < currentYear) {
      return true;
    }
    
    if (yearNum === currentYear && monthNum < currentMonth) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Validates cardholder name
   */
  static validateCardholderName(name: string): boolean {
    if (!name || name.trim().length < 2) {
      return false;
    }
    
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Formats card number with spaces for display
   */
  static formatCardNumber(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    const cardType = this.detectCardType(cleanNumber);
    
    // Different spacing for different card types
    if (cardType === 'amex') {
      // Amex: XXXX XXXXXX XXXXX
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      // Most cards: XXXX XXXX XXXX XXXX
      return cleanNumber.replace(/(\d{4})/g, '$1 ').trim();
    }
  }
  
  /**
   * Masks card number for display (shows only last 4 digits)
   */
  static maskCardNumber(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    const cardType = this.detectCardType(cleanNumber);
    
    if (cleanNumber.length < 4) {
      return cleanNumber;
    }
    
    const lastFour = cleanNumber.slice(-4);
    const masked = '*'.repeat(cleanNumber.length - 4);
    
    if (cardType === 'amex') {
      return `${masked.slice(0, 4)} ${masked.slice(4, 10)} ${lastFour}`;
    } else {
      return `${masked.slice(0, 4)} ${masked.slice(4, 8)} ${masked.slice(8, 12)} ${lastFour}`;
    }
  }
  
  /**
   * Gets card type icon name for UI
   */
  static getCardTypeIcon(cardType: string): string {
    const iconMap: { [key: string]: string } = {
      visa: 'cc-visa',
      mastercard: 'cc-mastercard',
      amex: 'cc-amex',
      discover: 'cc-discover',
      diners: 'cc-diners-club',
      jcb: 'cc-jcb',
      unionpay: 'credit-card',
    };
    
    return iconMap[cardType] || 'credit-card';
  }
  
  /**
   * Gets card type color for UI
   */
  static getCardTypeColor(cardType: string): string {
    const colorMap: { [key: string]: string } = {
      visa: '#1A1F71',
      mastercard: '#EB001B',
      amex: '#006FCF',
      discover: '#FF6000',
      diners: '#0079BE',
      jcb: '#003B7C',
      unionpay: '#E21836',
    };
    
    return colorMap[cardType] || '#666666';
  }
}

export default CardValidator;


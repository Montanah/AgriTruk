export interface CardValidationResult {
  isValid: boolean;
  cardType: string | null;
  formattedNumber: string;
  cvvLength: number;
  color: string;
  icon: string;
  errorMessage?: string;
}

export interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
}

export interface FullCardValidationResult {
  number: CardValidationResult;
  expiry: { isValid: boolean; errorMessage?: string };
  cvv: { isValid: boolean; errorMessage?: string };
  cardholderName: { isValid: boolean; errorMessage?: string };
  overall: { isValid: boolean; errorMessage?: string };
}

const CARD_TYPES = [
  // Major International Cards
  {
    name: 'Visa',
    pattern: /^4/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Mastercard',
    pattern: /^5[1-5]/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'American Express',
    pattern: /^3[47]/,
    color: '#006FCF',
    icon: 'credit-card',
    cvvLength: 4,
    format: /^(\d{4})(\d{6})(\d{5})$/,
    maxLength: 15,
  },
  {
    name: 'Discover',
    pattern: /^6(?:011|5)/,
    color: '#FF6000',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // International Cards
  {
    name: 'JCB',
    pattern: /^35/,
    color: '#007B49',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Diners Club',
    pattern: /^3[0689]/,
    color: '#0079BE',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{6})(\d{4})$/,
    maxLength: 14,
  },
  {
    name: 'UnionPay',
    pattern: /^62/,
    color: '#E21836',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // European Cards
  {
    name: 'Maestro',
    pattern: /^(5[0678]|6[0-9])/,
    color: '#009639',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Dankort',
    pattern: /^5019/,
    color: '#0066CC',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Carte Bancaire',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#003399',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Asian Cards
  {
    name: 'China UnionPay',
    pattern: /^62/,
    color: '#E21836',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'BC Card',
    pattern: /^9[0-9]{15}$/,
    color: '#FF6600',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Regional Cards
  {
    name: 'RuPay',
    pattern: /^6[0-9]{15}$/,
    color: '#FF6B35',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Elo',
    pattern: /^(4011|4312|4389|4514|4573|5041|5067|5090|6277|6362|6363|6504|6505|6506|6507|6508|6509|6510|6511|6550)/,
    color: '#00A651',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Hipercard',
    pattern: /^606282/,
    color: '#FF6600',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Corporate Cards
  {
    name: 'Corporate Visa',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'briefcase',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Corporate Mastercard',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'briefcase',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Debit Cards
  {
    name: 'Visa Debit',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Mastercard Debit',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Prepaid Cards
  {
    name: 'Visa Prepaid',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  {
    name: 'Mastercard Prepaid',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 16,
  },
  
  // Store Cards
  {
    name: 'Store Card',
    pattern: /^[0-9]{13,19}$/,
    color: '#666666',
    icon: 'store',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
    maxLength: 19,
  },
];

// Luhn algorithm for card validation
export const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

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
};

// Detect card type
export const detectCardType = (number: string) => {
  const cleanNumber = number.replace(/\D/g, '');
  return CARD_TYPES.find(type => type.pattern.test(cleanNumber)) || null;
};

// Format card number
export const formatCardNumber = (number: string, cardType: any = null): string => {
  const cleanNumber = number.replace(/\D/g, '');
  
  if (!cardType) {
    // Default formatting for unknown cards
    return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  if (cardType.name === 'American Express') {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  } else if (cardType.name === 'Diners Club') {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
  } else {
    return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
};

// Validate card number
export const validateCardNumber = (number: string): CardValidationResult => {
  const cleanNumber = number.replace(/\D/g, '');
  const cardType = detectCardType(cleanNumber);
  
  if (!cardType) {
    return {
      isValid: false,
      cardType: null,
      formattedNumber: formatCardNumber(cleanNumber),
      cvvLength: 3,
      color: '#666666',
      icon: 'credit-card',
      errorMessage: 'Unsupported card type',
    };
  }

  // Check length
  if (cleanNumber.length !== cardType.maxLength) {
    return {
      isValid: false,
      cardType: cardType.name,
      formattedNumber: formatCardNumber(cleanNumber, cardType),
      cvvLength: cardType.cvvLength,
      color: cardType.color,
      icon: cardType.icon,
      errorMessage: `Card number must be ${cardType.maxLength} digits`,
    };
  }

  // Luhn algorithm check
  const luhnValid = luhnCheck(cleanNumber);
  
  return {
    isValid: luhnValid,
    cardType: cardType.name,
    formattedNumber: formatCardNumber(cleanNumber, cardType),
    cvvLength: cardType.cvvLength,
    color: cardType.color,
    icon: cardType.icon,
    errorMessage: luhnValid ? undefined : 'Invalid card number',
  };
};

// Validate expiry date
export const validateExpiryDate = (expiry: string): { isValid: boolean; errorMessage?: string } => {
  const cleanExpiry = expiry.replace(/\D/g, '');
  
  if (cleanExpiry.length !== 4) {
    return {
      isValid: false,
      errorMessage: 'Expiry date must be in MM/YY format',
    };
  }

  const month = parseInt(cleanExpiry.substring(0, 2));
  const year = parseInt(cleanExpiry.substring(2, 4));
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      errorMessage: 'Invalid month',
    };
  }

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      isValid: false,
      errorMessage: 'Card has expired',
    };
  }

  return { isValid: true };
};

// Validate CVV
export const validateCVV = (cvv: string, cardType: string | null): { isValid: boolean; errorMessage?: string } => {
  const cleanCVV = cvv.replace(/\D/g, '');
  const expectedLength = cardType === 'American Express' ? 4 : 3;
  
  if (cleanCVV.length !== expectedLength) {
    return {
      isValid: false,
      errorMessage: `CVV must be ${expectedLength} digits`,
    };
  }

  return { isValid: true };
};

// Validate cardholder name
export const validateCardholderName = (name: string): { isValid: boolean; errorMessage?: string } => {
  if (!name.trim()) {
    return {
      isValid: false,
      errorMessage: 'Cardholder name is required',
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      errorMessage: 'Cardholder name must be at least 2 characters',
    };
  }

  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return {
      isValid: false,
      errorMessage: 'Cardholder name can only contain letters and spaces',
    };
  }

  return { isValid: true };
};

// Full card validation
export const validateFullCard = (cardData: CardData): FullCardValidationResult => {
  const numberResult = validateCardNumber(cardData.number);
  const expiryResult = validateExpiryDate(cardData.expiry);
  const cvvResult = validateCVV(cardData.cvv, numberResult.cardType);
  const cardholderResult = validateCardholderName(cardData.cardholderName);

  const overallValid = numberResult.isValid && 
                      expiryResult.isValid && 
                      cvvResult.isValid && 
                      cardholderResult.isValid;

  return {
    number: numberResult,
    expiry: expiryResult,
    cvv: cvvResult,
    cardholderName: cardholderResult,
    overall: {
      isValid: overallValid,
      errorMessage: overallValid ? undefined : 'Please fix the errors above',
    },
  };
};

// Get card type color
export const getCardTypeColor = (cardType: string | null): string => {
  if (!cardType) return '#666666';
  const type = CARD_TYPES.find(t => t.name === cardType);
  return type?.color || '#666666';
};

// Get card type icon
export const getCardTypeIcon = (cardType: string | null): string => {
  if (!cardType) return 'credit-card';
  const type = CARD_TYPES.find(t => t.name === cardType);
  return type?.icon || 'credit-card';
};

// Format expiry date
export const formatExpiryDate = (expiry: string): string => {
  const cleanExpiry = expiry.replace(/\D/g, '');
  
  if (cleanExpiry.length >= 2) {
    return cleanExpiry.substring(0, 2) + '/' + cleanExpiry.substring(2, 4);
  }
  
  return cleanExpiry;
};

// Mask card number for display
export const maskCardNumber = (number: string, visibleDigits: number = 4): string => {
  const cleanNumber = number.replace(/\D/g, '');
  const masked = '*'.repeat(cleanNumber.length - visibleDigits);
  const visible = cleanNumber.slice(-visibleDigits);
  return masked + visible;
};

export default {
  luhnCheck,
  detectCardType,
  formatCardNumber,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  validateCardholderName,
  validateFullCard,
  getCardTypeColor,
  getCardTypeIcon,
  formatExpiryDate,
  maskCardNumber,
};
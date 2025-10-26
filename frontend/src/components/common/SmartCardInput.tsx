import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface CardType {
  name: string;
  pattern: RegExp;
  color: string;
  icon: string;
  cvvLength: number;
  format: RegExp;
}

interface SmartCardInputProps {
  onCardChange?: (cardData: CardData) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
}

interface CardData {
  number: string;
  type: string | null;
  isValid: boolean;
  formattedNumber: string;
}

const CARD_TYPES: CardType[] = [
  // Major International Cards
  {
    name: 'Visa',
    pattern: /^4/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Mastercard',
    pattern: /^5[1-5]/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'American Express',
    pattern: /^3[47]/,
    color: '#006FCF',
    icon: 'credit-card',
    cvvLength: 4,
    format: /^(\d{4})(\d{6})(\d{5})$/,
  },
  {
    name: 'Discover',
    pattern: /^6(?:011|5)/,
    color: '#FF6000',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // International Cards
  {
    name: 'JCB',
    pattern: /^35/,
    color: '#007B49',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Diners Club',
    pattern: /^3[0689]/,
    color: '#0079BE',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{6})(\d{4})$/,
  },
  {
    name: 'UnionPay',
    pattern: /^62/,
    color: '#E21836',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // European Cards
  {
    name: 'Maestro',
    pattern: /^(5[0678]|6[0-9])/,
    color: '#009639',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Dankort',
    pattern: /^5019/,
    color: '#0066CC',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Asian Cards
  {
    name: 'BC Card',
    pattern: /^9[0-9]{15}$/,
    color: '#FF6600',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Regional Cards
  {
    name: 'RuPay',
    pattern: /^6[0-9]{15}$/,
    color: '#FF6B35',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Elo',
    pattern: /^(4011|4312|4389|4514|4573|5041|5067|5090|6277|6362|6363|6504|6505|6506|6507|6508|6509|6510|6511|6550)/,
    color: '#00A651',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Hipercard',
    pattern: /^606282/,
    color: '#FF6600',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Corporate Cards
  {
    name: 'Corporate Visa',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'briefcase',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Corporate Mastercard',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'briefcase',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Debit Cards
  {
    name: 'Visa Debit',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Mastercard Debit',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Prepaid Cards
  {
    name: 'Visa Prepaid',
    pattern: /^4[0-9]{12}(?:[0-9]{3})?$/,
    color: '#1A1F71',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  {
    name: 'Mastercard Prepaid',
    pattern: /^5[1-5][0-9]{14}$/,
    color: '#EB001B',
    icon: 'credit-card',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
  
  // Store Cards
  {
    name: 'Store Card',
    pattern: /^[0-9]{13,19}$/,
    color: '#666666',
    icon: 'store',
    cvvLength: 3,
    format: /^(\d{4})(\d{4})(\d{4})(\d{4})$/,
  },
];

const SmartCardInput: React.FC<SmartCardInputProps> = ({
  onCardChange,
  onValidationChange,
  placeholder = '1234 5678 9012 3456',
  style,
  disabled = false,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState<CardType | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Luhn algorithm for card validation
  const luhnCheck = (num: string): boolean => {
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
  const detectCardType = (number: string): CardType | null => {
    const cleanNumber = number.replace(/\D/g, '');
    return CARD_TYPES.find(type => type.pattern.test(cleanNumber)) || null;
  };

  // Format card number
  const formatCardNumber = (number: string, type: CardType | null): string => {
    const cleanNumber = number.replace(/\D/g, '');
    
    if (!type) {
      // Default formatting for unknown cards
      return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    if (type.name === 'American Express') {
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else if (type.name === 'Diners Club') {
      return cleanNumber.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
    } else {
      return cleanNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
    }
  };

  // Validate card number
  const validateCard = (number: string, type: CardType | null): boolean => {
    const cleanNumber = number.replace(/\D/g, '');
    
    if (!type) return false;
    
    // Check length based on card type
    const expectedLength = type.name === 'American Express' ? 15 : 16;
    if (cleanNumber.length !== expectedLength) return false;
    
    // Luhn algorithm check
    return luhnCheck(cleanNumber);
  };

  // Handle card number change
  const handleCardChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '');
    const detectedType = detectCardType(cleanText);
    const formatted = formatCardNumber(cleanText, detectedType);
    const valid = validateCard(cleanText, detectedType);

    setCardNumber(formatted);
    setCardType(detectedType);
    setIsValid(valid);

    // Trigger animations
    if (detectedType) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Shake animation for invalid cards
    if (cleanText.length > 10 && !valid) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    // Update color animation
    Animated.timing(colorAnim, {
      toValue: valid ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Call callbacks
    onCardChange?.({
      number: cleanText,
      type: detectedType?.name || null,
      isValid: valid,
      formattedNumber: formatted,
    });

    onValidationChange?.(valid);
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(scaleAnim, {
      toValue: 1.02,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShowValidation(true);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Get border color based on validation state
  const getBorderColor = () => {
    if (showValidation && !isValid && cardNumber.length > 0) {
      return colors.error;
    }
    if (isValid) {
      return colors.success;
    }
    if (isFocused) {
      return cardType?.color || colors.primary;
    }
    return colors.border.light;
  };

  // Get background color based on card type
  const getBackgroundColor = () => {
    if (cardType && isFocused) {
      return `${cardType.color}10`;
    }
    return colors.background.light;
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
            transform: [
              { scale: scaleAnim },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                color: cardType?.color || colors.text.primary,
                fontFamily: cardType ? 'monospace' : fonts.family.regular,
              },
            ]}
            value={cardNumber}
            onChangeText={handleCardChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.text.secondary}
            keyboardType="numeric"
            maxLength={19} // Max length for formatted card
            editable={!disabled}
            selectTextOnFocus
          />
          
          {/* Card type indicator */}
          {cardType && (
            <Animated.View
              style={[
                styles.cardTypeIndicator,
                {
                  backgroundColor: cardType.color,
                  opacity: colorAnim,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={cardType.icon as any}
                size={20}
                color={colors.white}
              />
            </Animated.View>
          )}
        </View>

        {/* Card type badge */}
        {cardType && isFocused && (
          <Animated.View
            style={[
              styles.cardTypeBadge,
              {
                backgroundColor: cardType.color,
                opacity: colorAnim,
              },
            ]}
          >
            <Text style={styles.cardTypeText}>{cardType.name}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Validation feedback */}
      {showValidation && cardNumber.length > 0 && (
        <Animated.View style={styles.validationContainer}>
          {isValid ? (
            <View style={styles.validationSuccess}>
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color={colors.success}
              />
              <Text style={styles.validationText}>Valid {cardType?.name} card</Text>
            </View>
          ) : (
            <View style={styles.validationError}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={colors.error}
              />
              <Text style={styles.validationText}>
                {cardType ? 'Invalid card number' : 'Unsupported card type'}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Card type preview */}
      {cardType && isFocused && (
        <Animated.View
          style={[
            styles.cardPreview,
            {
              borderColor: cardType.color,
              opacity: colorAnim,
            },
          ]}
        >
          <View style={styles.cardPreviewHeader}>
            <Text style={[styles.cardPreviewText, { color: cardType.color }]}>
              {cardType.name}
            </Text>
            <MaterialCommunityIcons
              name={cardType.icon as any}
              size={24}
              color={cardType.color}
            />
          </View>
          <Text style={styles.cardPreviewNumber}>
            {cardNumber || '•••• •••• •••• ••••'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: colors.background.light,
    overflow: 'hidden',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  cardTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cardTypeBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardTypeText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: '600',
  },
  validationContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  validationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationText: {
    marginLeft: spacing.xs,
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  cardPreview: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background.light,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardPreviewText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
  cardPreviewNumber: {
    fontSize: fonts.size.lg,
    fontFamily: 'monospace',
    color: colors.text.primary,
    letterSpacing: 2,
  },
});

export default SmartCardInput;

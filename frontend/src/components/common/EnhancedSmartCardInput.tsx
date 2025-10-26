import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VirtualCard from './VirtualCard';
import { validateCardNumber, formatExpiryDate, detectCardType } from '../../utils/cardValidation';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface EnhancedSmartCardInputProps {
  onCardChange?: (cardData: CardData) => void;
  onValidationChange?: (isValid: boolean) => void;
  showVirtualCard?: boolean;
  style?: any;
  disabled?: boolean;
}

interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
  type: string | null;
  isValid: boolean;
}

const EnhancedSmartCardInput: React.FC<EnhancedSmartCardInputProps> = ({
  onCardChange,
  onValidationChange,
  showVirtualCard = true,
  style,
  disabled = false,
}) => {
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    expiry: '',
    cvv: '',
    cardholderName: '',
    type: null,
    isValid: false,
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCardNumberChange = (text: string) => {
    const cleanNumber = text.replace(/\D/g, '');
    const validation = validateCardNumber(cleanNumber);
    const detectedType = detectCardType(cleanNumber);

    setCardData(prev => ({
      ...prev,
      number: cleanNumber,
      type: detectedType?.name || null,
      isValid: validation.isValid,
    }));

    onCardChange?.({
      number: cleanNumber,
      expiry: cardData.expiry,
      cvv: cardData.cvv,
      cardholderName: cardData.cardholderName,
      type: detectedType?.name || null,
      isValid: validation.isValid,
    });

    onValidationChange?.(validation.isValid);
  };

  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiryDate(text);
    setCardData(prev => ({
      ...prev,
      expiry: formatted,
    }));

    onCardChange?.({
      ...cardData,
      expiry: formatted,
    });
  };

  const handleCVVChange = (text: string) => {
    const cleanCVV = text.replace(/\D/g, '');
    setCardData(prev => ({
      ...prev,
      cvv: cleanCVV,
    }));

    onCardChange?.({
      ...cardData,
      cvv: cleanCVV,
    });
  };

  const handleCardholderNameChange = (text: string) => {
    setCardData(prev => ({
      ...prev,
      cardholderName: text,
    }));

    onCardChange?.({
      ...cardData,
      cardholderName: text,
    });
  };

  const toggleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getFieldBorderColor = (field: string): string => {
    if (focusedField === field) {
      return cardData.isValid ? colors.success : colors.primary;
    }
    return colors.border.light;
  };

  const getFieldError = (field: string): string | undefined => {
    if (field === 'number' && cardData.number.length > 0 && !cardData.isValid) {
      return 'Invalid card number';
    }
    if (field === 'expiry' && cardData.expiry.length === 5) {
      const [month, year] = cardData.expiry.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        return 'Invalid month';
      }
      if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        return 'Card expired';
      }
    }
    return undefined;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Virtual Card Preview */}
      {showVirtualCard && (
        <VirtualCard
          cardNumber={cardData.number}
          expiryDate={cardData.expiry}
          cardholderName={cardData.cardholderName}
          cvv={cardData.cvv}
          isFlipped={isFlipped}
          onFlip={toggleCardFlip}
        />
      )}

      {/* Card Input Form */}
      <View style={styles.formContainer}>
        {/* Card Number */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Card Number *</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: getFieldBorderColor('number'),
              },
            ]}
            value={cardData.number}
            onChangeText={handleCardNumberChange}
            onFocus={() => setFocusedField('number')}
            onBlur={() => setFocusedField(null)}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            maxLength={19}
            editable={!disabled}
          />
          {getFieldError('number') && (
            <Text style={styles.errorText}>{getFieldError('number')}</Text>
          )}
        </View>

        {/* Expiry and CVV */}
        <View style={styles.rowContainer}>
          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={styles.fieldLabel}>Expiry Date *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: getFieldBorderColor('expiry'),
                },
              ]}
              value={cardData.expiry}
              onChangeText={handleExpiryChange}
              onFocus={() => setFocusedField('expiry')}
              onBlur={() => setFocusedField(null)}
              placeholder="MM/YY"
              keyboardType="numeric"
              maxLength={5}
              editable={!disabled}
            />
            {getFieldError('expiry') && (
              <Text style={styles.errorText}>{getFieldError('expiry')}</Text>
            )}
          </View>

          <View style={[styles.fieldContainer, styles.halfWidth]}>
            <Text style={styles.fieldLabel}>CVV *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: getFieldBorderColor('cvv'),
                },
              ]}
              value={cardData.cvv}
              onChangeText={handleCVVChange}
              onFocus={() => {
                setFocusedField('cvv');
                setIsFlipped(true);
              }}
              onBlur={() => {
                setFocusedField(null);
                setIsFlipped(false);
              }}
              placeholder="123"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              editable={!disabled}
            />
            {getFieldError('cvv') && (
              <Text style={styles.errorText}>{getFieldError('cvv')}</Text>
            )}
          </View>
        </View>

        {/* Cardholder Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Cardholder Name *</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: getFieldBorderColor('cardholderName'),
              },
            ]}
            value={cardData.cardholderName}
            onChangeText={handleCardholderNameChange}
            onFocus={() => setFocusedField('cardholderName')}
            onBlur={() => setFocusedField(null)}
            placeholder="Name on card"
            autoCapitalize="words"
            editable={!disabled}
          />
          {getFieldError('cardholderName') && (
            <Text style={styles.errorText}>{getFieldError('cardholderName')}</Text>
          )}
        </View>

        {/* Card Type Indicator */}
        {cardData.type && (
          <View style={styles.cardTypeIndicator}>
            <MaterialCommunityIcons
              name="credit-card"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.cardTypeText}>
              {cardData.type} {cardData.isValid ? '✓' : '✗'}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.size.md,
    fontFamily: fonts.family.regular,
    color: colors.text.primary,
    backgroundColor: colors.background.light,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.size.xs,
    marginTop: spacing.xs,
  },
  cardTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTypeText: {
    marginLeft: spacing.xs,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default EnhancedSmartCardInput;



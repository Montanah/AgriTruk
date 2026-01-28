import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SmartCardInput from './SmartCardInput';
import { validateFullCard, formatExpiryDate, CardData, FullCardValidationResult } from '../../utils/cardValidation';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface SmartPaymentFormProps {
  onSubmit?: (cardData: CardData) => void;
  onValidationChange?: (isValid: boolean) => void;
  submitButtonText?: string;
  showCardPreview?: boolean;
  disabled?: boolean;
  style?: any;
}

const SmartPaymentForm: React.FC<SmartPaymentFormProps> = ({
  onSubmit,
  onValidationChange,
  submitButtonText = 'Process Payment',
  showCardPreview = true,
  disabled = false,
  style,
}) => {
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    expiry: '',
    cvv: '',
    cardholderName: '',
  });

  const [validation, setValidation] = useState<FullCardValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = React.useRef(new Animated.Value(1)).current; // Start visible
  const scaleAnim = React.useRef(new Animated.Value(1)).current; // Start at full scale

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Validate card data whenever it changes
  useEffect(() => {
    // Only validate if user has started entering data
    if (cardData.number || cardData.expiry || cardData.cvv || cardData.cardholderName) {
      const validationResult = validateFullCard(cardData);
      setValidation(validationResult);
      
      // Only report as valid if all fields are complete and valid
      // Don't show errors while user is still typing
      const isComplete = cardData.number.length >= 13 && 
                         cardData.expiry.length >= 4 && 
                         cardData.cvv.length >= 3 && 
                         cardData.cardholderName.length >= 2;
      
      onValidationChange?.(validationResult.overall.isValid && isComplete);
    } else {
      // Reset validation when form is empty
      onValidationChange?.(false);
    }
  }, [cardData, onValidationChange]);

  // Handle card number change
  const handleCardNumberChange = (cardInfo: any) => {
    setCardData(prev => ({
      ...prev,
      number: cardInfo.number,
    }));
  };

  // Handle expiry date change
  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiryDate(text);
    setCardData(prev => ({
      ...prev,
      expiry: formatted,
    }));
  };

  // Handle CVV change
  const handleCVVChange = (text: string) => {
    const cleanCVV = text.replace(/\D/g, '');
    setCardData(prev => ({
      ...prev,
      cvv: cleanCVV,
    }));
  };

  // Handle cardholder name change
  const handleCardholderNameChange = (text: string) => {
    setCardData(prev => ({
      ...prev,
      cardholderName: text,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validation?.overall.isValid) {
      Alert.alert('Invalid Card', 'Please fix the errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit?.(cardData);
    } catch (error) {
      Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get field error message - only show when field is complete or user has blurred
  const getFieldError = (field: keyof CardData): string | undefined => {
    if (!validation) return undefined;
    
    // Don't show errors while user is still typing
    const isFieldComplete = (() => {
      switch (field) {
        case 'number':
          return cardData.number.replace(/\D/g, '').length >= 13;
        case 'expiry':
          return cardData.expiry.length >= 5; // MM/YY format
        case 'cvv':
          return cardData.cvv.length >= 3;
        case 'cardholderName':
          return cardData.cardholderName.length >= 2;
        default:
          return false;
      }
    })();
    
    // Only show error if field is complete or user has blurred the field
    if (!isFieldComplete && focusedField === field) {
      return undefined;
    }
    
    switch (field) {
      case 'number':
        return validation.number.errorMessage;
      case 'expiry':
        return validation.expiry.errorMessage;
      case 'cvv':
        return validation.cvv.errorMessage;
      case 'cardholderName':
        return validation.cardholderName.errorMessage;
      default:
        return undefined;
    }
  };

  // Get field border color
  const getFieldBorderColor = (field: keyof CardData): string => {
    if (!validation) return colors.border.light;
    
    const isFocused = focusedField === field;
    const hasError = getFieldError(field);
    
    if (hasError) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border.light;
  };

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.form,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Card Preview - Show above card number input */}
        {showCardPreview && validation?.number.cardType && (
          <View style={styles.cardPreview}>
            <View style={styles.cardPreviewHeader}>
              <Text style={styles.cardPreviewTitle}>Card Preview</Text>
              <MaterialCommunityIcons
                name={validation.number.icon as any}
                size={24}
                color={validation.number.color}
              />
            </View>
            <View style={styles.cardPreviewContent}>
              <Text style={[styles.cardPreviewType, { color: validation.number.color }]}>
                {validation.number.cardType}
              </Text>
              <Text style={styles.cardPreviewNumber}>
                {validation.number.formattedNumber || '•••• •••• •••• ••••'}
              </Text>
              <View style={styles.cardPreviewDetails}>
                <Text style={styles.cardPreviewExpiry}>
                  {cardData.expiry || 'MM/YY'}
                </Text>
                <Text style={styles.cardPreviewName}>
                  {cardData.cardholderName || 'CARDHOLDER NAME'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Card Number Input */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Card Number *</Text>
          <SmartCardInput
            onCardChange={handleCardNumberChange}
            onValidationChange={(isValid) => {
              // Handle card validation feedback
            }}
            placeholder="1234 5678 9012 3456"
            disabled={disabled}
          />
          {getFieldError('number') && (
            <Text style={styles.errorText}>{getFieldError('number')}</Text>
          )}
        </View>

        {/* Expiry Date and CVV */}
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
              onFocus={() => setFocusedField('cvv')}
              onBlur={() => setFocusedField(null)}
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

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: validation?.overall.isValid ? colors.primary : colors.border.light,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={!validation?.overall.isValid || disabled || isSubmitting}
        >
          <MaterialCommunityIcons
            name={isSubmitting ? 'loading' : 'credit-card'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Processing...' : submitButtonText}
          </Text>
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <MaterialCommunityIcons
            name="shield-check"
            size={16}
            color={colors.success}
          />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  form: {
    padding: spacing.md,
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
    borderRadius: 8,
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
  cardPreview: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background.light,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardPreviewTitle: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cardPreviewContent: {
    // Add any specific styling for card preview content
  },
  cardPreviewType: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardPreviewNumber: {
    fontSize: fonts.size.lg,
    fontFamily: 'monospace',
    color: colors.text.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  cardPreviewDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewExpiry: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  cardPreviewName: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  securityText: {
    color: colors.text.secondary,
    fontSize: fonts.size.sm,
    marginLeft: spacing.xs,
  },
});

export default SmartPaymentForm;


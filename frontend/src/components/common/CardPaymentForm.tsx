import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface CardPaymentFormProps {
    onCardValid: (cardData: CardData) => void;
    onCardInvalid: () => void;
}

interface CardData {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
    cardType: CardType;
    isValid: boolean;
}

type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ onCardValid, onCardInvalid }) => {
    const [cardData, setCardData] = useState<CardData>({
        number: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
        cardType: 'unknown',
        isValid: false,
    });

    const [errors, setErrors] = useState<Partial<CardData>>({});

    // Detect card type from number
    const detectCardType = (number: string): CardType => {
        const cleanNumber = number.replace(/\s/g, '');

        if (cleanNumber.startsWith('4')) return 'visa';
        if (cleanNumber.startsWith('5')) return 'mastercard';
        if (cleanNumber.startsWith('3')) return 'amex';
        if (cleanNumber.startsWith('6')) return 'discover';

        return 'unknown';
    };

    // Format card number with real-time 4-digit grouping
    const formatCardNumber = (text: string): string => {
        const clean = text.replace(/\s/g, '');
        const groups = [];

        for (let i = 0; i < clean.length; i += 4) {
            groups.push(clean.slice(i, i + 4));
        }

        return groups.join(' ');
    };

    // Smart expiry date formatting
    const formatExpiryDate = (text: string): string => {
        const clean = text.replace(/\D/g, '');
        if (clean.length >= 2) {
            return clean.slice(0, 2) + '/' + clean.slice(2, 4);
        }
        return clean;
    };

    // Validate card
    const validateCard = (): boolean => {
        const newErrors: Partial<CardData> = {};

        if (cardData.number.replace(/\s/g, '').length < 13) {
            newErrors.number = 'Card number is too short';
        }

        if (!cardData.expiryMonth || !cardData.expiryYear) {
            newErrors.expiryMonth = 'Please enter expiry date';
        }

        if (cardData.cvv.length < 3) {
            newErrors.cvv = 'CVV must be at least 3 digits';
        }

        if (cardData.cardholderName.trim().length < 2) {
            newErrors.cardholderName = 'Please enter cardholder name';
        }

        setErrors(newErrors);

        const isValid = Object.keys(newErrors).length === 0;
        setCardData(prev => ({ ...prev, isValid }));

        return isValid;
    };

    // Handle card number input with 4-digit grouping
    const handleCardNumberChange = (text: string) => {
        const formatted = formatCardNumber(text);
        const cardType = detectCardType(text);

        setCardData(prev => ({
            ...prev,
            number: formatted,
            cardType,
        }));

        if (errors.number) {
            setErrors(prev => ({ ...prev, number: undefined }));
        }
    };

    // Handle expiry date input with auto-formatting
    const handleExpiryDateChange = (text: string) => {
        const formatted = formatExpiryDate(text);
        const month = formatted.split('/')[0] || '';
        const year = formatted.split('/')[1] || '';

        setCardData(prev => ({
            ...prev,
            expiryMonth: month,
            expiryYear: year,
        }));

        if (errors.expiryMonth) {
            setErrors(prev => ({ ...prev, expiryMonth: undefined }));
        }
    };

    // Handle CVV input
    const handleCVVChange = (text: string) => {
        const cvv = text.replace(/\D/g, '').slice(0, 4);
        setCardData(prev => ({ ...prev, cvv }));

        if (errors.cvv) {
            setErrors(prev => ({ ...prev, cvv: undefined }));
        }
    };

    // Handle cardholder name input
    const handleCardholderNameChange = (text: string) => {
        setCardData(prev => ({ ...prev, cardholderName: text }));

        if (errors.cardholderName) {
            setErrors(prev => ({ ...prev, cardholderName: undefined }));
        }
    };

    // Validate on every change
    useEffect(() => {
        if (cardData.number && cardData.expiryMonth && cardData.expiryYear && cardData.cvv && cardData.cardholderName) {
            const isValid = validateCard();
            if (isValid) {
                onCardValid(cardData);
            } else {
                onCardInvalid();
            }
        }
    }, [cardData.number, cardData.expiryMonth, cardData.expiryYear, cardData.cvv, cardData.cardholderName]);

    // Get card icon based on type
    const getCardIcon = (): any => {
        switch (cardData.cardType) {
            case 'visa':
                return 'credit-card';
            case 'mastercard':
                return 'credit-card-outline';
            case 'amex':
                return 'credit-card-wireless';
            case 'discover':
                return 'credit-card-settings';
            default:
                return 'credit-card-off';
        }
    };

    // Get card color based on type
    const getCardColor = (): string => {
        switch (cardData.cardType) {
            case 'visa':
                return '#1A1F71';
            case 'mastercard':
                return '#EB001B';
            case 'amex':
                return '#006FCF';
            case 'discover':
                return '#FF6000';
            default:
                return colors.text.light;
        }
    };

    return (
        <View style={styles.container}>
            {/* Card Preview */}
            <View style={[styles.cardPreview, { borderColor: getCardColor() }]}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons
                        name={getCardIcon()}
                        size={32}
                        color={getCardColor()}
                    />
                    <Text style={[styles.cardTypeText, { color: getCardColor() }]}>
                        {cardData.cardType !== 'unknown' ? cardData.cardType.toUpperCase() : 'CARD'}
                    </Text>
                </View>

                <View style={styles.cardNumberContainer}>
                    <Text style={styles.cardNumberText}>
                        {cardData.number || '•••• •••• •••• ••••'}
                    </Text>
                </View>

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.cardLabel}>CARDHOLDER</Text>
                        <Text style={styles.cardValue}>
                            {cardData.cardholderName || 'YOUR NAME'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>EXPIRES</Text>
                        <Text style={styles.cardValue}>
                            {cardData.expiryMonth && cardData.expiryYear
                                ? `${cardData.expiryMonth}/${cardData.expiryYear}`
                                : 'MM/YY'
                            }
                        </Text>
                    </View>
                </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
                {/* Card Number with 4-digit grouping */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Card Number <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={[styles.inputContainer, errors.number && styles.inputContainerError]}>
                        <MaterialCommunityIcons
                            name="credit-card-outline"
                            size={20}
                            color={colors.text.light}
                        />
                        <TextInput
                            style={styles.textInput}
                            value={cardData.number}
                            onChangeText={handleCardNumberChange}
                            placeholder="1234 5678 9012 3456"
                            keyboardType="numeric"
                            maxLength={19}
                        />
                        {cardData.cardType !== 'unknown' && (
                            <MaterialCommunityIcons
                                name={getCardIcon()}
                                size={20}
                                color={getCardColor()}
                            />
                        )}
                    </View>
                    {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}
                </View>

                {/* Cardholder Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                        Cardholder Name <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={[styles.inputContainer, errors.cardholderName && styles.inputContainerError]}>
                        <MaterialCommunityIcons
                            name="account-outline"
                            size={20}
                            color={colors.text.light}
                        />
                        <TextInput
                            style={styles.textInput}
                            value={cardData.cardholderName}
                            onChangeText={handleCardholderNameChange}
                            placeholder="JOHN DOE"
                            autoCapitalize="characters"
                            maxLength={50}
                        />
                    </View>
                    {errors.cardholderName && <Text style={styles.errorText}>{errors.cardholderName}</Text>}
                </View>

                {/* Expiry Date and CVV Row */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.inputLabel}>
                            Expiry Date <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={[styles.inputContainer, errors.expiryMonth && styles.inputContainerError]}>
                            <MaterialCommunityIcons
                                name="calendar-outline"
                                size={20}
                                color={colors.text.light}
                            />
                            <TextInput
                                style={styles.textInput}
                                value={`${cardData.expiryMonth}${cardData.expiryYear ? '/' + cardData.expiryYear : ''}`}
                                onChangeText={handleExpiryDateChange}
                                placeholder="MM/YY"
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                        {errors.expiryMonth && <Text style={styles.errorText}>{errors.expiryMonth}</Text>}
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.inputLabel}>
                            CVV <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={[styles.inputContainer, errors.cvv && styles.inputContainerError]}>
                            <MaterialCommunityIcons
                                name="shield"
                                size={20}
                                color={colors.text.light}
                            />
                            <TextInput
                                style={styles.textInput}
                                value={cardData.cvv}
                                onChangeText={handleCVVChange}
                                placeholder="123"
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                        {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                    </View>
                </View>

                {/* Validation Status */}
                <View style={styles.validationStatus}>
                    <MaterialCommunityIcons
                        name={cardData.isValid ? 'check-circle' : 'alert-circle'}
                        size={20}
                        color={cardData.isValid ? colors.success : colors.warning}
                    />
                    <Text style={[styles.validationText, { color: cardData.isValid ? colors.success : colors.warning }]}>
                        {cardData.isValid ? 'Card is valid and ready for payment' : 'Please complete all fields correctly'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginVertical: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardPreview: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 2,
        minHeight: 220,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    cardTypeText: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cardNumberContainer: {
        marginBottom: spacing.xl,
    },
    cardNumberText: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        letterSpacing: 2,
        color: colors.text.primary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardLabel: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        fontWeight: '600',
    },
    cardValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    formContainer: {
        gap: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    inputLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    required: {
        color: colors.error,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputContainerError: {
        borderColor: colors.error,
        shadowColor: colors.error,
        shadowOpacity: 0.2,
    },
    textInput: {
        flex: 1,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        paddingVertical: spacing.md,
        marginLeft: spacing.sm,
    },
    errorText: {
        fontSize: fonts.size.xs,
        color: colors.error,
        marginTop: spacing.xs,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfWidth: {
        flex: 1,
    },
    validationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    validationText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        flex: 1,
    },
});

export default CardPaymentForm;


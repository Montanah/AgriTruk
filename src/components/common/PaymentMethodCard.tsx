import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface PaymentMethodCardProps {
    method: 'mpesa' | 'stripe';
    selected: boolean;
    onSelect: () => void;
    disabled?: boolean;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
    method,
    selected,
    onSelect,
    disabled = false
}) => {
    const getMethodDetails = () => {
        switch (method) {
            case 'mpesa':
                return {
                    title: 'M-PESA',
                    subtitle: 'Mobile Money',
                    icon: <FontAwesome5 name="mobile-alt" size={24} color={colors.primary} />,
                    color: colors.primary
                };
            case 'stripe':
                return {
                    title: 'Card Payment',
                    subtitle: 'Credit/Debit Cards',
                    icon: <MaterialCommunityIcons name="credit-card" size={24} color={colors.secondary} />,
                    color: colors.secondary
                };
            default:
                return {
                    title: '',
                    subtitle: '',
                    icon: null,
                    color: colors.text.secondary
                };
        }
    };

    const details = getMethodDetails();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                selected && { borderColor: details.color, backgroundColor: details.color + '10' },
                disabled && styles.disabled
            ]}
            onPress={onSelect}
            disabled={disabled}
        >
            <View style={styles.iconContainer}>
                {details.icon}
            </View>
            <View style={styles.content}>
                <Text style={[styles.title, selected && { color: details.color }]}>
                    {details.title}
                </Text>
                <Text style={styles.subtitle}>{details.subtitle}</Text>
            </View>
            <View style={styles.checkContainer}>
                {selected && (
                    <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color={details.color}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.text.light,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    disabled: {
        opacity: 0.5,
    },
    iconContainer: {
        marginRight: spacing.md,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    checkContainer: {
        width: 24,
        alignItems: 'center',
    },
});

export default PaymentMethodCard;




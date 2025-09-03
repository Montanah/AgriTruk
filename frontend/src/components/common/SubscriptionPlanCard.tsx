import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    period: 'monthly' | 'yearly';
    features: string[];
    popular?: boolean;
    discount?: number;
}

interface SubscriptionPlanCardProps {
    plan: SubscriptionPlan;
    selected: boolean;
    onSelect: () => void;
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
    plan,
    selected,
    onSelect
}) => {
    const originalPrice = plan.discount ? plan.price / (1 - plan.discount / 100) : plan.price;
    const periodText = plan.period === 'monthly' ? 'month' : 'year';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                selected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                plan.popular && styles.popular
            ]}
            onPress={onSelect}
        >
            {plan.popular && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                </View>
            )}

            <View style={styles.header}>
                <Text style={[styles.name, selected && { color: colors.primary }]}>
                    {plan.name}
                </Text>
                <View style={styles.priceContainer}>
                    {plan.discount && (
                        <Text style={styles.originalPrice}>
                            KES {originalPrice.toLocaleString()}
                        </Text>
                    )}
                    <Text style={[styles.price, selected && { color: colors.primary }]}>
                        KES {plan.price.toLocaleString()}
                    </Text>
                    <Text style={styles.period}>/{periodText}</Text>
                </View>
                {plan.discount && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{plan.discount}% OFF</Text>
                    </View>
                )}
            </View>

            <View style={styles.features}>
                {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                        <MaterialCommunityIcons
                            name="check-circle"
                            size={16}
                            color={selected ? colors.primary : colors.success}
                        />
                        <Text style={styles.featureText}>{feature}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.checkContainer}>
                {selected && (
                    <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color={colors.primary}
                    />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.text.light,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        position: 'relative',
    },
    popular: {
        borderColor: colors.primary,
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        left: '50%',
        marginLeft: -50,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
    },
    popularText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    name: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
    },
    price: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    originalPrice: {
        fontSize: fonts.size.md,
        color: colors.text.light,
        textDecorationLine: 'line-through',
        marginRight: spacing.sm,
    },
    period: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    discountBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        marginTop: spacing.sm,
    },
    discountText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
    },
    features: {
        marginBottom: spacing.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    featureText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    checkContainer: {
        alignItems: 'center',
    },
});

export default SubscriptionPlanCard;




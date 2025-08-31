import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubscriptionPlanCard, { SubscriptionPlan } from '../components/common/SubscriptionPlanCard';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { brokerPlans, brokerPlansYearly, transporterPlans, transporterPlansYearly } from '../constants/subscriptionPlans';

interface SubscriptionScreenProps {
    route: {
        params: {
            userType: 'transporter' | 'broker';
        };
    };
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ route }) => {
    const navigation = useNavigation();
    const { userType } = route.params;

    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(false);

    const plans = userType === 'transporter'
        ? (billingPeriod === 'monthly' ? transporterPlans : transporterPlansYearly)
        : (billingPeriod === 'monthly' ? brokerPlans : brokerPlansYearly);

    const handlePlanSelect = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan);
    };

    const handleSubscribe = () => {
        if (!selectedPlan) {
            Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
            return;
        }

        navigation.navigate('PaymentScreen', {
            plan: selectedPlan,
            userType,
            billingPeriod
        });
    };

    const getTotalSavings = () => {
        if (billingPeriod === 'yearly' && selectedPlan?.discount) {
            const originalPrice = selectedPlan.price / (1 - selectedPlan.discount / 100);
            const yearlyOriginal = originalPrice * 12;
            const yearlyDiscounted = selectedPlan.price;
            return yearlyOriginal - yearlyDiscounted;
        }
        return 0;
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {userType === 'transporter' ? 'Transporter' : 'Broker'} Subscription
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Billing Period Toggle */}
                <View style={styles.billingToggleContainer}>
                    <Text style={styles.sectionTitle}>Choose Billing Period</Text>
                    <View style={styles.billingToggle}>
                        <TouchableOpacity
                            style={[
                                styles.billingOption,
                                billingPeriod === 'monthly' && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setBillingPeriod('monthly')}
                        >
                            <Text style={[
                                styles.billingOptionText,
                                billingPeriod === 'monthly' && { color: colors.white, fontWeight: 'bold' }
                            ]}>
                                Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.billingOption,
                                billingPeriod === 'yearly' && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setBillingPeriod('yearly')}
                        >
                            <Text style={[
                                styles.billingOptionText,
                                billingPeriod === 'yearly' && { color: colors.white, fontWeight: 'bold' }
                            ]}>
                                Yearly
                            </Text>
                            {billingPeriod === 'yearly' && (
                                <View style={styles.savingsBadge}>
                                    <Text style={styles.savingsText}>Save 17%</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Plans */}
                <View style={styles.plansContainer}>
                    <Text style={styles.sectionTitle}>Select Your Plan</Text>
                    {plans.map((plan) => (
                        <SubscriptionPlanCard
                            key={plan.id}
                            plan={plan}
                            selected={selectedPlan?.id === plan.id}
                            onSelect={() => handlePlanSelect(plan)}
                        />
                    ))}
                </View>

                {/* Selected Plan Summary */}
                {selectedPlan && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.sectionTitle}>Plan Summary</Text>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Selected Plan:</Text>
                                <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Billing Period:</Text>
                                <Text style={styles.summaryValue}>
                                    {billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Price:</Text>
                                <Text style={styles.summaryValue}>
                                    KES {selectedPlan.price.toLocaleString()}
                                    {billingPeriod === 'monthly' ? '/month' : '/year'}
                                </Text>
                            </View>
                            {getTotalSavings() > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Total Savings:</Text>
                                    <Text style={[styles.summaryValue, { color: colors.success }]}>
                                        KES {getTotalSavings().toLocaleString()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Subscribe Button */}
                <TouchableOpacity
                    style={[
                        styles.subscribeButton,
                        !selectedPlan && styles.subscribeButtonDisabled
                    ]}
                    onPress={handleSubscribe}
                    disabled={!selectedPlan || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="credit-card" size={20} color={colors.white} />
                            <Text style={styles.subscribeButtonText}>
                                Continue to Payment
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Features Comparison */}
                <View style={styles.featuresContainer}>
                    <Text style={styles.sectionTitle}>What's Included</Text>
                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Unlimited access to all features</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Priority customer support</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Real-time tracking & analytics</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Cancel anytime</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    headerSpacer: {
        width: 44,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    billingToggleContainer: {
        marginVertical: spacing.lg,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    billingToggle: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    billingOption: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        position: 'relative',
    },
    billingOptionText: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    savingsBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
    },
    savingsText: {
        color: colors.white,
        fontSize: fonts.size.xs,
        fontWeight: 'bold',
    },
    plansContainer: {
        marginBottom: spacing.lg,
    },
    summaryContainer: {
        marginBottom: spacing.lg,
    },
    summaryCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    summaryValue: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    subscribeButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
    },
    subscribeButtonDisabled: {
        backgroundColor: colors.text.light,
    },
    subscribeButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    featuresContainer: {
        marginBottom: spacing.lg,
    },
    featuresList: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    featureText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
});

export default SubscriptionScreen;




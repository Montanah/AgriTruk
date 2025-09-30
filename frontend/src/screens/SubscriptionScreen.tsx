import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { transporterPlans, brokerPlans } from '../constants/subscriptionPlans';

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

    // Use proper subscription plans based on user type
    const plans = userType === 'broker' ? brokerPlans : transporterPlans;

    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePlanSelect = (planKey: string) => {
        setSelectedPlan(planKey);
    };

    const handleSubscribe = () => {
        if (!selectedPlan) {
            Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
            return;
        }

        const selectedPlanData = plans.find(p => p.id === selectedPlan);
        if (!selectedPlanData) {
            Alert.alert('Error', 'Selected plan not found.');
            return;
        }

        // Create a plan object that matches the expected format
        const planData = {
            id: selectedPlanData.id,
            name: selectedPlanData.name,
            price: selectedPlanData.price,
            period: selectedPlanData.period,
            features: selectedPlanData.features
        };

        navigation.navigate('PaymentScreen', {
            plan: planData,
            userType,
            billingPeriod: selectedPlanData.period
        });
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

                {/* Plans */}
                <View style={styles.plansContainer}>
                    <Text style={styles.sectionTitle}>Choose Your Subscription Plan</Text>
                    <Text style={styles.sectionSubtitle}>
                        Flexible plans for every business. Select the best fit for you.
                    </Text>

                    {plans.map((plan) => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    isSelected && styles.planCardSelected,
                                    plan.popular && styles.popularPlan,
                                    { borderColor: isSelected ? colors.secondary : colors.surface, shadowColor: isSelected ? colors.secondary : colors.black },
                                ]}
                                activeOpacity={0.92}
                                onPress={() => handlePlanSelect(plan.id)}
                            >
                                {plan.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularText}>Most Popular</Text>
                                    </View>
                                )}
                                <View style={styles.planHeader}>
                                    <Text style={[styles.planLabel, { color: isSelected ? colors.secondary : colors.primary }]}>{plan.name}</Text>
                                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.secondary} style={{ marginLeft: 6 }} />}
                                </View>
                                <Text style={[styles.planPrice, { color: isSelected ? colors.secondary : colors.text.primary }]}>
                                    KES {plan.price.toLocaleString()}
                                    <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                                        / {plan.period}
                                    </Text>
                                </Text>
                                <View style={styles.featureList}>
                                    {plan.features.map((feature, i) => (
                                        <View key={i} style={styles.featureRow}>
                                            <Ionicons name="checkmark" size={16} color={isSelected ? colors.secondary : colors.primary} style={{ marginRight: 1 }} />
                                            <Text style={[styles.featureText, { color: isSelected ? colors.secondary : colors.text.secondary }]}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Selected Plan Summary */}
                {selectedPlan && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.sectionTitle}>Plan Summary</Text>
                        <View style={styles.summaryCard}>
                            {(() => {
                                const selectedPlanData = plans.find(p => p.id === selectedPlan);
                                if (!selectedPlanData) return null;

                                return (
                                    <>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Selected Plan:</Text>
                                            <Text style={styles.summaryValue}>{selectedPlanData.name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Billing Period:</Text>
                                            <Text style={styles.summaryValue}>
                                                {selectedPlanData.period === 'monthly' ? 'Monthly' : selectedPlanData.period === 'yearly' ? 'Yearly' : selectedPlanData.period}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Price:</Text>
                                            <Text style={styles.summaryValue}>
                                                KES {selectedPlanData.price.toLocaleString()}
                                                / {selectedPlanData.period}
                                            </Text>
                                        </View>
                                        {selectedPlanData.discount && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Savings:</Text>
                                                <Text style={[styles.summaryValue, { color: colors.success }]}>
                                                    {selectedPlanData.discount}% OFF
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
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
    // New styles for plan cards
    planCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: colors.surface,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    planCardSelected: {
        borderColor: colors.secondary,
        shadowColor: colors.secondary,
        shadowOpacity: 0.2,
    },
    popularPlan: {
        borderColor: colors.primary,
        position: 'relative',
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        left: '50%',
        marginLeft: -60,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        zIndex: 1,
    },
    popularText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    planLabel: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    planPrice: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    featureList: {
        marginTop: spacing.sm,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionSubtitle: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 22,
    },
});

export default SubscriptionScreen;




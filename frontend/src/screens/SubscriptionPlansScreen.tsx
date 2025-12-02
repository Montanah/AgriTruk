import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
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
import { INDIVIDUAL_PLANS, BROKER_PLANS, COMPANY_FLEET_PLANS } from '../constants/subscriptionPlans';
import subscriptionService from '../services/subscriptionService';

interface RouteParams {
    userType?: 'transporter' | 'broker';
    isUpgrade?: boolean;
}

const SubscriptionPlansScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<{ params?: RouteParams }>();
    const { userType = 'transporter', isUpgrade = false } = route.params || {};
    
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const plans = userType === 'broker' ? BROKER_PLANS : 
                  userType === 'company' ? COMPANY_FLEET_PLANS : 
                  INDIVIDUAL_PLANS;

    const handleSelectPlan = (planId: string) => {
        setSelectedPlan(planId);
    };

    const handleSubscribe = async () => {
        if (!selectedPlan) {
            Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
            return;
        }

        const selectedPlanData = plans.find(p => p.id === selectedPlan);
        if (!selectedPlanData) {
            Alert.alert('Error', 'Selected plan not found.');
            return;
        }

        setLoading(true);
        try {
            // Navigate to payment screen with the selected plan
            navigation.navigate('PaymentScreen', {
                plan: {
                    id: selectedPlanData.id,
                    name: selectedPlanData.name,
                    price: selectedPlanData.price,
                    period: selectedPlanData.period,
                    features: selectedPlanData.features
                },
                userType,
                billingPeriod: selectedPlanData.period,
                isUpgrade
            });
        } catch (error) {
            console.error('Error selecting plan:', error);
            Alert.alert('Error', 'Failed to process plan selection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = () => {
        Alert.alert(
            'Cancel Subscription',
            'Are you sure you want to cancel your subscription? You will lose access to premium features.',
            [
                { text: 'Keep Subscription', style: 'cancel' },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await subscriptionService.cancelSubscription();
                            if (result.success) {
                                Alert.alert('Success', 'Your subscription has been cancelled.');
                                navigation.goBack();
                            } else {
                                Alert.alert('Error', result.message || 'Failed to cancel subscription.');
                            }
                        } catch (error) {
                            console.error('Error cancelling subscription:', error);
                            Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
                        }
                    }
                }
            ]
        );
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
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                            {isUpgrade ? 'Upgrade Plan' : 'Choose Your Plan'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {userType === 'broker' ? 'Broker' : 'Transporter'} Account
                        </Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.plansContainer}>
                    {plans.map((plan) => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planCard,
                                    isSelected && styles.planCardSelected,
                                    plan.popular && styles.popularPlan
                                ]}
                                onPress={() => handleSelectPlan(plan.id)}
                                activeOpacity={0.8}
                            >
                                {plan.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularText}>Most Popular</Text>
                                    </View>
                                )}
                                
                                <View style={styles.planHeader}>
                                    <Text style={[styles.planName, isSelected && { color: colors.primary }]}>
                                        {plan.name}
                                    </Text>
                                    {isSelected && (
                                        <MaterialCommunityIcons 
                                            name="check-circle" 
                                            size={24} 
                                            color={colors.primary} 
                                        />
                                    )}
                                </View>
                                
                                <View style={styles.priceContainer}>
                                    <Text style={[styles.planPrice, isSelected && { color: colors.primary }]}>
                                        KES {plan.price.toLocaleString()}
                                    </Text>
                                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                                </View>
                                
                                <View style={styles.featuresContainer}>
                                    {plan.features.map((feature, index) => (
                                        <View key={index} style={styles.featureRow}>
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={16}
                                                color={isSelected ? colors.primary : colors.success}
                                            />
                                            <Text style={[styles.featureText, isSelected && { color: colors.primary }]}>
                                                {feature}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.subscribeButton, !selectedPlan && styles.buttonDisabled]}
                        onPress={handleSubscribe}
                        disabled={!selectedPlan || loading}
                    >
                        <MaterialCommunityIcons 
                            name={isUpgrade ? "arrow-up" : "check"} 
                            size={20} 
                            color={colors.white} 
                        />
                        <Text style={styles.subscribeButtonText}>
                            {loading ? 'Processing...' : isUpgrade ? 'Upgrade Plan' : 'Subscribe Now'}
                        </Text>
                    </TouchableOpacity>

                    {isUpgrade && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancelSubscription}
                        >
                            <MaterialCommunityIcons name="close-circle" size={20} color={colors.error} />
                            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                        </TouchableOpacity>
                    )}
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
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: spacing.sm,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: fonts.size.sm,
        color: colors.white,
        opacity: 0.8,
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
        padding: spacing.lg,
    },
    plansContainer: {
        marginBottom: spacing.xl,
    },
    planCard: {
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
    planCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        elevation: 8,
    },
    popularPlan: {
        borderColor: colors.primary,
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
    planName: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.lg,
    },
    planPrice: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    planPeriod: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    featuresContainer: {
        marginBottom: spacing.sm,
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
    actionButtons: {
        gap: spacing.md,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        gap: spacing.sm,
    },
    subscribeButton: {
        backgroundColor: colors.primary,
    },
    subscribeButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.error,
    },
    cancelButtonText: {
        color: colors.error,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        backgroundColor: colors.text.light,
        opacity: 0.6,
    },
});

export default SubscriptionPlansScreen;

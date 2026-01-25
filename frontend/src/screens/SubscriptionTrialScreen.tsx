import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../components/common/FormKeyboardWrapper';
import SmartPaymentForm from '../components/common/SmartPaymentForm';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import subscriptionService from '../services/subscriptionService';
import { handleAuthBackNavigation } from '../utils/navigationUtils';
import { NotificationHelper } from '../services/notificationHelper';
import { CardData } from '../utils/cardValidation';

interface SubscriptionTrialScreenProps {
    route: {
        params: {
            userType: 'individual' | 'broker' | 'company';
            transporterType?: 'individual' | 'company';
            subscriptionStatus?: {
                daysRemaining: number;
                currentPlan?: any;
                isTrialActive: boolean;
                subscriptionStatus?: string;
                isExpired?: boolean;
                needsRenewal?: boolean;
            };
            isRenewal?: boolean; // Flag: true = purchasing paid plan after expiry, false = trial activation
        };
    };
}

type NavigationProp = {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
};

const SubscriptionTrialScreen: React.FC<SubscriptionTrialScreenProps> = ({ route }) => {
    const navigation = useNavigation<NavigationProp>();
    const { userType, transporterType, subscriptionStatus, isRenewal } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'stripe' | null>(null);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [activatingTrial, setActivatingTrial] = useState(false);
    const [trialPlan, setTrialPlan] = useState<any>(null);
    const [isCardValid, setIsCardValid] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [showSuccessState, setShowSuccessState] = useState(false); // Track if activation was successful

    // Determine if this is for renewal/purchase or trial activation
    const isForRenewal = isRenewal || subscriptionStatus?.isExpired || subscriptionStatus?.needsRenewal;
    
    const trialDuration = subscriptionStatus?.daysRemaining || 90;

    useEffect(() => {
        const checkExistingSubscription = async () => {
            try {
                const currentStatus = await subscriptionService.getSubscriptionStatus();
                if (currentStatus.hasActiveSubscription || currentStatus.isTrialActive) {
                    if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'TransporterTabs', params: { transporterType: userType === 'company' ? 'company' : 'individual' } }]
                        });
                    } else if (userType === 'broker') {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'BrokerTabs' }]
                        });
                    }
                    return;
                }
            } catch (error) {
                console.error('Error checking existing subscription:', error);
            }
        };

        checkExistingSubscription();

        const loadPlans = async () => {
            try {
                const plans = await subscriptionService.getSubscriptionPlans();
                
                if (isForRenewal) {
                    // For renewal: Load paid plans (exclude trial plan with price 0)
                    const paidPlans = plans.filter((plan: any) => plan.price > 0);
                    setAvailablePlans(paidPlans);
                    if (paidPlans.length > 0) {
                        setSelectedPlan(paidPlans[0]); // Default to first paid plan
                    }
                } else {
                    // For trial activation: Load trial plan (shouldn't happen since admin creates trials)
                    const trialPlan = plans.find((plan: any) => plan.price === 0);
                    if (trialPlan) {
                        setTrialPlan(trialPlan);
                    }
                }
            } catch (error) {
                console.error('Error loading plans:', error);
            }
        };

        loadPlans();
    }, [userType, navigation, isForRenewal]);

    const handleCardValidationChange = (isValid: boolean) => {
        setIsCardValid(isValid);
    };


    // Manual trial activation logic removed. Trial state is now backend-driven only.


    const navigateToDashboard = () => {
        try {
            // Use reset() for more reliable navigation - ensures screen is properly registered
            if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                navigation.reset({
                    index: 0,
                    routes: [{ 
                        name: 'TransporterTabs', 
                        params: { transporterType: transporterType || 'individual' } 
                    }]
                });
            } else if (userType === 'broker') {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'BrokerTabs' }]
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }]
                });
            }
        } catch (error) {
            console.error('Navigation error:', error);
            // Fallback to navigate() if reset() fails
            try {
                if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                    (navigation as any).navigate('TransporterTabs', { transporterType: transporterType || 'individual' });
                } else if (userType === 'broker') {
                    (navigation as any).navigate('BrokerTabs');
                } else {
                    (navigation as any).navigate('MainTabs');
                }
            } catch (fallbackError) {
                console.error('Fallback navigation also failed:', fallbackError);
                Alert.alert(
                    'Navigation Error',
                    'Please manually navigate to the dashboard from the app menu.',
                    [{ text: 'OK' }]
                );
            }
        }
    };


    // No manual activation. All trial state is backend-driven.

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => handleAuthBackNavigation(navigation as any)}
                        style={styles.backButton}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isForRenewal ? 'Subscribe to Plan' : 'Trial Status'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <FormKeyboardWrapper style={styles.scrollView}>
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Welcome Message */}
                    <View style={styles.welcomeSection}>
                        <MaterialCommunityIcons 
                            name="rocket-launch" 
                            size={48} 
                            color={colors.primary} 
                            style={styles.welcomeIcon}
                        />
                        <Text style={styles.welcomeTitle}>
                            {isForRenewal 
                                ? 'Choose Your Subscription Plan' 
                                : `Your Free Trial Status`}
                        </Text>
                        <Text style={styles.welcomeSubtitle}>
                            {isForRenewal
                                ? 'Select a plan and complete your payment to continue using all premium features.'
                                : `You have ${trialDuration} days remaining in your free trial. All trial status is managed by our system.`}
                        </Text>
                    </View>

                    {/* Benefits Section */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.benefitsTitle}>What You'll Get</Text>
                        <View style={styles.benefitsList}>
                            <View style={styles.benefitItem}>
                                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                <Text style={styles.benefitText}>Full access to all premium features</Text>
                            </View>
                            {!isForRenewal && (
                                <>
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>No payment charged during trial</Text>
                                    </View>
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>Cancel anytime before trial ends</Text>
                                    </View>
                                </>
                            )}
                            {isForRenewal && (
                                <>
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>Unlimited access to all features</Text>
                                    </View>
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>Cancel anytime</Text>
                                    </View>
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>Secure payment processing</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </FormKeyboardWrapper>
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
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.md,
    },
    welcomeIcon: {
        marginBottom: spacing.md,
    },
    welcomeTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    welcomeSubtitle: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: spacing.md,
    },
    paymentMethodSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    paymentMethodGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    paymentMethodCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    paymentMethodLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.sm,
    },
    paymentMethodHint: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 4,
    },
    formSection: {
        marginBottom: spacing.xl,
    },
    backToSelection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
    },
    backToSelectionText: {
        fontSize: fonts.size.sm,
        color: colors.primary,
        marginLeft: spacing.xs,
        fontWeight: '500',
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    formIcon: {
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    formTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    formDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginBottom: spacing.lg,
        backgroundColor: colors.background,
    },
    activateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: 12,
        marginTop: spacing.md,
    },
    activateButtonDisabled: {
        backgroundColor: colors.text.light,
        opacity: 0.6,
    },
    activateButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    benefitsSection: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginTop: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    benefitsTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    benefitsList: {
        gap: spacing.sm,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    smartFormContainer: {
        width: '100%',
        marginTop: spacing.md,
    },
    successSection: {
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    successCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: colors.success + '30',
    },
    successIcon: {
        marginBottom: spacing.md,
    },
    successTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    successMessage: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.sm,
    },
    successHint: {
        fontSize: fonts.size.sm,
        color: colors.text.light,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: spacing.lg,
    },
    goToDashboardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: 12,
        width: '100%',
        marginTop: spacing.sm,
    },
    goToDashboardButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
});

export default SubscriptionTrialScreen;

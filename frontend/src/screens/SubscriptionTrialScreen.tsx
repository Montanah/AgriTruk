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

    const handleCardSubmit = async (cardData: CardData) => {
        if (!isCardValid) {
            Alert.alert('Invalid Card', 'Please fix the card errors before proceeding.');
            return;
        }

        await activateTrial('stripe', {
            cardNumber: cardData.number,
            expiryDate: cardData.expiry,
            cvv: cardData.cvv,
            cardholderName: cardData.cardholderName,
        });
    };

    const handleMpesaActivate = async () => {
        if (!mpesaPhone.trim() || mpesaPhone.trim().length < 10) {
            Alert.alert('Phone Required', 'Please enter a valid M-PESA phone number.');
            return;
        }

        await activateTrial('mpesa', { phoneNumber: mpesaPhone });
    };

    const activateTrial = async (paymentMethod: 'mpesa' | 'stripe', paymentData?: any) => {
        setActivatingTrial(true);
        try {
            let result;
            
            // If this is for renewal (purchasing paid plan), use createSubscription instead
            if (isForRenewal) {
                if (!selectedPlan) {
                    Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
                    setActivatingTrial(false);
                    return;
                }
                
                // Create paid subscription
                result = await subscriptionService.createSubscription(
                    selectedPlan.planId || selectedPlan.id,
                    paymentMethod
                );
            } else {
                // Trial activation (shouldn't happen since admin creates trials, but keep for edge cases)
                if (userType === 'company') {
                    const auth = getAuth();
                    const user = auth.currentUser;
                    if (!user) throw new Error('User not authenticated');
                    
                    try {
                        const subscriptionStatus = await subscriptionService.startCompanyFleetTrial(user.uid);
                        result = { success: true, data: subscriptionStatus, existingSubscription: false };
                    } catch (error) {
                        console.error('Company fleet trial failed, trying regular trial:', error);
                        result = await subscriptionService.activateTrial('transporter');
                    }
                } else {
                    result = await subscriptionService.activateTrial(userType as 'individual' | 'broker');
                }
            }

            if (result.success) {
                if (result.existingSubscription) {
                    // Existing subscription - navigate immediately
                    navigateToDashboard();
                } else {
                    try {
                        const auth = getAuth();
                        const user = auth.currentUser;
                        if (user) {
                            await NotificationHelper.sendSubscriptionNotification('activated', {
                                userId: user.uid,
                                role: userType,
                                subscriptionType: 'trial',
                                trialDuration
                            });
                        }
                    } catch (notificationError) {
                        console.warn('Failed to send trial activation notification:', notificationError);
                    }

                    // Show success state with manual navigation button as fallback
                    setShowSuccessState(true);
                    
                    // Try automatic navigation first
                    setTimeout(() => {
                        try {
                            navigateToDashboard();
                        } catch (navError) {
                            console.warn('Automatic navigation failed, user can use manual button:', navError);
                            // Keep success state visible so user can use manual button
                        }
                    }, 1500); // Small delay to show success message
                }
            } else {
                Alert.alert(
                    'Error', 
                    result.message || (isForRenewal ? 'Failed to subscribe. Please try again.' : 'Failed to activate trial. Please try again.')
                );
            }
        } catch (error) {
            console.error(isForRenewal ? 'Subscription purchase error:' : 'Trial activation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            Alert.alert(
                isForRenewal ? 'Subscription Failed' : 'Activation Failed',
                `${isForRenewal ? 'Failed to subscribe' : 'Failed to activate trial'}: ${errorMessage}\n\nPlease check your internet connection and try again.`,
                [
                    { text: 'Retry', onPress: () => activateTrial(paymentMethod, paymentData) },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setActivatingTrial(false);
        }
    };

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

    const canActivate = () => {
        if (!selectedPaymentMethod) return false;
        if (selectedPaymentMethod === 'mpesa') {
            return mpesaPhone.trim().length >= 10;
        }
        return isCardValid;
    };

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
                        {isForRenewal ? 'Subscribe to Plan' : 'Activate Your Trial'}
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
                                : `Start Your ${trialDuration}-Day Free Trial`}
                        </Text>
                        <Text style={styles.welcomeSubtitle}>
                            {isForRenewal
                                ? 'Select a plan and complete your payment to continue using all premium features.'
                                : 'Get full access to all premium features. No payment required - just verify your payment method.'}
                        </Text>
                    </View>

                    {/* Payment Method Selection */}
                    {!selectedPaymentMethod && (
                        <View style={styles.paymentMethodSection}>
                            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
                            <Text style={styles.sectionSubtitle}>
                                {isForRenewal
                                    ? 'Select your preferred payment method to complete your subscription purchase.'
                                    : "We'll verify your payment method with a $1 test charge that will be immediately refunded."}
                            </Text>
                            
                            <View style={styles.paymentMethodGrid}>
                                <TouchableOpacity
                                    style={styles.paymentMethodCard}
                                    onPress={() => setSelectedPaymentMethod('mpesa')}
                                >
                                    <MaterialCommunityIcons
                                        name="cellphone"
                                        size={32}
                                        color={colors.primary}
                                    />
                                    <Text style={styles.paymentMethodLabel}>M-PESA</Text>
                                    <Text style={styles.paymentMethodHint}>Mobile Money</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.paymentMethodCard}
                                    onPress={() => setSelectedPaymentMethod('stripe')}
                                >
                                    <MaterialCommunityIcons
                                        name="credit-card"
                                        size={32}
                                        color={colors.primary}
                                    />
                                    <Text style={styles.paymentMethodLabel}>Card</Text>
                                    <Text style={styles.paymentMethodHint}>Credit/Debit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* M-PESA Form */}
                    {selectedPaymentMethod === 'mpesa' && (
                        <View style={styles.formSection}>
                            <TouchableOpacity
                                style={styles.backToSelection}
                                onPress={() => setSelectedPaymentMethod(null)}
                            >
                                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
                                <Text style={styles.backToSelectionText}>Change Payment Method</Text>
                            </TouchableOpacity>

                            <View style={styles.formCard}>
                                <MaterialCommunityIcons
                                    name="cellphone"
                                    size={32}
                                    color={colors.primary}
                                    style={styles.formIcon}
                                />
                                <Text style={styles.formTitle}>M-PESA Phone Number</Text>
                                <Text style={styles.formDescription}>
                                    Enter the phone number registered with your M-PESA account
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    value={mpesaPhone}
                                    onChangeText={setMpesaPhone}
                                    placeholder="254 700 000 000"
                                    keyboardType="phone-pad"
                                    maxLength={12}
                                    autoFocus
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.activateButton,
                                        (!mpesaPhone.trim() || mpesaPhone.trim().length < 10) && styles.activateButtonDisabled
                                    ]}
                                    onPress={handleMpesaActivate}
                                    disabled={activatingTrial || !mpesaPhone.trim() || mpesaPhone.trim().length < 10}
                                >
                                    {activatingTrial ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                                            <Text style={styles.activateButtonText}>
                                                {isForRenewal ? 'Subscribe Now' : 'Activate Trial'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Card Form */}
                    {selectedPaymentMethod === 'stripe' && (
                        <View style={styles.formSection}>
                            <TouchableOpacity
                                style={styles.backToSelection}
                                onPress={() => setSelectedPaymentMethod(null)}
                            >
                                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
                                <Text style={styles.backToSelectionText}>Change Payment Method</Text>
                            </TouchableOpacity>

                            <View style={styles.formCard}>
                                <MaterialCommunityIcons
                                    name="credit-card"
                                    size={32}
                                    color={colors.primary}
                                    style={styles.formIcon}
                                />
                                <Text style={styles.formTitle}>Card Details</Text>
                                <Text style={styles.formDescription}>
                                    Enter your card information to verify your payment method. Card type will be detected automatically.
                                </Text>

                                <View style={styles.smartFormContainer}>
                                    <SmartPaymentForm
                                        onSubmit={handleCardSubmit}
                                        onValidationChange={handleCardValidationChange}
                                        submitButtonText={isForRenewal ? 'Subscribe Now' : 'Activate Trial'}
                                        showCardPreview={true}
                                        disabled={activatingTrial}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

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
                                    <View style={styles.benefitItem}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                        <Text style={styles.benefitText}>$1 test charge will be refunded immediately</Text>
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

                    {/* Success State with Manual Navigation Button (Fallback) */}
                    {showSuccessState && (
                        <View style={styles.successSection}>
                            <View style={styles.successCard}>
                                <MaterialCommunityIcons 
                                    name="check-circle" 
                                    size={64} 
                                    color={colors.success} 
                                    style={styles.successIcon}
                                />
                                <Text style={styles.successTitle}>
                                    {isForRenewal ? 'Subscription Activated! 🎉' : 'Trial Activated! 🎉'}
                                </Text>
                                <Text style={styles.successMessage}>
                                    {isForRenewal
                                        ? 'Your subscription has been activated! You can now access all premium features.'
                                        : `Your ${trialDuration}-day free trial has been activated! No payment was charged. You can now access all premium features.`}
                                </Text>
                                <Text style={styles.successHint}>
                                    {isForRenewal 
                                        ? 'You should be redirected automatically. If not, use the button below.'
                                        : 'You should be redirected automatically. If not, use the button below.'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.goToDashboardButton}
                                    onPress={navigateToDashboard}
                                >
                                    <MaterialCommunityIcons name="home" size={20} color={colors.white} />
                                    <Text style={styles.goToDashboardButtonText}>Go to Dashboard</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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

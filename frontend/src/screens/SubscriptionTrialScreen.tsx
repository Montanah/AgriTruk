import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormKeyboardWrapper from '../components/common/FormKeyboardWrapper';
import EnhancedSmartCardInput from '../components/common/EnhancedSmartCardInput';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import subscriptionService from '../services/subscriptionService';
import { handleAuthBackNavigation } from '../utils/navigationUtils';
// import paymentService from '../services/paymentService';
import { API_ENDPOINTS } from '../constants/api';
import { NotificationHelper } from '../services/notificationHelper';

interface SubscriptionTrialScreenProps {
    route: {
        params: {
            userType: 'individual' | 'broker' | 'company';
            transporterType?: 'individual' | 'company';
            subscriptionStatus?: {
                daysRemaining: number;
                currentPlan?: any;
                isTrialActive: boolean;
            };
        };
    };
}

type NavigationProp = {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
};

const SubscriptionTrialScreen: React.FC<SubscriptionTrialScreenProps> = ({ route }) => {
    const navigation = useNavigation<NavigationProp>();
    const { userType, transporterType, subscriptionStatus } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'stripe' | null>(null);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [activatingTrial, setActivatingTrial] = useState(false);
    const [trialPlan, setTrialPlan] = useState<any>(null);
    const [isCardValid, setIsCardValid] = useState(false);
    // const [trialActivated, setTrialActivated] = useState(false);
    
    // Ref for scrolling to payment section
    const scrollViewRef = useRef<ScrollView>(null);
    const paymentSectionRef = useRef<View>(null);

    // Get trial duration from subscription status or default to 30 days
    const trialDuration = subscriptionStatus?.daysRemaining || 30;

    // Validation functions
    const isMpesaValid = () => {
        return selectedPaymentMethod === 'mpesa' && mpesaPhone.trim().length >= 10;
    };

    const isCardValidLocal = () => {
        if (selectedPaymentMethod !== 'stripe') return false;
        return isCardValid; // Use the enhanced validation from the smart card input
    };

    const isPaymentValid = () => {
        if (!selectedPaymentMethod) return false;
        return isMpesaValid() || isCardValidLocal();
    };

    // Function to scroll to payment section
    const scrollToPaymentSection = () => {
        paymentSectionRef.current?.measureLayout(
            scrollViewRef.current as any,
            (x, y) => {
                scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
            },
            () => {}
        );
    };


    // Check if user already has active subscription on component mount
    useEffect(() => {
        const checkExistingSubscription = async () => {
            try {
                const currentStatus = await subscriptionService.getSubscriptionStatus();

                // Check if user has active subscription or trial
                const hasActive = currentStatus.hasActiveSubscription === true;
                const hasTrial = currentStatus.isTrialActive === true;

                // If user already has active subscription or trial, redirect to dashboard
                if (hasActive || hasTrial) {
                    console.log('✅ User already has active subscription/trial, redirecting to dashboard');
                    
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
                    } else {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs' }]
                        });
                    }
                    return;
                }
            } catch (error) {
                console.error('Error checking existing subscription:', error);
                // Continue with trial activation if check fails
            }
        };

        checkExistingSubscription();
    }, [userType, navigation]);

    // Load trial plan on component mount
    useEffect(() => {
        const loadTrialPlan = async () => {
            try {
                // Use the subscription service to get plans instead of direct API call
                const plans = await subscriptionService.getSubscriptionPlans();
                const trialPlan = plans.find((plan: any) => plan.price === 0);
                if (trialPlan) {
                    setTrialPlan(trialPlan);
                }
            } catch (error) {
                console.error('Error loading trial plan:', error);
                // Don't show error to user, just log it
            }
        };

        loadTrialPlan();
    }, []);

    // Method to create trial plan and subscription following the proper backend flow
    // NOTE: This is no longer used - we use subscriptionService.activateTrial() instead


    const handleActivateTrial = async () => {
        // For trials, we don't need payment method selection since price is 0
        // But we still need to collect payment method for future reference
        if (!selectedPaymentMethod) {
            Alert.alert('Select Payment Method', 'Please select a payment method for future reference.');
            return;
        }

        setActivatingTrial(true);
        try {
            // Use the same simple approach as transporters
            console.log('Activating trial using subscription service...');
            console.log('User type:', userType);
            console.log('Subscription status:', subscriptionStatus);
            
            let result;
            if (userType === 'company') {
                // Use company fleet trial activation (separate API for company plans)
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                try {
                    const subscriptionStatus = await subscriptionService.startCompanyFleetTrial(user.uid);
                    result = { success: true, data: subscriptionStatus, existingSubscription: false };
                } catch (error) {
                    console.error('Company fleet trial failed, trying regular trial:', error);
                    // Fallback to regular trial if company fleet trial fails
                    result = await subscriptionService.activateTrial('transporter');
                }
            } else {
                // Use regular trial activation for individual transporters and brokers
                result = await subscriptionService.activateTrial(userType as 'individual' | 'broker');
            }
            console.log('Trial activation result:', result);
            
            if (result.success) {
                // Check if user already had a subscription
                if (result.existingSubscription) {
                    console.log('User already has a subscription, navigating to appropriate screen');
                    
                    // Navigate directly to the appropriate dashboard based on subscription status
                    const subscriptionData = result.data;
                    
                    if (subscriptionData.isExpired) {
                        // Navigate to subscription expired screen
                        navigation.navigate('SubscriptionExpired', {
                            userType: userType,
                            subscriptionStatus: subscriptionData
                        });
                    } else if (subscriptionData.isTrialActive) {
                        // User already has active trial - navigate to appropriate dashboard
                        if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                            // Both individual transporters and companies go to TransporterTabs
                            // Use the transporterType parameter passed from the previous screen
                            navigation.navigate('TransporterTabs', { transporterType: transporterType || 'individual' });
                        } else if (userType === 'broker') {
                            navigation.navigate('BrokerTabs');
                        } else {
                            // For shippers/clients, use MainTabs
                            navigation.navigate('MainTabs');
                        }
                    } else {
                        // Navigate to appropriate dashboard
                        if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                            // Use the transporterType parameter passed from the previous screen
                            navigation.navigate('TransporterTabs', { transporterType: transporterType || 'individual' });
                        } else if (userType === 'broker') {
                            navigation.navigate('BrokerTabs');
                        } else {
                            // For shippers/clients, use MainTabs
                            navigation.navigate('MainTabs');
                        }
                    }
                } else {
                    // New trial activation
                    // Send trial activation notification
                    try {
                        // NotificationHelper and getAuth are already imported at the top
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
                    
                    Alert.alert(
                        'Trial Activated! 🎉',
                        `Your ${trialDuration}-day free trial has been activated! No payment was charged. You can now access all premium features.`,
                        [
                            {
                                text: 'Continue',
                                onPress: () => {
                                    if (userType === 'transporter' || userType === 'company' || userType === 'individual') {
                                        // Both individual transporters and companies go to TransporterTabs
                                        // Use the transporterType parameter passed from the previous screen
                                        navigation.navigate('TransporterTabs', { transporterType: transporterType || 'individual' });
                                    } else if (userType === 'broker') {
                                        // Navigate to payment confirmation for brokers
                                        navigation.navigate('PaymentConfirmation', {
                                            userType: 'broker',
                                            subscriptionType: 'trial',
                                            trialDuration: trialDuration,
                                            planName: trialPlan?.name || 'Trial Plan',
                                            planId: trialPlan?.planId || 'jw8V6swPDphqifQ9YVTr',
                                            amount: trialPlan?.price || 0
                                        });
                                    } else {
                                        // Fallback for other user types (shippers/clients)
                                        navigation.navigate('MainTabs');
                                    }
                                }
                            }
                        ]
                    );
                }
            } else {
                Alert.alert('Error', result.message || 'Failed to activate trial. Please try again.');
            }
        } catch (error) {
            console.error('Trial activation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            Alert.alert(
                'Activation Failed', 
                `Failed to activate trial: ${errorMessage}\n\nPlease check your internet connection and try again.`,
                [
                    { text: 'Retry', onPress: () => handleActivateTrial() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setActivatingTrial(false);
        }
    };


    const getTrialFeatures = () => {
        if (userType === 'transporter') {
            return [
                'Unlimited job requests',
                'Advanced route optimization',
                'Real-time tracking',
                'Priority customer support',
                'Advanced analytics & insights',
                'Fleet management tools',
            ];
        } else if (userType === 'broker') {
            return [
                'Unlimited client requests',
                'Advanced consolidation tools',
                'Real-time tracking for all shipments',
                'Priority customer support',
                'Advanced analytics & insights',
                'Commission tracking',
                'Client management tools',
            ];
        } else {
            return [];
        }
    };

    const renderPaymentForm = () => {
        if (selectedPaymentMethod === 'mpesa') {
            return (
                <View style={styles.paymentForm}>
                    <Text style={styles.formLabel}>M-PESA Phone Number *</Text>
                    <TextInput
                        style={styles.input}
                        value={mpesaPhone}
                        onChangeText={setMpesaPhone}
                        placeholder="e.g., 254712345678 or 254101234567"
                        keyboardType="phone-pad"
                        maxLength={12}
                    />
                    <Text style={styles.formHelpText}>
                        Enter the phone number registered with M-PESA
                    </Text>
                </View>
            );
        }

        if (selectedPaymentMethod === 'stripe') {
            return (
                <View style={styles.paymentForm}>
                    <EnhancedSmartCardInput
                        onCardChange={(cardData) => {
                            setCardNumber(cardData.number);
                            setExpiryDate(cardData.expiry);
                            setCvv(cardData.cvv);
                            setCardholderName(cardData.cardholderName);
                            setIsCardValid(cardData.isValid);
                        }}
                        onValidationChange={setIsCardValid}
                        showVirtualCard={true}
                        disabled={activatingTrial}
                    />
                </View>
            );
        }

        return null;
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
                        Activate Your Trial
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <FormKeyboardWrapper 
                style={styles.scrollView} 
                keyboardVerticalOffset={0}
            >
                <ScrollView 
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.scrollContent}
                >
                {/* Welcome Section */}
                <View style={styles.welcomeCard}>
                    <View style={styles.welcomeIcon}>
                        <Image
                            source={require('../../assets/images/TRUK Logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.welcomeTitle}>
                        Welcome to TRUK! 🎉
                    </Text>
                    <Text style={styles.welcomeSubtitle}>
                        Your {userType} profile has been approved! Complete the steps below to activate your {trialDuration}-day free trial.
                    </Text>
                </View>

                {/* Progress Steps */}
                <View style={styles.progressCard}>
                    <Text style={styles.sectionTitle}>Activation Steps</Text>
                    <View style={styles.stepsContainer}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepNumber, selectedPaymentMethod ? styles.stepCompleted : styles.stepActive]}>
                                {selectedPaymentMethod ? (
                                    <MaterialCommunityIcons
                                        name="check"
                                        size={16}
                                        color={colors.white}
                                    />
                                ) : (
                                    <Text style={styles.stepNumberText}>1</Text>
                                )}
                            </View>
                            <Text style={[styles.stepText, selectedPaymentMethod && styles.stepTextCompleted]}>
                                Select Payment Method
                            </Text>
                        </View>
                        <View style={styles.stepConnector} />
                        <View style={styles.stepItem}>
                            <View style={[styles.stepNumber, styles.stepPending]}>
                                <Text style={styles.stepNumberTextPending}>2</Text>
                            </View>
                            <Text style={styles.stepText}>
                                Activate Trial
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Payment Method Selection - Now at the top */}
                <View ref={paymentSectionRef} style={styles.paymentCard}>
                    <Text style={styles.sectionTitle}>Payment Method Verification</Text>
                    <Text style={styles.paymentDescription}>
                        To activate your {trialDuration}-day free trial, we need to verify your payment method with a $1 test charge that will be immediately refunded.
                    </Text>
                    
                    <View style={styles.paymentMethodSelection}>
                        <Text style={styles.paymentMethodTitle}>Choose Payment Method</Text>
                        
                        <TouchableOpacity
                            style={[
                                styles.paymentMethodOption,
                                selectedPaymentMethod === 'mpesa' && styles.paymentMethodSelected
                            ]}
                            onPress={() => setSelectedPaymentMethod('mpesa')}
                        >
                            <MaterialCommunityIcons
                                name="cellphone"
                                size={24}
                                color={selectedPaymentMethod === 'mpesa' ? colors.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.paymentMethodText,
                                selectedPaymentMethod === 'mpesa' && styles.paymentMethodTextSelected
                            ]}>
                                M-PESA
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentMethodOption,
                                selectedPaymentMethod === 'stripe' && styles.paymentMethodSelected
                            ]}
                            onPress={() => setSelectedPaymentMethod('stripe')}
                        >
                            <MaterialCommunityIcons
                                name="credit-card"
                                size={24}
                                color={selectedPaymentMethod === 'stripe' ? colors.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.paymentMethodText,
                                selectedPaymentMethod === 'stripe' && styles.paymentMethodTextSelected
                            ]}>
                                Credit/Debit Card
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {renderPaymentForm()}
                    
                    <View style={styles.trialInfo}>
                        <MaterialCommunityIcons
                            name="shield-check"
                            size={24}
                            color={colors.success}
                        />
                        <Text style={styles.trialInfoText}>
                            $1 test charge will be refunded immediately • Cancel anytime • Full access to all features
                        </Text>
                    </View>
                </View>

                {/* Trial Benefits - Now after payment selection */}
                <View style={styles.benefitsCard}>
                    <Text style={styles.sectionTitle}>What You&apos;ll Get</Text>
                    <Text style={styles.trialDuration}>
                        {trialDuration} Days Free Trial
                    </Text>
                    <Text style={styles.trialDescription}>
                        Experience all premium features without any commitment. Your trial includes:
                    </Text>

                    <View style={styles.featuresList}>
                        {getTrialFeatures().map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={20}
                                    color={colors.success}
                                />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.viewPlansButton}
                        onPress={() => {
                            navigation.navigate('SubscriptionScreen', {
                                userType: userType
                            });
                        }}
                    >
                        <MaterialCommunityIcons
                            name="eye"
                            size={16}
                            color={colors.primary}
                        />
                        <Text style={styles.viewPlansButtonText}>View All Subscription Plans</Text>
                    </TouchableOpacity>
                </View>

                {/* Important Notes */}
                <View style={styles.notesCard}>
                    <Text style={styles.sectionTitle}>Important Information</Text>
                    <View style={styles.noteItem}>
                        <MaterialCommunityIcons
                            name="information"
                            size={20}
                            color={colors.warning}
                        />
                        <Text style={styles.noteText}>
                            Your trial will automatically convert to a paid subscription after {trialDuration} days
                        </Text>
                    </View>
                    <View style={styles.noteItem}>
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={20}
                            color={colors.primary}
                        />
                        <Text style={styles.noteText}>
                            You can cancel anytime before the trial ends
                        </Text>
                    </View>
                    <View style={styles.noteItem}>
                        <MaterialCommunityIcons
                            name="shield-check"
                            size={20}
                            color={colors.success}
                        />
                        <Text style={styles.noteText}>
                            All your data and settings will be preserved
                        </Text>
                    </View>
                </View>

                </ScrollView>
            </FormKeyboardWrapper>

            {/* Action Button */}
            <View style={styles.actionContainer}>
                {!selectedPaymentMethod && (
                    <View style={styles.paymentRequiredBanner}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={20}
                            color={colors.warning}
                        />
                        <Text style={styles.paymentRequiredBannerText}>
                            Please select a payment method above to continue
                        </Text>
                    </View>
                )}
                
                <TouchableOpacity
                    style={[
                        styles.activateButton,
                        (activatingTrial || !isPaymentValid()) && styles.activateButtonDisabled
                    ]}
                    onPress={handleActivateTrial}
                    disabled={activatingTrial || !isPaymentValid()}
                >
                    {activatingTrial ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <View style={styles.activateButtonContent}>
                            <MaterialCommunityIcons
                                name={isPaymentValid() ? "rocket-launch" : "credit-card-outline"}
                                size={18}
                                color={colors.white}
                            />
                            <Text style={styles.activateButtonText}>
                                {!selectedPaymentMethod 
                                    ? 'Select Payment Method' 
                                    : !isPaymentValid()
                                    ? 'Complete Payment Details'
                                    : `Activate Trial`
                                }
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Skip Trial Option */}
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                        navigation.navigate('SubscriptionScreen', {
                            userType: userType
                        });
                    }}
                >
                    <Text style={styles.skipButtonText}>View Plans</Text>
                </TouchableOpacity>
            </View>
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
    welcomeCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginVertical: spacing.lg,
        alignItems: 'center',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    welcomeIcon: {
        marginBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 100,
        height: 60,
        borderRadius: 8,
    },
    welcomeTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    benefitsCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    trialDuration: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    trialDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    featuresList: {
        marginTop: spacing.md,
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
    paymentCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    paymentDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    notesCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    noteText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        flex: 1,
        lineHeight: 22,
    },
    actionContainer: {
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    activateButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
        marginBottom: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    activateButtonDisabled: {
        backgroundColor: colors.text.light,
        shadowOpacity: 0,
        elevation: 0,
    },
    activateButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    skipButtonText: {
        color: colors.text.secondary,
        fontSize: fonts.size.sm,
        textDecorationLine: 'underline',
    },
    skipNote: {
        color: colors.text.secondary,
        fontSize: fonts.size.sm,
        textAlign: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        lineHeight: 18,
    },
    viewPlansButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '15',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    viewPlansButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
        letterSpacing: 0.3,
    },
    paymentForm: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    formLabel: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.text.light,
        borderRadius: 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    formHelpText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: -spacing.sm,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    cardColumn: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
    trialInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary + '10',
        padding: spacing.md,
        borderRadius: 8,
        marginTop: spacing.md,
    },
    trialInfoText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
        flex: 1,
        lineHeight: 20,
    },
    paymentMethodSelection: {
        marginTop: spacing.md,
    },
    paymentMethodTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    paymentMethodOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.text.light,
        borderRadius: 8,
        marginBottom: spacing.sm,
        backgroundColor: colors.white,
    },
    paymentMethodSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    paymentMethodText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },
    paymentMethodTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    paymentRequiredCard: {
        backgroundColor: colors.warning + '10',
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    paymentRequiredHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    paymentRequiredTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.warning,
        marginLeft: spacing.sm,
    },
    paymentRequiredText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    scrollToPaymentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '15',
        borderRadius: 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    scrollToPaymentText: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: spacing.xs,
    },
    progressCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginVertical: spacing.sm,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    stepActive: {
        backgroundColor: colors.primary,
    },
    stepCompleted: {
        backgroundColor: colors.success,
    },
    stepPending: {
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.border,
    },
    stepConnector: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border,
        marginHorizontal: spacing.sm,
        marginBottom: 16,
    },
    stepText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    stepTextCompleted: {
        color: colors.success,
        fontWeight: '600',
    },
    paymentRequiredBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '15',
        borderRadius: 6,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
    },
    paymentRequiredBannerText: {
        fontSize: fonts.size.sm,
        color: colors.warning,
        fontWeight: '500',
        marginLeft: spacing.sm,
        flex: 1,
    },
    activateButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.white,
    },
    stepNumberTextPending: {
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
        color: colors.text.light,
    },
});

export default SubscriptionTrialScreen;

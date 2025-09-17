import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
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
import KeyboardAwareScrollView from '../components/common/KeyboardAwareScrollView';
import PaymentMethodCard from '../components/common/PaymentMethodCard';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { API_ENDPOINTS } from '../constants/api';
import subscriptionService from '../services/subscriptionService';
import paymentService from '../services/paymentService';

interface SubscriptionTrialScreenProps {
    route: {
        params: {
            userType: 'transporter' | 'broker' | 'business';
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
    const { userType, subscriptionStatus } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'stripe' | null>(null);
    const [loading, setLoading] = useState(false);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [activatingTrial, setActivatingTrial] = useState(false);
    const [trialActivated, setTrialActivated] = useState(false);

    // Get trial duration from subscription status or default to 30 days
    const trialDuration = subscriptionStatus?.trialDaysRemaining || subscriptionStatus?.daysRemaining || 30;
    const isTrialActive = subscriptionStatus?.isTrialActive || false;

    const handleActivateTrial = async () => {
        setActivatingTrial(true);
        try {
            // First, get available subscription plans to find the trial plan
            const plans = await subscriptionService.getSubscriptionPlans();
            const trialPlan = plans.find(plan => plan.price === 0);
            
            if (!trialPlan) {
                Alert.alert('Error', 'No trial plan available. Please contact support.');
                return;
            }

            // Create subscriber for trial (no payment required for free trial)
            // Use payment service with isTrial flag to ensure no payment deduction
            const paymentData = {
                planId: trialPlan.id,
                amount: 0, // Free trial
                currency: 'USD',
                isTrial: true,
                trialDays: trialDuration,
                autoRenew: false, // Don't auto-renew trials
            };

            const result = await paymentService.processSubscriptionPayment(paymentData);
            
            if (result.success) {
                setTrialActivated(true);
                Alert.alert(
                    'Trial Activated!',
                    `Your ${trialDuration}-day free trial has been activated. You can now access all premium features.`,
                    [
                        {
                            text: 'Continue',
                            onPress: () => navigation.navigate(userType === 'transporter' ? 'TransporterTabs' : 'BrokerTabs')
                        }
                    ]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to activate trial. Please try again.');
            }
        } catch (error) {
            console.error('Trial activation error:', error);
            Alert.alert('Error', 'Failed to activate trial. Please try again.');
        } finally {
            setActivatingTrial(false);
        }
    };

    const processMpesaPayment = async () => {
        try {
            // Get current user ID from Firebase Auth
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not authenticated. Please log in again.');
                return;
            }

            const response = await fetch(API_ENDPOINTS.PAYMENTS + '/mpesa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`,
                },
                body: JSON.stringify({
                    phone: mpesaPhone,
                    amount: 0, // Trial is free
                    accountRef: `TRIAL_${userType}_${user.uid}`,
                }),
            });

            if (response.ok) {
                Alert.alert(
                    'Trial Activated! 🎉',
                    `Your ${trialDuration}-day trial has been activated successfully! You now have access to all ${userType} features.`,
                );
                // Navigate to main app
                if (userType === 'transporter') {
                    navigation.navigate('TransporterTabs');
                } else if (userType === 'broker') {
                    navigation.navigate('BrokerTabs');
                } else if (userType === 'business') {
                    navigation.navigate('BusinessStack');
                }
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            console.error('MPESA payment error:', error);
            Alert.alert('Error', 'Failed to process MPESA payment. Please try again.');
        }
    };

    const processStripePayment = async () => {
        try {
            // Get current user ID from Firebase Auth
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not authenticated. Please log in again.');
                return;
            }

            const response = await fetch(API_ENDPOINTS.PAYMENTS + '/stripe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`,
                },
                body: JSON.stringify({
                    amount: 0, // Trial is free
                    currency: 'usd',
                    paymentMethod: 'card',
                    accountRef: `TRIAL_${userType}_${user.uid}`,
                }),
            });

            if (response.ok) {
                Alert.alert(
                    'Trial Activated! 🎉',
                    'Your card payment has been processed successfully. Your trial is now active!',
                );
                // Navigate to main app
                if (userType === 'transporter') {
                    navigation.navigate('TransporterTabs');
                } else if (userType === 'broker') {
                    navigation.navigate('BrokerTabs');
                } else if (userType === 'business') {
                    navigation.navigate('BusinessStack');
                }
            } else {
                throw new Error('Payment failed');
            }
        } catch (error) {
            console.error('Stripe payment error:', error);
            Alert.alert('Error', 'Failed to process card payment. Please try again.');
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
                'Insurance coverage',
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
        } else if (userType === 'business') {
            return [
                'Unlimited transport requests',
                'Advanced consolidation tools',
                'Real-time shipment tracking',
                'Priority customer support',
                'Business analytics & insights',
                'Fleet management access',
                'Bulk booking discounts',
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
                    <Text style={styles.formLabel}>Cardholder Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={cardholderName}
                        onChangeText={setCardholderName}
                        placeholder="Name on card"
                        autoCapitalize="words"
                    />

                    <Text style={styles.formLabel}>Card Number *</Text>
                    <TextInput
                        style={styles.input}
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        placeholder="1234 5678 9012 3456"
                        keyboardType="numeric"
                        maxLength={19}
                    />

                    <View style={styles.cardRow}>
                        <View style={styles.cardColumn}>
                            <Text style={styles.formLabel}>Expiry Date *</Text>
                            <TextInput
                                style={styles.input}
                                value={expiryDate}
                                onChangeText={setExpiryDate}
                                placeholder="MM/YY"
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                        <View style={styles.cardColumn}>
                            <Text style={styles.formLabel}>CVV *</Text>
                            <TextInput
                                style={styles.input}
                                value={cvv}
                                onChangeText={setCvv}
                                placeholder="123"
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                            />
                        </View>
                    </View>
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
                        onPress={() => navigation.goBack()}
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

            <KeyboardAwareScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                extraScrollHeight={50}
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
                        Your {userType} profile has been approved! Activate your {trialDuration}-day free trial to access all premium features.
                    </Text>
                </View>

                {/* Trial Benefits */}
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

                {/* Trial Activation Info */}
                <View style={styles.paymentCard}>
                    <Text style={styles.sectionTitle}>Activate Your Trial</Text>
                    <Text style={styles.paymentDescription}>
                        Your trial is completely free - no payment method required! Click the button below to start your {trialDuration}-day trial.
                    </Text>
                    
                    <View style={styles.trialInfo}>
                        <MaterialCommunityIcons
                            name="gift"
                            size={24}
                            color={colors.secondary}
                        />
                        <Text style={styles.trialInfoText}>
                            No credit card required • Cancel anytime • Full access to all features
                        </Text>
                    </View>
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
            </KeyboardAwareScrollView>

            {/* Action Button */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[
                        styles.activateButton,
                        activatingTrial && styles.activateButtonDisabled
                    ]}
                    onPress={handleActivateTrial}
                    disabled={activatingTrial}
                >
                    {activatingTrial ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={styles.activateButtonText}>
                            {activatingTrial ? 'Activating...' : `Activate ${trialDuration}-Day Trial`}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Skip Trial Option */}
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                        Alert.alert(
                            'View Subscription Plans?',
                            'You\'ll see all available plans with pricing, features, and can choose what works best for you. You can always activate your trial later from your profile settings.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'View Plans',
                                    onPress: () => {
                                        // Navigate to subscription plans screen
                                        navigation.navigate('SubscriptionScreen', {
                                            userType: userType
                                        });
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <Text style={styles.skipButtonText}>View Subscription Plans</Text>
                </TouchableOpacity>

                <Text style={styles.skipNote}>
                    Prefer to choose a plan directly? View our subscription options and select what works best for you.
                </Text>
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
        padding: spacing.lg,
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
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    activateButtonDisabled: {
        backgroundColor: colors.text.light,
    },
    activateButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    skipButtonText: {
        color: colors.text.secondary,
        fontSize: fonts.size.md,
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
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    viewPlansButtonText: {
        color: colors.primary,
        fontSize: fonts.size.sm,
        fontWeight: '600',
        marginLeft: spacing.sm,
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
});

export default SubscriptionTrialScreen;

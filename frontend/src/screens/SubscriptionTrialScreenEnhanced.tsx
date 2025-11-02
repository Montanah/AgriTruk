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
import SmartPaymentForm from '../components/common/SmartPaymentForm';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import subscriptionService from '../services/subscriptionService';
import { handleAuthBackNavigation } from '../utils/navigationUtils';
import { API_ENDPOINTS } from '../constants/api';
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
            };
        };
    };
}

type NavigationProp = {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
};

const SubscriptionTrialScreenEnhanced: React.FC<SubscriptionTrialScreenProps> = ({ route }) => {
    const navigation = useNavigation<NavigationProp>();
    const { userType, transporterType, subscriptionStatus } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'stripe' | null>(null);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [activatingTrial, setActivatingTrial] = useState(false);
    const [trialPlan, setTrialPlan] = useState<any>(null);
    const [isCardValid, setIsCardValid] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        // Start animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
        ]).start();

        // Load trial plan
        loadTrialPlan();
    }, []);

    const loadTrialPlan = async () => {
        try {
            const plan = await subscriptionService.getTrialPlan(userType);
            setTrialPlan(plan);
        } catch (error) {
            console.error('Error loading trial plan:', error);
        }
    };

    const handleCardValidationChange = (isValid: boolean) => {
        setIsCardValid(isValid);
    };

    const handleCardSubmit = async (cardData: CardData) => {
        if (!isCardValid) {
            Alert.alert('Invalid Card', 'Please fix the card errors before proceeding.');
            return;
        }

        setActivatingTrial(true);
        
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const token = await user.getIdToken();
            
            // Process payment with enhanced card data
            const paymentData = {
                cardNumber: cardData.number,
                expiryDate: cardData.expiry,
                cvv: cardData.cvv,
                cardholderName: cardData.cardholderName,
                cardType: cardData.type,
                paymentMethod: 'stripe',
                amount: 1, // $1 test charge
                currency: 'KES',
                userType,
                transporterType,
            };

            console.log('Processing payment with enhanced card validation:', paymentData);

            // Make payment request
            const response = await fetch(`${API_ENDPOINTS.SUBSCRIPTIONS}/activate-trial`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Trial activated successfully:', result);

                // Send notification
                try {
                    await NotificationHelper.sendSubscriptionNotification('trial_activated', {
                        userId: user.uid,
                        userType,
                        transporterType,
                        planName: trialPlan?.name || 'Trial Plan',
                    });
                } catch (notificationError) {
                    console.warn('Failed to send trial activation notification:', notificationError);
                }

                // Navigate to appropriate screen
                if (userType === 'company' || transporterType === 'company') {
                    navigation.navigate('TransporterTabs');
                } else if (userType === 'broker') {
                    navigation.navigate('BrokerTabs');
                } else {
                    navigation.navigate('MainTabs');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to activate trial');
            }
        } catch (error: any) {
            console.error('Trial activation error:', error);
            Alert.alert(
                'Activation Failed',
                error.message || 'Failed to activate trial. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setActivatingTrial(false);
        }
    };

    const handleMpesaSubmit = async () => {
        if (!mpesaPhone.trim()) {
            Alert.alert('Phone Required', 'Please enter your M-PESA phone number.');
            return;
        }

        setActivatingTrial(true);
        
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const token = await user.getIdToken();
            
            const paymentData = {
                phoneNumber: mpesaPhone,
                paymentMethod: 'mpesa',
                amount: 1,
                currency: 'KES',
                userType,
                transporterType,
            };

            const response = await fetch(`${API_ENDPOINTS.SUBSCRIPTIONS}/activate-trial`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('M-PESA trial activation initiated:', result);

                Alert.alert(
                    'M-PESA Payment',
                    'Please complete the payment on your phone and wait for confirmation.',
                    [{ text: 'OK' }]
                );

                // Navigate to appropriate screen
                if (userType === 'company' || transporterType === 'company') {
                    navigation.navigate('TransporterTabs');
                } else if (userType === 'broker') {
                    navigation.navigate('BrokerTabs');
                } else {
                    navigation.navigate('MainTabs');
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to initiate M-PESA payment');
            }
        } catch (error: any) {
            console.error('M-PESA activation error:', error);
            Alert.alert(
                'Payment Failed',
                error.message || 'Failed to initiate M-PESA payment. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setActivatingTrial(false);
        }
    };

    const renderPaymentMethodSelection = () => (
        <Animated.View
            style={[
                styles.paymentMethodContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
            
            <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                    style={[
                        styles.paymentMethodCard,
                        selectedPaymentMethod === 'mpesa' && styles.paymentMethodCardSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('mpesa')}
                >
                    <MaterialCommunityIcons
                        name="cellphone"
                        size={24}
                        color={selectedPaymentMethod === 'mpesa' ? colors.white : colors.primary}
                    />
                    <Text style={[
                        styles.paymentMethodText,
                        selectedPaymentMethod === 'mpesa' && styles.paymentMethodTextSelected,
                    ]}>
                        M-PESA
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.paymentMethodCard,
                        selectedPaymentMethod === 'stripe' && styles.paymentMethodCardSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('stripe')}
                >
                    <MaterialCommunityIcons
                        name="credit-card"
                        size={24}
                        color={selectedPaymentMethod === 'stripe' ? colors.white : colors.primary}
                    />
                    <Text style={[
                        styles.paymentMethodText,
                        selectedPaymentMethod === 'stripe' && styles.paymentMethodTextSelected,
                    ]}>
                        Credit/Debit Card
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderMpesaForm = () => (
        <Animated.View
            style={[
                styles.formContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Text style={styles.formTitle}>M-PESA Payment</Text>
            
            <View style={styles.inputContainer}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                    style={styles.input}
                    value={mpesaPhone}
                    onChangeText={setMpesaPhone}
                    placeholder="+254 700 000 000"
                    keyboardType="phone-pad"
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.submitButton,
                    { opacity: mpesaPhone.trim() ? 1 : 0.5 }
                ]}
                onPress={handleMpesaSubmit}
                disabled={!mpesaPhone.trim() || activatingTrial}
            >
                {activatingTrial ? (
                    <ActivityIndicator color={colors.white} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="cellphone" size={20} color={colors.white} />
                        <Text style={styles.submitButtonText}>Pay with M-PESA</Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    const renderStripeForm = () => (
        <Animated.View
            style={[
                styles.formContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <Text style={styles.formTitle}>Credit/Debit Card</Text>
            
            <SmartPaymentForm
                onSubmit={handleCardSubmit}
                onValidationChange={handleCardValidationChange}
                submitButtonText="Activate Trial"
                showCardPreview={true}
                disabled={activatingTrial}
            />
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FormKeyboardWrapper>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <Animated.View
                        style={[
                            styles.header,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => handleAuthBackNavigation(navigation)}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Activate Your Trial</Text>
                    </Animated.View>

                    {/* Trial Benefits */}
                    <Animated.View
                        style={[
                            styles.benefitsContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.benefitsHeader}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.benefitsText}>
                                $1 test charge will be refunded immediately • Cancel anytime • Full access to all features
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Payment Method Selection */}
                    {!selectedPaymentMethod && renderPaymentMethodSelection()}

                    {/* M-PESA Form */}
                    {selectedPaymentMethod === 'mpesa' && renderMpesaForm()}

                    {/* Stripe Form */}
                    {selectedPaymentMethod === 'stripe' && renderStripeForm()}

                    {/* What You'll Get Section */}
                    <Animated.View
                        style={[
                            styles.featuresContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <Text style={styles.featuresTitle}>What You'll Get</Text>
                        {trialPlan?.features?.map((feature: string, index: number) => (
                            <View key={index} style={styles.featureItem}>
                                <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </Animated.View>
                </ScrollView>
            </FormKeyboardWrapper>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: spacing.md,
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.white,
    },
    benefitsContainer: {
        margin: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.success + '20',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.success + '40',
    },
    benefitsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitsText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        flex: 1,
    },
    paymentMethodContainer: {
        margin: spacing.lg,
    },
    sectionTitle: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    paymentMethodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paymentMethodCard: {
        flex: 1,
        padding: spacing.md,
        marginHorizontal: spacing.xs,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border.light,
        backgroundColor: colors.background.light,
        alignItems: 'center',
    },
    paymentMethodCardSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    paymentMethodText: {
        marginTop: spacing.sm,
        fontSize: fonts.size.sm,
        fontWeight: '500',
        color: colors.text.primary,
    },
    paymentMethodTextSelected: {
        color: colors.white,
    },
    formContainer: {
        margin: spacing.lg,
    },
    formTitle: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    formLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 2,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        fontFamily: fonts.family.regular,
        color: colors.text.primary,
        backgroundColor: colors.background.light,
        borderColor: colors.border.light,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        backgroundColor: colors.primary,
        marginTop: spacing.lg,
    },
    submitButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    featuresContainer: {
        margin: spacing.lg,
    },
    featuresTitle: {
        fontSize: fonts.size.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    featureText: {
        marginLeft: spacing.sm,
        fontSize: fonts.size.sm,
        color: colors.text.primary,
    },
});

export default SubscriptionTrialScreenEnhanced;


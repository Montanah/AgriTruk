import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CardPaymentForm from '../components/common/CardPaymentForm';
import PaymentMethodCard from '../components/common/PaymentMethodCard';
import { SubscriptionPlan } from '../components/common/SubscriptionPlanCard';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface PaymentScreenProps {
    route: {
        params: {
            plan: SubscriptionPlan;
            userType: 'transporter' | 'broker';
            billingPeriod: 'monthly' | 'yearly';
            isUpgrade?: boolean;
        };
    };
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ route }) => {
    const navigation = useNavigation<any>();
    const { plan, userType, billingPeriod, isUpgrade = false } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'stripe' | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'method' | 'details' | 'stripe-form' | 'processing'>('method');

    // Stripe form state
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [isCardValid, setIsCardValid] = useState(false);
    const [cardData, setCardData] = useState<any>(null);

    const handlePaymentMethodSelect = (method: 'mpesa' | 'stripe') => {
        setSelectedPaymentMethod(method);
        if (method === 'stripe') {
            setPaymentStep('processing');
            handleStripePayment();
        } else {
            setPaymentStep('details');
        }
    };

    const handleMpesaPayment = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid M-PESA phone number.');
            return;
        }

        setLoading(true);
        setPaymentStep('processing');

        try {
            // Simulate M-PESA payment processing
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Here you would integrate with actual M-PESA API
            Alert.alert(
                'Payment Successful',
                `Your ${plan.name} subscription has been ${isUpgrade ? 'upgraded' : 'activated'} successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('PaymentSuccess', { plan, userType, isUpgrade })
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
            setPaymentStep('details');
        } finally {
            setLoading(false);
        }
    };

    const handleStripePayment = async () => {
        setPaymentStep('stripe-form');
    };

    const handleCardValid = (data: any) => {
        setIsCardValid(true);
        setCardData(data);
    };

    const handleCardInvalid = () => {
        setIsCardValid(false);
        setCardData(null);
    };

    const handleStripeFormSubmit = async () => {
        if (!isCardValid) {
            Alert.alert('Invalid Card', 'Please ensure your card details are correct.');
            return;
        }

        if (!cardData) {
            Alert.alert('Missing Information', 'Please complete the card form.');
            return;
        }

        setLoading(true);
        setPaymentStep('processing');

        try {
            // Simulate API call to backend for Stripe payment
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Here you would make actual API call to your backend
            // const response = await fetch('/api/payments/stripe', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         planId: plan.id,
            //         userType,
            //         isUpgrade,
            //         billingPeriod,
            //         cardDetails: cardData
            //     })
            // });

            // if (!response.ok) throw new Error('Payment failed');

            Alert.alert(
                'Payment Successful',
                `Your ${plan.name} subscription has been ${isUpgrade ? 'upgraded' : 'activated'} successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('PaymentSuccess', { plan, userType, isUpgrade })
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
            setPaymentStep('stripe-form');
        } finally {
            setLoading(false);
        }
    };



    const getTotalAmount = () => {
        return plan.price;
    };

    const renderPaymentMethodSelection = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
            <PaymentMethodCard
                method="mpesa"
                selected={selectedPaymentMethod === 'mpesa'}
                onSelect={() => handlePaymentMethodSelect('mpesa')}
            />
            <PaymentMethodCard
                method="stripe"
                selected={selectedPaymentMethod === 'stripe'}
                onSelect={() => handlePaymentMethodSelect('stripe')}
            />
        </View>
    );

    const renderMpesaDetails = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
                {isUpgrade ? 'M-PESA Upgrade Payment' : 'M-PESA Payment Details'}
            </Text>

            <View style={styles.phoneInputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputWrapper}>
                    <Text style={styles.countryCode}>+254</Text>
                    <TextInput
                        style={styles.phoneInput}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="7XX XXX XXX"
                        placeholderTextColor={colors.text.light}
                        keyboardType="phone-pad"
                        maxLength={9}
                    />
                </View>
                <Text style={styles.inputHint}>
                    Enter the phone number registered with M-PESA
                </Text>
            </View>

            <View style={styles.paymentSummary}>
                <Text style={styles.summaryTitle}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Plan:</Text>
                    <Text style={styles.summaryValue}>{plan.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Period:</Text>
                    <Text style={styles.summaryValue}>
                        {billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                    </Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={styles.summaryValue}>KES {getTotalAmount().toLocaleString()}</Text>
                </View>
                {plan.discount && (
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount:</Text>
                        <Text style={[styles.summaryValue, { color: colors.success }]}>
                            {plan.discount}% OFF
                        </Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>KES {getTotalAmount().toLocaleString()}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.payButton}
                onPress={handleMpesaPayment}
                disabled={loading || !phoneNumber}
            >
                <FontAwesome5 name="mobile-alt" size={20} color={colors.white} />
                <Text style={styles.payButtonText}>
                    {isUpgrade ? 'Upgrade with M-PESA' : 'Pay with M-PESA'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderStripeForm = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
                {isUpgrade ? 'Card Payment Upgrade' : 'Card Payment Details'}
            </Text>

            <CardPaymentForm
                onCardValid={handleCardValid}
                onCardInvalid={handleCardInvalid}
            />

            <View style={styles.paymentSummary}>
                <Text style={styles.summaryTitle}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Plan:</Text>
                    <Text style={styles.summaryValue}>{plan.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Period:</Text>
                    <Text style={styles.summaryValue}>
                        {billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                    </Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={styles.summaryValue}>KES {getTotalAmount().toLocaleString()}</Text>
                </View>
                {plan.discount && (
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discount:</Text>
                        <Text style={[styles.summaryValue, { color: colors.success }]}>
                            {plan.discount}% OFF
                        </Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>KES {getTotalAmount().toLocaleString()}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.payButton, !isCardValid && styles.payButtonDisabled]}
                onPress={handleStripeFormSubmit}
                disabled={loading || !isCardValid}
            >
                <MaterialCommunityIcons name="credit-card" size={20} color={colors.white} />
                <Text style={styles.payButtonText}>
                    {isUpgrade ? 'Upgrade with Card' : 'Pay with Card'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderProcessing = () => (
        <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>
                Processing Payment...
            </Text>
            <Text style={styles.processingSubtitle}>
                Please wait while we process your {selectedPaymentMethod === 'mpesa' ? 'M-PESA' : 'card'} payment
            </Text>

            {selectedPaymentMethod === 'mpesa' && (
                <View style={styles.mpesaInstructions}>
                    <Text style={styles.instructionsTitle}>M-PESA Instructions:</Text>
                    <Text style={styles.instructionText}>1. Check your phone for M-PESA prompt</Text>
                    <Text style={styles.instructionText}>2. Enter your M-PESA PIN</Text>
                    <Text style={styles.instructionText}>3. Confirm the payment</Text>
                </View>
            )}
        </View>
    );

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
                        {isUpgrade ? 'Upgrade Payment' : 'Payment'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {paymentStep === 'method' && renderPaymentMethodSelection()}
                {paymentStep === 'details' && renderMpesaDetails()}
                {paymentStep === 'stripe-form' && renderStripeForm()}
                {paymentStep === 'processing' && renderProcessing()}
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
    section: {
        marginVertical: spacing.lg,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    phoneInputContainer: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    phoneInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.text.light,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    countryCode: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginRight: spacing.sm,
    },
    phoneInput: {
        flex: 1,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        paddingVertical: spacing.sm,
    },
    inputHint: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    paymentSummary: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
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
        fontWeight: '600',
        color: colors.text.primary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    totalLabel: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    totalValue: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    payButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
    },
    payButtonDisabled: {
        backgroundColor: colors.text.light,
        opacity: 0.6,
    },
    payButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    processingTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    processingSubtitle: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    mpesaInstructions: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginTop: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    instructionsTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    instructionText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    cardFormContainer: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    cardInput: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: spacing.md,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.text.light,
    },
    row: {
        flexDirection: 'row',
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        padding: spacing.sm,
        borderRadius: 8,
        marginTop: spacing.sm,
    },
    securityText: {
        fontSize: fonts.size.sm,
        color: colors.success,
        marginLeft: spacing.sm,
        flex: 1,
    },
});

export default PaymentScreen;

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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PaymentMethodCard from '../components/common/PaymentMethodCard';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface SubscriptionTrialScreenProps {
    route: {
        params: {
            userType: 'transporter' | 'broker';
            userId: string;
        };
    };
}

const SubscriptionTrialScreen: React.FC<SubscriptionTrialScreenProps> = ({ route }) => {
    const navigation = useNavigation();
    const { userType, userId } = route.params;

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleActivateTrial = async () => {
        if (!selectedPaymentMethod) {
            Alert.alert('Payment Method Required', 'Please select a payment method to activate your trial.');
            return;
        }

        setLoading(true);
        try {
            // TODO: Integrate with backend to activate trial subscription
            // This should create a trial subscription record and set expiry date

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            Alert.alert(
                'Trial Activated! 🎉',
                `Your 30-day trial has been activated successfully! You now have access to all ${userType} features.`,
                [
                    {
                        text: 'Continue',
                        onPress: () => {
                            // Navigate to appropriate dashboard
                            if (userType === 'transporter') {
                                navigation.navigate('TransporterTabs');
                            } else {
                                navigation.navigate('BrokerTabs');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to activate trial. Please try again.');
        } finally {
            setLoading(false);
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
        } else {
            return [
                'Unlimited client requests',
                'Advanced consolidation tools',
                'Real-time tracking for all shipments',
                'Priority customer support',
                'Advanced analytics & insights',
                'Commission tracking',
                'Client management tools',
            ];
        }
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

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Welcome Section */}
                <View style={styles.welcomeCard}>
                    <View style={styles.welcomeIcon}>
                        <MaterialCommunityIcons
                            name="star-circle"
                            size={60}
                            color={colors.primary}
                        />
                    </View>
                    <Text style={styles.welcomeTitle}>
                        Congratulations! 🎉
                    </Text>
                    <Text style={styles.welcomeSubtitle}>
                        Your {userType} profile has been approved! Activate your 30-day free trial to access all premium features.
                    </Text>
                </View>

                {/* Trial Benefits */}
                <View style={styles.benefitsCard}>
                    <Text style={styles.sectionTitle}>What You'll Get</Text>
                    <Text style={styles.trialDuration}>
                        30 Days Free Trial
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
                </View>

                {/* Payment Method Selection */}
                <View style={styles.paymentCard}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <Text style={styles.paymentDescription}>
                        Add a payment method to activate your trial. You won't be charged until your trial ends.
                    </Text>

                    <PaymentMethodCard
                        selected={selectedPaymentMethod === 'card'}
                        onSelect={() => setSelectedPaymentMethod('card')}
                        type="card"
                        title="Credit/Debit Card"
                        subtitle="Visa, Mastercard, American Express"
                        icon="credit-card"
                    />

                    <PaymentMethodCard
                        selected={selectedPaymentMethod === 'mpesa'}
                        onSelect={() => setSelectedPaymentMethod('mpesa')}
                        type="mpesa"
                        title="M-Pesa"
                        subtitle="Mobile money payment"
                        icon="cellphone"
                    />
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
                            Your trial will automatically convert to a paid subscription after 30 days
                        </Text>
                    </View>
                    <View style={styles.noteItem}>
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={20}
                            color={colors.info}
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

            {/* Action Button */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[
                        styles.activateButton,
                        !selectedPaymentMethod && styles.activateButtonDisabled
                    ]}
                    onPress={handleActivateTrial}
                    disabled={!selectedPaymentMethod || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <MaterialCommunityIcons name="rocket-launch" size={20} color={colors.white} />
                    )}
                    <Text style={styles.activateButtonText}>
                        {loading ? 'Activating...' : 'Activate 30-Day Trial'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => {
                        Alert.alert(
                            'Skip Trial?',
                            'You can always activate your trial later from your profile settings.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Skip for Now',
                                    onPress: () => {
                                        if (userType === 'transporter') {
                                            navigation.navigate('TransporterTabs');
                                        } else {
                                            navigation.navigate('BrokerTabs');
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <Text style={styles.skipButtonText}>Skip for Now</Text>
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
});

export default SubscriptionTrialScreen;

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface SubscriptionExpiredScreenProps {
    route: {
        params: {
            userType: 'individual' | 'broker' | 'company';
            userId: string;
            expiredDate: string;
        };
    };
}

const SubscriptionExpiredScreen: React.FC<SubscriptionExpiredScreenProps> = ({ route }) => {
    const navigation = useNavigation();
    const { userType, userId, expiredDate } = route.params;

    const handleRenewSubscription = () => {
        if (userType === 'broker') {
            // Navigate to payment confirmation for brokers after subscription renewal
            navigation.navigate('PaymentConfirmation', {
                userType: 'broker',
                subscriptionType: 'renewal',
                expiredDate: expiredDate
            });
        } else {
            navigation.navigate('SubscriptionScreen', { userType });
        }
    };

    const handleContactSupport = () => {
        // TODO: Implement contact support functionality
        // This could open email, phone, or chat support
    };

    const getExpiredFeatures = () => {
        if (userType === 'transporter') {
            return [
                'Job request access',
                'Route optimization',
                'Real-time tracking',
                'Customer support',
                'Analytics & insights',
                'Insurance coverage',
                'Fleet management tools',
            ];
        } else {
            return [
                'Client request access',
                'Consolidation tools',
                'Real-time tracking',
                'Customer support',
                'Analytics & insights',
                'Commission tracking',
                'Client management tools',
            ];
        }
    };

    const formatExpiredDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'recently';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.error, colors.errorDark || colors.error]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons
                            name="alert-circle"
                            size={40}
                            color={colors.white}
                        />
                    </View>
                    <Text style={styles.headerTitle}>
                        Subscription Expired
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        Your access has been temporarily suspended
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusIcon}>
                        <MaterialCommunityIcons
                            name="clock-alert"
                            size={60}
                            color={colors.error}
                        />
                    </View>
                    <Text style={styles.statusTitle}>
                        Access Suspended
                    </Text>
                    <Text style={styles.statusDescription}>
                        Your {userType} subscription expired on {formatExpiredDate(expiredDate)}.
                        To continue using TRUKAPP services, please renew your subscription.
                    </Text>
                </View>

                {/* What You're Missing */}
                <View style={styles.missingCard}>
                    <Text style={styles.sectionTitle}>What You're Missing</Text>
                    <Text style={styles.missingDescription}>
                        Without an active subscription, you cannot access:
                    </Text>

                    <View style={styles.featuresList}>
                        {getExpiredFeatures().map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <MaterialCommunityIcons
                                    name="close-circle"
                                    size={20}
                                    color={colors.error}
                                />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Renewal Options */}
                <View style={styles.renewalCard}>
                    <Text style={styles.sectionTitle}>Renew Your Subscription</Text>
                    <Text style={styles.renewalDescription}>
                        Choose from our flexible subscription plans designed for {userType}s like you.
                    </Text>

                    <View style={styles.planHighlights}>
                        <View style={styles.planHighlight}>
                            <MaterialCommunityIcons
                                name="star"
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.planHighlightText}>
                                Flexible monthly and yearly plans
                            </Text>
                        </View>
                        <View style={styles.planHighlight}>
                            <MaterialCommunityIcons
                                name="shield-check"
                                size={24}
                                color={colors.success}
                            />
                            <Text style={styles.planHighlightText}>
                                Cancel anytime
                            </Text>
                        </View>
                        <View style={styles.planHighlight}>
                            <MaterialCommunityIcons
                                name="rocket"
                                size={24}
                                color={colors.warning}
                            />
                            <Text style={styles.planHighlightText}>
                                Instant access upon renewal
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Support Information */}
                <View style={styles.supportCard}>
                    <Text style={styles.sectionTitle}>Need Help?</Text>
                    <Text style={styles.supportDescription}>
                        Our support team is here to help you get back on track.
                    </Text>

                    <View style={styles.supportOptions}>
                        <TouchableOpacity
                            style={styles.supportOption}
                            onPress={handleContactSupport}
                        >
                            <MaterialCommunityIcons
                                name="message-text"
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.supportOptionText}>Chat Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.supportOption}
                            onPress={handleContactSupport}
                        >
                            <MaterialCommunityIcons
                                name="email"
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.supportOptionText}>Email Support</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.supportOption}
                            onPress={handleContactSupport}
                        >
                            <MaterialCommunityIcons
                                name="phone"
                                size={24}
                                color={colors.primary}
                            />
                            <Text style={styles.supportOptionText}>Call Support</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={styles.renewButton}
                    onPress={handleRenewSubscription}
                >
                    <MaterialCommunityIcons name="refresh" size={20} color={colors.white} />
                    <Text style={styles.renewButtonText}>
                        Renew Subscription
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactSupport}
                >
                    <MaterialCommunityIcons name="headset" size={20} color={colors.primary} />
                    <Text style={styles.contactButtonText}>Contact Support</Text>
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
        paddingTop: 20,
        paddingBottom: 30,
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    headerIcon: {
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: fonts.size.md,
        color: colors.white + 'CC',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    statusCard: {
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
    statusIcon: {
        marginBottom: spacing.md,
    },
    statusTitle: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    statusDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    missingCard: {
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
    missingDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 22,
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
    renewalCard: {
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
    renewalDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    planHighlights: {
        marginTop: spacing.md,
    },
    planHighlight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    planHighlightText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
        flex: 1,
    },
    supportCard: {
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
    supportDescription: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 22,
    },
    supportOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.md,
    },
    supportOption: {
        alignItems: 'center',
        padding: spacing.md,
    },
    supportOptionText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    actionContainer: {
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    renewButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    renewButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    contactButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
});

export default SubscriptionExpiredScreen;

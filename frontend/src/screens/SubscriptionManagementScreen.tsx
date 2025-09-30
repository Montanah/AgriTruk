import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

const SubscriptionManagementScreen: React.FC = () => {
    const navigation = useNavigation();
    const [currentPlan, setCurrentPlan] = useState({
        name: 'Professional',
        type: 'transporter',
        status: 'active',
        nextBilling: '2024-07-15',
        amount: 5000,
        period: 'monthly'
    });
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fetch company and subscription info
    React.useEffect(() => {
        const fetchSubscriptionInfo = async () => {
            try {
                const { getAuth } = require('firebase/auth');
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) return;

                const token = await user.getIdToken();
                
                // Check if this is a company transporter
                const companyResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/companies/transporter/${user.uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    const company = companyData[0] || companyData;
                    if (company?.id) {
                        setCompanyInfo(company);
                        
                        // Fetch subscription details
                        const subscriptionResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/companies/${company.id}/subscription`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (subscriptionResponse.ok) {
                            const subscriptionData = await subscriptionResponse.json();
                            setCurrentPlan(prev => ({
                                ...prev,
                                ...subscriptionData,
                                type: 'company'
                            }));
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching subscription info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptionInfo();
    }, []);

    const handleCancelSubscription = () => {
        Alert.alert(
            'Cancel Subscription',
            'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
            [
                { text: 'Keep Subscription', style: 'cancel' },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Subscription Cancelled', 'Your subscription will be cancelled at the end of the current billing period.');
                    }
                }
            ]
        );
    };

    const handleUpgradePlan = () => {
        // Show the subscription modal for upgrade
        // This would typically be handled by the parent component
        // For now, we'll navigate to the subscription screen
        navigation.navigate('SubscriptionScreen', {
            userType: currentPlan.type as 'transporter' | 'broker',
            isUpgrade: true
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
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Subscription Management</Text>
                        {companyInfo && (
                            <Text style={styles.companyName}>{companyInfo.companyName}</Text>
                        )}
                    </View>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Current Plan Card */}
                <View style={styles.currentPlanCard}>
                    <View style={styles.planHeader}>
                        <MaterialCommunityIcons name="crown" size={32} color={colors.primary} />
                        <View style={styles.planInfo}>
                            <Text style={styles.planName}>{currentPlan.name} Plan</Text>
                            <Text style={styles.planType}>
                                {currentPlan.type === 'transporter' ? 'Transporter' : 'Broker'} Account
                            </Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>

                    <View style={styles.planDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Billing Amount:</Text>
                            <Text style={styles.detailValue}>KES {currentPlan.amount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Billing Period:</Text>
                            <Text style={styles.detailValue}>
                                {currentPlan.period === 'monthly' ? 'Monthly' : 'Yearly'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Next Billing:</Text>
                            <Text style={styles.detailValue}>{currentPlan.nextBilling}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.upgradeButton]}
                        onPress={handleUpgradePlan}
                    >
                        <MaterialCommunityIcons name="arrow-up" size={20} color={colors.white} />
                        <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={handleCancelSubscription}
                    >
                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.error} />
                        <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                    </TouchableOpacity>
                </View>

                {/* Features */}
                <View style={styles.featuresCard}>
                    <Text style={styles.sectionTitle}>Your Plan Features</Text>
                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Unlimited job requests</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Advanced route optimization</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Priority customer support</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Real-time tracking</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                            <Text style={styles.featureText}>Advanced analytics & insights</Text>
                        </View>
                    </View>
                </View>

                {/* Billing History */}
                <View style={styles.billingCard}>
                    <Text style={styles.sectionTitle}>Billing History</Text>
                    <View style={styles.billingItem}>
                        <View style={styles.billingInfo}>
                            <Text style={styles.billingDate}>June 15, 2024</Text>
                            <Text style={styles.billingDescription}>{currentPlan.name} Plan - Monthly</Text>
                        </View>
                        <Text style={styles.billingAmount}>KES {currentPlan.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.billingItem}>
                        <View style={styles.billingInfo}>
                            <Text style={styles.billingDate}>May 15, 2024</Text>
                            <Text style={styles.billingDescription}>{currentPlan.name} Plan - Monthly</Text>
                        </View>
                        <Text style={styles.billingAmount}>KES {currentPlan.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.billingItem}>
                        <View style={styles.billingInfo}>
                            <Text style={styles.billingDate}>April 15, 2024</Text>
                            <Text style={styles.billingDescription}>{currentPlan.name} Plan - Monthly</Text>
                        </View>
                        <Text style={styles.billingAmount}>KES {currentPlan.amount.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Support */}
                <View style={styles.supportCard}>
                    <Text style={styles.sectionTitle}>Need Help?</Text>
                    <Text style={styles.supportText}>
                        Our support team is here to help you with any subscription-related questions.
                    </Text>
                    <TouchableOpacity style={styles.supportButton}>
                        <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
                        <Text style={styles.supportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
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
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    companyName: {
        fontSize: fonts.size.sm,
        color: colors.white,
        opacity: 0.8,
        marginTop: 2,
    },
    headerSpacer: {
        width: 44,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    currentPlanCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    planInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    planName: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    planType: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    statusText: {
        color: colors.white,
        fontSize: fonts.size.sm,
        fontWeight: 'bold',
    },
    planDetails: {
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
        paddingTop: spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    detailLabel: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
    },
    detailValue: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    actionButtons: {
        marginBottom: spacing.lg,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    upgradeButton: {
        backgroundColor: colors.primary,
    },
    upgradeButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    cancelButton: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.error,
    },
    cancelButtonText: {
        color: colors.error,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    featuresCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    featuresList: {
        marginBottom: spacing.md,
    },
    featureItem: {
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
    billingCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    billingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    billingInfo: {
        flex: 1,
    },
    billingDate: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    billingDescription: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    billingAmount: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.primary,
    },
    supportCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    supportText: {
        fontSize: fonts.size.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
    supportButtonText: {
        color: colors.primary,
        fontSize: fonts.size.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
});

export default SubscriptionManagementScreen;

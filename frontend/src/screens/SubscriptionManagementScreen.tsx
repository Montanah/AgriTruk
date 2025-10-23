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
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import subscriptionService from '../services/subscriptionService';
import { INDIVIDUAL_PLANS, BROKER_PLANS, COMPANY_FLEET_PLANS } from '../constants/subscriptionPlans';
import SubscriptionModal from '../components/TransporterService/SubscriptionModal';

const SubscriptionManagementScreen: React.FC = ({ route }: any) => {
    const navigation = useNavigation();
    const { subscriptionStatus, loading: subscriptionLoading } = useSubscriptionStatus();
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [companySubscription, setCompanySubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    
    // Get user type from route params or determine from context
    const getUserType = () => {
        // First check if userType is passed as a route parameter
        if (route?.params?.userType) {
            return route.params.userType;
        }
        // Check if user is a broker based on subscription status
        if (subscriptionStatus?.currentPlan?.userType === 'broker') {
            return 'broker';
        }
        // Check if user is a company transporter
        if (companyInfo?.id) {
            return 'company';
        }
        // Default to individual transporter
        return 'transporter';
    };
    
    const currentUserType = getUserType();
    const availablePlans = currentUserType === 'broker' ? BROKER_PLANS : 
                          currentUserType === 'company' ? COMPANY_FLEET_PLANS : 
                          INDIVIDUAL_PLANS;
    
    // Debug logging
    console.log('SubscriptionManagementScreen - currentUserType:', currentUserType);
    console.log('SubscriptionManagementScreen - availablePlans length:', availablePlans?.length);
    console.log('SubscriptionManagementScreen - companyInfo:', companyInfo);
    console.log('SubscriptionManagementScreen - companySubscription:', companySubscription);
    console.log('SubscriptionManagementScreen - subscriptionStatus:', subscriptionStatus);
    
    // Determine current plan based on subscription status
    const getCurrentPlan = () => {
        console.log('getCurrentPlan - subscriptionStatus:', subscriptionStatus);
        
        if (subscriptionStatus?.isTrialActive) {
            console.log('Using trial subscription');
            
            // Get trial features based on user type
            const getTrialFeatures = () => {
                if (currentUserType === 'company') {
                    return [
                        'Up to 3 drivers',
                        'Up to 3 vehicles',
                        'Unlimited bookings',
                        'Full app access',
                        'Basic reporting',
                        '24/7 support'
                    ];
                } else if (currentUserType === 'broker') {
                    return [
                        'Up to 5 clients',
                        'Unlimited bookings',
                        'Basic analytics',
                        'Email support',
                        'Mobile app access'
                    ];
                } else {
                    return [
                        'Up to 2 vehicles',
                        'Unlimited bookings',
                        'Basic tracking',
                        'Email support',
                        'Mobile app access'
                    ];
                }
            };
            
            return {
                name: 'Free Trial',
                type: currentUserType,
                status: 'trial',
                nextBilling: subscriptionStatus.daysRemaining ? 
                    `${subscriptionStatus.daysRemaining} days remaining` : 'N/A',
                amount: 0,
                period: 'trial',
                features: getTrialFeatures()
            };
        } else if (subscriptionStatus?.hasActiveSubscription && subscriptionStatus?.currentPlan) {
            console.log('Using active subscription:', subscriptionStatus.currentPlan);
            
            // Calculate next billing date from subscription data
            let nextBilling = 'N/A';
            if (subscriptionStatus.subscription?.endDate) {
                try {
                    // Handle Firebase timestamp or regular date
                    const endDate = subscriptionStatus.subscription.endDate.toDate ? 
                        subscriptionStatus.subscription.endDate.toDate() : 
                        new Date(subscriptionStatus.subscription.endDate);
                    nextBilling = endDate.toLocaleDateString();
                } catch (e) {
                    console.warn('Error parsing end date:', e);
                    nextBilling = subscriptionStatus.daysRemaining ? 
                        `${subscriptionStatus.daysRemaining} days remaining` : 'N/A';
                }
            } else if (subscriptionStatus.daysRemaining) {
                nextBilling = `${subscriptionStatus.daysRemaining} days remaining`;
            }
            
            return {
                name: subscriptionStatus.currentPlan.name || subscriptionStatus.currentPlan || 'Professional Plan',
                type: currentUserType,
                status: subscriptionStatus.subscriptionStatus || 'active',
                nextBilling: nextBilling,
                amount: subscriptionStatus.currentPlan.price || 0,
                period: subscriptionStatus.currentPlan.duration ? 
                    `${subscriptionStatus.currentPlan.duration} days` : 'monthly',
                features: subscriptionStatus.currentPlan.features || []
            };
        } else {
            console.log('No active subscription found');
            // No active subscription
            return {
                name: 'No Active Plan',
                type: currentUserType,
                status: 'inactive',
                nextBilling: 'N/A',
                amount: 0,
                period: 'none',
                features: []
            };
        }
    };
    
    const currentPlan = getCurrentPlan();

    // Fetch company info for display purposes
    React.useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const { getAuth } = require('firebase/auth');
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) return;

                const token = await user.getIdToken();
                console.log('Fetching company info for user:', user.uid);
                
                // Check if this is a company transporter (for display purposes only)
                const companyResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://agritruk.onrender.com'}/api/companies/transporter/${user.uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                console.log('Company response status:', companyResponse.status);
                
                if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    console.log('Company data received:', companyData);
                    
                    const company = companyData[0] || companyData;
                    if (company?.id) {
                        setCompanyInfo(company);
                        console.log('Company info set:', company);
                    }
                } else {
                    console.log('No company data found or user is not a company transporter');
                }
            } catch (error) {
                console.error('Error fetching company info:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyInfo();
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
        console.log('Opening subscription modal for user type:', currentUserType);
        console.log('Available plans:', availablePlans);
        setShowSubscriptionModal(true);
    };

    const handleSubscribe = (planData: any) => {
        navigation.navigate('PaymentScreen', {
            plan: planData,
            userType: currentUserType,
            billingPeriod: planData.period,
            isUpgrade: currentPlan.status !== 'inactive'
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

            <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Current Plan Card */}
                <View style={styles.currentPlanCard}>
                    <View style={styles.planHeader}>
                        <MaterialCommunityIcons name="crown" size={32} color={colors.primary} />
                        <View style={styles.planInfo}>
                            <Text style={styles.planName}>{currentPlan.name} Plan</Text>
                            <Text style={styles.planType}>
                                {currentPlan.type === 'broker' ? 'Broker' : 
                                 currentPlan.type === 'company' ? 'Company' : 'Transporter'} Account
                            </Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: currentPlan.status === 'trial' ? colors.success : 
                                             currentPlan.status === 'active' ? colors.primary : 
                                             colors.error }
                        ]}>
                            <Text style={styles.statusText}>
                                {currentPlan.status === 'trial' ? 'Trial' :
                                 currentPlan.status === 'active' ? 'Active' :
                                 currentPlan.status === 'inactive' ? 'Inactive' : 'Unknown'}
                            </Text>
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
                                {currentPlan.period === 'trial' ? 'Trial' :
                                 currentPlan.period === 'monthly' ? 'Monthly' : 
                                 currentPlan.period === 'yearly' ? 'Yearly' : 'N/A'}
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
                        {currentPlan.features && currentPlan.features.length > 0 ? (
                            currentPlan.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noFeaturesText}>No features available for this plan</Text>
                        )}
                    </View>
                </View>

                {/* Billing History */}
                <View style={styles.billingCard}>
                    <Text style={styles.sectionTitle}>Billing History</Text>
                    <View style={styles.billingItem}>
                        <View style={styles.billingInfo}>
                            <Text style={styles.billingDate}>No billing history available</Text>
                            <Text style={styles.billingDescription}>Billing history will appear here once payments are processed</Text>
                        </View>
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

            {/* Subscription Modal */}
            <SubscriptionModal
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                onClose={() => setShowSubscriptionModal(false)}
                onSubscribe={handleSubscribe}
                userType={currentUserType}
                isUpgrade={currentPlan.status !== 'inactive'}
                visible={showSubscriptionModal}
            />
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
    scrollContent: {
        paddingBottom: spacing.xl * 2, // Extra padding to prevent button cutoff
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
    noFeaturesText: {
        color: colors.text.secondary,
        fontSize: fonts.size.md,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
});

export default SubscriptionManagementScreen;

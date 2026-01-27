import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';

interface FleetPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  driverLimit: number;
  features: string[];
  popular?: boolean;
  enterprise?: boolean;
  savings?: string;
}

const FLEET_PLANS: FleetPlan[] = [
  {
    id: 'basic',
    name: 'Basic Fleet',
    price: 999,
    currency: 'KES',
    period: 'month',
    driverLimit: 5,
    features: [
      'Up to 5 drivers',
      'Full app access for all drivers',
      'Unlimited bookings',
      'Central company dashboard',
      '24/7 support',
      'Basic reporting',
    ],
  },
  {
    id: 'growing',
    name: 'Growing Fleet',
    price: 1499,
    currency: 'KES',
    period: 'month',
    driverLimit: 15,
    popular: true,
    savings: 'Save 20% per driver',
    features: [
      'Up to 15 drivers',
      'Save 20% per driver',
      'Everything in Basic, plus:',
      'Priority booking alerts',
      'Advanced analytics dashboard',
      'Driver performance tracking',
      'Route optimization',
      'Dedicated account manager',
      'Access to Driver Job Board',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited Fleet',
    price: 2999,
    currency: 'KES',
    period: 'month',
    driverLimit: -1, // -1 means unlimited
    enterprise: true,
    savings: 'Maximum savings',
    features: [
      'Unlimited drivers',
      'Maximum savings',
      'Everything in Growing, plus:',
      'Custom integrations (API access)',
      'White-label solutions',
      'Advanced security features',
      'Multi-location management',
      '24/7 premium phone support',
      'Custom training sessions',
    ],
  },
];

export default function CompanyFleetPlansScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a fleet plan to continue.');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement subscription logic
      // This would typically involve:
      // 1. Create subscription with selected plan
      // 2. Process payment
      // 3. Update company subscription status
      // 4. Navigate to success screen or company dashboard

      Alert.alert(
        'Subscription Started',
        `You have successfully subscribed to the ${FLEET_PLANS.find((p) => p.id === selectedPlan)?.name} plan. You can now add drivers according to your plan limits.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (plan: FleetPlan) => {
    const isSelected = selectedPlan === plan.id;
    const isUnlimited = plan.driverLimit === -1;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          plan.popular && styles.planCardPopular,
          plan.enterprise && styles.planCardEnterprise,
        ]}
        onPress={() => handlePlanSelect(plan.id)}
        activeOpacity={0.8}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>POPULAR</Text>
          </View>
        )}

        {plan.enterprise && (
          <View style={styles.enterpriseBadge}>
            <Text style={styles.enterpriseBadgeText}>ENTERPRISE</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currency}>{plan.currency}</Text>
            <Text style={styles.price}>{plan.price.toLocaleString()}</Text>
            <Text style={styles.period}>/{plan.period}</Text>
          </View>
          {plan.savings && <Text style={styles.savingsText}>{plan.savings}</Text>}
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={colors.success}
                style={styles.featureIcon}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.driverLimitContainer}>
          <Text style={styles.driverLimitText}>
            {isUnlimited ? 'Unlimited drivers' : `Up to ${plan.driverLimit} drivers`}
          </Text>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Fleet Plan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Free Trial Info */}
        <View style={styles.trialInfoCard}>
          <MaterialCommunityIcons name="gift" size={32} color={colors.primary} />
          <Text style={styles.trialTitle}>90-Day Free Trial</Text>
          <Text style={styles.trialDescription}>
            Start with up to 3 vehicles and 3 drivers. All plans include unlimited access to the
            Driver Job Board.
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>{FLEET_PLANS.map(renderPlanCard)}</View>

        {/* Driver Job Board Info */}
        <View style={styles.jobBoardInfo}>
          <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
          <Text style={styles.jobBoardTitle}>Driver Job Board Access</Text>
          <Text style={styles.jobBoardDescription}>
            All plans include unlimited access to browse and recruit from our pool of verified
            drivers.
          </Text>
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.subscribeButton, !selectedPlan && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan
                ? `Choose ${FLEET_PLANS.find((p) => p.id === selectedPlan)?.name}`
                : 'Select a Plan'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  trialInfoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  trialTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  trialDescription: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  plansContainer: {
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    position: 'relative',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planCardSelected: {
    borderColor: colors.primary,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  planCardPopular: {
    borderColor: colors.warning,
  },
  planCardEnterprise: {
    borderColor: colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: spacing.lg,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
  },
  enterpriseBadge: {
    position: 'absolute',
    top: -8,
    right: spacing.lg,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  enterpriseBadgeText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  currency: {
    fontSize: fonts.size.lg,
    color: colors.text.secondary,
    marginRight: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  period: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  savingsText: {
    fontSize: fonts.size.sm,
    color: colors.success,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: fonts.size.md,
    color: colors.text.primary,
    lineHeight: 20,
  },
  driverLimitContainer: {
    backgroundColor: colors.background.light,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  driverLimitText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  jobBoardInfo: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  jobBoardTitle: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  jobBoardDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: colors.text.light,
  },
  subscribeButtonText: {
    color: colors.white,
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
  },
});

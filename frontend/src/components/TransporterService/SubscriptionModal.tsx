import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import colors from '../../constants/colors';
import { INDIVIDUAL_PLANS, BROKER_PLANS, COMPANY_FLEET_PLANS } from '../../constants/subscriptionPlans';

const SubscriptionModal = ({ selectedPlan, setSelectedPlan, onClose, onSubscribe, userType = 'transporter', isUpgrade = false, visible = true }) => {
  const navigation = useNavigation();
  const { height: screenHeight } = Dimensions.get('window');

  // Use proper subscription plans based on user type
  const plans = userType === 'broker' ? BROKER_PLANS : 
                userType === 'company' ? COMPANY_FLEET_PLANS : 
                INDIVIDUAL_PLANS;

  const handleSubscribe = () => {
    if (!selectedPlan) {
      // Show error or alert
      return;
    }

    // Find the selected plan from the proper plans
    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) {
      console.error('Selected plan not found:', selectedPlan);
      return;
    }

    // Create a plan object that matches the expected format
    const planData = {
      id: selectedPlanData.id,
      name: selectedPlanData.name,
      price: selectedPlanData.price,
      period: selectedPlanData.period,
      features: selectedPlanData.features
    };

    onClose();

    // Use the onSubscribe callback if provided, otherwise navigate directly
    if (onSubscribe) {
      onSubscribe(planData);
    } else {
      navigation.navigate('PaymentScreen', {
        plan: planData,
        userType,
        billingPeriod: selectedPlanData.period,
        isUpgrade
      });
    }
  };

  return (
    <Modal transparent animationType="slide" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.container, { height: screenHeight * 0.95 }]}>
          {/* Header with colored background */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {isUpgrade ? 'Upgrade Plan' : 'Choose Plan'}
              </Text>
              <Text style={styles.subtitle}>
                {isUpgrade ? 'Select your new plan' : 'Select the best plan for you'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Plans Container - Fixed height with scroll */}
          <View style={styles.plansWrapper}>
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.plansContainer}>
                {plans && plans.length > 0 ? plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                        plan.popular && styles.popularPlan,
                        { borderColor: isSelected ? colors.secondary : colors.surface, shadowColor: isSelected ? colors.secondary : colors.black },
                      ]}
                      activeOpacity={0.92}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}
                      <View style={styles.planHeader}>
                        <Text style={[styles.planLabel, { color: isSelected ? colors.secondary : colors.primary }]}>{plan.name}</Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.secondary} style={{ marginLeft: 6 }} />}
                      </View>
                      <Text style={[styles.planPrice, { color: isSelected ? colors.secondary : colors.text.primary }]}>
                        KES {plan.price.toLocaleString()}
                        <Text style={{ color: colors.text.secondary, fontSize: 16 }}>
                          / {plan.period}
                        </Text>
                      </Text>
                      <View style={styles.featureList}>
                        {plan.features.map((feature, i) => (
                          <View key={i} style={styles.featureRow}>
                            <Ionicons name="checkmark" size={18} color={isSelected ? colors.secondary : colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.featureText, { color: isSelected ? colors.secondary : colors.text.secondary }]}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                }) : (
                  <View style={styles.noPlansContainer}>
                    <Text style={styles.noPlansText}>No subscription plans available at the moment.</Text>
                    <Text style={styles.noPlansSubtext}>Please try again later or contact support.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Action Buttons - Fixed at bottom */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubscribe}
              style={[styles.subscribeBtn, !selectedPlan && styles.subscribeBtnDisabled]}
              disabled={!selectedPlan}
            >
              <Text style={styles.subscribeText}>
                {isUpgrade ? 'Upgrade Plan' : 'Activate Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SubscriptionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  plansWrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  plansContainer: {
    paddingBottom: 20,
  },

  planCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 2,
    marginVertical: 8,
    padding: 24,
    minHeight: 180,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  planCardSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.3,
    elevation: 12,
    transform: [{ scale: 1.03 }],
  },
  popularPlan: {
    borderColor: colors.primary,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -60,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 25,
    zIndex: 1,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  popularText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    flex: 1,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  featureList: {
    marginTop: 12,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
    gap: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    minHeight: 90,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    minHeight: 56,
  },
  subscribeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 18,
    paddingVertical: 20,
    shadowColor: colors.secondary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 56,
  },
  subscribeBtnDisabled: {
    backgroundColor: colors.text.light,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelText: {
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 18,
  },
  subscribeText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  noPlansContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noPlansText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  noPlansSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

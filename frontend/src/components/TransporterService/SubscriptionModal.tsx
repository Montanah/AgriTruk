import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../constants/colors';
import { transporterPlans } from '../../constants/subscriptionPlans';

const SubscriptionModal = ({ selectedPlan, setSelectedPlan, onClose, onSubscribe, userType = 'transporter', isUpgrade = false, visible = true }) => {
  const navigation = useNavigation();
  

  // Use proper subscription plans from constants
  const plans = transporterPlans;

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
        <View style={styles.container}>
          <Text style={styles.title}>
            {isUpgrade ? 'Upgrade Your Subscription' : 'Choose Your Subscription'}
          </Text>
          <Text style={styles.subtitle}>
            {isUpgrade ? 'Select a plan to upgrade to' : 'Flexible plans for every business. Select the best fit for you.'}
          </Text>

          <View style={styles.plansContainer}>
            {plans.map((plan) => {
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
                    <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                      / {plan.period}
                    </Text>
                  </Text>
                  <View style={styles.featureList}>
                    {plan.features.map((feature, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="checkmark" size={16} color={isSelected ? colors.secondary : colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.featureText, { color: isSelected ? colors.secondary : colors.text.secondary }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

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
                {isUpgrade ? 'Upgrade' : 'Subscribe'}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  plansContainer: {
    marginVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    marginVertical: 8,
    padding: 18,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardSelected: {
    backgroundColor: '#eafff2',
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOpacity: 0.18,
    elevation: 6,
  },
  popularPlan: {
    borderColor: colors.primary,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -50,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  popularText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  planLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 2,
  },
  featureList: {
    marginTop: 4,
    marginBottom: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 14,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.text.light,
    marginRight: 8,
  },
  subscribeBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
  subscribeBtnDisabled: {
    backgroundColor: colors.text.light,
    opacity: 0.6,
  },
  cancelText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subscribeText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

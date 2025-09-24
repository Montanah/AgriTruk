import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../constants/colors';

const SubscriptionModal = ({ selectedPlan, setSelectedPlan, onClose, onSubscribe, userType = 'transporter', isUpgrade = false }) => {
  const navigation = useNavigation();

  // Original plans as they were
  const originalPlans = [
    { key: 'monthly', label: 'Monthly', price: 199, features: ['Billed every month', 'Cancel anytime', 'Full access to features'] },
    { key: 'quarterly', label: 'Quarterly', price: 499, features: ['Save Ksh 98', 'Billed every 3 months', 'Priority support'] },
    { key: 'annual', label: 'Annual', price: 1599, features: ['Save Ksh 789', 'Billed yearly', 'Best value', 'Premium support'] },
  ];

  const handleSubscribe = () => {
    if (!selectedPlan) {
      // Show error or alert
      return;
    }

    // Create a plan object that matches the expected format
    const planData = {
      id: selectedPlan,
      name: originalPlans.find(p => p.key === selectedPlan)?.label || 'Plan',
      price: originalPlans.find(p => p.key === selectedPlan)?.price || 0,
      period: 'monthly' as const,
      features: originalPlans.find(p => p.key === selectedPlan)?.features || []
    };

    onClose();

    // Use the onSubscribe callback if provided, otherwise navigate directly
    if (onSubscribe) {
      onSubscribe(planData);
    } else {
      navigation.navigate('PaymentScreen', {
        plan: planData,
        userType,
        billingPeriod: 'monthly',
        isUpgrade
      });
    }
  };

  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {isUpgrade ? 'Upgrade Your Subscription' : 'Choose Your Subscription'}
          </Text>
          <Text style={styles.subtitle}>
            {isUpgrade ? 'Select a plan to upgrade to' : 'Flexible plans for every business. Select the best fit for you.'}
          </Text>

          <View style={styles.plansContainer}>
            {originalPlans.map((plan) => {
              const isSelected = selectedPlan === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    { borderColor: isSelected ? colors.secondary : colors.surface, shadowColor: isSelected ? colors.secondary : colors.black },
                  ]}
                  activeOpacity={0.92}
                  onPress={() => setSelectedPlan(plan.key)}
                >
                  <View style={styles.planHeader}>
                    <Text style={[styles.planLabel, { color: isSelected ? colors.secondary : colors.primary }]}>{plan.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.secondary} style={{ marginLeft: 6 }} />}
                  </View>
                  <Text style={[styles.planPrice, { color: isSelected ? colors.secondary : colors.text.primary }]}>
                    Ksh {plan.price}
                    <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                      / {plan.key === 'monthly' ? 'month' : plan.key === 'quarterly' ? '3 months' : 'year'}
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

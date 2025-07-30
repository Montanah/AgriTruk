import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const plans = [
  { key: 'monthly', label: 'Monthly', price: 199 },
  { key: 'quarterly', label: 'Quarterly', price: 499 },
  { key: 'annual', label: 'Annual', price: 1599 },
];

const SubscriptionModal = ({ selectedPlan, setSelectedPlan, onClose, onSubscribe }) => {
  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose a Plan</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.key}
              style={[
                styles.planButton,
                selectedPlan === plan.key && styles.selected,
              ]}
              onPress={() => setSelectedPlan(plan.key)}
            >
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planPrice}>Ksh {plan.price} / {plan.key === 'monthly' ? 'month' : plan.key === 'quarterly' ? '3 months' : 'year'}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.actionButton}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSubscribe} style={styles.actionButton}>
              <Text style={styles.subscribe}>Subscribe</Text>
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
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planButton: {
    padding: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginVertical: 6,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: '#f0f0f0',
    borderColor: '#333',
  },
  planLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 15,
    color: '#555',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  cancel: {
    color: 'red',
    fontWeight: '600',
  },
  subscribe: {
    color: 'green',
    fontWeight: '600',
  },
});

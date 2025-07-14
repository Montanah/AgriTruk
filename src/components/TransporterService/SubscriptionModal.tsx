import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const plans = ['monthly', '6 months', 'yearly'];

const SubscriptionModal = ({ selectedPlan, setSelectedPlan, onClose, onSubscribe }) => {
  return (
    <Modal transparent animationType="slide" visible>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose a Plan</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[
                styles.planButton,
                selectedPlan === plan && styles.selected,
              ]}
              onPress={() => setSelectedPlan(plan)}
            >
              <Text style={styles.planText}>{plan.toUpperCase()}</Text>
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
  planText: {
    fontSize: 16,
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

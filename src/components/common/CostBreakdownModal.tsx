import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { formatCurrency, getCostBreakdownDescription } from '../../utils/costCalculator';
import type { CostBreakdown, PaymentBreakdown } from '../../utils/costCalculator';

interface CostBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  costBreakdown: CostBreakdown;
  paymentBreakdown: PaymentBreakdown;
  title?: string;
}

const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({
  visible,
  onClose,
  costBreakdown,
  paymentBreakdown,
  title = 'Cost Breakdown',
}) => {
  const descriptions = getCostBreakdownDescription(costBreakdown);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Cost Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transportation Costs</Text>
              {descriptions.map((description, index) => (
                <View key={index} style={styles.costItem}>
                  <Text style={styles.costDescription}>{description}</Text>
                </View>
              ))}
            </View>

            {/* Subtotal */}
            <View style={styles.section}>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal (Transportation)</Text>
                <Text style={styles.subtotalAmount}>
                  {formatCurrency(costBreakdown.subtotal)}
                </Text>
              </View>
            </View>

            {/* Payment Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Distribution</Text>
              
              <View style={styles.paymentItem}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Transporter Receives</Text>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(paymentBreakdown.transporterReceives)}
                  </Text>
                </View>
                <Text style={styles.paymentDescription}>
                  Base fare, distance, weight, and feature surcharges
                </Text>
              </View>

              {paymentBreakdown.companyReceives > 0 && (
                <View style={styles.paymentItem}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Company Receives</Text>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(paymentBreakdown.companyReceives)}
                    </Text>
                  </View>
                  <Text style={styles.paymentDescription}>
                    Insurance fees (remitted to insurance company)
                  </Text>
                </View>
              )}
            </View>

            {/* Total */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Cost</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(paymentBreakdown.total)}
                </Text>
              </View>
            </View>

            {/* Note */}
            <View style={styles.noteSection}>
              <Text style={styles.noteText}>
                * Insurance fees are collected by the company and remitted to the insurance provider. 
                Transporters receive payment for transportation services only.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButtonLarge} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    minHeight: height * 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.family.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  costItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  costDescription: {
    fontSize: 14,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    fontSize: 16,
    fontFamily: fonts.family.semiBold,
    color: colors.text.primary,
  },
  subtotalAmount: {
    fontSize: 16,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  paymentItem: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: fonts.family.semiBold,
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  paymentDescription: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.light,
    fontStyle: 'italic',
  },
  totalSection: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: fonts.family.bold,
    color: colors.primary,
  },
  noteSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    fontFamily: fonts.family.regular,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeButtonLarge: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.family.semiBold,
  },
});

export default CostBreakdownModal;

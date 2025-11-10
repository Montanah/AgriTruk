/**
 * Dispute Detail Screen
 * View and manage a single dispute
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';
import { disputeService, Dispute } from '../services/disputeService';
// Simple date formatter
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

const DisputeDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { disputeId, action } = route.params as { disputeId: string; action?: string };
  
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDispute();
  }, [disputeId]);

  const loadDispute = async () => {
    try {
      setLoading(true);
      const data = await disputeService.getDispute(disputeId);
      setDispute(data);
    } catch (error: any) {
      console.error('Error loading dispute:', error);
      Alert.alert('Error', 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'resolved': return colors.success;
      case 'escalated': return colors.error;
      case 'in_progress': return colors.primary;
      case 'closed': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dispute...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Dispute not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dispute ID and Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.disputeId}>
              {dispute.disputeId || `DSP${dispute.id.substring(0, 6).toUpperCase()}`}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) + '20' }]}>
                <Text style={[styles.badgeText, { color: getPriorityColor(dispute.priority) }]}>
                  {dispute.priority}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(dispute.status) }]}>
                  {dispute.status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="file-document" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Booking ID:</Text>
            <Text style={styles.infoValue}>
              {dispute.booking?.readableId || dispute.bookingId}
            </Text>
          </View>
          {dispute.booking?.productType && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Product:</Text>
              <Text style={styles.infoValue}>{dispute.booking.productType}</Text>
            </View>
          )}
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{dispute.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{dispute.customer.phone}</Text>
          </View>
          {dispute.customer.email && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={20} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{dispute.customer.email}</Text>
            </View>
          )}
        </View>

        {/* Transporter Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transporter</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="truck" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{dispute.transporter.name}</Text>
          </View>
          {dispute.transporter.phone && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{dispute.transporter.phone}</Text>
            </View>
          )}
        </View>

        {/* Issue Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue</Text>
          <View style={styles.issueCard}>
            <Text style={styles.issueTitle}>{dispute.issue}</Text>
            <Text style={styles.issueDescription}>{dispute.description}</Text>
            <View style={styles.categoryBadge}>
              <MaterialCommunityIcons name="tag" size={14} color={colors.text.secondary} />
              <Text style={styles.categoryText}>{dispute.category.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Attachments */}
        {dispute.attachments && dispute.attachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dispute.attachments.map((attachment, index) => (
                <TouchableOpacity key={index} style={styles.attachmentCard}>
                  {attachment.type === 'image' ? (
                    <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
                  ) : (
                    <MaterialCommunityIcons name="file-document" size={40} color={colors.primary} />
                  )}
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Transporter Response */}
        {dispute.transporterResponse && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transporter Response</Text>
            <View style={styles.responseCard}>
              <Text style={styles.responseText}>{dispute.transporterResponse.message}</Text>
              <Text style={styles.responseDate}>
                {formatDate(dispute.transporterResponse.respondedAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Resolution */}
        {dispute.resolution && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.resolutionCard}>
              <Text style={styles.resolutionOutcome}>
                Outcome: {dispute.resolution.outcome.replace('_', ' ')}
              </Text>
              <Text style={styles.resolutionNotes}>{dispute.resolution.resolutionNotes}</Text>
              {dispute.resolution.refundAmount && (
                <Text style={styles.resolutionAmount}>
                  Refund: KES {dispute.resolution.refundAmount.toLocaleString()}
                </Text>
              )}
              {dispute.resolution.compensationAmount && (
                <Text style={styles.resolutionAmount}>
                  Compensation: KES {dispute.resolution.compensationAmount.toLocaleString()}
                </Text>
              )}
              <Text style={styles.resolutionDate}>
                Resolved: {formatDate(dispute.resolution.resolvedAt)}
              </Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Created</Text>
                <Text style={styles.timelineDate}>{formatDate(dispute.createdAt)}</Text>
              </View>
            </View>
            {dispute.escalatedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: colors.error }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Escalated</Text>
                  <Text style={styles.timelineDate}>{formatDate(dispute.escalatedAt)}</Text>
                </View>
              </View>
            )}
            {dispute.resolvedAt && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Resolved</Text>
                  <Text style={styles.timelineDate}>{formatDate(dispute.resolvedAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      {dispute.status === 'pending' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateDispute' as never, { disputeId: dispute.id, edit: true } as never)}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fonts.size.xl,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disputeId: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: fonts.size.xs,
    fontFamily: fonts.family.medium,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    minWidth: 80,
  },
  infoValue: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    flex: 1,
  },
  issueCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
  },
  issueTitle: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  issueDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    marginLeft: spacing.xs / 2,
    textTransform: 'capitalize',
  },
  attachmentCard: {
    width: 100,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  responseCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
  },
  responseText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  responseDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  resolutionCard: {
    backgroundColor: colors.success + '10',
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  resolutionOutcome: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.success,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  resolutionNotes: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  resolutionAmount: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  resolutionDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    marginTop: spacing.xs,
  },
  timeline: {
    marginTop: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    color: colors.text.primary,
  },
  timelineDate: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.bold,
    color: colors.white,
  },
});

export default DisputeDetailScreen;


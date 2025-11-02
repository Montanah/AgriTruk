/**
 * Consolidation Manager Component
 * Provides unified consolidation functionality for brokers and business users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { unifiedBookingService, UnifiedBooking, BookingFilters } from '../../services/unifiedBookingService';
import { getDisplayBookingId } from '../../utils/unifiedIdSystem';
import { getReadableLocationName } from '../../utils/locationUtils';
import { useConsolidations } from '../../context/ConsolidationContext';

interface ConsolidationManagerProps {
  userRole: 'broker' | 'business';
  visible: boolean;
  onClose: () => void;
  onConsolidationComplete?: (consolidatedBooking: UnifiedBooking) => void;
  clientId?: string; // For broker-specific client consolidation
}

interface ConsolidationPreview {
  totalRequests: number;
  totalWeight: number;
  totalValue: number;
  routes: string[];
  products: string[];
  urgency: 'low' | 'medium' | 'high';
  estimatedSavings: number;
}

const ConsolidationManager: React.FC<ConsolidationManagerProps> = ({
  userRole,
  visible,
  onClose,
  onConsolidationComplete,
  clientId,
}) => {
  const { consolidations: contextConsolidations } = useConsolidations();
  const [availableRequests, setAvailableRequests] = useState<UnifiedBooking[]>([]);
  const [consolidatedRequests, setConsolidatedRequests] = useState<UnifiedBooking[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationPreview, setConsolidationPreview] = useState<ConsolidationPreview | null>(null);

  useEffect(() => {
    if (visible) {
      loadAvailableRequests();
    }
  }, [visible, clientId]);

  useEffect(() => {
    if (selectedRequests.length > 0) {
      calculateConsolidationPreview();
    } else {
      setConsolidationPreview(null);
    }
  }, [selectedRequests, availableRequests]);

  const loadAvailableRequests = async () => {
    try {
      setLoading(true);
      
      // Convert consolidation context items to UnifiedBooking format
      const contextItems: UnifiedBooking[] = contextConsolidations.map((consolidation, index) => ({
        id: consolidation.id || `temp-consolidation-${index}`,
        readableId: consolidation.id,
        fromLocation: typeof consolidation.fromLocation === 'string' 
          ? consolidation.fromLocation 
          : consolidation.fromLocationAddress || 'Unknown',
        toLocation: typeof consolidation.toLocation === 'string' 
          ? consolidation.toLocation 
          : consolidation.toLocationAddress || 'Unknown',
        fromLocationAddress: typeof consolidation.fromLocation === 'string' 
          ? consolidation.fromLocation 
          : consolidation.fromLocationAddress,
        toLocationAddress: typeof consolidation.toLocation === 'string' 
          ? consolidation.toLocation 
          : consolidation.toLocationAddress,
        productType: consolidation.productType || 'N/A',
        weight: consolidation.weight || '0kg',
        estimatedValue: 0, // Will be calculated
        type: consolidation.type === 'agriTRUK' ? 'agri' : 'cargo',
        status: 'pending',
        isContextConsolidation: true, // Flag to identify context items
        createdAt: consolidation.date || new Date().toISOString(),
      }));
      
      // Load all bookings from backend (pending for consolidation + already consolidated)
      const filters: BookingFilters = {
        // Don't filter by status to get all bookings including consolidated ones
        clientId: clientId, // For broker client-specific consolidation
      };
      
      const allRequests = await unifiedBookingService.getBookings(userRole, filters);
      
      // Combine context consolidations with backend requests (avoid duplicates)
      const contextIds = new Set(contextItems.map(item => item.id));
      const backendAvailable = allRequests.filter(req => 
        !req.isConsolidated && 
        (req.status === 'pending' || !req.status) &&
        !contextIds.has(req.id) // Don't duplicate items already in context
      );
      
      // Separate available (pending, not consolidated) and already consolidated requests
      const availableRequests = [...contextItems, ...backendAvailable];
      const consolidatedRequests = allRequests.filter(req => req.isConsolidated);
      
      setAvailableRequests(availableRequests);
      setConsolidatedRequests(consolidatedRequests);
    } catch (error) {
      console.error('Error loading available requests:', error);
      // Even if backend fails, show context consolidations
      const contextItems: UnifiedBooking[] = contextConsolidations.map((consolidation, index) => ({
        id: consolidation.id || `temp-consolidation-${index}`,
        readableId: consolidation.id,
        fromLocation: typeof consolidation.fromLocation === 'string' 
          ? consolidation.fromLocation 
          : consolidation.fromLocationAddress || 'Unknown',
        toLocation: typeof consolidation.toLocation === 'string' 
          ? consolidation.toLocation 
          : consolidation.toLocationAddress || 'Unknown',
        fromLocationAddress: typeof consolidation.fromLocation === 'string' 
          ? consolidation.fromLocation 
          : consolidation.fromLocationAddress,
        toLocationAddress: typeof consolidation.toLocation === 'string' 
          ? consolidation.toLocation 
          : consolidation.toLocationAddress,
        productType: consolidation.productType || 'N/A',
        weight: consolidation.weight || '0kg',
        estimatedValue: 0,
        type: consolidation.type === 'agriTRUK' ? 'agri' : 'cargo',
        status: 'pending',
        isContextConsolidation: true,
        createdAt: consolidation.date || new Date().toISOString(),
      }));
      setAvailableRequests(contextItems);
      setConsolidatedRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateConsolidationPreview = () => {
    const selectedRequestsData = availableRequests.filter(req => 
      selectedRequests.includes(req.id)
    );

    if (selectedRequestsData.length < 2) {
      setConsolidationPreview(null);
      return;
    }

    const totalWeight = selectedRequestsData.reduce((sum, req) => {
      const weight = parseFloat(req.weight) || 0;
      return sum + weight;
    }, 0);

    const totalValue = selectedRequestsData.reduce((sum, req) => {
      return sum + (req.estimatedValue || 0);
    }, 0);

    const routes = [...new Set(selectedRequestsData.map(req => 
      `${getReadableLocationName(req.fromLocation)} → ${getReadableLocationName(req.toLocation)}`
    ))];

    const products = [...new Set(selectedRequestsData.map(req => req.productType))];

    const urgency = selectedRequestsData.some(req => req.urgency === 'high') ? 'high' : 
                   selectedRequestsData.some(req => req.urgency === 'medium') ? 'medium' : 'low';

    // Calculate estimated savings (typically 15-30% for consolidation)
    const estimatedSavings = totalValue * 0.2; // 20% savings estimate

    setConsolidationPreview({
      totalRequests: selectedRequestsData.length,
      totalWeight,
      totalValue,
      routes,
      products,
      urgency,
      estimatedSavings,
    });
  };

  const handleRequestSelection = (requestId: string) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleConsolidate = async () => {
    if (selectedRequests.length < 2) {
      Alert.alert('Error', 'Please select at least 2 requests to consolidate');
      return;
    }

    try {
      setConsolidating(true);
      
      const selectedRequestsData = availableRequests.filter(req => 
        selectedRequests.includes(req.id)
      );

      // Determine consolidation parameters
      const consolidationData = {
        fromLocation: selectedRequestsData[0].fromLocation,
        toLocation: selectedRequestsData[0].toLocation,
        productType: selectedRequestsData.length > 1 ? 'Mixed Products' : selectedRequestsData[0].productType,
        totalWeight: selectedRequestsData.reduce((sum, req) => {
          const weight = parseFloat(req.weight) || 0;
          return sum + weight;
        }, 0).toString(),
        urgency: consolidationPreview?.urgency || 'medium',
        description: `Consolidated request containing ${selectedRequestsData.length} individual requests`,
      };

      // Perform consolidation
      const consolidatedBooking = await unifiedBookingService.consolidateBookings(
        selectedRequests,
        consolidationData
      );

      Alert.alert(
        'Success',
        `Successfully consolidated ${selectedRequests.length} requests!`,
        [
          {
            text: 'OK',
            onPress: () => {
              onConsolidationComplete?.(consolidatedBooking);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error consolidating requests:', error);
      Alert.alert('Error', 'Failed to consolidate requests. Please try again.');
    } finally {
      setConsolidating(false);
    }
  };

  const renderRequestItem = ({ item }: { item: UnifiedBooking }) => {
    const isSelected = selectedRequests.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.requestItem, isSelected && styles.selectedRequestItem]}
        onPress={() => handleRequestSelection(item.id)}
      >
        <View style={styles.requestHeader}>
          <Text style={styles.requestId}>#{getDisplayBookingId(item)}</Text>
          <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
            {isSelected && (
              <MaterialCommunityIcons name="check" size={16} color={colors.white} />
            )}
          </View>
        </View>
        
        <View style={styles.requestDetails}>
          <View style={styles.routeInfo}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
            <Text style={styles.routeText}>
              {getReadableLocationName(item.fromLocation)} → {getReadableLocationName(item.toLocation)}
            </Text>
          </View>
          
          <View style={styles.productInfo}>
            <MaterialCommunityIcons name="package-variant" size={16} color={colors.secondary} />
            <Text style={styles.productText}>{item.productType}</Text>
            <Text style={styles.weightText}>{item.weight}</Text>
          </View>
          
          <View style={styles.valueInfo}>
            <MaterialCommunityIcons name="cash" size={16} color={colors.success} />
            <Text style={styles.valueText}>KES {item.estimatedValue?.toLocaleString() || 'N/A'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConsolidationPreview = () => {
    if (!consolidationPreview) return null;

    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Consolidation Preview</Text>
        
        <View style={styles.previewStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{consolidationPreview.totalRequests}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{consolidationPreview.totalWeight}kg</Text>
            <Text style={styles.statLabel}>Total Weight</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>KES {consolidationPreview.totalValue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>
        
        <View style={styles.savingsInfo}>
          <MaterialCommunityIcons name="trending-down" size={20} color={colors.success} />
          <Text style={styles.savingsText}>
            Estimated Savings: KES {consolidationPreview.estimatedSavings.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.routesInfo}>
          <Text style={styles.routesTitle}>Routes ({consolidationPreview.routes.length}):</Text>
          {consolidationPreview.routes.map((route, index) => (
            <Text key={index} style={styles.routeItem}>• {route}</Text>
          ))}
        </View>
        
        <View style={styles.productsInfo}>
          <Text style={styles.productsTitle}>Products ({consolidationPreview.products.length}):</Text>
          {consolidationPreview.products.map((product, index) => (
            <Text key={index} style={styles.productItem}>• {product}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Consolidate {userRole === 'broker' ? 'Client' : 'Business'} Requests
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading available requests...</Text>
              </View>
            ) : (
              <>
                <View style={styles.instructionsCard}>
                  <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                  <Text style={styles.instructionsText}>
                    Select multiple requests to consolidate them into a single transport request for cost savings and efficiency.
                  </Text>
                </View>

                <View style={styles.selectionInfo}>
                  <Text style={styles.selectionText}>
                    {selectedRequests.length} of {availableRequests.length} requests selected
                  </Text>
                  {selectedRequests.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearSelectionButton}
                      onPress={() => setSelectedRequests([])}
                    >
                      <Text style={styles.clearSelectionText}>Clear Selection</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {availableRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="package-variant" size={48} color={colors.text.light} />
                    <Text style={styles.emptyTitle}>No Available Requests</Text>
                    <Text style={styles.emptyText}>
                      There are no pending requests available for consolidation.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Available Requests for Consolidation ({availableRequests.length})</Text>
                    {availableRequests.length > 0 ? (
                      <FlatList
                        data={availableRequests}
                        renderItem={renderRequestItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                      />
                    ) : (
                      <View style={styles.emptyListContainer}>
                        <MaterialCommunityIcons name="package-variant-outline" size={32} color={colors.text.light} />
                        <Text style={styles.emptyListText}>No pending requests available for consolidation</Text>
                      </View>
                    )}

                    {renderConsolidationPreview()}

                    {consolidatedRequests.length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, styles.consolidatedSectionTitle]}>
                          Already Consolidated ({consolidatedRequests.length})
                        </Text>
                        <FlatList
                          data={consolidatedRequests}
                          renderItem={({ item }) => (
                            <View style={[styles.requestItem, styles.consolidatedItem]}>
                              <View style={styles.requestHeader}>
                                <Text style={styles.requestId}>#{getDisplayBookingId(item)}</Text>
                                <View style={styles.consolidatedBadge}>
                                  <MaterialCommunityIcons name="layers" size={12} color={colors.white} />
                                  <Text style={styles.consolidatedBadgeText}>Consolidated</Text>
                                </View>
                              </View>
                              
                              <View style={styles.requestDetails}>
                                <View style={styles.routeInfo}>
                                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
                                  <Text style={styles.routeText}>
                                    {getReadableLocationName(item.fromLocation)} → {getReadableLocationName(item.toLocation)}
                                  </Text>
                                </View>
                                
                                <View style={styles.productInfo}>
                                  <MaterialCommunityIcons name="package-variant" size={16} color={colors.secondary} />
                                  <Text style={styles.productText}>{item.productType}</Text>
                                  <Text style={styles.weightText}>{item.weight}</Text>
                                </View>
                                
                                {item.consolidatedRequests && Array.isArray(item.consolidatedRequests) && item.consolidatedRequests.length > 0 && (
                                  <View style={styles.consolidatedDetails}>
                                    <Text style={styles.consolidatedDetailsText}>
                                      Contains {item.consolidatedRequests.length} individual request{item.consolidatedRequests.length > 1 ? 's' : ''}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          )}
                          keyExtractor={(item) => item.id}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.consolidateButton,
                (selectedRequests.length < 2 || consolidating) && styles.disabledButton
              ]}
              onPress={handleConsolidate}
              disabled={selectedRequests.length < 2 || consolidating}
            >
              {consolidating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons name="layers" size={20} color={colors.white} />
              )}
              <Text style={styles.consolidateButtonText}>
                {consolidating ? 'Consolidating...' : `Consolidate (${selectedRequests.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '95%',
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.light,
  },
  modalTitle: {
    ...fonts.h3,
    color: colors.text.primary,
    flex: 1,
  },
  modalBody: {
    padding: 20,
    flexGrow: 1,
    flexShrink: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...fonts.body,
    color: colors.text.secondary,
    marginTop: 12,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionsText: {
    ...fonts.body,
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    ...fonts.h4,
    color: colors.text.primary,
    marginTop: 16,
  },
  emptyText: {
    ...fonts.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionText: {
    ...fonts.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  clearSelectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.light,
    borderRadius: 6,
  },
  clearSelectionText: {
    ...fonts.caption,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...fonts.h4,
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  consolidatedSectionTitle: {
    marginTop: 24,
    color: colors.secondary,
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyListText: {
    ...fonts.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  consolidatedItem: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary,
    borderWidth: 1,
    opacity: 0.8,
  },
  consolidatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  consolidatedBadgeText: {
    ...fonts.caption,
    color: colors.white,
    fontWeight: '600',
  },
  consolidatedDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background.light,
  },
  consolidatedDetailsText: {
    ...fonts.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  requestsList: {
    marginBottom: 16,
  },
  requestItem: {
    backgroundColor: colors.background.light,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRequestItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    ...fonts.bodyBold,
    color: colors.text.primary,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  requestDetails: {
    gap: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    ...fonts.body,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productText: {
    ...fonts.body,
    color: colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  weightText: {
    ...fonts.caption,
    color: colors.text.light,
  },
  valueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    ...fonts.body,
    color: colors.success,
    marginLeft: 8,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    ...fonts.h4,
    color: colors.text.primary,
    marginBottom: 12,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...fonts.h4,
    color: colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...fonts.caption,
    color: colors.text.secondary,
  },
  savingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  savingsText: {
    ...fonts.body,
    color: colors.success,
    marginLeft: 8,
    fontWeight: '600',
  },
  routesInfo: {
    marginBottom: 8,
  },
  routesTitle: {
    ...fonts.bodyBold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  routeItem: {
    ...fonts.caption,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  productsInfo: {
    marginBottom: 8,
  },
  productsTitle: {
    ...fonts.bodyBold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  productItem: {
    ...fonts.caption,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.background.light,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...fonts.body,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  consolidateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.text.light,
  },
  consolidateButtonText: {
    ...fonts.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ConsolidationManager;

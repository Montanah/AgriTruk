import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { getDisplayBookingId } from '../../utils/unifiedIdSystem';
import { PLACEHOLDER_IMAGES } from '../../constants/images';
import { apiRequest } from '../../utils/api';
import { getReadableLocationName, formatRoute } from '../../utils/locationUtils';
import { unifiedBookingService, UnifiedBooking, BookingFilters } from '../../services/unifiedBookingService';
// ConsolidationManager removed - consolidation is now done from RequestForm
import { formatCostRange, formatAverageCost } from '../../utils/costCalculator';

// Real API integration - no mock data

// Use UnifiedBooking interface from the service
type RequestItem = UnifiedBooking;

const BusinessManageScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('all'); // all, instant, booking
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedConsolidations, setExpandedConsolidations] = useState<Set<string>>(new Set()); // Track expanded consolidation groups

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Use unified booking service for consistent data handling
      const filters: BookingFilters = {
        // Add any specific filters for business requests
      };
      
      const bookings = await unifiedBookingService?.getBookings('business', filters);
      console.log('📦 [BusinessManageScreen] Business requests from unified service:', bookings);
      
      // Debug: Log vehicle, driver, and company data for accepted bookings
      bookings?.forEach((booking: any) => {
        if (['accepted', 'confirmed', 'assigned'].includes(booking.status?.toLowerCase())) {
          console.log('🚗 [BusinessManageScreen] Accepted booking details:', {
            id: booking.id,
            type: booking.type,
            status: booking.status,
            hasVehicle: !!booking.vehicle,
            hasDriver: !!booking.assignedDriver,
            hasCompany: !!booking.company,
            vehicle: booking.vehicle ? {
              id: booking.vehicle.id,
              registration: booking.vehicle.registration,
              capacity: booking.vehicle.capacity,
              make: booking.vehicle.make,
              hasPhoto: !!booking.vehicle.photo,
            } : null,
            assignedDriver: booking.assignedDriver ? {
              id: booking.assignedDriver.id,
              name: booking.assignedDriver.name,
              companyName: booking.assignedDriver.companyName,
            } : null,
            company: booking.company,
            transporter: booking.transporter ? {
              id: booking.transporter.id,
              name: booking.transporter.name,
              companyName: booking.transporter.companyName,
            } : null,
          });
        }
      });
      
      let allBookings = Array.isArray(bookings) ? bookings : [];
      
      // Group consolidated bookings by consolidationGroupId
      // Consolidation: multiple individual bookings with same consolidationGroupId
      const consolidationMap = new Map<string, any[]>();
      const nonConsolidated: any[] = [];
      
      allBookings.forEach((booking: any) => {
        if (booking.consolidationGroupId || (booking.consolidated === true && booking.consolidationGroupId)) {
          const groupId = booking.consolidationGroupId;
          if (!consolidationMap.has(groupId)) {
            consolidationMap.set(groupId, []);
          }
          consolidationMap.get(groupId)!.push(booking);
        } else {
          nonConsolidated.push(booking);
        }
      });
      
      // Create consolidation objects - one per group
      const consolidationObjects = Array.from(consolidationMap.entries()).map(([groupId, bookings]) => {
        // Calculate total cost range
        // Priority: estimatedCostRange > costRange > minCost/maxCost > estimatedCost/cost
        let totalMinCost = 0;
        let totalMaxCost = 0;
        
        bookings.forEach((booking: any) => {
          // Use backend estimatedCostRange if available (Mumbua's format)
          const minCost = booking.estimatedCostRange?.min || 
                         booking.costRange?.min || 
                         booking.minCost || 
                         booking.estimatedCost || 
                         booking.cost || 
                         0;
          const maxCost = booking.estimatedCostRange?.max || 
                        booking.costRange?.max || 
                        booking.maxCost || 
                        booking.estimatedCost || 
                        booking.cost || 
                        0;
          totalMinCost += minCost;
          totalMaxCost += maxCost;
        });
        
        return {
          id: groupId,
          bookingId: groupId,
          type: 'consolidated',
          isConsolidation: true,
          consolidationGroupId: groupId,
          consolidatedBookings: bookings,
          consolidatedRequests: bookings,
          totalBookings: bookings.length,
          totalCostRange: { min: totalMinCost, max: totalMaxCost },
          // Use first booking's details for summary display
          fromLocation: bookings[0]?.fromLocation,
          toLocation: bookings[bookings.length - 1]?.toLocation, // Use last dropoff
          status: bookings[0]?.status || 'pending',
          urgency: bookings[0]?.urgency || 'low',
          createdAt: bookings[0]?.createdAt,
          client: bookings[0]?.client,
          productType: 'Mixed Products',
          weight: bookings.reduce((sum: number, b: any) => {
            const weight = parseFloat(b.weight?.toString().replace('kg', '').trim() || '0') || 0;
            return sum + weight;
          }, 0).toString() + 'kg',
          // Use average cost for sorting and calculations
          cost: Math.round((totalMinCost + totalMaxCost) / 2),
          price: Math.round((totalMinCost + totalMaxCost) / 2),
          estimatedCost: Math.round((totalMinCost + totalMaxCost) / 2),
        };
      });
      
      // Combine consolidation objects with non-consolidated bookings
      allBookings = [...consolidationObjects, ...nonConsolidated];
      
      setRequests(allBookings);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRequests = () => {
    if (!Array.isArray(requests)) return [];
    if (activeTab === 'all') return requests;
    return requests.filter(req => req && req.type === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.primary;
      case 'in_transit': return colors.secondary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'check-circle-outline';
      case 'in_transit': return 'truck-delivery';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const handleTrackRequest = (request: RequestItem) => {
    if (!request) return;
    if (request.isConsolidated) {
      navigation?.navigate?.('TrackingScreen', {
        booking: request,
        isConsolidated: true,
        consolidatedRequests: request?.consolidatedRequests
      });
    } else {
      if (request.type === 'instant') {
        navigation?.navigate?.('TripDetailsScreen', {
          booking: {
            ...request,
            pickupLocation: request?.pickupLocation,
            toLocation: request?.toLocation
          },
          isInstant: true,
          userType: 'business'
        });
      } else {
        navigation?.navigate?.('TrackingScreen', {
          booking: request,
          isConsolidated: false
        });
      }
    }
  };

  const handleViewMap = (request: RequestItem) => {
    if (!request) return;
    navigation?.navigate?.('MapViewScreen', {
      booking: request,
      isConsolidated: request?.isConsolidated
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => {
    // Check if this is a consolidation object
    const isConsolidation = item.isConsolidation === true || item.type === 'consolidated';
    const isExpanded = isConsolidation && expandedConsolidations.has(item.consolidationGroupId || item.id);

    return (
    <Card style={[styles.requestCard, isConsolidation && styles.consolidationCard]}>
      <View style={styles.requestHeader}>
        <View style={styles.requestId}>
          {isConsolidation && (
            <View style={styles.consolidationHeaderBadge}>
              <MaterialCommunityIcons name="package-variant-closed" size={16} color={colors.primary} />
              <Text style={styles.consolidationHeaderText}>CONSOLIDATION</Text>
            </View>
          )}
          <Text style={[styles.requestIdText, isConsolidation && styles.consolidationIdText]} numberOfLines={1} ellipsizeMode="tail">
            {isConsolidation ? `Group ID: ${(item.consolidationGroupId || item.id).substring(0, 12)}...` : `#${getDisplayBookingId(item)}`}
          </Text>
          {isConsolidation && (
            <View style={styles.consolidatedBadge}>
              <MaterialCommunityIcons name="package-variant-closed" size={14} color={colors.white} />
              <Text style={styles.consolidatedText}>
                {item.totalBookings || item.consolidatedBookings?.length || 0} Bookings
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, isConsolidation && styles.consolidationStatusBadge]}>
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Consolidation Overview - Always show for consolidations */}
      {isConsolidation && (
        <View style={styles.consolidationOverview}>
          <View style={styles.consolidationSummary}>
            <View style={styles.consolidationIconContainer}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color={colors.primary} />
            </View>
            <View style={styles.consolidationSummaryText}>
              <Text style={styles.consolidationSummaryTitle}>
                {item.totalBookings || item.consolidatedBookings?.length || 0} Individual Bookings
              </Text>
              <Text style={styles.consolidationSummarySubtitle}>
                Multiple pickup and dropoff locations
              </Text>
            </View>
          </View>
          
          {/* Total Cost Range */}
          {item.totalCostRange && (
            <View style={styles.consolidationTotalCost}>
              <MaterialCommunityIcons name="calculator" size={18} color={colors.success} />
              <View style={styles.consolidationTotalCostInfo}>
                <Text style={styles.consolidationTotalCostLabel}>Total Cost</Text>
                <Text style={styles.consolidationTotalCostText}>
                  {formatCostRange({ costRange: item.totalCostRange })}
                </Text>
              </View>
            </View>
          )}
          
          {/* Expand/Collapse Button - More Prominent */}
          <TouchableOpacity
            style={[styles.expandButton, isExpanded && styles.expandButtonActive]}
            onPress={() => toggleConsolidationExpansion(item.consolidationGroupId || item.id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.white}
            />
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Hide Individual Bookings' : 'View Individual Bookings'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Individual Bookings - Shown when expanded */}
      {isConsolidation && isExpanded && item.consolidatedBookings && (
        <View style={styles.individualBookingsContainer}>
          <Text style={styles.individualBookingsTitle}>Individual Bookings:</Text>
          {item.consolidatedBookings.map((booking: any, index: number) => (
            <View key={booking.id || booking.bookingId || index} style={styles.individualBookingItem}>
              <View style={styles.individualBookingHeader}>
                <Text style={styles.individualBookingNumber}>Booking {index + 1}</Text>
                <Text style={styles.individualBookingId}>
                  #{getDisplayBookingId({
                    ...booking,
                    bookingType: booking.bookingType || booking.type,
                    bookingMode: booking.bookingMode || (booking.type === 'instant' ? 'instant' : 'booking')
                  })}
                </Text>
              </View>
              <View style={styles.individualBookingDetails}>
                <View style={styles.individualBookingRow}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={colors.primary} />
                  <Text style={styles.individualBookingText}>
                    From: {typeof booking.fromLocation === 'object' ? (booking.fromLocation.address || 'Unknown') : (booking.fromLocation || 'Unknown')}
                  </Text>
                </View>
                <View style={styles.individualBookingRow}>
                  <MaterialCommunityIcons name="map-marker-check" size={14} color={colors.success} />
                  <Text style={styles.individualBookingText}>
                    To: {typeof booking.toLocation === 'object' ? (booking.toLocation.address || 'Unknown') : (booking.toLocation || 'Unknown')}
                  </Text>
                </View>
                <View style={styles.individualBookingRow}>
                  <MaterialCommunityIcons name="package-variant" size={14} color={colors.secondary} />
                  <Text style={styles.individualBookingText}>
                    {booking.productType || 'N/A'} | {booking.weight || '0kg'}
                  </Text>
                </View>
                <View style={styles.individualBookingRow}>
                  <MaterialCommunityIcons name="cash" size={14} color={colors.success} />
                  <Text style={[styles.individualBookingText, { fontWeight: 'bold' }]}>
                    Cost: {formatAverageCost(booking)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.requestDetails}>
        {/* Route information - Only show for non-consolidation or when consolidation is collapsed */}
        {!isConsolidation && (
          <>
            <View style={styles.routeInfo}>
              <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>Route</Text>
                <Text style={styles.routeValue}>
                  {formatRoute(item.fromLocation, item.toLocation)}
                </Text>
              </View>
            </View>

            <View style={styles.productInfo}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.secondary} />
              <View style={styles.productText}>
                <Text style={styles.productLabel}>Product</Text>
                <Text style={styles.productValue}>
                  {item.productType}
                </Text>
              </View>
            </View>

            <View style={styles.weightInfo}>
              <MaterialCommunityIcons name="weight-kilogram" size={20} color={colors.tertiary} />
              <View style={styles.weightText}>
                <Text style={styles.weightLabel}>Weight</Text>
                <Text style={styles.weightValue}>{item.weight}</Text>
              </View>
            </View>

            {/* Shipping Cost - Show average cost in management screens */}
            {(item.cost || item.price || item.estimatedCost) && (
              <View style={styles.costInfo}>
                <MaterialCommunityIcons name="cash" size={20} color={colors.success} />
                <View style={styles.costText}>
                  <Text style={styles.costLabel}>Shipping Cost</Text>
                  <Text style={styles.costValue}>
                    {formatAverageCost(item)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
        
        {/* Route summary for consolidation (when collapsed) */}
        {isConsolidation && !isExpanded && (
          <View style={styles.routeInfo}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.primary} />
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>Route</Text>
              <Text style={styles.routeValue}>
                Multiple pickup and dropoff locations
              </Text>
            </View>
          </View>
        )}

        {/* Transporter & Driver Details - Show if booking is accepted/confirmed or has transporter/driver */}
        {(['accepted', 'confirmed', 'assigned'].includes(item.status?.toLowerCase()) || item.transporter || item.assignedDriver) && (
          <View style={styles.transporterInfo}>
            <View style={styles.transporterHeader}>
              <MaterialCommunityIcons name="account-tie" size={20} color={colors.success} />
              <Text style={styles.transporterLabel}>Transporter & Driver Details</Text>
            </View>
            <View style={styles.transporterDetails}>
              {/* Company Name - Always show for accepted bookings with driver or company */}
              {(() => {
                // Extract company name from normalized structure
                const companyName = 
                  item.company?.name ||
                  item.assignedDriver?.companyName || 
                  item.assignedDriver?.company?.name ||
                  item.transporter?.companyName ||
                  item.transporter?.company?.name ||
                  item.vehicle?.companyName;
                
                // Always show company name for accepted bookings if available
                if (['accepted', 'confirmed', 'assigned'].includes(item.status?.toLowerCase()) && companyName) {
                  return (
                    <View style={styles.companyInfo}>
                      <MaterialCommunityIcons name="office-building" size={16} color={colors.primary} />
                      <Text style={styles.companyName}>{companyName}</Text>
                    </View>
                  );
                }
                return null;
              })()}
              
              {/* Driver Details - Show if driver is assigned (name, photo, and phone) */}
              {item.assignedDriver && (
                <View style={styles.driverInfo}>
                  <View style={styles.driverProfile}>
                    <Image
                      source={{ uri: item.assignedDriver.photo || item.assignedDriver.profilePhoto || item.assignedDriver.profileImage || PLACEHOLDER_IMAGES.PROFILE_PHOTO_SMALL }}
                      style={styles.driverPhoto}
                    />
                    <View style={styles.driverBasic}>
                      <Text style={styles.driverName}>
                        {item.assignedDriver.name || 'Driver'}
                      </Text>
                      {item.assignedDriver.phone && (
                        <Text style={styles.driverMetaText}>
                          {item.assignedDriver.phone}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
              
              {/* Transporter Details (if no driver assigned) */}
              {!item.assignedDriver && item.transporter && (
                <View style={styles.transporterProfile}>
                  <Image
                    source={{ uri: item.transporter.profilePhoto || item.transporter.photo || PLACEHOLDER_IMAGES.PROFILE_PHOTO_SMALL }}
                    style={styles.transporterPhoto}
                  />
                  <View style={styles.transporterBasic}>
                    <Text style={styles.transporterName}>
                      {item.transporter.name || 'Unknown Transporter'}
                    </Text>
                    <View style={styles.transporterRating}>
                      <MaterialCommunityIcons name="star" size={14} color={colors.secondary} style={{ marginRight: 2 }} />
                      <Text style={styles.ratingText}>{item.transporter.rating || 'N/A'}</Text>
                      <Text style={styles.tripsText}> • {(item.transporter.tripsCompleted || 0)} trips</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {item.transporter && (
                <View style={styles.transporterMeta}>
                  <Text style={styles.transporterMetaText}>
                    {item.transporter.experience || 'N/A'} • {item.transporter.availability || 'N/A'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle Details - Always show for accepted bookings, especially important for instant requests */}
        {['accepted', 'confirmed', 'assigned'].includes(item.status?.toLowerCase()) && (
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleHeader}>
              <MaterialCommunityIcons name="truck" size={20} color={colors.secondary} />
              <Text style={styles.vehicleLabel}>Vehicle Details</Text>
            </View>
            <View style={styles.vehicleDetails}>
              {/* Use normalized vehicle data from unifiedBookingService */}
              {item.vehicle ? (
                <>
                  {/* Vehicle Photo - Always show, use placeholder if missing */}
                  <View style={styles.vehiclePhotoContainer}>
                    <Image
                      source={{ 
                        uri: item.vehicle.photo || 
                              (item.vehicle.photos && item.vehicle.photos[0]) ||
                              PLACEHOLDER_IMAGES.VEHICLE_PHOTO 
                      }}
                      style={styles.vehiclePhoto}
                      resizeMode="cover"
                    />
                  </View>
                  
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleDetailLabel}>Registration:</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {item.vehicle.registration || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleDetailLabel}>Capacity:</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {item.vehicle.capacity || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleDetailLabel}>Vehicle:</Text>
                    <Text style={styles.vehicleDetailValue}>
                      {item.vehicle.make || 'Unknown'} {item.vehicle.model || ''} ({item.vehicle.year || 'N/A'})
                    </Text>
                  </View>
                  {item.vehicle.type && (
                    <View style={styles.vehicleRow}>
                      <Text style={styles.vehicleDetailLabel}>Type:</Text>
                      <Text style={styles.vehicleDetailValue}>
                        {item.vehicle.type}
                      </Text>
                    </View>
                  )}
                  {item.vehicle.color && (
                    <View style={styles.vehicleRow}>
                      <Text style={styles.vehicleDetailLabel}>Color:</Text>
                      <Text style={styles.vehicleDetailValue}>
                        {item.vehicle.color}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noVehicleInfo}>
                  <MaterialCommunityIcons name="truck-remove" size={32} color={colors.text.light} />
                  <Text style={styles.noVehicleText}>Vehicle details not available</Text>
                  <Text style={styles.noVehicleSubtext}>
                    Vehicle information will be available once assigned
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.requestMeta}>
          <Text style={styles.requestDate}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.requestType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Request
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton]}
          onPress={() => handleTrackRequest(item)}
        >
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.white} />
          <Text style={styles.trackButtonText}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.mapButton]}
          onPress={() => item && handleViewMap(item)}
        >
          <MaterialCommunityIcons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>

        {item?.transporter && (
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => Alert.alert('Contact', `Call ${item.transporter?.name || 'Unknown'} at ${item.transporter?.phone || 'N/A'}`)}
          >
            <MaterialCommunityIcons name="phone" size={18} color={colors.secondary} />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Requests</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={fetchRequests} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => navigation?.navigate?.('BusinessRequest')}
            >
              <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
            </TouchableOpacity>
            {/* Consolidation button removed - consolidation is now done from RequestForm */}
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instant' && styles.activeTab]}
          onPress={() => setActiveTab('instant')}
        >
          <Text style={[styles.tabText, activeTab === 'instant' && styles.activeTabText]}>Instant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'booking' && styles.activeTab]}
          onPress={() => setActiveTab('booking')}
        >
          <Text style={[styles.tabText, activeTab === 'booking' && styles.activeTabText]}>Bookings</Text>
        </TouchableOpacity>
      </View>


      {/* Requests List */}
      <FlatList
        data={getFilteredRequests()}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="office-building" size={64} color={colors.text.light} />
            <Text style={styles.emptyTitle}>No business requests found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Create your first business request or consolidate multiple requests to get started'
                : `No ${activeTab} business requests available`
              }
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation?.navigate?.('BusinessRequest')}
              >
                <Text style={styles.createButtonText}>Create Request</Text>
              </TouchableOpacity>
              {/* Consolidate button removed - consolidation is now done from RequestForm */}
            </View>
          </View>
        }
      />

      <LoadingSpinner
        visible={loading}
        message="Loading Requests..."
        size="large"
        type="pulse"
        logo={true}
      />

      {/* Consolidation Manager removed - consolidation is now done from RequestForm */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
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
  headerTitle: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  consolidateHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: -10,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  listContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  requestId: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  requestIdText: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.primary,
    flexShrink: 1,
    maxWidth: '75%',
  },
  consolidatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  consolidatedText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestDetails: {
    gap: spacing.sm,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  routeLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  routeValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  productLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  productValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  weightLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  weightValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  costInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  costLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  costValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.success,
  },
  consolidatedDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  consolidatedTitle: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  consolidatedItem: {
    marginBottom: 2,
  },
  consolidatedItemText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
  },
  transporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transporterText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  transporterLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  transporterValue: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transporterDetails: {
    flex: 1,
  },
  transporterProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transporterPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  transporterBasic: {
    flex: 1,
  },
  transporterName: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  transporterRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  tripsText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  transporterMeta: {
    marginTop: spacing.xs,
  },
  transporterMetaText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '20',
  },
  requestDate: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  requestType: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  trackButton: {
    backgroundColor: colors.primary,
  },
  trackButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mapButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  contactButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  contactButtonText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fonts.size.md,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  createButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  consolidateButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  consolidateButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
  },
  // Vehicle Information Styles
  vehicleInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleLabel: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  vehicleDetails: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleDetailLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  vehicleDetailValue: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  vehiclePhotoContainer: {
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  vehiclePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  companyName: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  driverInfo: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  driverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.sm,
  },
  driverBasic: {
    flex: 1,
  },
  driverName: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  driverMeta: {
    marginTop: 2,
  },
  driverMetaText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  // Consolidation Card Styles - Make it visually distinct
  consolidationCard: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '05',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  consolidationHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  consolidationHeaderText: {
    color: colors.primary,
    fontSize: fonts.size.xs,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
    letterSpacing: 0.5,
  },
  consolidationIdText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  consolidationStatusBadge: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  consolidationOverview: {
    backgroundColor: colors.primary + '08',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  consolidationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  consolidationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  consolidationSummaryText: {
    flex: 1,
  },
  consolidationSummaryTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontFamily: fonts.family.bold,
  },
  consolidationSummarySubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  consolidationTotalCost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.success + '40',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  consolidationTotalCostInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  consolidationTotalCostLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontFamily: fonts.family.regular,
  },
  consolidationTotalCostText: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.success,
    fontFamily: fonts.family.bold,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  expandButtonActive: {
    backgroundColor: colors.primaryDark,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  expandButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    fontFamily: fonts.family.bold,
  },
  individualBookingsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary + '30',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
  },
  individualBookingsTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontFamily: fonts.family.bold,
  },
  individualBookingItem: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.text.light + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  individualBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  individualBookingNumber: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  individualBookingId: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  individualBookingDetails: {
    marginTop: spacing.xs,
  },
  individualBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  individualBookingText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
    fontFamily: fonts.family.regular,
  },
  individualBookingLabel: {
    fontWeight: '600',
    color: colors.text.secondary,
  },
  noVehicleInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noVehicleText: {
    fontSize: fonts.size.md,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  noVehicleSubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BusinessManageScreen;

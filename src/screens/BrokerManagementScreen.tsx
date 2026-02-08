import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import colors from "../constants/colors";
import fonts from "../constants/fonts";
import spacing from "../constants/spacing";
import { PLACEHOLDER_IMAGES } from "../constants/images";
import { API_ENDPOINTS } from "../constants/api";
import {
  getReadableLocationName,
  formatRoute,
  cleanLocationDisplay,
  getReadableLocationNameSync,
} from "../utils/locationUtils";
import LocationDisplay from "../components/common/LocationDisplay";
import BackgroundLocationDisclosureModal from "../components/common/BackgroundLocationDisclosureModal";
import {
  getDisplayBookingId,
  getBookingTypeAndMode,
} from "../utils/unifiedIdSystem";
import {
  unifiedBookingService,
  UnifiedBooking,
  BookingFilters,
} from "../services/unifiedBookingService";
import {
  formatCostRange,
  formatAverageCost,
  getAverageCost,
} from "../utils/costCalculator";
import locationService from "../services/locationService";

// Use UnifiedBooking interface from the service
type RequestItem = UnifiedBooking;

interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  totalRequests: number;
  activeRequests: number;
  instantRequests: number;
  bookingRequests: number;
  // Enhanced request counters
  pendingRequests: number;
  confirmedRequests: number;
  inTransitRequests: number;
  deliveredRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  consolidatedRequests: number;
  lastRequest: string;
  latestRequestStatus?: string;
  latestRequestType?: string;
  isVerified: boolean;
  requests?: RequestItem[];
  // Client performance metrics
  averageResponseTime?: number; // in hours
  successRate?: number; // percentage
  totalValue?: number; // total value of all requests
}

// Mock data removed - now using real API calls

const BrokerManagementScreen = ({ navigation, route }: any) => {
  const [activeTab, setActiveTab] = useState(
    route?.params?.activeTab || "requests",
  );
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [expandedConsolidations, setExpandedConsolidations] = useState<
    Set<string>
  >(new Set()); // Track expanded consolidation groups
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    clientType: "individual" as "individual" | "business",
    location: "",
    businessType: "",
    occupation: "",
  });

  // Background location disclosure state - CRITICAL for Google Play compliance
  const [
    showBackgroundLocationDisclosure,
    setShowBackgroundLocationDisclosure,
  ] = useState(false);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
    }
    if (route.params?.selectedClient) {
      setSelectedClient(route.params.selectedClient);
    }
  }, [route.params]);

  useEffect(() => {
    // Load data when component mounts
    loadRequests();
    loadClients();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRequests();
      loadClients();
    }, []),
  );

  const loadRequests = async () => {
    try {
      setLoading(true);

      // Use unified booking service for consistent data handling
      const filters: BookingFilters = {
        // Add any specific filters for broker requests
      };

      const bookings = await unifiedBookingService?.getBookings(
        "broker",
        filters,
      );
      console.log("Broker requests from unified service:", bookings);

      let allBookings = Array.isArray(bookings) ? bookings : [];

      // Group consolidated bookings by consolidationGroupId
      // Consolidation: multiple individual bookings with same consolidationGroupId
      const consolidationMap = new Map<string, any[]>();
      const nonConsolidated: any[] = [];

      allBookings.forEach((booking: any) => {
        if (
          booking.consolidationGroupId ||
          (booking.consolidated === true && booking.consolidationGroupId)
        ) {
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
      const consolidationObjects = Array.from(consolidationMap.entries()).map(
        ([groupId, bookings]) => {
          // Calculate total cost range
          // Priority: estimatedCostRange > costRange > minCost/maxCost > estimatedCost/cost
          let totalMinCost = 0;
          let totalMaxCost = 0;

          bookings.forEach((booking: any) => {
            // Use backend estimatedCostRange if available (Mumbua's format)
            const minCost =
              booking.estimatedCostRange?.min ||
              booking.costRange?.min ||
              booking.minCost ||
              booking.estimatedCost ||
              booking.cost ||
              0;
            const maxCost =
              booking.estimatedCostRange?.max ||
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
            type: "consolidated",
            isConsolidation: true,
            consolidationGroupId: groupId,
            consolidatedBookings: bookings,
            consolidatedRequests: bookings,
            totalBookings: bookings.length,
            totalCostRange: { min: totalMinCost, max: totalMaxCost },
            // Use first booking's details for summary display
            fromLocation: bookings[0]?.fromLocation,
            toLocation: bookings[bookings.length - 1]?.toLocation, // Use last dropoff
            status: bookings[0]?.status || "pending",
            urgency: bookings[0]?.urgency || "low",
            createdAt: bookings[0]?.createdAt,
            client: bookings[0]?.client,
            brokerData: bookings[0]?.brokerData,
            productType: "Mixed Products",
            weight:
              bookings
                .reduce((sum: number, b: any) => {
                  const weight =
                    parseFloat(
                      b.weight?.toString().replace("kg", "").trim() || "0",
                    ) || 0;
                  return sum + weight;
                }, 0)
                .toString() + "kg",
            // Use average cost for sorting and calculations
            cost: Math.round((totalMinCost + totalMaxCost) / 2),
            price: Math.round((totalMinCost + totalMaxCost) / 2),
            estimatedCost: Math.round((totalMinCost + totalMaxCost) / 2),
          };
        },
      );

      // Combine consolidation objects with non-consolidated bookings
      allBookings = [...consolidationObjects, ...nonConsolidated];

      setRequests(allBookings);
      // Reload clients to update active request counts
      await loadClients();
    } catch (error) {
      console.error("Error loading requests:", error);
      // Set empty data on error to prevent crashes
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { getAuth } = require("firebase/auth");
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const url = `${API_ENDPOINTS.BROKERS}/clients-with-requests`;
      console.log("🔍 Frontend calling URL:", url);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Clients with requests API response:", data);
        setClients(Array.isArray(data?.data) ? data.data : []);
      } else {
        console.error(
          "Failed to fetch clients with requests:",
          res.status,
          res.statusText,
        );
        const errorData = await res.json().catch(() => ({}));
        console.error("Error details:", errorData);

        // If 404, it means broker lookup failed - set empty data instead of crashing
        if (res.status === 404) {
          console.log("Broker not found in backend - setting empty clients");
          setClients([]);
        }
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      // Set empty data on error to prevent crashes
      setClients([]);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone || !newClient.location) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (newClient.clientType === "business" && !newClient.company) {
      Alert.alert("Error", "Corporate name is required for business clients");
      return;
    }

    try {
      const { getAuth } = require("firebase/auth");
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.BROKERS}/clients`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          type: newClient.clientType,
          region: newClient.location,
          location: newClient.location, // Send both region and location for compatibility
          company: newClient.company || null,
          businessType: newClient.businessType || null,
          occupation: newClient.occupation || null,
        }),
      });

      if (response.ok) {
        // Refresh clients list
        await loadClients();

        // Reset form
        setNewClient({
          name: "",
          company: "",
          phone: "",
          email: "",
          clientType: "individual",
          location: "",
          businessType: "",
          occupation: "",
        });
        setShowAddClientModal(false);
        Alert.alert("Success", "Client added successfully!");
      } else {
        const errorData = await response.json();
        console.error("Client creation failed:", errorData);
        Alert.alert("Error", errorData.message || "Failed to add client");
      }
    } catch (error) {
      console.error("Error adding client:", error);
      Alert.alert("Error", "Failed to add client. Please try again.");
    }
  };

  const handleTrackRequest = (request: RequestItem) => {
    if (!request) return;
    if (request.type === "instant") {
      navigation?.navigate?.("TripDetailsScreen", {
        booking: request,
        isInstant: true,
        userType: "broker",
      });
    } else {
      navigation?.navigate?.("TrackingScreen", {
        booking: request,
        isConsolidated: false,
        userType: "broker",
      });
    }
  };

  const handleViewMap = (request: RequestItem) => {
    if (!request) return;
    navigation?.navigate?.("MapViewScreen", {
      booking: request,
      userType: "broker",
    });
  };

  const handleContactTransporter = (request: RequestItem) => {
    if (!request.transporter) {
      Alert.alert(
        "No Transporter",
        "No transporter assigned to this request yet.",
      );
      return;
    }

    Alert.alert("Contact Transporter", `Contact ${request.transporter.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          // TODO: Implement phone call functionality
          Alert.alert("Call", `Calling ${request.transporter?.phone}...`);
        },
      },
      {
        text: "Chat",
        onPress: () => {
          navigation?.navigate?.("ChatScreen", {
            transporter: request?.transporter,
            requestId: request?.id,
            userType: "broker",
          });
        },
      },
    ]);
  };

  // Request selection removed - consolidation is now done from RequestForm
  // Users create new requests and add them to consolidation from the RequestForm

  // Consolidation functionality removed - consolidation is now done from RequestForm
  // Users should create new requests and add them to consolidation from the RequestForm

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "confirmed":
        return colors.secondary;
      case "in_transit":
        return colors.primary;
      case "delivered":
        return colors.success;
      case "cancelled":
        return colors.error;
      default:
        return colors.text.light;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "fire";
      case "medium":
        return "clock-outline";
      case "low":
        return "walk";
      default:
        return "clock-outline";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return colors.error;
      case "medium":
        return colors.warning;
      case "low":
        return colors.success;
      default:
        return colors.text.light;
    }
  };

  const toggleConsolidationExpansion = (groupId: string) => {
    setExpandedConsolidations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const renderRequestItem = ({ item }: { item: RequestItem }) => {
    // Check if this is a consolidation object
    const isConsolidation =
      item.isConsolidation === true || item.type === "consolidated";
    const isExpanded =
      isConsolidation &&
      expandedConsolidations.has(item.consolidationGroupId || item.id);

    return (
      <View
        style={[
          styles.requestCard,
          isConsolidation && styles.consolidationCard,
        ]}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestType}>
            {isConsolidation && (
              <View style={styles.consolidationHeaderBadge}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.consolidationHeaderText}>
                  CONSOLIDATION
                </Text>
              </View>
            )}
            <MaterialCommunityIcons
              name={
                isConsolidation
                  ? "package-variant-closed"
                  : item.type === "instant"
                    ? "flash"
                    : "calendar-clock"
              }
              size={20}
              color={
                isConsolidation
                  ? colors.primary
                  : item.type === "instant"
                    ? colors.warning
                    : colors.secondary
              }
            />
            <Text
              style={[
                styles.requestTypeText,
                {
                  color: isConsolidation
                    ? colors.primary
                    : item.type === "instant"
                      ? colors.warning
                      : colors.secondary,
                },
              ]}
            >
              {isConsolidation
                ? `${item.totalBookings || item.consolidatedBookings?.length || 0} Bookings`
                : item.type === "instant"
                  ? "Instant"
                  : "Booking"}
            </Text>
            {isConsolidation && (
              <View style={styles.consolidatedBadge}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={14}
                  color={colors.white}
                />
                <Text style={styles.consolidatedText}>
                  {item.totalBookings || item.consolidatedBookings?.length || 0}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.requestStatus,
              isConsolidation && styles.consolidationStatusBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Booking ID */}
        <View style={styles.bookingIdContainer}>
          <Text style={styles.bookingIdLabel}>ID:</Text>
          <Text
            style={[
              styles.bookingIdValue,
              isConsolidation && styles.consolidationIdText,
            ]}
          >
            {isConsolidation
              ? `Group ID: ${(item.consolidationGroupId || item.id).substring(0, 12)}...`
              : getDisplayBookingId(item)}
          </Text>
        </View>

        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>
            {item.client?.name || item.brokerData?.clientName || "Client"}
          </Text>
          {!!(
            item.client?.company ||
            item.client?.email ||
            item.client?.phone
          ) && (
            <Text style={styles.clientCompany}>
              {item.client?.company || item.client?.email || item.client?.phone}
            </Text>
          )}
        </View>

        {/* Consolidation Overview - Always show for consolidations */}
        {isConsolidation && (
          <View style={styles.consolidationOverview}>
            <View style={styles.consolidationSummary}>
              <View style={styles.consolidationIconContainer}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.consolidationSummaryText}>
                <Text style={styles.consolidationSummaryTitle}>
                  {item.totalBookings || item.consolidatedBookings?.length || 0}{" "}
                  Individual Bookings
                </Text>
                <Text style={styles.consolidationSummarySubtitle}>
                  Multiple pickup and dropoff locations
                </Text>
              </View>
            </View>

            {/* Total Cost Range */}
            {item.totalCostRange && (
              <View style={styles.consolidationTotalCost}>
                <MaterialCommunityIcons
                  name="calculator"
                  size={18}
                  color={colors.success}
                />
                <View style={styles.consolidationTotalCostInfo}>
                  <Text style={styles.consolidationTotalCostLabel}>
                    Total Cost
                  </Text>
                  <Text style={styles.consolidationTotalCostText}>
                    {formatCostRange({ costRange: item.totalCostRange })}
                  </Text>
                </View>
              </View>
            )}

            {/* Expand/Collapse Button - More Prominent */}
            <TouchableOpacity
              style={[
                styles.expandButton,
                isExpanded && styles.expandButtonActive,
              ]}
              onPress={() =>
                toggleConsolidationExpansion(
                  item.consolidationGroupId || item.id,
                )
              }
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={22}
                color={colors.white}
              />
              <Text style={styles.expandButtonText}>
                {isExpanded
                  ? "Hide Individual Bookings"
                  : "View Individual Bookings"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Individual Bookings - Shown when expanded */}
        {isConsolidation && isExpanded && item.consolidatedBookings && (
          <View style={styles.individualBookingsContainer}>
            <Text style={styles.individualBookingsTitle}>
              Individual Bookings:
            </Text>
            {item.consolidatedBookings.map((booking: any, index: number) => (
              <View
                key={booking.id || booking.bookingId || index}
                style={styles.individualBookingItem}
              >
                <View style={styles.individualBookingHeader}>
                  <Text style={styles.individualBookingNumber}>
                    Booking {index + 1}
                  </Text>
                  <Text style={styles.individualBookingId}>
                    #
                    {getDisplayBookingId({
                      ...booking,
                      bookingType: booking.bookingType || booking.type,
                      bookingMode:
                        booking.bookingMode ||
                        (booking.type === "instant" ? "instant" : "booking"),
                    })}
                  </Text>
                </View>
                <View style={styles.individualBookingDetails}>
                  <View style={styles.individualBookingRow}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.individualBookingText}>
                      From:{" "}
                      {cleanLocationDisplay(
                        booking.fromLocation?.address ||
                          (typeof booking.fromLocation === "object"
                            ? booking.fromLocation.address
                            : booking.fromLocation || "Unknown"),
                      )}
                    </Text>
                  </View>
                  <View style={styles.individualBookingRow}>
                    <MaterialCommunityIcons
                      name="map-marker-check"
                      size={14}
                      color={colors.success}
                    />
                    <Text style={styles.individualBookingText}>
                      To:{" "}
                      {cleanLocationDisplay(
                        booking.toLocation?.address ||
                          (typeof booking.toLocation === "object"
                            ? booking.toLocation.address
                            : booking.toLocation || "Unknown"),
                      )}
                    </Text>
                  </View>
                  <View style={styles.individualBookingRow}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={14}
                      color={colors.secondary}
                    />
                    <Text style={styles.individualBookingText}>
                      {booking.productType || "N/A"} | {booking.weight || "0kg"}
                    </Text>
                  </View>
                  <View style={styles.individualBookingRow}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={14}
                      color={colors.success}
                    />
                    <Text
                      style={[
                        styles.individualBookingText,
                        { fontWeight: "bold" },
                      ]}
                    >
                      Cost: {formatAverageCost(booking)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Route information - Only show for non-consolidation or when consolidation is collapsed */}
        {!isConsolidation && (
          <>
            <View style={styles.routeInfo}>
              <View style={styles.routeItem}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.routeText}>
                  {cleanLocationDisplay(
                    item.fromLocation?.address ||
                      (item.fromLocation as any) ||
                      "Unknown location",
                  )}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color={colors.text.light}
              />
              <View style={styles.routeItem}>
                <MaterialCommunityIcons
                  name="map-marker-check"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles.routeText}>
                  {cleanLocationDisplay(
                    item.toLocation?.address ||
                      (item.toLocation as any) ||
                      "Unknown location",
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.cargoInfo}>
              <View style={styles.cargoItem}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={16}
                  color={colors.secondary}
                />
                <Text style={styles.cargoText}>{item.productType}</Text>
              </View>
              <View style={styles.cargoItem}>
                <MaterialCommunityIcons
                  name="weight"
                  size={16}
                  color={colors.tertiary}
                />
                <Text style={styles.cargoText}>{item.weight}</Text>
              </View>
              <View style={styles.cargoItem}>
                <MaterialCommunityIcons
                  name={getUrgencyIcon(item.urgency)}
                  size={16}
                  color={getUrgencyColor(item.urgency)}
                />
                <Text
                  style={[
                    styles.cargoText,
                    { color: getUrgencyColor(item.urgency) },
                  ]}
                >
                  {item.urgency}
                </Text>
              </View>
            </View>

            {/* Shipping Cost - Show average cost in management screens */}
            {(item.cost || item.price || item.estimatedCost) && (
              <View style={styles.costInfo}>
                <MaterialCommunityIcons
                  name="cash"
                  size={16}
                  color={colors.success}
                />
                <Text style={styles.costLabel}>Shipping Cost:</Text>
                <Text style={styles.costValue}>{formatAverageCost(item)}</Text>
              </View>
            )}
          </>
        )}

        {/* Route summary for consolidation (when collapsed) */}
        {isConsolidation && !isExpanded && (
          <View style={styles.routeInfo}>
            <View style={styles.routeItem}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.routeText}>Multiple pickup locations</Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right"
              size={16}
              color={colors.text.light}
            />
            <View style={styles.routeItem}>
              <MaterialCommunityIcons
                name="map-marker-check"
                size={16}
                color={colors.success}
              />
              <Text style={styles.routeText}>Multiple dropoff locations</Text>
            </View>
          </View>
        )}

        {item.estimatedValue && (
          <View style={styles.valueInfo}>
            <Text style={styles.valueLabel}>Estimated Value:</Text>
            <Text style={styles.valueAmount}>
              KES {item.estimatedValue.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Transporter & Driver Information */}
        {(item.transporter?.id ||
          item.transporter?.name ||
          item.assignedDriver ||
          item.driver) && (
          <View style={styles.transporterInfo}>
            <View style={styles.transporterHeader}>
              <MaterialCommunityIcons
                name="account-tie"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.transporterLabel}>
                Transporter & Driver Details
              </Text>
            </View>
            <View style={styles.transporterDetails}>
              {/* Company Name - Always show for accepted bookings with driver */}
              {(() => {
                const companyName =
                  item.assignedDriver?.companyName ||
                  item.assignedDriver?.company?.name ||
                  item.driver?.companyName ||
                  item.driver?.company?.name ||
                  item.transporter?.assignedDriver?.companyName ||
                  item.transporter?.assignedDriver?.company?.name ||
                  item.transporter?.companyName ||
                  item.transporter?.company?.name ||
                  item.companyName;

                if (
                  ["accepted", "confirmed", "assigned"].includes(
                    item.status?.toLowerCase(),
                  ) &&
                  (item.assignedDriver ||
                    item.driver ||
                    item.transporter?.assignedDriver) &&
                  companyName
                ) {
                  return (
                    <View style={styles.companyInfo}>
                      <MaterialCommunityIcons
                        name="office-building"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.companyName}>{companyName}</Text>
                    </View>
                  );
                }
                return null;
              })()}

              {/* Driver Details */}
              {(item.assignedDriver ||
                item.driver ||
                item.transporter?.assignedDriver) && (
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {item.assignedDriver?.name ||
                    item.assignedDriver?.driverName ||
                    (item.assignedDriver?.firstName &&
                      item.assignedDriver?.lastName)
                      ? `${item.assignedDriver.firstName} ${item.assignedDriver.lastName}`
                      : item.driver?.name ||
                        item.driver?.driverName ||
                        item.transporter?.assignedDriver?.name ||
                        "Driver"}
                  </Text>
                  <Text style={styles.transporterPhone}>
                    {item.assignedDriver?.phone ||
                      item.driver?.phone ||
                      item.transporter?.assignedDriver?.phone ||
                      item.transporter?.phone ||
                      "N/A"}
                  </Text>
                </View>
              )}

              {/* Transporter Details (if no driver) */}
              {!item.assignedDriver &&
                !item.driver &&
                !item.transporter?.assignedDriver && (
                  <>
                    <Text style={styles.transporterName}>
                      {item.transporter?.name || "Unknown Transporter"}
                    </Text>
                    <Text style={styles.transporterPhone}>
                      {item.transporter?.phone || "N/A"}
                    </Text>
                  </>
                )}

              {(item.transporterRating || item.transporter?.rating) && (
                <View style={styles.ratingContainer}>
                  <MaterialCommunityIcons
                    name="star"
                    size={14}
                    color={colors.warning}
                  />
                  <Text style={styles.ratingText}>
                    {item.transporterRating ||
                      item.transporter?.rating ||
                      "N/A"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle Information - Always show for accepted bookings */}
        {["accepted", "confirmed", "assigned"].includes(
          item.status?.toLowerCase(),
        ) && (
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleHeader}>
              <MaterialCommunityIcons
                name="truck"
                size={16}
                color={colors.secondary}
              />
              <Text style={styles.vehicleLabel}>Vehicle Details</Text>
            </View>
            <View style={styles.vehicleDetails}>
              {(() => {
                const vehicle =
                  item.assignedDriver?.assignedVehicle ||
                  item.assignedDriver?.vehicle ||
                  item.driver?.assignedVehicle ||
                  item.driver?.vehicle ||
                  item.transporter?.assignedVehicle ||
                  item.transporter?.assignedDriver?.assignedVehicle ||
                  item.transporter?.assignedDriver?.vehicle ||
                  item.transporter?.vehicle ||
                  item.vehicle;

                const vehiclePhoto =
                  vehicle?.photo ||
                  vehicle?.vehiclePhoto ||
                  vehicle?.photos?.[0] ||
                  vehicle?.vehicleImagesUrl?.[0] ||
                  item.vehicle?.photo ||
                  item.vehicle?.vehiclePhoto ||
                  item.vehicle?.photos?.[0] ||
                  item.transporter?.assignedVehicle?.photo ||
                  item.transporter?.assignedVehicle?.vehiclePhoto ||
                  item.transporter?.assignedVehicle?.photos?.[0] ||
                  item.transporter?.vehicle?.photo ||
                  item.transporter?.vehicle?.photos?.[0] ||
                  item.assignedDriver?.vehicle?.photo ||
                  item.assignedDriver?.assignedVehicle?.photo ||
                  item.driver?.vehicle?.photo ||
                  item.driver?.assignedVehicle?.photo ||
                  PLACEHOLDER_IMAGES.VEHICLE_PHOTO;

                const vehicleMake =
                  vehicle?.make ||
                  vehicle?.vehicleMake ||
                  item.vehicleMake ||
                  item.vehicle?.make ||
                  "Unknown";
                const vehicleModel =
                  vehicle?.model ||
                  vehicle?.vehicleModel ||
                  item.vehicleModel ||
                  item.vehicle?.model ||
                  "";
                const vehicleYear =
                  vehicle?.year ||
                  vehicle?.vehicleYear ||
                  item.vehicleYear ||
                  item.vehicle?.year ||
                  "N/A";
                const vehicleRegistration =
                  vehicle?.registration ||
                  vehicle?.vehicleRegistration ||
                  vehicle?.reg ||
                  item.vehicleRegistration ||
                  item.vehicle?.registration ||
                  "N/A";
                const vehicleCapacity =
                  vehicle?.capacity ||
                  vehicle?.vehicleCapacity ||
                  item.vehicleCapacity ||
                  item.vehicle?.capacity ||
                  "N/A";

                return (
                  <>
                    {/* Vehicle Photo */}
                    <Image
                      source={{ uri: vehiclePhoto }}
                      style={styles.vehiclePhoto}
                      resizeMode="cover"
                    />
                    <Text style={styles.vehicleRegistration}>
                      Registration: {vehicleRegistration}
                    </Text>
                    <Text style={styles.vehicleCapacity}>
                      Capacity: {vehicleCapacity}
                    </Text>
                    <Text style={styles.vehicleName}>
                      {vehicleMake} {vehicleModel} ({vehicleYear})
                    </Text>
                  </>
                );
              })()}
            </View>
          </View>
        )}

        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleTrackRequest(item)}
          >
            <MaterialCommunityIcons
              name="map-marker-path"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>Track</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            onPress={() => handleViewMap(item)}
          >
            <MaterialCommunityIcons
              name="map"
              size={16}
              color={colors.secondary}
            />
            <Text
              style={[styles.actionButtonText, { color: colors.secondary }]}
            >
              Map
            </Text>
          </TouchableOpacity>

          {item.transporter && (
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={() => handleContactTransporter(item)}
            >
              <MaterialCommunityIcons
                name="message"
                size={16}
                color={colors.success}
              />
              <Text
                style={[styles.actionButtonText, { color: colors.success }]}
              >
                Chat
              </Text>
            </TouchableOpacity>
          )}

          {activeTab === "consolidation" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Navigate to request details or tracking
                navigation?.navigate?.("TrackingScreen", {
                  booking: item,
                  userType: "broker",
                });
              }}
            >
              <MaterialCommunityIcons
                name="eye"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}
              >
                View
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.requestTime}>{item.createdAt}</Text>
      </View>
    );
  };

  const handleClientPress = (client: Client) => {
    setSelectedClient(client);
    // If client has requests, show them in a modal or navigate to client requests
    if (client.requests && client.requests.length > 0) {
      // You can add navigation to client requests screen here
      console.log("Client requests:", client.requests);
    }
  };

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => handleClientPress(item)}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientInitials}>
            {(item?.name || "U")
              .split(" ")
              .filter((n) => n)
              .map((n) => n?.[0] || "")
              .filter((c) => c)
              .join("") || "U"}
          </Text>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
              />
            </View>
          )}
        </View>

        <View style={styles.clientCardInfo}>
          <Text style={styles.clientCardName}>{item.name}</Text>
          <Text style={styles.clientCardCompany}>{item.company}</Text>
        </View>

        <View style={styles.clientStats}>
          {/* Primary Stats Row */}
          <View style={styles.clientStatsRow}>
            <Text style={styles.clientRequests}>
              {item.activeRequests} active
            </Text>
            <Text style={styles.clientTotal}>{item.totalRequests} total</Text>
          </View>

          {/* Request Type Breakdown */}
          <View style={styles.clientStatsRow}>
            <Text style={styles.clientInstant}>
              {item.instantRequests} instant
            </Text>
            <Text style={styles.clientBooking}>
              {item.bookingRequests} booking
            </Text>
          </View>

          {/* Status Breakdown */}
          <View style={styles.clientStatusBreakdown}>
            {item.pendingRequests > 0 && (
              <View style={styles.statusBadge}>
                <Text
                  style={[styles.statusBadgeText, { color: colors.warning }]}
                >
                  {item.pendingRequests} pending
                </Text>
              </View>
            )}
            {item.inTransitRequests > 0 && (
              <View style={styles.statusBadge}>
                <Text
                  style={[styles.statusBadgeText, { color: colors.secondary }]}
                >
                  {item.inTransitRequests} in transit
                </Text>
              </View>
            )}
            {item.deliveredRequests > 0 && (
              <View style={styles.statusBadge}>
                <Text
                  style={[styles.statusBadgeText, { color: colors.success }]}
                >
                  {item.deliveredRequests} delivered
                </Text>
              </View>
            )}
            {item.consolidatedRequests > 0 && (
              <View style={styles.statusBadge}>
                <Text
                  style={[styles.statusBadgeText, { color: colors.primary }]}
                >
                  {item.consolidatedRequests} consolidated
                </Text>
              </View>
            )}
          </View>

          {/* Performance Metrics */}
          {(item.successRate ||
            item.averageResponseTime ||
            item.totalValue) && (
            <View style={styles.clientPerformance}>
              {item.successRate && (
                <Text style={styles.performanceText}>
                  Success: {item.successRate}%
                </Text>
              )}
              {item.averageResponseTime && (
                <Text style={styles.performanceText}>
                  Avg Response: {item.averageResponseTime}h
                </Text>
              )}
              {item.totalValue && (
                <Text style={styles.performanceText}>
                  Total Value: KES {item.totalValue.toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {item.latestRequestStatus && (
            <View style={styles.latestRequestInfo}>
              <Text style={styles.latestRequestText}>
                Latest: {item.latestRequestType} - {item.latestRequestStatus}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.clientContact}>
        <View style={styles.contactItem}>
          <MaterialCommunityIcons
            name="phone"
            size={16}
            color={colors.text.secondary}
          />
          <Text style={styles.contactText}>{item.phone}</Text>
        </View>
        <View style={styles.contactItem}>
          <MaterialCommunityIcons
            name="email"
            size={16}
            color={colors.text.secondary}
          />
          <Text style={styles.contactText}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.clientActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            navigation?.navigate?.("BrokerRequestScreen", {
              clientId: item?.id,
              selectedClient: item,
            })
          }
        >
          <MaterialCommunityIcons
            name="plus-circle"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.actionButtonText}>New Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => {
            setActiveTab("tracking");
            setSelectedClient(item);
          }}
        >
          <MaterialCommunityIcons
            name="eye"
            size={16}
            color={colors.secondary}
          />
          <Text style={[styles.actionButtonText, { color: colors.secondary }]}>
            View
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "requests":
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Requests</Text>
              <TouchableOpacity
                style={styles.newRequestButton}
                onPress={() => navigation?.navigate?.("BrokerRequestScreen")}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.newRequestButtonText}>New Request</Text>
              </TouchableOpacity>
            </View>

            {!Array.isArray(requests) || requests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={48}
                  color={colors.text.light}
                />
                <Text style={styles.emptyStateTitle}>No Requests Yet</Text>
                <Text style={styles.emptyStateText}>
                  {loading
                    ? "Loading your requests..."
                    : "Create your first request to get started with managing client transportation needs."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: spacing.xxl }}
              />
            )}
          </View>
        );

      case "consolidation":
        const pendingRequests = Array.isArray(requests)
          ? requests.filter((r) => r && r.status === "pending")
          : [];
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consolidation</Text>
              <View style={styles.headerActions}>
                {pendingRequests.length > 0 && (
                  <View style={styles.selectionActions}>
                    {/* Selection UI removed - consolidation is now done from RequestForm */}
                  </View>
                )}
                {/* Consolidate button removed - consolidation is now done from RequestForm */}
              </View>
            </View>

            <View style={styles.consolidationInfoCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.consolidationInfo}>
                Select multiple requests to consolidate them into a single
                transport request for cost savings.
              </Text>
            </View>

            {/* Selected requests card removed - consolidation is now done from RequestForm */}

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={48}
                  color={colors.text.light}
                />
                <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
                <Text style={styles.emptyStateText}>
                  There are no pending requests available for consolidation.
                </Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: spacing.xxl }}
              />
            )}
          </View>
        );

      case "tracking":
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Track Requests</Text>
              {selectedClient && (
                <TouchableOpacity
                  style={styles.clientFilter}
                  onPress={() => setSelectedClient(null)}
                >
                  <Text style={styles.clientFilterText}>Clear Filter</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedClient && (
              <View style={styles.clientFilterCard}>
                <Text style={styles.clientFilterTitle}>
                  Filtering by: {selectedClient.name}
                </Text>
                <Text style={styles.clientFilterSubtitle}>
                  {selectedClient.company}
                </Text>
              </View>
            )}

            <FlatList
              data={
                selectedClient
                  ? Array.isArray(requests)
                    ? requests.filter((r) => {
                        if (!r) return false;
                        const cid =
                          (r as any)?.brokerData?.clientId || r?.client?.id;
                        return cid && cid === selectedClient?.id;
                      })
                    : []
                  : Array.isArray(requests)
                    ? requests
                    : []
              }
              renderItem={renderRequestItem}
              keyExtractor={(item) => item?.id || Math.random().toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
            />
          </View>
        );

      case "clients":
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Client Management</Text>
              <TouchableOpacity
                style={styles.addClientButton}
                onPress={() => setShowAddClientModal(true)}
              >
                <MaterialCommunityIcons
                  name="account-plus"
                  size={20}
                  color={colors.white}
                />
                <Text style={styles.addClientButtonText}>Add Client</Text>
              </TouchableOpacity>
            </View>

            {!Array.isArray(clients) || clients.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={48}
                  color={colors.text.secondary}
                />
                <Text style={styles.emptyStateText}>No clients found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first client to get started
                </Text>
              </View>
            ) : (
              <FlatList
                data={clients}
                renderItem={renderClientItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Management</Text>
        <TouchableOpacity
          onPress={() => navigation?.navigate?.("DisputeList" as never)}
          style={styles.disputeButton}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <MaterialCommunityIcons
              name="clipboard-list"
              size={20}
              color={
                activeTab === "requests" ? colors.white : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.activeTabText,
              ]}
            >
              Requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "consolidation" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("consolidation")}
          >
            <MaterialCommunityIcons
              name="layers"
              size={20}
              color={
                activeTab === "consolidation"
                  ? colors.white
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "consolidation" && styles.activeTabText,
              ]}
            >
              Consolidation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "tracking" && styles.activeTab]}
            onPress={() => setActiveTab("tracking")}
          >
            <MaterialCommunityIcons
              name="map-marker-path"
              size={20}
              color={
                activeTab === "tracking" ? colors.white : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "tracking" && styles.activeTabText,
              ]}
            >
              Tracking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "clients" && styles.activeTab]}
            onPress={() => setActiveTab("clients")}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={
                activeTab === "clients" ? colors.white : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "clients" && styles.activeTabText,
              ]}
            >
              Clients
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Consolidation Modal removed - consolidation is now done from RequestForm */}

      {/* Add Client Modal */}
      <Modal
        visible={showAddClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Client Type *</Text>
                <View style={styles.clientTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.clientTypeButton,
                      newClient.clientType === "individual" &&
                        styles.clientTypeButtonActive,
                    ]}
                    onPress={() =>
                      setNewClient({ ...newClient, clientType: "individual" })
                    }
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={20}
                      color={
                        newClient.clientType === "individual"
                          ? colors.white
                          : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.clientTypeText,
                        newClient.clientType === "individual" &&
                          styles.clientTypeTextActive,
                      ]}
                    >
                      Individual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.clientTypeButton,
                      newClient.clientType === "business" &&
                        styles.clientTypeButtonActive,
                    ]}
                    onPress={() =>
                      setNewClient({ ...newClient, clientType: "business" })
                    }
                  >
                    <MaterialCommunityIcons
                      name="office-building"
                      size={20}
                      color={
                        newClient.clientType === "business"
                          ? colors.white
                          : colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.clientTypeText,
                        newClient.clientType === "business" &&
                          styles.clientTypeTextActive,
                      ]}
                    >
                      Corporate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {newClient.clientType === "individual"
                    ? "Full Name *"
                    : "Contact Person Name *"}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={newClient.name}
                  onChangeText={(text) =>
                    setNewClient({ ...newClient, name: text })
                  }
                  placeholder={
                    newClient.clientType === "individual"
                      ? "Enter client's full name"
                      : "Enter contact person's name"
                  }
                  placeholderTextColor={colors.text.light}
                />
              </View>

              {newClient.clientType === "business" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Corporate Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newClient.company}
                    onChangeText={(text) =>
                      setNewClient({ ...newClient, company: text })
                    }
                    placeholder="Enter company name"
                    placeholderTextColor={colors.text.light}
                  />
                </View>
              )}

              {newClient.clientType === "business" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Corporate Type</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newClient.businessType}
                    onChangeText={(text) =>
                      setNewClient({ ...newClient, businessType: text })
                    }
                    placeholder="e.g., Wholesaler, Retailer, Manufacturer"
                    placeholderTextColor={colors.text.light}
                  />
                </View>
              )}

              {newClient.clientType === "individual" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Occupation</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newClient.occupation}
                    onChangeText={(text) =>
                      setNewClient({ ...newClient, occupation: text })
                    }
                    placeholder="e.g., Farmer, Trader, Student"
                    placeholderTextColor={colors.text.light}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newClient.phone}
                  onChangeText={(text) =>
                    setNewClient({ ...newClient, phone: text })
                  }
                  placeholder="+254712345678"
                  placeholderTextColor={colors.text.light}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={newClient.email}
                  onChangeText={(text) =>
                    setNewClient({ ...newClient, email: text })
                  }
                  placeholder="client@company.com"
                  placeholderTextColor={colors.text.light}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newClient.location}
                  onChangeText={(text) =>
                    setNewClient({ ...newClient, location: text })
                  }
                  placeholder="e.g., Nairobi, Kenya"
                  placeholderTextColor={colors.text.light}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddClientModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddClient}
              >
                <Text style={styles.saveButtonText}>Add Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Background Location Disclosure Modal - CRITICAL for Google Play compliance */}
      {/* This modal MUST be shown before requesting BACKGROUND_LOCATION permission */}
      <BackgroundLocationDisclosureModal
        visible={showBackgroundLocationDisclosure}
        userRole="broker"
        onAccept={async () => {
          console.log(
            "✅ BrokerManagementScreen: User accepted background location disclosure",
          );
          // User consented - save consent
          await locationService.saveBackgroundLocationConsent(true);
          setShowBackgroundLocationDisclosure(false);

          // Note: We don't start tracking here - that happens when user explicitly starts tracking
          // This disclosure is just for consent, per Google Play requirements
          console.log(
            "✅ BrokerManagementScreen: Background location consent saved",
          );
        }}
        onDecline={async () => {
          console.log(
            "❌ BrokerManagementScreen: User declined background location disclosure",
          );
          // User declined - save consent status
          await locationService.saveBackgroundLocationConsent(false);
          setShowBackgroundLocationDisclosure(false);

          // User can still use the app, but background location won't be available
          console.log(
            "ℹ️ BrokerManagementScreen: Background location consent declined - app will use foreground-only tracking",
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: "bold",
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  headerSpacer: {
    width: 44,
  },
  disputeButton: {
    padding: 8,
    borderRadius: 20,
  },
  tabContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 60,
    zIndex: 1,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
    minWidth: 100,
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  newRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  newRequestButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: "600",
  },
  consolidateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  consolidateButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: "600",
  },
  consolidationInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primary + "10",
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  consolidationInfo: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  selectedRequestsCard: {
    backgroundColor: colors.success + "10",
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  selectedRequestsTitle: {
    fontSize: fonts.size.md,
    fontWeight: "600",
    color: colors.success,
    marginBottom: spacing.xs,
  },
  selectedRequestsSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fonts.size.lg,
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  selectionButtonText: {
    fontSize: fonts.size.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  addClientButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  addClientButtonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: "600",
  },
  consolidationInfo: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  clientFilter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  clientFilterText: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: "600",
  },
  clientFilterCard: {
    backgroundColor: colors.primary + "10",
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  clientFilterTitle: {
    fontSize: fonts.size.md,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 2,
  },
  clientFilterSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },

  // Request Card Styles
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bookingIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 6,
    flex: 1,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  bookingIdLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  bookingIdValue: {
    fontSize: fonts.size.sm,
    fontWeight: fonts.weight.bold,
    color: colors.primary,
    flexShrink: 1,
    maxWidth: "75%",
  },
  requestType: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  requestTypeText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
  },
  requestStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fonts.size.xs,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  clientInfo: {
    marginBottom: spacing.md,
  },
  clientName: {
    fontSize: fonts.size.md,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  clientCompany: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  routeText: {
    fontSize: fonts.size.sm,
    fontWeight: "500",
    color: colors.text.primary,
  },
  cargoInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  cargoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cargoText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    textTransform: "capitalize",
  },
  costInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.success + "10",
    borderRadius: 6,
    gap: spacing.xs,
  },
  costLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  costValue: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
    color: colors.success,
  },
  valueInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  valueLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  valueAmount: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
    color: colors.primary,
  },
  // Transporter Information Styles
  transporterInfo: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  transporterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  transporterLabel: {
    fontSize: fonts.size.sm,
    fontWeight: "bold",
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  transporterDetails: {
    flexDirection: "column",
    gap: spacing.xs,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + "10",
    borderRadius: 6,
  },
  companyName: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  driverInfo: {
    marginBottom: spacing.xs,
  },
  driverName: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.primary,
  },
  transporterName: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.primary,
  },
  transporterPhone: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginLeft: 2,
  },
  chatButton: {
    backgroundColor: colors.success + "10",
    borderColor: colors.success,
  },
  // Vehicle Information Styles
  vehicleInfo: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  vehicleLabel: {
    fontSize: fonts.size.sm,
    fontWeight: "bold",
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  vehicleDetails: {
    flexDirection: "column",
    gap: spacing.xs,
  },
  vehiclePhoto: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  vehicleName: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.primary,
  },
  vehicleRegistration: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: "500",
  },
  vehicleCapacity: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: "500",
  },
  vehicleType: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
  },
  vehicleColor: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  // Consolidation Tab Styles
  consolidationTabs: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  consolidationTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  activeConsolidationTab: {
    backgroundColor: colors.primary,
  },
  consolidationTabText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  activeConsolidationTabText: {
    color: colors.white,
  },
  // Enhanced Selection Actions
  selectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  selectionSubtext: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  selectionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    flex: 1,
    justifyContent: "center",
  },
  mapButton: {
    backgroundColor: colors.secondary + "20",
  },
  selectButton: {
    backgroundColor: colors.primary + "20",
  },
  selectedButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fonts.size.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  requestTime: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
    textAlign: "right",
  },

  // Client Card Styles
  clientCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    position: "relative",
  },
  clientInitials: {
    fontSize: fonts.size.lg,
    fontWeight: "bold",
    color: colors.primary,
  },
  verifiedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  clientCardInfo: {
    flex: 1,
  },
  clientCardName: {
    fontSize: fonts.size.md,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  clientCardCompany: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  clientStats: {
    alignItems: "flex-end",
    flex: 1,
  },
  clientStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  clientStatusBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  statusBadge: {
    backgroundColor: colors.background.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: fonts.size.xs,
    fontWeight: "500",
  },
  clientPerformance: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  performanceText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    marginBottom: 1,
  },
  clientRequests: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: "600",
    marginRight: spacing.sm,
  },
  clientTotal: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  clientInstant: {
    fontSize: fonts.size.xs,
    color: colors.warning,
    marginRight: spacing.sm,
  },
  clientBooking: {
    fontSize: fonts.size.xs,
    color: colors.secondary,
  },
  latestRequestInfo: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  latestRequestText: {
    fontSize: fonts.size.xs,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  clientContact: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  contactText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  clientActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  viewButton: {
    backgroundColor: colors.secondary + "20",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.black + "50",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fonts.size.lg,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  modalDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  consolidationPreview: {
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  previewItem: {
    marginBottom: spacing.xs,
  },
  previewText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.white,
  },
  modalScrollContent: {
    maxHeight: 400,
    paddingBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  clientTypeContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  clientTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clientTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  clientTypeText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  clientTypeTextActive: {
    color: colors.white,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: fonts.size.sm,
    fontWeight: "600",
    color: colors.white,
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fonts.size.lg,
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    textAlign: "center",
  },
  // Consolidation Card Styles - Make it visually distinct
  consolidationCard: {
    borderWidth: 2,
    borderColor: colors.primary + "40",
    backgroundColor: colors.primary + "05",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  consolidationHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  consolidationHeaderText: {
    color: colors.primary,
    fontSize: fonts.size.xs,
    fontWeight: "bold",
    marginLeft: spacing.xs,
    letterSpacing: 0.5,
  },
  consolidationIdText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  consolidationStatusBadge: {
    backgroundColor: colors.primary + "15",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  consolidatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  consolidatedText: {
    color: colors.white,
    fontSize: fonts.size.xs,
    fontWeight: "bold",
    marginLeft: 2,
  },
  // Consolidation Styles
  consolidationOverview: {
    backgroundColor: colors.primary + "08",
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + "25",
  },
  consolidationSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  consolidationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + "40",
  },
  consolidationSummaryText: {
    flex: 1,
  },
  consolidationSummaryTitle: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.success + "40",
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
    fontWeight: "bold",
    color: colors.success,
    fontFamily: fonts.family.bold,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "bold",
    marginLeft: spacing.sm,
    fontFamily: fonts.family.bold,
  },
  individualBookingsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary + "30",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
  },
  individualBookingsTitle: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
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
    borderColor: colors.text.light + "30",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  individualBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  individualBookingNumber: {
    fontSize: fonts.size.sm,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  individualBookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  individualBookingDetails: {
    marginTop: 4,
  },
  individualBookingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  individualBookingText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
    fontFamily: fonts.family.regular,
  },
});

export default BrokerManagementScreen;

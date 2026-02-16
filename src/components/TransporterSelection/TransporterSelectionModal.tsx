import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  transporterDetailsService,
  TransporterDetails,
} from "../../services/transporterDetailsService";
import { jobAcceptanceService } from "../../services/jobAcceptanceService";

interface TransporterSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  clientId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  cargoDetails: {
    type: string;
    weight: number;
    volume?: number;
  };
  onTransporterSelected: (transporter: TransporterDetails) => void;
}

const { width } = Dimensions.get("window");

export const TransporterSelectionModal: React.FC<
  TransporterSelectionModalProps
> = ({
  visible,
  onClose,
  requestId,
  clientId,
  pickupLocation,
  deliveryLocation,
  cargoDetails,
  onTransporterSelected,
}) => {
  const [transporters, setTransporters] = useState<TransporterDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      findTransporters();
    }
  }, [visible]);

  const findTransporters = async () => {
    setLoading(true);
    try {
      const foundTransporters =
        await jobAcceptanceService.findTransporterForInstantRequest({
          pickupLocation,
          deliveryLocation,
          cargoType: cargoDetails.type,
          weight: cargoDetails.weight,
          volume: cargoDetails.volume,
          maxDistance: 50, // 50km radius
        });

      // Calculate distances and arrival times for each transporter
      const transportersWithDetails = foundTransporters.map((transporter) => {
        if (transporter.location) {
          const distance = transporterDetailsService.calculateDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            transporter.location.latitude,
            transporter.location.longitude,
          );
          const estimatedArrival =
            transporterDetailsService.estimateArrivalTime(distance);

          return {
            ...transporter,
            distance,
            estimatedArrival,
          };
        }
        return transporter;
      });

      // Sort by distance (closest first)
      transportersWithDetails.sort(
        (a, b) => (a.distance || 0) - (b.distance || 0),
      );

      setTransporters(transportersWithDetails);
    } catch (error) {
      console.error("Error finding transporters:", error);
      Alert.alert(
        "Error",
        "Failed to find available transporters. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTransporter = async (transporter: TransporterDetails) => {
    setSelecting(transporter.id);
    try {
      const result =
        await jobAcceptanceService.selectTransporterForInstantRequest(
          requestId,
          transporter.id,
          clientId,
        );

      if (result.success) {
        onTransporterSelected(transporter);
        onClose();
        Alert.alert(
          "Transporter Selected! 🎉",
          `${transporter.displayName || transporter.name} has been assigned to your request. You can now communicate directly.`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to select transporter. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error selecting transporter:", error);
      Alert.alert("Error", "Failed to select transporter. Please try again.");
    } finally {
      setSelecting(null);
    }
  };

  const renderTransporterCard = (transporter: TransporterDetails) => {
    const isSelecting = selecting === transporter.id;
    const isCompanyDriver = transporter.isCompanyDriver;

    return (
      <TouchableOpacity
        key={transporter.id}
        style={styles.transporterCard}
        onPress={() => handleSelectTransporter(transporter)}
        disabled={isSelecting}
      >
        <View style={styles.transporterHeader}>
          <View style={styles.transporterInfo}>
            <Image
              source={{
                uri:
                  transporter.profilePhoto ||
                  "https://via.placeholder.com/50x50?text=TP",
              }}
              style={styles.profilePhoto}
            />
            <View style={styles.transporterDetails}>
              <Text style={styles.transporterName}>
                {transporter.displayName || transporter.name}
              </Text>
              {isCompanyDriver &&
                transporter.company &&
                !transporter.displayName && (
                  <Text style={styles.companyName}>
                    {transporter.company.name}
                  </Text>
                )}
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.rating}>
                  {transporter.rating.toFixed(1)}
                </Text>
                <Text style={styles.totalJobs}>
                  ({transporter.totalJobs} jobs)
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>
              {transporter.distance
                ? transporterDetailsService.formatDistance(transporter.distance)
                : "N/A"}
            </Text>
            <Text style={styles.arrivalTime}>
              {transporter.estimatedArrival
                ? transporterDetailsService.formatArrivalTime(
                    transporter.estimatedArrival,
                  )
                : "N/A"}
            </Text>
          </View>
        </View>

        {transporter.vehicle && (
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleImageContainer}>
                {transporter.vehicle.photos &&
                transporter.vehicle.photos.length > 0 ? (
                  <Image
                    source={{ uri: transporter.vehicle.photos[0] }}
                    style={styles.vehicleImage}
                  />
                ) : (
                  <View style={styles.vehicleImagePlaceholder}>
                    <Ionicons name="car" size={24} color="#666" />
                  </View>
                )}
              </View>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleMake}>
                  {transporter.vehicle.make} {transporter.vehicle.model}
                </Text>
                <Text style={styles.vehicleRegistration}>
                  {transporter.vehicle.registration}
                </Text>
                <Text style={styles.vehicleSpecs}>
                  {transporter.vehicle.capacity}kg •{" "}
                  {transporter.vehicle.driveType} • {transporter.vehicle.color}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.contactSection}>
          <View style={styles.contactItem}>
            <Ionicons name="call" size={16} color="#007AFF" />
            <Text style={styles.contactText}>{transporter.phone}</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={16} color="#007AFF" />
            <Text style={styles.contactText}>{transporter.email}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelecting && styles.selectButtonDisabled,
          ]}
          onPress={() => handleSelectTransporter(transporter)}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.selectButtonText}>Select This Transporter</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Transporter</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>
                Finding available transporters...
              </Text>
            </View>
          ) : transporters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Transporters Found</Text>
              <Text style={styles.emptySubtitle}>
                No transporters are available in your area at the moment.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={findTransporters}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.transportersList}
              showsVerticalScrollIndicator={false}
            >
              {transporters.map(renderTransporterCard)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  transportersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transporterCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transporterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  transporterInfo: {
    flexDirection: "row",
    flex: 1,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  transporterDetails: {
    flex: 1,
  },
  transporterName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  companyName: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginLeft: 4,
  },
  totalJobs: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  distanceContainer: {
    alignItems: "flex-end",
  },
  distance: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  arrivalTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  vehicleSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  vehicleInfo: {
    flexDirection: "row",
  },
  vehicleImageContainer: {
    marginRight: 12,
  },
  vehicleImage: {
    width: 60,
    height: 40,
    borderRadius: 6,
  },
  vehicleImagePlaceholder: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleMake: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  vehicleRegistration: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  vehicleSpecs: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  contactSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactText: {
    fontSize: 14,
    color: "#007AFF",
    marginLeft: 6,
  },
  selectButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  selectButtonDisabled: {
    backgroundColor: "#CCC",
  },
  selectButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

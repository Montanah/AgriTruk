import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import spacing from "../../constants/spacing";
import { PLACEHOLDER_IMAGES } from "../../constants/images";

interface AssignedTransporterCardProps {
  transporter: {
    id: string;
    name: string;
    phone: string;
    email: string;
    profilePhoto?: string;
    rating: number;
    totalJobs: number;
    isCompanyDriver: boolean;
    company?: {
      id: string;
      name: string;
      logo?: string;
      phone: string;
      email: string;
    };
    vehicle?: {
      id: string;
      make: string;
      model: string;
      registration: string;
      capacity: number;
      driveType: string;
      bodyType: string;
      photos: string[];
      year: number;
      color: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    distance?: number; // in km
    estimatedArrival?: number; // in minutes
  };
  onCall?: (phone: string) => void;
  onMessage?: (transporterId: string) => void;
  onViewProfile?: (transporterId: string) => void;
}

export const AssignedTransporterCard: React.FC<
  AssignedTransporterCardProps
> = ({ transporter, onCall, onMessage, onViewProfile }) => {
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance}km`;
  };

  const formatArrivalTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleCall = () => {
    if (onCall) {
      onCall(transporter.phone);
    } else {
      Alert.alert(
        "Call Transporter",
        `Call ${transporter.displayName || transporter.name} at ${transporter.phone}`,
      );
    }
  };

  const handleMessage = () => {
    if (onMessage) {
      onMessage(transporter.id);
    } else {
      Alert.alert(
        "Message Transporter",
        `Open chat with ${transporter.displayName || transporter.name}`,
      );
    }
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(transporter.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with transporter info */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={{
              uri:
                transporter.profilePhoto ||
                PLACEHOLDER_IMAGES.PROFILE_PHOTO_MEDIUM,
            }}
            style={styles.profilePhoto}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.transporterName}>
              {transporter.displayName || transporter.name}
            </Text>
            {transporter.isCompanyDriver &&
              transporter.company &&
              !transporter.displayName && (
                <View style={styles.companyInfo}>
                  <MaterialCommunityIcons
                    name="office-building"
                    size={12}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.companyName}>
                    {transporter.company.name}
                  </Text>
                </View>
              )}
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{transporter.rating.toFixed(1)}</Text>
              <Text style={styles.totalJobs}>
                ({transporter.totalJobs} jobs)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.distanceInfo}>
          {transporter.distance && (
            <Text style={styles.distance}>
              {formatDistance(transporter.distance)} away
            </Text>
          )}
          {transporter.estimatedArrival && (
            <Text style={styles.arrivalTime}>
              ETA: {formatArrivalTime(transporter.estimatedArrival)}
            </Text>
          )}
        </View>
      </View>

      {/* Vehicle details */}
      {transporter.vehicle && (
        <View style={styles.vehicleSection}>
          <VehicleDisplayCard
            vehicle={transporter.vehicle}
            showImages={true}
            compact={false}
          />
        </View>
      )}

      {/* Contact information */}
      <View style={styles.contactSection}>
        <View style={styles.contactItem}>
          <MaterialCommunityIcons
            name="phone"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.contactText}>{transporter.phone}</Text>
        </View>
        <View style={styles.contactItem}>
          <MaterialCommunityIcons
            name="email"
            size={16}
            color={colors.primary}
          />
          <Text style={styles.contactText}>{transporter.email}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <MaterialCommunityIcons name="phone" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <MaterialCommunityIcons name="message" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleViewProfile}
        >
          <MaterialCommunityIcons
            name="account"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: "row",
    flex: 1,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  transporterName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    fontStyle: "italic",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginLeft: 4,
  },
  totalJobs: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  distanceInfo: {
    alignItems: "flex-end",
  },
  distance: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  arrivalTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  vehicleSection: {
    marginBottom: 16,
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
    color: colors.text.secondary,
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
    color: colors.primary,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});

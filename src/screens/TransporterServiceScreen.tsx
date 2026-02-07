import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAssignedJobs } from "../hooks/UseAssignedJobs";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { API_ENDPOINTS } from "../constants/api";
import colors from "../constants/colors";
import fonts from "../constants/fonts";
import spacing from "../constants/spacing";

import AssignTransporterModal from "../components/TransporterService/AssignTransporterModal";
import AvailableJobsCard from "../components/TransporterService/AvailableJobsCard";
import Header from "../components/TransporterService/Header";
import IncomingRequestsCard from "../components/TransporterService/IncomingRequestsCard";
import Insights from "../components/TransporterService/Insights";
import SubscriptionModal from "../components/TransporterService/SubscriptionModal";
import UnifiedSubscriptionCard from "../components/common/UnifiedSubscriptionCard";

type TransporterType = "company" | "individual" | "broker";
type RouteParams = { params?: { transporterType?: TransporterType } };

const TransporterServiceScreen = () => {
  const route = useRoute<RouteProp<RouteParams, "params">>();
  const navigation = useNavigation<any>();

  const transporterType: TransporterType =
    route?.params?.transporterType ?? "company";
  const isCompanyOrBroker =
    transporterType === "company" || transporterType === "broker";

  const [profile, setProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          console.error("No authenticated user found");
          setLoadingProfile(false);
          return;
        }

        const token = await user.getIdToken();
        // console.log('Fetching profiles for user:', user.uid);

        // Fetch profile based on transporter type
        let transporterRes, userRes;

        if (transporterType === "company") {
          // For companies, fetch from companies API
          [transporterRes, userRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            fetch(`${API_ENDPOINTS.AUTH}/profile`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
          ]);
        } else {
          // For individual transporters, fetch from transporters API
          [transporterRes, userRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.TRANSPORTERS}/profile`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            fetch(`${API_ENDPOINTS.AUTH}/profile`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
          ]);
        }

        // Handle transporter profile response
        if (transporterRes.ok) {
          const transporterData = await transporterRes.json();
          // console.log('Transporter profile data:', transporterData);

          if (transporterType === "company") {
            // For companies, the response is an array, take the first company
            const companyData =
              transporterData && transporterData.length > 0
                ? transporterData[0]
                : null;
            setProfile(companyData);
          } else {
            // For individual transporters, use the transporter data directly
            setProfile(transporterData);
          }
        } else {
          console.error(
            "Failed to fetch transporter profile:",
            transporterRes.status,
            transporterRes.statusText,
          );

          // If profile doesn't exist (404), redirect to completion screen
          if (transporterRes.status === 404) {
            console.log(
              "Transporter profile not found, redirecting to completion screen",
            );
            navigation.navigate("TransporterCompletionScreen", {
              transporterType,
            });
            return;
          }
        }

        // Handle user profile response
        if (userRes.ok) {
          const userData = await userRes.json();
          // console.log('User profile data:', userData);

          // Ensure we have the correct user data structure
          const userProfileData = userData.userData || userData;
          setUserProfile({
            name:
              userProfileData.name ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "User",
            firstName:
              userProfileData.name ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "User",
            profilePhotoUrl:
              userProfileData.profilePhotoUrl || user.photoURL || null,
            email: userProfileData.email || user.email,
            phoneNumber: userProfileData.phone || user.phoneNumber,
            emailVerified: userProfileData.emailVerified === true,
            phoneVerified: userProfileData.phoneVerified === true,
            isVerified: userProfileData.isVerified === true,
            role: userProfileData.role || "transporter",
            status: userProfileData.status || "active",
          });
        } else {
          console.error(
            "Failed to fetch user profile:",
            userRes.status,
            userRes.statusText,
          );
          // Fallback to Firebase user data
          setUserProfile({
            name: user.displayName || user.email?.split("@")[0] || "User",
            firstName: user.displayName || user.email?.split("@")[0] || "User",
            profilePhotoUrl: user.photoURL || null,
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified === true,
            phoneVerified: false,
            isVerified: user.emailVerified === true,
            role: "transporter",
            status: "active",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Set fallback user data
        const { getAuth } = require("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setUserProfile({
            name: user.displayName || user.email?.split("@")[0] || "User",
            firstName: user.displayName || user.email?.split("@")[0] || "User",
            profilePhotoUrl: user.photoURL || null,
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified === true,
            phoneVerified: false,
            isVerified: user.emailVerified === true,
            role: "transporter",
            status: "active",
          });
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const [notification, setNotification] = useState<string | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState(null);

  const { assignedJobs, loading: loadingJobs } = useAssignedJobs();
  const { subscriptionStatus, loading: loadingSubscription } =
    useSubscriptionStatus();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    currentTripRevenue: 0,
    totalTrips: 0,
    completedTrips: 0,
    fleetSize: 0,
    activeToday: 0,
    avgUtilizationRate: 0,
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { getAuth } = require("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(
          `${API_ENDPOINTS.TRANSPORTERS}/${user.uid}/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const fleetStats = isCompanyOrBroker
    ? {
        fleetSize: stats.fleetSize || 0,
        activeToday: stats.activeToday || 0,
        avgUtilizationRate: stats.avgUtilizationRate || 0,
      }
    : undefined;

  const handleAssignTransporter = async (
    jobId: string,
    transporterId: string,
  ) => {
    try {
      const { getAuth } = require("firebase/auth");
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transporterId }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        setSelectedJob(null);
        setSelectedTransporter(null);
      }
    } catch (error) {
      console.error("Error assigning transporter:", error);
    }
  };

  const renderItem = () => (
    <View style={styles.listContent}>
      <Header
        isCompany={isCompanyOrBroker}
        transporterType={transporterType}
        navigation={navigation}
        onShowSubscription={() => setShowSubscription(true)}
        user={{
          firstName:
            (userProfile as any)?.name ||
            (userProfile as any)?.firstName ||
            (profile as any)?.transporter?.name ||
            (profile as any)?.displayName ||
            "User",
          avatarUrl:
            (userProfile as any)?.profilePhotoUrl ||
            (userProfile as any)?.avatarUrl ||
            (profile as any)?.transporter?.driverProfileImage ||
            (profile as any)?.driverProfileImage ||
            (profile as any)?.profilePhotoUrl ||
            undefined,
        }}
      />

      {/* Notification */}
      {notification && (
        <TouchableOpacity
          onPress={() => navigation.navigate("TransporterCompletionScreen")}
          style={styles.notification}
          activeOpacity={0.8}
        >
          <Text style={styles.notificationText}>{notification}</Text>
        </TouchableOpacity>
      )}

      {/* Subscription Status Card */}
      <UnifiedSubscriptionCard
        subscriptionStatus={subscriptionStatus}
        userType="transporter"
        onManagePress={() =>
          navigation.navigate("SubscriptionManagement", {
            userType: "transporter",
          })
        }
        onUpgradePress={() => setShowSubscription(true)}
        compact={false}
      />

      <Insights
        revenue={stats.totalRevenue || 0}
        recentRevenue={stats.weeklyRevenue || 0}
        currentTripRevenue={stats.currentTripRevenue || 0}
        accumulatedRevenue={stats.monthlyRevenue || 0}
        successfulTrips={stats.completedTrips || 0}
        completionRate={
          stats.totalTrips > 0
            ? Math.round((stats.completedTrips / stats.totalTrips) * 100)
            : 0
        }
        currencyCode="KES"
        fleetStats={fleetStats}
      />

      <AvailableJobsCard
        onJobAccepted={(job) => {
          // console.log('Job accepted:', job);
        }}
        onJobRejected={(job) => {
          // console.log('Job rejected:', job);
        }}
        onViewAll={() => {
          navigation.navigate("AllAvailableJobsScreen");
        }}
      />

      <IncomingRequestsCard
        jobs={assignedJobs}
        loading={loadingJobs}
        onJobPress={(job) => {
          if (isCompanyOrBroker) {
            setSelectedJob(job);
            setShowAssignModal(true);
          }
        }}
        onViewAll={() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate("Manage");
          }
        }}
      />

      {/* Route Loads Card */}
      <TouchableOpacity
        style={styles.routeLoadsCard}
        onPress={() => navigation.navigate("RouteLoadsScreen")}
        activeOpacity={0.8}
      >
        <View style={styles.routeLoadsHeader}>
          <MaterialCommunityIcons
            name="routes"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.routeLoadsTitle}>Route Loads</Text>
        </View>
        <View style={styles.routeLoadsInfo}>
          <Text style={styles.routeLoadsText}>Optimize your routes</Text>
          <Text style={styles.routeLoadsSubtitle}>
            Find multiple loads on the same route
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modals */}
      {showAssignModal && selectedJob && isCompanyOrBroker && (
        <AssignTransporterModal
          job={selectedJob}
          transporter={selectedTransporter}
          onAssign={handleAssignTransporter}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedJob(null);
            setSelectedTransporter(null);
          }}
          visible={showAssignModal}
        />
      )}

      {showSubscription && (
        <SubscriptionModal
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onClose={() => setShowSubscription(false)}
          onSubscribe={(planData: any) => {
            navigation.navigate("PaymentScreen", {
              plan: planData,
              userType: "transporter",
              billingPeriod: "monthly",
              isUpgrade: false,
            });
          }}
        />
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={[1]}
      renderItem={renderItem}
      keyExtractor={() => "main-content"}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default TransporterServiceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  listContent: {
    padding: 16,
    paddingBottom: 150,
  },
  notification: {
    backgroundColor: colors.warning,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  notificationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  routeLoadsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeLoadsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  routeLoadsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginLeft: 8,
  },
  routeLoadsInfo: {
    flex: 1,
  },
  routeLoadsText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
    marginBottom: 2,
  },
  routeLoadsSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

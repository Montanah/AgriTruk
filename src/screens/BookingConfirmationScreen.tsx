import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePickerModal from "react-native-modal-datetime-picker";
// import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from "../constants/colors";
import fonts from "../constants/fonts";
import spacing from "../constants/spacing";
import { apiRequest } from "../utils/api";
import { calculateRoadDistanceWithFallback } from "../utils/distanceUtils";
import { formatCurrency, formatCostRange } from "../utils/costCalculator";
import CustomAlert from "../components/common/CustomAlert";
import SuccessBookingModal from "../components/common/SuccessBookingModal";
import { cleanLocationDisplay } from "../utils/locationUtils";
import { getDisplayBookingId } from "../utils/unifiedIdSystem";

// Accepts either a single booking or an array of bookings (for consolidated)
const BookingConfirmationScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const requests = Array.isArray(params?.requests)
    ? params.requests
    : params?.booking
      ? [params.booking]
      : [];
  const isConsolidation = params.isConsolidation === true; // Flag to indicate consolidation mode
  const isConsolidated = Array.isArray(requests) && requests.length > 1;
  const mode = params.mode || "shipper"; // shipper, broker, business

  // Generate a consolidation group ID for linking individual bookings
  const consolidationGroupId = isConsolidation
    ? `CONSOL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    : null;
  // Initialize pickup date from request data
  const getInitialPickupDate = () => {
    const now = new Date();
    let initialDate: Date;

    if (isConsolidated && Array.isArray(requests) && requests.length > 0) {
      // For consolidated bookings, use the pickup date from the last item
      const lastRequest = requests[requests.length - 1];
      if (lastRequest?.pickUpDate) {
        try {
          initialDate = new Date(lastRequest.pickUpDate);
        } catch (e) {
          initialDate = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else if (lastRequest?.date) {
        try {
          initialDate = new Date(lastRequest.date);
        } catch (e) {
          initialDate = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else {
        initialDate = new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hour from now
      }
    } else if (Array.isArray(requests) && requests.length > 0) {
      // For single bookings, use the pickup date from the request
      const request = requests[0];
      if (request?.pickUpDate) {
        try {
          initialDate = new Date(request.pickUpDate);
        } catch (e) {
          initialDate = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else if (request?.date) {
        try {
          initialDate = new Date(request.date);
        } catch (e) {
          initialDate = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else {
        initialDate = new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hour from now
      }
    } else {
      initialDate = new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hour from now
    }

    // Ensure the date is not in the past
    if (initialDate < now) {
      // If the date from request is in the past, set to 1 hour from now
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    return initialDate;
  };

  const [pickupDate, setPickupDate] = useState(getInitialPickupDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [postedBooking, setPostedBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<{
    distance: string;
    duration: string;
    cost: string;
  } | null>(null);
  const [individualEstimates, setIndividualEstimates] = useState<any[]>([]); // Estimates for each individual booking in consolidation
  const [totalCostRange, setTotalCostRange] = useState<{
    min: number;
    max: number;
  } | null>(null); // Total cost range for consolidation

  // Fetch backend cost estimates before posting
  React.useEffect(() => {
    const fetchBackendEstimates = async () => {
      try {
        if (!Array.isArray(requests) || requests.length === 0) return;
        setSummaryLoading(true);

        // For consolidation mode: fetch estimates for EACH individual booking
        if (isConsolidation && requests.length > 1) {
          const estimates: any[] = [];
          let totalMinCost = 0;
          let totalMaxCost = 0;

          // Fetch estimate for each individual booking
          for (const req of requests) {
            try {
              const fromLoc =
                typeof req.fromLocation === "object"
                  ? req.fromLocation.address || req.fromLocationAddress || ""
                  : req.fromLocationAddress || req.fromLocation || "";
              const toLoc =
                typeof req.toLocation === "object"
                  ? req.toLocation.address || req.toLocationAddress || ""
                  : req.toLocationAddress || req.toLocation || "";

              if (!fromLoc || !toLoc) {
                console.warn(`Missing location for request ${req.id}`);
                continue;
              }

              const fromLocationObj = req.fromLocationCoords
                ? {
                    address: fromLoc,
                    latitude: req.fromLocationCoords.latitude,
                    longitude: req.fromLocationCoords.longitude,
                  }
                : typeof req.fromLocation === "object" &&
                    req.fromLocation.latitude
                  ? {
                      address: fromLoc,
                      latitude: req.fromLocation.latitude,
                      longitude: req.fromLocation.longitude,
                    }
                  : { address: fromLoc };

              const toLocationObj = req.toLocationCoords
                ? {
                    address: toLoc,
                    latitude: req.toLocationCoords.latitude,
                    longitude: req.toLocationCoords.longitude,
                  }
                : typeof req.toLocation === "object" && req.toLocation.latitude
                  ? {
                      address: toLoc,
                      latitude: req.toLocation.latitude,
                      longitude: req.toLocation.longitude,
                    }
                  : { address: toLoc };

              // Geocode if coordinates missing
              if (!fromLocationObj.latitude || !fromLocationObj.longitude) {
                try {
                  const {
                    googleMapsService,
                  } = require("../services/googleMapsService");
                  const geocodedFrom =
                    await googleMapsService.geocodeAddress(fromLoc);
                  fromLocationObj.latitude = geocodedFrom.latitude;
                  fromLocationObj.longitude = geocodedFrom.longitude;
                } catch (error) {
                  console.error("Error geocoding fromLocation:", error);
                  continue;
                }
              }

              if (!toLocationObj.latitude || !toLocationObj.longitude) {
                try {
                  const {
                    googleMapsService,
                  } = require("../services/googleMapsService");
                  const geocodedTo =
                    await googleMapsService.geocodeAddress(toLoc);
                  toLocationObj.latitude = geocodedTo.latitude;
                  toLocationObj.longitude = geocodedTo.longitude;
                } catch (error) {
                  console.error("Error geocoding toLocation:", error);
                  continue;
                }
              }

              // Fetch estimate for this individual booking
              const estimateResponse = await apiRequest("/bookings/estimate", {
                method: "POST",
                body: JSON.stringify({
                  fromLocation: fromLocationObj,
                  toLocation: toLocationObj,
                  weightKg: Number(req.weightKg || req.weight || 0) || 0,
                  lengthCm: Number(req.lengthCm || 0),
                  widthCm: Number(req.widthCm || 0),
                  heightCm: Number(req.heightCm || 0),
                  urgencyLevel:
                    req.urgencyLevel ||
                    (req.urgency
                      ? req.urgency.charAt(0).toUpperCase() +
                        req.urgency.slice(1)
                      : "Low"),
                  perishable: !!(req.perishable || req.isPerishable),
                  needsRefrigeration: !!(
                    req.needsRefrigeration || req.isPerishable
                  ),
                  humidityControl: !!(req.humidyControl || req.isPerishable),
                  specialCargo: req.specialCargo || [],
                  bulkness: !!req.bulkness,
                  insured: !!(req.insured || req.insureGoods),
                  value: Number(req.value || req.insuranceValue || 0) || 0,
                  tolls: Number(req.tolls || 0) || 0,
                  fuelSurchargePct: Number(req.fuelSurchargePct || 0) || 0,
                  waitMinutes: Number(req.waitMinutes || 0) || 0,
                  nightSurcharge: !!req.nightSurcharge,
                  vehicleType: req.vehicleType || "truck",
                }),
              });

              if (estimateResponse) {
                // Use estimatedCostRange if available (Mumbua's format), otherwise fall back to costRange
                const minCost =
                  estimateResponse.estimatedCostRange?.min ||
                  estimateResponse.costRange?.min ||
                  estimateResponse.minCost ||
                  estimateResponse.estimatedCost ||
                  0;
                const maxCost =
                  estimateResponse.estimatedCostRange?.max ||
                  estimateResponse.costRange?.max ||
                  estimateResponse.maxCost ||
                  estimateResponse.estimatedCost ||
                  0;

                totalMinCost += minCost;
                totalMaxCost += maxCost;

                estimates.push({
                  request: req,
                  estimate: estimateResponse,
                  minCost,
                  maxCost,
                });
              } else {
                console.warn(`No estimate response for request ${req.id}`);
              }
            } catch (error) {
              console.error(
                `Error fetching estimate for request ${req.id}:`,
                error,
              );
              // Continue with other requests even if one fails
            }
          }

          setIndividualEstimates(estimates);
          setTotalCostRange({ min: totalMinCost, max: totalMaxCost });

          // Debug logging for consolidation
          console.log("Consolidation Summary:", {
            totalRequests: requests.length,
            successfulEstimates: estimates.length,
            totalMinCost,
            totalMaxCost,
            individualCosts: estimates.map((e) => ({
              min: e.minCost,
              max: e.maxCost,
            })),
          });

          // Set summary - For consolidation, only show total cost range
          // Distance and duration vary per booking, so we can't sum them
          if (estimates.length > 0 && totalMinCost > 0 && totalMaxCost > 0) {
            const totalCostDisplay = formatCostRange({
              costRange: { min: totalMinCost, max: totalMaxCost },
            });
            setSummary({
              distance: "Varies", // Multiple routes with different distances
              duration: "Varies", // Multiple routes with different durations
              cost: totalCostDisplay, // Only cost can be summed
            });
            setSummaryLoading(false);
          } else {
            // If no estimates, show error in summary
            setSummary({
              distance: "N/A",
              duration: "N/A",
              cost: "Unable to calculate",
            });
            setSummaryLoading(false);
          }
        } else {
          // Single booking - use original logic
          // NOTE: If isConsolidation is true, we should never reach here (handled above)
          // For consolidation, we should NOT calculate distance/duration as they vary per booking
          if (isConsolidation) {
            // This should not happen, but if it does, set summary without distance/duration
            setSummaryLoading(false);
            setSummary({
              distance: "Varies",
              duration: "Varies",
              cost: "Unable to calculate - please check individual bookings",
            });
            return;
          }

          try {
            const req = requests[0];
            if (!req) {
              setSummaryLoading(false);
              return;
            }

            // If this is actually a consolidation (multiple requests) but isConsolidation flag wasn't set,
            // we should still treat it as a consolidation and show only cost
            const shouldTreatAsConsolidation =
              requests.length > 1 && !isConsolidation;

            // For consolidated bookings (multiple requests), use first pickup and find furthest drop-off
            // But only calculate distance/duration if NOT treating as consolidation
            let fromLoc: string;
            let toLoc: string;
            let fromLocationObj: any;
            let toLocationObj: any;

            if (
              isConsolidated &&
              requests.length > 1 &&
              !shouldTreatAsConsolidation
            ) {
              // Use first request's pickup location (as user suggested)
              const firstReq = requests[0];
              fromLoc =
                typeof firstReq.fromLocation === "object"
                  ? firstReq.fromLocation.address ||
                    firstReq.fromLocationAddress ||
                    ""
                  : firstReq.fromLocationAddress || firstReq.fromLocation || "";

              // Find furthest drop-off location from the pickup
              let maxDistance = 0;
              let furthestDropOff = firstReq.toLocation;
              let furthestDropOffAddress =
                typeof firstReq.toLocation === "object"
                  ? firstReq.toLocation.address ||
                    firstReq.toLocationAddress ||
                    ""
                  : firstReq.toLocationAddress || firstReq.toLocation || "";

              // Get pickup coordinates for distance calculation
              const pickupLat =
                firstReq.fromLocationCoords?.latitude ||
                (typeof firstReq.fromLocation === "object"
                  ? firstReq.fromLocation.latitude
                  : null);
              const pickupLng =
                firstReq.fromLocationCoords?.longitude ||
                (typeof firstReq.fromLocation === "object"
                  ? firstReq.fromLocation.longitude
                  : null);

              if (pickupLat !== null && pickupLng !== null) {
                // Calculate distance to each drop-off to find furthest
                requests.forEach((r: any) => {
                  const dropLat =
                    r.toLocationCoords?.latitude ||
                    (typeof r.toLocation === "object"
                      ? r.toLocation.latitude
                      : null);
                  const dropLng =
                    r.toLocationCoords?.longitude ||
                    (typeof r.toLocation === "object"
                      ? r.toLocation.longitude
                      : null);

                  if (dropLat !== null && dropLng !== null) {
                    const distance = Math.sqrt(
                      Math.pow(dropLat - pickupLat, 2) +
                        Math.pow(dropLng - pickupLng, 2),
                    );
                    if (distance > maxDistance) {
                      maxDistance = distance;
                      furthestDropOff = r.toLocation;
                      furthestDropOffAddress =
                        typeof r.toLocation === "object"
                          ? r.toLocation.address || r.toLocationAddress || ""
                          : r.toLocationAddress || r.toLocation || "";
                    }
                  }
                });
              }

              toLoc = furthestDropOffAddress;

              // Build location objects
              fromLocationObj =
                firstReq.fromLocationCoords ||
                (typeof firstReq.fromLocation === "object" &&
                firstReq.fromLocation.latitude
                  ? {
                      address: fromLoc,
                      latitude: firstReq.fromLocation.latitude,
                      longitude: firstReq.fromLocation.longitude,
                    }
                  : { address: fromLoc });

              // Find drop-off coordinates
              const furthestReq =
                requests.find((r: any) => {
                  const dropAddr =
                    typeof r.toLocation === "object"
                      ? r.toLocation.address || r.toLocationAddress || ""
                      : r.toLocationAddress || r.toLocation || "";
                  return dropAddr === toLoc;
                }) || requests[0];

              toLocationObj =
                furthestReq.toLocationCoords ||
                (typeof furthestReq.toLocation === "object" &&
                furthestReq.toLocation.latitude
                  ? {
                      address: toLoc,
                      latitude: furthestReq.toLocation.latitude,
                      longitude: furthestReq.toLocation.longitude,
                    }
                  : { address: toLoc });

              // Geocode if coordinates missing for consolidated single estimate
              if (!fromLocationObj.latitude || !fromLocationObj.longitude) {
                try {
                  const {
                    googleMapsService,
                  } = require("../services/googleMapsService");
                  const geocodedFrom =
                    await googleMapsService.geocodeAddress(fromLoc);
                  fromLocationObj.latitude = geocodedFrom.latitude;
                  fromLocationObj.longitude = geocodedFrom.longitude;
                } catch (error) {
                  console.error(
                    "Error geocoding fromLocation (consolidated):",
                    error,
                  );
                  setSummaryLoading(false);
                  setSummary({
                    distance: "N/A",
                    duration: "N/A",
                    cost: "Unable to geocode pickup location",
                  });
                  return;
                }
              }

              if (!toLocationObj.latitude || !toLocationObj.longitude) {
                try {
                  const {
                    googleMapsService,
                  } = require("../services/googleMapsService");
                  const geocodedTo =
                    await googleMapsService.geocodeAddress(toLoc);
                  toLocationObj.latitude = geocodedTo.latitude;
                  toLocationObj.longitude = geocodedTo.longitude;
                } catch (error) {
                  console.error(
                    "Error geocoding toLocation (consolidated):",
                    error,
                  );
                  setSummaryLoading(false);
                  setSummary({
                    distance: "N/A",
                    duration: "N/A",
                    cost: "Unable to geocode dropoff location",
                  });
                  return;
                }
              }
            } else {
              // Single booking - use original logic
              fromLoc =
                typeof req.fromLocation === "object"
                  ? req.fromLocation.address || req.fromLocationAddress || ""
                  : req.fromLocationAddress || req.fromLocation || "";
              toLoc =
                typeof req.toLocation === "object"
                  ? req.toLocation.address || req.toLocationAddress || ""
                  : req.toLocationAddress || req.toLocation || "";

              // Build location objects with exact addresses
              fromLocationObj = req.fromLocationCoords
                ? {
                    address: fromLoc,
                    latitude: req.fromLocationCoords.latitude,
                    longitude: req.fromLocationCoords.longitude,
                  }
                : typeof req.fromLocation === "object" &&
                    req.fromLocation.latitude
                  ? {
                      address: fromLoc,
                      latitude: req.fromLocation.latitude,
                      longitude: req.fromLocation.longitude,
                    }
                  : { address: fromLoc };

              toLocationObj = req.toLocationCoords
                ? {
                    address: toLoc,
                    latitude: req.toLocationCoords.latitude,
                    longitude: req.toLocationCoords.longitude,
                  }
                : typeof req.toLocation === "object" && req.toLocation.latitude
                  ? {
                      address: toLoc,
                      latitude: req.toLocation.latitude,
                      longitude: req.toLocation.longitude,
                    }
                  : { address: toLoc };
            }

            if (!fromLoc || !toLoc) {
              console.warn("Missing location addresses for estimate");
              setSummaryLoading(false);
              return;
            }

            // Geocode if coordinates are missing (for both single booking and consolidated single estimate)
            if (!fromLocationObj.latitude || !fromLocationObj.longitude) {
              try {
                const {
                  googleMapsService,
                } = require("../services/googleMapsService");
                const geocodedFrom =
                  await googleMapsService.geocodeAddress(fromLoc);
                fromLocationObj.latitude = geocodedFrom.latitude;
                fromLocationObj.longitude = geocodedFrom.longitude;
              } catch (error) {
                console.error("Error geocoding fromLocation:", error);
                setSummaryLoading(false);
                setSummary({
                  distance: "N/A",
                  duration: "N/A",
                  cost: "Unable to geocode pickup location",
                });
                return;
              }
            }

            if (!toLocationObj.latitude || !toLocationObj.longitude) {
              try {
                const {
                  googleMapsService,
                } = require("../services/googleMapsService");
                const geocodedTo =
                  await googleMapsService.geocodeAddress(toLoc);
                toLocationObj.latitude = geocodedTo.latitude;
                toLocationObj.longitude = geocodedTo.longitude;
              } catch (error) {
                console.error("Error geocoding toLocation:", error);
                setSummaryLoading(false);
                setSummary({
                  distance: "N/A",
                  duration: "N/A",
                  cost: "Unable to geocode dropoff location",
                });
                return;
              }
            }

            // Calculate total weight for consolidated bookings
            const totalWeight =
              isConsolidated && requests.length > 1
                ? requests.reduce((sum, r: any) => {
                    return sum + (Number(r.weightKg || r.weight || 0) || 0);
                  }, 0)
                : Number(req.weightKg || req.weight || 0) || 0;

            // Fetch estimate from backend
            const estimateResponse = await apiRequest("/bookings/estimate", {
              method: "POST",
              body: JSON.stringify({
                fromLocation: fromLocationObj,
                toLocation: toLocationObj,
                weightKg: totalWeight,
                lengthCm: Number(req.lengthCm || 0),
                widthCm: Number(req.widthCm || 0),
                heightCm: Number(req.heightCm || 0),
                urgencyLevel:
                  req.urgencyLevel ||
                  (req.urgency
                    ? req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)
                    : "Low"),
                perishable: !!(req.perishable || req.isPerishable),
                needsRefrigeration: !!(
                  req.needsRefrigeration || req.isPerishable
                ),
                humidityControl: !!(req.humidyControl || req.isPerishable),
                specialCargo: req.specialCargo || [],
                bulkness: !!req.bulkness,
                insured: !!(req.insured || req.insureGoods),
                value: Number(req.value || req.insuranceValue || 0) || 0,
                tolls: Number(req.tolls || 0) || 0,
                fuelSurchargePct: Number(req.fuelSurchargePct || 0) || 0,
                waitMinutes: Number(req.waitMinutes || 0) || 0,
                nightSurcharge: !!req.nightSurcharge,
                vehicleType: req.vehicleType || "truck",
              }),
            });

            if (estimateResponse) {
              // Use formatCostRange utility to ensure consistent display with backend format
              // Backend returns: { estimatedCost, minCost, maxCost, costRange, estimatedCostRange }
              const costDisplay = formatCostRange(estimateResponse);

              // If this should be treated as consolidation (multiple requests without flag),
              // only set cost, not distance/duration
              if (shouldTreatAsConsolidation) {
                setSummary({
                  distance: "Varies", // Not shown in UI but set for consistency
                  duration: "Varies", // Not shown in UI but set for consistency
                  cost: costDisplay,
                });
              } else {
                // Single booking - show all details
                setSummary({
                  distance: estimateResponse.estimatedDistance || "N/A",
                  duration: estimateResponse.estimatedDuration || "N/A",
                  cost: costDisplay,
                });
              }
            }
          } catch (singleError) {
            console.error(
              "Error fetching single booking estimate:",
              singleError,
            );
            setSummary({
              distance: "N/A",
              duration: "N/A",
              cost: "N/A",
            });
          }
        }
      } catch (e) {
        // Backend estimate failed - show error but don't use frontend calculation
        // All costs must come from backend to ensure consistency
        console.error("Backend estimate failed:", e);
        setSummary({
          distance: "N/A",
          duration: "N/A",
          cost: "N/A",
        });
        Alert.alert(
          "Estimate Error",
          "Failed to get cost estimate from server. Please try again or contact support.",
          [{ text: "OK" }],
        );
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchBackendEstimates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for posting booking(s)
  const handlePostBooking = async () => {
    setPosting(true);

    // Add timeout to prevent infinite posting state
    const timeoutId = setTimeout(() => {
      console.error("❌ Booking request timeout after 30 seconds");
      setPosting(false);
      Alert.alert(
        "Timeout",
        "The booking request is taking too long. Please try again.",
      );
    }, 30000);

    // Prepare payload outside try block so it's available in catch block
    let payload: any[] = [];

    try {
      // Validate requests data
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error("No booking requests found. Please try again.");
      }

      // Validating booking requests

      // Prepare payload for backend booking format
      payload = requests
        .filter((req) => req != null)
        .map((req: any, index: number) => {
          // Validate required fields
          if (!req.fromLocation || !req.toLocation) {
            throw new Error(
              `Request ${index + 1} is missing required location information.`,
            );
          }
          if (!req.productType) {
            throw new Error(`Request ${index + 1} is missing product type.`);
          }
          if (!req.weight || isNaN(parseFloat(req.weight))) {
            throw new Error(`Request ${index + 1} has invalid weight.`);
          }

          // Ensure locations preserve exact address selected by user
          const formatLocation = (location: any, addressField?: string) => {
            // Priority: Use exact address from addressField (fromLocationAddress/toLocationAddress)
            if (addressField) {
              const lat = location?.latitude || location?.lat;
              const lng = location?.longitude || location?.lng;

              if (
                lat !== undefined &&
                lng !== undefined &&
                !isNaN(lat) &&
                !isNaN(lng)
              ) {
                return {
                  address: addressField, // Exact address user selected
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                };
              } else {
                return {
                  address: addressField, // Exact address user selected
                  latitude: null,
                  longitude: null,
                };
              }
            }

            if (typeof location === "string") {
              // If it's a string, preserve the exact address
              return {
                address: location,
                latitude: null,
                longitude: null,
              };
            } else if (location && typeof location === "object") {
              const lat = location.latitude || location.lat;
              const lng = location.longitude || location.lng;

              // Prioritize exact address from location object
              let address = location.address || location.name;
              if (!address) {
                address = "Unknown location";
              }

              // If we have valid coordinates, use them
              if (
                lat !== undefined &&
                lng !== undefined &&
                !isNaN(lat) &&
                !isNaN(lng)
              ) {
                return {
                  address, // Use exact address
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                };
              } else {
                // No valid coordinates - use address only
                return {
                  address: address || "Unknown location",
                  latitude: null,
                  longitude: null,
                };
              }
            } else {
              // Fallback for invalid location data
              return {
                address: "Unknown location",
                latitude: null,
                longitude: null,
              };
            }
          };

          // Don't generate readableId here - backend will generate it
          // We'll use the backend-generated readableId from the response
          const bookingType =
            req.bookingType || (req.type === "agriTRUK" ? "Agri" : "Cargo");

          // Complete payload with all required fields for backend
          // Based on the database record structure you provided
          const bookingData: any = {
            // Backend will generate readableId - don't include it here
            // Core booking fields - match database structure
            bookingType: bookingType,
            bookingMode: "booking",
            // Preserve exact addresses selected by user
            fromLocation: formatLocation(
              req.fromLocation,
              req.fromLocationAddress,
            ),
            toLocation: formatLocation(req.toLocation, req.toLocationAddress),
            productType: req.productType,
            weightKg: req.weightKg || parseFloat(req.weight) || 0,
            pickUpDate: pickupDate.toISOString(),
            urgencyLevel:
              req.urgencyLevel ||
              (req.urgency
                ? req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)
                : "Low"),

            // Cargo specifications - match database structure
            perishable: req.perishable || req.isPerishable || false,
            needsRefrigeration:
              req.needsRefrigeration || req.isPerishable || false,
            humidyControl: req.humidyControl || req.isPerishable || false, // Note: backend expects 'humidyControl'

            // Special cargo and insurance - match database structure
            specialCargo:
              req.specialCargo ||
              (req.isSpecialCargo ? req.specialCargoSpecs || [] : []),
            insured: req.insured || req.insureGoods || false,
            value:
              req.value ||
              (req.insuranceValue ? parseFloat(req.insuranceValue) : 0),

            // Additional information - match database structure
            additionalNotes: req.additionalNotes || req.additional || "",
            specialRequest: req.specialRequest || req.additional || "",

            // Dimensions and costs - match database structure
            lengthCm: req.lengthCm || 0,
            widthCm: req.widthCm || 0,
            heightCm: req.heightCm || 0,
            tolls: req.tolls || 0,
            fuelSurchargePct: req.fuelSurchargePct || 0,
            waitMinutes: req.waitMinutes || 0,
            nightSurcharge: req.nightSurcharge || false,

            // Booking metadata - match database structure
            consolidated: isConsolidation ? true : false, // Mark as part of consolidation
            consolidationGroupId: isConsolidation ? consolidationGroupId : null, // Link bookings in consolidation group - all bookings in this group share the same ID
            status: "pending",

            // Recurrence - match database structure
            recurrence: {
              isRecurring: false,
              frequency: null,
              timeFrame: null,
              duration: null,
              startDate: null,
              endDate: null,
              interval: 1,
              occurences: [],
              baseBookingId: null,
            },
          };

          // If broker mode, attach broker/client attribution
          if (mode === "broker") {
            try {
              const { getAuth } = require("firebase/auth");
              const auth = getAuth();
              const user = auth.currentUser;
              const selectedClient = params.selectedClient;
              bookingData.brokerData = {
                brokerId: user?.uid,
                brokerName: user?.email || "Broker",
                clientId: selectedClient?.id || selectedClient?.userId,
                clientName:
                  selectedClient?.name ||
                  selectedClient?.company ||
                  selectedClient?.email,
              };
              // Also include client fields to help backend indexing
              bookingData.clientId = bookingData.brokerData.clientId;
              bookingData.clientName = bookingData.brokerData.clientName;
            } catch {}
          }
          return bookingData;
        });

      // Sending booking confirmation to backend
      // Validating booking data before sending
      // Sending request to backend

      // For consolidation mode: create multiple individual bookings
      if (isConsolidation && payload.length > 1) {
        const createdBookings: any[] = [];
        const errors: any[] = [];

        // Create each booking individually
        for (let i = 0; i < payload.length; i++) {
          const bookingPayload = payload[i];
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              const response = await apiRequest("/bookings", {
                method: "POST",
                body: JSON.stringify(bookingPayload),
              });

              createdBookings.push({
                ...bookingPayload,
                bookingId: response?.bookingId || response?.id,
                readableId: response?.readableId,
                response: response,
              });

              break; // Success, exit retry loop for this booking
            } catch (error: any) {
              retryCount++;

              if (retryCount >= maxRetries) {
                errors.push({
                  booking: bookingPayload,
                  error: error.message || "Failed to create booking",
                });
                break; // Move to next booking
              }

              // Wait before retry (exponential backoff)
              const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }
        }

        // Check if all bookings were created successfully
        if (errors.length > 0) {
          throw new Error(
            `Failed to create ${errors.length} of ${payload.length} bookings. Please try again.`,
          );
        }

        // Store all created bookings
        setPostedBooking({
          ...createdBookings[0],
          allBookings: createdBookings, // Store all individual bookings
          consolidationGroupId: consolidationGroupId,
        });

        // Use the first booking's ID for display
        const extractedBookingId =
          createdBookings[0]?.readableId ||
          createdBookings[0]?.bookingId ||
          "N/A";
        setBookingId(extractedBookingId);
        setShowSuccessModal(true);

        // Send notifications for all bookings
        try {
          const {
            NotificationHelper,
          } = require("../services/notificationHelper");
          const { getAuth } = require("firebase/auth");
          const auth = getAuth();
          const user = auth.currentUser;

          if (user) {
            for (const booking of createdBookings) {
              await NotificationHelper.sendBookingNotification("created", {
                userId: user.uid,
                role: "customer",
                bookingId: booking.readableId || booking.bookingId,
                fromLocation:
                  booking.fromLocation?.address || "Pickup location",
                toLocation: booking.toLocation?.address || "Delivery location",
              });
            }
          }
        } catch (notificationError) {
          console.warn(
            "Failed to send booking creation notifications:",
            notificationError,
          );
        }

        return; // Exit early for consolidation mode
      }

      // Single booking mode: use original logic
      // Post to backend bookings endpoint with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Attempting booking submission
          response = await apiRequest("/bookings", {
            method: "POST",
            body: JSON.stringify(payload[0]),
          });

          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;

          if (retryCount >= maxRetries) {
            throw error; // Re-throw if all retries failed
          }

          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      // Booking posted successfully

      // Extract booking ID from response - prioritize readable ID from backend
      const extractedBookingId = String(
        response?.readableId || // New readable ID from backend
          response?.bookingId ||
          response?.id ||
          response?.data?.bookingId ||
          response?.data?.id ||
          response?.booking?.bookingId ||
          "N/A",
      );
      console.log(
        "✅ Booking created successfully with ID:",
        extractedBookingId,
      );
      console.log("🔍 Booking ID extraction details:", {
        "response.readableId": response?.readableId,
        "response.bookingId": response?.bookingId,
        "response.id": response?.id,
        "response.data?.bookingId": response?.data?.bookingId,
        "response.data?.id": response?.data?.id,
        "response.booking?.bookingId": response?.booking?.bookingId,
        final: extractedBookingId,
      });
      // Prepare booking object for consistent display ID across screens
      const displayBooking = {
        ...payload[0],
        id:
          response?.id ||
          response?.booking?.id ||
          response?.data?.id ||
          extractedBookingId,
        bookingId: response?.bookingId || extractedBookingId,
        readableId: response?.readableId || payload[0]?.readableId,
        createdAt: response?.createdAt || new Date().toISOString(),
      };
      setPostedBooking(displayBooking);
      setBookingId(extractedBookingId);
      setShowSuccessModal(true);

      // Send booking creation notification
      try {
        const {
          NotificationHelper,
        } = require("../services/notificationHelper");
        const { getAuth } = require("firebase/auth");
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          await NotificationHelper.sendBookingNotification("created", {
            userId: user.uid,
            role: "customer",
            bookingId: extractedBookingId,
            fromLocation:
              requests[0]?.fromLocation?.address || "Pickup location",
            toLocation: requests[0]?.toLocation?.address || "Delivery location",
          });
        }
      } catch (notificationError) {
        console.warn(
          "Failed to send booking creation notification:",
          notificationError,
        );
      }
    } catch (error: any) {
      // Booking confirmation error

      // Don't fallback to local storage - show error instead
      setErrorMessage(
        `Failed to create booking: ${error.message || "Server error"}. Please check your details and try again.`,
      );
      setShowErrorAlert(true);
    } finally {
      clearTimeout(timeoutId);
      setPosting(false);
    }
  };

  const getRoleBasedNavigation = () => {
    // Determine the correct navigation target based on user role/mode
    switch (mode) {
      case "business":
        return "BusinessTabs";
      case "broker":
        return "BrokerTabs";
      case "transporter":
        return "TransporterTabs";
      case "shipper":
      default:
        return "MainTabs";
    }
  };

  const getBookingManagementScreen = () => {
    // Determine the correct booking management screen based on user role/mode
    switch (mode) {
      case "business":
        return {
          screen: "BusinessTabs",
          params: { screen: "Management", params: { activeTab: "requests" } },
        };
      case "broker":
        return {
          screen: "BrokerTabs",
          params: { screen: "Management", params: { activeTab: "requests" } },
        };
      case "transporter":
        return {
          screen: "TransporterTabs",
          params: { screen: "BookingManagement" },
        };
      case "shipper":
      default:
        return { screen: "MainTabs", params: { screen: "Activity" } };
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate to the appropriate home screen based on user role
    const targetScreen = getRoleBasedNavigation();
    navigation.navigate(targetScreen);
  };

  const handleViewBooking = async () => {
    try {
      // Navigate to the appropriate booking management screen based on user role
      const targetScreen = getBookingManagementScreen();

      // Use CommonActions for nested navigation
      const { CommonActions } = require("@react-navigation/native");

      if (typeof targetScreen === "string") {
        navigation.dispatch(
          CommonActions.navigate({
            name: targetScreen,
            params: {
              focusBookingId: postedBooking?.readableId || bookingId,
              highlight: true,
            },
          }),
        );
      } else {
        // Handle nested tab navigator structure
        navigation.dispatch(
          CommonActions.navigate({
            name: targetScreen.screen,
            params: {
              ...targetScreen.params,
              focusBookingId: postedBooking?.readableId || bookingId,
              highlight: true,
            },
          }),
        );
      }

      // Close success modal after navigation
      setShowSuccessModal(false);
    } catch (error) {
      console.error("Error navigating to booking management:", error);
      // Fallback: try simple navigation
      try {
        const targetScreen = getBookingManagementScreen();
        if (typeof targetScreen === "string") {
          navigation?.navigate?.(targetScreen);
        } else {
          navigation?.navigate?.(targetScreen.screen, targetScreen.params);
        }
        setShowSuccessModal(false);
      } catch (fallbackError) {
        console.error("Fallback navigation also failed:", fallbackError);
        // Last resort: navigate to home and show error
        Alert.alert(
          "Navigation Error",
          "Unable to open booking management. Please navigate manually.",
          [{ text: "OK", onPress: () => setShowSuccessModal(false) }],
        );
      }
    }
  };

  const handleContinue = () => {
    // Navigate to the appropriate home screen based on user role
    const targetScreen = getRoleBasedNavigation();
    navigation.navigate(targetScreen);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <MaterialCommunityIcons
                name={
                  isConsolidation || isConsolidated
                    ? "package-variant-closed"
                    : "check-circle"
                }
                size={24}
                color={colors.primary}
              />
              <Text
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {isConsolidation
                  ? "Confirm Consolidated Booking"
                  : isConsolidated
                    ? "Confirm Consolidated Booking"
                    : "Confirm Booking"}
                {mode !== "shipper" && ` (${mode})`}
              </Text>
            </View>

            {/* Consolidation Preview - Show individual bookings with their details */}
            {isConsolidation && individualEstimates.length > 0 && (
              <View style={styles.consolidationPreviewCard}>
                <View style={styles.consolidationHeader}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.consolidationTitle}>
                    Consolidation Preview
                  </Text>
                </View>
                <Text style={styles.consolidationSubtitle}>
                  {individualEstimates.length} individual booking
                  {individualEstimates.length > 1 ? "s" : ""} will be created
                </Text>

                <ScrollView
                  style={styles.individualBookingsList}
                  nestedScrollEnabled
                >
                  {individualEstimates.map((item, index) => (
                    <View
                      key={item.request.id || index}
                      style={styles.individualBookingCard}
                    >
                      <View style={styles.individualBookingHeader}>
                        <Text style={styles.individualBookingId}>
                          Booking {index + 1}:{" "}
                          {getDisplayBookingId({
                            ...item.request,
                            readableId: item.request.readableId,
                            bookingType:
                              item.request.bookingType ||
                              (item.request.type === "agriTRUK"
                                ? "Agri"
                                : "Cargo"),
                            bookingMode:
                              item.request.bookingMode ||
                              (item.request.requestType === "instant"
                                ? "instant"
                                : "booking"),
                            createdAt:
                              item.request.createdAt || item.request.date,
                            bookingId:
                              item.request.id || item.request.bookingId,
                          })}
                        </Text>
                      </View>
                      <View style={styles.individualBookingDetails}>
                        <View style={styles.individualBookingRow}>
                          <MaterialCommunityIcons
                            name="map-marker"
                            size={16}
                            color={colors.primary}
                          />
                          <Text style={styles.individualBookingText}>
                            <Text style={styles.individualBookingLabel}>
                              From:{" "}
                            </Text>
                            {item.request.fromLocationAddress ||
                              (typeof item.request.fromLocation === "object"
                                ? item.request.fromLocation.address
                                : item.request.fromLocation || "Unknown")}
                          </Text>
                        </View>
                        <View style={styles.individualBookingRow}>
                          <MaterialCommunityIcons
                            name="map-marker-check"
                            size={16}
                            color={colors.success}
                          />
                          <Text style={styles.individualBookingText}>
                            <Text style={styles.individualBookingLabel}>
                              To:{" "}
                            </Text>
                            {item.request.toLocationAddress ||
                              (typeof item.request.toLocation === "object"
                                ? item.request.toLocation.address
                                : item.request.toLocation || "Unknown")}
                          </Text>
                        </View>
                        <View style={styles.individualBookingRow}>
                          <MaterialCommunityIcons
                            name="package-variant"
                            size={16}
                            color={colors.secondary}
                          />
                          <Text style={styles.individualBookingText}>
                            <Text style={styles.individualBookingLabel}>
                              Product:{" "}
                            </Text>
                            {item.request.productType} |{" "}
                            {item.request.weight ||
                              item.request.weightKg ||
                              "0"}
                            kg
                          </Text>
                        </View>
                        <View style={styles.individualBookingRow}>
                          <MaterialCommunityIcons
                            name="ruler"
                            size={16}
                            color={colors.tertiary}
                          />
                          <Text style={styles.individualBookingText}>
                            <Text style={styles.individualBookingLabel}>
                              Distance:{" "}
                            </Text>
                            {item.estimate.estimatedDistance || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.individualBookingRow}>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={16}
                            color={colors.tertiary}
                          />
                          <Text style={styles.individualBookingText}>
                            <Text style={styles.individualBookingLabel}>
                              Duration:{" "}
                            </Text>
                            {item.estimate.estimatedDuration || "N/A"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.individualBookingRow,
                            { marginTop: 4 },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="cash"
                            size={16}
                            color={colors.success}
                          />
                          <Text
                            style={[
                              styles.individualBookingText,
                              { fontWeight: "bold", color: colors.primary },
                            ]}
                          >
                            <Text style={styles.individualBookingLabel}>
                              Cost:{" "}
                            </Text>
                            {formatCostRange(item.estimate)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Total Cost Range */}
                {totalCostRange && (
                  <View style={styles.totalCostCard}>
                    <MaterialCommunityIcons
                      name="calculator"
                      size={20}
                      color={colors.primary}
                    />
                    <View style={styles.totalCostInfo}>
                      <Text style={styles.totalCostLabel}>
                        Total Cost Range
                      </Text>
                      <Text style={styles.totalCostValue}>
                        {formatCostRange({ costRange: totalCostRange })}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Regular Booking List - for non-consolidation mode */}
            {!isConsolidation && (
              <View style={{ maxHeight: 180, marginBottom: 18 }}>
                {requests.map((item: any, index: number) => (
                  <View
                    key={item.id || index}
                    style={[
                      styles.bookingCard,
                      index % 2 === 0
                        ? { backgroundColor: colors.surface }
                        : { backgroundColor: colors.background },
                    ]}
                  >
                    <Text style={styles.bookingId}>
                      Request ID:{" "}
                      {getDisplayBookingId({
                        ...item,
                        readableId: item.readableId,
                        bookingType:
                          item.bookingType ||
                          (item.type === "agriTRUK" ? "Agri" : "Cargo"),
                        bookingMode:
                          item.bookingMode ||
                          (item.requestType === "instant"
                            ? "instant"
                            : "booking"),
                        createdAt: item.createdAt || item.date,
                        bookingId: item.id || item.bookingId,
                      })}
                    </Text>
                    <Text style={styles.bookingDetail}>
                      From:{" "}
                      <Text style={{ fontWeight: "bold" }}>
                        {item.fromLocationAddress ||
                          (typeof item.fromLocation === "object"
                            ? item.fromLocation.address
                            : item.fromLocation || "Unknown")}
                      </Text>
                    </Text>
                    <Text style={styles.bookingDetail}>
                      To:{" "}
                      <Text style={{ fontWeight: "bold" }}>
                        {item.toLocationAddress ||
                          (typeof item.toLocation === "object"
                            ? item.toLocation.address
                            : item.toLocation || "Unknown")}
                      </Text>
                    </Text>
                    <Text style={styles.bookingDetail}>
                      Product: {item.productType} | {item.weight}kg
                    </Text>
                    <Text style={styles.bookingDetail}>
                      Type: {item.type === "agriTRUK" ? "Agri" : "Cargo"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.dateRow}>
              <Text style={styles.label}>Pickup Date & Time</Text>
              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={colors.secondary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.dateText}>
                  {pickupDate.toLocaleString()}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="datetime"
                date={pickupDate}
                minimumDate={new Date()} // Prevent selecting past dates
                onConfirm={(date) => {
                  // Ensure the selected date is not in the past
                  const now = new Date();
                  if (date < now) {
                    Alert.alert(
                      "Invalid Date",
                      "Pickup date must be in the future.",
                    );
                    return;
                  }
                  setPickupDate(date);
                  setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons
                  name="clipboard-text"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.summaryTitle}>Booking Summary</Text>
              </View>
              {summaryLoading ? (
                <Text style={styles.summaryRowValue}>
                  Calculating summary...
                </Text>
              ) : (
                <>
                  {/* For consolidation, only show cost (distance/duration vary per booking) */}
                  {/* Show consolidation view if: isConsolidation flag is true OR we have individual estimates */}
                  {isConsolidation || individualEstimates.length > 0 ? (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryRowLabel}>
                          Total Estimated Cost
                        </Text>
                        <Text
                          style={[
                            styles.summaryRowValue,
                            { color: colors.primary, fontWeight: "bold" },
                          ]}
                        >
                          {totalCostRange
                            ? formatCostRange({ costRange: totalCostRange })
                            : summary?.cost || "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryRowLabel}>
                          Number of Bookings
                        </Text>
                        <Text style={styles.summaryRowValue}>
                          {individualEstimates.length || requests.length || "—"}
                        </Text>
                      </View>
                      {/* Show list of all bookings in summary */}
                      {individualEstimates.length > 0 && (
                        <View style={styles.summaryBookingsList}>
                          <Text style={styles.summaryBookingsTitle}>
                            Individual Bookings:
                          </Text>
                          {individualEstimates.map((item, index) => (
                            <View
                              key={item.request.id || index}
                              style={styles.summaryBookingItem}
                            >
                              <Text style={styles.summaryBookingText}>
                                <Text style={{ fontWeight: "600" }}>
                                  Booking {index + 1}:
                                </Text>{" "}
                                {getDisplayBookingId({
                                  ...item.request,
                                  readableId: item.request.readableId,
                                  bookingType:
                                    item.request.bookingType ||
                                    (item.request.type === "agriTRUK"
                                      ? "Agri"
                                      : "Cargo"),
                                  bookingMode:
                                    item.request.bookingMode ||
                                    (item.request.requestType === "instant"
                                      ? "instant"
                                      : "booking"),
                                  createdAt:
                                    item.request.createdAt || item.request.date,
                                  bookingId:
                                    item.request.id || item.request.bookingId,
                                })}{" "}
                                - {formatCostRange(item.estimate)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Note explaining why distance/duration are not shown */}
                      <View style={styles.summaryNote}>
                        <MaterialCommunityIcons
                          name="information-outline"
                          size={16}
                          color={colors.primary}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.summaryNoteText}>
                          <Text style={{ fontWeight: "600" }}>Note: </Text>
                          Distance and duration vary per booking and cannot be
                          combined. The total cost range above is the sum of all
                          individual booking costs. See individual booking
                          details above for specific route information
                          (distance, duration, and cost per booking).
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryRowLabel}>
                          Estimated Distance
                        </Text>
                        <Text style={styles.summaryRowValue}>
                          {summary?.distance || "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryRowLabel}>
                          Estimated Duration
                        </Text>
                        <Text style={styles.summaryRowValue}>
                          {summary?.duration || "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryRowLabel}>
                          Estimated Cost
                        </Text>
                        <Text
                          style={[
                            styles.summaryRowValue,
                            { color: colors.primary, fontWeight: "bold" },
                          ]}
                        >
                          {summary?.cost || "—"}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    if (navigation.canGoBack()) navigation.goBack();
                    else
                      navigation?.navigate?.(
                        mode === "business"
                          ? "BusinessRequest"
                          : "ServiceRequest",
                      );
                  }}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.backBtnText}>Back to Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Submit Button at Bottom */}
        <View
          style={[
            styles.fixedButtonContainer,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <TouchableOpacity
            style={[styles.postBtn, posting && { opacity: 0.6 }]}
            onPress={handlePostBooking}
            disabled={posting}
          >
            {posting ? (
              <>
                <MaterialCommunityIcons
                  name="loading"
                  size={22}
                  color={colors.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.postBtnText}>Posting...</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={22}
                  color={colors.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.postBtnText}>Confirm & Post Booking</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SuccessBookingModal
        visible={showSuccessModal}
        onClose={handleSuccessModalClose}
        bookingId={bookingId}
        booking={postedBooking}
        isConsolidated={isConsolidated}
        onViewBooking={handleViewBooking}
        onContinue={handleContinue}
      />

      <CustomAlert
        visible={showErrorAlert}
        title="Booking Failed"
        message={errorMessage}
        buttons={[
          {
            text: "Go Back to Form",
            onPress: () => {
              // Navigate back to the form for correction
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // If we can't go back, navigate to the appropriate request screen
                const targetScreen =
                  mode === "business" ? "BusinessRequest" : "ServiceRequest";
                navigation.navigate(targetScreen);
              }
              setPosting(false);
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setPosting(false);
            },
          },
        ]}
        onClose={() => setShowErrorAlert(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl + 100, // Extra padding to ensure content is not hidden behind button
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: fonts.family.bold,
    flex: 1,
  },
  fixedButtonContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + "20",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bookingCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: "bold",
    marginBottom: 2,
    flexShrink: 1,
  },
  bookingDetail: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: "600",
    marginRight: 8,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  dateText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postBtnText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: fonts.size.lg,
    marginLeft: 4,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.text.light + "15",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  summaryTitle: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryRowLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  summaryRowValue: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  summaryActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  backBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: fonts.size.md,
  },
  // Consolidation Preview Styles
  consolidationPreviewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary + "30",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  consolidationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  consolidationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
    marginLeft: 8,
    fontFamily: fonts.family.medium,
  },
  consolidationSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    fontFamily: fonts.family.regular,
  },
  individualBookingsList: {
    maxHeight: 400,
    marginTop: spacing.md,
  },
  individualBookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.text.light + "25",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  individualBookingHeader: {
    marginBottom: 8,
  },
  individualBookingId: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: fonts.family.medium,
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
    fontSize: 13,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
    fontFamily: fonts.family.regular,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  individualBookingLabel: {
    fontWeight: "600",
    color: colors.text.secondary,
  },
  totalCostCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalCostInfo: {
    marginLeft: 12,
    flex: 1,
  },
  totalCostLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: fonts.family.regular,
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 4,
    fontFamily: fonts.family.bold,
  },
  summaryNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  summaryNoteText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
    fontFamily: fonts.family.regular,
  },
  summaryBookingsList: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBookingsTitle: {
    fontSize: fonts.size.md,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: spacing.sm,
    fontFamily: fonts.family.bold,
  },
  summaryBookingItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryBookingText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    fontFamily: fonts.family.regular,
  },
});

export default BookingConfirmationScreen;

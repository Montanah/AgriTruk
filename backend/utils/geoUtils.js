const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @param {number} lat1 Latitude of the first point in degrees.
 * @param {number} lon1 Longitude of the first point in degrees.
 * @param {number} lat2 Latitude of the second point in degrees.
 * @param {number} lon2 Longitude of the second point in degrees.
 * @returns {number} Distance between the points in kilometers.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  // Radius of the Earth in kilometers
  const R = 6371;

  // Convert degrees to radians
  const toRad = (deg) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Wrapper function to calculate distance between two location objects.
 * @param {Object} loc1 First location with { latitude, longitude }.
 * @param {Object} loc2 Second location with { latitude, longitude }.
 * @returns {number} Distance in kilometers.
 * @throws {Error} If latitude or longitude is missing or invalid.
 */
function calculateDistance(loc1, loc2) {
  if (
    !loc1?.latitude ||
    !loc1?.longitude ||
    !loc2?.latitude ||
    !loc2?.longitude
  ) {
    throw new Error(
      "Invalid location data: latitude and longitude are required",
    );
  }
  return haversineDistance(
    loc1.latitude,
    loc1.longitude,
    loc2.latitude,
    loc2.longitude,
  );
}

/**
 * Calculate road distance and duration using Google Maps Distance Matrix API with real-time traffic.
 * @param {Object} fromLocation Location object with { latitude, longitude, address }.
 * @param {Object} toLocation Location object with { latitude, longitude, address }.
 * @param {string} vehicleType Type of vehicle ('truck', 'small_truck', 'large_truck').
 * @param {string} apiKey Google Maps API key.
 * @param {number} weightKg Weight in kilograms for loading time calculation.
 * @returns {Object} Object containing actualDistance, estimatedDurationMinutes, formattedDuration, routePolyline, success.
 */
async function calculateRoadDistanceAndDuration(
  fromLocation,
  toLocation,
  vehicleType = "truck",
  apiKey,
  weightKg = 0,
) {
  try {
    if (!apiKey) {
      throw new Error("Google Maps API key is missing");
    }

    const {
      address: fromAddress,
      latitude: fromLat,
      longitude: fromLng,
    } = fromLocation;
    const {
      address: toAddress,
      latitude: toLat,
      longitude: toLng,
    } = toLocation;

    // Use Distance Matrix API for accurate traffic-aware duration
    const distanceMatrixResponse = await client.distancematrix({
      params: {
        origins: [{ lat: fromLat, lng: fromLng }],
        destinations: [{ lat: toLat, lng: toLng }],
        mode: "driving",
        departure_time: "now", // Get real-time traffic data
        traffic_model: "best_guess", // Use best estimate considering current traffic
        key: apiKey,
      },
      timeout: 10000,
    });

    if (distanceMatrixResponse.data.status !== "OK") {
      console.warn(
        `Distance Matrix API error: ${distanceMatrixResponse.data.error_message || distanceMatrixResponse.data.status}`,
      );
      throw new Error(
        `Distance Matrix API error: ${distanceMatrixResponse.data.error_message || distanceMatrixResponse.data.status}`,
      );
    }

    const element = distanceMatrixResponse.data.rows[0].elements[0];

    if (element.status !== "OK") {
      console.warn(`Distance Matrix element error: ${element.status}`);
      throw new Error(`Distance Matrix element error: ${element.status}`);
    }

    // Get distance and duration with traffic
    const distanceKm = element.distance.value / 1000; // Meters to km
    const durationMinutes = element.duration_in_traffic
      ? element.duration_in_traffic.value / 60 // Use traffic-aware duration
      : element.duration.value / 60; // Fallback to standard duration

    console.log("Google Maps Distance Matrix Calculation:");
    console.log("From:", fromLocation.address, `(${fromLat}, ${fromLng})`);
    console.log("To:", toLocation.address, `(${toLat}, ${toLng})`);
    console.log("Distance:", distanceKm, "km");
    console.log("Duration (with traffic):", durationMinutes, "minutes");
    console.log(
      "Traffic status:",
      element.duration_in_traffic ? "Available" : "Not available",
    );

    // Validate distance reasonableness using haversine as reference
    const haversineDist = haversineDistance(fromLat, fromLng, toLat, toLng);
    const distanceRatio = distanceKm / haversineDist;
    console.log("Haversine distance:", haversineDist, "km");
    console.log("Distance ratio (road/straight):", distanceRatio.toFixed(2));

    // If the road distance is more than 2.5x the straight-line distance, it might be an error
    let finalDistance = distanceKm;
    if (distanceRatio > 2.5) {
      console.warn(
        `Road distance (${distanceKm}km) seems unreasonable vs haversine (${haversineDist}km), using haversine with 1.3x factor`,
      );
      finalDistance = haversineDist * 1.3; // Add 30% for road efficiency
    }

    // Get route polyline from Directions API for map display
    let routePolyline = null;
    try {
      const directionsResponse = await client.directions({
        params: {
          origin: { lat: fromLat, lng: fromLng },
          destination: { lat: toLat, lng: toLng },
          mode: "driving",
          key: apiKey,
        },
        timeout: 5000,
      });

      if (
        directionsResponse.data.status === "OK" &&
        directionsResponse.data.routes.length > 0
      ) {
        routePolyline =
          directionsResponse.data.routes[0].overview_polyline.points;
      }
    } catch (polylineError) {
      console.warn("Failed to get route polyline:", polylineError.message);
    }

    // Add minimal loading/unloading time (5-10 minutes is more realistic)
    const loadingTime = weightKg > 1000 ? 10 : 5; // 5-10 minutes for loading/unloading

    const totalDurationMinutes = Math.round(durationMinutes + loadingTime);
    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = totalDurationMinutes % 60;

    return {
      actualDistance: Number(finalDistance.toFixed(2)),
      estimatedDurationMinutes: totalDurationMinutes,
      formattedDuration:
        hours > 0 ? `${hours} hours ${minutes} minutes` : `${minutes} minutes`,
      routePolyline: routePolyline,
      success: true,
    };
  } catch (error) {
    console.error(
      "Google Maps API error, falling back to haversine calculation:",
      error.message,
    );

    // Fallback to haversine calculation
    const { latitude: fromLat, longitude: fromLng } = fromLocation;
    const { latitude: toLat, longitude: toLng } = toLocation;

    const fallbackDistance = haversineDistance(fromLat, fromLng, toLat, toLng);
    // Use realistic average speeds for Kenya roads
    const fallbackSpeed =
      vehicleType === "large_truck"
        ? 50
        : vehicleType === "small_truck"
          ? 60
          : 70; // km/h
    const travelMinutes = (fallbackDistance / fallbackSpeed) * 60;
    const loadingTime = weightKg > 1000 ? 10 : 5;

    const totalDurationMinutes = Math.round(travelMinutes + loadingTime);
    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = totalDurationMinutes % 60;

    return {
      actualDistance: Number(fallbackDistance.toFixed(2)),
      estimatedDurationMinutes: totalDurationMinutes,
      formattedDuration:
        hours > 0 ? `${hours} hours ${minutes} minutes` : `${minutes} minutes`,
      routePolyline: null,
      success: false,
    };
  }
}

module.exports = {
  haversineDistance,
  calculateDistance,
  calculateRoadDistanceAndDuration,
};

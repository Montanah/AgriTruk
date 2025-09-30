const { Client } = require('@googlemaps/google-maps-services-js');
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

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  console.log(loc1, loc2);
  if (!loc1?.latitude || !loc1?.longitude || !loc2?.latitude || !loc2?.longitude) {
    throw new Error('Invalid location data: latitude and longitude are required');
  }
  return haversineDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
}
function calculatePickupDistance(transporter, pickupLocation) {
  return calculateDistance(transporter.currentLocation, pickupLocation);
}

function calculateDistanceScore(distanceKm, maxDistance = 100) {
  if (distanceKm <= 0) return 100;
  if (distanceKm >= maxDistance) return 0;
  return Math.max(0, 100 - (distanceKm / maxDistance) * 100);
}

// Haversine formula for fallback distance (in km)
function haversineDistance2(fromLat, fromLng, toLat, toLng) {
  const R = 6371; // Earth's radius in km
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180; // Fixed: Corrected from fromLat to fromLng
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function calculateRoadDistanceAndDuration(fromLocation, toLocation, vehicleType = 'truck', apiKey, weightKg = 0) {
  console.log('Calculating road distance and duration...', apiKey);
  try {
    if (!apiKey) {
      throw new Error('Google Maps API key is missing');
    }

    const { address: fromAddress, latitude: fromLat, longitude: fromLng } = fromLocation;
    const { address: toAddress, latitude: toLat, longitude: toLng } = toLocation;

    // Prepare request
    const request = {
      origin: { lat: fromLat, lng: fromLng },
      destination: { lat: toLat, lng: toLng },
      travelMode: 'DRIVING',
      // Remove drivingOptions as it's causing serialization issues
      // The API will use default traffic conditions
    };

    const response = await client.directions({
      params: {
        ...request,
        key: apiKey, // Ensure API key is in params
      },
      timeout: 10000, // 10 seconds timeout
    });

    if (response.data.status !== 'OK') {
      console.warn(`Google Maps API error: ${response.data.error_message || response.data.status}`);
      // Don't throw error, fall back to haversine calculation
      throw new Error(`Google Maps API error: ${response.data.error_message || response.data.status}`);
    }

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = route.legs[0].distance.value / 1000; // Meters to km
      const durationMinutes = route.legs[0].duration_in_traffic
        ? route.legs[0].duration_in_traffic.value / 60
        : route.legs[0].duration.value / 60; // Seconds to minutes

      // Add loading/unloading (in minutes): 30 min for small cargo, 60 min for large
      const additionalMinutes = weightKg > 1000 ? 60 : 30;

      return {
        actualDistance: Number(distanceKm.toFixed(2)),
        estimatedDurationMinutes: Math.round(durationMinutes + additionalMinutes),
        formattedDuration: `${Math.floor((durationMinutes + additionalMinutes) / 60)} hours ${Math.round(
          (durationMinutes + additionalMinutes) % 60
        )} minutes`,
        routePolyline: route.overview_polyline.points, // Optional: Store for mapping
        success: true,
      };
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('Google Maps API error:', error);

    // Fallback to haversine
    const { latitude: fromLat, longitude: fromLng } = fromLocation;
    const { latitude: toLat, longitude: toLng } = toLocation;

    const fallbackDistance = haversineDistance2(fromLat, fromLng, toLat, toLng);
    const fallbackSpeed = vehicleType === 'large_truck' ? 40 : vehicleType === 'small_truck' ? 50 : 60; // km/h
    const travelMinutes = (fallbackDistance / fallbackSpeed) * 60;
    const additionalMinutes = weightKg > 1000 ? 60 : 30;

    return {
      actualDistance: Number(fallbackDistance.toFixed(2)),
      estimatedDurationMinutes: Math.round(travelMinutes + additionalMinutes),
      formattedDuration: `${Math.floor((travelMinutes + additionalMinutes) / 60)} hours ${Math.round(
        (travelMinutes + additionalMinutes) % 60
      )} minutes`,
      routePolyline: null,
      success: false, 
    };
  }
}

module.exports = { haversineDistance, calculateDistance, calculateDistanceScore, calculatePickupDistance, calculateRoadDistanceAndDuration };
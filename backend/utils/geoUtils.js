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
  if (!loc1?.latitude || !loc1?.longitude || !loc2?.latitude || !loc2?.longitude) {
    throw new Error('Invalid location data: latitude and longitude are required');
  }
  return haversineDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
}

/**
 * Calculate road distance and duration using Google Maps Directions API with fallback to haversine.
 * @param {Object} fromLocation Location object with { latitude, longitude, address }.
 * @param {Object} toLocation Location object with { latitude, longitude, address }.
 * @param {string} vehicleType Type of vehicle ('truck', 'small_truck', 'large_truck').
 * @param {string} apiKey Google Maps API key.
 * @param {number} weightKg Weight in kilograms for loading time calculation.
 * @returns {Object} Object containing actualDistance, estimatedDurationMinutes, formattedDuration, routePolyline, success.
 */
async function calculateRoadDistanceAndDuration(fromLocation, toLocation, vehicleType = 'truck', apiKey, weightKg = 0) {
  try {
    if (!apiKey) {
      throw new Error('Google Maps API key is missing');
    }

    const { address: fromAddress, latitude: fromLat, longitude: fromLng } = fromLocation;
    const { address: toAddress, latitude: toLat, longitude: toLng } = toLocation;

    // Prepare request with optimized routing preferences
    const request = {
      origin: { lat: fromLat, lng: fromLng },
      destination: { lat: toLat, lng: toLng },
      travelMode: 'DRIVING',
      avoidTolls: false, // Allow tolls for faster routes
      avoidHighways: false, // Use highways for efficiency
      avoidFerries: true, // Avoid ferries in Kenya
      optimizeWaypoints: true, // Optimize route
    };

    const response = await client.directions({
      params: {
        ...request,
        key: apiKey,
      },
      timeout: 10000, // 10 seconds timeout
    });

    if (response.data.status !== 'OK') {
      console.warn(`Google Maps API error: ${response.data.error_message || response.data.status}`);
      throw new Error(`Google Maps API error: ${response.data.error_message || response.data.status}`);
    }

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = route.legs[0].distance.value / 1000; // Meters to km
      const durationMinutes = route.legs[0].duration_in_traffic
        ? route.legs[0].duration_in_traffic.value / 60
        : route.legs[0].duration.value / 60; // Seconds to minutes

      // Validate distance reasonableness using haversine as reference
      const haversineDist = haversineDistance(fromLat, fromLng, toLat, toLng);
      const distanceRatio = distanceKm / haversineDist;
    
      // If the road distance is more than 2x the straight-line distance, it might be an error
      let finalDistance = distanceKm;
      if (distanceRatio > 2.0) {
        console.warn(`Road distance (${distanceKm}km) seems unreasonable vs haversine (${haversineDist}km), using haversine with 1.3x factor`);
        finalDistance = haversineDist * 1.3; // Add 30% for road efficiency
      } else {
        console.log('Using Google Maps distance:', finalDistance, 'km');
      }

      // Add loading/unloading time based on cargo weight
      const additionalMinutes = weightKg > 1000 ? 60 : 30;

      return {
        actualDistance: Number(finalDistance.toFixed(2)),
        estimatedDurationMinutes: Math.round(durationMinutes + additionalMinutes),
        formattedDuration: `${Math.floor((durationMinutes + additionalMinutes) / 60)} hours ${Math.round(
          (durationMinutes + additionalMinutes) % 60
        )} minutes`,
        routePolyline: route.overview_polyline.points,
        success: true,
      };
    } else {
      throw new Error('No route found');
    }
  } catch (error) {
    console.error('Google Maps API error, falling back to haversine calculation:', error.message);

    // Fallback to haversine calculation
    const { latitude: fromLat, longitude: fromLng } = fromLocation;
    const { latitude: toLat, longitude: toLng } = toLocation;

    const fallbackDistance = haversineDistance(fromLat, fromLng, toLat, toLng);
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

module.exports = { 
  haversineDistance, 
  calculateDistance, 
  calculateRoadDistanceAndDuration 
};
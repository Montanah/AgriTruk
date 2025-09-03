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

module.exports = { haversineDistance, calculateDistance };
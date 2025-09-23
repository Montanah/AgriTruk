import { useState, useEffect } from 'react';
import { convertCoordinatesToPlaceName, cleanLocationDisplay } from '../utils/locationUtils';
import { processLocationData, hasValidCoordinates } from '../utils/locationProcessor';

interface LocationObject {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const useLocationObjectDisplay = (location: LocationObject | string | null | undefined) => {
  const [displayLocation, setDisplayLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) {
      setDisplayLocation('Location not available');
      return;
    }

    // Process the location data consistently
    const processed = processLocationData(location);
    
    // If we have a valid address, use it
    if (processed.address && processed.address !== 'Location not available') {
      setDisplayLocation(cleanLocationDisplay(processed.address));
      return;
    }

    // If we have valid coordinates, try to geocode them
    if (hasValidCoordinates(location)) {
      console.log('🌍 Attempting to geocode coordinates:', processed.latitude, processed.longitude);
      setIsLoading(true);
      setError(null);
      
      convertCoordinatesToPlaceName(processed.latitude, processed.longitude)
        .then((placeName) => {
          console.log('✅ Geocoding successful:', placeName);
          setDisplayLocation(placeName);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('❌ Failed to convert location coordinates:', err);
          setError(err.message || 'Failed to convert location');
          // Fallback to coordinates display
          setDisplayLocation(processed.address);
          setIsLoading(false);
        });
    } else {
      console.log('⚠️ Invalid coordinates, using fallback:', processed.address);
      // Invalid coordinates, show fallback
      setDisplayLocation(processed.address);
    }
  }, [location]);

  return { displayLocation, isLoading, error };
};

export default useLocationObjectDisplay;

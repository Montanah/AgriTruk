import { useState, useEffect } from 'react';
import { getLocationName, getLocationNameSync } from '../utils/locationUtils';

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

    setIsLoading(true);
    setError(null);

    getLocationName(location)
      .then((placeName) => {
        setDisplayLocation(placeName);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('❌ Failed to get location name:', err);
        setError(err.message || 'Failed to get location name');
        // Fallback to synchronous method
        setDisplayLocation(getLocationNameSync(location));
        setIsLoading(false);
      });
  }, [location]);

  return { displayLocation, isLoading, error };
};

export default useLocationObjectDisplay;

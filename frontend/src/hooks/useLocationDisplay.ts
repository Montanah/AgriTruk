import { useState, useEffect } from 'react';
import { getLocationName, getLocationNameSync } from '../utils/locationUtils';

export const useLocationDisplay = (location: string) => {
  const [displayLocation, setDisplayLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location || location === 'undefined' || location === 'null' || typeof location !== 'string') {
      setDisplayLocation('Unknown location');
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
        console.error('Failed to convert location:', err);
        setError(err.message || 'Failed to convert location');
        setDisplayLocation(getLocationNameSync(location));
        setIsLoading(false);
      });
  }, [location]);

  return { displayLocation, isLoading, error };
};

export default useLocationDisplay;
import { useState, useEffect } from 'react';
import { convertLocationToPlaceName } from '../utils/locationDisplay';

export const useLocationDisplay = (location: string) => {
  const [displayLocation, setDisplayLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) {
      setDisplayLocation('Unknown location');
      return;
    }

    // Check if it's already a readable location (not coordinates)
    const isCoordinateString = /Location\s*\([-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*\)/.test(location) || 
                              /^[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(location);
    
    if (!isCoordinateString) {
      // It's already a readable location, just clean it
      setDisplayLocation(location);
      return;
    }

    // It's coordinates, convert to place name
    setIsLoading(true);
    setError(null);
    
    convertLocationToPlaceName(location)
      .then((placeName) => {
        setDisplayLocation(placeName);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to convert location:', err);
        setError(err.message || 'Failed to convert location');
        setDisplayLocation(location); // Fallback to original
        setIsLoading(false);
      });
  }, [location]);

  return { displayLocation, isLoading, error };
};

export default useLocationDisplay;






import { useState, useEffect } from 'react';
import { convertCoordinatesToPlaceName, cleanLocationDisplay } from '../utils/locationUtils';

export const useLocationDisplay = (location: string) => {
  const [displayLocation, setDisplayLocation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location || location === 'undefined' || location === 'null' || typeof location !== 'string') {
      setDisplayLocation('Unknown location');
      return;
    }

    // Check if it's already a readable location (not coordinates)
    const isCoordinateString = /Location\s*\([-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*\)/.test(location) || 
                              /^[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(location) ||
                              /^Near\s+[-+]?\d+\.?\d*,\s*[-+]?\d+\.?\d*$/.test(location);
    
    if (!isCoordinateString) {
      // It's already a readable location, just clean it
      setDisplayLocation(cleanLocationDisplay(location));
      return;
    }

    // It's coordinates, convert to place name
    setIsLoading(true);
    setError(null);
    
    // Extract coordinates from location string
    const coordMatch = location.match(/([-+]?\d+\.?\d*),\s*([-+]?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      convertCoordinatesToPlaceName(lat, lng)
        .then((placeName) => {
          setDisplayLocation(placeName);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Failed to convert location:', err);
          setError(err.message || 'Failed to convert location');
          // Better fallback - clean the location string
          setDisplayLocation(cleanLocationDisplay(location));
          setIsLoading(false);
        });
    } else {
      // No coordinates found, use clean display
      setDisplayLocation(cleanLocationDisplay(location));
      setIsLoading(false);
    }
  }, [location]);

  return { displayLocation, isLoading, error };
};

export default useLocationDisplay;






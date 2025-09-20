import { useState, useEffect } from 'react';
import { convertCoordinatesToPlaceName, getShortLocationName } from '../utils/locationUtils';

interface Location {
  latitude: number | string;
  longitude: number | string;
  address?: string;
}

export const useLocationName = (location: Location | string | null) => {
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!location) {
      setLocationName('');
      return;
    }

    if (typeof location === 'string') {
      setLocationName(location);
      return;
    }

    // If location has an address, use it
    if (location.address) {
      setLocationName(location.address);
      return;
    }

    // Convert coordinates to place name
    setLoading(true);
    convertCoordinatesToPlaceName(location)
      .then(name => {
        // If the name is still coordinates, try to get a better name
        if (name.includes('(') && name.includes(')')) {
          // Try to get a more specific location name
          getShortLocationName(location)
            .then(shortName => {
              setLocationName(shortName);
            })
            .catch(() => {
              setLocationName(name);
            });
        } else {
          setLocationName(name);
        }
      })
      .catch(error => {
        console.error('Error converting coordinates to place name:', error);
        // Fallback to coordinates
        const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
        const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
        if (!isNaN(lat) && !isNaN(lng)) {
          setLocationName(`Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } else {
          setLocationName('Unknown location');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location]);

  return { locationName, loading };
};

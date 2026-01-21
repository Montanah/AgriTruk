import { useState, useEffect } from 'react';
import { getLocationName, getLocationNameSync } from '../utils/locationUtils';

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

    setLoading(true);
    getLocationName(location)
      .then((name) => {
        setLocationName(name);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error getting location name:', error);
        setLocationName(getLocationNameSync(location));
        setLoading(false);
      });
  }, [location]);

  return { locationName, loading };
};

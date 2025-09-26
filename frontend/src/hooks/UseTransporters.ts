import { useEffect, useState } from 'react';
import { PLACEHOLDER_IMAGES } from '../constants/images';
import { apiRequest } from '../utils/api';


export const useTransporters = () => {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      console.log('🚛 DEBUG: useTransporters - Starting to load transporters...');
      setLoading(true);
      setError(null);

      try {
        console.log('🚛 DEBUG: useTransporters - Making API request to /transporters/available/list');
        const data = await apiRequest('/transporters/available/list');
        console.log('🚛 DEBUG: useTransporters - API response received:', data);

        if (
          data &&
          data.transporters &&
          Array.isArray(data.transporters) &&
          data.transporters.length > 0
        ) {
          console.log('🚛 DEBUG: useTransporters - Using API data, transporters count:', data.transporters.length);
          const normalizedData = data.transporters.map((t: any) => ({
            ...t,
            costPerKm: t.costPerKm || null,
            photo:
              t.photo ||
              (t.vehiclePhotos && t.vehiclePhotos[0]) ||
              PLACEHOLDER_IMAGES.PROFILE_PHOTO_MEDIUM,
            vehiclePhotos:
              Array.isArray(t.vehiclePhotos) && t.vehiclePhotos.length > 0
                ? t.vehiclePhotos
                : [t.photo || PLACEHOLDER_IMAGES.PROFILE_PHOTO_MEDIUM],
            est: t.est || 'Calculating...',
            // Map backend fields to frontend expected fields
            name: t.name || t.displayName || t.companyName,
            companyName: t.companyName || t.displayName || t.name,
            profilePhoto: t.driverProfileImage || t.profilePhoto || t.profilePhotoUrl,
            vehiclePhoto: (t.vehicleImagesUrl && t.vehicleImagesUrl.length > 0) ? t.vehicleImagesUrl[0] : undefined,
            vehiclePhotos: t.vehicleImagesUrl || [],
            vehicleType: t.vehicleType,
            vehicleMake: t.vehicleMake,
            vehicleModel: t.vehicleModel,
            vehicleYear: t.vehicleYear,
            vehicleColor: t.vehicleColor,
            capacity: t.capacity || t.vehicleCapacity,
            bodyType: t.bodyType,
            driveType: t.driveType,
            reg: t.reg || t.vehicleRegistration,
            rating: t.rating || 0,
            experience: t.experience || 0,
            tripsCompleted: t.tripsCompleted || t.totalTrips || 0,
            availability: t.availability || t.acceptingBooking,
            refrigerated: t.refrigerated === 'true' || t.refrigerated === true,
            humidityControl: t.humidityControl === 'true' || t.humidityControl === true,
            specialFeatures: t.specialFeatures || [],
            location: t.location || 'Unknown',
            address: t.address || t.location || 'Unknown',
            currentLocation: t.lastKnownLocation,
          }));
          setTransporters(normalizedData);
        } else {
          console.log('🚛 DEBUG: useTransporters - API data invalid, no transporters available');
          setTransporters([]);
        }
        setLoading(false);
      } catch (err: any) {
        console.log('🚛 DEBUG: useTransporters - API error:', err.message);
        setError(err.message || 'Failed to load transporters');
        setTransporters([]);
        setLoading(false);
      }
    };
    load();
  }, []);

  return {
    transporters: Array.isArray(transporters) ? transporters : [],
    loading,
    error,
  };
};

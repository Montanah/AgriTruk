import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

// Mock data for testing while waiting for backend
const mockTransporters = [
  {
    id: 'mock-1',
    name: 'John Transport Ltd',
    companyName: 'John Transport Ltd',
    profilePhoto: 'https://via.placeholder.com/150x150?text=JT',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=TRUCK',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=TRUCK'],
    vehicleType: 'truck',
    vehicleMake: 'Mercedes',
    vehicleModel: 'Actros',
    vehicleYear: 2022,
    capacity: 25,
    bodyType: 'Flatbed',
    driveType: '6x4',
    reg: 'KAA123A',
    rating: 4.8,
    experience: 5,
    tripsCompleted: 150,
    availability: true,
    refrigerated: false,
    humidityControl: true,
    specialFeatures: ['GPS Tracking', 'Temperature Control', 'Insurance'],
    costPerKm: 45,
    est: '2-3 hours',
    estimatedCost: 'KSH 15,000',
    location: 'Nairobi, Kenya',
    address: 'Nairobi, Kenya',
  },
  {
    id: 'mock-2',
    name: 'Fast Cargo Solutions',
    companyName: 'Fast Cargo Solutions',
    profilePhoto: 'https://via.placeholder.com/150x150?text=FC',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=VAN',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=VAN'],
    vehicleType: 'van',
    vehicleMake: 'Toyota',
    vehicleModel: 'Hiace',
    vehicleYear: 2021,
    capacity: 3,
    bodyType: 'Panel Van',
    driveType: '4x2',
    reg: 'KBB456B',
    rating: 4.5,
    experience: 3,
    tripsCompleted: 89,
    availability: true,
    refrigerated: true,
    humidityControl: false,
    specialFeatures: ['Refrigeration', 'Express Delivery'],
    costPerKm: 35,
    est: '1-2 hours',
    estimatedCost: 'KSH 8,500',
    location: 'Mombasa, Kenya',
    address: 'Mombasa, Kenya',
  },
  {
    id: 'mock-3',
    name: 'Agri Haulers Kenya',
    companyName: 'Agri Haulers Kenya',
    profilePhoto: 'https://via.placeholder.com/150x150?text=AH',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=PICKUP',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=PICKUP'],
    vehicleType: 'pickup',
    vehicleMake: 'Ford',
    vehicleModel: 'Ranger',
    vehicleYear: 2023,
    capacity: 1.5,
    bodyType: 'Pickup',
    driveType: '4x4',
    reg: 'KCC789C',
    rating: 4.9,
    experience: 7,
    tripsCompleted: 234,
    availability: true,
    refrigerated: false,
    humidityControl: true,
    specialFeatures: ['4x4 Capability', 'Off-road', 'Agri Specialized'],
    costPerKm: 40,
    est: '30-45 mins',
    estimatedCost: 'KSH 6,200',
    location: 'Kisumu, Kenya',
    address: 'Kisumu, Kenya',
  },
];

export const useTransporters = () => {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🚛 Fetching transporters from API...');
        const data = await apiRequest('/transporters/available/list');
        console.log('🚛 Transporters API response:', data);

        if (
          data &&
          data.transporters &&
          Array.isArray(data.transporters) &&
          data.transporters.length > 0
        ) {
          const normalizedData = data.transporters.map((t: any) => ({
            ...t,
            costPerKm: t.costPerKm || null,
            photo:
              t.photo ||
              (t.vehiclePhotos && t.vehiclePhotos[0]) ||
              'https://via.placeholder.com/54x54?text=TRUK',
            vehiclePhotos:
              Array.isArray(t.vehiclePhotos) && t.vehiclePhotos.length > 0
                ? t.vehiclePhotos
                : [t.photo || 'https://via.placeholder.com/54x54?text=TRUK'],
            est: t.est || 'Calculating...',
            // Map backend fields to frontend expected fields
            name: t.name || t.displayName || t.companyName,
            companyName: t.companyName || t.displayName || t.name,
            profilePhoto: t.profilePhoto || t.profilePhotoUrl,
            vehiclePhoto: t.vehiclePhoto || (t.vehiclePhotos && t.vehiclePhotos[0]),
            vehicleType: t.vehicleType,
            vehicleMake: t.vehicleMake,
            vehicleModel: t.vehicleModel,
            vehicleYear: t.vehicleYear,
            capacity: t.capacity || t.vehicleCapacity,
            bodyType: t.bodyType,
            driveType: t.driveType,
            reg: t.reg || t.vehicleRegistration,
            rating: t.rating || 0,
            experience: t.experience || 0,
            tripsCompleted: t.tripsCompleted || t.totalTrips || 0,
            availability: t.availability || t.acceptingBooking,
            refrigerated: t.refrigerated || false,
            humidityControl: t.humidityControl || false,
            specialFeatures: t.specialFeatures || [],
            location: t.location || 'Unknown',
            address: t.address || t.location || 'Unknown',
          }));
          setTransporters(normalizedData);
          console.log('🚛 Normalized transporters:', normalizedData);
        } else {
          console.log('🚛 No transporters found, using mock data');
          setTransporters(mockTransporters);
        }
        setLoading(false);
      } catch (err: any) {
        console.log('🚛 Using mock data due to API error:', err.message);
        // Fallback to mock data
        setTransporters(mockTransporters);
        setError(null); // Don't show error, just use mock data
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

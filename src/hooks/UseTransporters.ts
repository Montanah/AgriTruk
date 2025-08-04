import { useEffect, useState } from 'react';
import { MOCK_TRANSPORTERS } from '../mocks/transporters';
import { apiRequest } from '../utils/api';

export const useTransporters = () => {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest('/transporters/available/list');
        // Always merge real and mock transporters for display
        let normalizedReal: any[] = [];
        if (Array.isArray(data) && data.length > 0) {
          normalizedReal = data.map((t: any, i: number) => ({
            ...t,
            costPerKm: t.costPerKm || null, // null if missing, so UI can show N/A
            photo: t.photo || (t.vehiclePhotos && t.vehiclePhotos[0]) || 'https://via.placeholder.com/54x54?text=TRUK',
            vehiclePhotos: Array.isArray(t.vehiclePhotos) && t.vehiclePhotos.length > 0 ? t.vehiclePhotos : [t.photo || 'https://via.placeholder.com/54x54?text=TRUK'],
            est: t.est || (i === 0 ? '18 min' : i === 1 ? '1 hr 10 min' : '2 hr 5 min'),
          }));
        }
        const normalizedMock = MOCK_TRANSPORTERS.map((t: any, i: number) => ({
          ...t,
          costPerKm: t.costPerKm || 100,
          photo: t.photo || (t.vehiclePhotos && t.vehiclePhotos[0]) || 'https://via.placeholder.com/54x54?text=TRUK',
          vehiclePhotos: Array.isArray(t.vehiclePhotos) && t.vehiclePhotos.length > 0 ? t.vehiclePhotos : [t.photo || 'https://via.placeholder.com/54x54?text=TRUK'],
          est: t.est || (i === 0 ? '18 min' : i === 1 ? '1 hr 10 min' : '2 hr 5 min'),
        }));
        // If real transporters exist, show both real and mock; else, just mock
        setTransporters(normalizedReal.length > 0 ? [...normalizedReal, ...normalizedMock] : normalizedMock);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transporters');
        setTransporters(MOCK_TRANSPORTERS);
      }
      setLoading(false);
    };
    load();
  }, []);

  return {
    transporters: Array.isArray(transporters) ? transporters : [],
    loading,
    error,
  };
};

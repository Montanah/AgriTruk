import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { MOCK_TRANSPORTERS } from '../mocks/transporters';

export const useTransporters = () => {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Adjust endpoint as per backend API
        const data = await apiRequest('/transporters/available/list');
        if (Array.isArray(data) && data.length > 0) {
          setTransporters(data);
        } else {
          setTransporters(MOCK_TRANSPORTERS);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transporters');
        setTransporters(MOCK_TRANSPORTERS);
      }
      setLoading(false);
    };
    load();
  }, []);

  return {
    transporters,
    loading,
    error,
  };
};

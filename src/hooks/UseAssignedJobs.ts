import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

export const useAssignedJobs = (type: 'agri' | 'cargo' = 'agri') => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest(`/bookings/${type}/transporter`);
        setJobs(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch jobs');
      }
      setLoading(false);
    };
    load();
  }, [type]);

  return {
    jobs,
    loading,
    error,
  };
};

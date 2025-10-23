import { useEffect, useState } from 'react';
// import { apiRequest } from '../utils/api'; // Commented out until backend is ready

export const useAssignedJobs = (type: 'agri' | 'cargo' = 'agri') => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Implement real API call when backend endpoint is ready
        // const data = await apiRequest(`/bookings/${type}/transporter`);
        
        // No mock data - return empty array until API is implemented
        setJobs([]);
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

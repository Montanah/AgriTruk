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
        // TODO: Replace with real API call when backend endpoint is ready
        // const data = await apiRequest(`/bookings/${type}/transporter`);

        // Mock data for now
        const mockJobs = [
          {
            id: 'JOB001',
            type: 'agri',
            status: 'active',
            fromLocation: 'Nairobi',
            toLocation: 'Mombasa',
            productType: 'Agricultural Products',
            weight: '2.5 tons',
            client: { name: 'Green Farms Ltd' },
            pricing: { total: 45000 },
            schedule: {
              pickupDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              deliveryDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            },
          },
          {
            id: 'JOB002',
            type: 'cargo',
            status: 'pending',
            fromLocation: 'Eldoret',
            toLocation: 'Nakuru',
            productType: 'Machinery',
            weight: '1.8 tons',
            client: { name: 'Industrial Co' },
            pricing: { total: 32000 },
            schedule: {
              pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              deliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            },
          },
        ];

        // Filter by type if needed
        const filteredJobs =
          type === 'agri'
            ? mockJobs.filter((job) => job.type === 'agri')
            : mockJobs.filter((job) => job.type === 'cargo');

        setJobs(filteredJobs);
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

import { MOCK_ASSIGNED_JOBS } from '@/mock/transporters';
import { useEffect, useState } from 'react';

export const useAssignedJobs = () => {
  const [jobs, setJobs] = useState<typeof MOCK_ASSIGNED_JOBS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 400));
      setJobs(MOCK_ASSIGNED_JOBS);
      setLoading(false);
    };

    load();
  }, []);

  return {
    jobs,
    loading,
  };
};

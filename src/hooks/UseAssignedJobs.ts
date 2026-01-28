import { useEffect, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { API_ENDPOINTS } from '../constants/api';

export const useAssignedJobs = (type: 'agri' | 'cargo' = 'agri') => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignedJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      
      // Fetch assigned jobs/bookings for driver
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/driver/assigned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.bookings || data.jobs || []);
      } else {
        const statusCode = response.status;
        if (statusCode === 403) {
          console.warn('Permission denied for assigned jobs endpoint - backend needs to allow driver role');
          setError('Insufficient permissions. Please contact your company administrator.');
        } else {
          console.warn(`Assigned jobs endpoint returned ${statusCode} - returning empty array`);
        }
        setJobs([]);
      }
    } catch (err: any) {
      console.error('Error fetching assigned jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedJobs();
  }, [fetchAssignedJobs]);

  return {
    assignedJobs: jobs,
    jobs, // Also return as jobs for backward compatibility
    loading,
    error,
    fetchAssignedJobs,
  };
};

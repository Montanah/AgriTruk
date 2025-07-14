import { MOCK_TRANSPORTERS } from '@/mock/transporters';
import { useEffect, useState } from 'react';

export const useTransporters = () => {
  const [transporters, setTransporters] = useState<typeof MOCK_TRANSPORTERS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await new Promise((res) => setTimeout(res, 500)); // simulate fetch delay
      setTransporters(MOCK_TRANSPORTERS);
      setLoading(false);
    };

    load();
  }, []);

  return {
    transporters,
    loading,
  };
};

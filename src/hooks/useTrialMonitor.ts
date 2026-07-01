import { useState, useEffect } from 'react';
import { Tenant } from '../types';

export function useTrialMonitor(tenant: Tenant | null) {
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  useEffect(() => {
    if (!tenant) {
      setIsTrialExpired(false);
      return;
    }

    if (tenant.subscriptionStatus === 'trial' && tenant.createdAt) {
      const createdDate = new Date(tenant.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 7) {
        setIsTrialExpired(true);
      } else {
        setIsTrialExpired(false);
      }
    } else {
      setIsTrialExpired(false);
    }
  }, [tenant]);

  return { isTrialExpired };
}

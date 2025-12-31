import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useAchievements() {
  const [notification, setNotification] = useState(null);

  const triggerAchievement = useCallback(async (actionType) => {
    try {
      const response = await base44.functions.invoke('updateAchievements', { 
        action_type: actionType 
      });

      if (response.data.new_badges && response.data.new_badges.length > 0) {
        setNotification({
          badge: response.data.new_badges[0],
          xpGained: null
        });
      } else if (response.data.xp_gained > 0) {
        setNotification({
          badge: null,
          xpGained: response.data.xp_gained
        });
      }

      return response.data;
    } catch (error) {
      console.error('Achievement trigger error:', error);
      return null;
    }
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    triggerAchievement,
    notification,
    clearNotification
  };
}
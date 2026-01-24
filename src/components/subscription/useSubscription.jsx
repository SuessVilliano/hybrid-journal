import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useSubscription() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const tier = user?.subscription_tier || 'free';
  const status = user?.subscription_status || 'active';

  const limits = {
    free: {
      accounts: 1,
      aiCoach: false,
      webhooks: false,
      api: false,
      signalRouting: false,
      advancedAnalytics: false,
      exports: false,
      sharedAccess: false,
      backtesting: false,
      brokerSync: false,
      allWidgets: false
    },
    pro: {
      accounts: 3,
      aiCoach: true,
      webhooks: true,
      api: true,
      signalRouting: true,
      advancedAnalytics: true,
      exports: true,
      sharedAccess: false,
      backtesting: true,
      brokerSync: true,
      allWidgets: true
    },
    team: {
      accounts: Infinity,
      aiCoach: true,
      webhooks: true,
      api: true,
      signalRouting: true,
      advancedAnalytics: true,
      exports: true,
      sharedAccess: true,
      backtesting: true,
      brokerSync: true,
      allWidgets: true
    }
  };

  const canAccess = (feature) => {
    return limits[tier]?.[feature] || false;
  };

  const getAccountLimit = () => {
    return limits[tier]?.accounts || 1;
  };

  const isFeatureAvailable = (feature) => {
    return canAccess(feature);
  };

  return {
    tier,
    status,
    isActive: status === 'active',
    canAccess,
    getAccountLimit,
    isFeatureAvailable,
    isPro: tier === 'pro' || tier === 'team',
    isTeam: tier === 'team',
    isFree: tier === 'free'
  };
}
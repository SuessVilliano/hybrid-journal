import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { syncBrokerTrades } from './brokerAPIHelper';

// Background auto-sync manager for broker connections
export default function AutoSyncManager() {
  const queryClient = useQueryClient();
  const syncTimersRef = useRef({});

  const { data: connections = [] } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list(),
    refetchInterval: 60000 // Check for new connections every minute
  });

  useEffect(() => {
    // Clear existing timers
    Object.values(syncTimersRef.current).forEach(timer => clearInterval(timer));
    syncTimersRef.current = {};

    // Setup sync timers for each active connection
    connections.forEach(connection => {
      if (connection.auto_sync && connection.status === 'connected') {
        const intervalMs = (connection.sync_interval || 3600) * 1000;
        
        // Perform initial sync if last sync was more than interval ago
        const lastSync = connection.last_sync ? new Date(connection.last_sync) : null;
        const shouldSyncNow = !lastSync || (Date.now() - lastSync.getTime()) > intervalMs;
        
        if (shouldSyncNow) {
          performSync(connection);
        }

        // Setup recurring sync
        syncTimersRef.current[connection.id] = setInterval(() => {
          performSync(connection);
        }, intervalMs);
      }
    });

    return () => {
      Object.values(syncTimersRef.current).forEach(timer => clearInterval(timer));
    };
  }, [connections]);

  const performSync = async (connection) => {
    try {
      console.log(`[AutoSync] Syncing ${connection.broker_name} (${connection.account_number})`);
      
      const result = await syncBrokerTrades(connection);
      
      // Update connection with sync results
      await base44.entities.BrokerConnection.update(connection.id, {
        last_sync: new Date().toISOString(),
        account_balance: result.account_balance,
        account_equity: result.account_equity,
        status: 'connected',
        error_message: null
      });

      // Refresh trades list
      queryClient.invalidateQueries(['trades']);
      queryClient.invalidateQueries(['brokerConnections']);

      console.log(`[AutoSync] Success: ${result.imported} new trades imported`);
    } catch (error) {
      console.error(`[AutoSync] Failed for ${connection.broker_name}:`, error);
      
      // Update connection with error
      await base44.entities.BrokerConnection.update(connection.id, {
        status: 'error',
        error_message: error.message
      });

      queryClient.invalidateQueries(['brokerConnections']);
    }
  };

  return null; // This is a background service component
}
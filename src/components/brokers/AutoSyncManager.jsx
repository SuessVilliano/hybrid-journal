import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { syncBrokerTrades } from './brokerAPIHelper';

// How often the scheduler checks whether any connection is due for a sync.
const CHECK_INTERVAL_MS = 60000;

// Background auto-sync manager for broker connections.
//
// A single interval ticks every minute and checks each connection's
// last sync time against its configured sync_interval, so intervals longer
// than 60s actually fire and timers aren't torn down on every query refetch
// (the previous per-connection setInterval design rebuilt all timers whenever
// the connections array identity changed). Fresh connection data is read
// through a ref, and an in-flight Set prevents the same connection from being
// synced twice concurrently.
export default function AutoSyncManager() {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(new Set());

  const { data: connections = [] } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list(),
    refetchInterval: CHECK_INTERVAL_MS // Keep connection data fresh
  });

  // Always expose the latest connections to the scheduler without
  // re-creating the interval (avoids stale closures).
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  useEffect(() => {
    const performSync = async (connection) => {
      if (inFlightRef.current.has(connection.id)) return;
      inFlightRef.current.add(connection.id);

      try {
        console.log(`[AutoSync] Syncing ${connection.broker_name} (${connection.account_number})`);

        const result = await syncBrokerTrades(connection);

        // Update connection with sync results. `last_sync_at` is the
        // canonical field; `last_sync` is written during the transition.
        const syncedAt = new Date().toISOString();
        const update = {
          last_sync_at: syncedAt,
          last_sync: syncedAt,
          status: 'connected',
          error_message: null
        };
        if (typeof result?.account_balance === 'number') {
          update.account_balance = result.account_balance;
          update.account_equity = result.account_equity;
        }
        await base44.entities.BrokerConnection.update(connection.id, update);

        // Refresh trades list
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });

        console.log(`[AutoSync] Success: ${result.imported} new trades imported`);
      } catch (error) {
        // A server-side sync lock conflict just means another sync is already
        // running — don't flag the connection as broken.
        if (/already in progress/i.test(error?.message || '')) {
          console.log(`[AutoSync] Skipped ${connection.broker_name}: sync already in progress`);
          return;
        }

        console.error(`[AutoSync] Failed for ${connection.broker_name}:`, error);

        // Update connection with error
        try {
          await base44.entities.BrokerConnection.update(connection.id, {
            status: 'error',
            error_message: error.message
          });
        } catch (updateError) {
          console.error('[AutoSync] Could not record sync error:', updateError);
        }

        queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
      } finally {
        inFlightRef.current.delete(connection.id);
      }
    };

    const checkDueSyncs = () => {
      for (const connection of connectionsRef.current) {
        if (!connection.auto_sync || connection.status !== 'connected') continue;
        if (inFlightRef.current.has(connection.id)) continue;

        const intervalMs = (connection.sync_interval || 3600) * 1000;
        const lastSyncRaw = connection.last_sync_at || connection.last_sync;
        const lastSyncMs = lastSyncRaw ? new Date(lastSyncRaw).getTime() : 0;

        if (Date.now() - lastSyncMs >= intervalMs) {
          performSync(connection);
        }
      }
    };

    checkDueSyncs();
    const timer = setInterval(checkDueSyncs, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [queryClient]); // single stable interval — connection data flows through the ref

  return null; // This is a background service component
}

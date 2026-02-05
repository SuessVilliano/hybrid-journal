import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ConnectionStatusCard({ connection, onSync }) {
  const [syncing, setSyncing] = React.useState(false);

  const statusConfig = {
    connected: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Connected' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
    disconnected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Disconnected' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error' },
    pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Pending' }
  };

  const config = statusConfig[connection.status] || statusConfig.pending;
  const Icon = config.icon;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('manualSync', { connectionId: connection.id });
      toast.success('Sync triggered successfully');
      if (onSync) onSync();
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const modeLabels = {
    'READONLY_API': 'API (Read-Only)',
    'EXECUTION_VIA_ICOPYTRADE': 'HybridCopy Execution',
    'WEBHOOK_PUSH': 'Webhook Push',
    'STATEMENT_INGEST': 'Statement Import'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{connection.display_name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {connection.provider}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {modeLabels[connection.mode] || connection.mode}
              </Badge>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Status</p>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
          </div>
          <div>
            <p className="text-slate-500">Account</p>
            <p className="font-medium">{connection.account_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Last Sync</p>
            <p className="font-medium">
              {connection.last_sync_at 
                ? new Date(connection.last_sync_at).toLocaleString()
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Auto-Sync</p>
            <p className="font-medium">
              {connection.auto_sync_enabled ? `Every ${connection.sync_frequency_minutes}m` : 'Disabled'}
            </p>
          </div>
        </div>

        {connection.error_message && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{connection.error_message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button variant="outline" className="flex-1">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
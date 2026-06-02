import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleCalendarSync({ dailyPlans = [], darkMode }) {
  const [syncing, setSyncing] = useState(null); // 'plans' | 'sessions' | null
  const [lastSync, setLastSync] = useState(null);

  const handleSync = async (action, label) => {
    setSyncing(action);
    try {
      const res = await base44.functions.invoke('syncGoogleCalendar', { action });
      const data = res.data;

      if (data?.success) {
        toast.success(data.message || `${label} synced to Google Calendar!`);
        setLastSync({ action, time: new Date(), results: data.results });
      } else {
        toast.error(data?.error || `Failed to sync ${label}`);
      }
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(null);
    }
  };

  const syncOptions = [
    {
      id: 'syncDailyPlans',
      label: 'Daily Trade Plans',
      description: 'Sync your last 30 daily plans as all-day calendar events',
      icon: '📋',
      color: darkMode ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50',
      badge: `${dailyPlans.length} plans`,
    },
    {
      id: 'syncTradingSessions',
      label: 'Trading Sessions',
      description: 'Sync your last 30 trading sessions with P&L details',
      icon: '📈',
      color: darkMode ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50',
      badge: 'Last 30',
    },
  ];

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Calendar className="h-5 w-5" />
            Google Calendar Sync
          </CardTitle>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs ${darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'} transition-colors`}
          >
            Open Calendar <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Push your trading plans and sessions to Google Calendar to see your schedule alongside market performance.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {syncOptions.map((opt) => (
          <div
            key={opt.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${opt.color}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {opt.label}
                  </span>
                  <Badge variant="outline" className="text-xs">{opt.badge}</Badge>
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {opt.description}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleSync(opt.id, opt.label)}
              disabled={syncing !== null}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white ml-4 shrink-0"
            >
              {syncing === opt.id ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Sync
                </>
              )}
            </Button>
          </div>
        ))}

        {lastSync && (
          <div className={`flex items-center gap-2 text-xs p-3 rounded-lg ${
            darkMode ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Last sync: {lastSync.time.toLocaleTimeString()} —{' '}
              {lastSync.results?.created ?? 0} created, {lastSync.results?.failed ?? 0} failed
            </span>
          </div>
        )}

        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          ℹ️ Events are added to your primary Google Calendar. Running sync again will add duplicate events — best to sync once per period.
        </p>
      </CardContent>
    </Card>
  );
}
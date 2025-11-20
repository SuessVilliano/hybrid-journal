import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';

export default function SyncLogViewer({ connectionId, onClose }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['syncLogs', connectionId],
    queryFn: () => base44.entities.SyncLog.filter({ broker_connection_id: connectionId }, '-sync_timestamp', 20)
  });

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`max-w-4xl w-full max-h-[90vh] overflow-hidden ${
        darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white border-cyan-500/40'
      }`}>
        <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
          <div className="flex justify-between items-center">
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              Sync History
            </CardTitle>
            <button onClick={onClose} className={`${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              <X className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>No sync history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    log.status === 'success'
                      ? darkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                      : log.status === 'partial'
                      ? darkMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
                      : darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                      ) : log.status === 'partial' ? (
                        <AlertTriangle className={`h-5 w-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      ) : (
                        <XCircle className={`h-5 w-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      )}
                      <div>
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {log.sync_type.charAt(0).toUpperCase() + log.sync_type.slice(1)} Sync
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {format(new Date(log.sync_timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                      {log.duration_ms}ms
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className={`text-center p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {log.trades_fetched}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fetched</div>
                    </div>
                    <div className={`text-center p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {log.trades_imported}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Imported</div>
                    </div>
                    <div className={`text-center p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {log.trades_updated || 0}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Updated</div>
                    </div>
                    <div className={`text-center p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {log.trades_skipped}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Skipped</div>
                    </div>
                  </div>

                  {log.error_message && (
                    <div className={`p-2 rounded text-sm ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'}`}>
                      <strong>Error:</strong> {log.error_message}
                    </div>
                  )}

                  {log.errors && log.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className={`text-sm cursor-pointer ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                        {log.errors.length} error(s) details
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {log.errors.map((err, i) => (
                          <div key={i} className={`p-2 rounded ${darkMode ? 'bg-slate-900/50 text-slate-300' : 'bg-white text-slate-700'}`}>
                            {err.trade && <strong>{err.trade}:</strong>} {err.error}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
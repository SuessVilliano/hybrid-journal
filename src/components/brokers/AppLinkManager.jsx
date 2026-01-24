import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link2, Copy, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AppLinkManager() {
  const [connectedApps, setConnectedApps] = useState([]);
  const [linkToken, setLinkToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadConnectedApps();
  }, []);

  useEffect(() => {
    if (tokenExpiry) {
      const timer = setInterval(() => {
        const now = new Date();
        const expiry = new Date(tokenExpiry);
        if (now > expiry) {
          setLinkToken(null);
          setTokenExpiry(null);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tokenExpiry]);

  const loadConnectedApps = async () => {
    const apps = await base44.entities.ConnectedApp.list();
    setConnectedApps(apps);
  };

  const generateLinkToken = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('linkGenerate', {
        targetApp: 'iCopyTrade'
      });

      setLinkToken(response.data.linkToken);
      setTokenExpiry(response.data.expiresAt);
      toast.success('Link token generated!');
    } catch (error) {
      toast.error('Failed to generate token: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(linkToken);
    toast.success('Token copied to clipboard!');
  };

  const revokeConnection = async (appId) => {
    try {
      await base44.entities.ConnectedApp.update(appId, { status: 'revoked' });
      loadConnectedApps();
      toast.success('Connection revoked');
    } catch (error) {
      toast.error('Failed to revoke: ' + error.message);
    }
  };

  const timeRemaining = tokenExpiry ? Math.max(0, Math.floor((new Date(tokenExpiry) - new Date()) / 1000)) : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link iCopyTrade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Generate a one-time link token to securely connect iCopyTrade to your Hybrid Journal account.
            The token expires in 15 minutes.
          </p>

          {!linkToken ? (
            <Button 
              onClick={generateLinkToken}
              disabled={generating}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              {generating ? 'Generating...' : 'Generate Link Token'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-cyan-900">Link Token</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {minutes}m {seconds}s
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    value={linkToken} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={copyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Next Steps:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the token above</li>
                  <li>Go to iCopyTrade → Settings → Connect Journal</li>
                  <li>Paste the token and click "Connect"</li>
                  <li>iCopyTrade will receive a signing secret to authenticate future events</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
        </CardHeader>
        <CardContent>
          {connectedApps.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No apps connected yet</p>
          ) : (
            <div className="space-y-3">
              {connectedApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${
                      app.status === 'active' 
                        ? 'bg-green-500/10' 
                        : app.status === 'revoked' 
                        ? 'bg-red-500/10' 
                        : 'bg-yellow-500/10'
                    }`}>
                      {app.status === 'active' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : app.status === 'revoked' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{app.app_name}</p>
                      <p className="text-xs text-slate-500">
                        {app.total_events_received} events received
                        {app.last_event_at && ` • Last: ${new Date(app.last_event_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={app.status === 'active' ? 'default' : 'outline'}>
                      {app.status}
                    </Badge>
                    {app.status === 'active' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Revoke this app connection?')) {
                            revokeConnection(app.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
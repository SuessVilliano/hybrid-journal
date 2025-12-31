import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Key, Eye, EyeOff, ExternalLink, Book } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function APIKeyManager() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const newApiKey = `hj_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      await base44.auth.updateMe({
        api_key: newApiKey,
        api_key_enabled: true
      });
      return newApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('New API key generated!');
      setShowApiKey(true);
    }
  });

  const toggleApiKeyMutation = useMutation({
    mutationFn: async (enabled) => {
      await base44.auth.updateMe({ api_key_enabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('API key settings updated');
    }
  });

  const copyApiKey = () => {
    if (!user?.api_key) return;
    navigator.clipboard.writeText(user.api_key);
    toast.success('API key copied!');
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    return `${key.substring(0, 8)}${'•'.repeat(16)}${key.substring(key.length - 4)}`;
  };

  const darkMode = document.documentElement.classList.contains('dark');

  if (isLoading) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </div>
          <Dialog open={showDocs} onOpenChange={setShowDocs}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Book className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>API Documentation</DialogTitle>
              </DialogHeader>
              <div className={`space-y-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <div>
                  <h3 className="text-lg font-bold mb-2">Authentication</h3>
                  <p className="mb-2">Include your API key in the request headers:</p>
                  <pre className={`p-3 rounded-lg text-xs overflow-x-auto ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
{`{
  "Content-Type": "application/json",
  "api_key": "your_api_key_here"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Available Endpoints</h3>
                  
                  <div className="space-y-4">
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600">GET</Badge>
                        <code className="text-sm">/api/entities/Trade</code>
                      </div>
                      <p className="text-sm mb-2">List all your trades</p>
                      <pre className="text-xs overflow-x-auto">
{`curl -X GET "https://hybridjournal.base44.app/api/entities/Trade" \\
  -H "api_key: your_api_key"`}
                      </pre>
                    </div>

                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-600">POST</Badge>
                        <code className="text-sm">/api/entities/Trade</code>
                      </div>
                      <p className="text-sm mb-2">Create a new trade</p>
                      <pre className="text-xs overflow-x-auto">
{`curl -X POST "https://hybridjournal.base44.app/api/entities/Trade" \\
  -H "api_key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "BTCUSD",
    "side": "Long",
    "entry_date": "2025-01-01T10:00:00Z",
    "entry_price": 42000,
    "exit_price": 43000,
    "quantity": 1,
    "pnl": 1000
  }'`}
                      </pre>
                    </div>

                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600">GET</Badge>
                        <code className="text-sm">/api/entities/Signal</code>
                      </div>
                      <p className="text-sm">Get your trading signals</p>
                    </div>

                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600">GET</Badge>
                        <code className="text-sm">/api/entities/Account</code>
                      </div>
                      <p className="text-sm">Get your trading accounts</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-2">Use Cases</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Auto Trading:</strong> Programmatically execute trades based on your signals</li>
                    <li><strong>Custom Analytics:</strong> Build custom dashboards with your trading data</li>
                    <li><strong>Market Data Integration:</strong> Connect to external market data providers</li>
                    <li><strong>Broker APIs:</strong> Sync trades from broker APIs automatically</li>
                    <li><strong>Risk Management:</strong> Build automated risk management systems</li>
                    <li><strong>Notifications:</strong> Create custom alert systems</li>
                  </ul>
                </div>

                <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
                  <h4 className={`font-bold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Security Best Practices</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Never share your API key publicly</li>
                    <li>• Use environment variables in your code</li>
                    <li>• Rotate your API key regularly</li>
                    <li>• Disable API access when not needed</li>
                    <li>• Monitor API usage in sync logs</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>
            Use your API key to programmatically access your trading data, automate trades, integrate with broker APIs, and build custom tools.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              API Access Status
            </label>
            <Badge className={user?.api_key_enabled ? 'bg-green-600' : 'bg-red-600'}>
              {user?.api_key_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => toggleApiKeyMutation.mutate(!user?.api_key_enabled)}
              variant={user?.api_key_enabled ? 'destructive' : 'default'}
              size="sm"
              disabled={toggleApiKeyMutation.isPending}
            >
              {user?.api_key_enabled ? 'Disable API Access' : 'Enable API Access'}
            </Button>
            <Button
              onClick={() => generateApiKeyMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={generateApiKeyMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {user?.api_key ? 'Regenerate Key' : 'Generate Key'}
            </Button>
          </div>
        </div>

        {user?.api_key && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Your API Key
            </label>
            <div className="flex gap-2">
              <Input
                value={showApiKey ? user.api_key : maskApiKey(user.api_key)}
                readOnly
                className={`flex-1 font-mono text-xs ${darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}`}
              />
              <Button onClick={() => setShowApiKey(!showApiKey)} variant="outline" size="icon">
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button onClick={copyApiKey} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              ⚠️ Keep this key secure! Anyone with this key can access your trading data and execute actions on your behalf.
            </p>
          </div>
        )}

        {user?.api_key && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Quick Start Example
            </label>
            <pre className={`p-3 rounded-lg text-xs overflow-x-auto ${darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
{`# Fetch your trades
curl -X GET "https://hybridjournal.base44.app/api/entities/Trade" \\
  -H "api_key: ${user.api_key}"`}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WebhookSettings() {
  const queryClient = useQueryClient();
  const [testPayload, setTestPayload] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const newToken = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await base44.auth.updateMe({
        webhook_token: newToken,
        webhook_enabled: true
      });
      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('New webhook token generated!');
    }
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async (enabled) => {
      await base44.auth.updateMe({ webhook_enabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Webhook settings updated');
    }
  });

  const testWebhook = async () => {
    if (!user?.webhook_token) {
      toast.error('Generate a webhook token first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const webhookUrl = `https://hybridjournal.co/api/functions/ingestSignal?token=${user.webhook_token}`;
      
      let payload;
      if (testPayload.trim()) {
        try {
          payload = JSON.parse(testPayload);
        } catch {
          payload = { body: testPayload };
        }
      } else {
        payload = {
          body: "🟢 BUY ALERT 🟢\n💹 Symbol: NQ1!\n📊 Entry: 21000\n🎯 Stop Loss: 20990\n⛔ TP1: 21020\n⛔ TP2: 21040"
        };
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      setTestResult({
        success: response.ok,
        status: response.status,
        data: result
      });

      if (response.ok) {
        toast.success('Webhook test successful!');
        queryClient.invalidateQueries(['signals']);
      } else {
        toast.error('Webhook test failed');
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
      toast.error('Test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!user?.webhook_token) return;
    const webhookUrl = `https://hybridjournal.co/api/functions/ingestSignal?token=${user.webhook_token}`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied!');
  };

  const darkMode = document.documentElement.classList.contains('dark');

  if (isLoading) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  const webhookUrl = user?.webhook_token 
    ? `https://hybridjournal.co/api/functions/ingestSignal?token=${user.webhook_token}`
    : null;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Zap className="h-5 w-5" />
          Webhook Signal Ingestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>
            Use this unique webhook URL to receive trading signals from TradingView, TaskMagic, or any external service. Each trader gets their own private webhook URL.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Webhook Status
            </label>
            <Badge className={user?.webhook_enabled ? 'bg-green-600' : 'bg-red-600'}>
              {user?.webhook_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => toggleWebhookMutation.mutate(!user?.webhook_enabled)}
              variant={user?.webhook_enabled ? 'destructive' : 'default'}
              size="sm"
              disabled={toggleWebhookMutation.isPending}
            >
              {user?.webhook_enabled ? 'Disable Webhook' : 'Enable Webhook'}
            </Button>
            <Button
              onClick={() => generateTokenMutation.mutate()}
              variant="outline"
              size="sm"
              disabled={generateTokenMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {user?.webhook_token ? 'Regenerate Token' : 'Generate Token'}
            </Button>
          </div>
        </div>

        {webhookUrl && (
          <div className="space-y-2">
            <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Your Webhook URL
            </label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className={`flex-1 font-mono text-xs ${darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}`}
              />
              <Button onClick={copyWebhookUrl} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              ⚠️ Keep this URL private! Anyone with this URL can send signals to your account.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Test Your Webhook
          </label>
          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            placeholder="Paste your signal payload here (JSON or text format), or leave empty to use default test"
            rows={4}
            className={`w-full p-3 rounded-lg border text-sm font-mono ${
              darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : 'bg-white border-slate-300'
            }`}
          />
          <Button
            onClick={testWebhook}
            disabled={testing || !user?.webhook_token || !user?.webhook_enabled}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Test Webhook
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? (darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200')
              : (darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200')
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-bold ${
                testResult.success 
                  ? (darkMode ? 'text-green-400' : 'text-green-700')
                  : (darkMode ? 'text-red-400' : 'text-red-700')
              }`}>
                {testResult.success ? 'Success!' : 'Failed'}
              </span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Status: {testResult.status}
              </span>
            </div>
            <pre className={`text-xs overflow-auto p-2 rounded ${
              darkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-700'
            }`}>
              {JSON.stringify(testResult.data || testResult.error, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
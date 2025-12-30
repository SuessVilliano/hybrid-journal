import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const [prefs, setPrefs] = useState(
    user?.notification_preferences || {
      enabled: true,
      symbols: [],
      actions: [],
      min_confidence: 0,
      providers: []
    }
  );

  const [newSymbol, setNewSymbol] = useState('');
  const [newProvider, setNewProvider] = useState('');

  const savePreferences = useMutation({
    mutationFn: async (preferences) => {
      await base44.auth.updateMe({ notification_preferences: preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Notification preferences saved!');
    }
  });

  const handleSave = () => {
    savePreferences.mutate(prefs);
  };

  const addSymbol = () => {
    if (newSymbol && !prefs.symbols.includes(newSymbol.toUpperCase())) {
      setPrefs({ ...prefs, symbols: [...prefs.symbols, newSymbol.toUpperCase()] });
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol) => {
    setPrefs({ ...prefs, symbols: prefs.symbols.filter(s => s !== symbol) });
  };

  const addProvider = () => {
    if (newProvider && !prefs.providers.includes(newProvider)) {
      setPrefs({ ...prefs, providers: [...prefs.providers, newProvider] });
      setNewProvider('');
    }
  };

  const removeProvider = (provider) => {
    setPrefs({ ...prefs, providers: prefs.providers.filter(p => p !== provider) });
  };

  const toggleAction = (action) => {
    const actions = prefs.actions.includes(action)
      ? prefs.actions.filter(a => a !== action)
      : [...prefs.actions, action];
    setPrefs({ ...prefs, actions });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Enable Notifications</Label>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Receive notifications for new trading signals
            </p>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(checked) => setPrefs({ ...prefs, enabled: checked })}
          />
        </div>

        {prefs.enabled && (
          <>
            <div className="space-y-3">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Filter by Symbols</Label>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Leave empty to receive all symbols
              </p>
              <div className="flex gap-2">
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  placeholder="e.g., NQ1, BTCUSD"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                />
                <Button onClick={addSymbol} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {prefs.symbols.map((symbol) => (
                  <Badge key={symbol} className="flex items-center gap-1">
                    {symbol}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSymbol(symbol)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Filter by Action Type</Label>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Leave empty to receive all action types
              </p>
              <div className="flex gap-2">
                {['BUY', 'SELL', 'CLOSE'].map((action) => (
                  <Button
                    key={action}
                    onClick={() => toggleAction(action)}
                    variant={prefs.actions.includes(action) ? 'default' : 'outline'}
                    size="sm"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Minimum Confidence (%)</Label>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Only notify for signals with confidence at or above this level
              </p>
              <Input
                type="number"
                min="0"
                max="100"
                value={prefs.min_confidence}
                onChange={(e) => setPrefs({ ...prefs, min_confidence: parseInt(e.target.value) || 0 })}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>

            <div className="space-y-3">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Filter by Providers</Label>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Leave empty to receive from all providers
              </p>
              <div className="flex gap-2">
                <Input
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProvider()}
                  placeholder="e.g., TradingView, Telegram"
                  className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
                />
                <Button onClick={addProvider} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {prefs.providers.map((provider) => (
                  <Badge key={provider} className="flex items-center gap-1">
                    {provider}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeProvider(provider)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={savePreferences.isPending}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600"
        >
          {savePreferences.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
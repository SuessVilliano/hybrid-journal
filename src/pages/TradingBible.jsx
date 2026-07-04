import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Plus, Trash2, Save, Star, Lock, Unlock, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { CURATED_SYMBOLS, SYMBOL_CATEGORIES, getSymbolInfo } from '@/lib/symbolRegistry';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function TradingBible() {
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');
  const [editingBible, setEditingBible] = useState(null);
  const [newRule, setNewRule] = useState({ entry: '', exit: '', avoid: '', setup: '' });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: bibles = [], isLoading } = useQuery({
    queryKey: ['tradingBibles', user?.email],
    queryFn: async () => {
      const all = await base44.entities.TradingBible.list('-created_date', 50);
      return all.filter(b => b.created_by === user?.email || b.is_published_template);
    },
    enabled: !!user
  });

  const { data: tradeCount = 0 } = useQuery({
    queryKey: ['tradeCount', user?.email],
    queryFn: async () => {
      const trades = await base44.entities.Trade.filter({ created_by: user.email }, '-entry_date', 1);
      // Use the filter result length as a rough count — we only need to know if >= 100
      // For accuracy, we'd need a count endpoint, but this is a reasonable proxy
      const allTrades = await base44.entities.Trade.filter({}, '-entry_date', 200);
      return allTrades.length;
    },
    enabled: !!user
  });

  const hasGraduated = tradeCount >= 100;
  const hasOverride = bibles.some(b => b.graduation_override);

  const createBibleMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TradingBible.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBibles', user?.email] });
      toast.success('Bible created');
      setEditingBible(null);
    },
    onError: (error) => toast.error('Failed to create bible: ' + error.message)
  });

  const updateBibleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.TradingBible.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBibles', user?.email] });
      toast.success('Bible saved');
    },
    onError: (error) => toast.error('Failed to save: ' + error.message)
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (bibleId) => {
      // Unset all defaults first
      for (const b of bibles.filter(b => b.created_by === user?.email)) {
        if (b.is_default && b.id !== bibleId) {
          await base44.entities.TradingBible.update(b.id, { is_default: false });
        }
      }
      return base44.entities.TradingBible.update(bibleId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBibles', user?.email] });
      toast.success('Default bible set');
    }
  });

  const handleSave = (bible) => {
    updateBibleMutation.mutate({ id: bible.id, data: bible });
  };

  const handleCreate = (symbol) => {
    const symbolInfo = getSymbolInfo(symbol);
    createBibleMutation.mutate({
      name: `${symbol} Bible`,
      symbol,
      instrument_type: symbolInfo?.instrument_type || 'Futures',
      preferred_setups: [],
      entry_rules: [],
      exit_rules: [],
      avoid_conditions: [],
      session_windows: [],
      risk_per_trade: '1% of account',
      volatility_filter: '',
      qualitative_logic: '',
      invalidation_logic: '',
      is_default: bibles.filter(b => b.created_by === user?.email).length === 0,
      trade_count_at_creation: tradeCount,
      graduation_override: !hasGraduated
    });
  };

  const updateField = (bibleId, field, value) => {
    const bible = bibles.find(b => b.id === bibleId);
    if (!bible) return;
    // Optimistic local update via query cache
    queryClient.setQueryData(['tradingBibles', user?.email], (old) => {
      return old?.map(b => b.id === bibleId ? { ...b, [field]: value } : b);
    });
  };

  const addRule = (bibleId, field, value) => {
    if (!value.trim()) return;
    const bible = bibles.find(b => b.id === bibleId);
    if (!bible) return;
    const current = bible[field] || [];
    updateField(bibleId, field, [...current, value.trim()]);
    setNewRule({ ...newRule, [field === 'entry_rules' ? 'entry' : field === 'exit_rules' ? 'exit' : field === 'avoid_conditions' ? 'avoid' : 'setup']: '' });
  };

  const removeRule = (bibleId, field, index) => {
    const bible = bibles.find(b => b.id === bibleId);
    if (!bible) return;
    const current = bible[field] || [];
    updateField(bibleId, field, current.filter((_, i) => i !== index));
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-amber-400 to-orange-400' : 'from-amber-600 to-orange-600'
            } bg-clip-text text-transparent`}>
              Trading Bible
            </h1>
            <p className={`text-sm ${darkMode ? 'text-amber-400/70' : 'text-amber-700/70'}`}>
              Your personal edge — codified so the QQE Engine can reason with your rules
            </p>
          </div>
        </div>

        {/* Graduation Status */}
        <Card className={`${
          hasGraduated || hasOverride
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
            : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
        } ${darkMode ? 'backdrop-blur-xl' : ''}`}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {hasGraduated || hasOverride ? (
                <Unlock className="h-6 w-6 text-green-500" />
              ) : (
                <Lock className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {hasGraduated || hasOverride ? 'Full Engine Access' : 'Soft Gate — Preview Mode'}
                </p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {hasGraduated
                    ? `Graduated with ${tradeCount} trades. Bible-aware QQE briefings are active.`
                    : hasOverride
                      ? 'Manual override active. Full engine unlocked before 100 trades.'
                      : `${tradeCount}/100 trades logged. You can create and preview your Bible now — full QQE integration unlocks at 100 trades.`}
                </p>
              </div>
            </div>
            {!hasGraduated && !hasOverride && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                onClick={() => {
                  if (bibles.length > 0) {
                    updateBibleMutation.mutate({
                      id: bibles[0].id,
                      data: { ...bibles[0], graduation_override: true }
                    });
                  } else {
                    toast.info('Create a Bible first, then you can override.');
                  }
                }}
              >
                <Unlock className="h-3 w-3 mr-1" />
                Manual Override
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Create New Bible */}
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} backdrop-blur-xl`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <Plus className="h-5 w-5" />
              Create New Bible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Select a curated symbol to start building your edge:
            </p>
            <div className="space-y-4">
              {Object.entries(SYMBOL_CATEGORIES).map(([category, symbols]) => (
                <div key={category}>
                  <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {symbols.map(sym => {
                      const info = getSymbolInfo(sym);
                      const exists = bibles.some(b => b.symbol === sym && b.created_by === user?.email);
                      return (
                        <button
                          key={sym}
                          disabled={exists || createBibleMutation.isPending}
                          onClick={() => handleCreate(sym)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            exists
                              ? 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400'
                              : darkMode
                                ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-cyan-500/20'
                                : 'bg-white text-cyan-700 hover:bg-cyan-50 border border-cyan-500/30'
                          }`}
                          title={info?.description}
                        >
                          {sym}
                          {exists && ' ✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bible List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          </div>
        ) : bibles.length === 0 ? (
          <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                No Bibles Yet
              </p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Pick a symbol above to codify your trading edge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bibles.map((bible) => {
              const symbolInfo = getSymbolInfo(bible.symbol);
              const isOwn = bible.created_by === user?.email;
              const isEditing = editingBible === bible.id;

              return (
                <Card key={bible.id} className={`backdrop-blur-xl ${
                  bible.is_default
                    ? darkMode ? 'bg-slate-950/80 border-amber-500/40' : 'bg-white border-amber-500/40'
                    : darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                        {bible.is_default && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                        {bible.name}
                        <Badge variant="outline" className="text-xs">{bible.symbol}</Badge>
                        {!isOwn && <Badge className="text-xs bg-purple-500">Template</Badge>}
                      </CardTitle>
                      <div className="flex gap-2">
                        {!bible.is_default && isOwn && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDefaultMutation.mutate(bible.id)}
                            className={darkMode ? 'border-amber-500/30 text-amber-400' : 'border-amber-500/30 text-amber-600'}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Set Default
                          </Button>
                        )}
                        {isOwn && (
                          <Button
                            size="sm"
                            onClick={() => handleSave(bible)}
                            disabled={updateBibleMutation.isPending}
                            className="bg-gradient-to-r from-cyan-500 to-purple-600"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {symbolInfo && (
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {symbolInfo.description} · Benchmarks: {symbolInfo.benchmarks.join(', ')}
                      </p>
                    )}

                    {/* Preferred Setups */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        Preferred Setups
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(bible.preferred_setups || []).map((s, i) => (
                          <Badge key={i} className="bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {s}
                            {isOwn && <button onClick={() => removeRule(bible.id, 'preferred_setups', i)} className="ml-1 hover:text-red-400">×</button>}
                          </Badge>
                        ))}
                      </div>
                      {isOwn && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRule.setup}
                            onChange={(e) => setNewRule({ ...newRule, setup: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addRule(bible.id, 'preferred_setups', newRule.setup)}
                            placeholder="e.g. Overnight Sweep Reversal"
                            className="text-sm"
                          />
                          <Button size="sm" variant="outline" onClick={() => addRule(bible.id, 'preferred_setups', newRule.setup)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Entry Rules */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Entry Rules (Quantitative)
                      </label>
                      <div className="space-y-1 mt-2">
                        {(bible.entry_rules || []).map((r, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            <ChevronRight className="h-3 w-3 text-green-500" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{r}</span>
                            {isOwn && <button onClick={() => removeRule(bible.id, 'entry_rules', i)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>}
                          </div>
                        ))}
                      </div>
                      {isOwn && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRule.entry}
                            onChange={(e) => setNewRule({ ...newRule, entry: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addRule(bible.id, 'entry_rules', newRule.entry)}
                            placeholder="e.g. Price must sweep overnight low and reclaim within 5min"
                            className="text-sm"
                          />
                          <Button size="sm" variant="outline" onClick={() => addRule(bible.id, 'entry_rules', newRule.entry)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Exit Rules */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        Exit Rules
                      </label>
                      <div className="space-y-1 mt-2">
                        {(bible.exit_rules || []).map((r, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            <ChevronRight className="h-3 w-3 text-red-500" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{r}</span>
                            {isOwn && <button onClick={() => removeRule(bible.id, 'exit_rules', i)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>}
                          </div>
                        ))}
                      </div>
                      {isOwn && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRule.exit}
                            onChange={(e) => setNewRule({ ...newRule, exit: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addRule(bible.id, 'exit_rules', newRule.exit)}
                            placeholder="e.g. TP1 at 50% of overnight range"
                            className="text-sm"
                          />
                          <Button size="sm" variant="outline" onClick={() => addRule(bible.id, 'exit_rules', newRule.exit)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Risk & Volatility */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`text-xs font-semibold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Risk Per Trade</label>
                        <Input
                          value={bible.risk_per_trade || ''}
                          onChange={(e) => updateField(bible.id, 'risk_per_trade', e.target.value)}
                          disabled={!isOwn}
                          className="mt-1 text-sm"
                          placeholder="1% of account"
                        />
                      </div>
                      <div>
                        <label className={`text-xs font-semibold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Volatility Filter</label>
                        <Input
                          value={bible.volatility_filter || ''}
                          onChange={(e) => updateField(bible.id, 'volatility_filter', e.target.value)}
                          disabled={!isOwn}
                          className="mt-1 text-sm"
                          placeholder="VIX 12-25"
                        />
                      </div>
                    </div>

                    {/* Session Windows */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Session Windows</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(bible.session_windows || []).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                            {isOwn && <button onClick={() => removeRule(bible.id, 'session_windows', i)} className="ml-1 hover:text-red-400">×</button>}
                          </Badge>
                        ))}
                      </div>
                      {isOwn && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRule.setup}
                            onChange={(e) => setNewRule({ ...newRule, setup: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addRule(bible.id, 'session_windows', newRule.setup)}
                            placeholder="e.g. NY Open 9:30-11am"
                            className="text-sm"
                          />
                          <Button size="sm" variant="outline" onClick={() => addRule(bible.id, 'session_windows', newRule.setup)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Avoid Conditions */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        Avoid Conditions
                      </label>
                      <div className="space-y-1 mt-2">
                        {(bible.avoid_conditions || []).map((r, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{r}</span>
                            {isOwn && <button onClick={() => removeRule(bible.id, 'avoid_conditions', i)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>}
                          </div>
                        ))}
                      </div>
                      {isOwn && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newRule.avoid}
                            onChange={(e) => setNewRule({ ...newRule, avoid: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && addRule(bible.id, 'avoid_conditions', newRule.avoid)}
                            placeholder="e.g. No trading 15min before/after FOMC"
                            className="text-sm"
                          />
                          <Button size="sm" variant="outline" onClick={() => addRule(bible.id, 'avoid_conditions', newRule.avoid)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Qualitative Logic */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        Qualitative Logic — The "Why"
                      </label>
                      <Textarea
                        value={bible.qualitative_logic || ''}
                        onChange={(e) => updateField(bible.id, 'qualitative_logic', e.target.value)}
                        disabled={!isOwn}
                        className="mt-1 text-sm min-h-[100px]"
                        placeholder="Explain your core reasoning. Why does your edge work? What structural force makes this pattern repeat?"
                      />
                    </div>

                    {/* Invalidation Logic */}
                    <div>
                      <label className={`text-xs font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        Invalidation Logic
                      </label>
                      <Textarea
                        value={bible.invalidation_logic || ''}
                        onChange={(e) => updateField(bible.id, 'invalidation_logic', e.target.value)}
                        disabled={!isOwn}
                        className="mt-1 text-sm min-h-[60px]"
                        placeholder="What would make your edge stop working? (e.g. VIX > 30 = stop trading sweep reversals)"
                      />
                    </div>

                    {/* Link to QQE Engine */}
                    {bible.is_default && (
                      <Link to={createPageUrl('QQEngine')}>
                        <Button variant="outline" size="sm" className={darkMode ? 'border-purple-500/30 text-purple-400' : 'border-purple-500/30 text-purple-600'}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Use in QQE Engine
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <Card className={`${darkMode ? 'bg-slate-950/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <CardContent className="p-4">
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Disclaimer: The Trading Bible and QQE Engine provide AI-assisted analysis for planning purposes only.
              All trade execution decisions remain your sole responsibility. Past performance does not guarantee future results.
              Market conditions change — always validate your edge against current conditions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
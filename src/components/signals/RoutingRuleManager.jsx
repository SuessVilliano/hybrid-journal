import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RoutingRuleManager() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['routingRules'],
    queryFn: () => base44.entities.SignalRoutingRule.list('-priority')
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.SignalRoutingRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['routingRules']);
      setShowEditor(false);
      setEditingRule(null);
      toast.success('Routing rule created');
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SignalRoutingRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['routingRules']);
      setShowEditor(false);
      setEditingRule(null);
      toast.success('Routing rule updated');
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.SignalRoutingRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['routingRules']);
      toast.success('Routing rule deleted');
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.SignalRoutingRule.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries(['routingRules'])
  });

  const openEditor = (rule = null) => {
    if (rule) {
      setEditingRule({ ...rule });
    } else {
      setEditingRule({
        name: '',
        enabled: true,
        priority: 0,
        conditions: {
          symbols: [],
          actions: [],
          providers: [],
          min_confidence: 0,
          max_confidence: 100
        },
        actions: [],
        stop_after_match: false
      });
    }
    setShowEditor(true);
  };

  const addSymbol = (symbol) => {
    if (!symbol.trim()) return;
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        symbols: [...(editingRule.conditions.symbols || []), symbol.trim()]
      }
    });
  };

  const removeSymbol = (symbol) => {
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        symbols: editingRule.conditions.symbols.filter(s => s !== symbol)
      }
    });
  };

  const addProvider = (provider) => {
    if (!provider.trim()) return;
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        providers: [...(editingRule.conditions.providers || []), provider.trim()]
      }
    });
  };

  const removeProvider = (provider) => {
    setEditingRule({
      ...editingRule,
      conditions: {
        ...editingRule.conditions,
        providers: editingRule.conditions.providers.filter(p => p !== provider)
      }
    });
  };

  const toggleAction = (action) => {
    const actions = editingRule.conditions.actions || [];
    if (actions.includes(action)) {
      setEditingRule({
        ...editingRule,
        conditions: {
          ...editingRule.conditions,
          actions: actions.filter(a => a !== action)
        }
      });
    } else {
      setEditingRule({
        ...editingRule,
        conditions: {
          ...editingRule.conditions,
          actions: [...actions, action]
        }
      });
    }
  };

  const addAction = (type) => {
    const newAction = { type, config: {} };
    setEditingRule({
      ...editingRule,
      actions: [...(editingRule.actions || []), newAction]
    });
  };

  const removeAction = (index) => {
    setEditingRule({
      ...editingRule,
      actions: editingRule.actions.filter((_, i) => i !== index)
    });
  };

  const updateActionConfig = (index, key, value) => {
    const newActions = [...editingRule.actions];
    newActions[index].config[key] = value;
    setEditingRule({ ...editingRule, actions: newActions });
  };

  const saveRule = () => {
    if (!editingRule.name || editingRule.actions.length === 0) {
      toast.error('Rule name and at least one action are required');
      return;
    }

    if (editingRule.id) {
      updateRuleMutation.mutate({ id: editingRule.id, data: editingRule });
    } else {
      createRuleMutation.mutate(editingRule);
    }
  };

  return (
    <>
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Signal Routing Rules
            </CardTitle>
            <Button onClick={() => openEditor()} size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                No routing rules yet. Create one to automate signal processing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => toggleRuleMutation.mutate({ id: rule.id, enabled })}
                      />
                      <div>
                        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {rule.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                          {rule.stop_after_match && <Badge className="bg-orange-600">Stop After Match</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => openEditor(rule)} variant="outline" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                        variant="outline"
                        size="icon"
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div className="mb-2">
                      <strong className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Conditions:</strong>
                      {rule.conditions.symbols?.length > 0 && (
                        <div className="mt-1">Symbols: {rule.conditions.symbols.join(', ')}</div>
                      )}
                      {rule.conditions.actions?.length > 0 && (
                        <div className="mt-1">Actions: {rule.conditions.actions.join(', ')}</div>
                      )}
                      {rule.conditions.providers?.length > 0 && (
                        <div className="mt-1">Providers: {rule.conditions.providers.join(', ')}</div>
                      )}
                      {rule.conditions.min_confidence > 0 && (
                        <div className="mt-1">Min Confidence: {rule.conditions.min_confidence}%</div>
                      )}
                    </div>
                    <div>
                      <strong className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Actions:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.actions.map((action, idx) => (
                          <Badge key={idx} className="bg-purple-600">
                            {action.type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-950 border-cyan-500/20' : ''}`}>
          <DialogHeader>
            <DialogTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              {editingRule?.id ? 'Edit Routing Rule' : 'Create Routing Rule'}
            </DialogTitle>
          </DialogHeader>

          {editingRule && (
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Rule Name
                </label>
                <Input
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g., Auto-execute high confidence NQ signals"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Priority
                  </label>
                  <Input
                    type="number"
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingRule.stop_after_match}
                    onCheckedChange={(checked) => setEditingRule({ ...editingRule, stop_after_match: checked })}
                  />
                  <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Stop after match
                  </label>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Conditions</h3>

                <div className="space-y-3">
                  <div>
                    <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Symbols (leave empty for all)</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="e.g., NQ1!, BTCUSD"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addSymbol(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editingRule.conditions.symbols?.map((symbol) => (
                        <Badge key={symbol} variant="outline" className="cursor-pointer" onClick={() => removeSymbol(symbol)}>
                          {symbol} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Action Types</label>
                    <div className="flex gap-2 mt-1">
                      {['BUY', 'SELL', 'CLOSE'].map((action) => (
                        <Button
                          key={action}
                          onClick={() => toggleAction(action)}
                          variant={editingRule.conditions.actions?.includes(action) ? 'default' : 'outline'}
                          size="sm"
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Providers (leave empty for all)</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="e.g., TradingView, Hybrid AI"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addProvider(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {editingRule.conditions.providers?.map((provider) => (
                        <Badge key={provider} variant="outline" className="cursor-pointer" onClick={() => removeProvider(provider)}>
                          {provider} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Min Confidence %</label>
                      <Input
                        type="number"
                        value={editingRule.conditions.min_confidence}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          conditions: { ...editingRule.conditions, min_confidence: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                    <div>
                      <label className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Max Confidence %</label>
                      <Input
                        type="number"
                        value={editingRule.conditions.max_confidence}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          conditions: { ...editingRule.conditions, max_confidence: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Actions</h3>
                  <Select onValueChange={addAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                      <SelectItem value="create_journal_entry">Create Journal Entry</SelectItem>
                      <SelectItem value="webhook">Call Webhook</SelectItem>
                      <SelectItem value="api_call">Execute API Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {editingRule.actions?.map((action, idx) => (
                    <div key={idx} className={`p-3 rounded border ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-purple-600">{action.type.replace(/_/g, ' ')}</Badge>
                        <Button onClick={() => removeAction(idx)} variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      {action.type === 'send_notification' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Notification title"
                            value={action.config.title || ''}
                            onChange={(e) => updateActionConfig(idx, 'title', e.target.value)}
                          />
                          <Input
                            placeholder="Message (use {{symbol}}, {{action}}, {{price}} placeholders)"
                            value={action.config.message || ''}
                            onChange={(e) => updateActionConfig(idx, 'message', e.target.value)}
                          />
                          <Select
                            value={action.config.priority || 'medium'}
                            onValueChange={(value) => updateActionConfig(idx, 'priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {action.type === 'create_journal_entry' && (
                        <Input
                          placeholder="Journal entry content (use {{symbol}}, {{action}} placeholders)"
                          value={action.config.content || ''}
                          onChange={(e) => updateActionConfig(idx, 'content', e.target.value)}
                        />
                      )}

                      {action.type === 'webhook' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Webhook URL"
                            value={action.config.url || ''}
                            onChange={(e) => updateActionConfig(idx, 'url', e.target.value)}
                          />
                          <Input
                            placeholder="Method (POST, GET)"
                            value={action.config.method || 'POST'}
                            onChange={(e) => updateActionConfig(idx, 'method', e.target.value)}
                          />
                        </div>
                      )}

                      {action.type === 'api_call' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="API endpoint URL"
                            value={action.config.url || ''}
                            onChange={(e) => updateActionConfig(idx, 'url', e.target.value)}
                          />
                          <Input
                            placeholder="API key (if needed)"
                            value={action.config.api_key || ''}
                            onChange={(e) => updateActionConfig(idx, 'api_key', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button onClick={() => setShowEditor(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={saveRule} className="bg-gradient-to-r from-cyan-500 to-purple-600">
                  <Save className="h-4 w-4 mr-2" />
                  Save Rule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CopyParametersForm({ sourceConnectionId, onSave }) {
  const [connections, setConnections] = useState([]);
  const [params, setParams] = useState({
    source_connection_id: sourceConnectionId,
    target_connection_id: '',
    enabled: false,
    risk_multiplier: 1.0,
    max_position_size: null,
    max_daily_trades: null,
    symbol_mapping: {},
    allowed_symbols: [],
    blocked_symbols: [],
    copy_stop_loss: true,
    copy_take_profit: true,
    adjust_sl_offset_pips: 0,
    adjust_tp_offset_pips: 0,
    max_slippage_pips: 5,
    require_confirmation: false
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [newMappedSymbol, setNewMappedSymbol] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const conns = await base44.entities.BrokerConnection.list();
    setConnections(conns.filter(c => c.id !== sourceConnectionId));
  };

  const addSymbolMapping = () => {
    if (newSymbol && newMappedSymbol) {
      setParams({
        ...params,
        symbol_mapping: {
          ...params.symbol_mapping,
          [newSymbol]: newMappedSymbol
        }
      });
      setNewSymbol('');
      setNewMappedSymbol('');
    }
  };

  const removeSymbolMapping = (symbol) => {
    const { [symbol]: _, ...rest } = params.symbol_mapping;
    setParams({ ...params, symbol_mapping: rest });
  };

  const handleSave = async () => {
    try {
      await base44.entities.CopyParameters.create(params);
      toast.success('Copy parameters saved!');
      if (onSave) onSave();
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5" />
          Trade Copying Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Target Account</Label>
          <Select value={params.target_connection_id} onValueChange={v => setParams({ ...params, target_connection_id: v })}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select target account..." />
            </SelectTrigger>
            <SelectContent>
              {connections.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.display_name} ({c.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Enable Copying</Label>
          <Switch checked={params.enabled} onCheckedChange={v => setParams({ ...params, enabled: v })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Risk Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={params.risk_multiplier}
              onChange={e => setParams({ ...params, risk_multiplier: parseFloat(e.target.value) })}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">1.0 = same size, 0.5 = half, 2.0 = double</p>
          </div>

          <div>
            <Label>Max Position Size (lots)</Label>
            <Input
              type="number"
              step="0.01"
              value={params.max_position_size || ''}
              onChange={e => setParams({ ...params, max_position_size: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="No limit"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Max Daily Trades</Label>
            <Input
              type="number"
              value={params.max_daily_trades || ''}
              onChange={e => setParams({ ...params, max_daily_trades: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="No limit"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Max Slippage (pips)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.max_slippage_pips}
              onChange={e => setParams({ ...params, max_slippage_pips: parseFloat(e.target.value) })}
              className="mt-2"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Symbol Mapping (Optional)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Source symbol (e.g., NQ)"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            />
            <span className="flex items-center">→</span>
            <Input
              placeholder="Target symbol (e.g., NQH25)"
              value={newMappedSymbol}
              onChange={e => setNewMappedSymbol(e.target.value.toUpperCase())}
            />
            <Button onClick={addSymbolMapping} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {Object.entries(params.symbol_mapping).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(params.symbol_mapping).map(([source, target]) => (
                <Badge key={source} variant="outline" className="flex items-center gap-2">
                  {source} → {target}
                  <button onClick={() => removeSymbolMapping(source)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Copy Stop Loss</Label>
            <Switch checked={params.copy_stop_loss} onCheckedChange={v => setParams({ ...params, copy_stop_loss: v })} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Copy Take Profit</Label>
            <Switch checked={params.copy_take_profit} onCheckedChange={v => setParams({ ...params, copy_take_profit: v })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>SL Offset (pips)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.adjust_sl_offset_pips}
              onChange={e => setParams({ ...params, adjust_sl_offset_pips: parseFloat(e.target.value) })}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">Tighter (negative) or wider (positive)</p>
          </div>

          <div>
            <Label>TP Offset (pips)</Label>
            <Input
              type="number"
              step="0.1"
              value={params.adjust_tp_offset_pips}
              onChange={e => setParams({ ...params, adjust_tp_offset_pips: parseFloat(e.target.value) })}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Require Confirmation</Label>
            <p className="text-xs text-slate-500">Manually approve each copy</p>
          </div>
          <Switch checked={params.require_confirmation} onCheckedChange={v => setParams({ ...params, require_confirmation: v })} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!params.target_connection_id}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
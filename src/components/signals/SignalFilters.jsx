import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

export default function SignalFilters({ filters, onFiltersChange, onReset }) {
  const darkMode = document.documentElement.classList.contains('dark');

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addSymbol = (symbol) => {
    if (symbol && !filters.symbols.includes(symbol.toUpperCase())) {
      updateFilter('symbols', [...filters.symbols, symbol.toUpperCase()]);
    }
  };

  const removeSymbol = (symbol) => {
    updateFilter('symbols', filters.symbols.filter(s => s !== symbol));
  };

  const addProvider = (provider) => {
    if (provider && !filters.providers.includes(provider)) {
      updateFilter('providers', [...filters.providers, provider]);
    }
  };

  const removeProvider = (provider) => {
    updateFilter('providers', filters.providers.filter(p => p !== provider));
  };

  const hasActiveFilters = 
    filters.symbols.length > 0 || 
    filters.actions.length > 0 || 
    filters.providers.length > 0 || 
    filters.minConfidence > 0 || 
    filters.maxConfidence < 100;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Filter Signals
            </h3>
          </div>
          {hasActiveFilters && (
            <Button onClick={onReset} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Symbol Filter */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Symbols</Label>
            <Input
              placeholder="Add symbol (e.g., NQ1)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addSymbol(e.target.value);
                  e.target.value = '';
                }
              }}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
            <div className="flex flex-wrap gap-2">
              {filters.symbols.map((symbol) => (
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

          {/* Action Filter */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Action Type</Label>
            <div className="flex gap-2">
              {['BUY', 'SELL', 'CLOSE'].map((action) => (
                <Button
                  key={action}
                  onClick={() => {
                    const actions = filters.actions.includes(action)
                      ? filters.actions.filter(a => a !== action)
                      : [...filters.actions, action];
                    updateFilter('actions', actions);
                  }}
                  variant={filters.actions.includes(action) ? 'default' : 'outline'}
                  size="sm"
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>

          {/* Provider Filter */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Providers</Label>
            <Input
              placeholder="Add provider"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addProvider(e.target.value);
                  e.target.value = '';
                }
              }}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
            <div className="flex flex-wrap gap-2">
              {filters.providers.map((provider) => (
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

          {/* Confidence Range */}
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
              Confidence Range ({filters.minConfidence}% - {filters.maxConfidence}%)
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Min"
                value={filters.minConfidence}
                onChange={(e) => updateFilter('minConfidence', parseInt(e.target.value) || 0)}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Max"
                value={filters.maxConfidence}
                onChange={(e) => updateFilter('maxConfidence', parseInt(e.target.value) || 100)}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
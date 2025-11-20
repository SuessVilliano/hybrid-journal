import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Settings, LayoutGrid } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const AVAILABLE_WIDGETS = [
  { id: 'pnl', name: 'Total P&L', description: 'Your overall profit and loss' },
  { id: 'winRate', name: 'Win Rate', description: 'Percentage of winning trades' },
  { id: 'profitFactor', name: 'Profit Factor', description: 'Risk-adjusted performance' },
  { id: 'avgWin', name: 'Average Win', description: 'Average winning trade size' },
  { id: 'avgLoss', name: 'Average Loss', description: 'Average losing trade size' },
  { id: 'equityCurve', name: 'Equity Curve', description: 'Visual P&L progression' },
  { id: 'recentTrades', name: 'Recent Trades', description: 'Latest 5 trades' },
  { id: 'calendar', name: 'Trade Calendar', description: 'Calendar view of trades' },
  { id: 'performance', name: 'Performance Breakdown', description: 'Detailed metrics' },
  { id: 'hybridScore', name: 'Hybrid Score™', description: 'Patent-pending performance score' },
  { id: 'emotions', name: 'Emotional Patterns', description: 'Psychology tracking' },
  { id: 'strategies', name: 'Strategy Performance', description: 'Strategy breakdown' },
  { id: 'instruments', name: 'Instrument Analysis', description: 'Performance by symbol' },
  { id: 'compound', name: 'Compound Calculator', description: 'Simulate profit growth' }
];

export default function WidgetSelector({ enabledWidgets, onToggle, onClose }) {
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`max-w-3xl w-full ${darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
                Customize Dashboard
              </CardTitle>
              <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-slate-600'}`}>
                Choose which widgets to display
              </p>
            </div>
          </div>
          <button onClick={onClose} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}>
            <X className="h-6 w-6" />
          </button>
        </CardHeader>
        
        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
          {AVAILABLE_WIDGETS.map((widget) => (
            <div
              key={widget.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                darkMode ? 'border-cyan-500/20 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex-1">
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {widget.name}
                </div>
                <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {widget.description}
                </div>
              </div>
              <Switch
                checked={enabledWidgets.includes(widget.id)}
                onCheckedChange={() => onToggle(widget.id)}
              />
            </div>
          ))}
        </CardContent>
        
        <div className={`p-4 border-t ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'} flex justify-end gap-3`}>
          <Button onClick={onClose} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
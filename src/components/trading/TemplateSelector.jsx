import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, TrendingUp, Clock, Coins, BarChart3, Target, CheckCircle } from 'lucide-react';

const TEMPLATE_ICONS = {
  Scalping: Clock,
  'Day Trading': TrendingUp,
  'Swing Trading': BarChart3,
  Options: Target,
  Futures: Zap,
  Crypto: Coins,
  Forex: TrendingUp
};

export default function TemplateSelector({ templates, onSelect, selectedTemplate }) {
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Choose a Template
        </h3>
        <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
          Select a pre-configured template for your trading style
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = TEMPLATE_ICONS[template.trading_style] || TrendingUp;
          const isSelected = selectedTemplate?.id === template.id;

          return (
            <Card
              key={template.id}
              onClick={() => onSelect(template)}
              className={`cursor-pointer transition-all hover:scale-105 ${
                isSelected
                  ? darkMode
                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border-cyan-500/50'
                    : 'bg-gradient-to-br from-cyan-50 to-purple-50 border-cyan-500/50'
                  : darkMode
                    ? 'bg-slate-950/80 border-cyan-500/20 hover:border-cyan-500/40'
                    : 'bg-white border-slate-200 hover:border-cyan-500/40'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-500 to-purple-600'
                      : darkMode
                        ? 'bg-slate-900'
                        : 'bg-slate-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-6 w-6 text-cyan-500" />
                  )}
                </div>

                <h4 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {template.name}
                </h4>
                <p className={`text-sm mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {template.description}
                </p>

                {template.suggested_tags && template.suggested_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.suggested_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          darkMode
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'bg-cyan-100 text-cyan-700'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <button
        onClick={() => onSelect(null)}
        className={`w-full p-4 rounded-lg border-2 border-dashed transition-colors ${
          !selectedTemplate
            ? darkMode
              ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
              : 'border-cyan-500/50 bg-cyan-50 text-cyan-700'
            : darkMode
              ? 'border-slate-700 hover:border-cyan-500/30 text-slate-400'
              : 'border-slate-300 hover:border-cyan-500/30 text-slate-600'
        }`}
      >
        <div className="text-center">
          <p className="font-medium">No Template (Blank Trade)</p>
          <p className="text-sm opacity-80 mt-1">Start from scratch without pre-filled fields</p>
        </div>
      </button>
    </div>
  );
}
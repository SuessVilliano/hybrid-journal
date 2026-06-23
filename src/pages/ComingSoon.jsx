import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Rocket } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function ComingSoon() {
  const darkMode = document.documentElement.classList.contains('dark');
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const feature = urlParams.get('feature') || 'This feature';

  return (
    <div className={`min-h-[80vh] flex items-center justify-center p-6`}>
      <Card className={`max-w-lg w-full text-center border-2 ${
        darkMode
          ? 'bg-slate-950/80 border-cyan-500/30'
          : 'bg-white border-cyan-500/40'
      }`}>
        <CardContent className="p-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/40">
                <Rocket className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>

          <h1 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            {feature}
          </h1>

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 ${
            darkMode ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-300'
          }`}>
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            Coming Soon
          </div>

          <p className={`text-sm md:text-base mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            We're keeping things focused so you can build the daily trading habit first.
            <br className="hidden md:block" />
            This advanced tool is in the works and will unlock once the core workflow feels effortless.
          </p>

          <div className={`grid grid-cols-3 gap-3 mb-8 text-left`}>
            {[
              { icon: '🎯', label: 'Daily Habit First' },
              { icon: '🚀', label: 'Polishing Now' },
              { icon: '✨', label: 'Auto-Unlocks Soon' },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl text-center ${
                darkMode ? 'bg-slate-900/60 border border-cyan-500/10' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="text-xl mb-1">{item.icon}</div>
                <div className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
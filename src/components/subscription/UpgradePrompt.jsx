import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function UpgradePrompt({ 
  feature, 
  requiredTier = 'pro',
  inline = false 
}) {
  const darkMode = document.documentElement.classList.contains('dark');

  const tierInfo = {
    pro: {
      name: 'Pro',
      price: '$29/mo',
      icon: TrendingUp,
      color: 'from-cyan-500 to-purple-600'
    },
    team: {
      name: 'Team',
      price: '$49/mo',
      icon: Users,
      color: 'from-purple-500 to-pink-600'
    }
  };

  const info = tierInfo[requiredTier];
  const Icon = info.icon;

  if (inline) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${
        darkMode ? 'bg-slate-800/50 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-500/30'
      }`}>
        <Lock className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {feature} requires {info.name}
        </span>
        <Link to={createPageUrl('Pricing')} className="ml-auto">
          <Button size="sm" className={`bg-gradient-to-r ${info.color}`}>
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className={`backdrop-blur-xl ${
      darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'
    }`}>
      <CardContent className="p-8 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Unlock {feature}
        </h3>
        <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Upgrade to {info.name} to access this powerful feature
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`text-4xl font-bold bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
            {info.price}
          </span>
        </div>
        <Link to={createPageUrl('Pricing')}>
          <Button className={`bg-gradient-to-r ${info.color} hover:opacity-90 text-white`}>
            <Sparkles className="h-4 w-4 mr-2" />
            View Pricing Plans
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
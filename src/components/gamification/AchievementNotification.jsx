import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Zap, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AchievementNotification({ badge, xpGained, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (badge) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [badge, onClose]);

  const darkMode = document.documentElement.classList.contains('dark');

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      {badge && (
        <Card className={`p-6 shadow-2xl border-2 ${
          badge.badge_tier === 'legendary' ? 'border-purple-500 bg-gradient-to-br from-purple-900 to-pink-900' :
          badge.badge_tier === 'platinum' ? 'border-cyan-500 bg-gradient-to-br from-cyan-900 to-blue-900' :
          badge.badge_tier === 'gold' ? 'border-yellow-500 bg-gradient-to-br from-yellow-900 to-orange-900' :
          badge.badge_tier === 'silver' ? 'border-slate-400 bg-gradient-to-br from-slate-800 to-slate-900' :
          'border-orange-600 bg-gradient-to-br from-orange-900 to-red-900'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <div>
              <div className="text-sm text-white/80 mb-1">Badge Unlocked!</div>
              <div className="text-xl font-bold text-white mb-1">{badge.badge_name}</div>
              <div className="text-sm text-white/70">{badge.badge_description}</div>
              <div className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                <Star className="h-3 w-3" />
                +{badge.points_awarded} points
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {xpGained && !badge && (
        <Card className={`p-4 shadow-2xl ${darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white border-cyan-500/30'}`}>
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-cyan-500" />
            <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              +{xpGained} XP
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
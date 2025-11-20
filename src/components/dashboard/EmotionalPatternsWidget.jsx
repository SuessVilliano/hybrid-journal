import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Brain } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function EmotionalPatternsWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');

  const emotionData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const emotions = trades.reduce((acc, t) => {
      if (t.emotion_before) {
        if (!acc[t.emotion_before]) acc[t.emotion_before] = { count: 0, pnl: 0 };
        acc[t.emotion_before].count++;
        acc[t.emotion_before].pnl += t.pnl || 0;
      }
      return acc;
    }, {});

    return Object.entries(emotions).map(([name, data]) => ({
      name,
      value: data.count,
      avgPnl: data.pnl / data.count
    }));
  }, [trades]);

  if (emotionData.length === 0) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Brain className="h-5 w-5" />
            Emotional Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No emotional data available. Track your emotions to see patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Brain className="h-5 w-5" />
          Emotional Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={emotionData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry) => `${entry.name}: ${entry.value}`}
            >
              {emotionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 space-y-2">
          {emotionData.slice(0, 3).map((emotion, idx) => (
            <div key={emotion.name} className={`flex justify-between text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <span>{emotion.name}</span>
              <span className={emotion.avgPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                Avg: ${emotion.avgPnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
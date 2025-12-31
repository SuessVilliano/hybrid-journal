import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator } from 'lucide-react';

export default function EVCalculator() {
  const [probability, setProbability] = useState(50);
  const [reward, setReward] = useState(3);
  const [risk, setRisk] = useState(1);
  const [ev, setEV] = useState(null);
  const [chartData, setChartData] = useState([]);

  const calculateEV = () => {
    const probWin = probability / 100;
    const probLoss = 1 - probWin;
    const expectedValue = (probWin * reward) - (probLoss * risk);
    setEV(expectedValue);

    // Generate chart data
    const data = [];
    for (let p = 40; p <= 60; p += 0.5) {
      const prob = p / 100;
      const value = (prob * reward) - ((1 - prob) * risk);
      data.push({ probability: p, EV: parseFloat(value.toFixed(2)) });
    }
    setChartData(data);
  };

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Calculator className="h-5 w-5" />
          Expected Value (EV) Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Probability of Winning (%)
          </label>
          <Input
            type="number"
            value={probability}
            onChange={(e) => setProbability(parseFloat(e.target.value) || 0)}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Reward
          </label>
          <Input
            type="number"
            value={reward}
            onChange={(e) => setReward(parseFloat(e.target.value) || 0)}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Risk
          </label>
          <Input
            type="number"
            value={risk}
            onChange={(e) => setRisk(parseFloat(e.target.value) || 0)}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <Button
          onClick={calculateEV}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
        >
          Calculate EV
        </Button>

        {ev !== null && (
          <>
            <div className={`p-6 rounded-lg border text-center ${
              darkMode ? 'bg-slate-900 border-cyan-500/30' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Expected Value:
              </div>
              <div className={`text-4xl font-bold ${
                ev > 0 ? 'text-green-500' : ev < 0 ? 'text-red-500' : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {ev.toFixed(2)}
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                {ev > 0 ? 'Positive EV - Good trade!' : ev < 0 ? 'Negative EV - Avoid this trade' : 'Break-even'}
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="probability" 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      label={{ value: 'Probability (%)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      label={{ value: 'EV', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                        border: `1px solid ${darkMode ? '#06b6d4' : '#94a3b8'}`,
                        borderRadius: '8px',
                        color: darkMode ? '#ffffff' : '#0f172a'
                      }}
                    />
                    <Line type="monotone" dataKey="EV" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, Target, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ImportVisualization({ importRecord, onClose }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrades();
  }, [importRecord.id]);

  const loadTrades = async () => {
    try {
      const allTrades = await base44.entities.Trade.list('-entry_date', 1000);
      const importTrades = allTrades.filter(t => 
        t.import_source === importRecord.filename ||
        new Date(t.created_date).toDateString() === new Date(importRecord.created_date).toDateString()
      );
      setTrades(importTrades.slice(0, importRecord.trades_imported));
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-slate-600 mt-4">Loading import analysis...</p>
        </CardContent>
      </Card>
    );
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length * 100) : 0;

  // P&L by Symbol
  const symbolData = {};
  trades.forEach(t => {
    if (!symbolData[t.symbol]) {
      symbolData[t.symbol] = { symbol: t.symbol, pnl: 0, trades: 0 };
    }
    symbolData[t.symbol].pnl += t.pnl || 0;
    symbolData[t.symbol].trades += 1;
  });
  const symbolChartData = Object.values(symbolData).sort((a, b) => b.pnl - a.pnl);

  // Win/Loss Distribution
  const distributionData = [
    { name: 'Winning', value: winningTrades.length, color: '#10b981' },
    { name: 'Losing', value: losingTrades.length, color: '#ef4444' }
  ];

  // Daily P&L
  const dailyPnL = {};
  trades.forEach(t => {
    const date = new Date(t.entry_date).toLocaleDateString();
    if (!dailyPnL[date]) {
      dailyPnL[date] = { date, pnl: 0 };
    }
    dailyPnL[date].pnl += t.pnl || 0;
  });
  const dailyChartData = Object.values(dailyPnL).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Long vs Short Performance
  const longTrades = trades.filter(t => t.side === 'Long');
  const shortTrades = trades.filter(t => t.side === 'Short');
  const sideData = [
    {
      name: 'Long',
      wins: longTrades.filter(t => t.pnl > 0).length,
      losses: longTrades.filter(t => t.pnl < 0).length,
      pnl: longTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    },
    {
      name: 'Short',
      wins: shortTrades.filter(t => t.pnl > 0).length,
      losses: shortTrades.filter(t => t.pnl < 0).length,
      pnl: shortTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Import Analysis: {importRecord.filename}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {trades.length} trades • {importRecord.platform || 'Unknown Platform'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <div className="text-sm text-slate-600 mb-1">Total Trades</div>
              <div className="text-3xl font-bold text-slate-900">{trades.length}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-slate-600 mb-1">Win Rate</div>
              <div className="text-3xl font-bold text-blue-900">{winRate.toFixed(1)}%</div>
            </div>
            <div className={`p-4 rounded-lg text-center ${totalPnL >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-slate-600 mb-1">Total P&L</div>
              <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-sm text-slate-600 mb-1">Avg Trade</div>
              <div className="text-3xl font-bold text-purple-900">
                ${(totalPnL / trades.length || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Win/Loss Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Win/Loss Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Long vs Short */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Long vs Short Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sideData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="wins" fill="#10b981" name="Wins" />
                    <Bar dataKey="losses" fill="#ef4444" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* P&L by Symbol */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                P&L by Symbol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={symbolChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="symbol" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'pnl' ? `$${value.toFixed(2)}` : value,
                      name === 'pnl' ? 'P&L' : 'Trades'
                    ]}
                  />
                  <Bar dataKey="pnl" fill="#3b82f6" name="P&L">
                    {symbolChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily P&L Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Daily P&L Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Top 5 Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {winningTrades.sort((a, b) => b.pnl - a.pnl).slice(0, 5).map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div className="text-sm">
                        <span className="font-medium">{t.symbol}</span>
                        <span className="text-slate-600 ml-2">{t.side}</span>
                      </div>
                      <span className="font-bold text-green-600">+${t.pnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Top 5 Losers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {losingTrades.sort((a, b) => a.pnl - b.pnl).slice(0, 5).map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div className="text-sm">
                        <span className="font-medium">{t.symbol}</span>
                        <span className="text-slate-600 ml-2">{t.side}</span>
                      </div>
                      <span className="font-bold text-red-600">${t.pnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
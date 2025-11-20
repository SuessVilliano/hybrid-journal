import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PublicDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const { data: shareSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['publicShare', token],
    queryFn: async () => {
      const settings = await base44.entities.ShareSettings.filter({ share_token: token });
      return settings[0];
    },
    enabled: !!token
  });

  const { data: trades = [], isLoading: loadingTrades } = useQuery({
    queryKey: ['publicTrades', shareSettings?.created_by],
    queryFn: async () => {
      if (!shareSettings?.created_by) return [];
      return await base44.entities.Trade.filter({ created_by: shareSettings.created_by }, '-entry_date', 1000);
    },
    enabled: !!shareSettings?.created_by && shareSettings?.is_public
  });

  const stats = useMemo(() => {
    if (!trades.length) return null;
    
    const winning = trades.filter(t => t.pnl > 0);
    const losing = trades.filter(t => t.pnl < 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = (winning.length / trades.length) * 100;
    const avgWin = winning.length > 0 ? winning.reduce((sum, t) => sum + t.pnl, 0) / winning.length : 0;
    const avgLoss = losing.length > 0 ? Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0) / losing.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winning.length) / (avgLoss * losing.length) : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      totalPnl,
      winRate,
      profitFactor,
      avgWin,
      avgLoss
    };
  }, [trades]);

  const chartData = useMemo(() => {
    if (!trades.length) return null;

    let cumulative = 0;
    const equityCurve = trades
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
      .map((t, idx) => {
        cumulative += t.pnl || 0;
        return {
          trade: idx + 1,
          equity: cumulative,
          date: new Date(t.entry_date).toLocaleDateString()
        };
      });

    const winLossData = [
      { name: 'Wins', value: stats.winningTrades, fill: '#10b981' },
      { name: 'Losses', value: stats.losingTrades, fill: '#ef4444' }
    ];

    return { equityCurve, winLossData };
  }, [trades, stats]);

  if (loadingSettings || loadingTrades) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Share Token</h2>
            <p className="text-slate-600">Please provide a valid share token in the URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareSettings || !shareSettings.is_public) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Not Found</h2>
            <p className="text-slate-600">This dashboard is private or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hideDollars = shareSettings.hide_dollar_amounts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
            {shareSettings.custom_title || 'Trading Performance'}
          </h1>
          <p className="text-cyan-700/70 mt-2">
            Public Dashboard • Last Updated: {new Date(shareSettings.last_updated || shareSettings.created_date).toLocaleDateString()}
          </p>
        </div>

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Total P&L
                </CardTitle>
                <DollarSign className="h-4 w-4 text-white/90" />
              </CardHeader>
              <CardContent>
                {hideDollars ? (
                  <div className="text-3xl font-bold">
                    {stats.totalPnl >= 0 ? '+' : ''}{((stats.totalPnl / 10000) * 100).toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-3xl font-bold">
                    ${stats.totalPnl.toFixed(2)}
                  </div>
                )}
                <p className="text-xs mt-1 text-white/80">
                  {stats.totalTrades} total trades
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-xl border-cyan-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-cyan-700">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.winRate.toFixed(1)}%</div>
                <p className="text-xs text-cyan-700/70 mt-1">
                  {stats.winningTrades}W / {stats.losingTrades}L
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-xl border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Profit Factor</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.profitFactor.toFixed(2)}</div>
                <p className="text-xs text-purple-700/70 mt-1">Risk-adjusted performance</p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-xl border-green-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Avg Win/Loss</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {hideDollars ? (
                  <div className="text-lg font-bold text-slate-900">
                    {(stats.avgWin / Math.max(stats.avgLoss, 1)).toFixed(2)}:1
                  </div>
                ) : (
                  <div className="text-lg font-bold">
                    <span className="text-green-600">${stats.avgWin.toFixed(0)}</span>
                    {' / '}
                    <span className="text-red-600">${stats.avgLoss.toFixed(0)}</span>
                  </div>
                )}
                <p className="text-xs text-green-700/70 mt-1">Win to loss ratio</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white/80 backdrop-blur-xl border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-700">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="trade" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} hide={hideDollars} />
                    <Tooltip 
                      formatter={(val) => hideDollars ? [`${val.toFixed(1)}%`, 'Return'] : [`$${val.toFixed(2)}`, 'Equity']}
                    />
                    <Line type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-xl border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-700">Win/Loss Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ value, name }) => `${name}: ${value}`}
                    >
                      {chartData.winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trade History */}
        {shareSettings.show_individual_trades && trades.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-xl border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-700">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-cyan-500/30">
                    <tr className="text-left">
                      <th className="pb-2 font-medium text-cyan-700">Date</th>
                      <th className="pb-2 font-medium text-cyan-700">Symbol</th>
                      <th className="pb-2 font-medium text-cyan-700">Side</th>
                      <th className="pb-2 font-medium text-cyan-700">P&L</th>
                      <th className="pb-2 font-medium text-cyan-700">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 20).map((trade, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2 text-slate-700">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 font-medium text-slate-900">{trade.symbol}</td>
                        <td className="py-2">
                          <span className={trade.side === 'Long' ? 'text-green-600' : 'text-red-600'}>
                            {trade.side}
                          </span>
                        </td>
                        <td className={`py-2 font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {hideDollars ? (
                            `${trade.pnl >= 0 ? '+' : ''}${((trade.pnl / 100) * 100).toFixed(1)}%`
                          ) : (
                            `${trade.pnl >= 0 ? '+' : ''}$${Math.abs(trade.pnl).toFixed(2)}`
                          )}
                        </td>
                        <td className="py-2 text-slate-600">{trade.platform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-cyan-700/70 py-6">
          Powered by Hybrid Journal • Real-time Trading Journal
        </div>
      </div>
    </div>
  );
}
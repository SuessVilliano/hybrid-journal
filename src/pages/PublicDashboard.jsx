import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PublicDashboard() {
  const token = (() => {
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      return params.get('token');
    }
    return new URLSearchParams(window.location.search).get('token');
  })();

  const { data: shareSettings, isLoading: loadingSettings, error: settingsError } = useQuery({
    queryKey: ['publicShare', token],
    queryFn: async () => {
      const settings = await base44.asServiceRole.entities.ShareSettings.filter({ share_token: token });
      return settings[0] || null;
    },
    enabled: !!token,
    retry: 1
  });

  const { data: trades = [], isLoading: loadingTrades } = useQuery({
    queryKey: ['publicTrades', shareSettings?.created_by],
    queryFn: async () => {
      if (!shareSettings?.created_by) return [];
      return await base44.asServiceRole.entities.Trade.filter({ created_by: shareSettings.created_by }, '-entry_date', 1000);
    },
    enabled: !!shareSettings?.created_by && shareSettings?.is_public,
    retry: 1
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-950/90 border-cyan-500/30">
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Share Token</h2>
            <p className="text-slate-400">Please provide a valid share token in the URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareSettings || !shareSettings.is_public) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-950/90 border-cyan-500/30">
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Dashboard Not Found</h2>
            <p className="text-slate-400">This dashboard is private or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hideDollars = shareSettings.hide_dollar_amounts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
            {shareSettings.custom_title || 'Trading Performance'}
          </h1>
          <p className="text-cyan-400 mt-2">
            Public Dashboard • Last Updated: {new Date(shareSettings.last_updated || shareSettings.created_date).toLocaleDateString()}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-900/30 border border-cyan-500/30 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-cyan-300">Live Performance Tracking</span>
          </div>
        </div>

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-white">
                  Total P&L
                </CardTitle>
                <DollarSign className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                {hideDollars ? (
                  <div className="text-3xl md:text-4xl font-bold">
                    {stats.totalPnl >= 0 ? '+' : ''}{((stats.totalPnl / 10000) * 100).toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-3xl md:text-4xl font-bold">
                    ${stats.totalPnl.toFixed(2)}
                  </div>
                )}
                <p className="text-sm mt-1 text-white/90">
                  {stats.totalTrades} total trades
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/90 backdrop-blur-xl border-cyan-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-cyan-400">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
                <p className="text-sm text-cyan-300 mt-1">
                  {stats.winningTrades}W / {stats.losingTrades}L
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/90 backdrop-blur-xl border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-400">Profit Factor</CardTitle>
                <Activity className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold text-white">{stats.profitFactor.toFixed(2)}</div>
                <p className="text-sm text-purple-300 mt-1">Risk-adjusted performance</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/90 backdrop-blur-xl border-green-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Avg Win/Loss</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                {hideDollars ? (
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {(stats.avgWin / Math.max(stats.avgLoss, 1)).toFixed(2)}:1
                  </div>
                ) : (
                  <div className="text-lg md:text-xl font-bold">
                    <span className="text-green-400">${stats.avgWin.toFixed(0)}</span>
                    {' / '}
                    <span className="text-red-400">${stats.avgLoss.toFixed(0)}</span>
                  </div>
                )}
                <p className="text-sm text-green-300 mt-1">Win to loss ratio</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-950/90 backdrop-blur-xl border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-400">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="trade" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} hide={hideDollars} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#cbd5e1' }}
                      itemStyle={{ color: '#06b6d4' }}
                      formatter={(val) => hideDollars ? [`${val.toFixed(1)}%`, 'Return'] : [`$${val.toFixed(2)}`, 'Equity']}
                    />
                    <Line type="monotone" dataKey="equity" stroke="#06b6d4" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/90 backdrop-blur-xl border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400">Win/Loss Distribution</CardTitle>
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
                      labelStyle={{ fill: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                    >
                      {chartData.winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-950/90 backdrop-blur-xl border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 text-lg">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">{stats.totalTrades}</div>
              <div className="text-sm text-slate-400">Consistent trading activity</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/90 backdrop-blur-xl border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 text-lg">Best Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-400 mb-2">
                {hideDollars ? '+' + Math.max(...trades.map(t => t.pnl)).toFixed(1) + '%' : '+$' + Math.max(...trades.map(t => t.pnl)).toFixed(2)}
              </div>
              <div className="text-sm text-slate-400">Largest winning trade</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/90 backdrop-blur-xl border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400 text-lg">Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">
                {((stats.winningTrades / Math.max(stats.totalTrades / 10, 1)) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-slate-400">Win rate stability</div>
            </CardContent>
          </Card>
        </div>

        {/* Trade History */}
        {shareSettings.show_individual_trades && trades.length > 0 && (
          <Card className="bg-slate-950/90 backdrop-blur-xl border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-cyan-500/30">
                    <tr className="text-left">
                      <th className="pb-3 font-medium text-cyan-300">Date</th>
                      <th className="pb-3 font-medium text-cyan-300">Symbol</th>
                      <th className="pb-3 font-medium text-cyan-300">Side</th>
                      <th className="pb-3 font-medium text-cyan-300">P&L</th>
                      <th className="pb-3 font-medium text-cyan-300">Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 20).map((trade, idx) => (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="py-3 text-slate-300">
                          {new Date(trade.entry_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 font-medium text-white">{trade.symbol}</td>
                        <td className="py-3">
                          <span className={trade.side === 'Long' ? 'text-green-400' : 'text-red-400'}>
                            {trade.side}
                          </span>
                        </td>
                        <td className={`py-3 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {hideDollars ? (
                            `${trade.pnl >= 0 ? '+' : ''}${((trade.pnl / 100) * 100).toFixed(1)}%`
                          ) : (
                            `${trade.pnl >= 0 ? '+' : ''}$${Math.abs(trade.pnl).toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3 text-slate-400">{trade.platform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-cyan-400/70 py-8 border-t border-cyan-500/20">
          <div className="mb-2">
            <span className="font-bold text-cyan-400">Powered by Hybrid Journal</span>
          </div>
          <div className="text-slate-400">Professional Trading Journal & Performance Analytics</div>
        </div>
      </div>
    </div>
  );
}
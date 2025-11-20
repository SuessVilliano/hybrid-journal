import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Calendar, Share2 } from 'lucide-react';
import EquityCurve from '@/components/trading/EquityCurve';
import TradeCalendar from '@/components/trading/TradeCalendar';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';
import RecentTrades from '@/components/trading/RecentTrades';
import ExportMenu from '@/components/sharing/ExportMenu';
import ShareModal from '@/components/sharing/ShareModal';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  
  const { data: allTrades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const trades = selectedAccounts.length > 0
    ? allTrades.filter(t => selectedAccounts.includes(t.account_id))
    : allTrades;

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.TradingSession.list('-date', 50)
  });

  const stats = useMemo(() => {
    if (!trades.length) return null;
    
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
    
    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnl,
      winRate,
      avgWin,
      avgLoss,
      profitFactor
    };
  }, [trades]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Trading Dashboard
            </h1>
            <p className="text-cyan-400/70 mt-1">Track your performance and grow consistently</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats && <ExportMenu trades={trades} stats={stats} />}
            <Button onClick={() => setShowShareModal(true)} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Account Filter */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedAccounts([])}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedAccounts.length === 0
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/50 text-slate-400 hover:text-white border border-cyan-500/20'
              }`}
            >
              All Accounts
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => {
                  setSelectedAccounts(prev => 
                    prev.includes(acc.id) 
                      ? prev.filter(id => id !== acc.id)
                      : [...prev, acc.id]
                  );
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedAccounts.includes(acc.id)
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/50 text-slate-400 hover:text-white border border-cyan-500/20'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>
        )}

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                <DollarSign className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold">${stats.totalPnl.toFixed(2)}</div>
                <p className="text-xs mt-1 opacity-80">
                  {stats.totalTrades} total trades
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-cyan-400">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
                <p className="text-xs text-cyan-400/70 mt-1">
                  {stats.winningTrades}W / {stats.losingTrades}L
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 backdrop-blur-xl border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-400">Avg Win</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-green-400">${stats.avgWin.toFixed(2)}</div>
                <p className="text-xs text-green-400/70 mt-1">Per winning trade</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 backdrop-blur-xl border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-400">Profit Factor</CardTitle>
                <Activity className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-white">{stats.profitFactor.toFixed(2)}</div>
                <p className="text-xs text-purple-400/70 mt-1">Risk-adjusted</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-950/80 border border-cyan-500/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-cyan-400">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-cyan-400">Analytics</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-cyan-400">Calendar</TabsTrigger>
            <TabsTrigger value="psychology" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-cyan-400">Psychology</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className="lg:col-span-2 bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquityCurve trades={trades} />
                </CardContent>
              </Card>

              <Card className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentTrades trades={trades.slice(0, 5)} />
                </CardContent>
              </Card>
            </div>

            <PerformanceMetrics trades={trades} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PerformanceMetrics trades={trades} detailed />
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <Calendar className="h-5 w-5" />
                  Trading Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TradeCalendar trades={trades} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="psychology">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Emotional Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-cyan-400/70">Track your emotional state and identify patterns affecting your trading.</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-950/80 backdrop-blur-xl border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Behavioral Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-cyan-400/70">AI-powered insights into your trading behavior and decision-making.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Share Modal */}
        {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      </div>
    </div>
  );
}
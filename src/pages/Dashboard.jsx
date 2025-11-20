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
  
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Trading Dashboard</h1>
            <p className="text-slate-600 mt-1">Track your performance and grow consistently</p>
          </div>
          <div className="flex gap-3">
            {stats && <ExportMenu trades={trades} stats={stats} />}
            <Button onClick={() => setShowShareModal(true)} variant="outline" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition">
                7D
              </button>
              <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition">
                30D
              </button>
              <button className="px-4 py-2 text-sm font-medium bg-white text-slate-900 rounded-lg shadow-sm">
                All
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total P&L</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${stats.totalPnl.toFixed(2)}</div>
                <p className="text-xs text-blue-100 mt-1">
                  {stats.totalTrades} total trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.winRate.toFixed(1)}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.winningTrades}W / {stats.losingTrades}L
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Avg Win</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${stats.avgWin.toFixed(2)}</div>
                <p className="text-xs text-slate-500 mt-1">Per winning trade</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Profit Factor</CardTitle>
                <Activity className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.profitFactor.toFixed(2)}</div>
                <p className="text-xs text-slate-500 mt-1">Risk-adjusted performance</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="psychology">Psychology</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquityCurve trades={trades} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emotional Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">Track your emotional state and identify patterns affecting your trading.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Behavioral Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">AI-powered insights into your trading behavior and decision-making.</p>
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
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Calendar, Share2, Brain } from 'lucide-react';
import EquityCurve from '@/components/trading/EquityCurve';
import TradeCalendar from '@/components/trading/TradeCalendar';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';
import RecentTrades from '@/components/trading/RecentTrades';
import ExportMenu from '@/components/sharing/ExportMenu';
import ShareModal from '@/components/sharing/ShareModal';
import AITradeAnalysis from '@/components/analytics/AITradeAnalysis';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
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

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Trading Dashboard
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>Track your performance and grow consistently</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {stats && trades.length > 0 && (
              <Button 
                onClick={() => setShowAIAnalysis(true)} 
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Analysis
              </Button>
            )}
            {stats && <ExportMenu trades={trades} stats={stats} />}
            <Button onClick={() => setShowShareModal(true)} variant="outline" className={`border-cyan-500/30 ${darkMode ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-cyan-700 hover:bg-cyan-100'}`}>
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
                  : darkMode 
                    ? 'bg-slate-900/50 text-slate-400 hover:text-white border border-cyan-500/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-cyan-300/50'
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
                    : darkMode 
                      ? 'bg-slate-900/50 text-slate-400 hover:text-white border border-cyan-500/20'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-cyan-300/50'
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

            <Card className={darkMode ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20' : 'bg-white/80 backdrop-blur-xl border-cyan-500/30'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Win Rate</CardTitle>
                <Target className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.winRate.toFixed(1)}%</div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
                  {stats.winningTrades}W / {stats.losingTrades}L
                </p>
              </CardContent>
            </Card>

            <Card className={darkMode ? 'bg-slate-950/80 backdrop-blur-xl border-green-500/20' : 'bg-white/80 backdrop-blur-xl border-green-500/30'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Avg Win</CardTitle>
                <TrendingUp className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>${stats.avgWin.toFixed(2)}</div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-green-400/70' : 'text-green-700/70'}`}>Per winning trade</p>
              </CardContent>
            </Card>

            <Card className={darkMode ? 'bg-slate-950/80 backdrop-blur-xl border-purple-500/20' : 'bg-white/80 backdrop-blur-xl border-purple-500/30'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-medium ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>Profit Factor</CardTitle>
                <Activity className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.profitFactor.toFixed(2)}</div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-purple-400/70' : 'text-purple-700/70'}`}>Risk-adjusted</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={darkMode ? 'bg-slate-950/80 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'}>
            <TabsTrigger value="overview" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Overview</TabsTrigger>
            <TabsTrigger value="analytics" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Analytics</TabsTrigger>
            <TabsTrigger value="calendar" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Calendar</TabsTrigger>
            <TabsTrigger value="psychology" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Psychology</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <Card className={`lg:col-span-2 backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquityCurve trades={trades} />
                </CardContent>
              </Card>

              <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Recent Trades</CardTitle>
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
            <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
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
              <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Emotional Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}>Track your emotional state and identify patterns affecting your trading.</p>
                </CardContent>
              </Card>

              <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Behavioral Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}>AI-powered insights into your trading behavior and decision-making.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Share Modal */}
        {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}

        {/* AI Analysis Modal */}
        {showAIAnalysis && <AITradeAnalysis trades={trades} onClose={() => setShowAIAnalysis(false)} />}
      </div>
    </div>
  );
}
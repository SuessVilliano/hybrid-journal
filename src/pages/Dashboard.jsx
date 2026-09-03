import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DeepAnalysisPanel from '@/components/ai/DeepAnalysisPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Calendar, Share2, Brain, Settings, Upload, BookOpen, ShieldCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import EquityCurve from '@/components/trading/EquityCurve';
import TradeCalendar from '@/components/trading/TradeCalendar';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';
import RecentTrades from '@/components/trading/RecentTrades';
import ExportMenu from '@/components/sharing/ExportMenu';
import ShareModal from '@/components/sharing/ShareModal';
import AITradeAnalysis from '@/components/analytics/AITradeAnalysis';
import WidgetSelector from '@/components/dashboard/WidgetSelector';
import EmotionalPatternsWidget from '@/components/dashboard/EmotionalPatternsWidget';
import StrategyPerformanceWidget from '@/components/dashboard/StrategyPerformanceWidget';
import InstrumentAnalysisWidget from '@/components/dashboard/InstrumentAnalysisWidget';
import CompoundCalculatorWidget from '@/components/dashboard/CompoundCalculatorWidget';
import HybridScoreWidget from '@/components/dashboard/HybridScoreWidget';
import FundingReadinessWidget from '@/components/dashboard/FundingReadinessWidget';
import TodaysPlanWidget from '@/components/planning/TodaysPlanWidget';
import GlobalAccountSelector from '@/components/accounts/GlobalAccountSelector';
import TemplatePicker from '@/components/dashboard/TemplatePicker';
import { calculateTradeStats, formatMetric } from '@/lib/tradingAnalytics';
import { filterTradesByTrust, summarizeTradeProvenance } from '@/lib/tradeProvenance';
import { buildPersonalizedWelcome, deriveDashboardPersonalization } from '@/lib/dashboardPersonalization';

const DEFAULT_WIDGETS = [
  'pnl', 'winRate', 'profitFactor', 'avgWin', 'hybridScore',
  'equityCurve', 'recentTrades', 'performance'
];

const TRUST_MODES = [
  { id: 'executions', label: 'Executions', description: 'Real execution records, excluding simulations and strategy signals.' },
  { id: 'verified', label: 'Verified', description: 'Only broker/API-linked executions.' },
  { id: 'all', label: 'All Data', description: 'Everything, including manual records, simulations and signals.' },
];

export default function Dashboard() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [enabledWidgets, setEnabledWidgets] = useState(DEFAULT_WIDGETS);
  const [trustMode, setTrustMode] = useState('executions');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: traderProfile } = useQuery({
    queryKey: ['traderProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.TraderProfile.list();
      return profiles.find(p => p.created_by === user?.email) || profiles[0] || null;
    },
    enabled: !!user
  });

  const { data: allTrades = [], isLoading } = useQuery({
    queryKey: ['trades', user?.email],
    queryFn: () => base44.entities.Trade.filter({ created_by: user.email }, '-entry_date', 1000),
    enabled: !!user
  });

  const { data: dashboardSettings } = useQuery({
    queryKey: ['dashboardSettings', user?.email],
    queryFn: async () => {
      const settings = await base44.entities.DashboardSettings.list();
      return settings.find(s => s.created_by === user.email) || null;
    },
    enabled: !!user
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.DashboardSettings.list();
      const userSettings = existing.find(s => s.created_by === user.email);
      return userSettings
        ? base44.entities.DashboardSettings.update(userSettings.id, data)
        : base44.entities.DashboardSettings.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboardSettings', user?.email] })
  });

  useEffect(() => {
    if (!traderProfile) return;

    const personalized = deriveDashboardPersonalization(traderProfile);
    const hasSavedPersonalization = dashboardSettings?.personalization_version;

    setEnabledWidgets(
      dashboardSettings?.widgets?.length
        ? dashboardSettings.widgets
        : personalized.widgets || DEFAULT_WIDGETS
    );
    setTrustMode(dashboardSettings?.analytics_trust_filter || personalized.analytics_trust_filter || 'executions');

    if (!dashboardSettings && user) {
      saveSettingsMutation.mutate(personalized);
    } else if (dashboardSettings && !hasSavedPersonalization) {
      saveSettingsMutation.mutate({ ...personalized, ...dashboardSettings });
    }
  }, [traderProfile, dashboardSettings, user]);

  const accountTrades = useMemo(() => (
    selectedAccounts.length > 0
      ? allTrades.filter(t => selectedAccounts.includes(t.account_id))
      : allTrades
  ), [allTrades, selectedAccounts]);

  const trades = useMemo(
    () => filterTradesByTrust(accountTrades, trustMode),
    [accountTrades, trustMode]
  );

  const stats = useMemo(() => calculateTradeStats(trades), [trades]);
  const provenance = useMemo(() => summarizeTradeProvenance(accountTrades), [accountTrades]);
  const welcome = useMemo(() => buildPersonalizedWelcome(traderProfile || {}), [traderProfile]);

  const handleToggleWidget = (widgetId) => {
    const newWidgets = enabledWidgets.includes(widgetId)
      ? enabledWidgets.filter(w => w !== widgetId)
      : [...enabledWidgets, widgetId];
    setEnabledWidgets(newWidgets);
    saveSettingsMutation.mutate({ widgets: newWidgets });
  };

  const handleTrustMode = (mode) => {
    setTrustMode(mode);
    saveSettingsMutation.mutate({ analytics_trust_filter: mode });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const darkMode = document.documentElement.classList.contains('dark');
  const cardClass = darkMode
    ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20'
    : 'bg-white/80 backdrop-blur-xl border-cyan-500/30';

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              {welcome.title}
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
              {welcome.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <TemplatePicker />
            <Link to={createPageUrl('Journal')}>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                <BookOpen className="h-4 w-4 mr-2" /> Journal
              </Button>
            </Link>
            <Button onClick={() => setShowWidgetSelector(true)} variant="outline" className="border-cyan-500/30">
              <Settings className="h-4 w-4 mr-2" /> Customize
            </Button>
            {stats && trades.length > 0 && (
              <Button onClick={() => setShowAIAnalysis(true)} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                <Brain className="h-4 w-4 mr-2" /> AI Analysis
              </Button>
            )}
            {stats && <ExportMenu trades={trades} stats={stats} />}
            <Link to={createPageUrl('Imports')}>
              <Button variant="outline" className="border-cyan-500/30">
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
            </Link>
            <Button onClick={() => setShowShareModal(true)} variant="outline" className="border-cyan-500/30">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
        </div>

        <Card className={cardClass}>
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analytics Trust Layer</span>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                    {provenance.verifiedExecutions} verified
                  </Badge>
                </div>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Choose which evidence Hybrid uses for scores, AI insights and performance analytics.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {TRUST_MODES.map(mode => (
                  <Button
                    key={mode.id}
                    size="sm"
                    variant={trustMode === mode.id ? 'default' : 'outline'}
                    title={mode.description}
                    onClick={() => handleTrustMode(mode.id)}
                    className={trustMode === mode.id ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'border-cyan-500/30'}
                  >
                    {mode.id === 'verified' && <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className={`mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <TrustMetric label="Verified Executions" value={provenance.verifiedExecutions} darkMode={darkMode} />
              <TrustMetric label="Manual Entries" value={provenance.manualEntries} darkMode={darkMode} />
              <TrustMetric label="Signals / Sim" value={provenance.signals + provenance.simulated} darkMode={darkMode} />
              <TrustMetric label="Data Confidence" value={`${provenance.dataConfidence.toFixed(0)}%`} darkMode={darkMode} />
            </div>
          </CardContent>
        </Card>

        <GlobalAccountSelector onAccountsChange={setSelectedAccounts} />

        {(dashboardSettings?.show_funding_readiness || enabledWidgets.includes('fundingReadiness') || traderProfile?.prop_firm_trader) && (
          <FundingReadinessWidget trades={accountTrades} traderProfile={traderProfile} />
        )}

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {enabledWidgets.includes('pnl') && (
              <MetricCard title="Net P&L" value={`$${stats.netPnl.toFixed(2)}`} detail={`${stats.totalTrades} analyzed trades`} icon={DollarSign} darkMode={darkMode} featured />
            )}
            {enabledWidgets.includes('winRate') && (
              <MetricCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} detail={`${stats.winningTrades}W / ${stats.losingTrades}L / ${stats.breakevenTrades}BE`} icon={Target} darkMode={darkMode} />
            )}
            {enabledWidgets.includes('avgWin') && (
              <MetricCard title="Avg Win" value={`$${stats.avgWin.toFixed(2)}`} detail={`Expectancy $${stats.expectancy.toFixed(2)}`} icon={TrendingUp} darkMode={darkMode} />
            )}
            {enabledWidgets.includes('profitFactor') && (
              <MetricCard title="Profit Factor" value={formatMetric(stats.profitFactor)} detail={`Payoff ${formatMetric(stats.payoffRatio)}x`} icon={Activity} darkMode={darkMode} />
            )}
            {enabledWidgets.includes('avgLoss') && stats.avgLoss > 0 && (
              <MetricCard title="Avg Loss" value={`$${stats.avgLoss.toFixed(2)}`} detail={`Max DD $${stats.maxDrawdown.toFixed(2)}`} icon={TrendingDown} darkMode={darkMode} />
            )}
          </div>
        )}

        {!stats && (
          <Card className={cardClass}>
            <CardContent className="py-10 text-center">
              <Database className="mx-auto h-9 w-9 text-cyan-400" />
              <h3 className={`mt-3 text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>No trades match this trust filter yet</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Import or connect an account, or switch the Analytics Trust Layer to All Data.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={darkMode ? 'bg-slate-950/80 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="psychology">Psychology</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DeepAnalysisPanel />
            <TodaysPlanWidget />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {enabledWidgets.includes('equityCurve') && (
                <Card className={`lg:col-span-2 ${cardClass}`}>
                  <CardHeader><CardTitle>Equity Curve</CardTitle></CardHeader>
                  <CardContent><EquityCurve trades={trades} /></CardContent>
                </Card>
              )}
              {enabledWidgets.includes('recentTrades') && (
                <Card className={`${cardClass} ${!enabledWidgets.includes('equityCurve') ? 'lg:col-span-3' : ''}`}>
                  <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
                  <CardContent><RecentTrades trades={trades.slice(0, 5)} /></CardContent>
                </Card>
              )}
            </div>

            {enabledWidgets.includes('hybridScore') && <HybridScoreWidget trades={trades} />}
            {enabledWidgets.includes('compound') && <CompoundCalculatorWidget trades={trades} />}
            {enabledWidgets.includes('strategies') && <StrategyPerformanceWidget trades={trades} />}
            {enabledWidgets.includes('instruments') && <InstrumentAnalysisWidget trades={trades} />}
            {(enabledWidgets.includes('emotions') || enabledWidgets.includes('emotionalPatterns')) && <EmotionalPatternsWidget trades={trades} />}
            {enabledWidgets.includes('performance') && <PerformanceMetrics trades={trades} />}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <PerformanceMetrics trades={trades} detailed />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Trading Calendar</CardTitle>
              </CardHeader>
              <CardContent><TradeCalendar trades={trades} /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="psychology" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <EmotionalPatternsWidget trades={trades} />
              <StrategyPerformanceWidget trades={trades} />
            </div>
          </TabsContent>
        </Tabs>

        {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
        {showAIAnalysis && <AITradeAnalysis trades={trades} onClose={() => setShowAIAnalysis(false)} />}
        {showWidgetSelector && (
          <WidgetSelector
            enabledWidgets={enabledWidgets}
            onToggle={handleToggleWidget}
            onClose={() => setShowWidgetSelector(false)}
          />
        )}
      </div>
    </div>
  );
}

function TrustMetric({ label, value, darkMode }) {
  return (
    <div>
      <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{label}</div>
      <div className={`mt-1 text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon, darkMode, featured = false }) {
  const cls = featured
    ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white border-0 shadow-lg shadow-cyan-500/20'
    : darkMode
      ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20'
      : 'bg-white/80 backdrop-blur-xl border-cyan-500/30';

  return (
    <Card className={cls}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-bold">{value}</div>
        <p className={`text-xs mt-1 ${featured ? 'opacity-80' : darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{detail}</p>
      </CardContent>
    </Card>
  );
}

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ComprehensiveStats({ trades }) {
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
    }

    const winning = trades.filter(t => t.pnl > 0);
    const losing = trades.filter(t => t.pnl < 0);
    const breakeven = trades.filter(t => t.pnl === 0);

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const totalSwap = trades.reduce((sum, t) => sum + (t.swap || 0), 0);
    const totalFees = totalCommission + totalSwap;
    const grossPnl = totalPnl + Math.abs(totalFees);

    const totalProfit = winning.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0));
    const avgWin = winning.length > 0 ? totalProfit / winning.length : 0;
    const avgLoss = losing.length > 0 ? totalLoss / losing.length : 0;

    const largestWin = winning.length > 0 ? Math.max(...winning.map(t => t.pnl)) : 0;
    const largestLoss = losing.length > 0 ? Math.abs(Math.min(...losing.map(t => t.pnl))) : 0;

    const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Standard deviation
    const winStdDev = winning.length > 1 ? Math.sqrt(
      winning.reduce((sum, t) => sum + Math.pow(t.pnl - avgWin, 2), 0) / (winning.length - 1)
    ) : 0;
    const lossStdDev = losing.length > 1 ? Math.sqrt(
      losing.reduce((sum, t) => sum + Math.pow(Math.abs(t.pnl) - avgLoss, 2), 0) / (losing.length - 1)
    ) : 0;

    // Max drawdown & run-up
    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxRunup = 0;
    
    trades.forEach(t => {
      cumulative += t.pnl || 0;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = ((peak - cumulative) / Math.max(peak, 1)) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
      const runup = cumulative > 0 ? (cumulative / Math.max(Math.abs(peak), 1)) * 100 : 0;
      if (runup > maxRunup) {
        maxRunup = runup;
      }
    });

    // Consecutive wins/losses
    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(t => {
      if (t.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecWins = Math.max(maxConsecWins, currentWinStreak);
      } else if (t.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecLosses = Math.max(maxConsecLosses, currentLossStreak);
      }
    });

    // Trading days analysis
    const dayMap = {};
    trades.forEach(t => {
      const date = new Date(t.entry_date).toDateString();
      if (!dayMap[date]) {
        dayMap[date] = { pnl: 0, trades: [] };
      }
      dayMap[date].pnl += t.pnl || 0;
      dayMap[date].trades.push(t);
    });

    const days = Object.values(dayMap);
    const winningDays = days.filter(d => d.pnl > 0).length;
    const losingDays = days.filter(d => d.pnl < 0).length;
    const breakevenDays = days.filter(d => d.pnl === 0).length;

    const avgDailyPnl = days.length > 0 ? days.reduce((sum, d) => sum + d.pnl, 0) / days.length : 0;
    const avgWinningDayPnl = winningDays > 0 ? days.filter(d => d.pnl > 0).reduce((sum, d) => sum + d.pnl, 0) / winningDays : 0;
    const avgLosingDayPnl = losingDays > 0 ? Math.abs(days.filter(d => d.pnl < 0).reduce((sum, d) => sum + d.pnl, 0) / losingDays) : 0;

    const largestProfitableDay = days.length > 0 ? Math.max(...days.map(d => d.pnl)) : 0;
    const largestLosingDay = days.length > 0 ? Math.abs(Math.min(...days.map(d => d.pnl))) : 0;

    // Best/worst months
    const monthMap = {};
    trades.forEach(t => {
      const date = new Date(t.entry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      monthMap[monthKey] += t.pnl || 0;
    });

    const months = Object.entries(monthMap).map(([key, pnl]) => ({ month: key, pnl }));
    const bestMonth = months.length > 0 ? months.reduce((best, m) => m.pnl > best.pnl ? m : best) : null;
    const worstMonth = months.length > 0 ? months.reduce((worst, m) => m.pnl < worst.pnl ? m : worst) : null;

    // Average trade time
    const tradesWithTime = trades.filter(t => t.entry_date && t.exit_date);
    const avgTradeTime = tradesWithTime.length > 0 
      ? tradesWithTime.reduce((sum, t) => {
          const duration = new Date(t.exit_date) - new Date(t.entry_date);
          return sum + duration;
        }, 0) / tradesWithTime.length
      : 0;

    const avgTradeTimeStr = formatDuration(avgTradeTime);
    const avgWinningTradeTime = winning.filter(t => t.exit_date).length > 0
      ? formatDuration(winning.filter(t => t.exit_date).reduce((sum, t) => 
          sum + (new Date(t.exit_date) - new Date(t.entry_date)), 0
        ) / winning.filter(t => t.exit_date).length)
      : '0m';
    const avgLosingTradeTime = losing.filter(t => t.exit_date).length > 0
      ? formatDuration(losing.filter(t => t.exit_date).reduce((sum, t) => 
          sum + (new Date(t.exit_date) - new Date(t.entry_date)), 0
        ) / losing.filter(t => t.exit_date).length)
      : '0m';

    // Daily volume
    const avgDailyVolume = days.length > 0 
      ? trades.length / days.length 
      : 0;

    // Quantity stats
    const totalContracts = trades.reduce((sum, t) => sum + (t.quantity || 0), 0);

    // Trade expectancy
    const tradeExpectancy = trades.length > 0 
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
      : 0;

    // Max consecutive winning/losing days
    let maxConsecWinDays = 0;
    let maxConsecLossDays = 0;
    let currentWinDayStreak = 0;
    let currentLossDayStreak = 0;

    days.sort((a, b) => new Date(a.trades[0].entry_date) - new Date(b.trades[0].entry_date));
    days.forEach(d => {
      if (d.pnl > 0) {
        currentWinDayStreak++;
        currentLossDayStreak = 0;
        maxConsecWinDays = Math.max(maxConsecWinDays, currentWinDayStreak);
      } else if (d.pnl < 0) {
        currentLossDayStreak++;
        currentWinDayStreak = 0;
        maxConsecLossDays = Math.max(maxConsecLossDays, currentLossDayStreak);
      }
    });

    return {
      // Summary metrics
      totalPnl,
      grossPnl,
      totalFees,
      totalCommission,
      totalSwap,
      totalTrades: trades.length,
      totalContracts,
      winRate,
      profitFactor,
      avgTradeTime: avgTradeTimeStr,

      // P&L breakdown
      totalProfit,
      totalLoss,
      largestWin,
      largestLoss,
      avgWin,
      avgLoss,
      winStdDev,
      lossStdDev,
      maxDrawdown,
      maxRunup,
      tradeExpectancy,

      // Trade counts
      winningTrades: winning.length,
      losingTrades: losing.length,
      breakevenTrades: breakeven.length,
      maxConsecWins,
      maxConsecLosses,

      // Time-based
      avgWinningTradeTime,
      avgLosingTradeTime,

      // Day-based metrics
      totalTradingDays: days.length,
      winningDays,
      losingDays,
      breakevenDays,
      avgDailyPnl,
      avgWinningDayPnl,
      avgLosingDayPnl,
      largestProfitableDay,
      largestLosingDay,
      avgDailyVolume,
      maxConsecWinDays,
      maxConsecLossDays,

      // Monthly
      bestMonth,
      worstMonth,
      avgMonthlyPnl: months.length > 0 ? months.reduce((sum, m) => sum + m.pnl, 0) / months.length : 0,
    };
  }, [trades]);

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No trade data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (monthKey) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Best/Worst Month Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-600 mb-1">Best Month</div>
              <div className="text-2xl font-bold text-green-600">
                ${stats.bestMonth?.pnl.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">{formatDate(stats.bestMonth?.month)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Worst Month</div>
              <div className="text-2xl font-bold text-red-600">
                ${stats.worstMonth?.pnl.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">{formatDate(stats.worstMonth?.month)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Average</div>
              <div className="text-2xl font-bold text-slate-900">
                ${stats.avgMonthlyPnl.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">per Month</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Statistics Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Comprehensive Statistics</span>
            <Badge variant="outline" className="text-xs">
              {stats.totalTrades} Total Trades
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
            {/* Left Column */}
            <StatRow label="Total P&L" value={`$${stats.totalPnl.toFixed(2)}`} 
              valueClass={stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
            <StatRow label="Average Trade P&L" value={`$${(stats.totalPnl / stats.totalTrades).toFixed(2)}`} />
            
            <StatRow label="Average Daily Volume" value={stats.avgDailyVolume.toFixed(1)} />
            <StatRow label="Profit Factor" value={stats.profitFactor.toFixed(2)} 
              valueClass={stats.profitFactor >= 2 ? 'text-green-600' : stats.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'} />
            
            <StatRow label="Average Winning Trade" value={`$${stats.avgWin.toFixed(2)}`} valueClass="text-green-600" />
            <StatRow label="Open trades" value="0" />
            
            <StatRow label="Average Losing Trade" value={`-$${stats.avgLoss.toFixed(2)}`} valueClass="text-red-600" />
            <StatRow label="Total Trading Days" value={stats.totalTradingDays} />
            
            <StatRow label="Total Number of Trades" value={stats.totalTrades} />
            <StatRow label="Winning Days" value={stats.winningDays} />
            
            <StatRow label="Number of Winning Trades" value={stats.winningTrades} valueClass="text-green-600" />
            <StatRow label="Losing Days" value={stats.losingDays} />
            
            <StatRow label="Number of Losing Trades" value={stats.losingTrades} valueClass="text-red-600" />
            <StatRow label="Breakeven days" value={stats.breakevenDays} />
            
            <StatRow label="Number of Break Even Trades" value={stats.breakevenTrades} />
            <StatRow label="Logged Days" value={stats.totalTradingDays} />
            
            <StatRow label="Max Consecutive Wins" value={stats.maxConsecWins} />
            <StatRow label="Max Consecutive Winning Days" value={stats.maxConsecWinDays} />
            
            <StatRow label="Max Consecutive Losses" value={stats.maxConsecLosses} />
            <StatRow label="Max Consecutive Losing Days" value={stats.maxConsecLossDays} />
            
            <StatRow label="Total Commissions" value={`$${stats.totalCommission.toFixed(2)}`} />
            <StatRow label="Average Daily P&L" value={`$${stats.avgDailyPnl.toFixed(2)}`} 
              valueClass={stats.avgDailyPnl >= 0 ? 'text-green-600' : 'text-red-600'} />
            
            <StatRow label="Total Fees" value={`$${stats.totalFees.toFixed(2)}`} />
            <StatRow label="Average Winning Day P&L" value={`$${stats.avgWinningDayPnl.toFixed(2)}`} valueClass="text-green-600" />
            
            <StatRow label="Total Swap" value={`$${stats.totalSwap.toFixed(2)}`} />
            <StatRow label="Average Losing Day P&L" value={`-$${stats.avgLosingDayPnl.toFixed(2)}`} valueClass="text-red-600" />
            
            <StatRow label="Largest Profit" value={`$${stats.largestWin.toFixed(2)}`} valueClass="text-green-600" />
            <StatRow label="Largest Profitable Day (Profits)" value={`$${stats.largestProfitableDay.toFixed(2)}`} valueClass="text-green-600" />
            
            <StatRow label="Largest Loss" value={`-$${stats.largestLoss.toFixed(2)}`} valueClass="text-red-600" />
            <StatRow label="Largest Losing Day (Losses)" value={`-$${stats.largestLosingDay.toFixed(2)}`} valueClass="text-red-600" />
            
            <StatRow label="Average Hold Time (All Trades)" value={stats.avgTradeTime} />
            <StatRow label="Average Planned R-Multiple" value="0R" />
            
            <StatRow label="Average Hold Time (Winning Trades)" value={stats.avgWinningTradeTime} />
            <StatRow label="Average Realized R-Multiple" value={`${(stats.avgWin / Math.max(stats.avgLoss, 1)).toFixed(2)}R`} />
            
            <StatRow label="Average Hold Time (Losing Trades)" value={stats.avgLosingTradeTime} />
            <StatRow label="Trade Expectancy" value={`$${stats.tradeExpectancy.toFixed(2)}`} 
              valueClass={stats.tradeExpectancy >= 0 ? 'text-green-600' : 'text-red-600'} />
            
            <StatRow label="Gross P&L" value={`$${stats.grossPnl.toFixed(2)}`} />
            <StatRow label="Max Drawdown" value={`${stats.maxDrawdown.toFixed(2)}%`} valueClass="text-red-600" />
            
            <StatRow label="Total Contracts/Lots" value={stats.totalContracts.toFixed(2)} />
            <StatRow label="Max Run-up" value={`${stats.maxRunup.toFixed(2)}%`} valueClass="text-green-600" />
            
            <StatRow label="Win Std Deviation" value={`$${stats.winStdDev.toFixed(2)}`} />
            <StatRow label="Loss Std Deviation" value={`$${stats.lossStdDev.toFixed(2)}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatRow({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms || ms === 0) return '0m';
  
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
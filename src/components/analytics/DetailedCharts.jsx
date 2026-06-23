import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { useChartDarkMode, chartCard, chartTitle, axisProps, gridProps, GlassTooltip, GlowFilter, BRAND } from '@/components/charts/chartTheme';

export default function DetailedCharts({ trades }) {
  const darkMode = useChartDarkMode();

  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const winning = trades.filter(t => t.pnl > 0);
    const losing = trades.filter(t => t.pnl < 0);

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.commission || 0) + (t.swap || 0), 0);
    const grossPnl = totalPnl + Math.abs(totalFees);

    const pnlComparison = [
      { name: 'Gross P&L', value: grossPnl, fill: '#22d3ee' },
      { name: 'Total P&L', value: totalPnl, fill: totalPnl >= 0 ? '#10b981' : '#f43f5e' }
    ];

    const winLossData = [
      { name: 'Winning', value: winning.length, percentage: (winning.length / trades.length * 100).toFixed(1) },
      { name: 'Losing', value: losing.length, percentage: (losing.length / trades.length * 100).toFixed(1) }
    ];

    let cumulative = 0;
    const cumulativePnL = trades
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
      .map((t, idx) => {
        cumulative += t.pnl || 0;
        return { trade: idx + 1, pnl: cumulative, date: new Date(t.entry_date).toLocaleDateString() };
      });

    const totalProfit = winning.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0));

    const profitLossData = [
      { name: 'Total Profit', value: totalProfit, fill: '#10b981' },
      { name: 'Total Loss', value: totalLoss, fill: '#f43f5e' }
    ];

    const scatterData = trades.map((t, idx) => ({
      x: idx + 1, y: t.pnl || 0, symbol: t.symbol, date: new Date(t.entry_date).toLocaleDateString()
    }));

    const bins = [
      { range: '< -500', count: 0 }, { range: '-500 to -200', count: 0 },
      { range: '-200 to 0', count: 0 }, { range: '0 to 200', count: 0 },
      { range: '200 to 500', count: 0 }, { range: '> 500', count: 0 }
    ];
    trades.forEach(t => {
      const pnl = t.pnl || 0;
      if (pnl < -500) bins[0].count++;
      else if (pnl < -200) bins[1].count++;
      else if (pnl < 0) bins[2].count++;
      else if (pnl < 200) bins[3].count++;
      else if (pnl < 500) bins[4].count++;
      else bins[5].count++;
    });

    const dailyMap = {};
    trades.forEach(t => {
      const date = new Date(t.entry_date).toLocaleDateString();
      if (!dailyMap[date]) dailyMap[date] = { date, pnl: 0, trades: 0 };
      dailyMap[date].pnl += t.pnl || 0;
      dailyMap[date].trades++;
    });
    const dailyPnL = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    return { pnlComparison, winLossData, cumulativePnL, profitLossData, scatterData, bins, dailyPnL };
  }, [trades]);

  if (!chartData) {
    return (
      <Card className={chartCard(darkMode)}>
        <CardContent className="p-12 text-center">
          <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>No data available for charts</p>
        </CardContent>
      </Card>
    );
  }

  const money = (p) => `${p.value >= 0 ? '+' : ''}$${Number(p.value).toFixed(2)}`;
  const card = chartCard(darkMode);
  const title = chartTitle(darkMode);
  const ax = axisProps(darkMode);
  const gr = gridProps(darkMode);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gross vs Total P&L */}
      <Card className={card}>
        <CardHeader>
          <CardTitle className={`text-lg flex items-center gap-2 ${title}`}>
            <BarChart3 className="h-5 w-5" /> Gross P&L vs Total P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.pnlComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dcGross" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
                <linearGradient id="dcTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="name" {...ax} />
              <YAxis {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={money} />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800}>
                {chartData.pnlComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#dcGross)' : 'url(#dcTotal)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win/Loss Donut */}
      <Card className={card}>
        <CardHeader>
          <CardTitle className={`text-lg flex items-center gap-2 ${title}`}>
            <PieIcon className="h-5 w-5" /> Win/Loss Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <defs>
                <linearGradient id="dcWin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
                <linearGradient id="dcLoss" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
              </defs>
              <Pie data={chartData.winLossData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ percentage }) => `${percentage}%`} stroke={darkMode ? '#0f172a' : '#fff'} strokeWidth={2} isAnimationActive animationDuration={800}>
                <Cell fill="url(#dcWin)" />
                <Cell fill="url(#dcLoss)" />
              </Pie>
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={(p) => `${p.value} trades (${p.payload.percentage}%)`} showLabel={false} />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative P&L */}
      <Card className={`${card} lg:col-span-2`}>
        <CardHeader>
          <CardTitle className={`text-lg flex items-center gap-2 ${title}`}>
            <TrendingUp className="h-5 w-5" /> Cumulative P&L Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.cumulativePnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dcCumStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#a855f7" /></linearGradient>
                <linearGradient id="dcCumFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} /><stop offset="100%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="trade" {...ax} />
              <YAxis {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={money} titleFormatter={(p) => `Trade ${p[0].payload.trade} · ${p[0].payload.date}`} showLabel={false} />} cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
              <Area type="monotone" dataKey="pnl" name="Cumulative P&L" stroke="url(#dcCumStroke)" strokeWidth={3} fill="url(#dcCumFill)" dot={false} activeDot={{ r: 5, fill: '#22d3ee', stroke: darkMode ? '#0f172a' : '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit vs Loss */}
      <Card className={card}>
        <CardHeader><CardTitle className={`text-lg ${title}`}>Total Profit vs Total Loss</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.profitLossData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid {...gr} />
              <XAxis dataKey="name" {...ax} />
              <YAxis {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={money} />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800}>
                {chartData.profitLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#dcWin)' : 'url(#dcLoss)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* P&L Distribution Histogram */}
      <Card className={card}>
        <CardHeader><CardTitle className={`text-lg ${title}`}>P&L Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dcHist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="range" {...ax} style={{ fontSize: '10px' }} />
              <YAxis {...ax} width={36} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={(p) => `${p.value} trades`} />} cursor={{ fill: darkMode ? 'rgba(168,85,247,0.05)' : 'rgba(168,85,247,0.08)' }} />
              <Bar dataKey="count" fill="url(#dcHist)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scatter Plot */}
      <Card className={`${card} lg:col-span-2`}>
        <CardHeader><CardTitle className={`text-lg ${title}`}>Trade P&L Scatter Plot</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <GlowFilter id="dcScatterGlow" stdDeviation={3} />
              </defs>
              <CartesianGrid {...gr} />
              <XAxis type="number" dataKey="x" name="Trade" {...ax} />
              <YAxis type="number" dataKey="y" name="P&L" {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: darkMode ? '#334155' : '#cbd5e1' }} content={<GlassTooltip dark={darkMode} valueFormatter={(p) => `$${Number(p.value).toFixed(2)}`} titleFormatter={(p) => `${p[0].payload.symbol} · ${p[0].payload.date}`} showLabel={false} />} />
              <Scatter data={chartData.scatterData} style={{ filter: 'url(#dcScatterGlow)' }} isAnimationActive animationDuration={800}>
                {chartData.scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.y >= 0 ? '#22d3ee' : '#f43f5e'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily P&L */}
      <Card className={`${card} lg:col-span-2`}>
        <CardHeader><CardTitle className={`text-lg ${title}`}>Daily P&L Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.dailyPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dcDayUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
                <linearGradient id="dcDayDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="date" {...ax} style={{ fontSize: '10px' }} />
              <YAxis {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={money} />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="pnl" name="Daily P&L" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800}>
                {chartData.dailyPnL.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'url(#dcDayUp)' : 'url(#dcDayDown)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3 } from 'lucide-react';

export default function DetailedCharts({ trades }) {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const winning = trades.filter(t => t.pnl > 0);
    const losing = trades.filter(t => t.pnl < 0);

    // Gross vs Net P&L
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.commission || 0) + (t.swap || 0), 0);
    const grossPnl = totalPnl + Math.abs(totalFees);

    const pnlComparison = [
      { name: 'Gross P&L', value: grossPnl, fill: '#10b981' },
      { name: 'Total P&L', value: totalPnl, fill: totalPnl >= 0 ? '#059669' : '#ef4444' }
    ];

    // Win/Loss Distribution
    const winLossData = [
      { name: 'Winning', value: winning.length, percentage: (winning.length / trades.length * 100).toFixed(1) },
      { name: 'Losing', value: losing.length, percentage: (losing.length / trades.length * 100).toFixed(1) }
    ];

    // Cumulative P&L
    let cumulative = 0;
    const cumulativePnL = trades
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
      .map((t, idx) => {
        cumulative += t.pnl || 0;
        return {
          trade: idx + 1,
          pnl: cumulative,
          date: new Date(t.entry_date).toLocaleDateString()
        };
      });

    // Profit vs Loss comparison
    const totalProfit = winning.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losing.reduce((sum, t) => sum + t.pnl, 0));

    const profitLossData = [
      { name: 'Total Profit', value: totalProfit, fill: '#10b981' },
      { name: 'Total Loss', value: totalLoss, fill: '#ef4444' }
    ];

    // Trade size distribution (scatter)
    const scatterData = trades.map((t, idx) => ({
      x: idx + 1,
      y: t.pnl || 0,
      symbol: t.symbol,
      date: new Date(t.entry_date).toLocaleDateString()
    }));

    // P&L Distribution bins
    const bins = [
      { range: '< -500', count: 0 },
      { range: '-500 to -200', count: 0 },
      { range: '-200 to 0', count: 0 },
      { range: '0 to 200', count: 0 },
      { range: '200 to 500', count: 0 },
      { range: '> 500', count: 0 }
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

    // Daily P&L aggregation
    const dailyMap = {};
    trades.forEach(t => {
      const date = new Date(t.entry_date).toLocaleDateString();
      if (!dailyMap[date]) {
        dailyMap[date] = { date, pnl: 0, trades: 0 };
      }
      dailyMap[date].pnl += t.pnl || 0;
      dailyMap[date].trades++;
    });

    const dailyPnL = Object.values(dailyMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return {
      pnlComparison,
      winLossData,
      cumulativePnL,
      profitLossData,
      scatterData,
      bins,
      dailyPnL
    };
  }, [trades]);

  if (!chartData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No data available for charts</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gross vs Total P&L */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Gross P&L vs Total P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.pnlComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val.toFixed(0)}`} />
              <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
              <Bar dataKey="value">
                {chartData.pnlComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win/Loss Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-purple-600" />
            Win/Loss Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData.winLossData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ percentage }) => `${percentage}%`}
              >
                {chartData.winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name, props) => [`${val} trades (${props.payload.percentage}%)`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative P&L Line Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Cumulative P&L Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.cumulativePnL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="trade" stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val.toFixed(0)}`} />
              <Tooltip 
                formatter={(val) => [`$${val.toFixed(2)}`, 'Cumulative P&L']}
                labelFormatter={(label, payload) => payload[0] ? `Trade ${label} - ${payload[0].payload.date}` : `Trade ${label}`}
              />
              <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit vs Loss Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Profit vs Total Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.profitLossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val.toFixed(0)}`} />
              <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
              <Bar dataKey="value">
                {chartData.profitLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* P&L Distribution Histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">P&L Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.bins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip formatter={(val) => [`${val} trades`, 'Count']} />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trade P&L Scatter Plot */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Trade P&L Scatter Plot</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="x" stroke="#64748b" style={{ fontSize: '12px' }} label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }} />
              <YAxis dataKey="y" stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val.toFixed(0)}`} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(val, name, props) => [`$${val.toFixed(2)}`, `${props.payload.symbol} - ${props.payload.date}`]}
              />
              <Scatter data={chartData.scatterData} fill="#3b82f6">
                {chartData.scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.y >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily P&L */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Daily P&L Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.dailyPnL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val.toFixed(0)}`} />
              <Tooltip formatter={(val, name) => [`$${val.toFixed(2)}`, name === 'pnl' ? 'Daily P&L' : name]} />
              <Bar dataKey="pnl">
                {chartData.dailyPnL.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
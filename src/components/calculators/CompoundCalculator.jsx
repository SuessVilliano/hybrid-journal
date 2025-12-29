import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function CompoundCalculator() {
  const [settings, setSettings] = useState({
    initialBalance: 5000,
    percentageGain: 3,
    frequency: 'monthly',
    years: 10,
    months: 1,
    additionalContribution: 0,
    contributionFrequency: 'monthly'
  });

  const darkMode = document.documentElement.classList.contains('dark');

  const calculateCompound = useMemo(() => {
    const { initialBalance, percentageGain, frequency, years, months, additionalContribution, contributionFrequency } = settings;
    
    const totalMonths = (years * 12) + months;
    const ratePerPeriod = percentageGain / 100;
    const periodsPerYear = frequency === 'monthly' ? 12 : frequency === 'weekly' ? 52 : frequency === 'daily' ? 365 : 1;
    
    let balance = initialBalance;
    const monthlyData = [];
    const yearlyData = [];
    
    let yearBalance = initialBalance;
    let yearEarnings = 0;
    
    for (let month = 0; month <= totalMonths; month++) {
      if (month > 0) {
        const monthlyRate = frequency === 'monthly' ? ratePerPeriod : 
                           frequency === 'weekly' ? ratePerPeriod * 4 : 
                           frequency === 'daily' ? ratePerPeriod * 30 : 
                           ratePerPeriod / 12;
        
        const earnings = balance * monthlyRate;
        balance += earnings;
        yearEarnings += earnings;
        
        if (additionalContribution > 0 && contributionFrequency === 'monthly') {
          balance += additionalContribution;
        }
      }
      
      monthlyData.push({
        month,
        balance: parseFloat(balance.toFixed(2)),
        principal: initialBalance + (additionalContribution * month),
        earnings: parseFloat((balance - initialBalance - (additionalContribution * month)).toFixed(2))
      });
      
      if (month % 12 === 0 && month > 0) {
        yearlyData.push({
          year: month / 12,
          earnings: parseFloat(yearEarnings.toFixed(2)),
          accruedEarnings: parseFloat((balance - initialBalance - (additionalContribution * month)).toFixed(2)),
          balance: parseFloat(balance.toFixed(2))
        });
        yearEarnings = 0;
      }
    }
    
    const finalBalance = balance;
    const totalEarnings = finalBalance - initialBalance - (additionalContribution * totalMonths);
    const totalReturn = ((finalBalance / initialBalance) - 1) * 100;
    const doubleTime = Math.log(2) / Math.log(1 + (percentageGain / 100));
    
    return {
      finalBalance,
      totalEarnings,
      totalReturn,
      doubleTime,
      monthlyData,
      yearlyData
    };
  }, [settings]);

  return (
    <div className="space-y-6">
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <TrendingUp className="h-5 w-5" />
            Compound Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Start Balance</Label>
              <Input
                type="number"
                value={settings.initialBalance}
                onChange={(e) => setSettings({ ...settings, initialBalance: parseFloat(e.target.value) || 0 })}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Percentage Gain (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.percentageGain}
                onChange={(e) => setSettings({ ...settings, percentageGain: parseFloat(e.target.value) || 0 })}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Compounding Frequency</Label>
              <Select value={settings.frequency} onValueChange={(value) => setSettings({ ...settings, frequency: value })}>
                <SelectTrigger className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Years</Label>
              <Input
                type="number"
                value={settings.years}
                onChange={(e) => setSettings({ ...settings, years: parseInt(e.target.value) || 0 })}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Months</Label>
              <Input
                type="number"
                value={settings.months}
                onChange={(e) => setSettings({ ...settings, months: parseInt(e.target.value) || 0 })}
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Additional Contribution (optional)</Label>
              <Input
                type="number"
                value={settings.additionalContribution}
                onChange={(e) => setSettings({ ...settings, additionalContribution: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Card className={darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Future Value</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      ${calculateCompound.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className={`h-8 w-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className={darkMode ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Total Earnings</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      ${calculateCompound.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className={`h-8 w-8 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className={darkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>Investment Doubled After</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      {calculateCompound.doubleTime.toFixed(1)} {settings.frequency === 'monthly' ? 'months' : 'periods'}
                    </p>
                  </div>
                  <Calendar className={`h-8 w-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Chart/Table */}
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
              <TabsTrigger value="yearly">Yearly Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-4">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculateCompound.monthlyData}>
                    <defs>
                      <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="month" 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="principal" 
                      stackId="1"
                      stroke="#0ea5e9" 
                      fill="url(#colorPrincipal)" 
                      name="Principal"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stackId="1"
                      stroke="#f97316" 
                      fill="url(#colorEarnings)" 
                      name="Earnings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <div className="overflow-x-auto">
                <table className={`w-full ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead>
                    <tr className={darkMode ? 'bg-slate-900' : 'bg-slate-100'}>
                      <th className="p-3 text-left">Month</th>
                      <th className="p-3 text-right">Principal</th>
                      <th className="p-3 text-right">Earnings</th>
                      <th className="p-3 text-right bg-green-900/30">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateCompound.monthlyData.filter((_, i) => i % 3 === 0).map((row, idx) => (
                      <tr key={idx} className={darkMode ? 'border-b border-slate-800' : 'border-b border-slate-200'}>
                        <td className="p-3">{row.month}</td>
                        <td className="p-3 text-right">${row.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right">${row.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right font-bold text-green-500">
                          ${row.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4">
              <div className="overflow-x-auto">
                <table className={`w-full ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead>
                    <tr className={darkMode ? 'bg-slate-900' : 'bg-slate-100'}>
                      <th className="p-3 text-left">Year</th>
                      <th className="p-3 text-right bg-orange-900/30">Earnings</th>
                      <th className="p-3 text-right bg-cyan-900/30">Accrued Earnings</th>
                      <th className="p-3 text-right bg-green-900/30">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateCompound.yearlyData.map((row, idx) => (
                      <tr key={idx} className={darkMode ? 'border-b border-slate-800' : 'border-b border-slate-200'}>
                        <td className="p-3">{row.year}</td>
                        <td className="p-3 text-right font-bold text-orange-500">
                          ${row.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-bold text-cyan-500">
                          ${row.accruedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-bold text-green-500">
                          ${row.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
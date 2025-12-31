import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Snowflake } from 'lucide-react';

export default function DebtSnowballCalculator() {
  const [totalDebt, setTotalDebt] = useState(5000);
  const [monthlyPayment, setMonthlyPayment] = useState(100);
  const [result, setResult] = useState(null);
  const [chartData, setChartData] = useState([]);

  const calculateSnowball = () => {
    if (!totalDebt || !monthlyPayment || monthlyPayment <= 0) {
      alert('Please enter valid values');
      return;
    }

    let remaining = totalDebt;
    const months = [];
    let monthCount = 0;

    while (remaining > 0 && monthCount < 120) {
      remaining -= monthlyPayment;
      if (remaining < 0) remaining = 0;
      monthCount++;
      
      if (monthCount % 5 === 0 || remaining === 0) {
        months.push({
          month: `Month ${monthCount}`,
          debt: parseFloat(remaining.toFixed(2))
        });
      }
    }

    setResult(monthCount);
    setChartData(months);
  };

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Snowflake className="h-5 w-5" />
          Debt Snowball Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Total Debt
          </label>
          <Input
            type="number"
            value={totalDebt}
            onChange={(e) => setTotalDebt(parseFloat(e.target.value) || 0)}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Monthly Payment
          </label>
          <Input
            type="number"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(parseFloat(e.target.value) || 0)}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <Button
          onClick={calculateSnowball}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          Calculate Debt Snowball
        </Button>

        {result !== null && (
          <>
            <div className={`p-6 rounded-lg border text-center ${
              darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-sm mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Debt repaid in
              </div>
              <div className="text-4xl font-bold text-green-500">
                {result} months
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-green-400/70' : 'text-green-700/70'}`}>
                Stay consistent with your payments!
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis 
                      dataKey="month" 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke={darkMode ? '#94a3b8' : '#64748b'}
                      label={{ value: 'Debt', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                        border: `1px solid ${darkMode ? '#22c55e' : '#94a3b8'}`,
                        borderRadius: '8px',
                        color: darkMode ? '#ffffff' : '#0f172a'
                      }}
                    />
                    <Bar dataKey="debt" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
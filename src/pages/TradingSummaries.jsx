import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, FileText } from 'lucide-react';
import AISummaryGenerator from '@/components/summaries/AISummaryGenerator';

export default function TradingSummaries() {
  const [period, setPeriod] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getDateRange = () => {
    const date = new Date(selectedDate);
    if (period === 'daily') {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      // Weekly
      const dayOfWeek = date.getDay();
      const start = new Date(date);
      start.setDate(date.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  };

  const { start, end } = getDateRange();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', period, selectedDate],
    queryFn: async () => {
      const allTrades = await base44.entities.Trade.list('-entry_date', 1000);
      return allTrades.filter(trade => {
        const tradeDate = new Date(trade.entry_date);
        return tradeDate >= new Date(start) && tradeDate <= new Date(end);
      });
    }
  });

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    if (period === 'daily') {
      date.setDate(date.getDate() + days);
    } else {
      date.setDate(date.getDate() + (days * 7));
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDateRange = () => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (period === 'daily') {
      return startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Trading Summaries</h1>
          <p className="text-slate-600 mt-1">AI-generated insights and performance analysis</p>
        </div>

        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-2">AI-Powered Trading Summaries</h3>
                <p className="text-sm text-slate-700">
                  Get automated daily and weekly summaries highlighting key metrics, significant trades, 
                  psychological insights, and actionable recommendations based on your trading activity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={period === 'daily' ? 'default' : 'outline'}
              onClick={() => setPeriod('daily')}
              className={period === 'daily' ? 'bg-blue-600' : ''}
            >
              Daily
            </Button>
            <Button
              variant={period === 'weekly' ? 'default' : 'outline'}
              onClick={() => setPeriod('weekly')}
              className={period === 'weekly' ? 'bg-blue-600' : ''}
            >
              Weekly
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
              ← Previous
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-600" />
              <span className="font-medium text-slate-900">{formatDateRange()}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
              Next →
            </Button>
          </div>
        </div>

        {/* Trade Count Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Trades in this period</div>
                <div className="text-2xl font-bold text-slate-900">{trades.length}</div>
              </div>
              {isLoading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Summary */}
        {!isLoading && (
          <AISummaryGenerator
            trades={trades}
            period={period}
            startDate={new Date(start).toLocaleDateString()}
            endDate={new Date(end).toLocaleDateString()}
          />
        )}

        {trades.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-slate-400 mb-2">
                <FileText className="h-16 w-16 mx-auto mb-4" />
              </div>
              <p className="text-slate-600 font-medium">No trades found for this period</p>
              <p className="text-sm text-slate-500 mt-1">
                Try selecting a different date or time period
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
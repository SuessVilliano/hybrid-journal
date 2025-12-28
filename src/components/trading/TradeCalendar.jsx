import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Target, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TradeCalendar({ trades }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'day', 'week', 'month'
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: tradePlans = [] } = useQuery({
    queryKey: ['tradePlans'],
    queryFn: () => base44.entities.DailyTradePlan.list('-date', 365)
  });

  const calendarData = useMemo(() => {
    let days;
    
    if (view === 'day') {
      days = [currentDate];
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    }

    return days.map(day => {
      const dayTrades = trades.filter(t => 
        isSameDay(new Date(t.entry_date), day)
      );
      const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const dayPlan = tradePlans.find(p => isSameDay(new Date(p.date), day));
      
      return {
        date: day,
        trades: dayTrades,
        tradeCount: dayTrades.length,
        pnl: dayPnl,
        hasPlan: !!dayPlan,
        plan: dayPlan
      };
    });
  }, [trades, tradePlans, currentDate, view]);

  const navigate = (direction) => {
    if (view === 'day') {
      setCurrentDate(new Date(currentDate.getTime() + (direction === 'prev' ? -1 : 1) * 24 * 60 * 60 * 1000));
    } else if (view === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const getHeaderText = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
    if (view === 'week') return `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <div className="space-y-4">
      {/* View Selector */}
      <div className="flex items-center justify-center gap-2">
        <Button
          onClick={() => setView('day')}
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          className={view === 'day' ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : ''}
        >
          Day
        </Button>
        <Button
          onClick={() => setView('week')}
          variant={view === 'week' ? 'default' : 'outline'}
          size="sm"
          className={view === 'week' ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : ''}
        >
          Week
        </Button>
        <Button
          onClick={() => setView('month')}
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          className={view === 'month' ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : ''}
        >
          Month
        </Button>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate('prev')}
          variant="outline"
          size="icon"
          className={darkMode ? 'border-cyan-500/20' : ''}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {getHeaderText()}
        </h3>
        <Button
          onClick={() => navigate('next')}
          variant="outline"
          size="icon"
          className={darkMode ? 'border-cyan-500/20' : ''}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day View */}
      {view === 'day' && calendarData.length > 0 && (
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-slate-900 border-cyan-500/20' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {calendarData[0].tradeCount} {calendarData[0].tradeCount === 1 ? 'Trade' : 'Trades'}
              </div>
              <div className={`text-2xl font-bold ${
                calendarData[0].pnl >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {calendarData[0].pnl >= 0 ? '+' : ''}${calendarData[0].pnl.toFixed(2)}
              </div>
            </div>
          </div>
          
          {calendarData[0].trades.length > 0 ? (
            <div className="space-y-2">
              {calendarData[0].trades.map((trade, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    darkMode ? 'bg-slate-800' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {trade.symbol}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {format(new Date(trade.entry_date), 'h:mm a')}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              No trades on this day
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                day.tradeCount === 0
                  ? darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  : day.pnl >= 0
                    ? darkMode ? 'bg-green-900/30 border-green-700/30' : 'bg-green-50 border-green-200'
                    : darkMode ? 'bg-red-900/30 border-red-700/30' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {format(day.date, 'EEE')}
              </div>
              <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {format(day.date, 'd')}
              </div>
              {day.tradeCount > 0 && (
                <div className="mt-2">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {day.tradeCount} trades
                  </div>
                  <div className={`text-sm font-bold ${day.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`text-center text-xs font-medium p-2 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarData.map((day, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(day);
                  if (day.hasPlan) setShowPlanModal(true);
                }}
                className={`aspect-square p-2 rounded-lg border transition-all cursor-pointer relative ${
                  day.tradeCount === 0
                    ? darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                    : day.pnl >= 0
                      ? darkMode ? 'bg-green-900/30 border-green-700/30 hover:bg-green-900/50' : 'bg-green-50 border-green-200 hover:bg-green-100'
                      : darkMode ? 'bg-red-900/30 border-red-700/30 hover:bg-red-900/50' : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {format(day.date, 'd')}
                  </div>
                  {day.hasPlan && (
                    <Target className={`h-3 w-3 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  )}
                </div>
                {day.tradeCount > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {day.tradeCount}
                    </div>
                    <div className={`text-xs font-bold ${day.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Plan Modal */}
          {selectedDate && showPlanModal && selectedDate.plan && (
            <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
              <DialogContent className={`max-w-2xl ${darkMode ? 'bg-slate-950 border-cyan-500/30' : ''}`}>
                <DialogHeader>
                  <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    <Target className="h-5 w-5" />
                    Plan for {format(selectedDate.date, 'MMMM d, yyyy')}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Plan</h4>
                    <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedDate.plan.plan_text}
                    </p>
                  </div>

                  {selectedDate.plan.markets_to_watch?.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Markets</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDate.plan.markets_to_watch.map((market, i) => (
                          <span key={i} className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                            {market}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate.plan.trading_rules?.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rules</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedDate.plan.trading_rules.map((rule, i) => (
                          <li key={i} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Execution vs Plan</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trades Taken</div>
                        <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {selectedDate.tradeCount}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>P&L</div>
                        <div className={`text-lg font-bold ${selectedDate.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${selectedDate.pnl.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
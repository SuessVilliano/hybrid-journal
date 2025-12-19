import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TradeCalendar({ trades }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'day', 'week', 'month'
  const darkMode = document.documentElement.classList.contains('dark');

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
      
      return {
        date: day,
        trades: dayTrades,
        tradeCount: dayTrades.length,
        pnl: dayPnl
      };
    });
  }, [trades, currentDate, view]);

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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          Previous
        </button>
        <h3 className="text-lg font-bold text-slate-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <button
          onClick={nextMonth}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        >
          Next
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarData.map((day, idx) => (
          <div
            key={idx}
            className={`
              aspect-square p-2 rounded-lg border transition-all
              ${day.trades === 0 
                ? 'bg-slate-50 border-slate-200' 
                : day.pnl >= 0 
                  ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
              }
            `}
          >
            <div className="text-xs font-medium text-slate-900">
              {format(day.date, 'd')}
            </div>
            {day.trades > 0 && (
              <div className="mt-1">
                <div className="text-xs text-slate-600">{day.trades} trades</div>
                <div className={`text-xs font-bold ${day.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {day.pnl >= 0 ? '+' : ''}{day.pnl.toFixed(0)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
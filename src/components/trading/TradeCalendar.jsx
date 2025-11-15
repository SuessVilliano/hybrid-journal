import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';

export default function TradeCalendar({ trades }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const dayTrades = trades.filter(t => 
        isSameDay(new Date(t.entry_date), day)
      );
      const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      return {
        date: day,
        trades: dayTrades.length,
        pnl: dayPnl
      };
    });
  }, [trades, currentDate]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
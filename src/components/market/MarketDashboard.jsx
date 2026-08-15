import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, X, BarChart3, TrendingUp, Flame, DollarSign, Newspaper, Calendar, Brain, Filter, RotateCcw } from 'lucide-react';
import TradingViewWidget from '@/components/market/TradingViewWidget';
import MarketCauseEngine from '@/components/market/MarketCauseEngine';
import ForexScreener from '@/components/screeners/ForexScreener';
import StockScreener from '@/components/screeners/StockScreener';
import CryptoScreener from '@/components/screeners/CryptoScreener';
import ETFScreener from '@/components/screeners/ETFScreener';

const ROW_HEIGHT = 60;
const GAP = 12;
const MIN_COL = 3, MAX_COL = 12, MIN_ROW = 3, MAX_ROW = 24;
const STORAGE_KEY = 'market_dashboard_v1';

const TOOLS = [
  { type: 'chart', label: 'Trading Chart', icon: BarChart3, cols: 8, rows: 10 },
  { type: 'stockHeatmap', label: 'Stock Heatmap', icon: Flame, cols: 6, rows: 10 },
  { type: 'cryptoHeatmap', label: 'Crypto Heatmap', icon: Flame, cols: 6, rows: 10 },
  { type: 'forexHeatmap', label: 'Forex Heatmap', icon: DollarSign, cols: 6, rows: 10 },
  { type: 'forexCross', label: 'Forex Cross Rates', icon: DollarSign, cols: 6, rows: 8 },
  { type: 'news', label: 'Market News', icon: Newspaper, cols: 4, rows: 10 },
  { type: 'calendar', label: 'Economic Calendar', icon: Calendar, cols: 6, rows: 10 },
  { type: 'intelligence', label: 'Market Intelligence', icon: Brain, cols: 12, rows: 9 },
  { type: 'screeners', label: 'Screeners', icon: Filter, cols: 6, rows: 10 },
  { type: 'watchlist', label: 'Watchlist', icon: TrendingUp, cols: 4, rows: 8 },
];

const DEFAULT_LAYOUT = [
  { id: 'w1', type: 'chart', title: 'EURUSD Chart', colSpan: 8, rowSpan: 10, config: { symbol: 'EURUSD' } },
  { id: 'w2', type: 'news', title: 'Market News', colSpan: 4, rowSpan: 10, config: {} },
  { id: 'w3', type: 'stockHeatmap', title: 'Stock Market Heatmap', colSpan: 6, rowSpan: 10, config: {} },
  { id: 'w4', type: 'screeners', title: 'Screeners', colSpan: 6, rowSpan: 10, config: {} },
];

function ScreenerTabs({ darkMode }) {
  const [active, setActive] = useState('forex');
  const tabs = [
    { id: 'forex', label: 'Forex', C: ForexScreener },
    { id: 'stocks', label: 'Stocks', C: StockScreener },
    { id: 'crypto', label: 'Crypto', C: CryptoScreener },
    { id: 'etf', label: 'ETF', C: ETFScreener },
  ];
  const Active = tabs.find(t => t.id === active)?.C;
  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 flex-wrap mb-2 px-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${active === t.id ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {Active && <Active darkMode={darkMode} />}
      </div>
    </div>
  );
}

function WatchlistWidget({ darkMode, widget, updateWidget, setChartSymbol }) {
  const symbols = widget.config?.symbols || ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'AAPL', 'NAS100', 'ES'];
  const [input, setInput] = useState('');
  const setSymbols = (arr) => updateWidget(widget.id, { config: { ...widget.config, symbols: arr } });
  const add = () => {
    if (input && !symbols.includes(input.toUpperCase())) {
      setSymbols([...symbols, input.toUpperCase()]);
      setInput('');
    }
  };
  const remove = (s) => setSymbols(symbols.filter(x => x !== s));

  return (
    <div className="h-full flex flex-col p-1.5">
      <div className="flex gap-1 mb-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          placeholder="Add symbol"
          onKeyPress={e => e.key === 'Enter' && add()}
          className="h-8 text-sm"
        />
        <Button onClick={add} size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-600 px-2">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 overflow-auto">
        {symbols.map(s => (
          <button
            key={s}
            onClick={() => setChartSymbol(s)}
            className={`group flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {s}
            <X onClick={(e) => { e.stopPropagation(); remove(s); }} className="h-3 w-3 opacity-30 group-hover:opacity-100 hover:text-red-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

function tvSymbol(sym) {
  return sym === 'NAS100' ? 'OANDA:NAS100USD' : `OANDA:${sym}`;
}

export default function MarketDashboard({ darkMode }) {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_LAYOUT;
  });
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const addWidget = (type) => {
    const tool = TOOLS.find(t => t.type === type);
    if (!tool) return;
    const id = 'w' + Date.now();
    const title = type === 'chart' ? 'Trading Chart' : tool.label;
    setWidgets(ws => [...ws, {
      id,
      type,
      title,
      colSpan: tool.cols,
      rowSpan: tool.rows,
      config: type === 'chart' ? { symbol: 'EURUSD' } : type === 'watchlist' ? { symbols: ['EURUSD', 'GBPUSD', 'BTCUSD', 'AAPL', 'NAS100'] } : {}
    }]);
  };

  const removeWidget = (id) => setWidgets(ws => ws.filter(w => w.id !== id));
  const updateWidget = (id, patch) => setWidgets(ws => ws.map(w => w.id === id ? { ...w, ...patch } : w));
  const resetLayout = () => setWidgets(DEFAULT_LAYOUT);

  // Reorder via native HTML5 drag-and-drop
  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const onDrop = (id) => {
    if (!dragId || dragId === id) { setDragId(null); setDragOverId(null); return; }
    setWidgets(ws => {
      const from = ws.findIndex(w => w.id === dragId);
      const to = ws.findIndex(w => w.id === id);
      if (from < 0 || to < 0) return ws;
      const arr = [...ws];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragId(null);
    setDragOverId(null);
  };

  // Click-and-drag to resize (corner handle)
  const startResize = (e, widget) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const cw = container.getBoundingClientRect().width;
    const colUnit = (cw - 11 * GAP) / 12 + GAP;
    const rowUnit = ROW_HEIGHT + GAP;
    const sx = e.clientX, sy = e.clientY;
    const sc = widget.colSpan, sr = widget.rowSpan;
    const onMove = (ev) => {
      const newCols = Math.min(MAX_COL, Math.max(MIN_COL, sc + Math.round((ev.clientX - sx) / colUnit)));
      const newRows = Math.min(MAX_ROW, Math.max(MIN_ROW, sr + Math.round((ev.clientY - sy) / rowUnit)));
      setWidgets(ws => ws.map(w => w.id === widget.id ? { ...w, colSpan: newCols, rowSpan: newRows } : w));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Clicking a watchlist symbol opens/updates the first chart widget
  const setSymbolOnFirstChart = (symbol) => {
    setWidgets(ws => {
      const idx = ws.findIndex(w => w.type === 'chart');
      if (idx < 0) {
        const id = 'w' + Date.now();
        return [...ws, { id, type: 'chart', title: `${symbol} Chart`, colSpan: 8, rowSpan: 10, config: { symbol } }];
      }
      return ws.map((w, i) => i === idx ? { ...w, title: `${symbol} Chart`, config: { ...w.config, symbol } } : w);
    });
  };

  const renderContent = (w) => {
    switch (w.type) {
      case 'chart': return <TradingViewWidget type="chart" symbol={tvSymbol(w.config?.symbol || 'EURUSD')} height="100%" />;
      case 'stockHeatmap': return <TradingViewWidget type="stockHeatmap" height="100%" />;
      case 'cryptoHeatmap': return <TradingViewWidget type="cryptoHeatmap" height="100%" />;
      case 'forexHeatmap': return <TradingViewWidget type="forexHeatmap" height="100%" />;
      case 'forexCross': return <TradingViewWidget type="forexCross" height="100%" />;
      case 'news': return <TradingViewWidget type="news" height="100%" />;
      case 'calendar': return <TradingViewWidget type="calendar" height="100%" />;
      case 'intelligence': return <div className="h-full overflow-auto p-2"><MarketCauseEngine /></div>;
      case 'screeners': return <ScreenerTabs darkMode={darkMode} />;
      case 'watchlist': return <WatchlistWidget darkMode={darkMode} widget={w} updateWidget={updateWidget} setChartSymbol={setSymbolOnFirstChart} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-600">
              <Plus className="h-4 w-4 mr-1" /> Add Tool
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <DropdownMenuItem key={t.type} onClick={() => addWidget(t.type)} className="cursor-pointer">
                  <Icon className="h-4 w-4 mr-2" /> {t.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={resetLayout} className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-500/30 text-cyan-700'}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset Layout
        </Button>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Drag the title bar to reorder · Drag the bottom-right corner to resize
        </span>
      </div>

      {/* Grid */}
      <div ref={containerRef} className="grid gap-3" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: `${ROW_HEIGHT}px` }}>
        {widgets.map(w => {
          const tool = TOOLS.find(t => t.type === w.type);
          const Icon = tool?.icon || BarChart3;
          return (
            <Card
              key={w.id}
              draggable
              onDragStart={() => onDragStart(w.id)}
              onDragOver={(e) => onDragOver(e, w.id)}
              onDrop={() => onDrop(w.id)}
              className={`relative flex flex-col overflow-hidden transition-shadow ${dragOverId === w.id ? 'ring-2 ring-cyan-400' : ''} ${dragId === w.id ? 'opacity-50' : ''} ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}
              style={{ gridColumn: `span ${w.colSpan}`, gridRow: `span ${w.rowSpan}` }}
            >
              {/* Header — drag handle */}
              <div className={`flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} cursor-grab active:cursor-grabbing`}>
                <Icon className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                {w.type === 'chart' ? (
                  <input
                    value={w.config?.symbol || ''}
                    onChange={(e) => updateWidget(w.id, { config: { ...w.config, symbol: e.target.value.toUpperCase() }, title: `${e.target.value.toUpperCase() || 'Chart'} Chart` })}
                    className={`bg-transparent text-sm font-semibold w-28 outline-none ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}
                    placeholder="SYMBOL"
                    onDragStart={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={`text-sm font-semibold truncate ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{w.title}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    {w.colSpan}×{w.rowSpan}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }} className={darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {renderContent(w)}
              </div>

              {/* Resize handle (bottom-right corner) */}
              <div
                onMouseDown={(e) => startResize(e, w)}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
                style={{ touchAction: 'none' }}
              >
                <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 border-r-2 border-b-2 rounded-br-sm ${darkMode ? 'border-cyan-400/70' : 'border-cyan-500/70'}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className={`text-center py-16 rounded-xl border-2 border-dashed ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Your dashboard is empty. Click “Add Tool” to start building your workspace.</p>
        </div>
      )}
    </div>
  );
}
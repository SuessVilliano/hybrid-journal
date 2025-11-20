import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, BarChart3, TrendingUp, Flame, DollarSign, Newspaper, Calendar } from 'lucide-react';
import LivePriceTicker from '@/components/market/LivePriceTicker';
import TradingChart from '@/components/market/TradingChart';
import QuickTradePanel from '@/components/market/QuickTradePanel';
import TradingViewWidget from '@/components/market/TradingViewWidget';
import ResizableWidget from '@/components/market/ResizableWidget';

export default function MarketData() {
  const [watchlist, setWatchlist] = useState([
    'EURUSD',
    'GBPUSD',
    'USDJPY',
    'BTCUSD',
    'ETHUSD',
    'AAPL',
    'NQ',
    'ES'
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [tradePanelData, setTradePanelData] = useState(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const addSymbol = () => {
    if (newSymbol && !watchlist.includes(newSymbol.toUpperCase())) {
      setWatchlist([...watchlist, newSymbol.toUpperCase()]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  const handleTrade = (symbol, price) => {
    setTradePanelData({ symbol, price });
    setShowTradePanel(true);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Live Market Data
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Real-time quotes, charts, and market insights
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className={darkMode ? 'bg-slate-950/80 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'}>
            <TabsTrigger value="charts" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="heatmaps" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <Flame className="h-4 w-4 mr-2" />
              Heatmaps
            </TabsTrigger>
            <TabsTrigger value="forex" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <DollarSign className="h-4 w-4 mr-2" />
              Forex
            </TabsTrigger>
            <TabsTrigger value="news" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <Newspaper className="h-4 w-4 mr-2" />
              News
            </TabsTrigger>
            <TabsTrigger value="calendar" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
              <CardHeader>
                <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>My Watchlist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="Add symbol (e.g., EURUSD, AAPL, BTCUSD)"
                    onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  />
                  <Button onClick={addSymbol} className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {watchlist.map(symbol => (
                    <div
                      key={symbol}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        darkMode ? 'bg-slate-800' : 'bg-slate-100'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedSymbol(symbol)}
                        className={`font-medium ${
                          selectedSymbol === symbol 
                            ? 'text-cyan-500' 
                            : darkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {symbol}
                      </button>
                      <button
                        onClick={() => removeSymbol(symbol)}
                        className={`${darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <LivePriceTicker symbols={watchlist} onSymbolClick={setSelectedSymbol} />

            <ResizableWidget 
              title={`${selectedSymbol} Chart`}
              defaultHeight="900px"
              minHeight={500}
              maxHeight={2000}
            >
              <TradingViewWidget 
                type="chart" 
                symbol={`OANDA:${selectedSymbol}`}
                height="100%"
              />
            </ResizableWidget>
          </TabsContent>

          {/* Heatmaps Tab */}
          <TabsContent value="heatmaps" className="space-y-6">
            <ResizableWidget 
              title="Stock Market Heatmap"
              defaultHeight="900px"
              minHeight={600}
              maxHeight={2000}
            >
              <TradingViewWidget type="stockHeatmap" height="100%" />
            </ResizableWidget>

            <ResizableWidget 
              title="Crypto Heatmap"
              defaultHeight="900px"
              minHeight={600}
              maxHeight={2000}
            >
              <TradingViewWidget type="cryptoHeatmap" height="100%" />
            </ResizableWidget>
          </TabsContent>

          {/* Forex Tab */}
          <TabsContent value="forex" className="space-y-6">
            <ResizableWidget 
              title="Forex Cross Rates"
              defaultHeight="800px"
              minHeight={600}
              maxHeight={2000}
            >
              <TradingViewWidget type="forexCross" height="100%" />
            </ResizableWidget>

            <ResizableWidget 
              title="Forex Heatmap"
              defaultHeight="900px"
              minHeight={600}
              maxHeight={2000}
            >
              <TradingViewWidget type="forexHeatmap" height="100%" />
            </ResizableWidget>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news">
            <ResizableWidget 
              title="Market News & Updates"
              defaultHeight="1100px"
              minHeight={700}
              maxHeight={2000}
            >
              <TradingViewWidget type="news" height="100%" />
            </ResizableWidget>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <ResizableWidget 
              title="Economic Calendar"
              defaultHeight="1100px"
              minHeight={700}
              maxHeight={2000}
            >
              <TradingViewWidget type="calendar" height="100%" />
            </ResizableWidget>
          </TabsContent>
        </Tabs>

        {/* Quick Trade Panel */}
        {showTradePanel && tradePanelData && (
          <QuickTradePanel
            symbol={tradePanelData.symbol}
            currentPrice={tradePanelData.price}
            onClose={() => setShowTradePanel(false)}
          />
        )}
      </div>
    </div>
  );
}
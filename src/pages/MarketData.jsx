import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, BarChart3 } from 'lucide-react';
import LivePriceTicker from '@/components/market/LivePriceTicker';
import TradingChart from '@/components/market/TradingChart';
import QuickTradePanel from '@/components/market/QuickTradePanel';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Live Market Data</h1>
          <p className="text-slate-600 mt-1">Real-time quotes, charts, and simulated trading</p>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Market Data Features</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ Live price feeds for Forex, Crypto, Stocks, and Futures</li>
                  <li>✓ Interactive charts with technical indicators (SMA, EMA, RSI, Bollinger Bands)</li>
                  <li>✓ Quick simulated trading directly from charts</li>
                  <li>✓ Customizable watchlist for your favorite symbols</li>
                  <li>🔮 Future: Direct broker integration (MT4/MT5, cTrader) for live execution</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist Management */}
        <Card>
          <CardHeader>
            <CardTitle>My Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Add symbol (e.g., EURUSD, AAPL, BTCUSD)"
                onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
              />
              <Button onClick={addSymbol}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchlist.map(symbol => (
                <div
                  key={symbol}
                  className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full"
                >
                  <button
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`font-medium ${selectedSymbol === symbol ? 'text-blue-600' : 'text-slate-700'}`}
                  >
                    {symbol}
                  </button>
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Price Ticker */}
        <LivePriceTicker
          symbols={watchlist}
          onSymbolClick={setSelectedSymbol}
        />

        {/* Trading Chart */}
        <TradingChart
          symbol={selectedSymbol}
          onTrade={handleTrade}
        />

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
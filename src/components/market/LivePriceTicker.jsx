import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { fetchLiveMarketData } from './marketDataHelper';
import { Button } from '@/components/ui/button';

export default function LivePriceTicker({ symbols, onSymbolClick }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadPrices = async () => {
    setLoading(true);
    const data = await fetchLiveMarketData(symbols);
    setPrices(data);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [symbols]);

  if (loading && prices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Live Market Prices</h3>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadPrices}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {prices.map((item) => (
          <Card
            key={item.symbol}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onSymbolClick && onSymbolClick(item.symbol)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-slate-900">{item.symbol}</div>
                  <div className="text-xs text-slate-500">
                    Bid: {item.bid?.toFixed(5)} | Ask: {item.ask?.toFixed(5)}
                  </div>
                </div>
                {item.changePercent >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {item.price?.toFixed(5)}
              </div>
              
              <div className={`text-sm font-medium ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
              </div>
              
              <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>H: {item.high24h?.toFixed(5)}</span>
                  <span>L: {item.low24h?.toFixed(5)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
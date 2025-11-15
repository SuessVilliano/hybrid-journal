import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { fetchChartData, calculateIndicators } from './marketDataHelper';

export default function TradingChart({ symbol, onTrade }) {
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: true,
    rsi: false,
    bollinger: false
  });

  const loadChartData = async () => {
    setLoading(true);
    const data = await fetchChartData(symbol, timeframe, 100);
    
    // Calculate indicators
    const indicatorConfig = {};
    if (indicators.sma) indicatorConfig.sma = { period: 20 };
    if (indicators.ema) indicatorConfig.ema = { period: 12 };
    if (indicators.rsi) indicatorConfig.rsi = { period: 14 };
    if (indicators.bollinger) indicatorConfig.bollinger = { period: 20 };
    
    const calculatedIndicators = calculateIndicators(data, indicatorConfig);
    
    // Merge data with indicators
    const enrichedData = data.map((candle, idx) => ({
      ...candle,
      time: new Date(candle.timestamp).toLocaleTimeString(),
      sma: calculatedIndicators.sma?.[idx],
      ema: calculatedIndicators.ema?.[idx],
      rsi: calculatedIndicators.rsi?.[idx],
      bb_upper: calculatedIndicators.bollinger?.upper[idx],
      bb_middle: calculatedIndicators.bollinger?.middle[idx],
      bb_lower: calculatedIndicators.bollinger?.lower[idx]
    }));
    
    setChartData(enrichedData);
    setLoading(false);
  };

  useEffect(() => {
    loadChartData();
    const interval = setInterval(loadChartData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [symbol, timeframe, indicators]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
  const priceChange = chartData.length > 1 
    ? ((chartData[chartData.length - 1].close - chartData[0].close) / chartData[0].close * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">{symbol}</CardTitle>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold text-slate-900">
                {currentPrice.toFixed(5)}
              </span>
              <span className={`text-lg font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              variant="outline"
              onClick={loadChartData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {onTrade && (
              <Button
                size="sm"
                onClick={() => onTrade(symbol, currentPrice)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Quick Trade
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Indicator Toggles */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={indicators.sma ? "default" : "outline"}
            onClick={() => setIndicators({...indicators, sma: !indicators.sma})}
          >
            SMA(20)
          </Button>
          <Button
            size="sm"
            variant={indicators.ema ? "default" : "outline"}
            onClick={() => setIndicators({...indicators, ema: !indicators.ema})}
          >
            EMA(12)
          </Button>
          <Button
            size="sm"
            variant={indicators.rsi ? "default" : "outline"}
            onClick={() => setIndicators({...indicators, rsi: !indicators.rsi})}
          >
            RSI(14)
          </Button>
          <Button
            size="sm"
            variant={indicators.bollinger ? "default" : "outline"}
            onClick={() => setIndicators({...indicators, bollinger: !indicators.bollinger})}
          >
            Bollinger Bands
          </Button>
        </div>

        {/* Price Chart */}
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              
              <Area
                type="monotone"
                dataKey="close"
                fill="#3b82f6"
                fillOpacity={0.1}
                stroke="#3b82f6"
                strokeWidth={2}
                name="Price"
              />
              
              {indicators.sma && (
                <Line
                  type="monotone"
                  dataKey="sma"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="SMA(20)"
                />
              )}
              
              {indicators.ema && (
                <Line
                  type="monotone"
                  dataKey="ema"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="EMA(12)"
                />
              )}
              
              {indicators.bollinger && (
                <>
                  <Line
                    type="monotone"
                    dataKey="bb_upper"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="BB Upper"
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_lower"
                    stroke="#10b981"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="BB Lower"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* RSI Chart */}
          {indicators.rsi && (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="rsi"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  name="RSI(14)"
                />
                <Line y={70} stroke="#ef4444" strokeDasharray="5 5" />
                <Line y={30} stroke="#10b981" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
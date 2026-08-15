import React from 'react';
import { BarChart3 } from 'lucide-react';
import MarketDashboard from '@/components/market/MarketDashboard';

export default function MarketData() {
  const darkMode = document.documentElement.classList.contains('dark');

  const platforms = [
    { id: 'dxtrade', name: 'DX Trade', url: 'https://trade.gooeytrade.com/', color: 'from-orange-500 to-red-500' },
    { id: 'dxtrade-futures', name: 'DX Trade Futures', url: 'https://tradefutures.gooeytrade.com/', color: 'from-red-600 to-orange-700' },
    { id: 'matchtrader', name: 'Match Trader', url: 'https://mtr.gooeytrade.com/login', color: 'from-cyan-500 to-blue-500' },
    { id: 'ctrader', name: 'cTrader', url: 'https://app.gooeytrade.com/', color: 'from-purple-500 to-pink-500' },
    { id: 'gooeypro', name: 'GooeyPro', url: 'https://gooeypro.gooeytrade.com/login', color: 'from-yellow-500 to-orange-500' },
    { id: 'rithmic', name: 'Rithmic', url: 'https://rtraderpro.rithmic.com/rtraderpro-web/', color: 'from-blue-500 to-indigo-500' },
    { id: 'tradovate', name: 'Tradovate', url: 'https://trader.tradovate.com/', color: 'from-green-500 to-teal-500' },
    { id: 'tradelocker', name: 'TradeLocker', url: 'https://demo.tradelocker.com/', color: 'from-violet-500 to-purple-500' },
    { id: 'volumetrica', name: 'Volumetrica', url: 'https://my.deepcharts.com/identity/account/login', color: 'from-teal-500 to-cyan-600' },
  ];

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
            Real-time quotes, charts, and market insights — build your own workspace
          </p>
        </div>

        {/* Quick Access Platform Buttons */}
        <div className="flex flex-wrap gap-3">
          {platforms.map(platform => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2.5 bg-gradient-to-r ${platform.color} text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2 font-medium text-sm`}
            >
              <BarChart3 className="h-4 w-4" />
              {platform.name}
            </a>
          ))}
        </div>

        {/* Customizable Dashboard */}
        <MarketDashboard darkMode={darkMode} />
      </div>
    </div>
  );
}
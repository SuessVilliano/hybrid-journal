import React, { useState } from 'react';
import ForexScreener from '@/components/screeners/ForexScreener';
import StockScreener from '@/components/screeners/StockScreener';
import CryptoScreener from '@/components/screeners/CryptoScreener';
import ETFScreener from '@/components/screeners/ETFScreener';

const TABS = [
  { id: 'forex',  label: '💱 Forex' },
  { id: 'stocks', label: '📈 Stocks' },
  { id: 'crypto', label: '₿ Crypto' },
  { id: 'etf',    label: '🏦 ETF' },
];

export default function Screeners() {
  const [activeTab, setActiveTab] = useState('forex');
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Market Screeners
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
            Scan markets in real-time — Forex, Stocks, Crypto & ETFs
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20'
                  : darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Widget Area */}
        <div className={`rounded-xl overflow-hidden border ${
          darkMode ? 'border-cyan-500/20 bg-slate-950/80' : 'border-cyan-500/30 bg-white'
        } p-2`}>
          {activeTab === 'forex'  && <ForexScreener  darkMode={darkMode} />}
          {activeTab === 'stocks' && <StockScreener  darkMode={darkMode} />}
          {activeTab === 'crypto' && <CryptoScreener darkMode={darkMode} />}
          {activeTab === 'etf'    && <ETFScreener    darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
}
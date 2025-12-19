import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, BarChart3, Activity, Zap } from 'lucide-react';

export default function TradingPlatforms() {
  const darkMode = document.documentElement.classList.contains('dark');

  const platforms = [
    {
      id: 'dxtrade',
      name: 'DX Trade',
      icon: '📊',
      color: 'from-orange-500 to-red-500',
      description: 'Advanced web-based trading platform with institutional-grade features and real-time execution',
      url: 'https://trade.gooeytrade.com/',
      features: [
        'Advanced Charting',
        'Risk Management',
        'Multi-Asset Trading',
        'Real-Time Data',
      ],
    },
    {
      id: 'matchtrader',
      name: 'Match Trader',
      icon: '🎯',
      color: 'from-cyan-500 to-blue-500',
      description: 'Professional ECN trading platform optimized for forex and CFD trading',
      url: 'https://mtr.gooeytrade.com/login',
      features: [
        'ECN Trading',
        'Advanced Orders',
        'Market Analysis',
        'Live Quotes',
      ],
    },
    {
      id: 'ctrader',
      name: 'cTrader',
      icon: '⚡',
      color: 'from-purple-500 to-pink-500',
      description: 'Modern trading platform with advanced charting, automation, and algorithmic trading',
      url: 'https://app.gooeytrade.com/',
      features: [
        'Algorithmic Trading',
        'Level II Pricing',
        'Advanced Charting',
        'Copy Trading',
      ],
    },
    {
      id: 'rithmic',
      name: 'Rithmic',
      icon: '🚀',
      color: 'from-blue-500 to-indigo-500',
      description: 'Ultra-performance futures trading platform with ultra-low latency execution',
      url: 'https://rtraderpro.rithmic.com/rtraderpro-web/',
      features: [
        'Ultra-Low Latency',
        'Direct Market Access',
        'Professional Tools',
        'Futures Trading',
      ],
    },
  ];

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent mb-2`}>
            Professional Trading Platforms
          </h1>
          <p className={darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}>
            Direct access to professional trading environments with real-time market data
          </p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {platforms.map((platform) => (
            <Card 
              key={platform.id}
              className={`backdrop-blur-xl border-2 transition-all hover:scale-[1.02] ${
                darkMode 
                  ? 'bg-slate-950/80 border-cyan-500/20 hover:border-cyan-500/40' 
                  : 'bg-white/80 border-cyan-500/30 hover:border-cyan-500/50'
              }`}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className={`text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {platform.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Ready for trading • Competitive Server
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {platform.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                <div>
                  <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    Platform Features:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {platform.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-3 py-1.5 rounded-lg border text-center ${
                          darkMode
                            ? 'bg-slate-800/50 border-slate-700 text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className={`flex-1 ${
                      darkMode
                        ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                        : 'border-cyan-500/40 text-cyan-700 hover:bg-cyan-50'
                    }`}
                    onClick={() => window.open(platform.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Login to WebTrader
                  </Button>
                  <Button
                    className={`flex-1 bg-gradient-to-r ${platform.color} hover:opacity-90 text-white`}
                    onClick={() => window.open(platform.url, '_blank')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Access Platform
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className={`backdrop-blur-xl border-2 ${
          darkMode 
            ? 'bg-slate-950/80 border-cyan-500/20' 
            : 'bg-white/80 border-cyan-500/30'
        }`}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Professional Trading Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Each platform provides direct access to professional trading environments with real-time market data, 
              advanced charting tools, and institutional-grade execution.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Lightning-Fast Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Advanced Charting</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Professional Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Risk Management Tools</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { LayoutDashboard, BookOpen, Target, BarChart3, Zap, Layers, Play, Upload, TrendingUp, Link as LinkIcon, Bot, MessageSquare } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'Live Market', page: 'MarketData', icon: TrendingUp },
    { name: 'Trades', page: 'Trades', icon: BookOpen },
    { name: 'AI Coach', page: 'TradingCoach', icon: MessageSquare },
    { name: 'Broker Sync', page: 'BrokerConnections', icon: LinkIcon },
    { name: 'Automation', page: 'Automation', icon: Bot },
    { name: 'Strategies', page: 'Strategies', icon: Layers },
    { name: 'Goals', page: 'Goals', icon: Target },
    { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
    { name: 'Backtesting', page: 'Backtesting', icon: Play },
    { name: 'Imports', page: 'Imports', icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl z-50">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TradeHybrid</h1>
              <p className="text-xs text-slate-400">Pro Trading Journal</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 space-y-1">
            <div>🤖 AI Coach & Automation</div>
            <div>📊 Advanced Analytics</div>
            <div>🔗 Broker Integration</div>
            <div>📈 Live Market Data</div>
          </div>
        </div>
      </aside>

      <main className="ml-64">
        {children}
      </main>
    </div>
  );
}
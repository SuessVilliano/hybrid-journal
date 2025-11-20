import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { LayoutDashboard, BookOpen, Target, BarChart3, Zap, Layers, Play, Upload, TrendingUp, Link as LinkIcon, Bot, MessageSquare, Shield, FileText, Menu, X, Wallet, Sun, Moon } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const navigation = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'Accounts', page: 'Accounts', icon: Wallet },
    { name: 'Live Market', page: 'MarketData', icon: TrendingUp },
    { name: 'Trades', page: 'Trades', icon: BookOpen },
    { name: 'Summaries', page: 'TradingSummaries', icon: FileText },
    { name: 'AI Coach', page: 'TradingCoach', icon: MessageSquare },
    { name: 'Risk Manager', page: 'RiskManagement', icon: Shield },
    { name: 'Broker Sync', page: 'BrokerConnections', icon: LinkIcon },
    { name: 'Automation', page: 'Automation', icon: Bot },
    { name: 'Strategies', page: 'Strategies', icon: Layers },
    { name: 'Goals', page: 'Goals', icon: Target },
    { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
    { name: 'Backtesting', page: 'Backtesting', icon: Play },
    { name: 'Imports', page: 'Imports', icon: Upload },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <style>{`
        :root {
          --cyber-aqua: #00f0ff;
          --cyber-purple: #b400ff;
          --cyber-pink: #ff00ff;
          --cyber-blue: #0080ff;
        }
      `}</style>

      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-3 rounded-xl shadow-2xl hover:scale-110 transition-transform"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full shadow-2xl z-40 transition-all duration-300 ${
          darkMode 
            ? 'bg-slate-950/95 border-cyan-500/20 text-white' 
            : 'bg-white/95 border-cyan-500/30 text-slate-900'
        } backdrop-blur-xl border-r ${
          sidebarOpen ? 'w-64' : isMobile ? 'w-0' : 'w-16'
        } overflow-hidden`}
      >
        <div className={`p-6 border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Hybrid Journal
              </h1>
              <p className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-600/70'}`}>Trading Platform</p>
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
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-cyan-600 shadow-lg shadow-cyan-500/20 border border-cyan-500/30' 
                    : darkMode 
                      ? 'text-slate-300 hover:bg-slate-800/50 hover:text-cyan-400 border border-transparent'
                      : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-600 border border-transparent'
                  }
                `}
                title={!sidebarOpen ? item.name : ''}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 animate-pulse" />
                )}
                <Icon className={`h-5 w-5 relative z-10 ${isActive && 'drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]'}`} />
                {sidebarOpen && <span className="font-medium relative z-10">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${darkMode ? 'border-cyan-500/20 bg-slate-950/50' : 'border-cyan-500/30 bg-white/50'} ${!sidebarOpen && 'hidden'}`}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
              darkMode 
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-cyan-400 hover:from-cyan-500/30 hover:to-purple-600/30' 
                : 'bg-gradient-to-r from-cyan-100 to-purple-100 text-cyan-700 hover:from-cyan-200 hover:to-purple-200'
            }`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-sm font-medium">{darkMode ? 'Light' : 'Dark'} Mode</span>
          </button>
          <div className={`text-xs ${darkMode ? 'text-cyan-400/60' : 'text-cyan-600/60'} space-y-1`}>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span>AI Powered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span>Multi-Account</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
              <span>Real-Time Sync</span>
            </div>
          </div>
        </div>

        {/* Desktop Toggle */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-20 bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}
      </aside>

      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : isMobile ? 'ml-0' : 'ml-16'}`}>
        {children}
      </main>
    </div>
  );
}
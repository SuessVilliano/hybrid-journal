import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { LayoutDashboard, BookOpen, Target, BarChart3, Zap, Layers, Play, Upload, TrendingUp, Link as LinkIcon, Bot, MessageSquare, Shield, FileText, Menu, X, Wallet, Sun, Moon, Home, Users, User, Brain, GripVertical, Star, Clock, List, Bell, HelpCircle, UserCheck } from 'lucide-react';
import FloatingAIAssistant from '@/components/ai/FloatingAIAssistant';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import QuickAccessPanel from '@/components/layout/QuickAccessPanel';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Layout({ children, currentPageName }) {
  // Don't render layout for Landing and PublicDashboard pages
  if (currentPageName === 'Landing' || currentPageName === 'PublicDashboard') {
    return children;
  }
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const [menuOrder, setMenuOrder] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [recentPages, setRecentPages] = useState([]);
  const [menuView, setMenuView] = useState('all');
  const [settingsId, setSettingsId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [quickAccess, setQuickAccess] = useState([]);

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
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const loadMenuOrder = async () => {
      try {
        const settings = await base44.entities.DashboardSettings.list();
        if (settings.length > 0) {
          const s = settings[0];
          setSettingsId(s.id);
          
          // Merge saved order with new items that might not be in saved settings
          const savedOrder = s.menu_order || [];
          const allItemIds = defaultNavigation.map(item => item.id);
          const newItems = allItemIds.filter(id => !savedOrder.includes(id));
          const mergedOrder = [...savedOrder, ...newItems];
          
          setMenuOrder(mergedOrder);
          setFavorites(s.favorites || []);
          setRecentPages(s.recent_pages || []);
          setMenuView(s.menu_view || 'all');
          setQuickAccess(s.quick_access || ['dashboard', 'planning', 'trades', 'journal']);
          
          // Update saved settings with merged order if new items were added
          if (newItems.length > 0) {
            await base44.entities.DashboardSettings.update(s.id, { menu_order: mergedOrder });
          }
        } else {
          setMenuOrder(defaultNavigation.map(item => item.id));
          setQuickAccess(['dashboard', 'planning', 'trades', 'journal']);
        }
        } catch (error) {
        setMenuOrder(defaultNavigation.map(item => item.id));
        setQuickAccess(['dashboard', 'planning', 'trades', 'journal']);
        } finally {
        setLoadingMenu(false);
        }
        };
        loadMenuOrder();
        }, []);

        const handleQuickAccessDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(quickAccess);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQuickAccess(items);

        try {
        if (settingsId) {
        await base44.entities.DashboardSettings.update(settingsId, { quick_access: items });
        }
        } catch (error) {
        console.error('Failed to save quick access:', error);
        }
        };

        const replaceQuickAccessItem = (index, newItemId) => {
        const newQuickAccess = [...quickAccess];
        newQuickAccess[index] = newItemId;
        setQuickAccess(newQuickAccess);

        if (settingsId) {
        base44.entities.DashboardSettings.update(settingsId, { quick_access: newQuickAccess });
        }
        };

  useEffect(() => {
    if (currentPageName && currentPageName !== 'Landing' && settingsId) {
      const updateRecent = async () => {
        const item = defaultNavigation.find(i => i.page === currentPageName);
        if (!item) return;

        const newRecent = [
          { id: item.id, timestamp: Date.now() },
          ...recentPages.filter(r => r.id !== item.id)
        ].slice(0, 5);

        setRecentPages(newRecent);

        try {
          await base44.entities.DashboardSettings.update(settingsId, {
            recent_pages: newRecent
          });
        } catch (error) {
          console.error('Failed to update recent pages:', error);
        }
      };
      updateRecent();
    }
  }, [currentPageName]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(menuOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMenuOrder(items);

    try {
      const settings = await base44.entities.DashboardSettings.list();
      if (settings.length > 0) {
        await base44.entities.DashboardSettings.update(settings[0].id, {
          menu_order: items
        });
      } else {
        await base44.entities.DashboardSettings.create({
          menu_order: items
        });
      }
    } catch (error) {
      console.error('Failed to save menu order:', error);
    }
  };

  const defaultNavigation = [
    { id: 'dashboard', name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { id: 'planning', name: 'Trade Plans', page: 'TradePlans', icon: Target },
    { id: 'trades', name: 'Trades', page: 'Trades', icon: BookOpen },
    { id: 'journal', name: 'Journal', page: 'Journal', icon: BookOpen },
    { id: 'accounts', name: 'Accounts', page: 'Accounts', icon: Wallet },
    { id: 'market', name: 'Live Market', page: 'MarketData', icon: TrendingUp },
    { id: 'signals', name: 'Trading Signals', page: 'LiveTradingSignals', icon: Zap },
    { id: 'analytics', name: 'Analytics', page: 'Analytics', icon: BarChart3 },
    { id: 'summaries', name: 'Summaries', page: 'TradingSummaries', icon: FileText },
    { id: 'coach', name: 'AI Coach', page: 'TradingCoach', icon: MessageSquare },
    { id: 'risk', name: 'Risk Manager', page: 'RiskManagement', icon: Shield },
    { id: 'strategies', name: 'Strategies', page: 'Strategies', icon: Layers },
    { id: 'broker', name: 'Broker Sync', page: 'BrokerConnections', icon: LinkIcon },
    { id: 'automation', name: 'Automation', page: 'Automation', icon: Bot },
    { id: 'backtesting', name: 'Backtesting', page: 'Backtesting', icon: Play },
    { id: 'imports', name: 'Imports', page: 'Imports', icon: Upload },
    { id: 'community', name: 'Community', page: 'SocialFeed', icon: Users },
    { id: 'shared', name: 'Shared Access', page: 'SharedAccess', icon: UserCheck },
    { id: 'profile', name: 'My Profile', page: 'MyProfile', icon: User },
    { id: 'help', name: 'Help & Docs', page: 'Help', icon: HelpCircle },
    { id: 'funded', name: 'Get Funded', external: 'https://hybridfunding.co', icon: TrendingUp },
  ];

  const allNavigation = menuOrder.length > 0 
    ? menuOrder.map(id => defaultNavigation.find(item => item.id === id)).filter(Boolean)
    : defaultNavigation;

  const navigation = menuView === 'favorites' 
    ? allNavigation.filter(item => favorites.includes(item.id))
    : menuView === 'recent'
    ? recentPages.map(r => allNavigation.find(item => item.id === r.id)).filter(Boolean)
    : allNavigation;

  const toggleFavorite = async (itemId) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];

    setFavorites(newFavorites);

    try {
      if (settingsId) {
        await base44.entities.DashboardSettings.update(settingsId, { favorites: newFavorites });
      } else {
        const created = await base44.entities.DashboardSettings.create({ 
          favorites: newFavorites,
          menu_order: menuOrder
        });
        setSettingsId(created.id);
      }
    } catch (error) {
      console.error('Failed to update favorites:', error);
    }
  };

  const switchView = async (view) => {
    setMenuView(view);
    try {
      if (settingsId) {
        await base44.entities.DashboardSettings.update(settingsId, { menu_view: view });
      }
    } catch (error) {
      console.error('Failed to update menu view:', error);
    }
  };

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

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-3 rounded-xl shadow-2xl hover:scale-110 transition-transform"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl shadow-2xl hover:scale-110 transition-transform ${
              darkMode 
                ? 'bg-slate-800 text-cyan-400' 
                : 'bg-white text-cyan-700'
            }`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      )}

      {!isMobile && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-xl shadow-2xl hover:scale-110 transition-transform ${
              darkMode 
                ? 'bg-slate-800 text-cyan-400' 
                : 'bg-white text-cyan-700'
            }`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full shadow-2xl z-40 transition-all duration-300 ${
          darkMode 
            ? 'bg-slate-950/95 border-cyan-500/20 text-white' 
            : 'bg-white/95 border-cyan-500/30 text-slate-900'
        } backdrop-blur-xl border-r ${
          sidebarOpen ? 'w-64' : isMobile ? 'w-0' : 'w-16'
        } overflow-y-auto overflow-x-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-6 border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-center justify-between">
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
            <NotificationBell />
          </div>
        </div>

        {sidebarOpen && (
          <div className={`px-4 pt-4 pb-2 flex items-center gap-2 border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
            <button
              onClick={() => switchView('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                menuView === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <List className="h-3 w-3" />
              All
            </button>
            <button
              onClick={() => switchView('favorites')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                menuView === 'favorites'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Star className="h-3 w-3" />
              Favorites
            </button>
            <button
              onClick={() => switchView('recent')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                menuView === 'recent'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-3 w-3" />
              Recent
            </button>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="navigation">
            {(provided) => (
              <nav 
                className="p-4 space-y-2 overflow-y-auto" 
                style={{ maxHeight: 'calc(100vh - 400px)' }}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {loadingMenu ? (
                  <div className="text-center py-8 text-slate-400">Loading menu...</div>
                ) : (
                  navigation.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.page;

                    return (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'opacity-50' : ''}
                          >
                            {item.external ? (
                              <a
                                href={item.external}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative overflow-hidden bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 hover:from-green-500/30 hover:to-emerald-600/30"
                                title={!sidebarOpen ? item.name : ''}
                              >
                                {sidebarOpen && menuView === 'all' && (
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4 text-green-400/50" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-600/10 animate-pulse" />
                                <Icon className="h-5 w-5 relative z-10 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                {sidebarOpen && <span className="font-medium relative z-10 text-green-400 flex-1">{item.name}</span>}
                                {sidebarOpen && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleFavorite(item.id);
                                    }}
                                    className="relative z-10"
                                  >
                                    <Star className={`h-4 w-4 ${favorites.includes(item.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                                  </button>
                                )}
                              </a>
                            ) : (
                              <Link
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
                                {sidebarOpen && menuView === 'all' && (
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className={`h-4 w-4 ${isActive ? 'text-cyan-400/50' : 'text-slate-400/50'}`} />
                                  </div>
                                )}
                                {isActive && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 animate-pulse" />
                                )}
                                <Icon className={`h-5 w-5 relative z-10 ${isActive && 'drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]'}`} />
                                {sidebarOpen && <span className="font-medium relative z-10 flex-1">{item.name}</span>}
                                {sidebarOpen && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleFavorite(item.id);
                                    }}
                                    className="relative z-10"
                                  >
                                    <Star className={`h-4 w-4 ${favorites.includes(item.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                                  </button>
                                )}
                              </Link>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </nav>
            )}
          </Droppable>
        </DragDropContext>

        {sidebarOpen && (
          <div className="mt-auto">
            <QuickAccessPanel
              quickAccess={quickAccess}
              allNavigation={defaultNavigation}
              onReorder={handleQuickAccessDragEnd}
              onReplace={(index, newItemId) => {
                const newQuickAccess = [...quickAccess];
                newQuickAccess[index] = newItemId;
                setQuickAccess(newQuickAccess);
                if (settingsId) {
                  base44.entities.DashboardSettings.update(settingsId, { quick_access: newQuickAccess });
                }
              }}
              darkMode={darkMode}
            />
          </div>
        )}

        <div className={`p-4 border-t ${darkMode ? 'border-cyan-500/20 bg-slate-950/50' : 'border-cyan-500/30 bg-white/50'} ${!sidebarOpen && 'hidden'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className={`text-xs ${darkMode ? 'text-cyan-400/60' : 'text-cyan-600/60'} space-y-1 flex-1`}>
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
            <div className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-600/70'} text-right`}>
              <div className="mb-1">Logged in as</div>
              <div className={`font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-700'} truncate max-w-[100px]`}>
                {currentUser?.full_name || currentUser?.email || '...'}
              </div>
              <button
                onClick={() => {
                  base44.auth.logout();
                  window.location.href = createPageUrl('Landing');
                }}
                className={`text-xs underline mt-1 ${darkMode ? 'text-cyan-400/70 hover:text-cyan-400' : 'text-cyan-700/70 hover:text-cyan-700'} transition-colors`}
              >
                Sign out
              </button>
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

      {/* Floating AI Assistant */}
      <FloatingAIAssistant isOpen={showAI} onClose={() => setShowAI(false)} />

      {/* Floating AI Toggle Button - Always visible */}
      {!showAI && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center group"
          title="Open AI Assistant"
        >
          <Brain className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}
      </div>
      );
      }
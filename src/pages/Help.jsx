import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageCircle, Video, FileText, Mail, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Help() {
  const darkMode = document.documentElement.classList.contains('dark');
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);

  const handlePWAClick = () => {
    setShowPWAInstructions(true);
    toast.info('Check the PWA installation guide below!');
  };

  const resources = [
    {
      icon: BookOpen,
      title: 'Documentation',
      description: 'Comprehensive guides and tutorials',
      link: 'https://docs.hybridjournal.co',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Step-by-step video walkthroughs',
      link: 'https://youtube.com/@hybridjournal',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: MessageCircle,
      title: 'Community Forum',
      description: 'Connect with other traders',
      link: 'https://community.hybridjournal.co',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: FileText,
      title: 'Install as PWA',
      description: 'Add to home screen for offline access',
      action: 'pwa',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const faqs = [
    {
      q: 'How do I install the app on my phone/tablet?',
      a: 'On mobile: Tap your browser menu (⋮) and select "Add to Home Screen" or "Install App". On desktop: Look for the install icon in your browser\'s address bar. The app works offline once installed!'
    },
    {
      q: 'Can I embed this app in other platforms (GoHighLevel, etc.)?',
      a: 'The app is optimized as a standalone PWA. For embedding, authentication may be restricted due to browser security policies. We recommend using it as an installed app or in a separate browser tab for the best experience.'
    },
    {
      q: 'How do I connect my trading account?',
      a: 'Go to Accounts page, click "Connect Broker", and choose your broker platform. Follow the 3-step wizard: (1) Select platform, (2) Choose connection method (API/Webhook/Statement), (3) Enter credentials or upload statements. Supports cTrader, DXTrade, MT4/MT5, Tradovate, and more.'
    },
    {
      q: 'What are the different connection methods?',
      a: 'API (real-time sync via official APIs), Webhook Push (MT4/MT5 EA sends trades instantly), Statement Ingest (upload CSV/PDF trade history). Choose based on your broker and technical comfort level.'
    },
    {
      q: 'How does trade copying work?',
      a: 'After connecting source and target accounts, set up copy parameters including risk multiplier, symbol mapping, and filters. Trades are automatically copied with reconciliation and error monitoring. Configure in Accounts > Copy Settings.'
    },
    {
      q: 'How do I avoid duplicate trades?',
      a: 'Hybrid Journal automatically deduplicates using source + source_trade_id. If you import a statement that contains auto-synced trades, they\'ll be detected and skipped or updated, never duplicated.'
    },
    {
      q: 'Can I share my journal with a mentor?',
      a: 'Yes! Go to Settings > Shared Access to grant view or edit permissions to other traders.'
    },
    {
      q: 'How does the AI Coach work?',
      a: 'The AI Coach analyzes your trades, plans, and journal entries to provide personalized insights and suggestions.'
    },
    {
      q: 'How do I import my historical trades?',
      a: 'Go to Imports page and upload your broker statement CSV, or connect via Broker Sync for automatic imports.'
    },
    {
      q: 'What are prop firm rules?',
      a: 'Prop firm rules help you stay compliant with funded account requirements like max daily loss and trailing drawdown.'
    },
    {
      q: 'Does the app work offline?',
      a: 'Yes! Once installed as a PWA, core features are cached and work offline. You\'ll need internet for live data updates and AI features.'
    },
    {
      q: 'How do I use the API to automate my trading?',
      a: 'Go to My Profile > API Key Management to generate your API key. Use it to access trading data, send notifications, proxy external APIs, and build custom automations. Full documentation is available in the API section.'
    },
    {
      q: 'How do I receive signals from TradingView or Telegram?',
      a: 'Go to My Profile > Webhook Settings to get your unique webhook URL. Configure TradingView alerts or TaskMagic to send signals to this URL. All signals appear in Trading Signals page.'
    },
    {
      q: 'What are the different connection methods?',
      a: 'API (real-time sync via official APIs), Webhook Push (MT4/MT5 EA sends trades instantly), Statement Ingest (upload CSV/PDF trade history). Choose based on your broker and technical comfort level.'
    },
    {
      q: 'How does trade copying work?',
      a: 'After connecting source and target accounts, set up copy parameters including risk multiplier, symbol mapping, and filters. Trades are automatically copied with reconciliation and error monitoring. Configure in Accounts > Copy Settings.'
    },
    {
      q: 'How do I avoid duplicate trades?',
      a: 'Hybrid Journal automatically deduplicates using source + source_trade_id. If you import a statement that contains auto-synced trades, they\'ll be detected and skipped or updated, never duplicated.'
    },
    {
      q: 'How does the gamification system work?',
      a: 'Earn XP and level up by logging trades (+10 XP), creating daily plans (+25 XP), writing journal entries (+15 XP), and completing goals (+50 XP). Unlock badges for milestones like first trade, 7-day streak, 100 trades, and more. Compete on leaderboards for points, streaks, and levels!'
    },
    {
      q: 'How do I earn badges and level up?',
      a: 'Badges are automatically awarded when you hit milestones. Track your progress on the Achievements page. Your level increases as you gain XP - each level requires Level × 1000 XP. Stay consistent to build streaks and climb the leaderboard!'
    }
  ];

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Help & Resources
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Everything you need to master your trading journal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource, idx) => (
            <Card key={idx} className={darkMode ? 'bg-slate-950/80 border-cyan-500/20 hover:border-cyan-500/40 transition' : 'bg-white border-cyan-500/30 hover:border-cyan-500/50 transition'}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${resource.color}`}>
                    <resource.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {resource.title}
                    </h3>
                    <p className={`text-sm mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {resource.description}
                    </p>
                    {resource.link && (
                      <a
                        href={resource.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-500 hover:text-cyan-600 flex items-center gap-1"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {resource.action === 'pwa' && (
                      <button
                        onClick={handlePWAClick}
                        className="text-sm text-cyan-500 hover:text-cyan-600 flex items-center gap-1"
                      >
                        View Guide <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showPWAInstructions && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                <Smartphone className="h-5 w-5" />
                Install Hybrid Journal as a PWA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  📱 On Mobile (iOS/Android)
                </h3>
                <ol className={`space-y-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} list-decimal list-inside`}>
                  <li>Open hybridjournal.co in Safari (iOS) or Chrome (Android)</li>
                  <li>Tap the Share button (iOS) or Menu (⋮) button (Android)</li>
                  <li>Select "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                  <li>The app icon will appear on your home screen - launch it like any native app!</li>
                </ol>
              </div>

              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  💻 On Desktop (Chrome/Edge)
                </h3>
                <ol className={`space-y-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} list-decimal list-inside`}>
                  <li>Look for the install icon (⊕) in the address bar</li>
                  <li>Click it and select "Install"</li>
                  <li>The app will open in its own window</li>
                  <li>Access it from your taskbar or applications folder anytime</li>
                </ol>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>
                  ✨ Benefits of PWA Installation:
                </p>
                <ul className={`space-y-1 text-sm ${darkMode ? 'text-cyan-300/80' : 'text-cyan-900/80'} list-disc list-inside`}>
                  <li>Works offline - access your data anytime</li>
                  <li>Faster loading and better performance</li>
                  <li>Native app-like experience</li>
                  <li>No app store download required</li>
                  <li>Automatic updates in the background</li>
                </ul>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>
                  ⚠️ About Embedding in Other Platforms:
                </p>
                <p className={`text-sm ${darkMode ? 'text-yellow-300/80' : 'text-yellow-900/80'}`}>
                  For security reasons, browsers restrict authentication in iframes. If you need to use Hybrid Journal alongside GoHighLevel or similar platforms, we recommend:
                </p>
                <ul className={`mt-2 space-y-1 text-sm ${darkMode ? 'text-yellow-300/80' : 'text-yellow-900/80'} list-disc list-inside`}>
                  <li>Open as a separate browser tab or window</li>
                  <li>Install as a PWA for side-by-side usage</li>
                  <li>Use browser split-screen features</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              API & Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
              <h3 className={`font-bold mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>🚀 Programmatic Access</h3>
              <p className={`text-sm mb-3 ${darkMode ? 'text-cyan-300/80' : 'text-cyan-900/80'}`}>
                Build custom trading bots, sync with external systems, and automate your workflow using our REST API.
              </p>
              <div className={`space-y-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Generate API Key:</strong> Go to My Profile → API Key Management
                </div>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Available Endpoints:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• <code className={`px-1 rounded ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>/api/functions/apiData</code> - Unified data API (CRUD + real-time)</li>
                    <li>• <code className={`px-1 rounded ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>/api/functions/apiProxy</code> - External API proxy (broker APIs, market data)</li>
                    <li>• <code className={`px-1 rounded ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>/api/functions/apiNotify</code> - Send in-app notifications</li>
                  </ul>
                </div>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Use Cases:</strong> Auto-trading bots, broker sync, risk management systems, custom analytics dashboards
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
              <h3 className={`font-bold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-900'}`}>📡 Webhook Signal Ingestion</h3>
              <p className={`text-sm mb-3 ${darkMode ? 'text-purple-300/80' : 'text-purple-900/80'}`}>
                Receive trading signals from TradingView, Telegram, or any external source directly into your journal.
              </p>
              <div className={`space-y-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <div>
                  <strong className={darkMode ? 'text-purple-400' : 'text-purple-700'}>Setup:</strong> Go to My Profile → Webhook Settings → Generate Token
                </div>
                <div>
                  <strong className={darkMode ? 'text-purple-400' : 'text-purple-700'}>Configure:</strong> Set filters (symbols, actions, confidence, providers) and notification preferences
                </div>
                <div>
                  <strong className={darkMode ? 'text-purple-400' : 'text-purple-700'}>View:</strong> All signals appear in Trading Signals page with AI analysis and routing options
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
              <h3 className={`font-bold mb-3 ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>📚 Quick Start Guides</h3>
              <div className={`space-y-4 text-sm ${darkMode ? 'text-cyan-300/80' : 'text-cyan-900/80'}`}>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>🔌 Broker Auto-Sync:</strong>
                  <p className="mt-1">Accounts → Broker Connections → Connect Broker → Choose platform → Follow 3-step wizard with real-time credential validation</p>
                </div>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>🔗 iCopyTrade Integration:</strong>
                  <ol className="ml-4 mt-1 space-y-1 list-decimal">
                    <li>Generate link token: Accounts → App Linking (expires 15 min)</li>
                    <li>Enter token in iCopyTrade → Connect Journal</li>
                    <li>Trades auto-sync with HMAC security</li>
                  </ol>
                </div>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>🔄 Trade Copying:</strong>
                  <p className="mt-1">Connect source + target accounts → Configure copy parameters (risk multiplier, symbol mapping, filters) → Enable copying → Monitor in real-time with reconciliation</p>
                </div>
                <div>
                  <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>📊 AI Analysis:</strong>
                  <p className="mt-1">AI Coach → Deep Analysis tab → Select analysis type → View strategy performance, emotion correlation, risk assessment, and weekly summaries</p>
                </div>
              </div>
            </div>

            {faqs.map((faq, idx) => (
              <div key={idx} className={`pb-4 ${idx !== faqs.length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-200') : ''}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {faq.q}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {faq.a}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r from-cyan-500 to-purple-600 border-0`}>
          <CardContent className="p-6 text-center">
            <Mail className="h-12 w-12 text-white mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Still Need Help?</h3>
            <p className="text-cyan-50 mb-4">Our support team is here to assist you</p>
            <Button 
              onClick={() => window.location.href = 'mailto:support@hybridjournal.co'}
              className="bg-white text-cyan-600 hover:bg-cyan-50"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
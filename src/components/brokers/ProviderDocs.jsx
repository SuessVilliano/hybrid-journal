import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, FileText, Download } from 'lucide-react';

export default function ProviderDocs({ provider, mode }) {
  const docs = {
    'cTrader': {
      'READONLY_API': {
        title: 'cTrader Open API Setup',
        description: 'Connect via official cTrader Open API with OAuth2 authentication',
        links: [
          { label: 'Official API Docs', url: 'https://help.ctrader.com/open-api/' },
          { label: 'Create API Application', url: 'https://openapi.ctrader.com/apps' },
          { label: 'Video Tutorial', url: 'https://www.youtube.com/watch?v=cTrader-API' }
        ],
        notes: [
          'Requires broker support for Open API (not all cTrader brokers support this)',
          'OAuth2 authentication with refresh tokens',
          'Read-only access to trade history, positions, and account info',
          'Real-time WebSocket updates for instant trade sync',
          'Best for: Automated sync with no manual intervention'
        ]
      },
      'WEBHOOK_PUSH': {
        title: 'cTrader Automate (cBots)',
        description: 'Use cTrader Automate to push trade events via webhook',
        links: [
          { label: 'cTrader Automate Guide', url: 'https://help.ctrader.com/ctrader-automate/' },
          { label: 'Download Hybrid Journal cBot', url: '#', download: true }
        ],
        notes: [
          'Create a cBot that monitors OnTradeExecuted events',
          'Send HTTP POST to webhook URL on each trade',
          'Include HMAC-SHA256 signature for security',
          'Works with ALL cTrader brokers (no API access needed)',
          'Best for: Brokers that don\'t support Open API'
        ]
      },
      'STATEMENT_INGEST': {
        title: 'Statement Import',
        description: 'Upload trade history CSV files manually',
        links: [
          { label: 'Export Guide', url: 'https://help.ctrader.com/ctrader/export-history/' }
        ],
        notes: [
          'Go to History tab in cTrader',
          'Click Export → CSV format',
          'Upload file in Hybrid Journal',
          'Best for: One-time imports or backup method'
        ]
      }
    },
    'DXTrade': {
      'DXTRADE_LOGIN': {
        title: 'DXtrade Auto-Sync (Recommended)',
        description: 'Automatically sync trades using your DXtrade login credentials',
        links: [
          { label: 'GooyeTrade', url: 'https://trade.gooeytrade.com/' },
          { label: 'DXTrade Platform', url: 'https://dx.trade/' }
        ],
        notes: [
          'Uses your existing DXtrade login (same as web platform)',
          'Supports most prop firms using DXtrade: FTMO, GooyeTrade, FundedNext, etc.',
          'Automatic trade syncing every hour or on-demand',
          'No API keys needed - just your login credentials',
          'Best for: All DXtrade prop firm accounts'
        ]
      },
      'STATEMENT_INGEST': {
        title: 'Statement Import',
        description: 'Upload DXTrade trade reports',
        links: [
          { label: 'Export Reports Guide', url: 'https://dx.trade/help/reports' }
        ],
        notes: [
          'Log in to DXTrade web platform',
          'Navigate to Reports → Trade History',
          'Export as CSV or Excel',
          'Best for: When auto-sync is unavailable'
        ]
      }
    },
    'MatchTrader': {
      'READONLY_API': {
        title: 'Match-Trader API',
        description: 'Connect via Match-Trader REST API',
        links: [
          { label: 'Match-Trader API Docs', url: 'https://docs.match-trade.com/' }
        ],
        notes: [
          'Request API credentials from your broker',
          'Requires account verification',
          'Supports real-time position monitoring',
          'Best for: Active traders needing instant sync'
        ]
      }
    },
    'Rithmic': {
      'READONLY_API': {
        title: 'Rithmic API Connection',
        description: 'Professional-grade futures trading API',
        links: [
          { label: 'Rithmic API Docs', url: 'https://www.rithmic.com/apis' },
          { label: 'Request Access', url: 'https://www.rithmic.com/contact' }
        ],
        notes: [
          'Enterprise-level API for futures traders',
          'Requires Rithmic account and broker support',
          'Low-latency WebSocket connections',
          'Best for: Professional futures traders'
        ]
      }
    },
    'MT4': {
      'WEBHOOK_PUSH': {
        title: 'MT4 Expert Advisor (EA)',
        description: 'Install EA that sends trade events to Hybrid Journal',
        links: [
          { label: 'Download Hybrid Journal MT4 EA', url: '#', download: true },
          { label: 'MT4 EA Installation Guide', url: 'https://www.mql5.com/en/articles/203' },
          { label: 'MQL4 Documentation', url: 'https://docs.mql4.com/' }
        ],
        notes: [
          'Place EA in MetaTrader4/MQL4/Experts folder',
          'Restart MT4 and attach EA to any chart (only needs to run once)',
          'Enter webhook URL and secret in EA inputs',
          'EA monitors all trades across all symbols automatically',
          'Sends trade open, modify, and close events in real-time',
          'Best for: All MT4 users (no broker API needed)'
        ]
      },
      'STATEMENT_INGEST': {
        title: 'MT4 Statement Import',
        description: 'Upload MT4 account statements',
        links: [
          { label: 'Generate Reports Guide', url: 'https://www.metatrader4.com/en/trading-platform/help/service/reports' }
        ],
        notes: [
          'Right-click Account History in MT4',
          'Select "Save as Report" → Detailed Statement',
          'Choose HTML or Text format',
          'Upload in Hybrid Journal Imports page',
          'Best for: Historical data import or backup'
        ]
      }
    },
    'MT5': {
      'WEBHOOK_PUSH': {
        title: 'MT5 Expert Advisor (EA)',
        description: 'Install EA that sends trade events to Hybrid Journal',
        links: [
          { label: 'Download Hybrid Journal MT5 EA', url: '#', download: true },
          { label: 'MT5 EA Installation Guide', url: 'https://www.mql5.com/en/articles/203' },
          { label: 'MQL5 Documentation', url: 'https://www.mql5.com/en/docs' }
        ],
        notes: [
          'Place EA in MetaTrader5/MQL5/Experts folder',
          'Restart MT5 and attach EA to any chart',
          'Enter webhook URL and secret in EA inputs',
          'Supports all order types (market, limit, stop, partial fills)',
          'Monitors positions, pending orders, and modifications',
          'Best for: All MT5 users (most common setup)'
        ]
      },
      'STATEMENT_INGEST': {
        title: 'MT5 Statement Import',
        description: 'Upload MT5 account statements',
        links: [
          { label: 'Generate Reports Guide', url: 'https://www.metatrader5.com/en/terminal/help/start_advanced/history' }
        ],
        notes: [
          'Right-click Account History in MT5',
          'Select "Report" → Detailed Statement',
          'Choose HTML format for best parsing',
          'Upload in Hybrid Journal Imports page'
        ]
      }
    },
    'Tradovate': {
      'READONLY_API': {
        title: 'Tradovate API',
        description: 'Connect via Tradovate REST API',
        links: [
          { label: 'Tradovate API Docs', url: 'https://tradovate.github.io/api/' },
          { label: 'Generate Credentials', url: 'https://trader.tradovate.com/' },
          { label: 'API Video Tutorial', url: 'https://www.youtube.com/tradovate' }
        ],
        notes: [
          'Log in to Tradovate web platform',
          'Go to Account Settings → API Access',
          'Create new API credentials (requires 2FA verification)',
          'Select "Read-only" permissions for safety',
          'Copy Access Token immediately (shown once)',
          'Best for: Futures traders using Tradovate'
        ]
      }
    },
    'TradeLocker': {
      'READONLY_API': {
        title: 'TradeLocker API',
        description: 'Modern cloud-based trading platform API',
        links: [
          { label: 'TradeLocker API Docs', url: 'https://tradelocker.com/api' }
        ],
        notes: [
          'Contact your broker for API access',
          'Requires API token from broker dashboard',
          'REST API with WebSocket support',
          'Best for: Brokers using TradeLocker white-label'
        ]
      }
    },
    'Alpaca': {
      'READONLY_API': {
        title: 'Alpaca Trading API',
        description: 'Stock and crypto trading API',
        links: [
          { label: 'Alpaca API Docs', url: 'https://docs.alpaca.markets/' },
          { label: 'Generate API Keys', url: 'https://app.alpaca.markets/paper/dashboard/overview' },
          { label: 'Alpaca API Video', url: 'https://www.youtube.com/alpaca' }
        ],
        notes: [
          'Log in to Alpaca dashboard',
          'Navigate to Paper Trading or Live Trading',
          'Click "Generate New Key" under API Keys',
          'Choose scope: trading (for full access) or data (read-only)',
          'Copy Key ID (API Key) and Secret Key immediately',
          'Best for: Stock and crypto traders in US'
        ]
      }
    },
    'OANDA': {
      'READONLY_API': {
        title: 'OANDA v20 API',
        description: 'Forex and CFD trading API',
        links: [
          { label: 'OANDA API Docs', url: 'https://developer.oanda.com/' },
          { label: 'Generate Token', url: 'https://www.oanda.com/account/tpa/personal_token' }
        ],
        notes: [
          'Log in to OANDA account',
          'Go to Manage API Access → Personal Access Tokens',
          'Generate new token (read or read/write)',
          'Account ID format: XXX-XXX-XXXXXXXX-XXX',
          'Use practice or live environment URL',
          'Best for: Forex traders with OANDA accounts'
        ]
      }
    },
    'Binance': {
      'READONLY_API': {
        title: 'Binance API',
        description: 'Cryptocurrency trading API',
        links: [
          { label: 'Binance API Docs', url: 'https://binance-docs.github.io/apidocs/' },
          { label: 'Create API Key', url: 'https://www.binance.com/en/my/settings/api-management' },
          { label: 'Security Best Practices', url: 'https://www.binance.com/en/support/faq/how-to-create-api-360002502072' }
        ],
        notes: [
          'Log in to Binance → Account → API Management',
          'Create new key → Enable "Read Info" permission only',
          'Save API Key and Secret Key immediately',
          'Optionally restrict by IP address for security',
          'Do NOT enable withdraw/transfer permissions',
          'Best for: Crypto traders on Binance'
        ]
      }
    },
    'NinjaTrader': {
      'STATEMENT_INGEST': {
        title: 'NinjaTrader Reports',
        description: 'Export and upload NinjaTrader trade history',
        links: [
          { label: 'Export Performance Report', url: 'https://ninjatrader.com/support/helpGuides/nt8/export_performance.htm' }
        ],
        notes: [
          'Open NinjaTrader platform',
          'Go to Tools → Performance → Executions',
          'Right-click → Export → CSV format',
          'Include all columns (Entry time, Exit time, P&L, etc.)',
          'Best for: NinjaTrader users without API access'
        ]
      }
    },
    'ThinkorSwim': {
      'STATEMENT_INGEST': {
        title: 'ThinkorSwim (TD Ameritrade)',
        description: 'Import trades from ThinkorSwim platform',
        links: [
          { label: 'Download Account Statement', url: 'https://www.tdameritrade.com/' }
        ],
        notes: [
          'Log in to TD Ameritrade website',
          'Go to My Account → History & Statements',
          'Download Trade History as CSV',
          'Best for: Stock/options traders using ThinkorSwim'
        ]
      }
    }
  };

  const providerDoc = docs[provider]?.[mode];

  if (!providerDoc) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-blue-900 mb-1">{providerDoc.title}</h3>
          <p className="text-sm text-blue-800">{providerDoc.description}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-blue-900">Resources:</p>
          <div className="space-y-1">
            {providerDoc.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {link.download ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-900">Important Notes:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            {providerDoc.notes.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
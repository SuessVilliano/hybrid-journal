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
          { label: 'Create API Application', url: 'https://openapi.ctrader.com/apps' }
        ],
        notes: [
          'Requires broker support for Open API',
          'OAuth2 authentication flow',
          'Read-only access to trade history and account info',
          'Real-time WebSocket updates supported'
        ]
      },
      'WEBHOOK_PUSH': {
        title: 'cTrader Automate (cBots)',
        description: 'Use cTrader Automate to push trade events via webhook',
        links: [
          { label: 'cTrader Automate Guide', url: 'https://help.ctrader.com/ctrader-automate/' },
          { label: 'Download Sample cBot', url: '#', download: true }
        ],
        notes: [
          'Create a cBot that monitors trade events',
          'Send HTTP POST to webhook URL on each trade',
          'Include HMAC signature for security',
          'Works with any cTrader broker'
        ]
      }
    },
    'DXTrade': {
      'READONLY_API': {
        title: 'DXTrade API Integration',
        description: 'Connect using DXTrade REST API',
        links: [
          { label: 'DXTrade API Docs', url: 'https://dx.trade/apis/' },
          { label: 'Request API Access', url: 'https://dx.trade/contact' }
        ],
        notes: [
          'Contact your broker to enable API access',
          'Requires API key and secret from broker',
          'Server URL varies by broker (e.g., api.yourbroker.com)',
          'Polling-based sync (check every 1-5 minutes)'
        ]
      }
    },
    'MT4': {
      'WEBHOOK_PUSH': {
        title: 'MT4 Expert Advisor (EA)',
        description: 'Install EA that sends trade events to Hybrid Journal',
        links: [
          { label: 'Download Hybrid Journal MT4 EA', url: '#', download: true },
          { label: 'MT4 EA Installation Guide', url: 'https://www.mql5.com/en/articles/203' }
        ],
        notes: [
          'Place EA in MetaTrader4/MQL4/Experts folder',
          'Restart MT4 and attach EA to any chart',
          'Enter webhook URL and secret in EA settings',
          'EA runs in background and sends all trade events instantly'
        ]
      }
    },
    'MT5': {
      'WEBHOOK_PUSH': {
        title: 'MT5 Expert Advisor (EA)',
        description: 'Install EA that sends trade events to Hybrid Journal',
        links: [
          { label: 'Download Hybrid Journal MT5 EA', url: '#', download: true },
          { label: 'MT5 EA Installation Guide', url: 'https://www.mql5.com/en/articles/203' }
        ],
        notes: [
          'Place EA in MetaTrader5/MQL5/Experts folder',
          'Restart MT5 and attach EA to any chart',
          'Enter webhook URL and secret in EA settings',
          'Supports all order types and partial fills'
        ]
      }
    },
    'Tradovate': {
      'READONLY_API': {
        title: 'Tradovate API',
        description: 'Connect via Tradovate REST API',
        links: [
          { label: 'Tradovate API Docs', url: 'https://tradovate.github.io/api/' },
          { label: 'Generate API Credentials', url: 'https://trader.tradovate.com/welcome' }
        ],
        notes: [
          'Generate API credentials in Tradovate dashboard',
          'Supports real-time trade sync',
          'WebSocket available for instant updates',
          'Futures-focused platform'
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
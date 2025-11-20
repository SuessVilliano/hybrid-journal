import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SocialFeed() {
  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
                darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
              } bg-clip-text text-transparent`}>
                Trade Hybrid Club
              </h1>
              <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
                Connect with traders, share ideas, and learn together
              </p>
            </div>
            <a 
              href="https://tradehybridclub.app.clientclub.net/communities/groups/trade-hybid-club/home" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </a>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <iframe 
            src="https://tradehybridclub.app.clientclub.net/communities/groups/trade-hybid-club/home"
            className="w-full rounded-xl shadow-2xl"
            style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}
            title="Trade Hybrid Club Community"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
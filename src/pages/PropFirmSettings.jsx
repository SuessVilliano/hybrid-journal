import React from 'react';
import PropFirmSettingsManager from '@/components/risk/PropFirmSettingsManager';

export default function PropFirmSettings() {
  const darkMode = document.documentElement.classList.contains('dark');

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
            Prop Firm Settings
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Configure your prop firm challenge rules and limits
          </p>
        </div>

        <PropFirmSettingsManager />
      </div>
    </div>
  );
}
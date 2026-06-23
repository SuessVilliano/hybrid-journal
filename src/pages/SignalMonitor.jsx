import React from 'react';
import AgentChat from '@/components/agents/AgentChat';

export default function SignalMonitor() {
  const darkMode = document.documentElement.classList.contains('dark');
  return (
    <div className={`min-h-screen p-6 transition-colors ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
      <div className="max-w-5xl mx-auto">
        <AgentChat
          agentName="signal_monitor"
          title="Signal Pipeline Monitor"
          subtitle="I watch your signal pipeline and flag issues early — ask for a full analysis anytime"
          placeholder="Ask for a pipeline health check or signal analysis…"
          quickQuestions={[
            { text: 'Run a pipeline health check', query: 'Run a full signal pipeline health check and report any issues.' },
            { text: 'Any stale or unresolved signals?', query: 'Are there any stale or unresolved signals I should deal with right now?' },
            { text: 'Flag duplicates and missing fields', query: 'Flag any duplicate signals and signals missing key fields like stop loss or take profit.' }
          ]}
        />
      </div>
    </div>
  );
}
import React from 'react';
import AgentChat from '@/components/agents/AgentChat';

export default function DocumentAuditor() {
  const darkMode = document.documentElement.classList.contains('dark');
  return (
    <div className={`min-h-screen p-6 transition-colors ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
      <div className="max-w-5xl mx-auto">
        <AgentChat
          agentName="pdf_auditor"
          title="Document Auditor"
          subtitle="Upload a broker statement or trade file — I'll extract and audit it for accuracy"
          placeholder="Attach a PDF/CSV/Excel statement and ask me to audit it…"
          allowFileUpload
          acceptType=".pdf,.csv,.xlsx,.xls"
          quickQuestions={[
            { text: 'Audit my attached statement', query: 'Please audit the attached document for accurate data extraction and flag any issues.' },
            { text: 'What does a clean import look like?', query: 'What does a clean, accurate trade statement import look like? Which fields matter most?' }
          ]}
        />
      </div>
    </div>
  );
}
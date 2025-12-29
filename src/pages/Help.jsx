import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageCircle, Video, FileText, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Help() {
  const darkMode = document.documentElement.classList.contains('dark');

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
      title: 'Quick Start Guide',
      description: 'Get up and running in 5 minutes',
      action: 'onboarding',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const faqs = [
    {
      q: 'How do I connect my trading account?',
      a: 'Go to Accounts page, click "Add Account", and choose your broker. Follow the connection wizard to sync your trades.'
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
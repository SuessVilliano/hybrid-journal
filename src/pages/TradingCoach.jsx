import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageSquare, Sparkles, TrendingUp, Target, Brain } from 'lucide-react';
import MessageBubble from '@/components/coach/MessageBubble';

export default function TradingCoach() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    initializeConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'trading_coach',
        metadata: {
          name: 'Trading Coach Session',
          description: 'AI coaching session'
        }
      });
      setConversation(conv);
      setMessages(conv.messages || []);

      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages);
        setLoading(false);
      });
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setLoading(false);
    }
  };

  const quickQuestions = [
    { icon: TrendingUp, text: "What's my win rate this month?", query: "What's my win rate this month?" },
    { icon: Target, text: "Why am I losing on EURUSD?", query: "Analyze my EURUSD trades and tell me why I'm losing money on this pair" },
    { icon: Brain, text: "How do emotions affect my trading?", query: "Analyze how my emotions correlate with my trading performance" },
    { icon: Sparkles, text: "Suggest strategy improvements", query: "Based on my trading history, what specific improvements should I make to my strategy?" }
  ];

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className={`text-4xl font-bold ${darkMode ? 'bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent' : 'text-slate-900'}`}>
            AI Trading Coach
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-slate-600'}`}>
            Get personalized guidance based on your trading data
          </p>
        </div>

        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <MessageSquare className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-purple-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Your Personal Trading Coach</h3>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li>✓ Ask questions about your trades and performance</li>
                  <li>✓ Get explanations for AI insights and recommendations</li>
                  <li>✓ Receive personalized strategy improvement guidance</li>
                  <li>✓ Simulate "what-if" scenarios for strategy changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {messages.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickQuestions.map((q, idx) => {
              const Icon = q.icon;
              return (
                <Card key={idx} className={`cursor-pointer hover:shadow-lg transition-all ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}`} onClick={() => {
                  setInput(q.query);
                }}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <span className={darkMode ? 'text-white' : 'text-slate-700'}>{q.text}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className={`h-[600px] flex flex-col ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}`}>
          <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
            <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <MessageSquare className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`} />
              Chat
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageSquare className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                  <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Start a conversation</h3>
                  <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Ask me anything about your trading performance</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))
            )}
            {loading && (
              <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Coach is analyzing your data...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className={`border-t p-4 ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Ask about your trades, strategies, or get advice..."
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={!input.trim() || loading} className={darkMode ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-blue-600 hover:bg-blue-700'}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
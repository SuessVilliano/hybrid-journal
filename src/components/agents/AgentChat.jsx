import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Paperclip, X, Sparkles } from 'lucide-react';
import MessageBubble from '@/components/coach/MessageBubble';

/**
 * Reusable in-app agent conversation panel.
 * Props: agentName, title, subtitle, placeholder, quickQuestions, allowFileUpload, acceptType
 */
export default function AgentChat({
  agentName,
  title,
  subtitle,
  placeholder,
  quickQuestions = [],
  allowFileUpload = false,
  acceptType = '*'
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    (async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: agentName,
          metadata: { name: title, description: subtitle }
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch (e) {
        console.error('Failed to init agent conversation:', e);
      }
    })();
  }, [agentName]);

  useEffect(() => {
    if (!conversation) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    return () => unsub();
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map(async (f) => (await base44.integrations.Core.UploadFile({ file: f })).file_url)
      );
      setAttachedFiles((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if ((!text && attachedFiles.length === 0) || !conversation || loading) return;
    const files = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    setLoading(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: text || (allowFileUpload ? 'Please audit the attached document(s).' : ''),
        file_urls: files.length > 0 ? files : undefined
      });
    } catch (e) {
      console.error('Failed to send message:', e);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl md:text-4xl font-bold ${darkMode ? 'bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent' : 'text-slate-900'}`}>
          {title}
        </h1>
        <p className={`mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-slate-600'}`}>{subtitle}</p>
      </div>

      {messages.length === 0 && quickQuestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickQuestions.map((q, idx) => (
            <Card
              key={idx}
              className={`cursor-pointer hover:shadow-lg transition-all ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}`}
              onClick={() => sendMessage(q.query)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Sparkles className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span className={darkMode ? 'text-white' : 'text-slate-700'}>{q.text}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className={`h-[600px] flex flex-col ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}`}>
        <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
          <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>{title}</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Sparkles className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{placeholder || 'Start a conversation'}</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)
          )}
          {loading && (
            <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Working on it…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className={`border-t p-4 ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((url, i) => (
                <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[160px] truncate">{url.split('/').pop()}</span>
                  <button onClick={() => setAttachedFiles(attachedFiles.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {allowFileUpload && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={acceptType} multiple className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" size="icon">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={placeholder}
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && attachedFiles.length === 0) || loading || !conversation}
              className={darkMode ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-blue-600 hover:bg-blue-700'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
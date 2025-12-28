import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, X, Minimize2, Maximize2, Send, Loader2, Sparkles, Mic, MicOff } from 'lucide-react';
import MessageBubble from '../coach/MessageBubble';

export default function FloatingAIAssistant({ isOpen, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const cardRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && !conversation) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversation) return;
    
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });

    return () => unsubscribe();
  }, [conversation]);

  const initConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: 'master_trading_coach',
        metadata: {
          name: 'AI Trading Assistant',
          description: 'Your personal trading coach'
        }
      });
      setConversation(newConv);
      setMessages(newConv.messages || []);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation) return;

    const userMessage = input;
    setInput('');

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please try Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        width: isMinimized ? '300px' : '400px',
        maxHeight: isMinimized ? 'auto' : '600px'
      }}
      onMouseDown={handleMouseDown}
      className="shadow-2xl"
    >
      <Card className={`${darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white border-cyan-500/40'} flex flex-col h-full`}>
        <CardHeader className={`drag-handle cursor-move border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  AI Trading Coach
                </CardTitle>
                <p className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
                  Always here to help
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '450px' }}>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Hey! I'm your AI Trading Coach
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    I can help with trade analysis, coaching, strategy coding, chart reading, and more!
                  </p>
                  <div className={`mt-4 text-left space-y-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <p>💡 Ask me to analyze your recent trades</p>
                    <p>📊 Get chart analysis and trade ideas</p>
                    <p>🎯 Create custom indicators or strategies</p>
                    <p>📚 Learn trading techniques</p>
                    <p>🧠 Get psychology coaching</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className={`p-4 border-t ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`}>
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={isRecording ? "Listening..." : "Ask me anything about trading..."}
                  className="flex-1 min-h-[60px] max-h-[120px]"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={toggleVoiceRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className="h-[30px] w-[50px]"
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || !conversation}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 h-[30px] w-[50px]"
                  >
                    {conversation && messages[messages.length - 1]?.role === 'user' && !messages[messages.length - 1]?.tool_calls ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {isRecording ? '🎤 Voice recording active' : 'Press Enter to send, Shift+Enter for new line, or use voice'}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Calendar, Brain, Sparkles, Search, Mic, MicOff } from 'lucide-react';
import JournalEntryCard from '@/components/journal/JournalEntryCard';
import { format } from 'date-fns';

export default function Journal() {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    content: '',
    mood_tags: [],
    entry_type: 'thought'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = React.useRef(null);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  React.useEffect(() => {
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
        setNewEntry(prev => ({ ...prev, content: transcript }));
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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => base44.entities.JournalEntry.list('-date', 200)
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.JournalEntry.create({
        ...data,
        date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['journalEntries']);
      setNewEntry({ content: '', mood_tags: [], entry_type: 'thought' });
      setShowNewEntry(false);
    }
  });

  const analyzeSentiment = async () => {
    if (!newEntry.content.trim()) return;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the sentiment and emotional state from this trader's journal entry. Return ONLY a single word: positive, negative, neutral, or mixed.

Entry: "${newEntry.content}"`,
      });

      setNewEntry({ ...newEntry, ai_sentiment: result.toLowerCase() });
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
    }
  };

  const moods = [
    'Confident', 'Anxious', 'Excited', 'Fearful', 'Calm', 'Frustrated',
    'Disciplined', 'Impulsive', 'Focused', 'Distracted', 'Motivated',
    'Tired', 'Stressed', 'Optimistic', 'Doubtful'
  ];

  const toggleMood = (mood) => {
    setNewEntry({
      ...newEntry,
      mood_tags: newEntry.mood_tags.includes(mood)
        ? newEntry.mood_tags.filter(m => m !== mood)
        : [...newEntry.mood_tags, mood]
    });
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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = filterMood === 'all' || 
      entry.mood_tags?.includes(filterMood);
    return matchesSearch && matchesMood;
  });

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const date = format(new Date(entry.date), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Trading Journal
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Track your thoughts, emotions, and insights throughout your trading journey
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <BookOpen className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Why Journal?
                </h3>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Trading is 90% mental. Capture your thoughts before, during, and after trades. Track patterns between your emotional state and performance. Build self-awareness that leads to consistent profitability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!showNewEntry && (
          <Button
            onClick={() => setShowNewEntry(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 h-14"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Journal Entry
          </Button>
        )}

        {showNewEntry && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                New Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  What's on your mind?
                </label>
                <div className="relative">
                  <Textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    placeholder={isRecording ? "🎤 Listening..." : "Write or speak about how you're feeling, an insight you had, a mistake you made, a lesson learned..."}
                    rows={6}
                    className="resize-none pr-14"
                  />
                  <Button
                    type="button"
                    onClick={toggleVoiceRecording}
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className="absolute top-2 right-2"
                    title={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  How are you feeling?
                </label>
                <div className="flex flex-wrap gap-2">
                  {moods.map(mood => (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        newEntry.mood_tags.includes(mood)
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                          : darkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setShowNewEntry(false);
                    setNewEntry({ content: '', mood_tags: [], entry_type: 'thought' });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={analyzeSentiment}
                  disabled={!newEntry.content.trim()}
                  variant="outline"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Sentiment
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newEntry)}
                  disabled={!newEntry.content.trim() || createMutation.isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  {createMutation.isLoading ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              darkMode 
                ? 'bg-slate-950 border-cyan-500/20 text-white' 
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">All Moods</option>
            {moods.map(mood => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto ${
              darkMode ? 'border-cyan-500' : 'border-cyan-600'
            }`}></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardContent className="p-12 text-center">
              <BookOpen className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                No entries yet
              </h3>
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                Start documenting your trading journey and mental state
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedEntries).sort().reverse().map(date => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <h3 className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {groupedEntries[date].map(entry => (
                    <JournalEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
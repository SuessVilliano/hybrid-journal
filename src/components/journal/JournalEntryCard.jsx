import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Edit2, Trash2, Save, X, Sparkles } from 'lucide-react';

export default function JournalEntryCard({ entry }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(entry.content);
  const [editedMoods, setEditedMoods] = useState(entry.mood_tags || []);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.JournalEntry.update(entry.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['journalEntries']);
      setIsEditing(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.JournalEntry.delete(entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['journalEntries']);
    }
  });

  const generateInsights = async () => {
    try {
      const insights = await base44.integrations.Core.InvokeLLM({
        prompt: `As a trading psychology coach, analyze this journal entry and provide 1-2 sentences of constructive insight or advice:

"${entry.content}"

Moods: ${entry.mood_tags?.join(', ') || 'None specified'}

Be supportive, actionable, and focused on trading psychology.`
      });

      updateMutation.mutate({ ai_insights: insights });
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  };

  const moods = [
    'Confident', 'Anxious', 'Excited', 'Fearful', 'Calm', 'Frustrated',
    'Disciplined', 'Impulsive', 'Focused', 'Distracted', 'Motivated',
    'Tired', 'Stressed', 'Optimistic', 'Doubtful'
  ];

  const toggleMood = (mood) => {
    setEditedMoods(
      editedMoods.includes(mood)
        ? editedMoods.filter(m => m !== mood)
        : [...editedMoods, mood]
    );
  };

  const moodColors = {
    Confident: 'bg-green-500/20 text-green-400',
    Anxious: 'bg-yellow-500/20 text-yellow-400',
    Excited: 'bg-blue-500/20 text-blue-400',
    Fearful: 'bg-red-500/20 text-red-400',
    Calm: 'bg-cyan-500/20 text-cyan-400',
    Frustrated: 'bg-orange-500/20 text-orange-400',
    Disciplined: 'bg-purple-500/20 text-purple-400',
    Impulsive: 'bg-pink-500/20 text-pink-400',
    Focused: 'bg-indigo-500/20 text-indigo-400',
    Distracted: 'bg-slate-500/20 text-slate-400',
    Motivated: 'bg-emerald-500/20 text-emerald-400',
    Tired: 'bg-gray-500/20 text-gray-400',
    Stressed: 'bg-red-600/20 text-red-400',
    Optimistic: 'bg-green-400/20 text-green-400',
    Doubtful: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              {format(new Date(entry.date), 'h:mm a')}
            </span>
            {entry.ai_sentiment && (
              <Badge variant="outline" className="text-xs">
                {entry.ai_sentiment}
              </Badge>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-1">
              {!entry.ai_insights && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateInsights}
                  className="h-7 w-7 p-0"
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this journal entry?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="h-7 w-7 p-0 text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              {moods.map(mood => (
                <button
                  key={mood}
                  onClick={() => toggleMood(mood)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    editedMoods.includes(mood)
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(entry.content);
                  setEditedMoods(entry.mood_tags || []);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ content: editedContent, mood_tags: editedMoods })}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-sm mb-3 whitespace-pre-wrap ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {entry.content}
            </p>

            {entry.mood_tags && entry.mood_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {entry.mood_tags.map(mood => (
                  <Badge key={mood} className={moodColors[mood] || 'bg-slate-500/20 text-slate-400'}>
                    {mood}
                  </Badge>
                ))}
              </div>
            )}

            {entry.ai_insights && (
              <div className={`p-3 rounded-lg text-sm ${
                darkMode ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className="flex items-start gap-2">
                  <Sparkles className={`h-4 w-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  <p className={darkMode ? 'text-purple-300' : 'text-purple-900'}>
                    {entry.ai_insights}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
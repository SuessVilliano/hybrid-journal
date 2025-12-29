import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function MindsetWidget() {
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recentJournalEntries'],
    queryFn: async () => {
      const entries = await base44.entities.JournalEntry.list('-date', 3);
      return entries;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.JournalEntry.create({
        content: data,
        date: new Date().toISOString(),
        mood_tags: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recentJournalEntries']);
      setContent('');
      setShowQuickEntry(false);
    }
  });

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 text-sm ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Brain className="h-4 w-4" />
          Mindset Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!showQuickEntry ? (
          <Button
            onClick={() => setShowQuickEntry(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-3 w-3 mr-2" />
            Quick Note
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How are you feeling right now?"
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQuickEntry(false);
                  setContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate(content)}
                disabled={!content.trim() || createMutation.isLoading}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {recentEntries.length > 0 && (
          <div className="space-y-2 mt-4">
            <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Recent Notes
            </div>
            {recentEntries.map(entry => (
              <div
                key={entry.id}
                className={`text-xs p-2 rounded-lg ${
                  darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}
              >
                <div className={`font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {format(new Date(entry.date), 'h:mm a')}
                </div>
                <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {entry.content.slice(0, 80)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
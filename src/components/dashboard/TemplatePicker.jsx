import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Bookmark, Star, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatePicker({ onTemplateChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['tradingTemplates', user?.email],
    queryFn: async () => {
      const all = await base44.entities.TradingTemplate.list('-created_date', 50);
      return all.filter(t => t.creator_email === user?.email || t.is_shared);
    },
    enabled: !!user
  });

  const { data: activeTemplate } = useQuery({
    queryKey: ['activeTemplate', user?.email],
    queryFn: async () => {
      const all = await base44.entities.TradingTemplate.list('-created_date', 50);
      const userTemplates = all.filter(t => t.creator_email === user?.email || t.is_shared);
      return userTemplates.find(t => t.is_default) || userTemplates[0] || null;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (activeTemplate && onTemplateChange) {
      onTemplateChange(activeTemplate);
    }
  }, [activeTemplate, onTemplateChange]);

  const setDefaultMutation = useMutation({
    mutationFn: async (templateId) => {
      // Unset all user's templates as default first
      const userTemplates = templates.filter(t => t.creator_email === user?.email);
      for (const t of userTemplates) {
        if (t.is_default && t.id !== templateId) {
          await base44.entities.TradingTemplate.update(t.id, { is_default: false });
        }
      }
      // Set the selected one
      return base44.entities.TradingTemplate.update(templateId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingTemplates', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['activeTemplate', user?.email] });
      toast.success('Default template updated');
      setIsOpen(false);
    },
    onError: (error) => toast.error('Failed to set default: ' + error.message)
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          darkMode
            ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700 border border-cyan-500/20'
            : 'bg-white text-cyan-700 hover:bg-cyan-50 border border-cyan-500/30'
        }`}
      >
        <Bookmark className="h-4 w-4" />
        <span className="max-w-[120px] truncate">
          {isLoading ? 'Loading...' : activeTemplate?.name || 'No Template'}
        </span>
        {activeTemplate?.is_default && (
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full mt-2 right-0 w-64 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto ${
            darkMode ? 'bg-slate-900 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'
          }`}>
            <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`text-xs font-semibold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                Trading Templates
              </p>
            </div>
            <div className="p-2 space-y-1">
              {templates.length === 0 ? (
                <p className={`text-xs text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  No templates yet. Create one in Trading Bible.
                </p>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDefaultMutation.mutate(t.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition ${
                      activeTemplate?.id === t.id
                        ? darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
                        : darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Bookmark className="h-3 w-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t.symbol} · {t.bible_name || 'No Bible'}
                      </p>
                    </div>
                    {t.is_default && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                    {activeTemplate?.id === t.id && !t.is_default && (
                      <Check className="h-3 w-3 text-cyan-500 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
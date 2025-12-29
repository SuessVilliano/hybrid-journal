import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, Sparkles, Loader2, Mic, MicOff, Upload, X, Image as ImageIcon } from 'lucide-react';
import ImageViewer from '@/components/media/ImageViewer';

export default function MonthlyPlanForm({ existingPlan }) {
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');
  const [isRecording, setIsRecording] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [chartScreenshots, setChartScreenshots] = useState(existingPlan?.chart_screenshots || []);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const fileInputRef = React.useRef(null);

  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    month: currentMonth,
    month_start_date: monthStart,
    month_end_date: monthEnd,
    plan_text: '',
    voice_transcript: '',
    chart_screenshots: [],
    big_picture_thesis: '',
    monthly_goals: {
      profit_target: 0,
      max_drawdown: 0,
      min_win_rate: 50,
      max_trades: 0,
      skill_development_goals: [],
      consistency_target: ''
    },
    strategy_focus: [],
    instruments_universe: [],
    key_market_drivers: [],
    challenges_to_overcome: [],
    learning_objectives: [],
    risk_parameters: {
      max_daily_loss: 0,
      max_weekly_loss: 0,
      max_position_size: 0,
      risk_per_trade: 1
    },
    status: 'planned'
  });

  useEffect(() => {
    if (existingPlan) {
      setFormData(existingPlan);
    }
  }, [existingPlan]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setAiProcessing(true);
    try {
      const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });

      const transcription = await base44.integrations.Core.InvokeLLM({
        prompt: `Transcribe this voice recording of a trader's monthly plan. Return only the transcribed text.`,
        file_urls: [file_url]
      });

      setFormData({ ...formData, plan_text: transcription, voice_transcript: transcription });
    } catch (error) {
      alert('Failed to transcribe audio.');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingScreenshot(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      });

      const urls = await Promise.all(uploadPromises);
      setChartScreenshots([...chartScreenshots, ...urls]);
    } catch (error) {
      alert('Failed to upload screenshots');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const removeScreenshot = (url) => {
    setChartScreenshots(chartScreenshots.filter(s => s !== url));
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const saveData = { ...data, chart_screenshots: chartScreenshots };
      if (existingPlan) {
        return base44.entities.MonthlyTradePlan.update(existingPlan.id, saveData);
      } else {
        return base44.entities.MonthlyTradePlan.create(saveData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthlyPlans']);
      alert('Monthly plan saved!');
    }
  });

  const generateAISummary = async () => {
    try {
      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this monthly trading plan, generate a concise, motivational summary (2-3 sentences):
        
Big Picture: ${formData.big_picture_thesis}
Goals: Profit target ${formData.monthly_goals.profit_target}, Win rate ${formData.monthly_goals.min_win_rate}%
Strategy Focus: ${formData.strategy_focus.join(', ')}
Challenges: ${formData.challenges_to_overcome.join(', ')}
        
Make it encouraging and strategic.`
      });
      setFormData({ ...formData, ai_summary: summary });
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    }
  };

  const addToList = (field, value) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), value.trim()]
      });
    }
  };

  const removeFromList = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  return (
    <>
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
          {existingPlan ? 'Edit' : 'Create'} Monthly Plan - {new Date(monthStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Big Picture Thesis *
          </label>
          <Textarea
            value={formData.big_picture_thesis}
            onChange={(e) => setFormData({ ...formData, big_picture_thesis: e.target.value })}
            placeholder="What's your macro market outlook for this month? Key themes, trends, and expectations..."
            rows={4}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Detailed Plan
          </label>
          <Textarea
            value={formData.plan_text}
            onChange={(e) => setFormData({ ...formData, plan_text: e.target.value })}
            placeholder="Your detailed monthly trading plan..."
            rows={6}
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              disabled={aiProcessing}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Record Voice Plan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Chart Screenshots */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <ImageIcon className="h-4 w-4 inline mr-1" />
            Chart Screenshots
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleScreenshotUpload}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingScreenshot}
            variant="outline"
            size="sm"
            className="mb-3"
          >
            {uploadingScreenshot ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Charts
              </>
            )}
          </Button>
          {chartScreenshots.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {chartScreenshots.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={url}
                    alt="Chart"
                    className="w-full h-32 object-cover rounded-lg border-2 border-cyan-500/30 cursor-pointer hover:border-cyan-500 transition-colors"
                    onClick={() => setViewingImage(url)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScreenshot(url);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Monthly Profit Target ($)
            </label>
            <Input
              type="number"
              value={formData.monthly_goals.profit_target}
              onChange={(e) => setFormData({
                ...formData,
                monthly_goals: { ...formData.monthly_goals, profit_target: parseFloat(e.target.value) }
              })}
              placeholder="5000"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Minimum Win Rate (%)
            </label>
            <Input
              type="number"
              value={formData.monthly_goals.min_win_rate}
              onChange={(e) => setFormData({
                ...formData,
                monthly_goals: { ...formData.monthly_goals, min_win_rate: parseFloat(e.target.value) }
              })}
              placeholder="50"
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Strategy Focus
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add strategy (e.g., Breakout Trading, Range Trading)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addToList('strategy_focus', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.strategy_focus?.map((item, idx) => (
              <span key={idx} className={`px-3 py-1 rounded-lg text-sm ${
                darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
              }`}>
                {item}
                <button onClick={() => removeFromList('strategy_focus', idx)} className="ml-2">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Challenges to Overcome
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add challenge (e.g., Overtrading, FOMO)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addToList('challenges_to_overcome', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.challenges_to_overcome?.map((item, idx) => (
              <span key={idx} className={`px-3 py-1 rounded-lg text-sm ${
                darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
              }`}>
                {item}
                <button onClick={() => removeFromList('challenges_to_overcome', idx)} className="ml-2">×</button>
              </span>
            ))}
          </div>
        </div>

        {formData.ai_summary && (
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-bold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
              AI Summary
            </h4>
            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-900'}`}>
              {formData.ai_summary}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={generateAISummary}
            variant="outline"
            disabled={!formData.big_picture_thesis}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Summary
          </Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.plan_text || saveMutation.isLoading}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            {saveMutation.isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveMutation.isLoading ? 'Saving...' : 'Save Monthly Plan'}
          </Button>
        </div>
      </CardContent>
    </Card>
    {viewingImage && (
      <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
    )}
    </>
  );
}
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Sparkles, Loader2, Plus, X, Target, Layers, CheckCircle2, Upload, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RiskCalculator from '@/components/risk/RiskCalculator';
import PropFirmRulesCard from '@/components/risk/PropFirmRulesCard';
import LinkTradesToPlan from '@/components/planning/LinkTradesToPlan';
import ImageViewer from '@/components/media/ImageViewer';
import { useAchievements } from '@/components/gamification/useAchievements';
import AchievementNotification from '@/components/gamification/AchievementNotification';

export default function DailyPlanForm({ existingPlan, onClose, onSuccess }) {
  const { triggerAchievement, notification, clearNotification } = useAchievements();
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(existingPlan || {
    date: new Date().toISOString().split('T')[0],
    account_ids: [],
    plan_text: '',
    voice_transcript: '',
    checklist_items: [
      { item: 'Review market conditions', completed: false },
      { item: 'Check economic calendar', completed: false },
      { item: 'Set daily risk limit', completed: false }
    ],
    trading_rules: [],
    markets_to_watch: [],
    max_trades: null,
    max_risk: null,
    max_risk_percent_per_trade: 1,
    instrument_type_planned: 'Futures',
    timeframes_planned: [],
    max_daily_loss: null,
    max_daily_loss_percent: 5,
    trailing_drawdown_percent: 10,
    target_entry_price: null,
    target_stop_loss: null,
    target_take_profit: null,
    position_size_calculated: null,
    monetary_risk_calculated: null,
    linked_strategy_ids: [],
    linked_goal_ids: [],
    linked_trade_ids: [],
    status: 'planned'
  });

  const [newRule, setNewRule] = useState('');
  const [newMarket, setNewMarket] = useState('');
  const [chartScreenshots, setChartScreenshots] = useState(existingPlan?.chart_screenshots || []);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const fileInputRef = useRef(null);

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list('-created_date', 50)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'In Progress' }, '-created_date', 50)
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list('-created_date', 50)
  });

  const selectedAccounts = accounts.filter(acc => formData.account_ids?.includes(acc.id));
  const accountBalance = selectedAccounts.reduce((sum, acc) => sum + (acc.initial_balance || 0), 0);

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
      console.error('Microphone access error:', error);
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
        prompt: `Transcribe this voice recording of a trader's daily plan. Return only the transcribed text.`,
        file_urls: [file_url]
      });

      setVoiceTranscript(transcription);
      setFormData({ ...formData, plan_text: transcription, voice_transcript: transcription });
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try typing your plan.');
    } finally {
      setAiProcessing(false);
    }
  };

  const generateAIAnalysis = async () => {
    if (!formData.plan_text) {
      alert('Please enter or record your plan first');
      return;
    }

    setAiProcessing(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this trading plan AND the uploaded chart screenshots to provide comprehensive feedback:

WRITTEN PLAN:
${formData.plan_text}

PLAN DETAILS:
- Rules: ${formData.trading_rules.join(', ') || 'None specified'}
- Markets: ${formData.markets_to_watch.join(', ') || 'None specified'}
- Max trades: ${formData.max_trades || 'Not set'}
- Max risk: ${formData.max_risk ? '$' + formData.max_risk : 'Not set'}

${chartScreenshots.length > 0 ? `
CHART ANALYSIS (${chartScreenshots.length} screenshot(s) attached):
Review the uploaded TradingView charts and analyze:
1. Support/resistance levels marked
2. Entry/exit zones identified
3. Risk management (stop loss, take profit placement)
4. Chart patterns and technical setups
5. Does the chart align with the written plan?
6. Are there any additional opportunities or risks visible on the chart?

Provide feedback that incorporates BOTH the written plan AND the visual chart analysis.
` : 'No charts uploaded. Encourage the trader to upload chart screenshots for more detailed feedback.'}

Provide:
1. A friendly, encouraging summary (2-3 sentences) that references both plan and charts
2. A clarity score from 0-100 (how clear and actionable is the plan?)
3. 2-3 helpful suggestions to improve the plan (include chart-specific feedback if available)`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            clarity_score: { type: "number" },
            suggestions: { type: "array", items: { type: "string" } }
          }
        },
        file_urls: chartScreenshots.length > 0 ? chartScreenshots : undefined
      });

      setFormData({
        ...formData,
        ai_summary: analysis.summary,
        clarity_score: analysis.clarity_score,
        ai_suggestions: analysis.suggestions
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('AI analysis failed. You can still save your plan.');
    } finally {
      setAiProcessing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingPlan?.id) {
        return base44.entities.DailyTradePlan.update(existingPlan.id, data);
      }
      return base44.entities.DailyTradePlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dailyTradePlans']);
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMutation.mutateAsync({ ...formData, chart_screenshots: chartScreenshots });
    
    // Trigger achievement update for new plans
    if (!existingPlan) {
      await triggerAchievement('plan');
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
      console.error('Upload failed:', error);
      alert('Failed to upload screenshots');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const removeScreenshot = (url) => {
    setChartScreenshots(chartScreenshots.filter(s => s !== url));
  };

  const addRule = () => {
    if (newRule && !formData.trading_rules.includes(newRule)) {
      setFormData({ ...formData, trading_rules: [...formData.trading_rules, newRule] });
      setNewRule('');
    }
  };

  const removeRule = (rule) => {
    setFormData({ ...formData, trading_rules: formData.trading_rules.filter(r => r !== rule) });
  };

  const addMarket = () => {
    if (newMarket && !formData.markets_to_watch.includes(newMarket)) {
      setFormData({ ...formData, markets_to_watch: [...formData.markets_to_watch, newMarket] });
      setNewMarket('');
    }
  };

  const removeMarket = (market) => {
    setFormData({ ...formData, markets_to_watch: formData.markets_to_watch.filter(m => m !== market) });
  };

  const toggleChecklistItem = (index) => {
    const updated = [...formData.checklist_items];
    updated[index].completed = !updated[index].completed;
    setFormData({ ...formData, checklist_items: updated });
  };

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={`p-4 rounded-lg border ${
        darkMode ? 'bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-cyan-500/30' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-cyan-500" />
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Your Daily Trading Plan
          </h3>
        </div>
        <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
          Set your intentions, track your preparation, and review your execution
        </p>
      </div>

      {/* Plan Input */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          What's your plan for today?
        </label>
        <Textarea
          value={formData.plan_text}
          onChange={(e) => setFormData({ ...formData, plan_text: e.target.value })}
          placeholder="Write or record your trading plan... What markets will you watch? What setups are you looking for? What's your mindset?"
          rows={5}
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
          <Button
            type="button"
            onClick={generateAIAnalysis}
            disabled={aiProcessing || !formData.plan_text}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
            size="sm"
          >
            {aiProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Insights
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
              Upload TradingView Charts
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

      {/* AI Analysis Results */}
      {formData.ai_summary && (
        <Card className={darkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI Coach says:</span>
              </div>
              <Badge className={`${
                formData.clarity_score >= 80 ? 'bg-green-500' :
                formData.clarity_score >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              } text-white`}>
                Clarity: {formData.clarity_score}%
              </Badge>
            </div>
            <p className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>
              {formData.ai_summary}
            </p>
            {formData.ai_suggestions?.length > 0 && (
              <div className="space-y-1">
                <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Suggestions:
                </div>
                {formData.ai_suggestions.map((suggestion, idx) => (
                  <div key={idx} className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    • {suggestion}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pre-Market Checklist */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Pre-Market Checklist
        </label>
        <div className="space-y-2">
          {formData.checklist_items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                darkMode ? 'bg-slate-900 border-cyan-500/20' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleChecklistItem(idx)}
                className={`flex-shrink-0 ${item.completed ? 'text-green-500' : darkMode ? 'text-slate-600' : 'text-slate-400'}`}
              >
                <CheckCircle2 className={`h-5 w-5 ${item.completed && 'fill-current'}`} />
              </button>
              <span className={`text-sm ${
                item.completed 
                  ? darkMode ? 'text-slate-500 line-through' : 'text-slate-400 line-through'
                  : darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {item.item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trading Rules */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Today's Rules
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
              placeholder="e.g., Max 3 trades"
              className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
            />
            <Button type="button" onClick={addRule} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {formData.trading_rules.map((rule, idx) => (
              <div key={idx} className={`flex items-center justify-between p-2 rounded text-sm ${
                darkMode ? 'bg-slate-900' : 'bg-slate-50'
              }`}>
                <span className={darkMode ? 'text-white' : 'text-slate-900'}>{rule}</span>
                <button type="button" onClick={() => removeRule(rule)} className="text-red-500 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Markets to Watch */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Markets to Watch
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newMarket}
              onChange={(e) => setNewMarket(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMarket())}
              placeholder="e.g., EURUSD, NQ"
              className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
            />
            <Button type="button" onClick={addMarket} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.markets_to_watch.map((market, idx) => (
              <Badge key={idx} className="bg-cyan-600">
                {market}
                <button type="button" onClick={() => removeMarket(market)} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Account Selection */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Trading Accounts (Select Multiple for Copy Trading)
        </label>
        <div className="flex flex-wrap gap-2">
          {accounts.map(acc => (
            <Badge
              key={acc.id}
              variant={formData.account_ids?.includes(acc.id) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                formData.account_ids?.includes(acc.id) 
                  ? 'bg-cyan-600 text-white' 
                  : (darkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200')
              }`}
              onClick={() => {
                const currentIds = formData.account_ids || [];
                setFormData(prev => ({
                  ...prev,
                  account_ids: currentIds.includes(acc.id)
                    ? currentIds.filter(id => id !== acc.id)
                    : [...currentIds, acc.id]
                }));
              }}
            >
              {acc.name} - ${acc.initial_balance?.toFixed(0) || 0}
            </Badge>
          ))}
        </div>
      </div>

      {/* Risk Management Section */}
      {formData.account_ids && formData.account_ids.length > 0 && (
        <div className="space-y-4">
          <RiskCalculator
            accountBalance={accountBalance}
            onCalculationComplete={(result) => {
              setFormData({
                ...formData,
                position_size_calculated: result.positionSize,
                monetary_risk_calculated: result.monetaryRisk
              });
            }}
            initialValues={formData}
          />

          {selectedAccounts.filter(acc => acc.account_type === 'Prop Firm').map(acc => (
            <PropFirmRulesCard
              key={acc.id}
              accountBalance={acc.initial_balance || 0}
              todaysPnl={0}
              onRulesChange={(rules) => {
                setFormData(prev => ({ ...prev, ...rules }));
              }}
              initialRules={formData}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Max Trades Today
          </label>
          <Input
            type="number"
            value={formData.max_trades || ''}
            onChange={(e) => setFormData({ ...formData, max_trades: parseInt(e.target.value) || null })}
            placeholder="e.g., 5"
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Timeframes
          </label>
          <Input
            value={formData.timeframes_planned?.join(', ') || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              timeframes_planned: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            })}
            placeholder="e.g., 5m, 15m, 1h"
            className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
          />
        </div>
      </div>

      {/* Link Strategies & Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.length > 0 && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Layers className="h-4 w-4 inline mr-1" />
              Strategies I'll Use
            </label>
            <div className="space-y-1">
              {strategies.slice(0, 5).map((strategy) => (
                <label key={strategy.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.linked_strategy_ids.includes(strategy.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, linked_strategy_ids: [...formData.linked_strategy_ids, strategy.id] });
                      } else {
                        setFormData({ ...formData, linked_strategy_ids: formData.linked_strategy_ids.filter(id => id !== strategy.id) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{strategy.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {goals.length > 0 && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Target className="h-4 w-4 inline mr-1" />
              Goals I'm Working On
            </label>
            <div className="space-y-1">
              {goals.slice(0, 5).map((goal) => (
                <label key={goal.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  darkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.linked_goal_ids.includes(goal.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, linked_goal_ids: [...formData.linked_goal_ids, goal.id] });
                      } else {
                        setFormData({ ...formData, linked_goal_ids: formData.linked_goal_ids.filter(id => id !== goal.id) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{goal.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link Trades to Plan */}
      {existingPlan && (
        <LinkTradesToPlan
          dailyPlanId={existingPlan.id}
          initialLinkedTradeIds={formData.linked_trade_ids}
          onLinkedTradesChange={(newTradeIds) => setFormData(prev => ({ ...prev, linked_trade_ids: newTradeIds }))}
        />
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveMutation.isPending || !formData.plan_text} className="bg-gradient-to-r from-cyan-500 to-purple-600">
          {saveMutation.isPending ? 'Saving...' : existingPlan ? 'Update Plan' : 'Save Plan'}
        </Button>
      </div>
      </form>
      {viewingImage && (
      <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
      )}
      
      {notification && (
        <AchievementNotification
          badge={notification.badge}
          xpGained={notification.xpGained}
          onClose={clearNotification}
        />
      )}
      </>
      );
      }
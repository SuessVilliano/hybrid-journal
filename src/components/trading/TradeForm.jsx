import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { autoPopulateTradeFields, detectInstrumentType } from './AITradeHelper';
import TemplateSelector from './TemplateSelector';

export default function TradeForm({ trade, onSubmit, onCancel }) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(!trade);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState(trade || {
    symbol: '',
    platform: 'DXTrade',
    instrument_type: 'Forex',
    side: 'Long',
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: '',
    entry_price: '',
    exit_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    commission: 0,
    swap: 0,
    pnl: '',
    strategy: '',
    notes: '',
    emotion_before: 'Calm',
    emotion_after: '',
    followed_rules: true,
    tags: []
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState({
    entryReasons: [],
    exitReasons: [],
    sentiment: null,
    category: null
  });
  const [newTag, setNewTag] = useState('');

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list('-created_date', 100)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['tradeTemplates'],
    queryFn: () => base44.entities.TradeTemplate.filter({ is_active: true }, '-created_date', 100)
  });

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate && !trade) {
      const defaults = selectedTemplate.default_fields || {};
      setFormData(prev => ({
        ...prev,
        ...defaults,
        entry_date: new Date().toISOString().slice(0, 16),
        template_id: selectedTemplate.id
      }));
    }
  }, [selectedTemplate, trade]);

  // Auto-detect instrument type when symbol changes
  const handleSymbolChange = (value) => {
    const updates = { symbol: value };
    if (value) {
      updates.instrument_type = detectInstrumentType(value);
    }
    setFormData({ ...formData, ...updates });
  };

  // AI Auto-populate
  const handleAIAutoPopulate = async () => {
    if (!formData.symbol || !formData.entry_price) {
      alert('Please enter at least Symbol and Entry Price to use AI assistance');
      return;
    }

    setAiLoading(true);
    try {
      const updates = await autoPopulateTradeFields(formData, strategies);
      setFormData({ ...formData, ...updates });
    } catch (error) {
      console.error('AI auto-populate error:', error);
      alert('AI assistance failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate P&L if not provided
    let calculatedPnl = parseFloat(formData.pnl) || 0;
    if (!calculatedPnl && formData.entry_price && formData.exit_price && formData.quantity) {
      const entry = parseFloat(formData.entry_price);
      const exit = parseFloat(formData.exit_price);
      const qty = parseFloat(formData.quantity);
      const direction = formData.side === 'Long' ? 1 : -1;
      calculatedPnl = ((exit - entry) * direction * qty) - (parseFloat(formData.commission) || 0) - (parseFloat(formData.swap) || 0);
    }

    onSubmit({
      ...formData,
      pnl: calculatedPnl,
      entry_price: parseFloat(formData.entry_price) || 0,
      exit_price: parseFloat(formData.exit_price) || 0,
      quantity: parseFloat(formData.quantity) || 0,
      stop_loss: parseFloat(formData.stop_loss) || null,
      take_profit: parseFloat(formData.take_profit) || null,
      commission: parseFloat(formData.commission) || 0,
      swap: parseFloat(formData.swap) || 0
    });
  };

  const darkMode = document.documentElement.classList.contains('dark');

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  const getTemplatePrompt = (field) => {
    if (!selectedTemplate?.analysis_prompts) return '';
    return selectedTemplate.analysis_prompts[field] || '';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-slate-950 border border-cyan-500/20' : 'bg-white'
      }`}>
        <div className={`sticky top-0 border-b p-6 flex justify-between items-center z-10 ${
          darkMode ? 'bg-slate-950 border-cyan-500/20' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            {showTemplateSelector && !trade && (
              <button
                type="button"
                onClick={onCancel}
                className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
              >
                <X className="h-6 w-6" />
              </button>
            )}
            {!showTemplateSelector && !trade && (
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {trade ? 'Edit Trade' : showTemplateSelector ? 'Select Template' : selectedTemplate ? selectedTemplate.name : 'Add New Trade'}
            </h2>
          </div>
          {!showTemplateSelector && (
            <button onClick={onCancel} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}>
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {showTemplateSelector && !trade ? (
          <div className="p-6">
            <TemplateSelector
              templates={templates}
              onSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* AI Assistant Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-slate-900">AI Trade Assistant</p>
                  <p className="text-sm text-slate-600">Auto-populate strategy, notes, emotions, and more</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAIAutoPopulate}
                disabled={aiLoading || !formData.symbol || !formData.entry_price}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-Fill with AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Symbol *</label>
              <Input
                value={formData.symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                placeholder="EURUSD, NQ, BTC/USD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
              <Select value={formData.platform} onValueChange={(val) => setFormData({...formData, platform: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DXTrade">DXTrade</SelectItem>
                  <SelectItem value="cTrader">cTrader</SelectItem>
                  <SelectItem value="MatchTrader">MatchTrader</SelectItem>
                  <SelectItem value="Rithmic">Rithmic</SelectItem>
                  <SelectItem value="MT4">MetaTrader 4</SelectItem>
                  <SelectItem value="MT5">MetaTrader 5</SelectItem>
                  <SelectItem value="Tradovate">Tradovate</SelectItem>
                  <SelectItem value="NinjaTrader">NinjaTrader</SelectItem>
                  <SelectItem value="TradingView">TradingView</SelectItem>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Instrument Type
                <span className="ml-2 text-xs text-purple-600">✨ Auto-detected</span>
              </label>
              <Select value={formData.instrument_type} onValueChange={(val) => setFormData({...formData, instrument_type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Forex">Forex</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="Stocks">Stocks</SelectItem>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="CFD">CFD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Side</label>
              <Select value={formData.side} onValueChange={(val) => setFormData({...formData, side: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entry & Exit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entry Date & Time *</label>
              <Input
                type="datetime-local"
                value={formData.entry_date}
                onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exit Date & Time</label>
              <Input
                type="datetime-local"
                value={formData.exit_date}
                onChange={(e) => setFormData({...formData, exit_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entry Price</label>
              <Input
                type="number"
                step="any"
                value={formData.entry_price}
                onChange={(e) => setFormData({...formData, entry_price: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exit Price</label>
              <Input
                type="number"
                step="any"
                value={formData.exit_price}
                onChange={(e) => setFormData({...formData, exit_price: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity/Lots</label>
              <Input
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">P&L *</label>
              <Input
                type="number"
                step="any"
                value={formData.pnl}
                onChange={(e) => setFormData({...formData, pnl: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Risk Management */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stop Loss</label>
              <Input
                type="number"
                step="any"
                value={formData.stop_loss}
                onChange={(e) => setFormData({...formData, stop_loss: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Take Profit</label>
              <Input
                type="number"
                step="any"
                value={formData.take_profit}
                onChange={(e) => setFormData({...formData, take_profit: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Commission</label>
              <Input
                type="number"
                step="any"
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Strategy & Psychology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Strategy
                <span className="ml-2 text-xs text-purple-600">✨ AI-suggested</span>
              </label>
              <Input
                value={formData.strategy}
                onChange={(e) => setFormData({...formData, strategy: e.target.value})}
                placeholder="Breakout, Scalping, Swing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Emotion Before Trade
                <span className="ml-2 text-xs text-purple-600">✨ AI-analyzed</span>
              </label>
              <Select value={formData.emotion_before} onValueChange={(val) => setFormData({...formData, emotion_before: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confident">Confident</SelectItem>
                  <SelectItem value="Anxious">Anxious</SelectItem>
                  <SelectItem value="Calm">Calm</SelectItem>
                  <SelectItem value="Excited">Excited</SelectItem>
                  <SelectItem value="Fearful">Fearful</SelectItem>
                  <SelectItem value="Impatient">Impatient</SelectItem>
                  <SelectItem value="Disciplined">Disciplined</SelectItem>
                  <SelectItem value="Impulsive">Impulsive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.exit_price && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emotion After Trade
                  <span className="ml-2 text-xs text-purple-600">✨ AI-analyzed</span>
                </label>
                <Select value={formData.emotion_after} onValueChange={(val) => setFormData({...formData, emotion_after: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select emotion..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confident">Confident</SelectItem>
                    <SelectItem value="Anxious">Anxious</SelectItem>
                    <SelectItem value="Calm">Calm</SelectItem>
                    <SelectItem value="Excited">Excited</SelectItem>
                    <SelectItem value="Satisfied">Satisfied</SelectItem>
                    <SelectItem value="Regretful">Regretful</SelectItem>
                    <SelectItem value="Disciplined">Disciplined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Notes
              <span className="ml-2 text-xs text-purple-600">✨ AI-generated</span>
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder={getTemplatePrompt('notes') || "What was your reasoning? What went well? What could be improved?"}
              rows={4}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
            />
          </div>

          {/* Template-specific Analysis Prompts */}
          {selectedTemplate && (
            <>
              {selectedTemplate.analysis_prompts?.pre_trade_plan && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Pre-Trade Plan
                  </label>
                  <Textarea
                    value={formData.pre_trade_plan || ''}
                    onChange={(e) => setFormData({...formData, pre_trade_plan: e.target.value})}
                    placeholder={selectedTemplate.analysis_prompts.pre_trade_plan}
                    rows={3}
                    className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
                  />
                </div>
              )}

              {formData.exit_price && selectedTemplate.analysis_prompts?.post_trade_review && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Post-Trade Review
                  </label>
                  <Textarea
                    value={formData.post_trade_review || ''}
                    onChange={(e) => setFormData({...formData, post_trade_review: e.target.value})}
                    placeholder={selectedTemplate.analysis_prompts.post_trade_review}
                    rows={3}
                    className={darkMode ? 'bg-slate-900 border-cyan-500/30 text-white' : ''}
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
            <Button type="button" variant="outline" onClick={onCancel} className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
              {trade ? 'Update Trade' : 'Save Trade'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
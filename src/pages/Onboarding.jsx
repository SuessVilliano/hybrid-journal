import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    preferred_name: '',
    timezone: 'America/New_York',
    location: '',
    trader_type: '',
    experience_level: '',
    primary_markets: [],
    primary_goals: [],
    trading_session: [],
    risk_tolerance: '',
    account_size: '',
    strategies: [],
    main_challenges: [],
    prop_firm_trader: false,
    prop_firm_name: '',
    ai_coaching_preferences: {
      proactive_alerts: true,
      rule_enforcement: true,
      performance_feedback: true,
      emotional_check_ins: true
    },
    notification_preferences: {
      rule_violations: true,
      milestone_achievements: true,
      daily_reminders: true,
      risk_warnings: true
    }
  });
  const [customInput, setCustomInput] = useState('');

  const totalSteps = 8;
  const progress = (step / totalSteps) * 100;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      try {
        // Create trader profile with cleaned data
        const profileData = {
          onboarding_completed: true,
          preferred_name: data.preferred_name || '',
          timezone: data.timezone || 'America/New_York',
          location: data.location || '',
          trader_type: data.trader_type || '',
          experience_level: data.experience_level || '',
          primary_markets: data.primary_markets || [],
          primary_goals: data.primary_goals || [],
          trading_session: data.trading_session || [],
          risk_tolerance: data.risk_tolerance || '',
          account_size: data.account_size || '',
          strategies: data.strategies || [],
          main_challenges: data.main_challenges || [],
          prop_firm_trader: data.prop_firm_trader || false,
          prop_firm_name: data.prop_firm_name || '',
          ai_coaching_preferences: data.ai_coaching_preferences || {
            proactive_alerts: true,
            rule_enforcement: true,
            performance_feedback: true,
            emotional_check_ins: true
          },
          notification_preferences: data.notification_preferences || {
            rule_violations: true,
            milestone_achievements: true,
            daily_reminders: true,
            risk_warnings: true
          }
        };

        await base44.entities.TraderProfile.create(profileData);
        
        return { success: true };
      } catch (error) {
        console.error('Profile creation error:', error);
        throw new Error('Failed to save profile: ' + error.message);
      }
    },
    onSuccess: () => {
      // Small delay to ensure data is saved
      setTimeout(() => {
        window.location.href = createPageUrl('PlatformTour');
      }, 500);
    }
  });

  const toggleSelection = (field, value) => {
    const current = formData[field];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(v => v !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  const addCustomItem = (field) => {
    if (customInput.trim()) {
      setFormData({ ...formData, [field]: [...formData[field], customInput.trim()] });
      setCustomInput('');
    }
  };

  const handleComplete = () => {
    saveMutation.mutate(formData);
  };

  const timezones = [
    'America/New_York', 'America/Chicago', 'America/Los_Angeles', 
    'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Tokyo', 'Asia/Singapore', 'Asia/Dubai',
    'Australia/Sydney', 'Pacific/Auckland'
  ];

  const steps = [
    {
      title: "Let's get to know you!",
      description: "Help us personalize your experience",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              What should we call you?
            </label>
            <Input
              value={formData.preferred_name}
              onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
              placeholder="Your preferred name..."
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Where are you located?
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City, Country"
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Your timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full p-3 rounded-lg bg-slate-900/50 border border-cyan-500/20 text-white"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      )
    },
    {
      title: "What's your trading style?",
      description: "Help us understand how you trade",
      content: (
        <div className="space-y-3">
          {['Day Trader', 'Swing Trader', 'Scalper', 'Position Trader', 'Algorithmic Trader', 'Beginner'].map((type) => (
            <button
              key={type}
              onClick={() => setFormData({ ...formData, trader_type: type })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                formData.trader_type === type
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
              }`}
            >
              <div className="font-medium">{type}</div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: "What's your experience level?",
      description: "This helps us calibrate our guidance",
      content: (
        <div className="space-y-3">
          {['Beginner (0-6 months)', 'Intermediate (6 months - 2 years)', 'Advanced (2-5 years)', 'Expert (5+ years)'].map((level) => (
            <button
              key={level}
              onClick={() => setFormData({ ...formData, experience_level: level })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                formData.experience_level === level
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "What markets do you trade?",
      description: "Select all that apply",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {['Forex', 'Futures', 'Stocks', 'Options', 'Crypto', 'CFDs'].map((market) => (
            <button
              key={market}
              onClick={() => toggleSelection('primary_markets', market)}
              className={`p-4 rounded-lg transition-all ${
                formData.primary_markets.includes(market)
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
              }`}
            >
              {market}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "What are your main goals?",
      description: "Tell us what you're working towards",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {['Pass a prop firm challenge', 'Build consistent income', 'Grow account size', 'Improve win rate', 'Master risk management', 'Reduce emotional trading'].map((goal) => (
              <button
                key={goal}
                onClick={() => toggleSelection('primary_goals', goal)}
                className={`p-3 rounded-lg text-left transition-all ${
                  formData.primary_goals.includes(goal)
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add custom goal..."
              onKeyPress={(e) => e.key === 'Enter' && addCustomItem('primary_goals')}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <Button onClick={() => addCustomItem('primary_goals')} variant="outline">Add</Button>
          </div>
        </div>
      )
    },
    {
      title: "What's your risk tolerance?",
      description: "How much do you risk per trade?",
      content: (
        <div className="space-y-3">
          {['Conservative (0.5-1% per trade)', 'Moderate (1-2% per trade)', 'Aggressive (2-3% per trade)', 'Very Aggressive (3%+ per trade)'].map((risk) => (
            <button
              key={risk}
              onClick={() => setFormData({ ...formData, risk_tolerance: risk })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                formData.risk_tolerance === risk
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "What strategies do you use?",
      description: "Help us understand your approach",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['Breakouts', 'Pullbacks', 'Reversals', 'Trend Following', 'Mean Reversion', 'News Trading', 'Price Action', 'Technical Indicators'].map((strategy) => (
              <button
                key={strategy}
                onClick={() => toggleSelection('strategies', strategy)}
                className={`p-3 rounded-lg transition-all ${
                  formData.strategies.includes(strategy)
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
                }`}
              >
                {strategy}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Add custom strategy..."
              onKeyPress={(e) => e.key === 'Enter' && addCustomItem('strategies')}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <Button onClick={() => addCustomItem('strategies')} variant="outline">Add</Button>
          </div>
        </div>
      )
    },
    {
      title: "AI Coaching Preferences",
      description: "How would you like our AI to help you?",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { key: 'proactive_alerts', label: 'Proactive Alerts', desc: 'Get notified before potential mistakes' },
              { key: 'rule_enforcement', label: 'Rule Enforcement', desc: 'Alert me when I break my trading rules' },
              { key: 'performance_feedback', label: 'Performance Feedback', desc: 'Daily insights on my trading performance' },
              { key: 'emotional_check_ins', label: 'Emotional Check-ins', desc: 'Monitor and improve emotional discipline' }
            ].map((pref) => (
              <button
                key={pref.key}
                onClick={() => setFormData({
                  ...formData,
                  ai_coaching_preferences: {
                    ...formData.ai_coaching_preferences,
                    [pref.key]: !formData.ai_coaching_preferences[pref.key]
                  }
                })}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  formData.ai_coaching_preferences[pref.key]
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-slate-900/50 border border-cyan-500/20 text-white hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{pref.label}</div>
                    <div className="text-sm opacity-80">{pref.desc}</div>
                  </div>
                  {formData.ai_coaching_preferences[pref.key] && <Check className="h-5 w-5" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full bg-slate-950/80 border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Welcome to Hybrid Journal
                </h1>
                <p className="text-sm text-slate-400">Let's personalize your experience</p>
              </div>
            </div>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Step {step} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <CardTitle className="text-2xl text-white mb-2">{steps[step - 1].title}</CardTitle>
            <p className="text-slate-400">{steps[step - 1].description}</p>
          </div>

          {steps[step - 1].content}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="border-cyan-500/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {step === totalSteps ? (
              <Button
                onClick={handleComplete}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 min-w-[180px]"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
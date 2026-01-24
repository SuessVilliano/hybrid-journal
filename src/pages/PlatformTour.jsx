import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, ArrowRight, ArrowLeft, Check, LayoutDashboard, BookOpen, 
  Target, BarChart3, Layers, TrendingUp, MessageSquare, Brain,
  Bell, Upload, Link as LinkIcon, Play, Trophy
} from 'lucide-react';
import { createPageUrl } from '../utils';

export default function PlatformTour() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const totalSteps = 7;
  const progress = ((step + 1) / totalSteps) * 100;

  const tourSteps = [
    {
      icon: LayoutDashboard,
      title: "Welcome to Your Trading Command Center",
      description: "Your Dashboard is mission control - track performance, view equity curves, and get AI-powered insights all in one place.",
      features: [
        "Real-time P&L tracking across all accounts",
        "Interactive performance charts",
        "Daily/Weekly/Monthly summaries",
        "Quick access to recent trades and signals"
      ],
      page: 'Dashboard'
    },
    {
      icon: Target,
      title: "Trade Plans: Your Secret Weapon",
      description: "Professional traders plan before they trade. Create daily, weekly, and monthly plans with voice input and chart screenshots.",
      features: [
        "Voice-to-text planning (speak your plan!)",
        "Upload TradingView screenshots",
        "AI analyzes your plan clarity",
        "Link trades to plans for accountability"
      ],
      page: 'TradePlans'
    },
    {
      icon: BookOpen,
      title: "Trade Journal: Log & Learn",
      description: "Every trade tells a story. Our AI-powered journal helps you identify patterns, mistakes, and winning strategies.",
      features: [
        "Quick trade entry with templates",
        "Emotion tracking (before/during/after)",
        "AI pattern analysis",
        "Screenshot attachments"
      ],
      page: 'Trades'
    },
    {
      icon: Zap,
      title: "Live Trading Signals",
      description: "Receive real-time signals from your favorite providers. AI analyzes each signal and can auto-route to your broker.",
      features: [
        "Webhook integration (TradingView, Telegram)",
        "AI signal analysis and filtering",
        "Browser notifications with custom sounds",
        "One-click execution or AI routing"
      ],
      page: 'LiveTradingSignals'
    },
    {
      icon: Brain,
      title: "Your AI Trading Coach",
      description: "Meet your 24/7 trading coach. It knows your trades, your goals, and your challenges. Ask it anything!",
      features: [
        "Proactive alerts when you break rules",
        "Performance feedback and insights",
        "Emotional check-ins",
        "Daily briefs and trade suggestions"
      ],
      page: 'TradingCoach'
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Go beyond basic metrics. Understand your edge with deep performance analytics.",
      features: [
        "Win rate by instrument, time, strategy",
        "Profit factor and expectancy",
        "Risk-adjusted returns",
        "AI-generated performance reports"
      ],
      page: 'Analytics'
    },
    {
      icon: Trophy,
      title: "Gamification & Growth",
      description: "Level up as a trader! Earn badges, track streaks, and compete with yourself.",
      features: [
        "Achievement system with XP and levels",
        "Daily trading streaks",
        "Performance milestones",
        "Share your stats (optional)"
      ],
      page: 'Achievements'
    }
  ];

  const currentStep = tourSteps[step];
  const Icon = currentStep.icon;

  const handleFinish = () => {
    navigate(createPageUrl('Dashboard'));
  };

  const handleSkip = () => {
    navigate(createPageUrl('Dashboard'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full bg-slate-950/80 border-cyan-500/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Platform Tour
                </h1>
                <p className="text-sm text-slate-400">
                  Step {step + 1} of {totalSteps}
                </p>
              </div>
            </div>
            <Button onClick={handleSkip} variant="ghost" className="text-slate-400">
              Skip Tour
            </Button>
          </div>

          <Progress value={progress} className="h-2 mb-8" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-2xl mb-4">
              <Icon className="h-10 w-10 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              {currentStep.title}
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              {currentStep.description}
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-6 mb-8 border border-cyan-500/20">
            <h3 className="text-sm font-medium text-cyan-400 mb-4 uppercase tracking-wide">
              Key Features:
            </h3>
            <div className="space-y-3">
              {currentStep.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="border-cyan-500/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step === totalSteps - 1 ? (
              <Button
                onClick={handleFinish}
                className="bg-gradient-to-r from-cyan-500 to-purple-600"
              >
                Start Trading
                <Zap className="h-4 w-4 ml-2" />
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

          <div className="mt-8 flex justify-center gap-2">
            {tourSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === step 
                    ? 'w-8 bg-cyan-500' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
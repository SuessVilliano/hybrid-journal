import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Clock, Target, Ban, RefreshCw, Brain, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function QQEBriefingView({ briefing, darkMode }) {
  if (!briefing) return null;

  const biasConfig = {
    'LONG': { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'LONG' },
    'SHORT': { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'SHORT' },
    'NEUTRAL': { icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'NEUTRAL' }
  };

  const bias = biasConfig[briefing.directional_bias] || biasConfig['NEUTRAL'];
  const BiasIcon = bias.icon;

  const gradeColor = {
    'A': 'bg-green-500', 'B': 'bg-cyan-500', 'C': 'bg-yellow-500', 'F': 'bg-red-500'
  }[briefing.session_grade] || 'bg-gray-500';

  const templateColors = {
    'Fed Pivot': 'bg-blue-500',
    'Inflation Scare': 'bg-red-500',
    'Tech Earnings Crush': 'bg-purple-500',
    'Liquidity Crisis': 'bg-red-700',
    'Normal Market': 'bg-gray-500'
  };

  return (
    <div className="space-y-4">
      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>SESSION SCORE</div>
            <div className="text-3xl font-bold text-cyan-500">{briefing.sessionScore}/14</div>
            <Badge className={`${gradeColor} text-white mt-1`}>Grade {briefing.session_grade}</Badge>
          </CardContent>
        </Card>
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>DIRECTIONAL BIAS</div>
            <div className={`text-3xl font-bold ${bias.color} flex items-center justify-center gap-2`}>
              <BiasIcon className="h-7 w-7" />
              {bias.label}
            </div>
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Conviction: <span className="font-semibold">{briefing.conviction}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>REGIME TEMPLATE</div>
            <Badge className={`${templateColors[briefing.template?.template] || 'bg-gray-500'} text-white text-sm`}>
              {briefing.template?.template || 'Normal Market'}
            </Badge>
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Confidence: <span className="font-semibold">{briefing.template?.confidence}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 text-center">
            <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>VIX REGIME</div>
            <div className="text-2xl font-bold text-orange-500">{briefing.macro?.vix?.toFixed(1)}</div>
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {briefing.macro && getVixRegime(briefing.macro.vix)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cause Analysis — The WHY */}
      <Card className={`${darkMode ? 'bg-gradient-to-br from-purple-950/50 to-slate-950/80 border-purple-500/30' : 'bg-gradient-to-br from-purple-50 to-white border-purple-200'}`}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-purple-500" />
            <h3 className={`font-bold text-sm md:text-base ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
              THE "WHY" TODAY — Cause Analysis
            </h3>
          </div>
          <p className={`text-sm md:text-base leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {briefing.cause_analysis}
          </p>
          {briefing.template?.reasoning && (
            <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-white/60'}`}>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span className="font-semibold">Template Logic:</span> {briefing.template.reasoning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Plan */}
      {briefing.trade_plan && (
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-cyan-500" />
              <h3 className={`font-bold text-sm md:text-base ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                Trade Plan
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PlanRow label="Primary Setup" value={briefing.trade_plan.primary_setup} darkMode={darkMode} />
              <PlanRow label="Entry Window" value={briefing.trade_plan.entry_window} darkMode={darkMode} icon={Clock} />
              <PlanRow label="Key Level" value={briefing.trade_plan.key_level} darkMode={darkMode} highlight />
              <PlanRow label="Entry Trigger" value={briefing.trade_plan.entry_trigger} darkMode={darkMode} />
              <PlanRow label="Stop Loss" value={briefing.trade_plan.stop_loss} darkMode={darkMode} danger />
              <PlanRow label="TP1 (50% off)" value={briefing.trade_plan.tp1} darkMode={darkMode} success />
              <PlanRow label="TP2 (trail rest)" value={briefing.trade_plan.tp2} darkMode={darkMode} success />
              <PlanRow label="Position Size" value={briefing.trade_plan.position_size} darkMode={darkMode} />
              <PlanRow label="R:R Ratio" value={briefing.trade_plan.rr_ratio} darkMode={darkMode} highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avoid & Invalidation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {briefing.avoid_list && briefing.avoid_list.length > 0 && (
          <Card className={`${darkMode ? 'bg-red-950/30 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="h-5 w-5 text-red-500" />
                <h3 className={`font-bold text-sm ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Avoid Today</h3>
              </div>
              <ul className="space-y-2">
                {briefing.avoid_list.map((item, idx) => (
                  <li key={idx} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="text-red-500 mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {briefing.invalidation && (
          <Card className={`${darkMode ? 'bg-orange-950/30 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className={`font-bold text-sm ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>Invalidation</h3>
              </div>
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Bias flips if: <span className="font-semibold">{briefing.invalidation}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Briefing Markdown */}
      {briefing.markdown && (
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-cyan-500" />
              <h3 className={`font-bold text-sm md:text-base ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                Full QQE Daily Briefing
              </h3>
            </div>
            <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''} 
              ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <ReactMarkdown>{briefing.markdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanRow({ label, value, darkMode, icon: Icon, highlight, danger, success }) {
  if (!value) return null;
  const valueColor = danger ? 'text-red-500' : success ? 'text-green-500' : highlight ? 'text-cyan-500' : darkMode ? 'text-white' : 'text-slate-900';
  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
      <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {Icon && <Icon className="h-3 w-3 inline mr-1" />}
        {label}
      </div>
      <div className={`text-sm font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function getVixRegime(vix) {
  if (vix < 12) return 'Extreme Complacency';
  if (vix < 16) return 'Normal Low Vol';
  if (vix < 20) return 'Elevated';
  if (vix < 25) return 'High';
  if (vix < 30) return 'Very High';
  if (vix < 35) return 'Extreme Fear';
  return 'Panic';
}
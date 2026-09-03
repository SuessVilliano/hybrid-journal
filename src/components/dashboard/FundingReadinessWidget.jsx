import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Target, TrendingUp, Database, ArrowRight } from 'lucide-react';
import { calculateFundingReadiness } from '@/lib/fundingReadiness';

export default function FundingReadinessWidget({ trades = [], traderProfile = null }) {
  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const readiness = useMemo(() => calculateFundingReadiness(trades, traderProfile), [trades, traderProfile]);

  const statusClass = readiness.status === 'ready'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : readiness.status === 'close'
      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      : readiness.status === 'developing'
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-slate-500/15 text-slate-400 border-slate-500/30';

  const cardClass = darkMode
    ? 'bg-slate-950/80 border-cyan-500/20'
    : 'bg-white/90 border-cyan-500/30';

  return (
    <Card className={cardClass}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            Funding Readiness
          </CardTitle>
          <Badge variant="outline" className={statusClass}>{readiness.level}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
          <div className="text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-8 border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
              <div>
                <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{readiness.score}</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>/ 100</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{readiness.headline}</h3>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{readiness.description}</p>
          </div>
        </div>

        {readiness.metrics && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Edge" value={readiness.metrics.edge} icon={TrendingUp} darkMode={darkMode} />
            <Metric label="Risk" value={readiness.metrics.risk} icon={Target} darkMode={darkMode} />
            <Metric label="Data Trust" value={readiness.metrics.provenance} icon={Database} darkMode={darkMode} />
            <Metric label="Verified" value={readiness.metrics.verifiedRate} suffix="%" icon={ShieldCheck} darkMode={darkMode} />
          </div>
        )}

        <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className={`mb-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>What Hybrid sees</div>
          <ul className={`space-y-1.5 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {readiness.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Next best action</div>
            <div className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{readiness.nextActions[0]}</div>
          </div>

          {readiness.status === 'ready' && (
            <a href="https://hybridfunding.co" target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                Explore Funding <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, suffix = '', icon: Icon, darkMode }) {
  return (
    <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}{suffix}</div>
    </div>
  );
}

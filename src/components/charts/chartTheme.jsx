import React, { useState, useEffect } from 'react';

/**
 * Shared chart theming utilities so every chart stays consistent,
 * dark-mode aware, and avoids duplicating the observer/tooltip boilerplate.
 */

export function useChartDarkMode() {
  const [darkMode, setDarkMode] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return darkMode;
}

export const chartCard = (dark) =>
  dark
    ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20'
    : 'bg-white/80 backdrop-blur-xl border-cyan-500/30';

export const chartTitle = (dark) => (dark ? 'text-cyan-400' : 'text-cyan-700');

export const axisProps = (dark) => ({
  stroke: dark ? '#64748b' : '#94a3b8',
  style: { fontSize: '11px' },
  tickLine: false,
  axisLine: false,
});

export const gridProps = (dark) => ({
  strokeDasharray: '3 6',
  stroke: dark ? '#1e293b' : '#e2e8f0',
  vertical: false,
});

export const BRAND = ['#22d3ee', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

/**
 * Glassmorphic tooltip. Pass `dark` + optional `valueFormatter(p)`.
 * Usage: <Tooltip content={<GlassTooltip dark={dm} valueFormatter={(p) => `$${p.value.toFixed(2)}`} />} />
 */
export function GlassTooltip({ active, payload, label, dark, valueFormatter, titleFormatter, showLabel = true }) {
  if (!active || !payload || !payload.length) return null;
  const title = titleFormatter ? titleFormatter(payload) : label;
  return (
    <div className={`px-3 py-2 rounded-lg border backdrop-blur-xl shadow-xl text-xs min-w-[130px] ${
      dark ? 'bg-slate-900/90 border-cyan-500/30 text-white' : 'bg-white/90 border-cyan-500/20 text-slate-900'
    }`}>
      {showLabel && title != null && title !== '' && (
        <div className={`font-semibold mb-1 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{title}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill || p.fill || '#22d3ee' }} />
            <span className={dark ? 'text-slate-400' : 'text-slate-500'}>{p.name}</span>
          </span>
          <span className="font-semibold">
            {valueFormatter ? valueFormatter(p) : (typeof p.value === 'number' ? p.value : String(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Reusable SVG glow filter definition. */
export function GlowFilter({ id = 'chartGlow', stdDeviation = 4 }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={stdDeviation} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
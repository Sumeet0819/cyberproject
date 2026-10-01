'use client';

import React, { useState, useEffect, useId } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, History, 
  Calendar, ShieldCheck, Award, Zap, ChevronRight 
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

export interface HistoryItem {
  id: string;
  score: number;
  grade: string;
  created_at: string;
  findings_count?: number;
}

interface ScoreHistoryChartProps {
  history: HistoryItem[];
}

export default function ScoreHistoryChart({ history }: ScoreHistoryChartProps) {
  const [mounted, setMounted] = useState(false);
  const [rangeFilter, setRangeFilter] = useState<'ALL' | '10' | '5'>('ALL');
  const gradientId = useId().replace(/:/g, '');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!history || history.length === 0) return null;

  // Chronological order (oldest to newest)
  const sorted = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const totalScans = sorted.length;
  const latest = sorted[sorted.length - 1];
  const baseline = sorted[0];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  // Metrics
  const deltaVsPrevious = previous ? latest.score - previous.score : 0;
  const deltaVsBaseline = latest.score - baseline.score;
  const allScores = sorted.map((s) => s.score);
  const peakScore = Math.max(...allScores);
  const lowestScore = Math.min(...allScores);
  const avgScore = Math.round(allScores.reduce((acc, v) => acc + v, 0) / allScores.length);

  // Apply Range Filter
  const filteredData = React.useMemo(() => {
    if (rangeFilter === '5') return sorted.slice(-5);
    if (rangeFilter === '10') return sorted.slice(-10);
    return sorted;
  }, [sorted, rangeFilter]);

  // Chart data formatted for Recharts
  const chartData = filteredData.map((item, idx) => {
    const d = new Date(item.created_at);
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Find item's original index in sorted
    const originalIndex = sorted.findIndex((s) => s.id === item.id);
    const prevItem = originalIndex > 0 ? sorted[originalIndex - 1] : null;
    const delta = prevItem ? item.score - prevItem.score : 0;

    return {
      ...item,
      formattedDate,
      formattedTime,
      fullDateTime: `${formattedDate}, ${formattedTime}`,
      delta,
      scanNumber: originalIndex + 1
    };
  });

  const getStrokeColor = (score: number) => {
    if (score >= 90) return '#10b981'; // Emerald
    if (score >= 70) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  const getGradeVariant = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'B':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'C':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
  };

  const currentColor = getStrokeColor(latest.score);

  // Custom Glassmorphism Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const scoreColor = getStrokeColor(data.score);
      const isPositive = data.delta > 0;
      const isNegative = data.delta < 0;

      return (
        <div className="bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-md rounded-xl p-3.5 min-w-[210px] text-xs font-mono space-y-2.5 z-50 pointer-events-none">
          <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-sans font-medium">{data.fullDateTime}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
              Scan #{data.scanNumber}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-muted-foreground text-xs">Security Score:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight" style={{ color: scoreColor }}>
                {data.score}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getGradeVariant(data.grade)}`}>
                Grade {data.grade}
              </span>
            </div>
          </div>

          {data.scanNumber > 1 && (
            <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
              <span className="text-muted-foreground">Velocity:</span>
              <span className={`font-semibold flex items-center gap-1 ${
                isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-zinc-400'
              }`}>
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                {isPositive ? `+${data.delta} pts` : isNegative ? `${data.delta} pts` : '0 pts'}
              </span>
            </div>
          )}

          {typeof data.findings_count === 'number' && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Issues Logged:</span>
              <span className="font-semibold text-foreground">{data.findings_count}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom node dot
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const color = getStrokeColor(payload.score);
    const isLatest = payload.id === latest.id;

    return (
      <g key={`dot-${payload.id || payload.scanNumber}`}>
        {isLatest && (
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={color}
            fillOpacity={0.2}
            className="animate-ping"
          />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isLatest ? 5.5 : 4}
          fill="#09090b"
          stroke={color}
          strokeWidth={isLatest ? 2.5 : 2}
        />
      </g>
    );
  };

  // Active hover node
  const renderActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const color = getStrokeColor(payload.score);

    return (
      <g key={`active-dot-${payload.id || payload.scanNumber}`}>
        <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.2} />
        <circle cx={cx} cy={cy} r={6} fill="#09090b" stroke={color} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={2.5} fill={color} />
      </g>
    );
  };

  // Y domain dynamic calculation
  const minDataScore = Math.min(...chartData.map((d) => d.score));
  const yDomainMin = Math.max(0, Math.floor((minDataScore - 15) / 10) * 10);

  return (
    <div className="border border-border/50 bg-card/40 backdrop-blur-sm rounded-xl p-5 space-y-5 shadow-xs">
      {/* HEADER WITH CONTROLS AND STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                Security Score Evolution
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/40">
                {totalScans} {totalScans === 1 ? 'audit' : 'audits'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-sans mt-0.5">
              Historical audit trendline, performance trajectory, and remediation velocity
            </p>
          </div>
        </div>

        {/* METRICS CHIPS & RANGE FILTER */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Velocity Badge */}
          {previous && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded border ${
              deltaVsPrevious > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : deltaVsPrevious < 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-muted/40 text-muted-foreground border-border/40'
            }`}>
              {deltaVsPrevious > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : deltaVsPrevious < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>{deltaVsPrevious > 0 ? `+${deltaVsPrevious}` : deltaVsPrevious} pts</span>
            </div>
          )}

          {/* Quick Stats Pill (Peak / Avg) */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-muted/20 rounded border border-border/40 text-[11px] font-mono text-muted-foreground">
            <span>Peak: <strong className="text-foreground">{peakScore}</strong></span>
            <span className="text-border/80">|</span>
            <span>Avg: <strong className="text-foreground">{avgScore}</strong></span>
          </div>

          {/* Filter Range (if > 5 scans) */}
          {totalScans > 5 && (
            <div className="flex items-center p-0.5 bg-muted/30 rounded border border-border/40 text-xs font-mono">
              <button
                onClick={() => setRangeFilter('5')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  rangeFilter === '5'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                5
              </button>
              <button
                onClick={() => setRangeFilter('10')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  rangeFilter === '10'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                10
              </button>
              <button
                onClick={() => setRangeFilter('ALL')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  rangeFilter === 'ALL'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CHART CONTAINER */}
      {totalScans === 1 ? (
        <div className="py-8 px-4 text-center text-xs text-muted-foreground font-mono border border-dashed border-border/60 rounded-xl bg-muted/5 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-1">
            <Award className="w-3.5 h-3.5" />
            <span className="font-semibold">Baseline Audit Established</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            Current Score: <strong style={{ color: currentColor }}>{latest.score}/100</strong> (Grade {latest.grade})
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Periodic scheduled scans and manual re-scans will plot your security drift, remediation velocity, and compliance trajectory over time.
          </p>
        </div>
      ) : (
        <div className="pt-2">
          {!mounted ? (
            <div className="h-[220px] w-full rounded-xl bg-muted/10 animate-pulse border border-border/30" />
          ) : (
            <div className="h-[220px] w-full select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={currentColor} stopOpacity={0.00} />
                    </linearGradient>
                  </defs>

                  {/* Clean subtle grid lines */}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="stroke-muted-foreground/10"
                  />

                  {/* Target benchmark line at 90 (Grade A) */}
                  <ReferenceLine
                    y={90}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: 'Target 90 (Grade A)',
                      position: 'top',
                      fill: '#10b981',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      opacity: 0.6
                    }}
                  />

                  <XAxis
                    dataKey="formattedDate"
                    tickLine={false}
                    axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
                    tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}
                    dy={8}
                    minTickGap={20}
                  />

                  <YAxis
                    domain={[yDomainMin, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontFamily: 'monospace', opacity: 0.6 }}
                    ticks={[yDomainMin, Math.round((yDomainMin + 100) / 2), 100]}
                  />

                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: currentColor, strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }} />

                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={currentColor}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    dot={renderCustomDot}
                    activeDot={renderActiveDot}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* FOOTER SUMMARY STRIP */}
      {totalScans > 1 && (
        <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground font-mono gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>
              Baseline: <strong className="text-foreground">{baseline.score} pts</strong>
              {' '}&rarr;{' '}
              Current: <strong style={{ color: currentColor }}>{latest.score} pts</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Net Change:</span>
            <span className={`font-semibold ${
              deltaVsBaseline > 0 ? 'text-emerald-500' : deltaVsBaseline < 0 ? 'text-rose-500' : 'text-muted-foreground'
            }`}>
              {deltaVsBaseline > 0 ? `+${deltaVsBaseline} pts improvement` : deltaVsBaseline < 0 ? `${deltaVsBaseline} pts regression` : '0 pts drift'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

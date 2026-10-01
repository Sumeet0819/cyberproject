'use client';

import React from 'react';
import { 
  CheckCircle2, AlertTriangle, ArrowUpRight, TrendingUp, 
  TrendingDown, Minus, ShieldCheck, ShieldAlert 
} from 'lucide-react';

export interface DriftData {
  hasPreviousScan: boolean;
  previousReportId?: string;
  previousCreatedAt?: string;
  previousScore?: number;
  currentScore: number;
  scoreDelta: number;
  gradeChanged: boolean;
  previousGrade?: string;
  currentGrade: string;
  resolvedFindings: Array<{ check_id: string; title: string }>;
  newRegressions: Array<{ check_id: string; title: string; severity: string }>;
  persistentFindings: Array<{ check_id: string; title: string }>;
  summary: string;
}

interface ScanDriftCardProps {
  drift: DriftData | null;
}

export default function ScanDriftCard({ drift }: ScanDriftCardProps) {
  if (!drift || !drift.hasPreviousScan) {
    return null;
  }

  const { scoreDelta, resolvedFindings, newRegressions, summary, previousCreatedAt } = drift;

  const prevDate = previousCreatedAt 
    ? new Date(previousCreatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Previous Scan';

  return (
    <div className="border border-border/50 bg-card/40 backdrop-blur-sm rounded-xl p-5 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted/40 text-foreground border border-border/40">
            {scoreDelta >= 0 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Security Drift &amp; Remediation Delta
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Compared against baseline from {prevDate}
            </p>
          </div>
        </div>

        {/* DELTA BADGE */}
        <div className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded border ${
          scoreDelta > 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : scoreDelta < 0
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            : 'bg-muted/30 text-muted-foreground border-border/40'
        }`}>
          {scoreDelta > 0 ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : scoreDelta < 0 ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span>{scoreDelta > 0 ? `+${scoreDelta} Posture Improvement` : scoreDelta < 0 ? `${scoreDelta} Posture Regression` : 'Posture Maintained'}</span>
        </div>
      </div>

      {/* SUMMARY */}
      <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-normal">
        {summary}
      </p>

      {/* TWO COLUMN BREAKDOWN: RESOLVED VS NEW REGRESSIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* RESOLVED FINDINGS */}
        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase font-mono text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved Deficits ({resolvedFindings.length})</span>
          </div>

          {resolvedFindings.length === 0 ? (
            <p className="text-[11px] text-muted-foreground font-mono">
              No previously failing checks were resolved in this scan.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {resolvedFindings.map((f, i) => (
                <li key={i} className="text-xs flex items-center gap-2 text-foreground/90 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{f.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* NEW REGRESSIONS */}
        <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase font-mono text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>New Regressions ({newRegressions.length})</span>
          </div>

          {newRegressions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground font-mono">
              Zero new vulnerabilities or regressions introduced.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {newRegressions.map((f, i) => (
                <li key={i} className="text-xs flex items-center justify-between gap-2 text-foreground/90 font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">{f.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 shrink-0">
                    {f.severity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

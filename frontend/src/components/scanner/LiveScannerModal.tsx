'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Lock, Mail, Server, FileCode, Sparkles, 
  Terminal, CheckCircle2, AlertTriangle, Loader2, X, ArrowRight, 
  Radio, ShieldAlert, BarChart2, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { scannerSocket, ScanSocketMessage } from '@/lib/socketClient';

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  domain: string;
  onScanComplete?: (report: any) => void;
}

interface StepState {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  stage: 'pending' | 'running' | 'complete' | 'error';
  message: string;
  detail?: string;
}

const INITIAL_STEPS: StepState[] = [
  {
    id: 'ssrf',
    title: 'SSRF & Egress Shield',
    category: 'Network Sandbox',
    icon: Radio,
    stage: 'pending',
    message: 'Validating domain and resolving public IP...',
  },
  {
    id: 'https-availability',
    title: 'SSL/TLS & Certificates',
    category: 'Transport Security',
    icon: Lock,
    stage: 'pending',
    message: 'Evaluating HTTPS negotiation and SSL expiry...',
  },
  {
    id: 'security-headers',
    title: 'Security Headers Audit',
    category: 'Browser Defenses',
    icon: ShieldCheck,
    stage: 'pending',
    message: 'Auditing HSTS, CSP, and framing protections...',
  },
  {
    id: 'dns-security',
    title: 'Email Spoofing & DNS',
    category: 'Domain Authentication',
    icon: Mail,
    stage: 'pending',
    message: 'Querying SPF, DMARC, CAA, and DNSSEC...',
  },
  {
    id: 'tech-detection',
    title: 'Technology Fingerprint',
    category: 'Surface Exposure',
    icon: Server,
    stage: 'pending',
    message: 'Detecting web server and CMS software versions...',
  },
  {
    id: 'exposed-files',
    title: 'Exposed Sensitive Files',
    category: 'Data Leakage',
    icon: FileCode,
    stage: 'pending',
    message: 'Probing for leaked .env, .git, and backup archives...',
  },
  {
    id: 'scoring',
    title: 'Threat Scoring Engine',
    category: 'Risk Analysis',
    icon: BarChart2,
    stage: 'pending',
    message: 'Applying bounded deduction threat algorithm...',
  },
  {
    id: 'ai-remediation',
    title: 'Gemini AI Synthesis',
    category: 'Remediation Intelligence',
    icon: Sparkles,
    stage: 'pending',
    message: 'Formulating actionable fix roadmap...',
  },
];

export default function LiveScannerModal({
  isOpen,
  onClose,
  websiteId,
  domain,
  onScanComplete,
}: LiveScannerModalProps) {
  const router = useRouter();
  const cleanWebsiteId = (Array.isArray(websiteId) ? websiteId[0] : websiteId || '').trim();
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<{ time: string; text: string; type?: 'info' | 'success' | 'warn' | 'error' }[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [completedReport, setCompletedReport] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [targetIp, setTargetIp] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const websiteIdRef = useRef(cleanWebsiteId);
  const onScanCompleteRef = useRef(onScanComplete);
  const scanTriggeredRef = useRef(false);

  useEffect(() => {
    websiteIdRef.current = cleanWebsiteId;
  }, [cleanWebsiteId]);

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  }, [onScanComplete]);

  // Timer
  useEffect(() => {
    if (!isOpen || !isScanning) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isScanning]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // WebSocket Subscription - stays alive as long as modal is open
  useEffect(() => {
    if (!isOpen) return;

    console.log('[LiveScannerModal] Subscribing listener for websiteId:', websiteIdRef.current);

    const unsubscribe = scannerSocket.subscribe((msg: ScanSocketMessage) => {
      console.log('[LiveScannerModal] Event received:', msg);

      // Verify websiteId if provided on the message
      if ('websiteId' in msg && msg.websiteId) {
        const msgWebId = String(msg.websiteId).trim().toLowerCase();
        const targetId = (websiteIdRef.current || '').toLowerCase();
        if (targetId && msgWebId !== targetId) {
          console.log(`[LiveScannerModal] Event skipped for other websiteId: ${msgWebId} !== ${targetId}`);
          return;
        }
      }

      const currentTime = new Date().toLocaleTimeString();

      switch (msg.type) {
        case 'CONNECTED': {
          setLogs((prev) => [
            ...prev,
            { time: currentTime, text: `WebSocket authenticated as ${msg.user.email}`, type: 'info' }
          ]);
          break;
        }

        case 'SCAN_START': {
          setLogs((prev) => [
            ...prev,
            { time: currentTime, text: `Target container spawned. Beginning outbound security probes...`, type: 'info' }
          ]);
          break;
        }

        case 'SCAN_PROGRESS': {
          const { stepId, stage, message, progressPercent: pct, metadata, findingsCount } = msg;

          if (typeof pct === 'number' && pct > 0) {
            setProgressPercent((prev) => Math.max(prev, pct));
          }

          if (metadata?.targetIp) {
            setTargetIp(metadata.targetIp);
          }

          // Update corresponding step and any previous steps
          setSteps((prev) => {
            const activeIdx = prev.findIndex((s) => s.id === stepId);
            return prev.map((step, idx) => {
              if (step.id === stepId) {
                return {
                  ...step,
                  stage: stage === 'COMPLETE' ? 'complete' : stage === 'ERROR' ? 'error' : 'running',
                  detail: findingsCount !== undefined ? `${findingsCount} findings` : step.detail
                };
              }
              // Progress earlier steps to complete if later step has begun
              if (activeIdx > -1 && idx < activeIdx && step.stage === 'pending') {
                return { ...step, stage: 'complete' };
              }
              return step;
            });
          });

          setLogs((prev) => [
            ...prev,
            {
              time: currentTime,
              text: message,
              type: stage === 'COMPLETE' ? 'success' : stage === 'ERROR' ? 'error' : 'info'
            }
          ]);
          break;
        }

        case 'SCAN_COMPLETE': {
          setIsScanning(false);
          setProgressPercent(100);
          setCompletedReport(msg.report);
          setSteps((prev) =>
            prev.map((step) => ({
              ...step,
              stage: 'complete'
            }))
          );

          setLogs((prev) => [
            ...prev,
            {
              time: currentTime,
              text: `Audit finished. Final Score: ${msg.report.score}/100 (Grade ${msg.report.grade})`,
              type: 'success'
            }
          ]);

          if (onScanCompleteRef.current) {
            onScanCompleteRef.current(msg.report);
          }
          break;
        }

        case 'SCAN_ERROR': {
          setIsScanning(false);
          setScanError(msg.error);
          setLogs((prev) => [
            ...prev,
            { time: currentTime, text: `Scan error: ${msg.error}`, type: 'error' }
          ]);
          break;
        }

        case 'SCAN_CANCELLED': {
          setIsScanning(false);
          setScanError('Scan was cancelled by user');
          setLogs((prev) => [
            ...prev,
            { time: currentTime, text: `Scan operation cancelled.`, type: 'warn' }
          ]);
          break;
        }

        default:
          break;
      }
    });

    return () => {
      console.log('[LiveScannerModal] Cleaning up listener subscription');
      unsubscribe();
    };
  }, [isOpen]);

  // Scan Session Trigger - fires once per open session
  useEffect(() => {
    if (!isOpen || !cleanWebsiteId) {
      scanTriggeredRef.current = false;
      return;
    }

    if (scanTriggeredRef.current) return;
    scanTriggeredRef.current = true;

    // Reset initial UI state for new scan session
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, stage: 'pending' })));
    setProgressPercent(5);
    setLogs([
      {
        time: new Date().toLocaleTimeString(),
        text: `Initializing scanner connection for ${domain || cleanWebsiteId}...`,
        type: 'info'
      }
    ]);
    setIsScanning(true);
    setCompletedReport(null);
    setScanError(null);
    setTargetIp(null);
    setElapsedSeconds(0);

    // Dispatch scan over WebSocket
    console.log('[LiveScannerModal] Initiating scan for:', cleanWebsiteId);
    scannerSocket.startScan(cleanWebsiteId).catch((err) => {
      console.error('Failed to start scan:', err);
      setScanError(err.message || 'Failed to start scan');
      setIsScanning(false);
    });
  }, [isOpen, cleanWebsiteId, domain]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (cleanWebsiteId) {
      scannerSocket.cancelScan(cleanWebsiteId);
    }
    setIsScanning(false);
    setScanError('Scan aborted by user');
  };

  const handleGoToReport = () => {
    onClose();
    router.push(`/reports/${websiteId}`);
  };

  const handleCopyIp = () => {
    if (!targetIp) return;
    navigator.clipboard.writeText(targetIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleCopyLogs = () => {
    const raw = logs.map((l) => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(raw);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-none bg-background border border-border/60 shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-none border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-foreground" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-semibold tracking-tight font-mono text-foreground">
                  {domain}
                </h2>
                {targetIp && (
                  <button
                    onClick={handleCopyIp}
                    title="Click to copy IP"
                    className="group font-mono text-[11px] px-2 py-0.5 border border-border/50 bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none"
                  >
                    <span>{targetIp}</span>
                    {copiedIp ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                    )}
                  </button>
                )}
                
                {/* STATUS BADGE */}
                {isScanning ? (
                  <span className="font-mono text-[11px] px-2 py-0.5 border border-border/40 bg-muted/30 text-foreground inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AUDITING • {elapsedSeconds}s
                  </span>
                ) : scanError ? (
                  <span className="font-mono text-[11px] px-2 py-0.5 border border-rose-500/40 bg-rose-500/10 text-rose-400 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> STOPPED
                  </span>
                ) : (
                  <span className="font-mono text-[11px] px-2 py-0.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> COMPLETED • {elapsedSeconds}s
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isScanning && (
              <button 
                onClick={handleCancel}
                className="rounded-none border border-border/50 hover:border-rose-500/50 text-xs px-3 h-8 font-mono text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Abort
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer rounded-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MINIMAL SUBHEADER TELEMETRY ROW */}
        <div className="px-6 py-2.5 border-b border-border/40 bg-muted/5 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Pipeline Execution</span>
            <span className="text-foreground/40">•</span>
            <span className="text-foreground/80 text-[11px]">
              {steps.filter(s => s.stage === 'complete').length} of {steps.length} checks complete
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-48 h-1 bg-muted/40 overflow-hidden relative">
              <div 
                className="h-full bg-foreground transition-all duration-300 ease-out" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <span className="font-semibold text-foreground text-[11px]">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (STEPS GRID + TERMINAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 overflow-hidden min-h-[380px]">
          
          {/* LEFT: 8-STAGE AUDIT MATRIX */}
          <div className="lg:col-span-7 p-5 sm:p-6 overflow-y-auto space-y-3 border-b lg:border-b-0 lg:border-r border-border/40 max-h-[50vh] lg:max-h-[56vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {steps.map((step, index) => {
                const isCurrent = step.stage === 'running';
                const isDone = step.stage === 'complete';
                const isErr = step.stage === 'error';

                return (
                  <div
                    key={step.id}
                    className={`relative p-3 border transition-colors flex flex-col justify-between rounded-none ${
                      isCurrent
                        ? 'border-foreground/60 bg-muted/20 ring-1 ring-foreground/20'
                        : isDone
                        ? 'border-border/60 bg-muted/5'
                        : isErr
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-border/30 bg-background/50 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                          0{index + 1} • {step.category}
                        </span>

                        <div>
                          {isCurrent && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-foreground/40 bg-foreground/10 text-foreground flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> RUN
                            </span>
                          )}
                          {isDone && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                              PASS
                            </span>
                          )}
                          {isErr && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-rose-500/30 bg-rose-500/10 text-rose-400">
                              FAIL
                            </span>
                          )}
                          {step.stage === 'pending' && (
                            <span className="font-mono text-[10px] text-muted-foreground/40">WAIT</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-foreground tracking-tight leading-snug">
                        {step.title}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-border/20">
                      <p className="text-[11px] font-mono text-muted-foreground/70 truncate">
                        {step.detail || step.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ERROR ALERT IF SCAN FAILED */}
            {scanError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-[11px]">{scanError}</span>
              </div>
            )}
          </div>

          {/* RIGHT: LIVE TERMINAL STREAM LOGS */}
          <div className="lg:col-span-5 flex flex-col bg-zinc-950 font-mono text-xs overflow-hidden max-h-[50vh] lg:max-h-[56vh]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-b border-border/40 text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1.5 text-foreground/80 font-mono">
                <Terminal className="w-3.5 h-3.5 text-foreground/70" /> telemetry.log
              </span>
              
              <button 
                onClick={handleCopyLogs}
                title="Copy log text"
                className="inline-flex items-center gap-1 text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div 
              ref={logContainerRef}
              className="flex-1 p-4 overflow-y-auto space-y-1.5 select-text scrollbar-thin scrollbar-thumb-muted/30"
            >
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed text-[11px]">
                  <span className="text-muted-foreground/40 shrink-0 select-none text-[10px]">[{log.time}]</span>
                  <span 
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-zinc-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              {isScanning && (
                <div className="flex items-center gap-2 text-muted-foreground/70 text-[11px] pt-1">
                  <span className="inline-block w-1.5 h-3 bg-foreground/80 animate-pulse" />
                  <span>Awaiting probe telemetry...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER / COMPLETION HERO */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {completedReport ? (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground">SCORE:</span>
                  <span className="text-xl font-bold font-mono text-foreground tracking-tight">
                    {completedReport.score}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">/100</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs font-bold rounded-none border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                  GRADE {completedReport.grade}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
                  • {completedReport.findings?.length || 0} findings analyzed
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button 
                  onClick={onClose} 
                  className="rounded-none border border-border/60 hover:bg-muted/30 text-xs px-4 h-9 font-medium text-foreground transition-colors flex-1 sm:flex-none cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={handleGoToReport} 
                  className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-medium px-5 h-9 inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none transition-all cursor-pointer"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-foreground/60 animate-pulse" />
                <span>Isolated container runtime active on port 6001</span>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClose} 
                disabled={isScanning}
                className="text-xs rounded-none border-border/50"
              >
                {isScanning ? 'Scan in progress...' : 'Close'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


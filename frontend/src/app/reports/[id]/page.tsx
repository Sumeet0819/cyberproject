'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'isomorphic-dompurify';
import { useState, useEffect } from 'react';
import { 
  Loader2, ArrowLeft, Target, ShieldCheck, AlertTriangle, 
  Info, Wrench, ArrowUpRight, CheckCircle2, Zap, AlertCircle,
  Download, Award, Bell
} from 'lucide-react';
import LiveScannerModal from '@/components/scanner/LiveScannerModal';
import VerificationModal from '@/components/verification/VerificationModal';
import TrustBadgeModal from '@/components/badge/TrustBadgeModal';
import MonitoringModal from '@/components/monitoring/MonitoringModal';
import ServerPlaybookViewer from '@/components/reports/ServerPlaybookViewer';
import ScoreHistoryChart from '@/components/reports/ScoreHistoryChart';
import ScanDriftCard from '@/components/reports/ScanDriftCard';


function formatInlineText(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/40 font-mono text-xs text-foreground font-normal">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function parseSteps(content: string): { isNumbered: boolean; items: string[] } {
  if (!content) return { isNumbered: false, items: [] };

  // If HTML list tags are present
  if (content.includes('<li>')) {
    const matches = Array.from(content.matchAll(/<li[^>]*>(.*?)<\/li>/gi));
    if (matches.length > 0) {
      return {
        isNumbered: content.includes('<ol>'),
        items: matches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)
      };
    }
  }

  // Check if string contains numbered points like "1. ... 2. ... " or "1) ... "
  const numberedPattern = /(?:^|\s+)[0-9]{1,2}[\.\)]\s+/;
  if (numberedPattern.test(content)) {
    const rawItems = content.split(/(?:^|\s+)[0-9]{1,2}[\.\)]\s+/);
    const items = rawItems.map(s => s.trim()).filter(Boolean);
    if (items.length > 1) {
      return { isNumbered: true, items };
    }
  }

  // Check if string contains newlines with numbers or dashes
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const items = lines.map(l => l.replace(/^(?:[0-9]{1,2}[\.\)]|[-*•])\s*/, '').trim()).filter(Boolean);
    const isNumbered = lines.some(l => /^[0-9]{1,2}[\.\)]/.test(l));
    return { isNumbered, items };
  }

  // Check if string has bullet separators like "• " or " - "
  if (content.includes('•') || content.includes(' - ')) {
    const rawItems = content.split(/(?:^|\s+)[•\-]\s+/);
    const items = rawItems.map(s => s.trim()).filter(Boolean);
    if (items.length > 1) {
      return { isNumbered: false, items };
    }
  }

  return { isNumbered: false, items: [content] };
}

function RemediationContent({ content }: { content: string }) {
  if (!content) {
    return <p className="text-xs sm:text-sm text-muted-foreground">No remediation details provided.</p>;
  }

  // If HTML list tags are already present with rich styles
  if (content.includes('<li>') || content.includes('<pre>')) {
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none text-foreground/85 text-xs sm:text-sm leading-relaxed overflow-hidden wrap-break-word prose-ul:my-2 prose-ol:my-2 prose-li:my-1.5 prose-pre:bg-muted/40 prose-pre:border prose-pre:border-border/40 prose-pre:p-3 prose-pre:rounded-lg prose-pre:text-xs prose-pre:overflow-x-auto prose-a:text-primary hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      />
    );
  }

  const { isNumbered, items } = parseSteps(content);

  if (items.length > 1) {
    return (
      <ul className="space-y-3 my-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3">
            {isNumbered ? (
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                {idx + 1}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-2 shrink-0" />
            )}
            <div className="text-xs sm:text-sm text-foreground/85 leading-relaxed flex-1">
              {formatInlineText(item)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
      {formatInlineText(content)}
    </p>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'QUICK_WINS'>('ALL');
  const [report, setReport] = useState<any>(null);
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveScanOpen, setIsLiveScanOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isMonitoringModalOpen, setIsMonitoringModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [drift, setDrift] = useState<any>(null);

  const websiteId = params.id as string;

  const fetchData = async () => {
    try {
      const [reportRes, websiteRes, historyRes, driftRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/report`),
        fetch(`/api/websites/${websiteId}`),
        fetch(`/api/websites/${websiteId}/history`),
        fetch(`/api/websites/${websiteId}/drift`)
      ]);

      if (!reportRes.ok) throw new Error('Report not found');
      if (!websiteRes.ok) throw new Error('Website not found');

      const reportData = await reportRes.json();
      const websiteData = await websiteRes.json();

      setReport(reportData.data);
      setWebsite(websiteData.data);

      if (historyRes.ok) {
        const histJson = await historyRes.json();
        setHistory(histJson.data || []);
      }
      if (driftRes.ok) {
        const driftJson = await driftRes.json();
        setDrift(driftJson.data || null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleReScan = () => {
    setIsLiveScanOpen(true);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/report/pdf`);
      if (!res.ok) {
        let errMsg = 'Failed to generate PDF report';
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanDomain = (website?.domain || 'Target').replace(/[^a-zA-Z0-9.-]/g, '_');
      a.download = `CyberHealth-Executive-Report-${cleanDomain}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert(err.message || 'Failed to export PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };


  if (loading) {
    return (
      <main className="w-full min-h-screen relative overflow-x-hidden flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center max-w-sm text-center py-16">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Loading Security Report
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Synthesizing scan findings and remediation guidance...
          </p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="w-full min-h-screen relative overflow-x-hidden flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center max-w-md text-center py-16">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-foreground mb-2">Report Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {error || 'The requested report could not be found or the scan has not finished.'}
          </p>
          <Button 
            onClick={() => router.push('/dashboard')} 
            variant="outline" 
            className="rounded-none border-border/50 gap-2 h-11 px-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  const findingsList = report.findings || [];
  const filteredFindings = findingsList.filter((f: any) => {
    if (filter === 'QUICK_WINS') return (f.estimated_minutes || 0) <= 10;
    return true;
  });

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'EASY': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'ADVANCED': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default: return 'bg-muted/40 text-foreground border border-border/40';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreStroke = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#f43f5e';
  };

  const getGradeVariant = (grade: string) => {
    if (grade === 'A' || grade === 'B') return 'default';
    if (grade === 'F') return 'destructive';
    return 'secondary';
  };

  return (
    <main className="w-full max-w-full overflow-x-hidden relative min-h-screen selection:bg-foreground selection:text-background pb-24">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-7xl">
        
        {/* Navigation & Header */}
        <div className="mb-8 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div className="space-y-2">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Security Report
              </h1>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm flex-wrap">
              <Target className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="font-mono bg-muted/30 px-2 py-0.5 rounded border border-border/40 text-foreground/90 text-xs sm:text-sm break-all">
                {website?.target_url || report.url}
              </span>
              {report?.created_at && (
                <span className="text-xs text-muted-foreground ml-1">
                  • Scanned {new Date(report.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 flex-wrap">
            {website?.is_verified ? (
              <button
                onClick={() => setIsVerificationModalOpen(true)}
                className="h-10 px-3.5 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Domain ownership authenticated. Click to manage."
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </button>
            ) : (
              <button
                onClick={() => setIsVerificationModalOpen(true)}
                className="h-10 px-3.5 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Click to verify domain ownership via DNS or HTML tag"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Verify Domain</span>
              </button>
            )}

            <button
              onClick={() => setIsBadgeModalOpen(true)}
              className="h-10 px-3.5 border border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
              title="Get embeddable trust seal badge for your website footer"
            >
              <Award className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trust Seal</span>
              <span className="sm:hidden">Seal</span>
            </button>

            <button
              onClick={() => setIsMonitoringModalOpen(true)}
              className={`h-10 px-3.5 border text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors ${
                website?.monitoring_enabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground'
              }`}
              title="Configure 24/7 autonomous monitoring & threat alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Monitoring</span>
              <span className="sm:hidden">Alerts</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="h-10 px-3.5 border border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground text-xs font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              title="Download 2-page Executive Security Report (PDF) for brokers, compliance, and leadership"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Executive PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handleReScan}
              className="h-10 px-4 bg-foreground text-background hover:bg-foreground/90 text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-none cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Rescan</span>
            </button>
          </div>
        </div>

        {/* TIER 1: Executive Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Minimal Score Card */}
          <Card className="bg-card/40 border-border/40 backdrop-blur-sm p-6 flex flex-col justify-between rounded-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Security Posture</span>
                <Badge 
                  variant={getGradeVariant(report.grade)} 
                  className="text-xs px-2.5 py-0.5 font-medium border-0 shadow-none"
                >
                  Grade {report.grade || 'N/A'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-center py-6">
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="58" 
                      stroke="currentColor" 
                      strokeWidth="6" 
                      fill="transparent" 
                      className="text-muted/30" 
                    />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="58" 
                      stroke={getScoreStroke(report.score)} 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={364.4} 
                      strokeDashoffset={364.4 - (364.4 * (report.score || 0)) / 100} 
                      className="transition-all duration-1000 ease-out" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-4xl font-semibold tracking-tight ${getScoreColor(report.score)}`}>
                      {report.score || 0}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">/ 100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rating Status</span>
              <span className={`font-medium ${getScoreColor(report.score)}`}>
                {report.score >= 90 ? 'Healthy' : report.score >= 70 ? 'Moderate Risk' : 'Critical Attention'}
              </span>
            </div>
          </Card>

          {/* Minimal AI Executive Summary Card */}
          <Card className="lg:col-span-2 bg-muted/10 border-border/40 backdrop-blur-sm p-6 flex flex-col justify-between rounded-xl">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-border/40 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-medium text-foreground">AI Executive Summary</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Automated audit of vulnerabilities & recommendations</CardDescription>
                </div>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-foreground/85 mb-5 font-normal">
                {report.ai_summary || 'No summary available for this scan.'}
              </p>
            </div>

            {report.ai_key_takeaways && report.ai_key_takeaways.length > 0 && (
              <div className="bg-muted/20 rounded-lg p-4 sm:p-5 border border-border/40">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Priority Actions
                </h3>
                <ul className="space-y-3">
                  {report.ai_key_takeaways.map((takeaway: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-muted text-foreground text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
                        {i + 1}
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {takeaway}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* TIER 1.5: Historical Evolution & Posture Drift */}
        <div className="space-y-6 mb-10">
          <ScoreHistoryChart history={history} />
          {drift && drift.hasPreviousScan && (
            <ScanDriftCard drift={drift} />
          )}
        </div>

        {/* TIER 2: Findings Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Detailed Findings
            </h2>
            <span className="text-xs bg-muted/40 text-muted-foreground font-mono px-2 py-0.5 rounded border border-border/40">
              {filteredFindings.length} {filteredFindings.length === 1 ? 'issue' : 'issues'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/20 rounded-lg border border-border/40 w-full sm:w-auto">
            <button 
              onClick={() => setFilter('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                filter === 'ALL' 
                  ? 'bg-foreground text-background shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              All Issues
            </button>
            <button 
              onClick={() => setFilter('QUICK_WINS')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                filter === 'QUICK_WINS' 
                  ? 'bg-foreground text-background shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Quick Wins (&le;10m)
            </button>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <Card className="bg-card/40 border-border/40 p-12 text-center rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No findings to display</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'QUICK_WINS' ? 'No quick wins (&le;10m) were found in this scan.' : 'No security issues were found.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredFindings.map((finding: any, idx: number) => (
              <Card 
                key={idx} 
                className="bg-card/40 border-border/40 backdrop-blur-sm rounded-xl overflow-hidden hover:border-border/80 transition-all duration-300"
              >
                {/* Finding Header */}
                <div className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-destructive/10 text-destructive rounded-md border border-destructive/20 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="font-medium text-base sm:text-lg tracking-tight text-foreground truncate">
                      {finding.check_id?.replace(/_/g, ' ') || 'Security Finding'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Badge className={`${getDifficultyColor(finding.difficulty)} px-2.5 py-0.5 font-medium text-xs rounded shadow-none`}>
                      {finding.difficulty || 'UNKNOWN'}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded border border-border/40">
                      ~{finding.estimated_minutes || 5} min
                    </span>
                  </div>
                </div>
                
                {/* Finding Body */}
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/40">
                    
                    {/* Left Column: Context & Business Impact */}
                    <div className="p-4 sm:p-6 space-y-5">
                      <div>
                        <h4 className="flex items-center gap-1.5 font-semibold text-muted-foreground mb-2 text-xs uppercase tracking-wider">
                          <Info className="w-3.5 h-3.5 text-primary" /> What It Means
                        </h4>
                        <p className="text-sm text-foreground/85 leading-relaxed">
                          {finding.ai_explanation || 'No explanation provided.'}
                        </p>
                      </div>
                      
                      {finding.business_impact && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-destructive text-xs font-semibold uppercase tracking-wider mb-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Business Impact
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {finding.business_impact}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Remediation */}
                    <div className="p-4 sm:p-6 bg-muted/5 flex flex-col justify-between">
                      <div>
                        <h4 className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 mb-3 text-xs uppercase tracking-wider">
                          <Wrench className="w-3.5 h-3.5" /> How to Fix It
                        </h4>
                        <RemediationContent content={finding.remediation} />
                        <ServerPlaybookViewer playbooks={finding.playbooks} />
                      </div>

                      {finding.reference_docs?.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-border/40">
                          <h5 className="text-[11px] font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
                            Official Documentation
                          </h5>
                          <div className="flex gap-2 flex-wrap">
                            {finding.reference_docs.map((doc: any, i: number) => (
                              <a 
                                key={i} 
                                href={doc.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border/40 px-2.5 py-1 rounded transition-colors"
                              >
                                <span>{doc.title}</span>
                                <ArrowUpRight className="w-3 h-3 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* LIVE WEBSOCKET SCANNER MODAL */}
      {isLiveScanOpen && (
        <LiveScannerModal
          isOpen={isLiveScanOpen}
          websiteId={websiteId}
          domain={website?.domain || website?.target_url || report?.url || ''}
          onClose={() => setIsLiveScanOpen(false)}
          onScanComplete={(newReport) => {
            setReport(newReport);
            fetchData();
          }}
        />
      )}

      {/* DOMAIN VERIFICATION MODAL */}
      {isVerificationModalOpen && (
        <VerificationModal
          isOpen={isVerificationModalOpen}
          websiteId={websiteId}
          domain={website?.domain || website?.target_url || report?.url || ''}
          isVerified={Boolean(website?.is_verified)}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerifiedSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* TRUST BADGE MODAL */}
      {isBadgeModalOpen && (
        <TrustBadgeModal
          isOpen={isBadgeModalOpen}
          websiteId={websiteId}
          domain={website?.domain || website?.target_url || report?.url || ''}
          isVerified={Boolean(website?.is_verified)}
          score={report?.score}
          grade={report?.grade}
          onClose={() => setIsBadgeModalOpen(false)}
          onOpenVerification={() => setIsVerificationModalOpen(true)}
        />
      )}

      {/* AUTONOMOUS MONITORING MODAL */}
      {isMonitoringModalOpen && (
        <MonitoringModal
          isOpen={isMonitoringModalOpen}
          websiteId={websiteId}
          domain={website?.domain || website?.target_url || report?.url || ''}
          initialEnabled={Boolean(website?.monitoring_enabled)}
          initialFrequency={website?.monitoring_frequency || 'weekly'}
          initialEmail={website?.notification_email || ''}
          initialWebhook={website?.webhook_url || ''}
          onClose={() => setIsMonitoringModalOpen(false)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </main>
  );
}


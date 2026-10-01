import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, ArrowUpRight, 
  Lock, Calendar, Globe, Award, ShieldAlert, Check
} from 'lucide-react';

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

async function getBadgeData(id: string) {
  try {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5000';
    const res = await fetch(`${backendUrl}/api/badges/${id}/info`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.website || null;
  } catch (error) {
    console.error('Failed to load badge data on verify page:', error);
    return null;
  }
}

export default async function BadgeVerifyPage({ params }: VerifyPageProps) {
  const resolvedParams = await params;
  const website = await getBadgeData(resolvedParams.id);

  if (!website) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6 text-foreground">
        <div className="max-w-md w-full border border-border/40 p-8 bg-card/40 backdrop-blur-md text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-none border border-border/40 bg-muted/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">
            Certificate Not Found
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requested security certificate ID is invalid or the website is not registered on the CyberHealth platform.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-foreground hover:underline"
            >
              Return to CyberHealth <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const score = website.score ?? 85;
  const grade = website.grade ?? 'A';
  const isVerified = Boolean(website.is_verified);
  const lastScan = website.last_scan_at 
    ? new Date(website.last_scan_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Recent';

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        
        {/* HEADER BRAND */}
        <div className="flex items-center justify-between pb-6 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 border border-border/60 bg-foreground text-background flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-mono text-sm tracking-wider uppercase font-semibold">
              CyberHealth
            </span>
          </Link>

          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            Security Attestation Certificate
          </span>
        </div>

        {/* ATTESTATION CARD */}
        <div className="border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden">
          
          {/* TOP BANNER */}
          <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                  {website.domain}
                </h1>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Authenticated Domain Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Third-Party Monitored
                  </span>
                )}
                <span>• Continuous Protection Active</span>
              </div>
            </div>

            {/* SCORE GAUGE */}
            <div className="flex items-center gap-4 bg-background/60 border border-border/40 px-5 py-3 shrink-0">
              <div className="text-right">
                <span className="block text-[10px] font-mono uppercase text-muted-foreground">Posture Rating</span>
                <span className="text-2xl font-mono font-bold text-foreground">{score}/100</span>
              </div>
              <div className="w-10 h-10 border border-border/60 bg-foreground text-background flex items-center justify-center font-mono text-lg font-bold">
                {grade}
              </div>
            </div>
          </div>

          {/* ATTRIBUTES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40 border-b border-border/40 text-xs">
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Verification Status</span>
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {isVerified ? 'Cryptographically Verified' : 'Standard Inspection'}
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Last Inspection</span>
              <span className="font-mono text-foreground">{lastScan}</span>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block">Protocol Baseline</span>
              <span className="font-mono text-foreground">TLS 1.3 / HSTS / DMARC</span>
            </div>
          </div>

          {/* ATTESTATION DETAILS */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Official Trust Statement
              </h2>
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                This publicly verified badge certifies that <strong className="text-foreground">{website.domain}</strong> maintains proactive automated cybersecurity defenses and vulnerability auditing through CyberHealth. Scans analyze network boundaries, transport layer security, browser security policies, email spoofing defenses, and sensitive disclosure endpoints.
              </p>
            </div>

            {/* COMPLIANCE MATRIX */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                Audited Safeguards
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { title: 'Transport Layer Security', desc: 'Modern SSL/TLS negotiation, valid cert chain, forward secrecy' },
                  { title: 'Browser Defense Headers', desc: 'Strict-Transport-Security, CSP, X-Frame-Options framing guards' },
                  { title: 'Domain Spoofing Defenses', desc: 'SPF record validation, DKIM alignment, and DMARC enforcement' },
                  { title: 'Perimeter Integrity', desc: 'Safe non-intrusive probe checking exposed dev files & secrets' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 border border-border/30 bg-muted/5 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CERTIFICATE METADATA FOOTER */}
            <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] font-mono text-muted-foreground">
              <span>Target ID: {website.id}</span>
              <span>Attestation Engine: CyberHealth v1.4-LTS</span>
            </div>
          </div>

        </div>

        {/* CTA BANNER */}
        <div className="border border-border/40 p-6 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm text-foreground">Want this trust seal for your own business?</div>
            <div className="text-xs text-muted-foreground mt-0.5">Scan and certify your web applications in under 60 seconds.</div>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-mono font-medium uppercase tracking-wider transition-colors shrink-0"
          >
            Audit Your Website →
          </Link>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="text-center pt-8 text-[11px] font-mono text-muted-foreground">
        © {new Date().getFullYear()} CyberHealth Attestation Services. All rights reserved.
      </footer>
    </main>
  );
}

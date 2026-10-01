'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Plus, Loader2, ArrowRight, ShieldCheck, Activity, Zap, CheckCircle2, Award, Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchWebsites, addWebsite, scanWebsite } from '@/store/features/websiteSlice';
import LiveScannerModal from '@/components/scanner/LiveScannerModal';
import VerificationModal from '@/components/verification/VerificationModal';
import TrustBadgeModal from '@/components/badge/TrustBadgeModal';
import MonitoringModal from '@/components/monitoring/MonitoringModal';

function formatScanDate(dateStr?: string) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const [url, setUrl] = useState('');
  const [activeScanSite, setActiveScanSite] = useState<{ id: string; domain: string } | null>(null);
  const [verificationSite, setVerificationSite] = useState<any | null>(null);
  const [badgeSite, setBadgeSite] = useState<any | null>(null);
  const [monitoringSite, setMonitoringSite] = useState<any | null>(null);
  const router = useRouter();
  
  const dispatch = useAppDispatch();
  const { websites, isLoading } = useAppSelector((state) => state.website);

  useEffect(() => {
    dispatch(fetchWebsites());
  }, [dispatch]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Bento Grid Animations
    tl.fromTo(".animate-bento-item", 
      { y: 40, opacity: 0, scale: 0.95 }, 
      { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 
      "-=0.6"
    );
  }, { scope: containerRef });

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      await dispatch(addWebsite(url));
      setUrl('');
    }
  };

  const triggerScan = (id: string, currentScore: number, domain: string) => {
    if (currentScore > 0) {
      // If already scanned, navigate to report
      router.push(`/reports/${id}`);
      return;
    }

    // Launch live websocket scanner modal
    setActiveScanSite({ id, domain });
  };


  return (
    <main ref={containerRef} className="w-full max-w-full overflow-x-hidden relative min-h-screen selection:bg-foreground selection:text-background pb-24">
      {/* BACKGROUND WASH */}
      <div className="absolute top-0 left-0 w-full h-[60vh] -z-10 overflow-hidden pointer-events-none">
        <div 
          className="w-full h-full bg-cover bg-center opacity-20 mix-blend-luminosity grayscale contrast-125 dark:opacity-10"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2564&auto=format&fit=crop)' }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-7xl">

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-dense gap-6">
          
          {/* ADD WEBSITE CARD (Wide) */}
          <Card className="animate-bento-item md:col-span-2 lg:col-span-2 bg-muted/10 border-border/50 backdrop-blur-md shadow-lg overflow-hidden group flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-2xl font-medium">Add Target</CardTitle>
              </div>
              <CardDescription className="text-base text-muted-foreground">
                Enter a new domain or IP address to begin monitoring its security posture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSite} className="flex flex-col sm:flex-row gap-4 mt-4">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="flex-1 bg-background/50 border-border/50 px-5 h-16 text-base focus-visible:ring-1 focus-visible:ring-foreground transition-all rounded-none"
                />
                <button 
                  type="submit"
                  className="h-16 px-8 bg-foreground text-background hover:bg-foreground/90 font-medium transition-all group/btn relative flex items-center justify-center rounded-none min-w-40"
                >
                  <span className="text-base mr-2">Add Target</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </form>
            </CardContent>
          </Card>

          {/* SYSTEM STATUS CARD (Tall) */}
          <Card className="animate-bento-item md:col-span-1 lg:col-span-1 bg-primary/5 border-primary/20 backdrop-blur-md shadow-lg overflow-hidden flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-2xl font-medium">Network Health</CardTitle>
              </div>
              <CardDescription className="text-base">
                Overall security posture of your monitored infrastructure.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-8">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-medium tracking-tighter text-primary">76</span>
                <span className="text-xl text-muted-foreground pb-2">/100</span>
              </div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary mt-4">
                Avg. Score
              </p>
            </CardContent>
          </Card>

          {/* SITE CARDS */}
          {isLoading && websites.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            websites.map((site) => {
              const grade = site.grade || 'N/A';
              const score = site.score || 0;
              const lastScan = formatScanDate(site.last_scan_at || site.lastScan);

              return (
                <Card 
                  key={site.id} 
                  className="animate-bento-item col-span-1 bg-card/40 border-border/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-700 ease-out hover:border-border/80 group overflow-hidden flex flex-col relative"
                >
                  {/* Background accent on hover */}
                  <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-none border border-border/40 bg-muted/30">
                          <ShieldCheck className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        {site.is_verified ? (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setVerificationSite(site);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 cursor-pointer hover:bg-emerald-500/20 transition-colors" 
                            title="Ownership verified. Click to manage."
                          >
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setVerificationSite(site);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 cursor-pointer transition-colors"
                            title="Click to verify domain ownership via DNS or HTML meta tag"
                          >
                            Verify Domain
                          </button>
                        )}
                        {site.monitoring_enabled && (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setMonitoringSite(site);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                            title="24/7 autonomous monitoring enabled. Click to configure."
                          >
                            <Bell className="w-2.5 h-2.5" /> 24/7 Monitored
                          </span>
                        )}
                      </div>
                      <Badge variant={
                        grade === 'A' || grade === 'B' ? 'default' : 
                        grade === 'F' ? 'destructive' : 'secondary'
                      } className="text-sm px-3 py-1 font-medium tracking-wide border-0 shadow-none">
                        {grade}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl truncate group-hover:text-primary transition-colors duration-300" title={site.target_url}>
                      {site.target_url}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Last scanned: {lastScan}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 relative z-10">
                    <div className="flex items-baseline gap-1 mt-2 group-hover:scale-105 origin-left transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]">
                      <span className="text-4xl font-medium tracking-tight">{score}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-6 relative z-10 flex gap-2">
                    <button 
                      onClick={() => triggerScan(site.id, score, site.domain || site.target_url)} 
                      className="flex-1 py-4 px-4 bg-muted/30 text-foreground hover:bg-foreground hover:text-background font-medium transition-all duration-300 flex items-center justify-center rounded-none group/scan cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <span>{score === 0 ? 'Run Initial Scan' : 'View Full Report'}</span>
                    </button>
                    {score > 0 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBadgeSite(site);
                          }}
                          title="Embed Trust Seal Badge"
                          className="py-4 px-3.5 bg-muted/20 hover:bg-foreground hover:text-background border border-border/40 text-foreground flex items-center justify-center rounded-none transition-colors cursor-pointer"
                        >
                          <Award className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMonitoringSite(site);
                          }}
                          title="Autonomous Monitoring Settings"
                          className={`py-4 px-3.5 border border-border/40 flex items-center justify-center rounded-none transition-colors cursor-pointer ${
                            site.monitoring_enabled
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                              : 'bg-muted/20 hover:bg-foreground hover:text-background text-foreground'
                          }`}
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScanSite({ id: site.id, domain: site.domain || site.target_url });
                          }}
                          title="Live Re-scan"
                          className="py-4 px-3.5 bg-muted/20 hover:bg-foreground hover:text-background border border-border/40 text-foreground flex items-center justify-center rounded-none transition-colors cursor-pointer"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* LIVE WEBSOCKET SCANNER MODAL */}
      {activeScanSite && (
        <LiveScannerModal
          isOpen={!!activeScanSite}
          websiteId={activeScanSite.id}
          domain={activeScanSite.domain}
          onClose={() => setActiveScanSite(null)}
          onScanComplete={() => {
            dispatch(fetchWebsites());
          }}
        />
      )}

      {/* DOMAIN VERIFICATION MODAL */}
      {verificationSite && (
        <VerificationModal
          isOpen={!!verificationSite}
          websiteId={verificationSite.id}
          domain={verificationSite.domain || verificationSite.target_url}
          isVerified={Boolean(verificationSite.is_verified)}
          onClose={() => setVerificationSite(null)}
          onVerifiedSuccess={() => {
            dispatch(fetchWebsites());
          }}
        />
      )}

      {/* TRUST BADGE MODAL */}
      {badgeSite && (
        <TrustBadgeModal
          isOpen={!!badgeSite}
          websiteId={badgeSite.id}
          domain={badgeSite.domain || badgeSite.target_url}
          isVerified={Boolean(badgeSite.is_verified)}
          score={badgeSite.score}
          grade={badgeSite.grade}
          onClose={() => setBadgeSite(null)}
          onOpenVerification={() => {
            const siteToVerify = badgeSite;
            setBadgeSite(null);
            setVerificationSite(siteToVerify);
          }}
        />
      )}

      {/* AUTONOMOUS MONITORING MODAL */}
      {monitoringSite && (
        <MonitoringModal
          isOpen={!!monitoringSite}
          websiteId={monitoringSite.id}
          domain={monitoringSite.domain || monitoringSite.target_url}
          initialEnabled={Boolean(monitoringSite.monitoring_enabled)}
          initialFrequency={monitoringSite.monitoring_frequency || 'weekly'}
          initialEmail={monitoringSite.notification_email || ''}
          initialWebhook={monitoringSite.webhook_url || ''}
          onClose={() => setMonitoringSite(null)}
          onSuccess={() => {
            dispatch(fetchWebsites());
          }}
        />
      )}
    </main>
  );
}


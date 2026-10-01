import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { websiteService } from './website.service';
import { driftService } from './drift.service';
import { notificationService } from './notification.service';

export const schedulerService = {
  /**
   * Determine if a website is currently due for an automated security scan
   */
  isScanDue(website: any): boolean {
    if (!website.monitoring_enabled) return false;
    if (!website.last_monitored_at) return true;

    const last = new Date(website.last_monitored_at).getTime();
    const now = Date.now();
    const freq = website.monitoring_frequency || 'weekly';

    const intervals: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };

    const intervalMs = intervals[freq] || intervals.weekly;
    return now - last >= intervalMs;
  },

  /**
   * Run automated audit scan and dispatch drift alerts if necessary
   */
  async runAuditForWebsite(website: any): Promise<void> {
    try {
      console.log(`[Scheduler] Initiating scheduled audit for ${website.domain} (${website.id})...`);

      // 1. Run full scan
      const report = await websiteService.scanWebsite(website.user_id, website.id);

      // 2. Update last_monitored_at
      const now = new Date().toISOString();
      await (supabaseAdmin || supabaseClient)
        .from('websites')
        .update({ last_monitored_at: now })
        .eq('id', website.id);

      // 3. Calculate drift
      const drift = await driftService.calculateDrift(website.id, report.id);

      // 4. Alert on significant degradation or critical findings
      const hasSevereDrop = drift.scoreDelta <= -10;
      const hasCriticalRegressions = drift.newRegressions.some(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');

      if ((hasSevereDrop || hasCriticalRegressions) && (website.notification_email || website.webhook_url)) {
        await notificationService.dispatchAlert(
          { email: website.notification_email, webhookUrl: website.webhook_url },
          {
            websiteId: website.id,
            domain: website.domain,
            score: report.score,
            grade: report.grade,
            scoreDelta: drift.scoreDelta,
            alertType: hasSevereDrop ? 'SCORE_REGRESSION' : 'CRITICAL_VULNERABILITY',
            message: `Automated scheduled audit detected security drift: Score changed by ${drift.scoreDelta} pts (${report.score}/100, Grade ${report.grade}). ${drift.newRegressions.length} new regression(s) identified.`,
            details: drift
          }
        );
      }

      console.log(`[Scheduler] Completed scheduled audit for ${website.domain}. Score: ${report.score}/100`);
    } catch (err: any) {
      console.error(`[Scheduler] Audit failed for website ${website.domain}:`, err.message);
    }
  },

  /**
   * Evaluates all monitored websites in database
   */
  async evaluateAllMonitoredWebsites(): Promise<void> {
    try {
      const { data: websites, error } = await (supabaseAdmin || supabaseClient)
        .from('websites')
        .select('*')
        .eq('monitoring_enabled', true);

      if (error || !websites || websites.length === 0) {
        return;
      }

      for (const site of websites) {
        if (this.isScanDue(site)) {
          await this.runAuditForWebsite(site);
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] Batch evaluation error:', err.message);
    }
  },

  /**
   * Initializes background continuous evaluation timer
   */
  startScheduler(intervalMinutes = 60) {
    console.log(`[Scheduler] Autonomous monitoring engine initialized (Polling every ${intervalMinutes}m).`);
    // Run initial check after 30 seconds
    setTimeout(() => {
      this.evaluateAllMonitoredWebsites().catch(() => {});
    }, 30_000);

    // Recurring interval
    setInterval(() => {
      this.evaluateAllMonitoredWebsites().catch(() => {});
    }, intervalMinutes * 60 * 1000);
  }
};

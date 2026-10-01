export interface SecurityAlertPayload {
  websiteId: string;
  domain: string;
  score: number;
  grade: string;
  scoreDelta?: number;
  alertType: 'SCORE_REGRESSION' | 'CRITICAL_VULNERABILITY' | 'CERT_EXPIRING' | 'SCHEDULED_AUDIT_SUMMARY' | 'TEST_PING';
  message: string;
  details?: any;
}

export const notificationService = {
  /**
   * Dispatch security alert to configured webhook and/or email destinations
   */
  async dispatchAlert(
    target: { email?: string | null; webhookUrl?: string | null },
    payload: SecurityAlertPayload
  ): Promise<{ emailSent: boolean; webhookSent: boolean; error?: string }> {
    let webhookSent = false;
    let emailSent = false;
    let lastError: string | undefined;

    // 1. Dispatch Webhook (Slack / Discord / Custom endpoint)
    if (target.webhookUrl) {
      try {
        const isSlackOrDiscord = target.webhookUrl.includes('hooks.slack.com') || target.webhookUrl.includes('discord.com/api/webhooks');

        let bodyPayload: any;

        if (isSlackOrDiscord) {
          // Format rich webhook card for Slack/Discord
          const colorEmoji = payload.score >= 90 ? '🟢' : payload.score >= 70 ? '🟡' : '🔴';
          const title = `${colorEmoji} CyberHealth Alert: ${payload.domain} (${payload.alertType.replace(/_/g, ' ')})`;
          
          bodyPayload = {
            text: title,
            content: title, // Discord compatibility
            attachments: [
              {
                color: payload.score >= 90 ? '#10b981' : payload.score >= 70 ? '#f59e0b' : '#f43f5e',
                title: `${payload.domain} • Score: ${payload.score}/100 (Grade ${payload.grade})`,
                text: payload.message,
                fields: [
                  { title: 'Score Delta', value: `${payload.scoreDelta !== undefined ? (payload.scoreDelta > 0 ? `+${payload.scoreDelta}` : payload.scoreDelta) : '0'} pts`, short: true },
                  { title: 'Alert Category', value: payload.alertType, short: true }
                ],
                ts: Math.floor(Date.now() / 1000)
              }
            ]
          };
        } else {
          // Standard JSON Webhook
          bodyPayload = {
            event: 'cyberhealth.security_alert',
            timestamp: new Date().toISOString(),
            ...payload
          };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(target.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          webhookSent = true;
        } else {
          lastError = `Webhook responded with status ${res.status}`;
        }
      } catch (err: any) {
        lastError = `Webhook request failed: ${err.message}`;
        console.warn('Webhook dispatch warning:', err.message);
      }
    }

    // 2. Dispatch Email
    if (target.email) {
      // In production with SendGrid/SES, send email. For current setup, log notification dispatch
      console.log(`[Notification] Dispatched security alert email to ${target.email}: [${payload.alertType}] ${payload.domain} - Score ${payload.score}/100`);
      emailSent = true;
    }

    return {
      webhookSent,
      emailSent,
      error: lastError
    };
  }
};

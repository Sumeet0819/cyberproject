import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { z } from 'zod';
import { CreateWebsiteSchema } from '../validations/website.schema';
import crypto from 'crypto';
import { calculateScore, Finding } from './scoring.service';
import { generateRemediation } from './aiRemediation.service';
import { playbookService } from './playbook.service';

type CreateWebsiteInput = z.infer<typeof CreateWebsiteSchema>;

export const websiteService = {
  async createWebsite(userId: string, input: CreateWebsiteInput) {
    const { domain } = input;

    // Normalize domain logic
    let normalizedDomain = domain.toLowerCase().trim();
    // Strip protocol if present
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
    // Strip paths and ports
    normalizedDomain = normalizedDomain.split('/')[0].split(':')[0];

    // Basic target URL (always use https for the check target)
    const targetUrl = `https://${normalizedDomain}`;

    const { data: website, error } = await (supabaseAdmin || supabaseClient)
      .from('websites')
      .insert([
        {
          user_id: userId,
          domain: normalizedDomain,
          target_url: targetUrl
        }
      ])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres unique violation code
        throw new Error('Website already exists for this user');
      }
      throw error;
    }

    return website;
  },

  async getWebsites(userId: string) {
    const { data: websites, error } = await (supabaseAdmin || supabaseClient)
      .from('websites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return websites;
  },

  async getWebsiteById(userId: string, websiteId: string) {
    const { data: website, error } = await (supabaseAdmin || supabaseClient)
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (error || !website) {
      throw new Error('Website not found');
    }

    return website;
  },

  async getLatestReport(userId: string, websiteId: string) {
    // Verify ownership
    await this.getWebsiteById(userId, websiteId);

    const { data: report, error } = await (supabaseAdmin || supabaseClient)
      .from('reports')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (report && Array.isArray(report.findings)) {
      const website = await this.getWebsiteById(userId, websiteId);
      report.findings = report.findings.map((f: any) => ({
        ...f,
        playbooks: playbookService.generatePlaybooks(f.check_id, website.domain)
      }));
    }

    return report;
  },

  async scanWebsite(userId: string, websiteId: string) {
    // 1. Fetch website
    const website = await this.getWebsiteById(userId, websiteId);

    // 2. Generate HMAC signature for scanner
    const secret = process.env.INTERNAL_SECRET || 'secret'; // fallback for dev
    const timestamp = Date.now().toString();
    const scanId = crypto.randomUUID();
    const targetUrl = website.target_url;

    const payload = `${timestamp}.${JSON.stringify({ targetUrl, scanId })}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 3. Call Scanner Service (30s timeout to prevent proxy ECONNRESET)
    const scannerUrl = process.env.SCANNER_URL || 'http://localhost:6001/scan';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(scannerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scanner-signature': signature,
          'x-scanner-timestamp': timestamp,
        },
        body: JSON.stringify({ targetUrl, scanId }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      console.error('Scanner error response:', body);
      throw new Error(`Scanner service failed: ${body || response.statusText}`);
    }

    const data = await response.json();
    const findings: Finding[] = data.findings || [];

    // 4. Calculate Score
    const { score, grade } = calculateScore(findings);

    // 5. Generate AI Remediation
    const remediation = await generateRemediation(score, findings);

    // 6. Save Report
    const reportRecord = {
      website_id: websiteId,
      score,
      grade,
      ai_summary: remediation.ai_summary,
      ai_key_takeaways: remediation.ai_key_takeaways,
      findings: remediation.findings
    };

    const { data: savedReport, error: reportError } = await (supabaseAdmin || supabaseClient)
      .from('reports')
      .insert([reportRecord])
      .select('*')
      .single();

    if (reportError) {
      console.error('Failed to save report:', reportError);
      throw reportError;
    }

    // 7. Update Website
    const { error: updateError } = await (supabaseAdmin || supabaseClient)
      .from('websites')
      .update({
        score,
        grade,
        last_scan_at: new Date().toISOString()
      })
      .eq('id', websiteId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update website:', updateError);
    }

    return savedReport;
  },

  async scanWebsiteStream(
    userId: string,
    websiteId: string,
    onProgress: (event: {
      stepId: string;
      stage: 'START' | 'PROGRESS' | 'COMPLETE' | 'ERROR';
      message: string;
      progressPercent: number;
      findingsCount?: number;
      metadata?: Record<string, any>;
      timestamp: string;
    }) => void,
    externalSignal?: AbortSignal
  ) {
    // 1. Fetch website
    const website = await this.getWebsiteById(userId, websiteId);

    onProgress({
      stepId: 'init',
      stage: 'START',
      message: `Initiating security scan for ${website.domain}...`,
      progressPercent: 5,
      timestamp: new Date().toISOString()
    });

    // 2. Generate HMAC signature for scanner
    const secret = process.env.INTERNAL_SECRET || 'secret';
    const timestamp = Date.now().toString();
    const scanId = crypto.randomUUID();
    const targetUrl = website.target_url;

    const payload = `${timestamp}.${JSON.stringify({ targetUrl, scanId })}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 3. Call Scanner Streaming Service
    const scannerUrl = (process.env.SCANNER_URL || 'http://localhost:6001/scan').replace(/\/scan\/?$/, '/scan/stream');
    const controller = new AbortController();

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    const timeout = setTimeout(() => controller.abort(), 60_000);

    let response: any;
    try {
      response = await fetch(scannerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scanner-signature': signature,
          'x-scanner-timestamp': timestamp,
        },
        body: JSON.stringify({ targetUrl, scanId }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to connect to scanner service: ${fetchErr.message}`);
    }

    if (!response.ok) {
      clearTimeout(timeout);
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Scanner stream failed: ${errText || response.statusText}`);
    }

    // Step weights for progress calculation
    const stepWeights: Record<string, number> = {
      'ssrf': 15,
      'https-availability': 30,
      'security-headers': 45,
      'dns-security': 60,
      'tech-detection': 75,
      'exposed-files': 85
    };

    let rawFindings: Finding[] = [];
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (dataStr) {
            try {
              const parsedData = JSON.parse(dataStr);
              if (eventType === 'progress') {
                const percent = stepWeights[parsedData.stepId] || 50;
                onProgress({
                  ...parsedData,
                  progressPercent: percent
                });
              } else if (eventType === 'done') {
                rawFindings = parsedData.findings || [];
              } else if (eventType === 'error') {
                throw new Error(parsedData.error || 'Scanner emitted error');
              }
            } catch (e: any) {
              console.error('Error parsing scanner stream chunk:', e.message);
            }
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    // 4. Calculate Score
    onProgress({
      stepId: 'scoring',
      stage: 'START',
      message: 'Evaluating threat deductions and computing security score...',
      progressPercent: 90,
      timestamp: new Date().toISOString()
    });

    const { score, grade } = calculateScore(rawFindings);

    onProgress({
      stepId: 'scoring',
      stage: 'COMPLETE',
      message: `Threat score computed: ${score}/100 (Grade ${grade})`,
      progressPercent: 93,
      metadata: { score, grade },
      timestamp: new Date().toISOString()
    });

    // 5. Generate AI Remediation
    onProgress({
      stepId: 'ai-remediation',
      stage: 'START',
      message: 'Synthesizing plain-English remediation guidance with Gemini AI...',
      progressPercent: 95,
      timestamp: new Date().toISOString()
    });

    const remediation = await generateRemediation(score, rawFindings);

    onProgress({
      stepId: 'ai-remediation',
      stage: 'COMPLETE',
      message: 'Executive summary & remediation guides generated',
      progressPercent: 98,
      timestamp: new Date().toISOString()
    });

    // 6. Save Report
    onProgress({
      stepId: 'saving',
      stage: 'START',
      message: 'Securing report in audit database...',
      progressPercent: 99,
      timestamp: new Date().toISOString()
    });

    const reportRecord = {
      website_id: websiteId,
      score,
      grade,
      ai_summary: remediation.ai_summary,
      ai_key_takeaways: remediation.ai_key_takeaways,
      findings: remediation.findings
    };

    const { data: savedReport, error: reportError } = await (supabaseAdmin || supabaseClient)
      .from('reports')
      .insert([reportRecord])
      .select('*')
      .single();

    if (reportError) {
      console.error('Failed to save report:', reportError);
      throw reportError;
    }

    // 7. Update Website
    await (supabaseAdmin || supabaseClient)
      .from('websites')
      .update({
        score,
        grade,
        last_scan_at: new Date().toISOString()
      })
      .eq('id', websiteId)
      .eq('user_id', userId);

    onProgress({
      stepId: 'complete',
      stage: 'COMPLETE',
      message: 'Security health check completed successfully!',
      progressPercent: 100,
      metadata: { reportId: savedReport.id, score, grade },
      timestamp: new Date().toISOString()
    });

    return savedReport;
  }
};


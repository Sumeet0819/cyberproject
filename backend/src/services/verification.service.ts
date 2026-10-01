import dns from 'dns/promises';
import crypto from 'crypto';
import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { websiteService } from './website.service';

export interface VerificationInfo {
  websiteId: string;
  domain: string;
  is_verified: boolean;
  verified_at: string | null;
  verification_method: string | null;
  raw_token: string;
  verification_token: string;
  instructions: {
    dns: {
      type: 'TXT';
      host: string;
      value: string;
      description: string;
    };
    meta: {
      tag: string;
      description: string;
    };
    file: {
      url: string;
      content: string;
      description: string;
    };
  };
}

export interface VerificationResult {
  success: boolean;
  is_verified: boolean;
  verified_at?: string;
  verification_method?: string;
  message: string;
  details?: {
    dnsChecked?: boolean;
    dnsFoundRecords?: string[];
    metaChecked?: boolean;
    metaFound?: boolean;
    wellKnownChecked?: boolean;
  };
}

export const verificationService = {
  /**
   * Generates or retrieves a stable verification token for a website
   */
  async getVerificationToken(website: any): Promise<string> {
    if (website.verification_token) {
      return website.verification_token;
    }

    const secret = process.env.INTERNAL_SECRET || 'cyberhealth-verify-secret';
    const rawToken = crypto
      .createHmac('sha256', secret)
      .update(website.id)
      .digest('hex')
      .slice(0, 24);

    // Persist to database if column exists
    try {
      await (supabaseAdmin || supabaseClient)
        .from('websites')
        .update({ verification_token: rawToken })
        .eq('id', website.id);
    } catch (e) {
      // Non-blocking if column not yet added
    }

    return rawToken;
  },

  /**
   * Get full verification instructions and status for a website
   */
  async getVerificationInfo(userId: string, websiteId: string): Promise<VerificationInfo> {
    const website = await websiteService.getWebsiteById(userId, websiteId);
    const rawToken = await this.getVerificationToken(website);
    const tokenRecord = `cyberhealth-verify=${rawToken}`;

    return {
      websiteId: website.id,
      domain: website.domain,
      is_verified: !!website.is_verified,
      verified_at: website.verified_at || null,
      verification_method: website.verification_method || null,
      raw_token: rawToken,
      verification_token: tokenRecord,
      instructions: {
        dns: {
          type: 'TXT',
          host: '@',
          value: tokenRecord,
          description: `Add a DNS TXT record at apex domain or at '_cyberhealth.${website.domain}' with value '${tokenRecord}'`
        },
        meta: {
          tag: `<meta name="cyberhealth-verification" content="${rawToken}" />`,
          description: `Add this meta tag inside the <head> section of your homepage https://${website.domain}`
        },
        file: {
          url: `https://${website.domain}/.well-known/cyberhealth-verification.txt`,
          content: tokenRecord,
          description: `Upload a plain text file containing '${tokenRecord}' at /.well-known/cyberhealth-verification.txt`
        }
      }
    };
  },

  /**
   * Execute live verification probes (DNS TXT, Meta tag, and Well-Known file)
   */
  async verifyDomain(userId: string, websiteId: string): Promise<VerificationResult> {
    const website = await websiteService.getWebsiteById(userId, websiteId);
    const rawToken = await this.getVerificationToken(website);
    const expectedRecord = `cyberhealth-verify=${rawToken}`;
    const domain = website.domain;

    let dnsSuccess = false;
    let metaSuccess = false;
    let fileSuccess = false;
    let allTxtRecords: string[] = [];

    // 1. Probe DNS TXT Records
    try {
      // Check apex domain
      try {
        const apexRecords = await dns.resolveTxt(domain);
        const apexStrings = apexRecords.map((chunk) => chunk.join(''));
        allTxtRecords.push(...apexStrings);
      } catch (err: any) {
        // DNS lookup may throw if no TXT records exist
      }

      // Check _cyberhealth subdomain
      try {
        const subRecords = await dns.resolveTxt(`_cyberhealth.${domain}`);
        const subStrings = subRecords.map((chunk) => chunk.join(''));
        allTxtRecords.push(...subStrings);
      } catch (err: any) {
        // Subdomain check
      }

      for (const record of allTxtRecords) {
        if (
          record.trim() === expectedRecord ||
          record.trim() === rawToken ||
          record.includes(expectedRecord)
        ) {
          dnsSuccess = true;
          break;
        }
      }
    } catch (dnsErr: any) {
      console.warn(`DNS verification check error for ${domain}:`, dnsErr.message);
    }

    // 2. Probe HTML Meta Tag
    if (!dnsSuccess) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const targetUrl = `https://${domain}`;
        const res = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'CyberHealth-Domain-Verifier/1.0',
            'Accept': 'text/html,application/xhtml+xml'
          }
        }).catch(async () => {
          // Fallback to HTTP if HTTPS fails
          return await fetch(`http://${domain}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'CyberHealth-Domain-Verifier/1.0' }
          });
        });

        clearTimeout(timeout);

        if (res && res.ok) {
          const html = await res.text();
          // Regex for <meta name="cyberhealth-verification" content="..." />
          const metaRegex = /<meta\s+[^>]*name=["']cyberhealth-verification["'][^>]*content=["']([^"']+)["'][^>]*>/i;
          const metaRegexReverse = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']cyberhealth-verification["'][^>]*>/i;

          const match1 = html.match(metaRegex);
          const match2 = html.match(metaRegexReverse);
          const foundContent = match1?.[1] || match2?.[1];

          if (foundContent && (foundContent.trim() === rawToken || foundContent.trim() === expectedRecord)) {
            metaSuccess = true;
          }
        }
      } catch (metaErr: any) {
        console.warn(`Meta verification check error for ${domain}:`, metaErr.message);
      }
    }

    // 3. Probe Well-Known file
    if (!dnsSuccess && !metaSuccess) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const wellKnownUrl = `https://${domain}/.well-known/cyberhealth-verification.txt`;
        const res = await fetch(wellKnownUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'CyberHealth-Domain-Verifier/1.0' }
        });
        clearTimeout(timeout);

        if (res && res.ok) {
          const body = await res.text();
          if (body.includes(rawToken) || body.includes(expectedRecord)) {
            fileSuccess = true;
          }
        }
      } catch (fileErr) {
        // Ignore file fetch error
      }
    }

    const isVerified = dnsSuccess || metaSuccess || fileSuccess;
    const method = dnsSuccess ? 'dns_txt' : metaSuccess ? 'meta_tag' : fileSuccess ? 'well_known' : null;

    if (isVerified && method) {
      const now = new Date().toISOString();
      try {
        await (supabaseAdmin || supabaseClient)
          .from('websites')
          .update({
            is_verified: true,
            verified_at: now,
            verification_method: method
          })
          .eq('id', website.id);
      } catch (dbErr: any) {
        console.warn('Could not persist verified status to DB:', dbErr.message);
      }

      return {
        success: true,
        is_verified: true,
        verified_at: now,
        verification_method: method,
        message: `Domain ${domain} verified successfully via ${method.replace('_', ' ').toUpperCase()}!`
      };
    }

    return {
      success: false,
      is_verified: false,
      message: `Verification check could not confirm ownership of ${domain}. Ensure DNS TXT records or HTML meta tag are configured and propagated.`,
      details: {
        dnsChecked: true,
        dnsFoundRecords: allTxtRecords.slice(0, 5),
        metaChecked: true,
        metaFound: false,
        wellKnownChecked: true
      }
    };
  }
};

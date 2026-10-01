import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

export interface MixedContentItem {
  type: 'script' | 'stylesheet' | 'iframe' | 'form' | 'media';
  url: string;
  tag: string;
}

export function detectMixedContent(html: string): MixedContentItem[] {
  const items: MixedContentItem[] = [];

  // Active Mixed Content: Scripts
  const scriptRegex = /<script\b[^>]*\bsrc=["'](http:\/\/[^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    items.push({ type: 'script', url: match[1], tag: match[0] });
  }

  // Active Mixed Content: Stylesheets
  const styleRegex = /<link\b[^>]*\bhref=["'](http:\/\/[^"']+)["'][^>]*>/gi;
  while ((match = styleRegex.exec(html)) !== null) {
    if (match[0].toLowerCase().includes('stylesheet')) {
      items.push({ type: 'stylesheet', url: match[1], tag: match[0] });
    }
  }

  // Active Mixed Content: Iframes
  const iframeRegex = /<iframe\b[^>]*\bsrc=["'](http:\/\/[^"']+)["'][^>]*>/gi;
  while ((match = iframeRegex.exec(html)) !== null) {
    items.push({ type: 'iframe', url: match[1], tag: match[0] });
  }

  // Insecure Form Submissions
  const formRegex = /<form\b[^>]*\baction=["'](http:\/\/[^"']+)["'][^>]*>/gi;
  while ((match = formRegex.exec(html)) !== null) {
    items.push({ type: 'form', url: match[1], tag: match[0] });
  }

  // Passive Mixed Content: Images, Audio, Video
  const mediaRegex = /<(?:img|audio|video|source)\b[^>]*\bsrc=["'](http:\/\/[^"']+)["'][^>]*>/gi;
  while ((match = mediaRegex.exec(html)) !== null) {
    items.push({ type: 'media', url: match[1], tag: match[0] });
  }

  return items;
}

export const MixedContentCheck: SecurityCheck = {
  id: 'mixed-content',
  category: 'BROWSER_SECURITY',
  async execute(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const url = `https://${context.targetHostname}`;
    const agent = createSafeAgent(context.targetIp, context.targetHostname);

    try {
      const response = await axios.get(url, {
        httpsAgent: agent,
        headers: SCANNER_REQUEST_HEADERS,
        timeout: 10000,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: () => true
      });

      const html = typeof response.data === 'string' ? response.data : '';
      if (!html || html.length < 50) {
        return findings;
      }

      const items = detectMixedContent(html);
      const activeItems = items.filter(i => i.type === 'script' || i.type === 'stylesheet' || i.type === 'iframe');
      const formItems = items.filter(i => i.type === 'form');
      const passiveItems = items.filter(i => i.type === 'media');

      if (activeItems.length > 0) {
        findings.push({
          check_category: this.category,
          check_id: 'ACTIVE_MIXED_CONTENT',
          status: 'FAIL',
          title: `Active Mixed Content Detected (${activeItems.length} Insecure Resources)`,
          description: `The HTTPS page requests ${activeItems.length} active executable resources (scripts, stylesheets, or iframes) over unencrypted HTTP. Modern browsers will block these resources or allow Man-in-the-Middle (MITM) tampering.`,
          severity: 'HIGH',
          confidence: 1.0,
          evidence: {
            details: activeItems.slice(0, 5).map(i => ({ type: i.type, url: i.url }))
          }
        });
      }

      if (formItems.length > 0) {
        findings.push({
          check_category: this.category,
          check_id: 'INSECURE_FORM_ACTION',
          status: 'FAIL',
          title: 'Insecure Form Submission Target',
          description: `Form elements submit sensitive user data to unencrypted HTTP endpoints (${formItems[0].url}). Browsers flag these forms with security warnings and data can be snooped in transit.`,
          severity: 'HIGH',
          confidence: 1.0,
          evidence: { details: formItems.map(f => f.url) }
        });
      }

      if (passiveItems.length > 0) {
        findings.push({
          check_category: this.category,
          check_id: 'PASSIVE_MIXED_CONTENT',
          status: 'WARN',
          title: `Passive Mixed Content Detected (${passiveItems.length} Insecure Media)`,
          description: `Images, audio, or video resources are embedded via unencrypted HTTP. While typically not blocked by default, this degrades the HTTPS lock icon and leaks viewing metadata.`,
          severity: 'MEDIUM',
          confidence: 1.0,
          evidence: {
            details: passiveItems.slice(0, 5).map(i => i.url)
          }
        });
      }

      if (items.length === 0) {
        findings.push({
          check_category: this.category,
          check_id: 'NO_MIXED_CONTENT',
          status: 'PASS',
          title: 'Zero Mixed Content Deficits',
          description: 'All embedded scripts, styles, forms, and media are securely referenced using HTTPS or relative paths.',
          severity: 'INFO',
          confidence: 1.0
        });
      }

    } catch (err: any) {
      // Non-blocking if page could not be fetched
    }

    return findings;
  }
};

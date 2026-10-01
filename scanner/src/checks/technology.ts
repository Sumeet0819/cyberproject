import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

export const TechnologyCheck: SecurityCheck = {
  id: 'tech-detection',
  category: 'TECHNOLOGY',
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
        validateStatus: () => true
      });

      const headers = response.headers;

      // Check Server Header
      if (headers['server']) {
        findings.push({
          check_category: this.category,
          check_id: 'SERVER_HEADER_EXPOSED',
          status: 'WARN',
          title: 'Server Banner Exposed',
          description: 'The server software version is visible. This can help attackers find specific exploits.',
          severity: 'LOW',
          confidence: 1.0,
          evidence: { value: String(headers['server']) }
        });
      }

      // Check X-Powered-By
      if (headers['x-powered-by']) {
        findings.push({
          check_category: this.category,
          check_id: 'X_POWERED_BY_EXPOSED',
          status: 'WARN',
          title: 'Framework Information Exposed',
          description: 'The X-Powered-By header reveals backend framework details.',
          severity: 'LOW',
          confidence: 1.0,
          evidence: { value: String(headers['x-powered-by']) }
        });
      }

      // Very basic HTML inspection for MVP (e.g., WordPress meta tag)
      if (typeof response.data === 'string') {
        if (response.data.includes('<meta name="generator" content="WordPress')) {
          findings.push({
            check_category: this.category,
            check_id: 'CMS_WORDPRESS_DETECTED',
            status: 'INFO', // Just informational
            title: 'WordPress Detected',
            description: 'The site appears to be running WordPress.',
            severity: 'INFO',
            confidence: 0.9,
          });
        }
      }

    } catch (error: any) {
      // Ignored for tech detection
    }

    return findings;
  }
};

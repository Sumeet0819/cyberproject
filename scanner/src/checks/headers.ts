import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

export const HeadersCheck: SecurityCheck = {
  id: 'security-headers',
  category: 'HTTP_HEADERS',
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

      // Check HSTS
      if (headers['strict-transport-security']) {
        findings.push({
          check_category: this.category,
          check_id: 'HSTS_PRESENT',
          status: 'PASS',
          title: 'HSTS Header Present',
          description: 'HTTP Strict Transport Security is enabled.',
          severity: 'INFO',
          confidence: 1.0,
          evidence: { value: headers['strict-transport-security'] }
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'HSTS_MISSING',
          status: 'FAIL',
          title: 'HSTS Header Missing',
          description: 'The Strict-Transport-Security header is not set. This leaves the site vulnerable to downgrade attacks.',
          severity: 'HIGH',
          confidence: 1.0
        });
      }

      // Check X-Frame-Options or CSP frame-ancestors
      const xfo = headers['x-frame-options'];
      const csp = headers['content-security-policy'] as string | undefined;

      if (xfo || (csp && csp.includes('frame-ancestors'))) {
        findings.push({
          check_category: this.category,
          check_id: 'CLICKJACKING_PROTECTION_PRESENT',
          status: 'PASS',
          title: 'Clickjacking Protection Present',
          description: 'X-Frame-Options or CSP frame-ancestors is configured.',
          severity: 'INFO',
          confidence: 1.0
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'CLICKJACKING_PROTECTION_MISSING',
          status: 'FAIL',
          title: 'Clickjacking Protection Missing',
          description: 'Neither X-Frame-Options nor CSP frame-ancestors is present.',
          severity: 'MEDIUM',
          confidence: 1.0
        });
      }

    } catch (error: any) {
       findings.push({
        check_category: this.category,
        check_id: 'HEADERS_CHECK_FAILED',
        status: 'WARN',
        title: 'Could not fetch headers',
        description: `Failed to fetch response for header analysis: ${error.message}`,
        severity: 'INFO',
        confidence: 0.5
      });
    }

    return findings;
  }
};

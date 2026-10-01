import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import tls from 'tls';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

export const HttpsCheck: SecurityCheck = {
  id: 'https-availability',
  category: 'TLS_HTTPS',
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
        validateStatus: () => true // Resolve on all statuses
      });

      // Check if connection was successful
      findings.push({
        check_category: this.category,
        check_id: 'HTTPS_AVAILABLE',
        status: 'PASS',
        title: 'HTTPS is available',
        description: 'The server successfully accepts HTTPS connections.',
        severity: 'INFO',
        confidence: 1.0,
      });

      // Inspect TLS socket if available
      const socket = (response.request?.socket || response.request?.res?.socket) as tls.TLSSocket | undefined;
      const protocol = socket?.getProtocol ? socket.getProtocol() : null;

      if (protocol === 'TLSv1.2' || protocol === 'TLSv1.3' || !protocol) {
        findings.push({
          check_category: this.category,
          check_id: 'MODERN_TLS',
          status: 'PASS',
          title: 'Modern TLS Supported',
          description: `The server supports ${protocol || 'modern TLS'}.`,
          severity: 'INFO',
          confidence: 1.0,
          evidence: { value: protocol || 'TLSv1.2+' }
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'OUTDATED_TLS',
          status: 'FAIL',
          title: 'Outdated TLS Protocol',
          description: `The server is using an outdated TLS version: ${protocol}.`,
          severity: 'HIGH',
          confidence: 1.0,
          evidence: { value: protocol }
        });
      }

      // Certificate Expiry & Validity Inspection
      if (socket && typeof socket.getPeerCertificate === 'function') {
        try {
          const peerCert = socket.getPeerCertificate(true);
          if (peerCert && peerCert.valid_to) {
            const expiryDate = new Date(peerCert.valid_to);
            const now = new Date();
            const msRemaining = expiryDate.getTime() - now.getTime();
            const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            const issuer = peerCert.issuer?.O || peerCert.issuer?.CN || 'Recognized CA';

            if (daysRemaining <= 0) {
              findings.push({
                check_category: this.category,
                check_id: 'TLS_CERT_EXPIRED',
                status: 'FAIL',
                title: 'SSL/TLS Certificate Expired',
                description: `The SSL/TLS certificate expired on ${expiryDate.toISOString().split('T')[0]}. Browsers will block access and display critical security warning screens.`,
                severity: 'CRITICAL',
                confidence: 1.0,
                evidence: {
                  value: `Expired: ${expiryDate.toISOString().split('T')[0]}`,
                  details: { issuer, daysRemaining }
                }
              });
            } else if (daysRemaining <= 14) {
              findings.push({
                check_category: this.category,
                check_id: 'TLS_CERT_EXPIRING_CRITICAL',
                status: 'FAIL',
                title: `SSL/TLS Certificate Expiring Soon (${daysRemaining} Days Left)`,
                description: `The SSL/TLS certificate expires in only ${daysRemaining} days (${expiryDate.toISOString().split('T')[0]}). Renew immediately to avoid user outage.`,
                severity: 'HIGH',
                confidence: 1.0,
                evidence: {
                  value: `Expires: ${expiryDate.toISOString().split('T')[0]}`,
                  details: { issuer, daysRemaining }
                }
              });
            } else if (daysRemaining <= 30) {
              findings.push({
                check_category: this.category,
                check_id: 'TLS_CERT_EXPIRING_SOON',
                status: 'WARN',
                title: `SSL/TLS Certificate Renewal Window (${daysRemaining} Days Left)`,
                description: `Certificate will expire in ${daysRemaining} days (${expiryDate.toISOString().split('T')[0]}). Ensure automated renewal (e.g. Certbot/ACME) is functional.`,
                severity: 'MEDIUM',
                confidence: 1.0,
                evidence: {
                  value: `Expires: ${expiryDate.toISOString().split('T')[0]}`,
                  details: { issuer, daysRemaining }
                }
              });
            } else {
              findings.push({
                check_category: this.category,
                check_id: 'TLS_CERT_VALID',
                status: 'PASS',
                title: `SSL/TLS Certificate Valid (${daysRemaining} Days Remaining)`,
                description: `Certificate issued by ${issuer} is healthy and valid through ${expiryDate.toISOString().split('T')[0]}.`,
                severity: 'INFO',
                confidence: 1.0,
                evidence: {
                  value: `Expires: ${expiryDate.toISOString().split('T')[0]} (${daysRemaining}d)`,
                  details: { issuer, daysRemaining }
                }
              });
            }
          }
        } catch (certErr: any) {
          // Socket certificate extraction non-blocking
        }
      }

    } catch (error: any) {
      findings.push({
        check_category: this.category,
        check_id: 'HTTPS_UNAVAILABLE',
        status: 'FAIL',
        title: 'HTTPS is not available',
        description: `Failed to connect via HTTPS: ${error.message}`,
        severity: 'CRITICAL',
        confidence: 1.0,
        evidence: { details: error.message }
      });
    }

    return findings;
  }
};

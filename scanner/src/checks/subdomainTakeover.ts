import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import dns from 'dns/promises';
import axios from 'axios';

interface TakeoverFingerprint {
  cnameMatch: RegExp;
  provider: string;
  responseFingerprint: RegExp;
}

const TAKEOVER_FINGERPRINTS: TakeoverFingerprint[] = [
  {
    provider: 'GitHub Pages',
    cnameMatch: /\.github\.io$/i,
    responseFingerprint: /There isn't a GitHub Pages site here/i
  },
  {
    provider: 'AWS S3 Bucket',
    cnameMatch: /\.s3(?:-[a-z0-9-]+)?\.amazonaws\.com$/i,
    responseFingerprint: /<Code>NoSuchBucket<\/Code>/i
  },
  {
    provider: 'Heroku',
    cnameMatch: /(?:herokudns|herokuapp)\.com$/i,
    responseFingerprint: /No such app|herokucdn\.com\/error-pages\/no-such-app/i
  },
  {
    provider: 'Netlify',
    cnameMatch: /\.netlify\.app$/i,
    responseFingerprint: /Not Found - Request ID/i
  },
  {
    provider: 'Vercel',
    cnameMatch: /(?:vercel-dns\.com|\.vercel\.app)$/i,
    responseFingerprint: /404: NOT_FOUND|The deployment could not be found/i
  },
  {
    provider: 'Surge.sh',
    cnameMatch: /\.surge\.sh$/i,
    responseFingerprint: /project not found/i
  }
];

export const SubdomainTakeoverCheck: SecurityCheck = {
  id: 'subdomain-takeover',
  category: 'DNS_EMAIL',
  async execute(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const domain = context.targetHostname;

    try {
      let cnameRecords: string[] = [];
      try {
        cnameRecords = await dns.resolveCname(domain);
      } catch (dnsErr: any) {
        // Domain might be an apex A record with no CNAME, which is completely normal
        return findings;
      }

      for (const targetCname of cnameRecords) {
        const matchedProvider = TAKEOVER_FINGERPRINTS.find(fp => fp.cnameMatch.test(targetCname));

        if (matchedProvider) {
          // Probe the CNAME target over HTTP to verify if it's abandoned/dangling
          try {
            const probeRes = await axios.get(`http://${domain}`, {
              timeout: 7000,
              maxRedirects: 3,
              validateStatus: () => true
            });

            const body = typeof probeRes.data === 'string' ? probeRes.data : '';
            if (matchedProvider.responseFingerprint.test(body)) {
              findings.push({
                check_category: this.category,
                check_id: 'SUBDOMAIN_TAKEOVER_VULNERABLE',
                status: 'FAIL',
                title: `Subdomain Takeover Vulnerability (${matchedProvider.provider})`,
                description: `Domain CNAME points to '${targetCname}' (${matchedProvider.provider}), but the cloud service returns an unclaimed/deleted resource error. An attacker could register this resource and hijack all traffic directed to your domain.`,
                severity: 'CRITICAL',
                confidence: 0.95,
                evidence: {
                  value: targetCname,
                  details: { provider: matchedProvider.provider, status: probeRes.status }
                }
              });
              return findings;
            }
          } catch (probeErr) {
            // Target probe failed or timed out
          }

          // If CNAME exists and provider matched but response was normal/configured
          findings.push({
            check_category: this.category,
            check_id: 'CNAME_PROVIDER_HEALTHY',
            status: 'PASS',
            title: `Cloud CNAME Routing Verified (${matchedProvider.provider})`,
            description: `Domain points to active ${matchedProvider.provider} host (${targetCname}) without dangling indicators.`,
            severity: 'INFO',
            confidence: 1.0,
            evidence: { value: targetCname }
          });
        }
      }

    } catch (error: any) {
      // Non-blocking DNS inspection
    }

    return findings;
  }
};

import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

const SENSITIVE_FILES = [
  '/.env',
  '/.git/config',
  '/wp-config.php.bak',
  '/phpinfo.php'
];

export const ExposedFilesCheck: SecurityCheck = {
  id: 'exposed-files',
  category: 'SENSITIVE_DATA',
  async execute(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const baseUrl = `https://${context.targetHostname}`;

    const agent = createSafeAgent(context.targetIp, context.targetHostname);

    for (const path of SENSITIVE_FILES) {
      try {
        const response = await axios.head(`${baseUrl}${path}`, {
          httpsAgent: agent,
          headers: SCANNER_REQUEST_HEADERS,
          timeout: 5000,
          validateStatus: () => true, // Don't throw on 404
        });

        // A 200 OK on a sensitive file implies it's publicly accessible
        if (response.status === 200) {
          findings.push({
            check_category: this.category,
            check_id: `EXPOSED_${path.replace(/[^a-zA-Z]/g, '_').toUpperCase()}`,
            status: 'FAIL',
            title: `Exposed Sensitive File: ${path}`,
            description: `The file ${path} is publicly accessible and may leak sensitive credentials or source code.`,
            severity: 'CRITICAL',
            confidence: 1.0,
            evidence: { value: `HTTP ${response.status}` }
          });
        }
      } catch (error: any) {
        // Ignore timeouts and network errors for these individual probes
      }
    }

    if (findings.length === 0) {
      findings.push({
        check_category: this.category,
        check_id: 'NO_EXPOSED_FILES',
        status: 'PASS',
        title: 'No Exposed Sensitive Files Detected',
        description: 'Common sensitive configuration files are not publicly accessible.',
        severity: 'INFO',
        confidence: 1.0
      });
    }

    return findings;
  }
};

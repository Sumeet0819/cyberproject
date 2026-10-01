import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import dns from 'dns/promises';

export const DnsCheck: SecurityCheck = {
  id: 'dns-security',
  category: 'DNS_EMAIL',
  async execute(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const domain = context.targetHostname;

    try {
      const records = await dns.resolveTxt(domain);
      const txtRecords = records.map(chunk => chunk.join(''));

      // Check SPF
      const spfRecord = txtRecords.find(r => r.startsWith('v=spf1'));
      if (spfRecord) {
        findings.push({
          check_category: this.category,
          check_id: 'SPF_PRESENT',
          status: 'PASS',
          title: 'SPF Record Found',
          description: 'Sender Policy Framework (SPF) is configured.',
          severity: 'INFO',
          confidence: 1.0,
          evidence: { value: spfRecord }
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'SPF_MISSING',
          status: 'FAIL',
          title: 'SPF Record Missing',
          description: 'No SPF record found. Your domain could be used for email spoofing.',
          severity: 'HIGH',
          confidence: 1.0
        });
      }

    } catch (error: any) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        findings.push({
          check_category: this.category,
          check_id: 'SPF_MISSING',
          status: 'FAIL',
          title: 'SPF Record Missing',
          description: 'No TXT records found. Your domain could be used for email spoofing.',
          severity: 'HIGH',
          confidence: 1.0
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'DNS_CHECK_FAILED',
          status: 'WARN',
          title: 'DNS Lookup Failed',
          description: `Failed to fetch TXT records: ${error.message}`,
          severity: 'INFO',
          confidence: 0.5
        });
      }
    }

    // Check DMARC
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const dmarcRecords = await dns.resolveTxt(dmarcDomain);
      const dmarcTxt = dmarcRecords.map(chunk => chunk.join(''));
      
      const dmarcRecord = dmarcTxt.find(r => r.startsWith('v=DMARC1'));
      if (dmarcRecord) {
        findings.push({
          check_category: this.category,
          check_id: 'DMARC_PRESENT',
          status: 'PASS',
          title: 'DMARC Record Found',
          description: 'DMARC is configured.',
          severity: 'INFO',
          confidence: 1.0,
          evidence: { value: dmarcRecord }
        });
      } else {
        findings.push({
          check_category: this.category,
          check_id: 'DMARC_MISSING',
          status: 'FAIL',
          title: 'DMARC Record Missing',
          description: 'No DMARC record found on _dmarc subdomain.',
          severity: 'HIGH',
          confidence: 1.0
        });
      }
    } catch (error: any) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
         findings.push({
          check_category: this.category,
          check_id: 'DMARC_MISSING',
          status: 'FAIL',
          title: 'DMARC Record Missing',
          description: 'No DMARC record found. This increases email spoofing risk.',
          severity: 'HIGH',
          confidence: 1.0
        });
      }
    }

    return findings;
  }
};

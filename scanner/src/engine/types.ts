export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type CheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'INFO';

export interface Evidence {
  value?: string;
  details?: any;
}

export interface Finding {
  check_category: string;
  check_id: string;
  status: CheckStatus;
  title: string;
  description: string;
  severity: Severity;
  confidence: number;
  evidence?: Evidence;
}

export interface ScanContext {
  targetUrl: string;
  targetHostname: string;
  targetIp: string; // The pinned IP address for SSRF protection
}

export interface SecurityCheck {
  id: string;
  category: string;
  execute(context: ScanContext): Promise<Finding[]>;
}

export interface ScanProgressEvent {
  stepId: string;
  stage: 'START' | 'PROGRESS' | 'COMPLETE' | 'ERROR';
  message: string;
  findingsCount?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}


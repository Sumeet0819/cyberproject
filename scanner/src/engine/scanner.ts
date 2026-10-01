import { getSafeIp } from './ssrfGuard';
import { Finding, ScanContext, SecurityCheck, ScanProgressEvent } from './types';
import { parse } from 'url';

// A mock array of checks to be populated later
const registeredChecks: SecurityCheck[] = [];

/**
 * Register a security check to the engine
 */
export function registerCheck(check: SecurityCheck) {
  registeredChecks.push(check);
}

/**
 * Main scan dispatcher (synchronous)
 * @param targetUrl The full URL to scan (e.g., https://example.com)
 */
export async function runScan(targetUrl: string): Promise<Finding[]> {
  const parsedUrl = parse(targetUrl);
  if (!parsedUrl.hostname) {
    throw new Error('Invalid target URL');
  }

  // 1. Resolve and Pin the IP to prevent SSRF
  const targetIp = await getSafeIp(parsedUrl.hostname);

  const context: ScanContext = {
    targetUrl,
    targetHostname: parsedUrl.hostname,
    targetIp,
  };

  const allFindings: Finding[] = [];

  for (const check of registeredChecks) {
    try {
      const findings = await check.execute(context);
      allFindings.push(...findings);
    } catch (error: any) {
      console.error(`Check ${check.id} failed:`, error.message);
    }
  }

  return allFindings;
}

/**
 * Streaming scan dispatcher emitting real-time progress events
 */
export async function runScanStream(
  targetUrl: string,
  onProgress: (event: ScanProgressEvent) => void
): Promise<Finding[]> {
  const parsedUrl = parse(targetUrl);
  if (!parsedUrl.hostname) {
    throw new Error('Invalid target URL');
  }

  // 1. SSRF Check: Resolve and pin IP
  onProgress({
    stepId: 'ssrf',
    stage: 'START',
    message: `Resolving hostname ${parsedUrl.hostname} and auditing IP range...`,
    timestamp: new Date().toISOString()
  });

  const targetIp = await getSafeIp(parsedUrl.hostname);

  onProgress({
    stepId: 'ssrf',
    stage: 'COMPLETE',
    message: `Resolved ${parsedUrl.hostname} to verified public IP ${targetIp}`,
    metadata: { targetIp, targetHostname: parsedUrl.hostname },
    timestamp: new Date().toISOString()
  });

  const context: ScanContext = {
    targetUrl,
    targetHostname: parsedUrl.hostname,
    targetIp,
  };

  const allFindings: Finding[] = [];

  for (const check of registeredChecks) {
    onProgress({
      stepId: check.id,
      stage: 'START',
      message: `Executing ${check.id} checks...`,
      timestamp: new Date().toISOString()
    });

    try {
      const findings = await check.execute(context);
      allFindings.push(...findings);

      onProgress({
        stepId: check.id,
        stage: 'COMPLETE',
        message: `Completed ${check.id} (${findings.length} findings evaluated)`,
        findingsCount: findings.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`Check ${check.id} failed:`, error.message);
      onProgress({
        stepId: check.id,
        stage: 'ERROR',
        message: `Check ${check.id} error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return allFindings;
}


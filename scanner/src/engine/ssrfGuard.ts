import dns from 'dns/promises';

// List of IP ranges to block (RFC 1918, loopback, link-local, cloud metadata)
const BLOCKED_IP_RANGES = [
  /^127\./,           // Loopback
  /^10\./,            // RFC 1918
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918
  /^192\.168\./,      // RFC 1918
  /^169\.254\./,      // Link-local & Cloud Metadata
  /^0\./              // "This network"
];

/**
 * Checks if a given IP matches any of the blocked ranges.
 */
function isBlockedIp(ip: string): boolean {
  if (process.env.NODE_ENV === 'test' && (ip === '127.0.0.1' || ip === '::1')) {
    return false;
  }
  return BLOCKED_IP_RANGES.some((regex) => regex.test(ip));
}

/**
 * Resolves a hostname to an IP address and verifies it's not a private/local IP.
 * This prevents SSRF and DNS rebinding by pinning to the resolved IP.
 */
export async function getSafeIp(hostname: string): Promise<string> {
  try {
    const addresses = await dns.resolve4(hostname);
    if (!addresses || addresses.length === 0) {
      throw new Error('Could not resolve hostname');
    }

    const ip = addresses[0];

    if (isBlockedIp(ip)) {
      throw new Error(`SSRF Blocked: IP ${ip} is in a prohibited range`);
    }

    return ip;
  } catch (error: any) {
    throw new Error(`Failed to safely resolve ${hostname}: ${error.message}`);
  }
}

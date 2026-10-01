import https from 'https';
import dns from 'dns';

export const SCANNER_REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Creates a Node.js https.Agent that enforces the SSRF-pinned IP for the target hostname,
 * while safely handling Node 20+ autoSelectFamily ({ all: true }) and variable callback arity.
 */
export function createSafeAgent(pinnedIp: string, targetHostname: string): https.Agent {
  return new https.Agent({
    lookup: (hostname, options, callback) => {
      // Normalize callback and options (options is optional in dns.lookup)
      const cb = (typeof options === 'function' ? options : callback) as (
        err: NodeJS.ErrnoException | null,
        address: any,
        family?: number
      ) => void;

      const opts = typeof options === 'object' && options !== null ? options : {};

      // If resolving the target hostname, return the pinned IP
      if (hostname.toLowerCase() === targetHostname.toLowerCase()) {
        if (opts.all) {
          cb(null, [{ address: pinnedIp, family: 4 }]);
        } else {
          cb(null, pinnedIp, 4);
        }
        return;
      }

      // If following redirects to another host (e.g. cdn or subdomain), delegate to standard DNS lookup
      if (typeof options === 'function') {
        dns.lookup(hostname, options);
      } else {
        dns.lookup(hostname, options, callback);
      }
    },
    rejectUnauthorized: false, // Inspect connection even if self-signed/invalid certificate
  });
}

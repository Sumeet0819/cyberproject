import { SecurityCheck, ScanContext, Finding } from '../engine/types';
import axios from 'axios';
import { createSafeAgent, SCANNER_REQUEST_HEADERS } from '../engine/safeAgent';

export interface ParsedCookie {
  raw: string;
  name: string;
  value: string;
  isSecure: boolean;
  isHttpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none' | null;
}

export function parseCookieHeader(rawHeader: string): ParsedCookie {
  const parts = rawHeader.split(';').map(p => p.trim());
  const [nameVal, ...attrs] = parts;
  const eqIdx = nameVal.indexOf('=');
  const name = eqIdx !== -1 ? nameVal.substring(0, eqIdx).trim() : nameVal.trim();
  const value = eqIdx !== -1 ? nameVal.substring(eqIdx + 1).trim() : '';

  let isSecure = false;
  let isHttpOnly = false;
  let sameSite: 'strict' | 'lax' | 'none' | null = null;

  for (const attr of attrs) {
    const lower = attr.toLowerCase();
    if (lower === 'secure') {
      isSecure = true;
    } else if (lower === 'httponly') {
      isHttpOnly = true;
    } else if (lower.startsWith('samesite=')) {
      const val = lower.split('=')[1]?.trim();
      if (val === 'strict' || val === 'lax' || val === 'none') {
        sameSite = val;
      }
    }
  }

  return {
    raw: rawHeader,
    name,
    value,
    isSecure,
    isHttpOnly,
    sameSite
  };
}

const SESSION_COOKIE_REGEX = /session|token|auth|jwt|sid|id|remember|login|user/i;

export const CookiesCheck: SecurityCheck = {
  id: 'cookie-security',
  category: 'COOKIE_SECURITY',
  async execute(context: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const url = context.targetUrl.startsWith('http') ? context.targetUrl : `https://${context.targetHostname}`;
    const agent = createSafeAgent(context.targetIp, context.targetHostname);

    try {
      const response = await axios.get(url, {
        httpsAgent: agent,
        headers: SCANNER_REQUEST_HEADERS,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true
      });

      const rawCookies: string[] = [];
      const setCookieHeader = response.headers['set-cookie'];

      if (Array.isArray(setCookieHeader)) {
        rawCookies.push(...setCookieHeader);
      } else if (typeof setCookieHeader === 'string') {
        rawCookies.push(setCookieHeader);
      }

      if (rawCookies.length === 0) {
        findings.push({
          check_category: this.category,
          check_id: 'NO_COOKIES_FOUND',
          status: 'INFO',
          title: 'No Direct Cookies Set',
          description: 'No Set-Cookie headers were returned on the root endpoint during inspection.',
          severity: 'INFO',
          confidence: 1.0
        });
        return findings;
      }

      const parsedCookies = rawCookies.map(parseCookieHeader);
      let allPassed = true;

      for (const cookie of parsedCookies) {
        const isSessionCookie = SESSION_COOKIE_REGEX.test(cookie.name);

        // 1. Check Secure flag
        if (!cookie.isSecure) {
          allPassed = false;
          findings.push({
            check_category: this.category,
            check_id: 'COOKIE_MISSING_SECURE',
            status: 'FAIL',
            title: `Insecure Cookie: ${cookie.name} (Missing Secure Flag)`,
            description: `Cookie "${cookie.name}" is missing the 'Secure' attribute. Browsers may transmit this cookie over unencrypted HTTP channels, exposing session credentials to interception.`,
            severity: isSessionCookie ? 'HIGH' : 'MEDIUM',
            confidence: 1.0,
            evidence: { value: cookie.raw }
          });
        }

        // 2. Check HttpOnly flag
        if (!cookie.isHttpOnly) {
          allPassed = false;
          findings.push({
            check_category: this.category,
            check_id: 'COOKIE_MISSING_HTTPONLY',
            status: 'FAIL',
            title: `Cookie Accessible via Script: ${cookie.name} (Missing HttpOnly)`,
            description: `Cookie "${cookie.name}" is missing the 'HttpOnly' flag, allowing client-side scripts to read it via document.cookie and increasing vulnerability to XSS credential harvesting.`,
            severity: isSessionCookie ? 'HIGH' : 'LOW',
            confidence: 1.0,
            evidence: { value: cookie.raw }
          });
        }

        // 3. Check SameSite attribute
        if (!cookie.sameSite || cookie.sameSite === 'none') {
          allPassed = false;
          findings.push({
            check_category: this.category,
            check_id: 'COOKIE_WEAK_SAMESITE',
            status: 'WARN',
            title: `Cookie Weak SameSite Policy: ${cookie.name}`,
            description: `Cookie "${cookie.name}" does not configure SameSite=Lax or SameSite=Strict. This allows the cookie to be sent with cross-site requests, increasing Cross-Site Request Forgery (CSRF) exposure.`,
            severity: 'MEDIUM',
            confidence: 1.0,
            evidence: { value: cookie.raw }
          });
        }
      }

      if (allPassed && parsedCookies.length > 0) {
        findings.push({
          check_category: this.category,
          check_id: 'COOKIES_HARDENED',
          status: 'PASS',
          title: 'All Cookies Protected with Security Flags',
          description: `All ${parsedCookies.length} inspected cookies enforce Secure, HttpOnly, and strict SameSite policies.`,
          severity: 'INFO',
          confidence: 1.0,
          evidence: { details: parsedCookies.map(c => c.name) }
        });
      }

    } catch (err: any) {
      findings.push({
        check_category: this.category,
        check_id: 'COOKIE_CHECK_ERROR',
        status: 'WARN',
        title: 'Cookie Inspection Encountered Warning',
        description: `Could not retrieve response headers to analyze cookies: ${err.message}`,
        severity: 'INFO',
        confidence: 0.5
      });
    }

    return findings;
  }
};

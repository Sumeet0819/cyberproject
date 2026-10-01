import { CookiesCheck, parseCookieHeader } from './cookies';
import { ScanContext } from '../engine/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CookiesCheck', () => {
  const mockContext: ScanContext = {
    targetUrl: 'https://example.com',
    targetHostname: 'example.com',
    targetIp: '93.184.216.34'
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('parseCookieHeader', () => {
    it('correctly parses full secure cookie', () => {
      const parsed = parseCookieHeader('sessionId=abc12345; Secure; HttpOnly; SameSite=Strict; Path=/');
      expect(parsed.name).toBe('sessionId');
      expect(parsed.value).toBe('abc12345');
      expect(parsed.isSecure).toBe(true);
      expect(parsed.isHttpOnly).toBe(true);
      expect(parsed.sameSite).toBe('strict');
    });

    it('correctly detects missing security flags', () => {
      const parsed = parseCookieHeader('user_pref=dark; Path=/');
      expect(parsed.name).toBe('user_pref');
      expect(parsed.value).toBe('dark');
      expect(parsed.isSecure).toBe(false);
      expect(parsed.isHttpOnly).toBe(false);
      expect(parsed.sameSite).toBeNull();
    });
  });

  describe('execute', () => {
    it('returns PASS when all cookies have security flags', async () => {
      mockedAxios.get.mockResolvedValue({
        headers: {
          'set-cookie': [
            'auth_token=xyz; Secure; HttpOnly; SameSite=Strict',
            'session_id=123; Secure; HttpOnly; SameSite=Lax'
          ]
        }
      });

      const findings = await CookiesCheck.execute(mockContext);
      expect(findings.some(f => f.check_id === 'COOKIES_HARDENED')).toBe(true);
      expect(findings.some(f => f.status === 'FAIL')).toBe(false);
    });

    it('flags HIGH severity for session cookies missing Secure and HttpOnly', async () => {
      mockedAxios.get.mockResolvedValue({
        headers: {
          'set-cookie': ['session_id=secret123; Path=/']
        }
      });

      const findings = await CookiesCheck.execute(mockContext);
      const secureFinding = findings.find(f => f.check_id === 'COOKIE_MISSING_SECURE');
      const httpOnlyFinding = findings.find(f => f.check_id === 'COOKIE_MISSING_HTTPONLY');
      const sameSiteFinding = findings.find(f => f.check_id === 'COOKIE_WEAK_SAMESITE');

      expect(secureFinding).toBeDefined();
      expect(secureFinding?.severity).toBe('HIGH');
      expect(httpOnlyFinding).toBeDefined();
      expect(httpOnlyFinding?.severity).toBe('HIGH');
      expect(sameSiteFinding).toBeDefined();
    });

    it('returns INFO when no cookies are returned', async () => {
      mockedAxios.get.mockResolvedValue({
        headers: {}
      });

      const findings = await CookiesCheck.execute(mockContext);
      expect(findings).toHaveLength(1);
      expect(findings[0].check_id).toBe('NO_COOKIES_FOUND');
      expect(findings[0].status).toBe('INFO');
    });
  });
});

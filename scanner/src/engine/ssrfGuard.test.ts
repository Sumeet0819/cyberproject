import { getSafeIp } from './ssrfGuard';
import dns from 'dns/promises';

jest.mock('dns/promises');

describe('ssrfGuard', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should allow safe public IPs', async () => {
    (dns.resolve4 as jest.Mock).mockResolvedValue(['8.8.8.8']);
    const ip = await getSafeIp('google.com');
    expect(ip).toBe('8.8.8.8');
  });

  it('should block local IPs (127.0.0.1) in production', async () => {
    process.env.NODE_ENV = 'production';
    (dns.resolve4 as jest.Mock).mockResolvedValue(['127.0.0.1']);
    await expect(getSafeIp('localhost')).rejects.toThrow(/SSRF Blocked/);
  });

  it('should allow local IPs (127.0.0.1) in test environment', async () => {
    process.env.NODE_ENV = 'test';
    (dns.resolve4 as jest.Mock).mockResolvedValue(['127.0.0.1']);
    const ip = await getSafeIp('localhost');
    expect(ip).toBe('127.0.0.1');
  });

  it('should block RFC 1918 IPs (10.x.x.x)', async () => {
    (dns.resolve4 as jest.Mock).mockResolvedValue(['10.0.0.1']);
    await expect(getSafeIp('internal.service')).rejects.toThrow(/SSRF Blocked/);
  });

  it('should block Cloud Metadata IPs (169.254.169.254)', async () => {
    (dns.resolve4 as jest.Mock).mockResolvedValue(['169.254.169.254']);
    await expect(getSafeIp('metadata.aws')).rejects.toThrow(/SSRF Blocked/);
  });

  it('should throw error if dns resolution fails', async () => {
    (dns.resolve4 as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));
    await expect(getSafeIp('nonexistent.domain')).rejects.toThrow(/Failed to safely resolve/);
  });
});

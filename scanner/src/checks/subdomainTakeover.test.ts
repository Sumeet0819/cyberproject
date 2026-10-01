import { SubdomainTakeoverCheck } from './subdomainTakeover';
import { ScanContext } from '../engine/types';
import dns from 'dns/promises';
import axios from 'axios';

jest.mock('dns/promises');
jest.mock('axios');

const mockedDns = dns as jest.Mocked<typeof dns>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SubdomainTakeoverCheck', () => {
  const mockContext: ScanContext = {
    targetUrl: 'https://docs.example.com',
    targetHostname: 'docs.example.com',
    targetIp: '93.184.216.34'
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('detects dangling CNAME when cloud provider returns unclaimed resource error', async () => {
    mockedDns.resolveCname.mockResolvedValue(['user.github.io']);
    mockedAxios.get.mockResolvedValue({
      status: 404,
      data: "404 There isn't a GitHub Pages site here."
    });

    const findings = await SubdomainTakeoverCheck.execute(mockContext);
    const takeover = findings.find(f => f.check_id === 'SUBDOMAIN_TAKEOVER_VULNERABLE');
    expect(takeover).toBeDefined();
    expect(takeover?.severity).toBe('CRITICAL');
  });

  it('reports PASS when CNAME points to active healthy cloud service', async () => {
    mockedDns.resolveCname.mockResolvedValue(['cname.vercel-dns.com']);
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: '<html><body>Active website</body></html>'
    });

    const findings = await SubdomainTakeoverCheck.execute(mockContext);
    const healthy = findings.find(f => f.check_id === 'CNAME_PROVIDER_HEALTHY');
    expect(healthy).toBeDefined();
    expect(healthy?.status).toBe('PASS');
  });

  it('returns empty array if domain has no CNAME records (e.g. apex domain)', async () => {
    mockedDns.resolveCname.mockRejectedValue({ code: 'ENODATA' });

    const findings = await SubdomainTakeoverCheck.execute(mockContext);
    expect(findings).toHaveLength(0);
  });
});

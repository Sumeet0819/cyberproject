import { HeadersCheck } from './headers';
import { ScanContext } from '../engine/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HeadersCheck', () => {
  const mockContext: ScanContext = {
    targetUrl: 'https://example.com',
    targetHostname: 'example.com',
    targetIp: '1.2.3.4'
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return PASS for HSTS and Clickjacking if headers are present', async () => {
    mockedAxios.get.mockResolvedValue({
      headers: {
        'strict-transport-security': 'max-age=31536000',
        'x-frame-options': 'DENY'
      }
    });

    const findings = await HeadersCheck.execute(mockContext);
    
    expect(findings).toHaveLength(2);
    expect(findings.find(f => f.check_id === 'HSTS_PRESENT')).toBeDefined();
    expect(findings.find(f => f.check_id === 'CLICKJACKING_PROTECTION_PRESENT')).toBeDefined();
  });

  it('should return FAIL for HSTS and Clickjacking if headers are missing', async () => {
    mockedAxios.get.mockResolvedValue({
      headers: {}
    });

    const findings = await HeadersCheck.execute(mockContext);
    
    expect(findings).toHaveLength(2);
    expect(findings.find(f => f.check_id === 'HSTS_MISSING')).toBeDefined();
    expect(findings.find(f => f.check_id === 'CLICKJACKING_PROTECTION_MISSING')).toBeDefined();
  });

  it('should return PASS for Clickjacking if CSP frame-ancestors is present', async () => {
    mockedAxios.get.mockResolvedValue({
      headers: {
        'content-security-policy': "default-src 'self'; frame-ancestors 'none';"
      }
    });

    const findings = await HeadersCheck.execute(mockContext);
    
    expect(findings.find(f => f.check_id === 'CLICKJACKING_PROTECTION_PRESENT')).toBeDefined();
  });

  it('should return WARN if the network request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    const findings = await HeadersCheck.execute(mockContext);
    
    expect(findings).toHaveLength(1);
    expect(findings[0].check_id).toBe('HEADERS_CHECK_FAILED');
    expect(findings[0].status).toBe('WARN');
  });
});

import { ExposedFilesCheck } from './exposedFiles';
import { ScanContext } from '../engine/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExposedFilesCheck', () => {
  const mockContext: ScanContext = {
    targetUrl: 'https://example.com',
    targetHostname: 'example.com',
    targetIp: '1.2.3.4'
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return PASS if no sensitive files are found (e.g., 404)', async () => {
    mockedAxios.head.mockResolvedValue({ status: 404 });

    const findings = await ExposedFilesCheck.execute(mockContext);
    
    expect(findings).toHaveLength(1);
    expect(findings[0].check_id).toBe('NO_EXPOSED_FILES');
    expect(findings[0].status).toBe('PASS');
  });

  it('should return FAIL if .env is publicly accessible (200 OK)', async () => {
    mockedAxios.head.mockImplementation(async (url) => {
      if ((url as string).endsWith('.env')) {
        return { status: 200 };
      }
      return { status: 404 };
    });

    const findings = await ExposedFilesCheck.execute(mockContext);
    
    expect(findings).toHaveLength(1);
    expect(findings[0].check_id).toBe('EXPOSED___ENV');
    expect(findings[0].status).toBe('FAIL');
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('should return PASS if network times out (file not accessible)', async () => {
    mockedAxios.head.mockRejectedValue(new Error('timeout'));

    const findings = await ExposedFilesCheck.execute(mockContext);
    
    expect(findings).toHaveLength(1);
    expect(findings[0].check_id).toBe('NO_EXPOSED_FILES');
    expect(findings[0].status).toBe('PASS');
  });
});

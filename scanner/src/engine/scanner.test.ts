import { runScan, registerCheck } from './scanner';
import { getSafeIp } from './ssrfGuard';
import { SecurityCheck, ScanContext, Finding } from './types';

jest.mock('./ssrfGuard');

describe('scanner engine', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should run registered checks and aggregate findings', async () => {
    (getSafeIp as jest.Mock).mockResolvedValue('1.2.3.4');

    const mockCheck1: SecurityCheck = {
      id: 'check1',
      category: 'Category 1',
      execute: async (context: ScanContext) => {
        return [{ title: 'Finding 1', status: 'PASS', severity: 'INFO' } as Finding];
      }
    };

    const mockCheck2: SecurityCheck = {
      id: 'check2',
      category: 'Category 2',
      execute: async (context: ScanContext) => {
        return [{ title: 'Finding 2', status: 'FAIL', severity: 'HIGH' } as Finding];
      }
    };

    registerCheck(mockCheck1);
    registerCheck(mockCheck2);

    const findings = await runScan('https://example.com');
    expect(findings).toHaveLength(2);
    expect(findings[0].title).toBe('Finding 1');
    expect(findings[1].title).toBe('Finding 2');
    expect(getSafeIp).toHaveBeenCalledWith('example.com');
  });

  it('should gracefully handle a check that throws an error', async () => {
    (getSafeIp as jest.Mock).mockResolvedValue('1.2.3.4');

    const failingCheck: SecurityCheck = {
      id: 'failingCheck',
      category: 'Failing Category',
      execute: async (context: ScanContext) => {
        throw new Error('Unexpected failure');
      }
    };

    const passingCheck: SecurityCheck = {
      id: 'passingCheck',
      category: 'Passing Category',
      execute: async (context: ScanContext) => {
        return [{ title: 'Finding 3', status: 'PASS', severity: 'INFO' } as Finding];
      }
    };

    registerCheck(failingCheck);
    registerCheck(passingCheck);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const findings = await runScan('https://test.com');
    
    expect(consoleSpy).toHaveBeenCalledWith('Check failingCheck failed:', 'Unexpected failure');
    expect(findings.some(f => f.title === 'Finding 3')).toBe(true);
    
    consoleSpy.mockRestore();
  });

  it('should throw an error for invalid URL', async () => {
    await expect(runScan('not-a-url')).rejects.toThrow('Invalid target URL');
  });
});

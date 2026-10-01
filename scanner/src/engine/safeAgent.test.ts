import { createSafeAgent, SCANNER_REQUEST_HEADERS } from './safeAgent';

describe('safeAgent', () => {
  it('should export standard browser headers', () => {
    expect(SCANNER_REQUEST_HEADERS['User-Agent']).toContain('Mozilla/5.0');
  });

  it('should resolve pinned IP when options.all is true (Node 20+ autoSelectFamily)', (done) => {
    const agent = createSafeAgent('93.184.216.34', 'example.com');
    const lookup = (agent as any).options.lookup;

    lookup('example.com', { all: true }, (err: any, addresses: any) => {
      expect(err).toBeNull();
      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses[0]).toEqual({ address: '93.184.216.34', family: 4 });
      done();
    });
  });

  it('should resolve pinned IP when options.all is false or omitted', (done) => {
    const agent = createSafeAgent('93.184.216.34', 'example.com');
    const lookup = (agent as any).options.lookup;

    lookup('example.com', {}, (err: any, address: string, family: number) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      expect(family).toBe(4);
      done();
    });
  });

  it('should support 2-argument lookup (hostname, callback)', (done) => {
    const agent = createSafeAgent('93.184.216.34', 'example.com');
    const lookup = (agent as any).options.lookup;

    lookup('example.com', (err: any, address: string, family: number) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      expect(family).toBe(4);
      done();
    });
  });
});

import { MixedContentCheck, detectMixedContent } from './mixedContent';
import { ScanContext } from '../engine/types';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MixedContentCheck', () => {
  const mockContext: ScanContext = {
    targetUrl: 'https://example.com',
    targetHostname: 'example.com',
    targetIp: '93.184.216.34'
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('detectMixedContent', () => {
    it('detects insecure scripts, stylesheets, and iframes', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="http://cdn.example.com/analytics.js"></script>
            <link rel="stylesheet" href="http://cdn.example.com/styles.css">
          </head>
          <body>
            <iframe src="http://legacy.example.com/frame"></iframe>
            <img src="http://cdn.example.com/logo.png" />
            <form action="http://auth.example.com/login" method="POST"></form>
          </body>
        </html>
      `;

      const items = detectMixedContent(html);
      expect(items).toHaveLength(5);
      expect(items.some(i => i.type === 'script')).toBe(true);
      expect(items.some(i => i.type === 'stylesheet')).toBe(true);
      expect(items.some(i => i.type === 'iframe')).toBe(true);
      expect(items.some(i => i.type === 'media')).toBe(true);
      expect(items.some(i => i.type === 'form')).toBe(true);
    });

    it('returns empty array when all resources are HTTPS or relative', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.example.com/analytics.js"></script>
            <link rel="stylesheet" href="/styles.css">
          </head>
          <body>
            <img src="https://cdn.example.com/logo.png" />
          </body>
        </html>
      `;

      const items = detectMixedContent(html);
      expect(items).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('returns PASS when zero mixed content is detected', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><head><script src="https://secure.cdn/bundle.js"></script></head><body>Clean page</body></html>'
      });

      const findings = await MixedContentCheck.execute(mockContext);
      expect(findings.some(f => f.check_id === 'NO_MIXED_CONTENT')).toBe(true);
    });

    it('returns HIGH severity for active mixed content', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><head><script src="http://insecure.cdn/track.js"></script></head><body>Insecure script</body></html>'
      });

      const findings = await MixedContentCheck.execute(mockContext);
      const activeFinding = findings.find(f => f.check_id === 'ACTIVE_MIXED_CONTENT');
      expect(activeFinding).toBeDefined();
      expect(activeFinding?.severity).toBe('HIGH');
    });
  });
});

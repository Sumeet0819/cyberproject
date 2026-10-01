import { Request, Response } from 'express';
import { badgeService } from '../services/badge.service';

export const badgeController = {
  /**
   * GET /api/badges/:websiteId.svg
   * Public SVG badge rendering endpoint
   */
  async renderBadge(req: Request<{ websiteId: string }>, res: Response) {
    try {
      let { websiteId } = req.params;
      // Strip .svg extension if provided in parameter
      if (websiteId && websiteId.endsWith('.svg')) {
        websiteId = websiteId.replace(/\.svg$/, '');
      }

      const { theme, style } = req.query;
      const website = await badgeService.getWebsiteBadgeData(websiteId);

      const targetData = website || {
        domain: 'Unregistered',
        score: 0,
        grade: 'N/A',
        is_verified: false
      };

      const svg = badgeService.renderBadgeSvg(targetData, {
        theme: theme === 'light' ? 'light' : 'dark',
        style: style === 'compact' ? 'compact' : style === 'pill' ? 'pill' : 'shield'
      });

      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('Access-Control-Allow-Origin', '*');

      return res.status(200).send(svg);
    } catch (error: any) {
      console.error('Error serving badge SVG:', error);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      return res.status(500).send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="160" height="24" viewBox="0 0 160 24">
          <rect width="160" height="24" fill="#090D14" rx="3"/>
          <text x="10" y="15" fill="#EF4444" font-family="monospace" font-size="11">CyberHealth Error</text>
        </svg>
      `);
    }
  },

  /**
   * GET /api/badges/:websiteId/info
   * Returns snippet embed codes for this website's badge
   */
  async getBadgeInfo(req: Request<{ websiteId: string }>, res: Response) {
    try {
      const { websiteId } = req.params;
      const website = await badgeService.getWebsiteBadgeData(websiteId);

      if (!website) {
        return res.status(404).json({ success: false, error: 'Website not found' });
      }

      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const badgeBaseUrl = `${baseUrl}/api/badges/${website.id}.svg`;
      const verifyUrl = `${baseUrl}/badges/verify/${website.id}`;

      const snippets = {
        badgeUrl: badgeBaseUrl,
        verifyUrl,
        html: `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" title="View CyberHealth Security Verification">\n  <img src="${badgeBaseUrl}?theme=dark&style=shield" alt="CyberHealth Security Grade" />\n</a>`,
        markdown: `[![CyberHealth Security Grade](${badgeBaseUrl}?theme=dark&style=shield)](${verifyUrl})`,
        react: `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${badgeBaseUrl}?theme=dark&style=shield" alt="CyberHealth Security Grade" />\n</a>`
      };

      return res.status(200).json({
        success: true,
        data: {
          website,
          snippets
        }
      });
    } catch (error: any) {
      console.error('Error fetching badge info:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch badge info' });
    }
  }
};

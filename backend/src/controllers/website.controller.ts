import { Request, Response } from 'express';
import { websiteService } from '../services/website.service';
import { verificationService } from '../services/verification.service';
import { pdfService } from '../services/pdf.service';
import { driftService } from '../services/drift.service';
import { notificationService } from '../services/notification.service';
import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { CreateWebsiteSchema } from '../validations/website.schema';

export const websiteController = {
  async createWebsite(req: Request, res: Response) {
    try {
      const input = CreateWebsiteSchema.parse(req.body);
      const userId = (req as any).user.id;

      const website = await websiteService.createWebsite(userId, input);

      return res.status(201).json({ success: true, data: website });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      }
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  async getWebsites(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const websites = await websiteService.getWebsites(userId);

      return res.status(200).json({ success: true, data: websites });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve websites' });
    }
  },

  async getWebsiteById(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const website = await websiteService.getWebsiteById(userId, id);

      return res.status(200).json({ success: true, data: website });
    } catch (error: any) {
      return res.status(404).json({ success: false, error: error.message });
    }
  },

  async getLatestReport(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const report = await websiteService.getLatestReport(userId, id);
      
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      return res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      console.error('Error fetching report:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch report' });
    }
  },

  async scanWebsite(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const report = await websiteService.scanWebsite(userId, id);

      return res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      console.error('Error scanning website:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to scan website' });
    }
  },

  async getVerificationInfo(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const info = await verificationService.getVerificationInfo(userId, id);
      return res.status(200).json({ success: true, data: info });
    } catch (error: any) {
      console.error('Error fetching verification info:', error);
      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to get verification info'
      });
    }
  },

  async verifyDomain(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const result = await verificationService.verifyDomain(userId, id);
      return res.status(result.success ? 200 : 400).json({
        success: result.success,
        data: result
      });
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Domain verification check failed'
      });
    }
  },

  async exportReportPdf(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const website = await websiteService.getWebsiteById(userId, id);
      if (!website) {
        return res.status(404).json({ success: false, error: 'Website not found' });
      }

      const report = await websiteService.getLatestReport(userId, id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'No scan reports found for this website' });
      }

      const pdfBuffer = await pdfService.generateExecutiveReportPdf({ website, report });
      const safeDomain = website.domain.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `CyberHealth-Executive-Report-${safeDomain}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error generating PDF report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate PDF report'
      });
    }
  },

  async getReportHistory(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      await websiteService.getWebsiteById(userId, id);
      const history = await driftService.getWebsiteHistory(id);
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch report history' });
    }
  },

  async getScanDrift(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { reportId } = req.query;
      await websiteService.getWebsiteById(userId, id);
      const drift = await driftService.calculateDrift(id, reportId as string | undefined);
      return res.status(200).json({ success: true, data: drift });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to calculate scan drift' });
    }
  },

  async updateMonitoringSettings(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { monitoring_enabled, monitoring_frequency, notification_email, webhook_url } = req.body;

      const website = await websiteService.getWebsiteById(userId, id);

      const updateData: any = {};
      if (typeof monitoring_enabled === 'boolean') updateData.monitoring_enabled = monitoring_enabled;
      if (monitoring_frequency) updateData.monitoring_frequency = monitoring_frequency;
      if (notification_email !== undefined) updateData.notification_email = notification_email;
      if (webhook_url !== undefined) updateData.webhook_url = webhook_url;

      const { data: updated, error } = await (supabaseAdmin || supabaseClient)
        .from('websites')
        .update(updateData)
        .eq('id', website.id)
        .select('*')
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to update monitoring settings' });
    }
  },

  async testNotification(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { email, webhookUrl } = req.body;

      const website = await websiteService.getWebsiteById(userId, id);

      const result = await notificationService.dispatchAlert(
        { email: email || website.notification_email, webhookUrl: webhookUrl || website.webhook_url },
        {
          websiteId: website.id,
          domain: website.domain,
          score: website.score || 85,
          grade: website.grade || 'A',
          scoreDelta: 0,
          alertType: 'TEST_PING',
          message: `Verification ping from CyberHealth Continuous Monitoring. Notifications are successfully configured for ${website.domain}.`
        }
      );

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch test notification' });
    }
  }
};

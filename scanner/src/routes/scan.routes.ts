import { Router } from 'express';
import { z } from 'zod';
import { verifyHmacSignature } from '../middleware/auth';
import { runScan, runScanStream, registerCheck } from '../engine/scanner';
import { HttpsCheck } from '../checks/https';
import { HeadersCheck } from '../checks/headers';
import { DnsCheck } from '../checks/dns';
import { TechnologyCheck } from '../checks/technology';
import { ExposedFilesCheck } from '../checks/exposedFiles';
import { CookiesCheck } from '../checks/cookies';
import { MixedContentCheck } from '../checks/mixedContent';
import { SubdomainTakeoverCheck } from '../checks/subdomainTakeover';

const router = Router();

// Register checks with the engine
registerCheck(HttpsCheck);
registerCheck(HeadersCheck);
registerCheck(DnsCheck);
registerCheck(TechnologyCheck);
registerCheck(ExposedFilesCheck);
registerCheck(CookiesCheck);
registerCheck(MixedContentCheck);
registerCheck(SubdomainTakeoverCheck);

const ScanRequestSchema = z.object({
  targetUrl: z.string().url(),
  scanId: z.string().uuid(),
});

router.post('/', verifyHmacSignature, async (req, res) => {
  try {
    const parsedBody = ScanRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsedBody.error.errors });
    }

    const { targetUrl, scanId } = parsedBody.data;

    // Run the scan
    const findings = await runScan(targetUrl);

    // Return the findings to the Core API
    res.status(200).json({
      scanId,
      targetUrl,
      findings,
    });

  } catch (error: any) {
    console.error('Scan failed:', error);
    res.status(500).json({ error: error.message || 'Internal server error during scan' });
  }
});

router.post('/stream', verifyHmacSignature, async (req, res) => {
  try {
    const parsedBody = ScanRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsedBody.error.errors });
    }

    const { targetUrl, scanId } = parsedBody.data;

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const findings = await runScanStream(targetUrl, (progress: any) => {
      sendEvent('progress', progress);
    });


    sendEvent('done', {
      scanId,
      targetUrl,
      findings,
    });

    res.end();
  } catch (error: any) {
    console.error('Streaming scan failed:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Internal error' })}\n\n`);
    res.end();
  }
});

export default router;


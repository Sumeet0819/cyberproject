import Groq from 'groq-sdk';
import { Finding } from './scoring.service';
import { getReferenceDocs } from '../utils/referenceDocs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface RemediationResult {
  ai_summary: string;
  ai_key_takeaways: string[];
  findings: Array<{
    check_id: string;
    ai_explanation: string;
    business_impact: string;
    remediation: string;
    difficulty: string;
    estimated_minutes: number;
    reference_docs: any[];
  }>;
}

export async function generateRemediation(score: number, findings: Finding[]): Promise<RemediationResult> {
  // Fallback if no API key
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not found. Using fallback remediation catalog.');
    return getFallbackRemediation(score, findings);
  }

  const prompt = `You are a cybersecurity expert speaking directly to a small business owner with limited technical knowledge.
We ran a security scan on their website. The overall score is ${score}/100.
Here are the findings:
${JSON.stringify(findings, null, 2)}

Respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact structure:
{
  "ai_summary": "plain English summary of overall security posture",
  "ai_key_takeaways": ["action 1", "action 2", "action 3"],
  "findings": [
    {
      "check_id": "the check_id from above",
      "ai_explanation": "what this means in plain English",
      "business_impact": "how this affects the business",
      "remediation": "1. Step one\n2. Step two\n3. Step three",
      "difficulty": "EASY | MEDIUM | ADVANCED",
      "estimated_minutes": 15
    }
  ]
}

Rules:
- ai_summary: 2-3 sentences, no jargon
- ai_key_takeaways: exactly 3 immediate actions
- remediation: 3-5 clear, numbered fix steps separated by newlines (e.g. 1. ...\n2. ...)
- Include one findings entry per FAIL finding only
- difficulty must be exactly EASY, MEDIUM, or ADVANCED
- estimated_minutes must be a number`;

  try {
    console.log('[Groq] Calling API with model: openai/gpt-oss-20b, score:', score, 'findings:', findings.length);

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b',
      temperature: 0.3,
    });

    console.log('[Groq] Raw API response:', JSON.stringify(chatCompletion, null, 2));

    const raw = (chatCompletion.choices[0]?.message?.content || '')
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    console.log('[Groq] Cleaned content:', raw);

    const parsed = JSON.parse(raw) as RemediationResult;

    console.log('[Groq] Parsed report:', JSON.stringify(parsed, null, 2));

    // Attach authoritative reference docs locally (avoids AI hallucinating URLs)
    if (parsed.findings) {
      for (const f of parsed.findings) {
        f.reference_docs = getReferenceDocs(f.check_id);
      }
    }

    return parsed;
  } catch (error) {
    console.error('[Groq] API Error:', error);
    return getFallbackRemediation(score, findings);
  }
}

function getFallbackRemediation(score: number, findings: Finding[]): RemediationResult {
  const result: RemediationResult = {
    ai_summary: `Your website scored ${score}/100. We identified ${findings.filter(f => f.status === 'FAIL').length} issues that need your attention.`,
    ai_key_takeaways: ['Review the critical findings below', 'Apply security headers', 'Consult your web developer'],
    findings: []
  };

  for (const f of findings) {
    if (f.status === 'FAIL') {
      result.findings.push({
        check_id: f.check_id,
        ai_explanation: 'A security configuration is missing or incorrect.',
        business_impact: 'This could expose customer data or allow attacks.',
        remediation: 'Please check official documentation to resolve this issue.',
        difficulty: 'MEDIUM',
        estimated_minutes: 15,
        reference_docs: getReferenceDocs(f.check_id)
      });
    }
  }

  return result;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Finding {
  severity: Severity;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  [key: string]: any;
}

export const DEDUCTION_MAP: Record<Severity, number> = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 1,
  INFO: 0
};

export function calculateScore(findings: Finding[]): { score: number; grade: string } {
  let score = 100;

  for (const finding of findings) {
    if (finding.status === 'FAIL') {
      score -= DEDUCTION_MAP[finding.severity] || 0;
    }
  }

  score = Math.max(0, score); // Ensure score doesn't go below 0

  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return { score, grade };
}

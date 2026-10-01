import { supabaseClient, supabaseAdmin } from '../config/supabase';

export interface ReportHistoryItem {
  id: string;
  website_id: string;
  score: number;
  grade: string;
  created_at: string;
  findings_count: number;
}

export interface DriftAnalysis {
  hasPreviousScan: boolean;
  previousReportId?: string;
  previousCreatedAt?: string;
  previousScore?: number;
  currentScore: number;
  scoreDelta: number;
  gradeChanged: boolean;
  previousGrade?: string;
  currentGrade: string;
  resolvedFindings: Array<{
    check_id: string;
    title: string;
  }>;
  newRegressions: Array<{
    check_id: string;
    title: string;
    severity: string;
  }>;
  persistentFindings: Array<{
    check_id: string;
    title: string;
  }>;
  summary: string;
}

export const driftService = {
  /**
   * Retrieves past scan reports for a website in reverse chronological order
   */
  async getWebsiteHistory(websiteId: string, limit = 10): Promise<ReportHistoryItem[]> {
    const { data: reports, error } = await (supabaseAdmin || supabaseClient)
      .from('reports')
      .select('id, website_id, score, grade, created_at, findings')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !reports) {
      return [];
    }

    return reports.map((r: any) => ({
      id: r.id,
      website_id: r.website_id,
      score: r.score,
      grade: r.grade,
      created_at: r.created_at,
      findings_count: Array.isArray(r.findings) ? r.findings.length : 0
    }));
  },

  /**
   * Computes delta and drift between the latest report and its preceding audit
   */
  async calculateDrift(websiteId: string, currentReportId?: string): Promise<DriftAnalysis> {
    // Fetch latest 2 reports
    const { data: reports, error } = await (supabaseAdmin || supabaseClient)
      .from('reports')
      .select('id, website_id, score, grade, created_at, findings')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error || !reports || reports.length === 0) {
      return {
        hasPreviousScan: false,
        currentScore: 0,
        scoreDelta: 0,
        gradeChanged: false,
        currentGrade: 'N/A',
        resolvedFindings: [],
        newRegressions: [],
        persistentFindings: [],
        summary: 'No previous audit scans found for baseline comparison.'
      };
    }

    const current = currentReportId
      ? reports.find(r => r.id === currentReportId) || reports[0]
      : reports[0];

    const previous = reports.find(r => r.id !== current.id);

    if (!previous) {
      return {
        hasPreviousScan: false,
        currentScore: current.score ?? 0,
        scoreDelta: 0,
        gradeChanged: false,
        currentGrade: current.grade ?? 'N/A',
        resolvedFindings: [],
        newRegressions: [],
        persistentFindings: [],
        summary: 'Initial baseline scan. No prior audit exists to calculate drift.'
      };
    }

    const prevFindings: any[] = Array.isArray(previous.findings) ? previous.findings : [];
    const currFindings: any[] = Array.isArray(current.findings) ? current.findings : [];

    const prevCheckIds = new Set(prevFindings.map(f => f.check_id));
    const currCheckIds = new Set(currFindings.map(f => f.check_id));

    // 1. Resolved: was in previous, no longer in current
    const resolvedFindings = prevFindings
      .filter(f => !currCheckIds.has(f.check_id))
      .map(f => ({
        check_id: f.check_id,
        title: f.check_id.replace(/_/g, ' ')
      }));

    // 2. New regressions: in current, was NOT in previous
    const newRegressions = currFindings
      .filter(f => !prevCheckIds.has(f.check_id))
      .map(f => ({
        check_id: f.check_id,
        title: f.check_id.replace(/_/g, ' '),
        severity: f.severity || 'MEDIUM'
      }));

    // 3. Persistent: in both
    const persistentFindings = currFindings
      .filter(f => prevCheckIds.has(f.check_id))
      .map(f => ({
        check_id: f.check_id,
        title: f.check_id.replace(/_/g, ' ')
      }));

    const scoreDelta = (current.score ?? 0) - (previous.score ?? 0);
    const gradeChanged = (current.grade ?? '') !== (previous.grade ?? '');

    let summary = '';
    if (scoreDelta > 0) {
      summary = `Security posture improved by +${scoreDelta} points since the previous audit. ${resolvedFindings.length} issue(s) were resolved.`;
    } else if (scoreDelta < 0) {
      summary = `Security score dropped by ${Math.abs(scoreDelta)} points. ${newRegressions.length} new regression(s) were detected.`;
    } else {
      summary = `Security score remained stable at ${current.score}/100.`;
    }

    return {
      hasPreviousScan: true,
      previousReportId: previous.id,
      previousCreatedAt: previous.created_at,
      previousScore: previous.score,
      currentScore: current.score,
      scoreDelta,
      gradeChanged,
      previousGrade: previous.grade,
      currentGrade: current.grade,
      resolvedFindings,
      newRegressions,
      persistentFindings,
      summary
    };
  }
};

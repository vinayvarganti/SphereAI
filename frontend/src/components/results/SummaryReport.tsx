import { useState } from 'react';
import type { SummaryReport as SummaryReportType, CompanySummary } from '../../types/workflow';
import { FileText, Copy, Check, AlertCircle, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface SummaryReportProps {
  report: SummaryReportType | null | undefined;
  onProceedToApproval?: () => void;
  pendingCount?: number;
}

export function SummaryReport({ report, onProceedToApproval, pendingCount }: SummaryReportProps) {
  const [copiedSubject, setCopiedSubject] = useState<string | null>(null);

  if (!report || !report.companies || report.companies.length === 0) {
    return (
      <div className="glass-card py-16 text-center select-none text-text-muted space-y-2">
        <FileText className="h-8 w-8 text-border-hover mx-auto animate-pulse" />
        <p className="text-sm">Summary report is not generated yet.</p>
        <p className="text-xs">It will appear when the Summary Agent finishes running.</p>
      </div>
    );
  }

  const handleCopySubject = async (subj: string) => {
    try {
      await navigator.clipboard.writeText(subj);
      setCopiedSubject(subj);
      toast.success('Subject line copied');
      setTimeout(() => setCopiedSubject(null), 2000);
    } catch {
      toast.error('Failed to copy subject line');
    }
  };

  const renderConfidenceRing = (percentage: number) => {
    const radius = 22;
    const strokeWidth = 4;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const ringColor = percentage >= 80 ? 'stroke-success' : percentage >= 65 ? 'stroke-warning' : 'stroke-danger';

    return (
      <div className="relative h-14 w-14 flex items-center justify-center flex-shrink-0 select-none">
        <svg className="h-full w-full -rotate-90">
          {/* Track */}
          <circle
            className="stroke-border"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress */}
          <circle
            className={`${ringColor} transition-all duration-300`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className="absolute text-[10px] font-bold text-white font-mono">{percentage}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 select-text">
      {/* Overview info */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-warning" /> Intelligence Report
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            AI-generated trigger-based summaries and suggested outreach approaches
          </p>
        </div>
        <div className="text-[10px] text-text-muted bg-secondaryBg/40 border border-border px-2 py-1 rounded">
          Report generated at {new Date(report.generated_at || '').toLocaleTimeString()}
        </div>
      </div>

      {/* Proceed to Approvals CTA — shown when workflow is awaiting approval */}
      {onProceedToApproval && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-xl gap-4">
          <div>
            <p className="text-xs font-bold text-white">Ready to review contacts?</p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {pendingCount ?? 0} contact{pendingCount !== 1 ? 's' : ''} awaiting your approval decision
            </p>
          </div>
          <button
            onClick={onProceedToApproval}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-bold transition-colors interactive-btn"
          >
            Proceed to Approvals
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {report.companies.map((companySummary: CompanySummary) => (
          <div
            key={companySummary.company_id}
            className="p-6 bg-surface/50 border border-border/40 rounded-xl space-y-6 hover:shadow-ai-glow transition-all duration-300 relative overflow-hidden"
          >
            {/* Header info */}
            <div className="flex justify-between items-start gap-4 border-b border-border/20 pb-4">
              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest block">Firmographic Analysis</span>
                <h4 className="text-base font-extrabold text-white mt-1">{companySummary.company_name}</h4>
              </div>
              {/* Confidence ring */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted font-bold select-none uppercase text-right">Confidence<br/>Score</span>
                {renderConfidenceRing(companySummary.confidence_score || 85)}
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <span className="text-[10px] text-text-muted font-bold block uppercase select-none">Executive Summary</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{companySummary.executive_summary}</p>
            </div>

            {/* Why Now Trigger context */}
            {companySummary.why_now && (
              <div className="p-4 bg-warning/5 border border-warning/30 rounded-lg space-y-1.5">
                <span className="text-[10px] text-warning font-bold flex items-center gap-1 uppercase select-none">
                  <TrendingUp className="h-3.5 w-3.5" /> Why Now (Trigger Context)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{companySummary.why_now}</p>
              </div>
            )}

            {/* Outreach strategies per persona */}
            {companySummary.outreach_strategy && Object.keys(companySummary.outreach_strategy).length > 0 && (
              <div className="space-y-3">
                <span className="text-[10px] text-text-muted font-bold block uppercase select-none">Recommended Outreach Strategy</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(companySummary.outreach_strategy).map(([personaName, strategyText]) => (
                    <div key={personaName} className="p-3 bg-secondaryBg/40 border border-border/30 rounded-lg space-y-1">
                      <span className="text-[10px] font-extrabold text-white block uppercase tracking-wide border-b border-border/10 pb-1">
                        {personaName}
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed pt-1">{strategyText}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Subject lines */}
            {companySummary.subject_lines && companySummary.subject_lines.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[10px] text-text-muted font-bold block uppercase select-none">Suggested Email Subject Lines</span>
                <div className="flex flex-col gap-2">
                  {companySummary.subject_lines.map((subject, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-secondaryBg/20 border border-border/20 rounded-md text-xs hover:border-border-hover/50 hover:bg-secondaryBg/40 transition-colors"
                    >
                      <span className="text-slate-200 select-all leading-relaxed font-mono">"{subject}"</span>
                      <button
                        onClick={() => handleCopySubject(subject)}
                        className="p-1 rounded hover:bg-surface text-text-muted hover:text-white transition-colors"
                        title="Copy Subject Line"
                      >
                        {copiedSubject === subject ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk factors */}
            {companySummary.risk_factors && companySummary.risk_factors.length > 0 && (
              <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg space-y-2">
                <span className="text-[10px] text-danger font-bold flex items-center gap-1 uppercase select-none">
                  <AlertCircle className="h-3.5 w-3.5" /> Potential Risk Factors
                </span>
                <ul className="list-disc pl-4 space-y-1 text-xs text-text-secondary">
                  {companySummary.risk_factors.map((risk, index) => (
                    <li key={index} className="leading-relaxed">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryReport;

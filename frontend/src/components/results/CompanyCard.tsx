import type { Company } from '../../types/company';
import { CheckCircle2, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompanyCardProps {
  company: Company;
  isNew?: boolean;
}

export function CompanyCard({ company, isNew = false }: CompanyCardProps) {
  
  const getICPScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-success/15 text-success border border-success/30';
    if (score >= 0.65) return 'bg-warning/15 text-warning border border-warning/30';
    return 'bg-danger/15 text-danger border border-danger/30';
  };

  const getValidationIcon = (status?: string) => {
    switch (status) {
      case 'validated':
        return (
          <span title="Fully Validated Domain">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </span>
        );
      case 'partial':
        return (
          <span title="Partially Verified Firmographics">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </span>
        );
      default:
        return (
          <span title="Unverified Profile">
            <AlertCircle className="h-4 w-4 text-text-disabled" />
          </span>
        );
    }
  };

  const formatFunding = (amount?: number) => {
    if (!amount) return '';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <div
      className={cn(
        "p-4 glass-card hover:bg-surface/85 hover:border-border-hover transition-all duration-300 border-l-4",
        (company.icp_match_score ?? 0) >= 0.8 ? "border-l-success" : (company.icp_match_score ?? 0) >= 0.65 ? "border-l-warning" : "border-l-danger",
        isNew ? "animate-in slide-in-from-right fade-in duration-300" : ""
      )}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Profile info */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white leading-none truncate max-w-[200px]" title={company.name}>
              {company.name}
            </h4>
            
            {/* Domain URL */}
            {company.domain && (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary inline-flex items-center gap-0.5 text-[11px] font-medium"
              >
                <span>{company.domain}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Industry */}
            {company.industry && (
              <span className="text-[10px] bg-secondaryBg px-2 py-0.5 rounded border border-border text-text-secondary">
                {company.industry}
              </span>
            )}
            {/* Headcount */}
            {company.headcount != null && (
              <span className="text-[10px] text-text-muted">
                {(company.headcount as number).toLocaleString()} employees
              </span>
            )}
            {/* Funding stage */}
            {company.funding_stage && (
              <span className="text-[10px] bg-accent/10 border border-accent/25 text-accent px-2 py-0.5 rounded-full font-semibold">
                {company.funding_stage} {formatFunding(company.funding_amount_usd)}
              </span>
            )}
          </div>

          {/* Triggers Matched pills */}
          {company.triggers_matched && company.triggers_matched.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {company.triggers_matched.map((trigger) => (
                <span
                  key={trigger}
                  className="text-[9px] bg-surface/50 border border-border px-1.5 py-0.5 rounded text-text-muted font-mono"
                >
                  #{trigger}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scoring & Validation Badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Validation Dot */}
          {getValidationIcon(company.validation_status)}

          {/* ICP Score */}
          <div className={cn("px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wide", getICPScoreColor(company.icp_match_score ?? 0))}>
            {((company.icp_match_score ?? 0) * 100).toFixed(0)}% ICP
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyCard;

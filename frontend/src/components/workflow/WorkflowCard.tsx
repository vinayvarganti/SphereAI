import type { Workflow } from '../../types/workflow';
import { useNavigate } from 'react-router-dom';
import { formatCost, formatRelative } from '../../lib/utils';
import { Eye, Globe, DollarSign } from 'lucide-react';

interface WorkflowCardProps {
  workflow: Workflow;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/workflows/${workflow.workflow_id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="p-4 glass-card hover:bg-surface/85 hover:border-border-hover hover:shadow-ai-glow cursor-pointer transition-all duration-200 flex items-center justify-between gap-4"
    >
      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-white leading-none truncate max-w-[220px]" title={workflow.name}>
            {workflow.name}
          </h4>
          <span
            className={`text-[9px] px-2 py-0.5 border font-semibold rounded-full uppercase ${
              workflow.status === 'completed' ? 'bg-success/15 border-success/35 text-success' :
              workflow.status === 'running' ? 'bg-primary/15 border-primary/35 text-primary animate-pulse' :
              workflow.status === 'awaiting_approval' ? 'bg-warning/15 border-warning/35 text-warning animate-pulse' :
              workflow.status === 'failed' ? 'bg-danger/15 border-danger/35 text-danger' :
              'bg-text-disabled/15 border-border text-text-muted'
            }`}
          >
            {workflow.status.replace('_', ' ')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>{workflow.results_count ?? 0} leads discovered</span>
          </span>
          <span className="text-text-disabled">•</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-success" />
            <span>{formatCost(workflow.total_cost_usd)} cost</span>
          </span>
        </div>

        <span className="text-[10px] text-text-muted block">
          Dispatched {formatRelative(workflow.created_at)}
        </span>
      </div>

      {/* Action View */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/workflows/${workflow.workflow_id}`);
        }}
        className="p-2 rounded-md bg-secondary hover:bg-elevated border border-border hover:border-border-hover text-text-secondary hover:text-white transition-colors duration-150 interactive-btn"
        title="View Detail"
      >
        <Eye className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

export default WorkflowCard;

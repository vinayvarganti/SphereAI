import type { AgentExecutionStatus } from '../../types/agent';
import { CheckCircle2, XCircle, RefreshCw, Minus } from 'lucide-react';
import { formatDuration } from '../../lib/utils';

export interface AgentStatus {
  agent_id: string;
  name: string;
  status: AgentExecutionStatus;
  duration_ms?: number;
}

interface AgentTimelineProps {
  agents: AgentStatus[];
  onAgentClick: (agentId: string) => void;
  selectedAgentId: string | null;
}

export function AgentTimeline({ agents, onAgentClick, selectedAgentId }: AgentTimelineProps) {
  
  const getAgentColor = (id: string) => {
    const colors: Record<string, string> = {
      planner_agent: 'bg-blue-500/20 text-[#3B82F6] border-[#3B82F6]/30',
      search_agent: 'bg-cyan-500/20 text-[#06B6D4] border-[#06B6D4]/30',
      company_discovery_agent: 'bg-teal-500/20 text-[#14B8A6] border-[#14B8A6]/30',
      validation_agent: 'bg-green-500/20 text-[#10B981] border-[#10B981]/30',
      decision_maker_agent: 'bg-purple-500/20 text-[#8B5CF6] border-[#8B5CF6]/30',
      contact_enrichment_agent: 'bg-fuchsia-500/20 text-[#A855F7] border-[#A855F7]/30',
      summary_agent: 'bg-amber-500/20 text-[#F59E0B] border-[#F59E0B]/30',
      human_approval_agent: 'bg-pink-500/20 text-[#EC4899] border-[#EC4899]/30',
    };
    return colors[id] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getStatusIcon = (status: AgentExecutionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-danger animate-bounce" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case 'skipped':
        return <Minus className="h-4 w-4 text-text-disabled" />;
      default:
        return <span className="h-2 w-2 rounded-full bg-text-disabled/60" />;
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="border-b border-border/40 pb-2">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Agent Pipeline</h3>
        <p className="text-[10px] text-text-muted mt-0.5">Execution order timeline</p>
      </div>

      <div className="relative pl-4 space-y-5 border-l border-border/40 ml-2 py-1">
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.agent_id;
          const bgColClass = getAgentColor(agent.agent_id);

          return (
            <div
              key={agent.agent_id}
              onClick={() => onAgentClick(agent.agent_id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-surface border-primary shadow-ai-glow shadow-primary/5'
                  : 'bg-secondaryBg/20 border-transparent hover:bg-surface/40 hover:border-border/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Agent Icon circle */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 border ${bgColClass}`}>
                  {agent.name.charAt(0)}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-none">{agent.name}</h4>
                  <span className="text-[9px] text-text-muted flex items-center gap-1.5 mt-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      agent.status === 'completed' ? 'bg-success' :
                      agent.status === 'running' ? 'bg-primary ws-pulse' :
                      agent.status === 'failed' ? 'bg-danger' : 'bg-text-disabled/60'
                    }`} />
                    <span className="capitalize">{agent.status}</span>
                  </span>
                </div>
              </div>

              {/* Status Icon or Duration */}
              <div className="flex items-center gap-2 pl-2">
                {agent.duration_ms && agent.status === 'completed' && (
                  <span className="font-mono text-[10px] text-text-muted">
                    {formatDuration(agent.duration_ms)}
                  </span>
                )}
                {getStatusIcon(agent.status)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentTimeline;

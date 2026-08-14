export type AgentCategory =
  | 'Orchestration'
  | 'Discovery'
  | 'Validation'
  | 'Enrichment'
  | 'Analysis'
  | 'Approval';

export interface Agent {
  agent_id: string;
  name: string;
  description: string;
  category: AgentCategory;
  status: 'active' | 'inactive';
  avg_latency_ms: number;
  avg_cost_per_run_usd: number;
  required_api_keys: string[];
  icon?: string;
}

export type AgentExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface LogEntry {
  timestamp: string;
  agent_name: string;
  event_type: 'INFO' | 'TOOL_CALL' | 'LLM' | 'ERROR' | 'SUCCESS';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

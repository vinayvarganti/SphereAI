import type { Company } from './company';
import type { Contact } from './contact';
import type { LogEntry } from './agent';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed';

export interface ICPConfig {
  industry: string[];
  headcount_min: number;
  headcount_max: number;
  funding_stages: string[];
  geography: string[];
  revenue_min_usd?: number;
  tech_stack?: string[];
  min_icp_score?: number;
}

export interface PersonaConfig {
  name: string;
  titles: string[];
  seniority_levels?: string[];
  priority: number;
}

export interface CreateWorkflowRequest {
  name: string;
  icp: ICPConfig;
  personas: PersonaConfig[];
  triggers: string[];
}

export interface CreateWorkflowResponse {
  workflow_id: string;
  status: WorkflowStatus;
  websocket_url: string;
  estimated_duration_seconds: number;
}

export interface CompanySummary {
  company_id: string;
  company_name: string;
  executive_summary: string;
  why_now: string;
  outreach_strategy: Record<string, string>; // persona name -> strategy text
  subject_lines: string[];
  risk_factors: string[];
  recommended_actions: string[];
  confidence_score: number;
}

export interface SummaryReport {
  companies: CompanySummary[];
  generated_at: string;
  total_companies: number;
  total_contacts: number;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  status: WorkflowStatus;
  icp: ICPConfig;
  personas: PersonaConfig[];
  triggers: string[];
  results_count?: number;
  total_cost_usd?: number;
  total_tokens?: number;
  summary_report?: SummaryReport | null;
  created_at: string;
  completed_at?: string;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  per_page: number;
}

export interface WorkflowDetailResponse {
  workflow: Workflow;
  companies: Company[];
  contacts: Contact[];
  summary_report: SummaryReport | null;
  logs: LogEntry[];
}

export interface ApprovalDecision {
  contact_id: string;
  action: 'approve' | 'reject' | 'edit';
  reason?: string;
  edits?: Partial<Contact>;
}

export interface ApprovalResponse {
  workflow_id: string;
  status: WorkflowStatus;
  processed: number;
}
